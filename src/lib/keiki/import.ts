import "server-only";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";
import { createPool } from "@/lib/db";
import {
  type ComponentRow,
  extractJudgment,
  parseComponents,
  parseLongSeries,
  type SeriesId,
} from "./parse";
import { DI_BASE, DI_PAGE_URL } from "./source";


const FILES = {
  long: "1109ci.xlsx",
  leading: "1109ci1.xlsx",
  coincident: "1109ci2.xlsx",
  lagging: "1109ci3.xlsx",
  leadingContribution: "1109ci_cont1.xlsx",
  coincidentContribution: "1109ci_cont2.xlsx",
  laggingContribution: "1109ci_cont3.xlsx",
} as const;

const HEADERS = { "user-agent": "Mozilla/5.0 (compatible; cpi-site)" };

export const KEIKI_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS di_monthly (
  ym INTEGER PRIMARY KEY,
  ci_leading REAL,
  ci_coincident REAL,
  ci_lagging REAL,
  di_leading REAL,
  di_coincident REAL,
  di_lagging REAL
);
CREATE TABLE IF NOT EXISTS di_components (
  ym INTEGER NOT NULL,
  series TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  value REAL,
  unit TEXT,
  contribution REAL,
  PRIMARY KEY (ym, series, code)
);
CREATE TABLE IF NOT EXISTS di_judgments (
  ym INTEGER PRIMARY KEY,
  label TEXT,
  text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cpi_imports (
  area TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL,
  latest_ym INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

/** 取り込みの記録（cpi_imports）に使う名前 */
export const KEIKI_IMPORT_KEY = "keiki";

async function download(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: "no-store", headers: HEADERS });
  if (!response.ok) {
    throw new Error(`${url} の取得に失敗しました (${response.status})`);
  }
  return response.arrayBuffer();
}

function sheetRows(buffer: ArrayBuffer) {
  const book = XLSX.read(new Uint8Array(buffer));
  return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {
    header: 1,
    raw: true,
    defval: "",
  }) as (string | number)[][];
}

const COMPONENT_SQL = `INSERT INTO di_components (ym, series, code, name, value, unit, contribution)
SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::real[], $6::text[], $7::real[])`;

