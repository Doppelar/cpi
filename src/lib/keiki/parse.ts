/**
 * 内閣府「景気動向指数」の Excel（長期系列・個別系列・寄与度）と、
 * 「結果の概要」PDF の文章を読み取る。
 */

export type SeriesId = "leading" | "coincident" | "lagging";

export const SERIES_LABELS: Record<SeriesId, string> = {
  leading: "先行指数",
  coincident: "一致指数",
  lagging: "遅行指数",
};

export type MonthlyIndex = {
  ym: number;
  ciLeading: number | null;
  ciCoincident: number | null;
  ciLagging: number | null;
  diLeading: number | null;
  diCoincident: number | null;
  diLagging: number | null;
};

export type ComponentRow = {
  ym: number;
  series: SeriesId;
  code: string;
  name: string;
  /** 元の値（単位は unit） */
  value: number | null;
  unit: string | null;
  /** 指数の前月差への寄与度（ポイント） */
  contribution: number | null;
};

/** 寄与度の表にある「一致指数トレンド成分」の符号 */
export const TREND_CODE = "TREND";

type Cell = string | number | null | undefined;
type Rows = Cell[][];

const toNumber = (cell: Cell): number | null => {
  if (cell === null || cell === undefined || cell === "") return null;
  const value = typeof cell === "number" ? cell : Number(String(cell).trim());
  return Number.isFinite(value) ? value : null;
};

/** 1行目が「1985000101」のような時間軸コードの行だけを、年月つきで返す */
function dataRows(rows: Rows): { ym: number; row: Cell[] }[] {
  return rows
    .filter((row) => /^\d{10}$/.test(String(row[0] ?? "").trim()))
    .map((row) => ({
      ym: Number(row[1]) * 100 + Number(row[2]),
      row,
    }));
}

/** 長期系列（CI・DI）の表 */
export function parseLongSeries(rows: Rows): MonthlyIndex[] {
  return dataRows(rows)
    .map(({ ym, row }) => ({
      ym,
      ciLeading: toNumber(row[3]),
      ciCoincident: toNumber(row[4]),
      ciLagging: toNumber(row[5]),
      diLeading: toNumber(row[9]),
      diCoincident: toNumber(row[10]),
      diLagging: toNumber(row[11]),
    }))
    .filter(
      (row) =>
        row.ciCoincident != null ||
        row.ciLeading != null ||
        row.diCoincident != null
    );
}

