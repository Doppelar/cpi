"use client";

import { formatMonth } from "@/lib/cpi/areas";
import type { RangeId } from "@/lib/cpi/chart-data";
import { RANGES } from "@/lib/cpi/chart-data";

/** 期間の切り替え（1年・3年・全期間） */
export function RangeToggle({
  value,
  onChange,
}: {
  value: RangeId;
  onChange: (range: RangeId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="表示する期間"
      className="inline-flex rounded-full border border-line bg-surface-2 p-0.5 text-sm"
    >
      {RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          role="radio"
          aria-checked={value === range.id}
          onClick={() => onChange(range.id)}
          className={`rounded-full px-3 py-1 ${
            value === range.id
              ? "bg-card font-semibold text-ink shadow-sm"
              : "text-ink-2 hover:text-ink"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

/** 凡例（色の印と名前、最新の値） */
export function LegendChip({
  color,
  label,
  value,
  shape = "line",
}: {
  color: string;
  label: string;
  value?: string;
  shape?: "line" | "square";
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
      <span
        aria-hidden
        className={shape === "line" ? "h-0.5 w-4 rounded" : "h-3 w-3 rounded-sm"}
        style={{ background: color }}
      />
      {label}
      {value && <span className="tabular font-semibold text-ink">{value}</span>}
    </span>
  );
}

export type TooltipRow = {
  color: string;
  label: string;
  value: string;
  strong?: boolean;
};

/** グラフに重ねる説明（どの月の、どの値か） */
export function TooltipBox({ ym, rows }: { ym: number; rows: TooltipRow[] }) {
  return (
    <div className="min-w-44 rounded-lg border border-line bg-card px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-semibold">{formatMonth(ym)}</p>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: row.color }}
              />
              {row.label}
            </span>
            <span className={`tabular ${row.strong ? "font-bold" : ""}`}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
