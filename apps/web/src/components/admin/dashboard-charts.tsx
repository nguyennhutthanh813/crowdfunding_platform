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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PROJECT_STATUS } from "@/lib/status";
import { formatCompactVnd, formatVnd } from "@/lib/utils";
import { Skeleton } from "@/components/ui/primitives";

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const STATUS_CHART_COLORS: Record<string, string> = {
  LIVE: "#10B981",
  SCHEDULED: "#0EA5E9",
  PENDING_REVIEW: "#F59E0B",
  SUCCESS: "#7C5CFF",
  FULFILLING: "#6366F1",
  COMPLETED: "#8B5CF6",
  FAILED: "#71717A",
  REJECTED: "#F43F5E",
  SUSPENDED: "#E11D48",
  DRAFT: "#94A3B8",
  CANCELLED: "#52525B",
};

const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "0.875rem",
  color: "var(--fg)",
  fontSize: "12px",
  boxShadow: "var(--shadow)",
};

export interface DashboardChartsProps {
  perDay: { date: string; amount: number; pledges: number }[];
  byStatus: { status: string; count: number }[];
  byCategory: { name: string; color: string; pledged: number; projects: number }[];
  newUsers: { week: string; label: string; users: number }[];
}

export function DashboardCharts({ perDay, byStatus, byCategory, newUsers }: DashboardChartsProps) {
  const ready = useIsClient();

  const statusData = byStatus.map((item) => ({
    ...item,
    label: PROJECT_STATUS[item.status]?.label ?? item.status,
    fill: STATUS_CHART_COLORS[item.status] ?? "#7C5CFF",
  }));

  const totalProjects = statusData.reduce((sum, x) => sum + x.count, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* 1. Tiền góp vốn 30 ngày */}
      <div className="card min-w-0 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Góp vốn toàn nền tảng (30 ngày)</h3>
            <p className="text-xs text-muted">Số tiền phát sinh theo ngày (tính cả khoản đang giữ chỗ)</p>
          </div>
          <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
            VND / ngày
          </span>
        </div>
        <div className="h-64 w-full">
          {!ready ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminPledgeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis
                  tickFormatter={(v) => formatCompactVnd(Number(v))}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, _name, item) => [
                    `${formatVnd(Number(value ?? 0))} (${item?.payload?.pledges ?? 0} lượt)`,
                    "Tổng góp",
                  ]}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#7C5CFF"
                  strokeWidth={2.5}
                  fill="url(#adminPledgeGrad)"
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: "#7C5CFF" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Trạng thái dự án (Donut) */}
      <div className="card min-w-0 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Phân bố trạng thái dự án</h3>
            <p className="text-xs text-muted">Tổng cộng {totalProjects} dự án trên toàn hệ thống</p>
          </div>
          <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
            Vòng đời
          </span>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-[190px_1fr]">
          <div className="h-56 w-full">
            {!ready ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => [`${Number(value ?? 0)} dự án`, String(name ?? "")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {statusData.map((s) => (
              <div key={s.status} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/70 px-2.5 py-1.5">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="truncate font-medium">{s.label}</span>
                </span>
                <span className="font-bold tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Góp vốn theo thể loại */}
      <div className="card min-w-0 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Góp vốn theo thể loại</h3>
            <p className="text-xs text-muted">Tổng vốn đã kêu gọi ở các dự án đã mở</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            {byCategory.length} thể loại
          </span>
        </div>
        <div className="h-72 w-full">
          {!ready ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 16, left: 6, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCompactVnd(Number(v))}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "var(--fg)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={108}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, _name, item) => [
                    `${formatVnd(Number(value ?? 0))} (${item?.payload?.projects ?? 0} dự án)`,
                    "Tổng vốn",
                  ]}
                />
                <Bar dataKey="pledged" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false}>
                  {byCategory.map((c) => (
                    <Cell key={c.name} fill={c.color || "#7C5CFF"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. Người dùng mới theo tuần */}
      <div className="card min-w-0 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Người dùng mới (12 tuần)</h3>
            <p className="text-xs text-muted">Số tài khoản đăng ký mới mỗi tuần</p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
            Tăng trưởng
          </span>
        </div>
        <div className="h-72 w-full">
          {!ready ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={newUsers} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${Number(value ?? 0)} tài khoản`, "Đăng ký mới"]}
                  labelFormatter={(label) => `Tuần bắt đầu ${label}`}
                />
                <Bar dataKey="users" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
