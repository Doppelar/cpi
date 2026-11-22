import "server-only";
import { formatMonth } from "@/lib/cpi/areas";
import { formatSigned, topMovers } from "@/lib/cpi/chart-data";
import {
  getHeadlineSeries,
  getMonthItems,
  getMonths,
  getWatchSeries,
} from "@/lib/cpi/queries";
import { HEADLINE_CODES, WATCH_NAMES } from "@/lib/cpi/types";
import { buildCiRows } from "@/lib/keiki/chart-data";
import { getJudgments, getKeikiComponents, getKeikiMonthly } from "@/lib/keiki/queries";
import type { InterviewTopic } from "./topics";

export type InterviewContext = {
  /** 最初のあいさつに入れる一文 */
  headline: string;
  /** AI に渡すデータの説明 */
  data: string;
};

async function cpiContext(area: "national" | "tokyo"): Promise<InterviewContext> {
  const label = area === "tokyo" ? "東京都区部" : "全国";
  const months = await getMonths(area);
  const latest = months[months.length - 1];
  if (!latest) return { headline: "", data: "データを準備中です。" };
  const [headline, items, watch] = await Promise.all([
    getHeadlineSeries(area),
    getMonthItems(area, latest),
    getWatchSeries(area, WATCH_NAMES),
  ]);
  const yoy = (code: string) =>
    headline.find((point) => point.code === code && point.ym === latest)?.yoy ?? null;
  const total = yoy(HEADLINE_CODES.total);
  const { up, down } = topMovers(items, "contribYoy", 6);
  const latestWatch = WATCH_NAMES.map((name) => {
    const point = [...watch].reverse().find((p) => p.name === name && p.yoy != null);
    return point ? `${name} ${formatSigned(point.yoy)}` : null;
  }).filter(Boolean);
  const majors = items
    .filter((item) => item.kind === "major")
    .map((item) => `${item.name} ${formatSigned(item.yoy)}`);
  return {
    headline: `${formatMonth(latest)}の${label}の物価（総合）は、1年前より${formatSigned(total)}でした。`,
    data: [
      `- 地域：${label}／最新：${formatMonth(latest)}分（総務省統計局「消費者物価指数」）`,
      `- 前年同月比：総合 ${formatSigned(total)}、生鮮食品を除く総合（コア） ${formatSigned(yoy(HEADLINE_CODES.core))}、生鮮食品及びエネルギーを除く総合（コアコア） ${formatSigned(yoy(HEADLINE_CODES.coreCore))}、エネルギー ${formatSigned(yoy(HEADLINE_CODES.energy))}、生鮮食品 ${formatSigned(yoy(HEADLINE_CODES.fresh))}`,
      `- 費目別の前年同月比：${majors.join("、")}`,
      `- 物価を押し上げた品目（寄与度の大きい順）：${up.map((item) => `${item.name}（${formatSigned(item.yoy)}）`).join("、")}`,
      `- 物価を押し下げた品目：${down.map((item) => `${item.name}（${formatSigned(item.yoy)}）`).join("、")}`,
      `- 身近な品目の前年同月比：${latestWatch.join("、")}`,
      "- 日本銀行は、物価が前年比2%程度で安定して上がることを目標にしています。",
    ].join("\n"),
  };
}

async function keikiContext(): Promise<InterviewContext> {
  const [monthly, judgments] = await Promise.all([getKeikiMonthly(), getJudgments()]);
  const ci = buildCiRows(monthly);
  const latest = ci[ci.length - 1];
  const judgment = judgments[judgments.length - 1];
  if (!latest) return { headline: "", data: "データを準備中です。" };
  const components = await getKeikiComponents(latest.ym);
  const coincident = components
    .filter((item) => item.series === "coincident" && item.contribution != null)
    .sort((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0));
  const recent = judgments
    .slice(-6)
    .map((j) => `${formatMonth(j.ym)}「${j.label ?? j.text}」`)
    .join("→");
  return {
    headline: judgment
      ? `${formatMonth(judgment.ym)}分の国（内閣府）の判断は「${judgment.label ?? judgment.text}」です。`
      : "",
    data: [
      `- 最新：${formatMonth(latest.ym)}分（内閣府「景気動向指数」、2020年＝100）`,
      `- 一致指数（いまの景気）${latest.coincident?.toFixed(1)}（前月差 ${formatSigned(latest.coincidentDiff, 1, "")}）、先行指数（少し先の景気）${latest.leading?.toFixed(1)}、遅行指数 ${latest.lagging?.toFixed(1)}`,
      judgment ? `- 内閣府の基調判断：景気動向指数（CI一致指数）は、${judgment.text}` : "",
      `- 最近の基調判断の流れ：${recent}`,
      `- 一致指数を押し上げた指標：${coincident.slice(0, 3).map((c) => c.name).join("、")}`,
      `- 押し下げた指標：${coincident.slice(-3).reverse().map((c) => c.name).join("、")}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function getInterviewContext(topic: InterviewTopic): Promise<InterviewContext> {
  if (topic === "keiki") return keikiContext();
  return cpiContext(topic === "cpi-tokyo" ? "tokyo" : "national");
}
