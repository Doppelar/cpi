import "server-only";
import { createHash } from "node:crypto";
import { createPool, SCHEMA_SQL } from "@/lib/db";
import { AREAS, type AreaId } from "./areas";
import { buildStats, type StatRow } from "./derive";
import { decodeShiftJis, parseCpiCsv } from "./parse";

export type ImportResult = {
  area: AreaId;
  status: "imported" | "unchanged";
  latestYm: number;
  rows: number;
};

const CHUNK = 2000;

async function download(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} の取得に失敗しました (${response.status})`);
  }
  return response.arrayBuffer();
}

const COLUMNS = [
  "area",
  "ym",
  "code",
  "name",
  "kind",
  "category",
  "parent",
  "serial",
  "weight10k",
  "base",
  "index_value",
  "mom",
  "yoy",
  "contrib_yoy",
  "contrib_mom",
] as const;

const TYPES = [
  "text",
  "int",
  "text",
  "text",
  "text",
  "text",
  "text",
  "int",
  "real",
  "int",
  "real",
  "real",
  "real",
  "real",
  "real",
];

/** 列ごとの配列にして unnest で一度に入れる */
function toColumnArrays(area: AreaId, rows: readonly StatRow[]) {
  return [
    rows.map(() => area),
    rows.map((row) => row.ym),
    rows.map((row) => row.code),
    rows.map((row) => row.name),
    rows.map((row) => row.kind),
    rows.map((row) => row.category),
    rows.map((row) => row.parent),
    rows.map((row) => row.serial),
    rows.map((row) => row.weight10k),
    rows.map((row) => row.base),
    rows.map((row) => row.indexValue),
    rows.map((row) => row.mom),
    rows.map((row) => row.yoy),
    rows.map((row) => row.contribYoy),
    rows.map((row) => row.contribMom),
  ];
}

const INSERT_SQL = `INSERT INTO cpi_stats (${COLUMNS.join(", ")})
SELECT * FROM unnest(${TYPES.map((type, i) => `$${i + 1}::${type}[]`).join(", ")})`;

/**
 * 総務省の CSV を取り込み、地域ごとに計算結果を入れ替える。
 * CSV が前回と同じなら何もしない（force で強制）。
 */
export async function importArea(
  area: AreaId,
  { force = false } = {}
): Promise<ImportResult> {
  const sources = AREAS[area].sources;
  const buffers = await Promise.all(
    sources.map((source) => download(source.url))
  );
  const hash = createHash("sha256");
  for (const buffer of buffers) hash.update(new Uint8Array(buffer));
  const sourceHash = hash.digest("hex");

  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    const previous = await client.query(
      "SELECT source_hash, latest_ym, row_count FROM cpi_imports WHERE area = $1",
      [area]
    );
    const last = previous.rows[0];
    if (!force && last?.source_hash === sourceHash) {
      return {
        area,
        status: "unchanged",
        latestYm: last.latest_ym,
        rows: last.row_count,
      };
    }

    const rows = buildStats(
      sources.map((source, i) => ({
        base: source.base,
        table: parseCpiCsv(decodeShiftJis(buffers[i])),
      }))
    );
    if (rows.length === 0) throw new Error(`${area}: データがありません`);
    const latestYm = Math.max(...rows.map((row) => row.ym));

    await client.query("BEGIN");
    await client.query("DELETE FROM cpi_stats WHERE area = $1", [area]);
    for (let i = 0; i < rows.length; i += CHUNK) {
      await client.query(
        INSERT_SQL,
        toColumnArrays(area, rows.slice(i, i + CHUNK))
      );
    }
    await client.query(
      `INSERT INTO cpi_imports (area, source_hash, latest_ym, row_count, imported_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (area) DO UPDATE SET source_hash = EXCLUDED.source_hash,
         latest_ym = EXCLUDED.latest_ym, row_count = EXCLUDED.row_count,
         imported_at = NOW()`,
      [area, sourceHash, latestYm, rows.length]
    );
    await client.query("COMMIT");
    return { area, status: "imported", latestYm, rows: rows.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
