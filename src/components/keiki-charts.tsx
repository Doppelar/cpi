"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonth, formatMonthShort } from "@/lib/cpi/areas";
import { formatSigned } from "@/lib/cpi/chart-data";
import {
  type CiRow,
  type CoincidentContribRow,
  KEIKI_RANGES,
  type KeikiRangeId,
  keikiRangeStart,
  recessionsWithin,
  usedGroups,
} from "@/lib/keiki/chart-data";
import type { CoincidentGroup } from "@/lib/keiki/parse";
import { LegendChip, RangeToggle, TooltipBox } from "./chart-parts";
import { DataTable } from "./trend-charts";

const CI_SERIES = [
  { key: "coincident", label: "一致指数", note: "いまの景気", color: "var(--s1)", width: 3 },
  { key: "leading", label: "先行指数", note: "数か月先の景気", color: "var(--s2)", width: 2 },
  { key: "lagging", label: "遅行指数", note: "景気の後追い", color: "var(--s3)", width: 2 },
] as const;

const DI_SERIES = [
  { key: "diCoincident", label: "一致DI", color: "var(--s1)" },
  { key: "diLeading", label: "先行DI", color: "var(--s2)" },
] as const;

const GROUP_COLORS: Record<CoincidentGroup, string> = {
  "生産・出荷": "var(--s1)",
  雇用: "var(--s2)",
  販売: "var(--s3)",
  企業収益: "var(--s4)",
  輸出: "var(--s5)",
  その他: "var(--s-other)",
};

const fixed = (value: number | null, digits = 1) =>
  value == null ? "—" : value.toFixed(digits);

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

/** 景気後退期の帯（グラフの背景） */
function recessionAreas(from: number, to: number) {
  return recessionsWithin(from, to).map((area) => (
    <ReferenceArea
      key={area.start}
      x1={area.start}
      x2={area.end}
      fill="var(--text-muted)"
      fillOpacity={0.12}
      strokeOpacity={0}
      ifOverflow="hidden"
    />
  ));
}

