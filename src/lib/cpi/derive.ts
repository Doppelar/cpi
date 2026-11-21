import { type CpiTable, TOTAL_CODE } from "./parse";

export type BaseTable = {
  /** 基準年（2020, 2025 など） */
  base: number;
  table: CpiTable;
};

/** 1つの地域・年月・類／品目の値（DB の cpi_stats の1行） */
export type StatRow = {
  ym: number;
  code: string;
  name: string;
  kind: string;
  category: string | null;
  parent: string | null;
  serial: number;
  weight10k: number | null;
  /** 前月比・前年同月比を計算した基準年 */
  base: number;
  /** 最新の基準年の指数（古い基準年の月は接続した値） */
  indexValue: number | null;
  /** 前月比（%） */
  mom: number | null;
  /** 前年同月比（%） */
  yoy: number | null;
  /** 総合の前年同月比に対する寄与度（%ポイント） */
  contribYoy: number | null;
  /** 総合の前月比に対する寄与度（%ポイント） */
  contribMom: number | null;
};

/** 年月を n か月ずらす（202501, -1 → 202412） */
export function shiftMonth(ym: number, months: number): number {
  const total = Math.floor(ym / 100) * 12 + ((ym % 100) - 1) + months;
  return Math.floor(total / 12) * 100 + (total % 12) + 1;
}

const round = (value: number, digits: number) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

/** 変化率（%）。どちらかが欠けていれば null */
export function changeRate(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return round((current / previous - 1) * 100, 2);
}

/**
 * 総合の変化率に対する寄与度（%ポイント）。
 * ラスパイレス式では 寄与度 = (品目の指数の差) × (品目のウエイト / 総合のウエイト) ÷ (比べる月の総合指数) × 100。
 */
export function contribution(
  current: number | null | undefined,
  previous: number | null | undefined,
  weight: number | null,
  totalWeight: number,
  totalPrevious: number | null | undefined
): number | null {
  if (
    current == null ||
    previous == null ||
    weight == null ||
    totalPrevious == null ||
    totalPrevious === 0 ||
    totalWeight === 0
  ) {
    return null;
  }
  return round(
    (((current - previous) * (weight / totalWeight)) / totalPrevious) * 100,
    3
  );
}

/** 表を「符号 → 年月 → 値」で引けるようにする */
function indexByCode(table: CpiTable): Map<string, Map<number, number | null>> {
  const byCode = new Map<string, Map<number, number | null>>();
  table.columns.forEach((column, columnIndex) => {
    const byMonth = new Map<number, number | null>();
    table.months.forEach((ym, monthIndex) => {
      byMonth.set(ym, table.values[monthIndex][columnIndex] ?? null);
    });
    byCode.set(column.code, byMonth);
  });
  return byCode;
}

/**
 * 古い基準年の指数を新しい基準年につなぐ係数（符号ごと）。
 * 新しい基準年の1年間で、両方の値がそろう月の平均の比をとる。
 */
export function linkFactors(
  older: BaseTable,
  newer: BaseTable
): Map<string, number> {
  const olderValues = indexByCode(older.table);
  const newerValues = indexByCode(newer.table);
  const factors = new Map<string, number>();
  for (const [code, newerByMonth] of newerValues) {
    const olderByMonth = olderValues.get(code);
    if (!olderByMonth) continue;
    let newerSum = 0;
    let olderSum = 0;
    let count = 0;
    for (let month = 1; month <= 12; month++) {
      const ym = newer.base * 100 + month;
      const a = newerByMonth.get(ym);
      const b = olderByMonth.get(ym);
      if (a == null || b == null) continue;
      newerSum += a;
      olderSum += b;
      count++;
    }
    if (count === 12 && olderSum > 0) factors.set(code, newerSum / olderSum);
  }
  return factors;
}

/**
 * 基準年ごとの表から、月ごと・類／品目ごとの値をつくる。
 * - 前月比・前年同月比・寄与度は、その月を公式に担当する基準年の表で計算する
 *   （新しい基準年は「基準年の翌年1月」から担当。一番古い表は最初の月から）
 * - 指数は最新の基準年にそろえる（古い月は接続係数をかける）
 */
export function buildStats(tables: readonly BaseTable[]): StatRow[] {
  const sorted = [...tables].sort((a, b) => a.base - b.base);
  if (sorted.length === 0) return [];
  const latest = sorted[sorted.length - 1];
  const latestValues = indexByCode(latest.table);
  const linked = sorted.slice(0, -1).map((older) => ({
    values: indexByCode(older.table),
    factors: linkFactors(older, latest),
  }));

  /** 最新の基準年にそろえた指数 */
  const linkedIndex = (code: string, ym: number): number | null => {
    const direct = latestValues.get(code)?.get(ym);
    if (direct != null) return direct;
    for (let i = linked.length - 1; i >= 0; i--) {
      const factor = linked[i].factors.get(code);
      const value = linked[i].values.get(code)?.get(ym);
      if (factor != null && value != null) return round(value * factor, 3);
    }
    return null;
  };

  const rows: StatRow[] = [];
  sorted.forEach((entry, tableIndex) => {
    const { table, base } = entry;
    const from = tableIndex === 0 ? table.months[0] : (base + 1) * 100 + 1;
    const next = sorted[tableIndex + 1];
    const until = next ? next.base * 100 + 12 : Number.POSITIVE_INFINITY;
    const values = indexByCode(table);
    const total = values.get(TOTAL_CODE);
    const totalWeight =
      table.columns.find((column) => column.code === TOTAL_CODE)?.weight ?? 0;

    for (const ym of table.months) {
      if (ym < from || ym > until) continue;
      const lastMonth = shiftMonth(ym, -1);
      const lastYear = shiftMonth(ym, -12);
      for (const column of table.columns) {
        const byMonth = values.get(column.code);
        const current = byMonth?.get(ym);
        rows.push({
          ym,
          code: column.code,
          name: column.name,
          kind: column.kind,
          category: column.category,
          parent: column.parent,
          serial: column.serial,
          weight10k: column.weight10k,
          base,
          indexValue: linkedIndex(column.code, ym),
          mom: changeRate(current, byMonth?.get(lastMonth)),
          yoy: changeRate(current, byMonth?.get(lastYear)),
          contribYoy: contribution(
            current,
            byMonth?.get(lastYear),
            column.weight,
            totalWeight,
            total?.get(lastYear)
          ),
          contribMom: contribution(
            current,
            byMonth?.get(lastMonth),
            column.weight,
            totalWeight,
            total?.get(lastMonth)
          ),
        });
      }
    }
  });
  return rows;
}
