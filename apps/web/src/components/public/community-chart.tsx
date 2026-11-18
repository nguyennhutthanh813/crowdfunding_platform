"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatCompactVnd, formatVnd } from "@/lib/utils";

export interface DailyPoint {
  stat_date: string;
  new_backers: number;
  pledged_amount: number;
  cumulative_amount: number;
  cumulative_backers: number;
  views: number;
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  dataKey?: string;
  color?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl border px-3.5 py-2.5 text-xs shadow-lg backdrop-blur"
      style={{
        background: "var(--surface)",
        borderColor: "var(--line)",
        color: "var(--fg)",
      }}
    >
      <div className="mb-1.5 font-bold">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => {
          const isMoney = entry.dataKey === "cumulative_amount" || entry.dataKey === "pledged_amount";
          const val = Number(entry.value ?? 0);
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-full" style={{ background: entry.color }} />
                {entry.name}
              </span>
              <span className="font-bold tabular-nums">
                {isMoney ? formatVnd(val) : `${val.toLocaleString("vi-VN")} người`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CommunityChart({ data }: { data: DailyPoint[] }) {
  const [mode, setMode] = useState<"cumulative" | "daily">("cumulative");

  const formatted = data.map((d) => ({
    ...d,
    shortDate: `${d.stat_date.slice(8, 10)}/${d.stat_date.slice(5, 7)}`,
  }));

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold sm:text-lg">Diễn biến góp vốn theo ngày</h3>
          <p className="text-xs text-muted">
            Tính cả khoản giữ chỗ đang hiệu lực (giờ Việt Nam).
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("cumulative")}
            className={cn(
              "rounded-lg px-3 py-1.5 transition",
              mode === "cumulative" ? "bg-brand-gradient text-white shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            Luỹ kế
          </button>
          <button
            type="button"
            onClick={() => setMode("daily")}
            className={cn(
              "rounded-lg px-3 py-1.5 transition",
              mode === "daily" ? "bg-brand-gradient text-white shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            Theo ngày
          </button>
        </div>
      </div>

      {formatted.length === 0 ? (
        <div className="grid h-64 place-items-center text-sm text-muted">
          Chưa có dữ liệu thống kê theo ngày.
        </div>
      ) : (
        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 288 }}>
            <ComposedChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fvEmeraldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="shortDate"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
              />
              <YAxis
                yAxisId="money"
                tickFormatter={(v) => formatCompactVnd(Number(v))}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <YAxis
                yAxisId="backers"
                orientation="right"
                allowDecimals={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} />

              {mode === "cumulative" ? (
                <>
                  <Area
                    yAxisId="money"
                    type="monotone"
                    dataKey="cumulative_amount"
                    name="Tổng tiền luỹ kế"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#fvEmeraldArea)"
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="backers"
                    type="monotone"
                    dataKey="cumulative_backers"
                    name="Tổng người ủng hộ"
                    stroke="#7C5CFF"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </>
              ) : (
                <>
                  <Bar
                    yAxisId="money"
                    dataKey="pledged_amount"
                    name="Tiền góp trong ngày"
                    fill="#7C5CFF"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="backers"
                    type="monotone"
                    dataKey="new_backers"
                    name="Người góp mới"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#F59E0B" }}
                    isAnimationActive={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-muted">
        {mode === "cumulative" ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#10B981]" /> Tổng tiền luỹ kế
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#7C5CFF]" /> Tổng người ủng hộ
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#7C5CFF]" /> Tiền góp trong ngày
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#F59E0B]" /> Người góp mới
            </span>
          </>
        )}
      </div>
    </div>
  );
}
