"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/primitives";
import { formatCompactVnd, formatVnd } from "@/lib/utils";
import { LABEL_META, type CommentLabel } from "@/server/services/ai/comments";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--line)",
  borderRadius: "0.75rem",
  color: "var(--fg)",
  fontSize: "12px",
  boxShadow: "var(--shadow)",
};

export interface DailyStatPoint {
  stat_date: string;
  new_backers: number;
  new_pledges: number;
  pledged_amount: number;
  cumulative_amount: number;
  cumulative_backers: number;
  views: number;
  saves: number;
  comments: number;
}

const shortDate = (d: string) => {
  const parts = d.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
};

export function StudioOverviewCharts({ daily, goalAmount }: { daily: DailyStatPoint[]; goalAmount: number }) {
  const mounted = useIsMounted();
  const data = daily.map((d) => ({
    ...d,
    day: shortDate(d.stat_date),
  }));

  if (!data.length) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-bold">Tiến độ tích luỹ so với mục tiêu</h3>
          <p className="mt-1 text-sm text-muted">Chưa có dữ liệu thống kê theo ngày — biểu đồ sẽ xuất hiện khi chiến dịch nhận lượt xem hoặc góp vốn.</p>
        </div>
        <div className="card p-5">
          <h3 className="font-bold">Số tiền &amp; người ủng hộ mới mỗi ngày</h3>
          <p className="mt-1 text-sm text-muted">Dữ liệu theo ngày (múi giờ Việt Nam) tự động cập nhật khi có giao dịch mới.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Luỹ kế gọi vốn so với mục tiêu</h3>
            <p className="text-xs text-muted">Mục tiêu: {formatVnd(goalAmount)} (tính cả khoản giữ chỗ)</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" /> Mục tiêu
          </span>
        </div>
        <div className="h-72 w-full min-w-0 text-muted">
          {!mounted ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fvCumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactVnd(Number(v))}
                  width={56}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [formatVnd(Number(value ?? 0)), "Luỹ kế"]}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <ReferenceLine y={goalAmount} stroke="#F59E0B" strokeDasharray="5 4" strokeWidth={2} />
                <Area
                  type="monotone"
                  dataKey="cumulative_amount"
                  stroke="#7C5CFF"
                  strokeWidth={2.5}
                  fill="url(#fvCumFill)"
                  dot={data.length <= 3 ? { r: 4, fill: "#7C5CFF", strokeWidth: 2, stroke: "var(--surface)" } : false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Biến động theo từng ngày</h3>
            <p className="text-xs text-muted">Số tiền mới &amp; số người ủng hộ mới hằng ngày</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
              <span className="size-2.5 rounded-sm bg-[#7C5CFF]" /> Số tiền
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
              <span className="size-2.5 rounded-sm bg-[#10B981]" /> Người ủng hộ mới
            </span>
          </div>
        </div>
        <div className="h-72 w-full min-w-0 text-muted">
          {!mounted ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="amt"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactVnd(Number(v))}
                  width={54}
                />
                <YAxis yAxisId="cnt" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) =>
                    name === "pledged_amount" ? [formatVnd(Number(value ?? 0)), "Tiền góp trong ngày"] : [`${value ?? 0} người`, "Người ủng hộ mới"]
                  }
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Bar yAxisId="amt" dataKey="pledged_amount" fill="#7C5CFF" radius={[6, 6, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                <Bar yAxisId="cnt" dataKey="new_backers" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={16} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export function PredictionSparkline({ history }: { history: { t: string; p: number }[] }) {
  const mounted = useIsMounted();
  if (history.length < 2) return null;
  const data = history.map((h, i) => ({
    idx: `#${i + 1}`,
    date: new Date(h.t).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    p: h.p,
  }));
  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-2/50 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span className="font-semibold">Lịch sử biến động % dự đoán</span>
        <span>{history.length} lần chạy</span>
      </div>
      <div className="h-24 w-full min-w-0 text-muted">
        {!mounted ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="fvSparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "currentColor" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${v ?? 0}%`, "Xác suất"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
              />
              <Area type="monotone" dataKey="p" stroke="#10B981" strokeWidth={2} fill="url(#fvSparkFill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function CommentLabelDonut({ counts }: { counts: { label: CommentLabel; count: number }[] }) {
  const mounted = useIsMounted();
  const data = counts
    .filter((x) => x.count > 0)
    .map((x) => ({
      name: LABEL_META[x.label].name,
      value: x.count,
      color: LABEL_META[x.label].color,
    }));
  if (!data.length) return null;

  return (
    <div className="h-56 w-full min-w-0">
      {!mounted ? (
        <Skeleton className="h-full w-full" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v ?? 0} bình luận`, "Số lượng"]} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
