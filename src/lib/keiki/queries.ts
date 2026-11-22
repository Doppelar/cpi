import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";
import type { MonthlyIndex, SeriesId } from "./parse";
import type { ContribPoint, KeikiComponent, KeikiJudgment } from "./types";

export const KEIKI_CACHE_TAG = "keiki";
const cacheOptions = { revalidate: 3600, tags: [KEIKI_CACHE_TAG] };

const num = (value: unknown): number | null =>
  value == null ? null : Number(value);

/** CI・DI の月次（古い順） */
export const getKeikiMonthly = unstable_cache(
  async (): Promise<MonthlyIndex[]> => {
    const rows = await sql()`SELECT * FROM di_monthly ORDER BY ym`;
    return rows.map((row) => ({
      ym: Number(row.ym),
      ciLeading: num(row.ci_leading),
      ciCoincident: num(row.ci_coincident),
      ciLagging: num(row.ci_lagging),
      diLeading: num(row.di_leading),
      diCoincident: num(row.di_coincident),
      diLagging: num(row.di_lagging),
    }));
  },
  ["keiki-monthly"],
  cacheOptions
);

/** その月の採用系列と寄与度 */
export const getKeikiComponents = unstable_cache(
  async (ym: number): Promise<KeikiComponent[]> => {
    const rows = await sql()`
      SELECT series, code, name, value, unit, contribution FROM di_components
      WHERE ym = ${ym} ORDER BY series, code`;
    return rows.map((row) => ({
      series: String(row.series) as SeriesId,
      code: String(row.code),
      name: String(row.name),
      value: num(row.value),
      unit: row.unit == null ? null : String(row.unit),
      contribution: num(row.contribution),
    }));
  },
  ["keiki-components"],
  cacheOptions
);

/** 一致指数の採用系列の寄与度（全期間） */
export const getCoincidentContributions = unstable_cache(
  async (): Promise<ContribPoint[]> => {
    const rows = await sql()`
      SELECT ym, name, contribution FROM di_components
      WHERE series = 'coincident' AND contribution IS NOT NULL ORDER BY ym`;
    return rows.map((row) => ({
      ym: Number(row.ym),
      name: String(row.name),
      contribution: Number(row.contribution),
    }));
  },
  ["keiki-coincident-contrib"],
  cacheOptions
);

/** 内閣府の基調判断（速報時点） */
export const getJudgments = unstable_cache(
  async (): Promise<KeikiJudgment[]> => {
    const rows = await sql()`
      SELECT ym, label, text, source_url FROM di_judgments ORDER BY ym`;
    return rows.map((row) => ({
      ym: Number(row.ym),
      label: row.label == null ? null : String(row.label),
      text: String(row.text),
      url: String(row.source_url),
    }));
  },
  ["keiki-judgments"],
  cacheOptions
);
