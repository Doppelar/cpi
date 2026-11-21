/** 画面とサーバーで共通の型と定数 */

/** 見出しに使う系列の符号 */
export const HEADLINE_CODES = {
  total: "0001",
  core: "0161",
  coreCore: "0178",
  energy: "0167",
  fresh: "0157",
} as const;

export type HeadlinePoint = {
  ym: number;
  code: string;
  index: number | null;
  mom: number | null;
  yoy: number | null;
};

export type MajorPoint = {
  ym: number;
  name: string;
  yoy: number | null;
  contribYoy: number | null;
};

export type MonthItem = {
  code: string;
  name: string;
  kind: "item" | "major" | "group";
  category: string | null;
  weight10k: number | null;
  index: number | null;
  mom: number | null;
  yoy: number | null;
  contribYoy: number | null;
  contribMom: number | null;
};

export type ItemPoint = {
  ym: number;
  name: string;
  index: number | null;
  mom: number | null;
  yoy: number | null;
};

/**
 * 寄与度のグラフで色を分ける費目（色は固定の順番）。
 * 残りの費目（被服及び履物・保健医療・教育）は「その他」にまとめる。
 */
export const CONTRIB_GROUPS = [
  "食料",
  "光熱・水道",
  "交通・通信",
  "住居",
  "教養娯楽",
  "家具・家事用品",
  "諸雑費",
  "その他",
] as const;

export type ContribGroup = (typeof CONTRIB_GROUPS)[number];

export function contribGroupOf(major: string): ContribGroup {
  return (CONTRIB_GROUPS as readonly string[]).includes(major)
    ? (major as ContribGroup)
    : "その他";
}

/** 身近な品目（全国・東京で共通の名前） */
export const WATCH_NAMES = [
  "米類",
  "卵",
  "生鮮野菜",
  "外食",
  "電気代",
  "ガス代",
  "ガソリン",
  "宿泊料",
] as const;
