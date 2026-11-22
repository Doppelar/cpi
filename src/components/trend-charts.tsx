"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame } from "./chart-frame";
import { formatMonth, formatMonthShort } from "@/lib/cpi/areas";
import {
  type ContribRow,
  formatSigned,
  type HeadlineRow,
  type RangeId,
  rangeStart,
} from "@/lib/cpi/chart-data";
import { CONTRIB_GROUPS } from "@/lib/cpi/types";
import { LegendChip, RangeToggle, TooltipBox } from "./chart-parts";
import { CpiContribNote, CpiTrendNote } from "./easy-notes";

const HEADLINE_SERIES = [
  { key: "total", label: "総合", color: "var(--s1)", width: 3 },
  { key: "core", label: "生鮮食品を除く総合（コア）", color: "var(--s2)", width: 2 },
  {
    key: "coreCore",
    label: "生鮮食品及びエネルギーを除く総合（コアコア）",
    color: "var(--s3)",
    width: 2,
  },
] as const;

const GROUP_COLORS: Record<(typeof CONTRIB_GROUPS)[number], string> = {
  食料: "var(--s1)",
  "光熱・水道": "var(--s2)",
  "交通・通信": "var(--s3)",
  住居: "var(--s4)",
  教養娯楽: "var(--s5)",
  "家具・家事用品": "var(--s6)",
  諸雑費: "var(--s7)",
  その他: "var(--s-other)",
};

const percentTick = (value: number) => `${value}%`;

