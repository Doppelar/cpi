"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatMonth } from "@/lib/cpi/areas";
import { formatSigned } from "@/lib/cpi/chart-data";
import type { CiRow } from "@/lib/keiki/chart-data";
import { SERIES_LABELS, type SeriesId, TREND_CODE } from "@/lib/keiki/parse";
import type { KeikiComponent, KeikiJudgment } from "@/lib/keiki/types";
import { JudgmentBadge } from "./judgment-badge";

const SERIES: { id: SeriesId; note: string }[] = [
  { id: "coincident", note: "いまの景気" },
  { id: "leading", note: "数か月先の景気" },
  { id: "lagging", note: "景気の後追い" },
];

/** 元の値を、単位つきで読みやすく */
function formatValue(component: KeikiComponent) {
  if (component.value == null) return "未公表";
  const digits = Math.abs(component.value) >= 1000 ? 0 : 1;
  const value = component.value.toLocaleString("ja-JP", {
    maximumFractionDigits: digits === 0 ? 0 : 2,
  });
  const unit = component.unit ?? "";
  if (unit.includes("=100") || unit.includes("＝100")) return `${value}（指数）`;
  return `${value}${unit}`;
}

function ComponentPanel({
  series,
  note,
  diff,
  components,
}: {
  series: SeriesId;
  note: string;
  diff: number | null;
  components: KeikiComponent[];
}) {
  const sorted = [...components].sort(
    (a, b) => (b.contribution ?? 0) - (a.contribution ?? 0)
  );
  const scale = Math.max(
    ...sorted.map((item) => Math.abs(item.contribution ?? 0)),
    0.01
  );
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-bold">
          {SERIES_LABELS[series]}
          <span className="ml-1 text-xs font-normal text-ink-3">（{note}）</span>
        </h4>
        <p className="tabular text-sm">
          前月差<strong className="ml-1 text-base">{formatSigned(diff, 1, "")}</strong>
        </p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {sorted.map((item) => {
          const value = item.contribution ?? 0;
          const width = (Math.abs(value) / scale) * 50;
          const up = value >= 0;
          return (
            <li key={item.code} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate" title={item.name}>
                  {item.code === TREND_CODE ? "（トレンド調整）" : item.name}
                </span>
                <span
                  className={`tabular shrink-0 font-semibold ${
                    item.contribution == null
                      ? "text-ink-3"
                      : up
                        ? "text-up"
                        : "text-down"
                  }`}
                >
                  {item.contribution == null
                    ? "—"
                    : formatSigned(item.contribution, 2, "")}
                </span>
              </div>
              <div className="relative mt-0.5 h-2 rounded bg-surface-2">
                <span
                  aria-hidden
                  className="absolute top-0 h-2 w-px bg-[var(--axis)]"
                  style={{ left: "50%" }}
                />
                {item.contribution != null && (
                  <span
                    className={`absolute top-0 h-2 ${up ? "rounded-r bg-up" : "rounded-l bg-down"}`}
                    style={{
                      left: up ? "50%" : `${50 - width}%`,
                      width: `${Math.max(width, 0.5)}%`,
                    }}
                  />
                )}
              </div>
              {item.code !== TREND_CODE && (
                <p className="tabular mt-0.5 text-xs text-ink-3">
                  元の値：{formatValue(item)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function KeikiMonthExplorer({
  months,
  selected,
  row,
  diffs,
  components,
  judgment,
}: {
  months: number[];
  selected: number;
  row: CiRow | undefined;
  /** 先行・一致・遅行指数の前月差 */
  diffs: Record<SeriesId, number | null>;
  components: KeikiComponent[];
  judgment: KeikiJudgment | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const index = months.indexOf(selected);
  const prev = index > 0 ? months[index - 1] : null;
  const next = index < months.length - 1 ? months[index + 1] : null;
  const go = (ym: number) =>
    startTransition(() =>
      router.push(`${pathname}?ym=${ym}#month`, { scroll: false })
    );

  const top = [...components]
    .filter((item) => item.series === "coincident" && item.contribution != null)
    .sort((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0));
  const best = top[0];
  const worst = top[top.length - 1];

  return (
    <section id="month" className="scroll-mt-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">月を選んで、景気を動かした指標を見る</h2>
        <p className="text-sm text-ink-2">
          景気動向指数は、生産・雇用・消費・株価など約30の指標を合成して作られます。その月にどの指標が指数を押し上げ・押し下げたかを、寄与度（ポイント）で並べます。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={prev == null}
          onClick={() => prev && go(prev)}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-sm disabled:opacity-40"
        >
          ◀ 前の月
        </button>
        <select
          value={selected}
          onChange={(event) => go(Number(event.target.value))}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-base font-semibold"
          aria-label="年月を選ぶ"
        >
          {[...months].reverse().map((ym) => (
            <option key={ym} value={ym}>
              {formatMonth(ym)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={next == null}
          onClick={() => next && go(next)}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-sm disabled:opacity-40"
        >
          次の月 ▶
        </button>
        {pending && <span className="text-sm text-ink-3">読み込み中…</span>}
      </div>

      <div className={`space-y-4 transition-opacity ${pending ? "opacity-50" : ""}`}>
        <div className="rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed">
          <p>
            <strong>{formatMonth(selected)}</strong>の一致指数は
            <strong className="tabular mx-1">{row?.coincident?.toFixed(1) ?? "—"}</strong>
            （前月差 {formatSigned(row?.coincidentDiff ?? null, 1, "")}）。
            {best && worst && best !== worst && (
              <>
                いちばん押し上げたのは<strong>「{best.name}」</strong>（
                {formatSigned(best.contribution, 2, "")}）、いちばん押し下げたのは
                <strong>「{worst.name}」</strong>（{formatSigned(worst.contribution, 2, "")}）でした。
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-ink-2">内閣府の基調判断：</span>
            {judgment ? (
              <>
                <JudgmentBadge label={judgment.label} />
                <span className="text-ink-2">
                  「景気動向指数（CI一致指数）は、{judgment.text}」
                </span>
              </>
            ) : (
              <span className="text-ink-3">この月の判断は表示できません（2021年1月分以降を表示）。</span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            3か月後方移動平均の前月差 {formatSigned(row?.ma3Diff ?? null, 2, "")}
            ／7か月後方移動平均の前月差 {formatSigned(row?.ma7Diff ?? null, 2, "")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {SERIES.map((series) => (
            <ComponentPanel
              key={series.id}
              series={series.id}
              note={series.note}
              diff={diffs[series.id]}
              components={components.filter((item) => item.series === series.id)}
            />
          ))}
        </div>
        <p className="text-xs text-ink-3">
          赤は押し上げ、青は押し下げ。「（トレンド調整）」は、先行・遅行指数を一致指数の長期的な傾きにそろえるための調整分です。まだ公表されていない指標は、傾向から推計した値で寄与度が計算されています。
        </p>
      </div>
    </section>
  );
}
