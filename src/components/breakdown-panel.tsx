"use client";

import { useMemo } from "react";
import { formatMonth } from "@/lib/cpi/areas";
import {
  type BreakdownKey,
  type BreakdownMajor,
  type BreakdownMiddle,
  buildBreakdown,
} from "@/lib/cpi/breakdown";
import { formatSigned } from "@/lib/cpi/chart-data";
import type { MonthItem } from "@/lib/cpi/types";
import { EasyNote } from "./explain-mode";

const pt = (value: number | null) => formatSigned(value, 2, "pt");

/** いちばん効いたものを、文章で短く伝える */
function leadSentence(
  up: BreakdownMajor[],
  down: BreakdownMajor[],
  total: number | null,
  rateLabel: string
) {
  const flat = (majors: BreakdownMajor[]) =>
    majors.flatMap((major) => major.middles).sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
  const ups = flat(up).slice(0, 3);
  const downs = flat(down).slice(0, 2);
  const name = (middle: BreakdownMiddle) =>
    `${middle.name}（${pt(middle.contrib)}${middle.topItem ? `、主に${middle.topItem.name}` : ""}）`;
  return (
    <>
      物価（総合）の{rateLabel}
      <strong className="tabular mx-1">{formatSigned(total)}</strong>
      のうち、押し上げが大きかったのは{ups.map(name).join("、") || "—"}。
      {downs.length > 0 && <>一方、{downs.map(name).join("、")}が押し下げました。</>}
    </>
  );
}

function MiddleRow({
  middle,
  scale,
  direction,
  rateLabel,
  onSelect,
}: {
  middle: BreakdownMiddle;
  scale: number;
  direction: "up" | "down";
  rateLabel: string;
  onSelect: (code: string) => void;
}) {
  const width = scale > 0 ? (Math.abs(middle.contrib) / scale) * 100 : 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(middle.code)}
        className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
        title={`${middle.name}の推移を見る`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{middle.name}</span>
          <span className="tabular shrink-0 text-sm">
            <span className="text-ink-3">{rateLabel}</span>{" "}
            <span className={direction === "up" ? "text-up" : "text-down"}>
              {formatSigned(middle.rate)}
            </span>
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-3 flex-1 rounded-r bg-surface-2">
            <span
              className={`block h-3 rounded-r ${direction === "up" ? "bg-up" : "bg-down"}`}
              style={{ width: `${Math.max(width, 3)}%` }}
            />
          </span>
          <span className="tabular w-16 shrink-0 text-right text-sm font-bold">{pt(middle.contrib)}</span>
        </div>
        {middle.topItem && (
          <p className="mt-1 text-xs text-ink-2">
            主な品目：{middle.topItem.name}{" "}
            <span className="tabular">
              {formatSigned(middle.topItem.rate)}（{pt(middle.topItem.contrib)}）
            </span>
          </p>
        )}
      </button>
    </li>
  );
}

function Column({
  title,
  majors,
  scale,
  direction,
  rateLabel,
  onSelect,
}: {
  title: string;
  majors: BreakdownMajor[];
  scale: number;
  direction: "up" | "down";
  rateLabel: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <h4 className="mb-3 flex items-center gap-2 font-bold">
        <span
          aria-hidden
          className={`inline-block h-3 w-3 rounded-sm ${direction === "up" ? "bg-up" : "bg-down"}`}
        />
        {title}
      </h4>
      {majors.length === 0 ? (
        <p className="text-sm text-ink-3">該当するものはありません。</p>
      ) : (
        <div className="space-y-4">
          {majors.map((major) => (
            <section key={major.name}>
              <p className="mb-1 flex items-baseline justify-between border-b border-line pb-1 text-sm">
                <span className="font-bold">{major.name}</span>
                <span className="tabular text-xs text-ink-3">費目全体 {pt(major.contrib)}</span>
              </p>
              <ul className="space-y-0.5">
                {major.middles.map((middle) => (
                  <MiddleRow
                    key={middle.code}
                    middle={middle}
                    scale={scale}
                    direction={direction}
                    rateLabel={rateLabel}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** 「物価を動かした主な内訳」（10大費目 → 中分類 → 主な品目） */
export function BreakdownPanel({
  items,
  selected,
  useYoy,
  onSelect,
}: {
  items: MonthItem[];
  selected: number;
  /** 前年同月比があれば true（なければ前月比で作る） */
  useYoy: boolean;
  onSelect: (item: MonthItem) => void;
}) {
  const key: BreakdownKey = useYoy ? "contribYoy" : "contribMom";
  const rateLabel = useYoy ? "前年同月比" : "前月比";
  const { up, down } = useMemo(() => buildBreakdown(items, key), [items, key]);
  const total = useMemo(() => {
    const majors = items.filter((item) => item.kind === "major" && item[key] != null);
    return majors.length > 0
      ? Math.round(majors.reduce((sum, item) => sum + (item[key] as number), 0) * 100) / 100
      : null;
  }, [items, key]);
  const scale = Math.max(
    ...[...up, ...down].flatMap((major) => major.middles.map((middle) => Math.abs(middle.contrib))),
    0
  );
  if (up.length === 0 && down.length === 0) return null;

  const select = (code: string) => {
    const item = items.find((candidate) => candidate.code === code);
    if (item) onSelect(item);
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-bold">
          物価を動かした主な内訳（{formatMonth(selected)}・{rateLabel}）
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{leadSentence(up, down, total, rateLabel)}</p>
      </div>
      <EasyNote title="この内訳の見方">
        <p>
          品物を「食料」「交通・通信」などの大きなグループ（費目）に分け、その中のまとまり（中分類）ごとに、物価全体をどれだけ動かしたかを並べています。
        </p>
        <p>
          <strong>棒の長さ（pt）</strong>は、物価全体の上がり方のうち、そのまとまりが受け持った分です。たとえば「調理食品 +0.16pt」は、全体の上昇のうち0.16%分がお惣菜などの値上がりによる、という意味です。
          右の「{rateLabel}」は、そのまとまり自体の値段がどれだけ変わったかです。
        </p>
        <p>「主な品目」は、そのまとまりの中で一番大きく効いた品物です。行を押すと、値段の動きをグラフで見られます。</p>
      </EasyNote>
      <div className="grid gap-4 lg:grid-cols-2">
        <Column
          title="押し上げた主なもの"
          majors={up}
          scale={scale}
          direction="up"
          rateLabel={rateLabel}
          onSelect={select}
        />
        <Column
          title="押し下げた主なもの"
          majors={down}
          scale={scale}
          direction="down"
          rateLabel={rateLabel}
          onSelect={select}
        />
      </div>
      <p className="text-xs text-ink-3">
        総務省の公表資料「総合指数の前年同月比に寄与した主な内訳」と同じ考え方で、寄与度がおおむね0.1pt以上の中分類を載せています（少ない月は大きい順に補います）。寄与度は当サイトの計算で、公表値と小数点以下が異なることがあります。
      </p>
    </section>
  );
}