/** 縦軸を整数の%で区切る（0 は必ず含める） */
const niceDomain: [(min: number) => number, (max: number) => number] = [
  (min) => Math.min(0, Math.floor(min)),
  (max) => Math.max(0, Math.ceil(max)),
];

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-ink-2">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function TrendCharts({
  headline,
  contrib,
}: {
  headline: HeadlineRow[];
  contrib: ContribRow[];
}) {
  const [range, setRange] = useState<RangeId>("3y");
  const latest = headline[headline.length - 1];
  const from = latest ? rangeStart(latest.ym, range) : 0;
  const headlineData = useMemo(
    () => headline.filter((row) => row.ym >= from),
    [headline, from]
  );
  const contribData = useMemo(
    () => contrib.filter((row) => row.ym >= from),
    [contrib, from]
  );

  if (!latest) {
    return (
      <p className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-2">
        前年同月比は、1年分のデータがそろってから表示します。
      </p>
    );
  }

  const xAxis = (
    <XAxis
      dataKey="ym"
      tickFormatter={formatMonthShort}
      tickLine={false}
      axisLine={{ stroke: "var(--axis)" }}
      minTickGap={24}
      interval="preserveStartEnd"
    />
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">物価の推移</h2>
          <p className="text-sm text-ink-2">
            1年前の同じ月と比べて、何%上がったか（前年同月比）
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      <Card
        title="総合・コア・コアコアの前年同月比"
        description={
          <>
            点線の2%は、日本銀行が目標にしている物価上昇率です。グラフに触れると各月の値が出ます。
          </>
        }
      >
        <div className="mb-4">
          <CpiTrendNote />
        </div>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {HEADLINE_SERIES.map((series) => (
            <LegendChip
              key={series.key}
              color={series.color}
              label={series.label}
              value={formatSigned(latest[series.key])}
            />
          ))}
        </div>
        <ChartFrame className="h-72 sm:h-80">
          {({ width, height }) => (
            <LineChart
              width={width}
              height={height}
              data={headlineData}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              {xAxis}
              <YAxis
                tickFormatter={percentTick}
                domain={niceDomain}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ReferenceLine y={0} stroke="var(--axis)" />
              <ReferenceLine
                y={2}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                label={{
                  value: "物価目標 2%",
                  position: "insideBottomRight",
                  fill: "var(--text-muted)",
                  fontSize: 12,
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      ym={Number(label)}
                      rows={HEADLINE_SERIES.map((series) => ({
                        color: series.color,
                        label: series.label.replace(/（.+）/, ""),
                        value: formatSigned(
                          (payload[0].payload as HeadlineRow)[series.key]
                        ),
                        strong: series.key === "total",
                      }))}
                    />
                  ) : null
                }
              />
              {HEADLINE_SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={series.width}
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ChartFrame>
        <DataTable
          caption="総合・コア・コアコアの前年同月比"
          headers={["年月", ...HEADLINE_SERIES.map((s) => s.label)]}
          rows={[...headlineData].reverse().map((row) => [
            formatMonth(row.ym),
            ...HEADLINE_SERIES.map((s) => formatSigned(row[s.key])),
          ])}
        />
      </Card>

      <Card
        title="何が物価を押し上げたか（寄与度）"
        description={
          <>
            総合の前年同月比（黒い線）を、費目ごとの「押し上げ分」に分けた積み上げグラフです。棒が0より上なら物価を押し上げ、下なら押し下げています。
          </>
        }
      >
        <div className="mb-4">
          <CpiContribNote />
        </div>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          <LegendChip color="var(--text-primary)" label="総合" />
          {CONTRIB_GROUPS.map((group) => (
            <LegendChip
              key={group}
              color={GROUP_COLORS[group]}
              label={group}
              shape="square"
            />
          ))}
        </div>
        <ChartFrame className="h-80 sm:h-96">
          {({ width, height }) => (
            <ComposedChart
              width={width}
              height={height}
              data={contribData}
              stackOffset="sign"
              barCategoryGap="18%"
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              {xAxis}
              <YAxis
                tickFormatter={percentTick}
                domain={niceDomain}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ReferenceLine y={0} stroke="var(--axis)" />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as ContribRow;
                  const groups = CONTRIB_GROUPS.filter(
                    (group) => row[group] != null
                  ).sort(
                    (a, b) => Math.abs(row[b] ?? 0) - Math.abs(row[a] ?? 0)
                  );
                  return (
                    <TooltipBox
                      ym={Number(label)}
                      rows={[
                        {
                          color: "var(--text-primary)",
                          label: "総合（前年同月比）",
                          value: formatSigned(row.total),
                          strong: true,
                        },
                        ...groups.map((group) => ({
                          color: GROUP_COLORS[group],
                          label: group,
                          value: formatSigned(row[group] ?? null, 2, "pt"),
                        })),
                      ]}
                    />
                  );
                }}
              />
              {CONTRIB_GROUPS.map((group) => (
                <Bar
                  key={group}
                  dataKey={group}
                  stackId="contrib"
                  fill={GROUP_COLORS[group]}
                  stroke="var(--card)"
                  strokeWidth={1}
                  isAnimationActive={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--text-primary)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "var(--text-primary)", strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          )}
        </ChartFrame>
        <p className="mt-2 text-xs text-ink-3">
          「その他」は被服及び履物・保健医療・教育の合計。単位のpt（ポイント）は、総合の上昇率のうち何%分を担ったかを表します。
        </p>
        <DataTable
          caption="費目別の寄与度"
          headers={["年月", "総合", ...CONTRIB_GROUPS]}
          rows={[...contribData].reverse().map((row) => [
            formatMonth(row.ym),
            formatSigned(row.total),
            ...CONTRIB_GROUPS.map((group) =>
              formatSigned(row[group] ?? null, 2, "")
            ),
          ])}
        />
      </Card>
    </section>
  );
}

/** グラフの数字を表で見る */
export function DataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-ink-2 hover:text-ink">
        表で見る
      </summary>
      <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-line">
        <table className="tabular w-full text-right text-xs sm:text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={header}
                  className={`whitespace-nowrap px-2 py-1.5 font-semibold ${i === 0 ? "text-left" : ""}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-line">
                {row.map((cell, i) => (
                  <td
                    key={`${row[0]}-${headers[i]}`}
                    className={`whitespace-nowrap px-2 py-1 ${i === 0 ? "text-left" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
