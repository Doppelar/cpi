import Link from "next/link";
import { AREAS, type AreaId, formatMonth } from "@/lib/cpi/areas";
import {
  buildContribRows,
  buildHeadlineRows,
  formatSigned,
} from "@/lib/cpi/chart-data";
import {
  getHeadlineSeries,
  getMajorSeries,
  getMonthItems,
  getMonths,
  getWatchSeries,
} from "@/lib/cpi/queries";
import { HEADLINE_CODES, type HeadlinePoint, WATCH_NAMES } from "@/lib/cpi/types";
import { MonthExplorer } from "./month-explorer";
import { TrendCharts } from "./trend-charts";
import { WatchGrid } from "./watch-grid";

function pick(points: readonly HeadlinePoint[], code: string, ym: number) {
  return points.find((point) => point.code === code && point.ym === ym);
}

/** 前月からの変化を言葉にする */
function trendWord(current: number | null, previous: number | null) {
  if (current == null || previous == null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return "前月と同じ";
  return `前月より伸び率が${Math.abs(diff).toFixed(1)}ポイント${diff > 0 ? "拡大" : "縮小"}`;
}

export async function AreaDashboard({
  area,
  requestedYm,
}: {
  area: AreaId;
  requestedYm?: string;
}) {
  const info = AREAS[area];
  const months = await getMonths(area);
  if (months.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-card p-6 text-ink-2">
        データを準備中です。しばらくしてからもう一度ご覧ください。
      </p>
    );
  }
  const latest = months[months.length - 1];
  const selected =
    requestedYm && months.includes(Number(requestedYm))
      ? Number(requestedYm)
      : latest;

  const [headline, majors, monthItems, watch] = await Promise.all([
    getHeadlineSeries(area),
    getMajorSeries(area),
    getMonthItems(area, selected),
    getWatchSeries(area, WATCH_NAMES),
  ]);
  const headlineRows = buildHeadlineRows(headline);
  const contribRows = buildContribRows(majors, headlineRows);

  const total = pick(headline, HEADLINE_CODES.total, latest);
  const previousYm = months[months.length - 2];
  const totalPrev = previousYm
    ? pick(headline, HEADLINE_CODES.total, previousYm)
    : undefined;
  const core = pick(headline, HEADLINE_CODES.core, latest);
  const coreCore = pick(headline, HEADLINE_CODES.coreCore, latest);
  const energy = pick(headline, HEADLINE_CODES.energy, latest);
  const fresh = pick(headline, HEADLINE_CODES.fresh, latest);
  const yen =
    total?.yoy != null ? Math.round(10000 * (1 + total.yoy / 100)) : null;

  const cards = [
    {
      label: "生鮮食品を除く総合",
      sub: "コア指数。天候で大きく動く生鮮食品を除いた、物価の基調",
      value: core?.yoy ?? null,
    },
    {
      label: "生鮮食品及びエネルギーを除く総合",
      sub: "コアコア指数。海外要因で動きやすいエネルギーも除いた値",
      value: coreCore?.yoy ?? null,
    },
    {
      label: "エネルギー",
      sub: "電気代・ガス代・ガソリン・灯油など",
      value: energy?.yoy ?? null,
    },
    {
      label: "生鮮食品",
      sub: "生鮮魚介・生鮮野菜・生鮮果物",
      value: fresh?.yoy ?? null,
    },
  ];

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {info.label}の消費者物価指数
          </h1>
          <p className="text-sm text-ink-3">最新：{formatMonth(latest)}分</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-line bg-card p-6">
            <p className="text-sm text-ink-2">
              {formatMonth(latest)}の物価（総合）は、1年前と比べて
            </p>
            <p className="tabular mt-1 text-5xl font-bold tracking-tight sm:text-6xl">
              {formatSigned(total?.yoy ?? null)}
            </p>
            <p className="mt-3 text-sm text-ink-2">
              {yen != null ? (
                <>
                  1年前に<strong>10,000円</strong>
                  だった買い物が、いまは約
                  <strong className="tabular">{yen.toLocaleString()}円</strong>
                  。
                </>
              ) : (
                "1年前のデータがまだないため、前年同月比は表示できません。"
              )}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <div>
                <dt className="text-ink-3">前月比</dt>
                <dd className="tabular text-lg font-semibold">
                  {formatSigned(total?.mom ?? null)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">指数（2025年＝100）</dt>
                <dd className="tabular text-lg font-semibold">
                  {total?.index?.toFixed(1) ?? "—"}
                </dd>
              </div>
            </dl>
            {trendWord(total?.yoy ?? null, totalPrev?.yoy ?? null) && (
              <p className="mt-3 text-xs text-ink-3">
                {trendWord(total?.yoy ?? null, totalPrev?.yoy ?? null)}
                （{formatMonth(previousYm)}は
                {formatSigned(totalPrev?.yoy ?? null)}）
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-line bg-card p-4"
              >
                <p className="text-sm font-semibold">{card.label}</p>
                <p className="tabular mt-1 text-3xl font-bold">
                  {formatSigned(card.value)}
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  前年同月比。{card.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-ink-2">
          消費者物価指数は、家計が買うモノやサービスの値段の動きを、まとめて1つの数字にしたものです。
          <Link href="/about" className="text-accent underline">
            くわしい見方はこちら
          </Link>
        </p>
      </section>

      <TrendCharts headline={headlineRows} contrib={contribRows} />

      <MonthExplorer
        area={area}
        months={months}
        selected={selected}
        items={monthItems}
      />

      <WatchGrid points={watch} names={WATCH_NAMES} />

      <p className="text-xs text-ink-3">データの期間：{info.coverage}</p>
    </div>
  );
}
