import type { SeriesId } from "./parse";

export type KeikiComponent = {
  series: SeriesId;
  code: string;
  name: string;
  value: number | null;
  unit: string | null;
  contribution: number | null;
};

export type ContribPoint = { ym: number; name: string; contribution: number };

export type KeikiJudgment = {
  ym: number;
  label: string | null;
  text: string;
  url: string;
};

/**
 * 内閣府が認定した景気後退期（景気の山の翌月〜谷）。
 * 出典：内閣府「景気基準日付」。1985年以降。
 */
export const RECESSIONS: readonly { peak: number; trough: number }[] = [
  { peak: 198506, trough: 198611 },
  { peak: 199102, trough: 199310 },
  { peak: 199705, trough: 199901 },
  { peak: 200011, trough: 200201 },
  { peak: 200802, trough: 200903 },
  { peak: 201203, trough: 201211 },
  { peak: 201810, trough: 202005 },
];
