/** 表示する地域と、総務省統計局の CSV の場所 */

export type AreaId = "national" | "tokyo";

export type AreaSource = { base: number; url: string };

export type AreaInfo = {
  id: AreaId;
  label: string;
  path: string;
  sources: readonly AreaSource[];
  /** 推移のはじまり（データの都合の説明） */
  coverage: string;
};

const STAT_CPI = "https://www.stat.go.jp/data/cpi";

export const AREAS: Record<AreaId, AreaInfo> = {
  national: {
    id: "national",
    label: "全国",
    path: "/",
    sources: [
      { base: 2020, url: `${STAT_CPI}/2020/csv/zmi2020aa.csv` },
      { base: 2025, url: `${STAT_CPI}/2025/csv/zmi2025aa.csv` },
    ],
    coverage:
      "2020年1月から。2025年12月までは2020年基準、2026年1月からは2025年基準の指数で計算し、指数は2025年基準につないでいます。",
  },
  tokyo: {
    id: "tokyo",
    label: "東京都区部",
    path: "/tokyo",
    sources: [{ base: 2025, url: `${STAT_CPI}/2025/csv/tmi2025aa.csv` }],
    coverage:
      "2025年1月から（2025年基準）。前年同月比は、1年前の値がそろう2026年1月から表示します。",
  },
};

export const AREA_IDS = Object.keys(AREAS) as AreaId[];

export function isAreaId(value: string): value is AreaId {
  return value in AREAS;
}

/** 202610 → "2026年10月" */
export function formatMonth(ym: number): string {
  return `${Math.floor(ym / 100)}年${ym % 100}月`;
}

/** 202610 → "26/10"（グラフの目盛り用） */
export function formatMonthShort(ym: number): string {
  return `${String(Math.floor(ym / 100)).slice(2)}/${String(ym % 100).padStart(2, "0")}`;
}
