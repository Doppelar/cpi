/** 景気動向指数のグラフ・表に渡す形への変換（純粋関数） */
import { shiftMonth } from "@/lib/cpi/derive";
import {
  backwardMovingAverage,
  COINCIDENT_GROUPS,
  type CoincidentGroup,
  coincidentGroupOf,
  type MonthlyIndex,
  monthlyDiff,
} from "./parse";
import { type ContribPoint, RECESSIONS } from "./types";

export type KeikiRangeId = "5y" | "10y" | "all";

export const KEIKI_RANGES: readonly { id: KeikiRangeId; label: string }[] = [
  { id: "5y", label: "5年" },
  { id: "10y", label: "10年" },
  { id: "all", label: "1985年から" },
];

export function keikiRangeStart(latestYm: number, range: KeikiRangeId): number {
  if (range === "5y") return shiftMonth(latestYm, -59);
  if (range === "10y") return shiftMonth(latestYm, -119);
  return 0;
}

export type CiRow = {
  ym: number;
  leading: number | null;
  coincident: number | null;
  lagging: number | null;
  /** 一致指数の前月差 */
  coincidentDiff: number | null;
  /** 一致指数の3か月後方移動平均の前月差 */
  ma3Diff: number | null;
  /** 一致指数の7か月後方移動平均の前月差 */
  ma7Diff: number | null;
  diLeading: number | null;
  diCoincident: number | null;
};

/** CI がある月だけを、前月差・移動平均つきで並べる */
export function buildCiRows(monthly: readonly MonthlyIndex[]): CiRow[] {
  const rows = monthly
    .filter((row) => row.ciCoincident != null)
    .sort((a, b) => a.ym - b.ym);
  const coincident = rows.map((row) => row.ciCoincident);
  const diff = monthlyDiff(coincident);
  const ma3Diff = monthlyDiff(backwardMovingAverage(coincident, 3));
  const ma7Diff = monthlyDiff(backwardMovingAverage(coincident, 7));
  return rows.map((row, i) => ({
    ym: row.ym,
    leading: row.ciLeading,
    coincident: row.ciCoincident,
    lagging: row.ciLagging,
    coincidentDiff: diff[i],
    ma3Diff: ma3Diff[i],
    ma7Diff: ma7Diff[i],
    diLeading: row.diLeading,
    diCoincident: row.diCoincident,
  }));
}

export type CoincidentContribRow = { ym: number; diff: number | null } & Partial<
  Record<CoincidentGroup, number>
>;

/** 一致指数の前月差を、分野ごとの寄与度に分ける */
export function buildCoincidentContribRows(
  points: readonly ContribPoint[],
  ciRows: readonly CiRow[]
): CoincidentContribRow[] {
  const diffs = new Map(ciRows.map((row) => [row.ym, row.coincidentDiff]));
  const byMonth = new Map<number, CoincidentContribRow>();
  for (const point of points) {
    if (!diffs.has(point.ym)) continue;
    const row = byMonth.get(point.ym) ?? {
      ym: point.ym,
      diff: diffs.get(point.ym) ?? null,
    };
    const group = coincidentGroupOf(point.name);
    row[group] =
      Math.round(((row[group] ?? 0) + point.contribution) * 1000) / 1000;
    byMonth.set(point.ym, row);
  }
  return [...byMonth.values()].sort((a, b) => a.ym - b.ym);
}

/** 実際に使われている分野だけを、決まった順番で返す */
export function usedGroups(
  rows: readonly CoincidentContribRow[]
): CoincidentGroup[] {
  return COINCIDENT_GROUPS.filter((group) =>
    rows.some((row) => row[group] != null)
  );
}

/** 表示する期間にかかる景気後退期（期間の外は切る） */
export function recessionsWithin(
  from: number,
  to: number
): { start: number; end: number }[] {
  return RECESSIONS.filter(
    (recession) => recession.trough >= from && recession.peak <= to
  ).map((recession) => ({
    start: Math.max(recession.peak, from),
    end: Math.min(recession.trough, to),
  }));
}
