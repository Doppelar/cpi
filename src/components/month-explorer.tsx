"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { type AreaId, formatMonth } from "@/lib/cpi/areas";
import {
  formatSigned,
  rankItems,
  SORT_LABELS,
  type SortKey,
  topMovers,
} from "@/lib/cpi/chart-data";
import type { MonthItem } from "@/lib/cpi/types";
import { ItemDetail } from "./item-detail";

const PAGE = 30;

function valueText(item: MonthItem, key: SortKey) {
  return key === "contribYoy"
    ? formatSigned(item[key], 2, "pt")
    : formatSigned(item[key]);
}

/** 横向きの棒（0 から右が上昇＝赤、左が下落＝青） */
function MoverList({
  title,
  items,
  sortKey,
  scale,
  direction,
  onSelect,
}: {
  title: string;
  items: MonthItem[];
  sortKey: SortKey;
  scale: number;
  direction: "up" | "down";
  onSelect: (item: MonthItem) => void;
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
      {items.length === 0 ? (
        <p className="text-sm text-ink-3">該当する品目はありません。</p>
      ) : (
        <ol className="space-y-1">
          {items.map((item, i) => {
            const value = item[sortKey] ?? 0;
            const width = scale > 0 ? (Math.abs(value) / scale) * 100 : 0;
            return (
              <li key={item.code}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group grid w-full grid-cols-[1.5rem_minmax(0,9rem)_1fr_4.5rem] items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-surface-2"
                  title={`${item.name}：${SORT_LABELS[sortKey]} ${valueText(item, sortKey)}（クリックで推移）`}
                >
                  <span className="tabular text-xs text-ink-3">{i + 1}</span>
                  <span className="truncate">
                    {item.name}
                    <span className="ml-1 text-xs text-ink-3">
                      {item.category}
                    </span>
                  </span>
                  <span className="h-3 rounded-r bg-surface-2">
                    <span
                      className={`block h-3 rounded-r ${direction === "up" ? "bg-up" : "bg-down"}`}
                      style={{ width: `${Math.max(width, 2)}%` }}
                    />
                  </span>
                  <span className="tabular text-right font-semibold">
                    {valueText(item, sortKey)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function MonthExplorer({
  area,
  months,
  selected,
  items,
}: {
  area: AreaId;
  months: number[];
  selected: number;
  items: MonthItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const hasYoy = items.some((item) => item.yoy != null);
  const [sortKey, setSortKey] = useState<SortKey>("contribYoy");
  const effectiveKey: SortKey = hasYoy ? sortKey : "mom";
  const [category, setCategory] = useState<string>("すべて");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [detail, setDetail] = useState<MonthItem | null>(null);

  const index = months.indexOf(selected);
  const prev = index > 0 ? months[index - 1] : null;
  const next = index < months.length - 1 ? months[index + 1] : null;
  const go = (ym: number) => {
    setDetail(null);
    setShown(PAGE);
    startTransition(() =>
      router.push(`${pathname}?ym=${ym}#items`, { scroll: false })
    );
  };

  const majors = items.filter((item) => item.kind === "major");
  const movers = useMemo(() => topMovers(items, effectiveKey, 10), [items, effectiveKey]);
  const scale = Math.max(
    ...[...movers.up, ...movers.down].map((item) =>
      Math.abs(item[effectiveKey] ?? 0)
    ),
    0
  );
  const filtered = useMemo(() => {
    const words = query.trim();
    return rankItems(items, effectiveKey).filter(
      (item) =>
        (category === "すべて" || item.category === category) &&
        (!words || item.name.includes(words))
    );
  }, [items, effectiveKey, category, query]);

  const topUp = topMovers(items, "contribYoy", 1).up[0];
  const topDown = topMovers(items, "contribYoy", 1).down[0];

  return (
    <section id="items" className="scroll-mt-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">月を選んで、動いた品目を見る</h2>
        <p className="text-sm text-ink-2">
          約580の品目のうち、その月に値上がり・値下がりが大きかったものを並べます。品目を押すと推移が見られます。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={prev == null}
          onClick={() => prev && go(prev)}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-sm disabled:opacity-40"
          aria-label="前の月"
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
          aria-label="次の月"
        >
          次の月 ▶
        </button>
        {pending && <span className="text-sm text-ink-3">読み込み中…</span>}
      </div>

      <div
        className={`space-y-4 transition-opacity ${pending ? "opacity-50" : ""}`}
      >
        <div className="rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed">
          <p>
            <strong>{formatMonth(selected)}</strong>
            {hasYoy && topUp ? (
              <>
                に物価をいちばん押し上げたのは
                <strong>「{topUp.name}」</strong>（前年同月比
                {formatSigned(topUp.yoy)}、寄与度
                {formatSigned(topUp.contribYoy, 2, "pt")}）
                {topDown && (
                  <>
                    、いちばん押し下げたのは
                    <strong>「{topDown.name}」</strong>（前年同月比
                    {formatSigned(topDown.yoy)}、寄与度
                    {formatSigned(topDown.contribYoy, 2, "pt")}）
                  </>
                )}
                でした。
              </>
            ) : (
              "は1年前のデータがないため、前月比で並べています。"
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("すべて")}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                category === "すべて"
                  ? "border-ink bg-ink text-card"
                  : "border-line bg-surface-2 text-ink-2 hover:text-ink"
              }`}
            >
              すべて
            </button>
            {majors.map((major) => (
              <button
                key={major.code}
                type="button"
                onClick={() => setCategory(major.name)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  category === major.name
                    ? "border-ink bg-ink text-card"
                    : "border-line bg-surface-2 text-ink-2 hover:text-ink"
                }`}
              >
                {major.name}
                <span className="tabular ml-1 font-semibold">
                  {formatSigned(hasYoy ? major.yoy : major.mom)}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            費目の数字は{hasYoy ? "前年同月比" : "前月比"}。押すと下の一覧をその費目にしぼります。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-2">並べる基準：</span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              disabled={!hasYoy && key !== "mom"}
              onClick={() => setSortKey(key)}
              className={`rounded-full border px-3 py-1 disabled:opacity-40 ${
                effectiveKey === key
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-card text-ink-2 hover:text-ink"
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3">
          {effectiveKey === "contribYoy"
            ? "寄与度は「値上がり率 × 家計に占める割合」。支出の多い品目ほど大きくなり、物価全体への影響の大きさがわかります。"
            : effectiveKey === "yoy"
              ? "前年同月比は、1年前の同じ月と比べた値段の変化率です。支出の割合は考えません。"
              : "前月比は、前の月と比べた値段の変化率です。季節による動きも含みます。"}
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <MoverList
            title="値上がり・押し上げ TOP10"
            items={movers.up}
            sortKey={effectiveKey}
            scale={scale}
            direction="up"
            onSelect={setDetail}
          />
          <MoverList
            title="値下がり・押し下げ TOP10"
            items={movers.down}
            sortKey={effectiveKey}
            scale={scale}
            direction="down"
            onSelect={setDetail}
          />
        </div>

        {detail && (
          <ItemDetail
            area={area}
            item={detail}
            selectedYm={selected}
            onClose={() => setDetail(null)}
          />
        )}

        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="mr-auto font-bold">全品目の一覧</h4>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setShown(PAGE);
              }}
              className="rounded-lg border border-line bg-card px-2 py-1 text-sm"
              aria-label="費目でしぼる"
            >
              <option>すべて</option>
              {majors.map((major) => (
                <option key={major.code}>{major.name}</option>
              ))}
            </select>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(PAGE);
              }}
              placeholder="品目名でさがす（例：卵）"
              className="w-48 rounded-lg border border-line bg-card px-2 py-1 text-base sm:text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-ink-3">
            {filtered.length}品目・{SORT_LABELS[effectiveKey]}の大きい順
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="tabular w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-3">
                  <th className="py-1.5 text-left font-medium">品目</th>
                  <th className="py-1.5 text-left font-medium">費目</th>
                  <th className="py-1.5 text-right font-medium">前月比</th>
                  <th className="py-1.5 text-right font-medium">前年同月比</th>
                  <th className="py-1.5 text-right font-medium">寄与度</th>
                  <th className="py-1.5 text-right font-medium">ウエイト</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map((item) => (
                  <tr
                    key={item.code}
                    onClick={() => setDetail(item)}
                    className="cursor-pointer border-b border-line/60 hover:bg-surface-2"
                  >
                    <td className="py-1.5 text-left font-medium">{item.name}</td>
                    <td className="py-1.5 text-left text-xs text-ink-3">
                      {item.category}
                    </td>
                    <Cell value={item.mom} />
                    <Cell value={item.yoy} />
                    <Cell value={item.contribYoy} digits={2} unit="" />
                    <td className="py-1.5 text-right text-ink-3">
                      {item.weight10k ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown < filtered.length && (
            <button
              type="button"
              onClick={() => setShown((count) => count + 60)}
              className="mt-3 w-full rounded-lg border border-line py-2 text-sm text-ink-2 hover:bg-surface-2"
            >
              もっと見る（残り{filtered.length - shown}品目）
            </button>
          )}
          <p className="mt-2 text-xs text-ink-3">
            ウエイトは家計の支出に占める割合（1万分比）。寄与度の単位はポイント。
          </p>
        </div>
      </div>
    </section>
  );
}

/** 上がった値は赤、下がった値は青の文字で（符号もつける） */
function Cell({
  value,
  digits = 1,
  unit = "%",
}: {
  value: number | null;
  digits?: number;
  unit?: string;
}) {
  const shown = formatSigned(value, digits, unit);
  const tone =
    value == null || Number(value.toFixed(digits)) === 0
      ? "text-ink-2"
      : value > 0
        ? "text-up"
        : "text-down";
  return <td className={`py-1.5 text-right ${tone}`}>{shown}</td>;
}