/** 概要 PDF から、まだ持っていない月の基調判断を読む */
async function fetchJudgments(known: Set<number>) {
  const page = await fetch(DI_PAGE_URL, { cache: "no-store", headers: HEADERS });
  if (!page.ok) return [];
  const html = await page.text();
  const files = [
    ...new Set(
      [...html.matchAll(/href="(?:[^"]*\/)?(\d{6})psummary\.pdf"/g)].map(
        (match) => match[1]
      )
    ),
  ].filter((ym) => !known.has(Number(ym)));

  const results: { ym: number; label: string | null; text: string; url: string }[] =
    [];
  const queue = [...files];
  const worker = async () => {
    for (let ym = queue.shift(); ym; ym = queue.shift()) {
      const url = `${DI_BASE}${ym}psummary.pdf`;
      try {
        const pdf = await getDocumentProxy(new Uint8Array(await download(url)));
        const { text } = await extractText(pdf, { mergePages: true });
        const judgment = extractJudgment(String(text));
        if (judgment) {
          results.push({ ym: judgment.ym, label: judgment.label, text: judgment.text, url });
        }
      } catch (error) {
        console.warn(`基調判断を読めませんでした: ${url}`, error);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return results;
}

export type KeikiImportResult = {
  status: "imported" | "unchanged";
  latestYm: number;
  judgmentsAdded: number;
};

/**
 * 内閣府の Excel を取り込み、指数・採用系列を入れ替える（前回と同じなら入れ替えない）。
 * 基調判断は、まだ持っていない月の概要 PDF だけを読んで足す。
 */
export async function importKeiki({ force = false } = {}): Promise<KeikiImportResult> {
  const names = Object.keys(FILES) as (keyof typeof FILES)[];
  const buffers = await Promise.all(
    names.map((name) => download(`${DI_BASE}${FILES[name]}`))
  );
  const files = Object.fromEntries(
    names.map((name, i) => [name, buffers[i]])
  ) as Record<keyof typeof FILES, ArrayBuffer>;
  const hash = createHash("sha256");
  for (const buffer of buffers) hash.update(new Uint8Array(buffer));
  const sourceHash = hash.digest("hex");

  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query(KEIKI_SCHEMA_SQL);
    const previous = await client.query(
      "SELECT source_hash, latest_ym FROM cpi_imports WHERE area = $1",
      [KEIKI_IMPORT_KEY]
    );
    let status: KeikiImportResult["status"] = "unchanged";
    let latestYm: number = previous.rows[0]?.latest_ym ?? 0;

    if (force || previous.rows[0]?.source_hash !== sourceHash) {
      const monthly = parseLongSeries(sheetRows(files.long));
      const components: ComponentRow[] = (
        [
          ["leading", files.leadingContribution, files.leading],
          ["coincident", files.coincidentContribution, files.coincident],
          ["lagging", files.laggingContribution, files.lagging],
        ] as [SeriesId, ArrayBuffer, ArrayBuffer][]
      ).flatMap(([series, contribution, values]) =>
        parseComponents(series, sheetRows(contribution), sheetRows(values))
      );
      if (monthly.length === 0) throw new Error("景気動向指数: データがありません");
      latestYm = Math.max(
        ...monthly.filter((row) => row.ciCoincident != null).map((row) => row.ym)
      );

      await client.query("BEGIN");
      await client.query("DELETE FROM di_monthly");
      await client.query("DELETE FROM di_components");
      await client.query(
        `INSERT INTO di_monthly (ym, ci_leading, ci_coincident, ci_lagging, di_leading, di_coincident, di_lagging)
         SELECT * FROM unnest($1::int[], $2::real[], $3::real[], $4::real[], $5::real[], $6::real[], $7::real[])`,
        [
          monthly.map((row) => row.ym),
          monthly.map((row) => row.ciLeading),
          monthly.map((row) => row.ciCoincident),
          monthly.map((row) => row.ciLagging),
          monthly.map((row) => row.diLeading),
          monthly.map((row) => row.diCoincident),
          monthly.map((row) => row.diLagging),
        ]
      );
      for (let i = 0; i < components.length; i += 3000) {
        const chunk = components.slice(i, i + 3000);
        await client.query(COMPONENT_SQL, [
          chunk.map((row) => row.ym),
          chunk.map((row) => row.series),
          chunk.map((row) => row.code),
          chunk.map((row) => row.name),
          chunk.map((row) => row.value),
          chunk.map((row) => row.unit),
          chunk.map((row) => row.contribution),
        ]);
      }
      await client.query(
        `INSERT INTO cpi_imports (area, source_hash, latest_ym, row_count, imported_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (area) DO UPDATE SET source_hash = EXCLUDED.source_hash,
           latest_ym = EXCLUDED.latest_ym, row_count = EXCLUDED.row_count,
           imported_at = NOW()`,
        [KEIKI_IMPORT_KEY, sourceHash, latestYm, monthly.length + components.length]
      );
      await client.query("COMMIT");
      status = "imported";
    }

    const known = await client.query("SELECT ym FROM di_judgments");
    const judgments = await fetchJudgments(
      new Set(known.rows.map((row) => Number(row.ym)))
    );
    for (const judgment of judgments) {
      await client.query(
        `INSERT INTO di_judgments (ym, label, text, source_url) VALUES ($1, $2, $3, $4)
         ON CONFLICT (ym) DO NOTHING`,
        [judgment.ym, judgment.label, judgment.text, judgment.url]
      );
    }
    return { status, latestYm, judgmentsAdded: judgments.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
