import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";
import type { AreaId } from "./areas";
import {
  HEADLINE_CODES,
  type HeadlinePoint,
  type ItemPoint,
  type MajorPoint,
  type MonthItem,
} from "./types";

export const CPI_CACHE_TAG = "cpi";
const cacheOptions = { revalidate: 3600, tags: [CPI_CACHE_TAG] };

const num = (value: unknown): number | null =>
  value == null ? null : Number(value);

/** データのある年月（古い順） */
export const getMonths = unstable_cache(
  async (area: AreaId): Promise<number[]> => {
    const rows = await sql()`
      SELECT ym FROM cpi_stats WHERE area = ${area} AND code = '0001' ORDER BY ym`;
    return rows.map((row) => Number(row.ym));
  },
  ["cpi-months"],
  cacheOptions
);

/** 総合・コア・コアコアなどの推移 */
export const getHeadlineSeries = unstable_cache(
  async (area: AreaId): Promise<HeadlinePoint[]> => {
    const codes = Object.values(HEADLINE_CODES);
    const rows = await sql()`
      SELECT ym, code, index_value, mom, yoy FROM cpi_stats
      WHERE area = ${area} AND code = ANY(${codes}) ORDER BY ym`;
    return rows.map((row) => ({
      ym: Number(row.ym),
      code: String(row.code),
      index: num(row.index_value),
      mom: num(row.mom),
      yoy: num(row.yoy),
    }));
  },
  ["cpi-headline"],
  cacheOptions
);

/** 10大費目の寄与度の推移 */
export const getMajorSeries = unstable_cache(
  async (area: AreaId): Promise<MajorPoint[]> => {
    const rows = await sql()`
      SELECT ym, name, yoy, contrib_yoy FROM cpi_stats
      WHERE area = ${area} AND kind = 'major' ORDER BY ym, serial`;
    return rows.map((row) => ({
      ym: Number(row.ym),
      name: String(row.name),
      yoy: num(row.yoy),
      contribYoy: num(row.contrib_yoy),
    }));
  },
  ["cpi-majors"],
  cacheOptions
);

/** その月の全品目（と10大費目・類） */
export const getMonthItems = unstable_cache(
  async (area: AreaId, ym: number): Promise<MonthItem[]> => {
    const rows = await sql()`
      SELECT code, name, kind, category, weight10k, index_value, mom, yoy,
             contrib_yoy, contrib_mom
      FROM cpi_stats
      WHERE area = ${area} AND ym = ${ym} AND kind IN ('item', 'major', 'group')
      ORDER BY serial`;
    return rows.map((row) => ({
      code: String(row.code),
      name: String(row.name),
      kind: String(row.kind) as MonthItem["kind"],
      category: row.category == null ? null : String(row.category),
      weight10k: num(row.weight10k),
      index: num(row.index_value),
      mom: num(row.mom),
      yoy: num(row.yoy),
      contribYoy: num(row.contrib_yoy),
      contribMom: num(row.contrib_mom),
    }));
  },
  ["cpi-month-items"],
  cacheOptions
);

/** 1つの類・品目の推移 */
export const getItemSeries = unstable_cache(
  async (area: AreaId, code: string): Promise<ItemPoint[]> => {
    const rows = await sql()`
      SELECT ym, name, index_value, mom, yoy FROM cpi_stats
      WHERE area = ${area} AND code = ${code} ORDER BY ym`;
    return rows.map((row) => ({
      ym: Number(row.ym),
      name: String(row.name),
      index: num(row.index_value),
      mom: num(row.mom),
      yoy: num(row.yoy),
    }));
  },
  ["cpi-item-series"],
  cacheOptions
);

/** 身近な品目の推移（名前で探す） */
export const getWatchSeries = unstable_cache(
  async (area: AreaId, names: readonly string[]): Promise<ItemPoint[]> => {
    const rows = await sql()`
      SELECT ym, name, index_value, mom, yoy FROM cpi_stats
      WHERE area = ${area} AND name = ANY(${names as string[]})
        AND kind IN ('item', 'group', 'major')
      ORDER BY ym`;
    return rows.map((row) => ({
      ym: Number(row.ym),
      name: String(row.name),
      index: num(row.index_value),
      mom: num(row.mom),
      yoy: num(row.yoy),
    }));
  },
  ["cpi-watch"],
  cacheOptions
);

/** 最後に取り込んだ日時 */
export const getImportedAt = unstable_cache(
  async (area: AreaId): Promise<string | null> => {
    const rows = await sql()`
      SELECT imported_at FROM cpi_imports WHERE area = ${area}`;
    return rows[0] ? new Date(rows[0].imported_at).toISOString() : null;
  },
  ["cpi-imported-at"],
  cacheOptions
);