export function KeikiCharts({
  ci,
  contrib,
}: {
  ci: CiRow[];
  contrib: CoincidentContribRow[];
}) {
  const [range, setRange] = useState<KeikiRangeId>("10y");
  const latest = ci[ci.length - 1];
  const from = latest ? keikiRangeStart(latest.ym, range) : 0;
  const ciData = useMemo(() => ci.filter((row) => row.ym >= from), [ci, from]);
  const contribData = useMemo(
    () => contrib.filter((row) => row.ym >= from),
    [contrib, from]
  );
  const groups = usedGroups(contribData);
  if (!latest) return null;
  const first = ciData[0]?.ym ?? from;

  const xAxis = (
    <XAxis
      dataKey="ym"
      tickFormatter={formatMonthShort}
      tickLine={false}
      axisLine={{ stroke: "var(--axis)" }}
      minTickGap={28}
      interval="preserveStartEnd"
    />
  );
  const recessionNote = (
    <p className="mt-2 flex items-center gap-2 text-xs text-ink-3">
      <span
        aria-hidden
        className="inline-block h-3 w-5 rounded-sm"
        style={{ background: "var(--text-muted)", opacity: 0.25 }}
      />
      灰色の帯は、内閣府が認定した景気後退期（景気の山から谷まで）です。
    </p>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">景気の推移</h2>
          <p className="text-sm text-ink-2">
            CI（コンポジット・インデックス）は、2020年＝100とした景気の強さの目安です。
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} options={KEIKI_RANGES} />
      </div>

      <Card
        title="先行・一致・遅行指数（CI）"
        description="一致指数が上がっていれば景気は拡大、下がっていれば後退の方向です。先行指数は一致指数より数か月早く動く傾向があります。"
      >
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {CI_SERIES.map((series) => (
            <LegendChip
              key={series.key}
              color={series.color}
              label={`${series.label}（${series.note}）`}
              value={fixed(latest[series.key])}
            />
          ))}
        </div>
        <div className="h-72 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ciData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              {recessionAreas(first, latest.ym)}
              {xAxis}
              <YAxis
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ReferenceLine y={100} stroke="var(--text-muted)" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      ym={Number(label)}
                      rows={CI_SERIES.map((series) => ({
                        color: series.color,
                        label: series.label,
                        value: fixed((payload[0].payload as CiRow)[series.key]),
                        strong: series.key === "coincident",
                      }))}
                    />
                  ) : null
                }
              />
              {CI_SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stroke={series.color}
                  strokeWidth={series.width}
                  dot={false}
                  activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {recessionNote}
        <DataTable
          caption="CI 先行・一致・遅行指数"
          headers={["年月", "一致指数", "先行指数", "遅行指数", "一致指数の前月差"]}
          rows={[...ciData].reverse().map((row) => [
            formatMonth(row.ym),
            fixed(row.coincident),
            fixed(row.leading),
            fixed(row.lagging),
            formatSigned(row.coincidentDiff, 1, ""),
          ])}
        />
      </Card>

      <Card
        title="一致指数を動かしたもの（寄与度）"
        description="一致指数の前月からの変化（黒い線）を、生産・雇用・販売など分野ごとの押し上げ・押し下げに分けた積み上げグラフです。"
      >
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          <LegendChip color="var(--text-primary)" label="一致指数の前月差" />
          {groups.map((group) => (
            <LegendChip
              key={group}
              color={GROUP_COLORS[group]}
              label={group}
              shape="square"
            />
          ))}
        </div>
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={contribData}
              stackOffset="sign"
              barCategoryGap="15%"
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              {xAxis}
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ReferenceLine y={0} stroke="var(--axis)" />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as CoincidentContribRow;
                  return (
                    <TooltipBox
                      ym={Number(label)}
                      rows={[
                        {
                          color: "var(--text-primary)",
                          label: "一致指数の前月差",
                          value: formatSigned(row.diff, 1, ""),
                          strong: true,
                        },
                        ...groups
                          .filter((group) => row[group] != null)
                          .sort(
                            (a, b) =>
                              Math.abs(row[b] ?? 0) - Math.abs(row[a] ?? 0)
                          )
                          .map((group) => ({
                            color: GROUP_COLORS[group],
                            label: group,
                            value: formatSigned(row[group] ?? null, 2, ""),
                          })),
                      ]}
                    />
                  );
                }}
              />
              {groups.map((group) => (
                <Bar
                  key={group}
                  dataKey={group}
                  stackId="contrib"
                  fill={GROUP_COLORS[group]}
                  stroke="var(--card)"
                  strokeWidth={range === "all" ? 0 : 1}
                  isAnimationActive={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="diff"
                stroke="var(--text-primary)"
                strokeWidth={1.5}
                dot={range === "5y" ? { r: 2, fill: "var(--text-primary)", strokeWidth: 0 } : false}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-ink-3">
          生産・出荷：鉱工業の生産・出荷の指数／雇用：労働投入量・有効求人倍率／販売：小売・卸売の販売額／企業収益：営業利益／輸出：輸出数量。単位はポイント。
        </p>
        <DataTable
          caption="一致指数の前月差の寄与度"
          headers={["年月", "前月差", ...groups]}
          rows={[...contribData].reverse().map((row) => [
            formatMonth(row.ym),
            formatSigned(row.diff, 1, ""),
            ...groups.map((group) => formatSigned(row[group] ?? null, 2, "")),
          ])}
        />
      </Card>

      <Card
        title="DI（ディフュージョン・インデックス）"
        description="採用している指標のうち、3か月前より改善したものの割合（%）。50%を上回ると、改善している指標のほうが多いことを表します。"
      >
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {DI_SERIES.map((series) => (
            <LegendChip
              key={series.key}
              color={series.color}
              label={series.label}
              value={latest[series.key] == null ? undefined : `${fixed(latest[series.key])}%`}
            />
          ))}
        </div>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ciData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              {recessionAreas(first, latest.ym)}
              {xAxis}
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ReferenceLine y={50} stroke="var(--text-muted)" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      ym={Number(label)}
                      rows={DI_SERIES.map((series) => ({
                        color: series.color,
                        label: series.label,
                        value: `${fixed((payload[0].payload as CiRow)[series.key])}%`,
                        strong: series.key === "diCoincident",
                      }))}
                    />
                  ) : null
                }
              />
              {DI_SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="linear"
                  dataKey={series.key}
                  stroke={series.color}
                  strokeWidth={series.key === "diCoincident" ? 2 : 1.5}
                  dot={false}
                  activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {recessionNote}
      </Card>
    </section>
  );
}