/** "C8(注)" → "C8"、"L10" はそのまま */
const cleanCode = (cell: Cell) =>
  String(cell ?? "")
    .replace(/[（(].*$/, "")
    .trim();

type Header = { column: number; code: string; name: string };

/** 系列の符号（L1, C1, Lg1 など）の行と、その次の日本語名の行から列を読む */
function readHeader(rows: Rows): { headers: Header[]; nameRow: number } {
  const codeRow = rows.findIndex((row) =>
    row.some((cell) => /^(L|C|Lg)\d+/.test(cleanCode(cell)))
  );
  if (codeRow < 0) throw new Error("景気動向指数: 系列の符号が見つかりません");
  const nameRow = codeRow + 1;
  const headers: Header[] = [];
  rows[codeRow].forEach((cell, column) => {
    const code = cleanCode(cell);
    // L10A などは、ほかの系列を作るための参考系列なので除く
    if (/^(L|C|Lg)\d+$/.test(code)) {
      headers.push({
        column,
        code,
        name: String(rows[nameRow]?.[column] ?? "").trim(),
      });
    }
  });
  return { headers, nameRow };
}

/**
 * 寄与度の表と元の値の表から、月ごと・系列ごとの行をつくる。
 * 寄与度の表に載っている系列（現在の採用系列）だけを使う。
 */
export function parseComponents(
  series: SeriesId,
  contributionRows: Rows,
  valueRows: Rows
): ComponentRow[] {
  const contrib = readHeader(contributionRows);
  const values = readHeader(valueRows);
  const unitRow = values.nameRow + 2;
  const valueColumn = new Map(values.headers.map((h) => [h.code, h.column]));
  const valueByMonth = new Map(
    dataRows(valueRows).map(({ ym, row }) => [ym, row])
  );
  const trendColumn = contributionRows[contrib.nameRow]?.findIndex((cell) =>
    String(cell ?? "").includes("トレンド成分")
  );

  const result: ComponentRow[] = [];
  for (const { ym, row } of dataRows(contributionRows)) {
    const valueRow = valueByMonth.get(ym);
    for (const header of contrib.headers) {
      const column = valueColumn.get(header.code);
      const unit =
        column == null
          ? null
          : String(valueRows[unitRow]?.[column] ?? "")
              .replace(/^[（(]|[）)]$/g, "")
              .trim() || null;
      result.push({
        ym,
        series,
        code: header.code,
        name: header.name,
        value: column == null ? null : toNumber(valueRow?.[column]),
        unit,
        contribution: toNumber(row[header.column]),
      });
    }
    if (trendColumn != null && trendColumn >= 0) {
      result.push({
        ym,
        series,
        code: TREND_CODE,
        name: "一致指数のトレンド成分",
        value: null,
        unit: null,
        contribution: toNumber(row[trendColumn]),
      });
    }
  }
  return result;
}

export type JudgmentLabel =
  | "改善"
  | "足踏み"
  | "上方への局面変化"
  | "下方への局面変化"
  | "悪化"
  | "下げ止まり";

/** 判断の文章から、5段階（局面変化は上下）のどれかを取り出す */
export function judgmentLabel(text: string): JudgmentLabel | null {
  const labels: JudgmentLabel[] = [
    "上方への局面変化",
    "下方への局面変化",
    "下げ止まり",
    "足踏み",
    "悪化",
    "改善",
  ];
  return labels.find((label) => text.includes(label)) ?? null;
}

export type Judgment = { ym: number; text: string; label: JudgmentLabel | null };

/**
 * 「結果の概要」PDF の文字から、対象月と一致指数の基調判断を取り出す。
 * 例：「景気動向指数（ＣＩ一致指数）は、改善を示している。」
 */
export function extractJudgment(pdfText: string): Judgment | null {
  const text = pdfText.replace(/\s+/g, "");
  const month = text.match(
    /景気動向指数[（(]令和\d+[（(](\d{4})[）)]年(\d{1,2})月分速報[）)]/
  );
  const sentence = text.match(
    /景気動向指数[（(][ＣC][ＩI]一致指数[）)]は、([^。]+?)。/
  );
  if (!month || !sentence) return null;
  const judgment = `${sentence[1]}。`;
  return {
    ym: Number(month[1]) * 100 + Number(month[2]),
    text: judgment,
    label: judgmentLabel(judgment),
  };
}

/** 後方移動平均（そろわない月は null） */
export function backwardMovingAverage(
  values: readonly (number | null)[],
  window: number
): (number | null)[] {
  return values.map((_, i) => {
    if (i + 1 < window) return null;
    const slice = values.slice(i + 1 - window, i + 1);
    if (slice.some((value) => value == null)) return null;
    return (
      Math.round(
        ((slice as number[]).reduce((sum, value) => sum + value, 0) / window) *
          1000
      ) / 1000
    );
  });
}

/** 前月差（どちらかが欠けていれば null） */
export function monthlyDiff(
  values: readonly (number | null)[]
): (number | null)[] {
  return values.map((value, i) => {
    const previous = values[i - 1];
    if (i === 0 || value == null || previous == null) return null;
    return Math.round((value - previous) * 1000) / 1000;
  });
}

/** 一致指数の採用系列を、グラフで色分けする分野にまとめる */
export const COINCIDENT_GROUPS = [
  "生産・出荷",
  "雇用",
  "販売",
  "企業収益",
  "輸出",
  "その他",
] as const;

export type CoincidentGroup = (typeof COINCIDENT_GROUPS)[number];

export function coincidentGroupOf(name: string): CoincidentGroup {
  if (/生産指数|出荷/.test(name)) return "生産・出荷";
  if (/労働投入|求人|雇用/.test(name)) return "雇用";
  if (/販売額/.test(name)) return "販売";
  if (/営業利益|利益/.test(name)) return "企業収益";
  if (/輸出/.test(name)) return "輸出";
  return "その他";
}
