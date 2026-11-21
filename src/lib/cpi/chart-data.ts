/** グラフ・表に渡す形への変換（画面とサーバーの両方で使う純粋関数） */
import { shiftMonth } from "./derive";
import {
  CONTRIB_GROUPS,
  contribGroupOf,
  HEADLINE_CODES,
  type HeadlinePoint,
  type MajorPoint,
  type MonthItem,
} from "./types";

export type RangeId = "1y" | "3y" | "all";

export const RANGES: readonly { id: RangeId; label: string }[] = [
  { id: "1y", label: "1年" },
  { id: "3y", label: "3年" },
  { id: "all", label: "全期間" },
];

/** 期間の最初の年月（最新月を含めて12か月・36か月） */
export function rangeStart(latestYm: number, range: RangeId): number {
  if (range === "1y") return shiftMonth(latestYm, -11);
  if (range === "3y") return shiftMonth(latestYm, -35);
  return 0;
}

export type HeadlineRow = {
  ym: number;
  total: number | null;
  core: number | null;
  coreCore: number | null;
};

/** 総合・コア・コアコアの前年同月比を年月ごとにまとめる（前年同月比がない月は除く） */
export function buildHeadlineRows(points: readonly HeadlinePoint[]): HeadlineRow[] {
  const byMonth = new Map<number, HeadlineRow>();
  for (const point of points) {
    const row = byMonth.get(point.ym) ?? {
      ym: point.ym,
      total: null,
      core: null,
      coreCore: null,
    };
    if (point.code === HEADLINE_CODES.total) row.total = point.yoy;
    if (point.code === HEADLINE_CODES.core) row.core = point.yoy;
    if (point.code === HEADLINE_CODES.coreCore) row.coreCore = point.yoy;
    byMonth.set(point.ym, row);
  }
  return [...byMonth.values()]
    .filter((row) => row.total != null)
    .sort((a, b) => a.ym - b.ym);
}

export type ContribRow = { ym: number; total: number | null } & Partial<
  Record<(typeof CONTRIB_GROUPS)[number], number>
>;

/** 10大費目の寄与度を、色分けする費目ごとに足し合わせる */
export function buildContribRows(
  majors: readonly MajorPoint[],
  headline: readonly HeadlineRow[]
): ContribRow[] {
  const totals = new Map(headline.map((row) => [row.ym, row.total]));
  const byMonth = new Map<number, ContribRow>();
  for (const point of majors) {
    if (point.contribYoy == null || !totals.has(point.ym)) continue;
    const row = byMonth.get(point.ym) ?? {
      ym: point.ym,
      total: totals.get(point.ym) ?? null,
    };
    const group = contribGroupOf(point.name);
    row[group] = Math.round(((row[group] ?? 0) + point.contribYoy) * 1000) / 1000;
    byMonth.set(point.ym, row);
  }
  return [...byMonth.values()].sort((a, b) => a.ym - b.ym);
}

export type SortKey = "contribYoy" | "yoy" | "mom";

export const SORT_LABELS: Record<SortKey, string> = {
  contribYoy: "寄与度（前年同月比）",
  yoy: "前年同月比",
  mom: "前月比",
};

/** 品目だけを、指定した値の大きい順（上がった順）に並べる。値がない品目は除く */
export function rankItems(
  items: readonly MonthItem[],
  key: SortKey
): MonthItem[] {
  return items
    .filter((item) => item.kind === "item" && item[key] != null)
    .sort((a, b) => (b[key] as number) - (a[key] as number));
}

/** 上がった品目・下がった品目を n 件ずつ（0 は含めない） */
export function topMovers(
  items: readonly MonthItem[],
  key: SortKey,
  n: number
): { up: MonthItem[]; down: MonthItem[] } {
  const ranked = rankItems(items, key);
  return {
    up: ranked.filter((item) => (item[key] as number) > 0).slice(0, n),
    down: ranked
      .filter((item) => (item[key] as number) < 0)
      .reverse()
      .slice(0, n),
  };
}

/** +2.3% / -0.4% / 0.0%（符号つき） */
export function formatSigned(value: number | null, digits = 1, unit = "%"): string {
  if (value == null) return "—";
  const rounded = value.toFixed(digits);
  if (Number(rounded) === 0) return `${(0).toFixed(digits)}${unit}`;
  return `${value > 0 ? "+" : ""}${rounded}${unit}`;
}
