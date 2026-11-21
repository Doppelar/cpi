"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type AreaId, formatMonth, formatMonthShort } from "@/lib/cpi/areas";
import { formatSigned } from "@/lib/cpi/chart-data";
import type { ItemPoint, MonthItem } from "@/lib/cpi/types";
import { TooltipBox } from "./chart-parts";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; points: ItemPoint[] };

/** 選んだ品目の推移（前年同月比の棒と、指数の線を別々のグラフで） */
export function ItemDetail({
  area,
  item,
  selectedYm,
  onClose,
}: {
  area: AreaId;
  item: MonthItem;
  selectedYm: number;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    fetch(`/api/series?area=${area}&code=${encodeURIComponent(item.code)}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ points: ItemPoint[] }>;
      })
      .then(({ points }) => {
        if (!cancelled) setState({ status: "ready", points });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [area, item.code]);

  const yoyPoints =
    state.status === "ready"
      ? state.points.filter((point) => point.yoy != null)
      : [];
  const indexPoints =
    state.status === "ready"
      ? state.points.filter((point) => point.index != null)
      : [];

  return (
    <div
      ref={ref}
      className="scroll-mt-4 rounded-2xl border-2 border-accent/40 bg-card p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-3">{item.category}</p>
          <h4 className="text-lg font-bold">{item.name}の推移</h4>
          <p className="tabular mt-1 text-sm text-ink-2">
            {formatMonth(selectedYm)}：前年同月比
            <strong className="mx-1">{formatSigned(item.yoy)}</strong>／前月比
            <strong className="mx-1">{formatSigned(item.mom)}</strong>
            ／寄与度
            <strong className="mx-1">
              {formatSigned(item.contribYoy, 2, "pt")}
            </strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line px-3 py-1 text-sm text-ink-2 hover:bg-surface-2"
        >
          閉じる
        </button>
      </div>

      {state.status === "loading" && (
        <p className="mt-6 text-sm text-ink-3">読み込み中…</p>
      )}
      {state.status === "error" && (
        <p className="mt-6 text-sm text-ink-3">
          推移を読み込めませんでした。時間をおいてもう一度お試しください。
        </p>
      )}
      {state.status === "ready" && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">
              前年同月比（
              <span className="text-up">赤＝値上がり</span>・
              <span className="text-down">青＝値下がり</span>）
            </p>
            {yoyPoints.length === 0 ? (
              <p className="text-sm text-ink-3">まだ1年分のデータがありません。</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={yoyPoints}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                    barCategoryGap="15%"
                  >
                    <CartesianGrid vertical={false} stroke="var(--grid)" />
                    <XAxis
                      dataKey="ym"
                      tickFormatter={formatMonthShort}
                      tickLine={false}
                      axisLine={{ stroke: "var(--axis)" }}
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <ReferenceLine y={0} stroke="var(--axis)" />
                    <Tooltip
                      cursor={{ fill: "var(--surface-2)" }}
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <TooltipBox
                            ym={(payload[0].payload as ItemPoint).ym}
                            rows={[
                              {
                                color:
                                  ((payload[0].payload as ItemPoint).yoy ?? 0) >= 0
                                    ? "var(--up)"
                                    : "var(--down)",
                                label: "前年同月比",
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
                    <Bar dataKey="yoy" radius={[3, 3, 3, 3]} isAnimationActive={false}>
                      {yoyPoints.map((point) => (
                        <Cell
                          key={point.ym}
                          fill={(point.yoy ?? 0) >= 0 ? "var(--up)" : "var(--down)"}
                          fillOpacity={point.ym === selectedYm ? 1 : 0.55}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-1 text-xs text-ink-3">
              濃い棒が{formatMonth(selectedYm)}です。
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">指数（2025年＝100）</p>
            {indexPoints.length === 0 ? (
              <p className="text-sm text-ink-3">
                2025年基準につなげられる指数がありません。
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={indexPoints}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--grid)" />
                    <XAxis
                      dataKey="ym"
                      tickFormatter={formatMonthShort}
                      tickLine={false}
                      axisLine={{ stroke: "var(--axis)" }}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <ReferenceLine
                      y={100}
                      stroke="var(--text-muted)"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine x={selectedYm} stroke="var(--axis)" />
                    <Tooltip
                      cursor={{ stroke: "var(--axis)" }}
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <TooltipBox
                            ym={(payload[0].payload as ItemPoint).ym}
                            rows={[
                              {
                                color: "var(--s1)",
                                label: "指数",
                                value:
                                  (payload[0].payload as ItemPoint).index?.toFixed(1) ??
                                  "—",
                                strong: true,
                              },
                            ]}
                          />
                        ) : null
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="index"
                      stroke="var(--s1)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-1 text-xs text-ink-3">
              100より上なら、2025年の平均より高い値段です。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
