"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  YAxis,
} from "recharts";
import { ChartFrame } from "./chart-frame";
import { shiftMonth } from "@/lib/cpi/derive";
import { formatMonth } from "@/lib/cpi/areas";
import { formatSigned } from "@/lib/cpi/chart-data";
import type { ItemPoint } from "@/lib/cpi/types";
import { TooltipBox } from "./chart-parts";

/** 身近な品目の前年同月比（直近3年）を小さなグラフで並べる */
export function WatchGrid({
  points,
  names,
}: {
  points: ItemPoint[];
  names: readonly string[];
}) {
  const series = names
    .map((name) => {
      const seen = new Set<number>();
      const rows = points.filter((point) => {
        if (point.name !== name || point.yoy == null || seen.has(point.ym)) {
          return false;
        }
        seen.add(point.ym);
        return true;
      });
      const latest = rows[rows.length - 1];
      const from = latest ? shiftMonth(latest.ym, -35) : 0;
      return { name, rows: rows.filter((row) => row.ym >= from), latest };
    })
    .filter((entry) => entry.latest);

  if (series.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">身近な品目の値動き</h2>
        <p className="text-sm text-ink-2">
          前年同月比の直近3年の動き。品目ごとに縦軸の幅が違うので、大きな数字に注目してください。
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {series.map(({ name, rows, latest }) => (
          <div key={name} className="rounded-2xl border border-line bg-card p-3">
            <p className="text-sm font-semibold">{name}</p>
            <p className="tabular text-2xl font-bold">
              {formatSigned(latest?.yoy ?? null)}
            </p>
            <p className="text-xs text-ink-3">
              {latest ? formatMonth(latest.ym) : ""}・前年同月比
            </p>
            <ChartFrame className="mt-2 h-16">
              {({ width, height }) => (
                <LineChart
                  width={width}
                  height={height} data={rows} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <YAxis hide domain={["auto", "auto"]} />
                  <ReferenceLine y={0} stroke="var(--axis)" />
                  <Tooltip
                    cursor={{ stroke: "var(--axis)" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <TooltipBox
                          ym={(payload[0].payload as ItemPoint).ym}
                          rows={[
                            {
                              color: "var(--s1)",
                              label: name,
                              value: formatSigned(
                                (payload[0].payload as ItemPoint).yoy
                              ),
                              strong: true,
                            },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="yoy"
                    stroke="var(--s1)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              )}
            </ChartFrame>
          </div>
        ))}
      </div>
    </section>
  );
}
