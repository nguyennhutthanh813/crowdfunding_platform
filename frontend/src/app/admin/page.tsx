import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flag,
  Landmark,
  ScrollText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { adminDashboard, REPORT_REASON } from "@/server/queries/admin";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { auditTone, formatWaiting, REPORT_TARGET_META } from "@/components/admin/admin-helpers";
import { CountUp, Reveal } from "@/components/fx/motion";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, SectionTitle, StatCard } from "@/components/ui/layout-bits";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { formatCompactVnd, formatDate, formatVnd, percentOf, timeAgo, timeLeft } from "@/lib/utils";

export const metadata = { title: "Tổng quan" };

export default async function AdminDashboardPage() {
  await requireSystemPerm("admin.dashboard.view", "/admin");
  const data = await adminDashboard();
  const { kpis } = data;

  const urgentCount = data.flagged.length + data.pendingQueue.length + data.openReports.length + data.endingSoon.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Thống kê toàn hệ thống"
        title="Tổng quan vận hành FundViet"
        description="Theo dõi dòng tiền giữ chỗ và thu tiền khi đạt mục tiêu, hàng chờ kiểm duyệt và các cảnh báo cần xử lý ngay."
        actions={
          <div className="flex flex-wrap gap-2">
            {kpis.pending > 0 && (
              <ButtonLink href="/admin/reviews" variant="primary" size="sm">
                <ClipboardCheck className="size-4" /> Duyệt {kpis.pending} dự án <ArrowRight className="size-4" />
              </ButtonLink>
            )}
            <ButtonLink href="/admin/scheduler" variant="outline" size="sm">
              <Clock className="size-4" /> Bộ lập lịch
            </ButtonLink>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={0}>
          <StatCard
            tone="sky"
            label="Đang giữ chỗ"
            value={<CountUp value={kpis.held} format="compact" />}
            sub={`${kpis.heldCount} lượt góp · ${formatVnd(kpis.held)}`}
            icon={<Wallet className="size-5" />}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <StatCard
            tone="emerald"
            label="Đã thu tiền"
            value={<CountUp value={kpis.captured} format="compact" />}
            sub={`${kpis.capturedCount} lượt góp · ${formatVnd(kpis.captured)}`}
            icon={<Landmark className="size-5" />}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <StatCard
            tone="violet"
            label="Chiến dịch & Tỉ lệ thành công"
            value={
              <span className="flex items-baseline gap-2">
                <CountUp value={kpis.live} />
                <span className="text-sm font-semibold text-muted">đang gọi vốn</span>
              </span>
            }
            sub={`Thành công ${kpis.successRate}% (${kpis.succeeded}/${kpis.ended} đã chốt)`}
            icon={<TrendingUp className="size-5" />}
          />
        </Reveal>
        <Reveal delay={0.15}>
          <StatCard
            tone="rose"
            label="Người dùng & Kiểm duyệt"
            value={<CountUp value={kpis.users} />}
            sub={`${kpis.activeBackers} người ủng hộ hoạt động 7 ngày · ${kpis.locked} đã khoá`}
            icon={<Users className="size-5" />}
          />
        </Reveal>
      </div>

      {/* Panel Cần xử lý ngay */}
      <section className="card overflow-hidden border-rose-500/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-rose-500/8 via-amber-500/5 to-transparent px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h2 className="font-bold">Cần xử lý ngay</h2>
              <p className="text-xs text-muted">Tổng hợp các mục ưu tiên từ kiểm duyệt, báo cáo vi phạm và chiến dịch sắp đóng</p>
            </div>
          </div>
          <Badge tone={urgentCount > 0 ? "rose" : "emerald"} dot>
            {urgentCount > 0 ? `${urgentCount} mục cần chú ý` : "Mọi mục đều ổn định"}
          </Badge>
        </div>

        <div className="p-5">
          {urgentCount === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>Không có dự án chờ duyệt, báo cáo mở hay cảnh báo khẩn cấp nào.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cảnh báo nhiều báo cáo */}
              {data.flagged.length > 0 && (
                <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="size-4" /> Cảnh báo ưu tiên: Dự án có từ 3 báo cáo mở trở lên
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.flagged.map((f) => (
                      <Link
                        key={f.id}
                        href={`/admin/projects?q=${encodeURIComponent(f.slug)}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-surface px-3.5 py-2.5 text-sm transition hover:border-rose-500"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold">{f.title}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                            <ProjectStatusBadge status={f.status} />
                          </div>
                        </div>
                        <Badge tone="rose" dot>
                          {f.reports} báo cáo
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                {/* Hàng chờ duyệt */}
                <div className="min-w-0 space-y-2.5 rounded-2xl border border-line bg-surface-2/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <ClipboardCheck className="size-4 text-amber-500" /> Chờ duyệt ({kpis.pending})
                    </span>
                    <Link href="/admin/reviews" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                      Xem hết
                    </Link>
                  </div>
                  {data.pendingQueue.length === 0 ? (
                    <p className="text-xs text-muted">Không có dự án chờ duyệt.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.pendingQueue.map((p) => (
                        <Link
                          key={p.id}
                          href={`/admin/reviews/${p.slug}`}
                          className="block rounded-xl border border-line bg-surface p-3 transition hover:border-amber-400/60"
                        >
                          <div className="truncate text-sm font-semibold">{p.title}</div>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                            <span>
                              {p.creator} · {p.category}
                            </span>
                            <Badge tone="amber">Chờ {formatWaiting(p.waitingMs)}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Báo cáo đang mở */}
                <div className="min-w-0 space-y-2.5 rounded-2xl border border-line bg-surface-2/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <Flag className="size-4 text-rose-500" /> Báo cáo mở ({kpis.openReports})
                    </span>
                    <Link href="/admin/reports" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                      Xử lý ngay
                    </Link>
                  </div>
                  {data.openReports.length === 0 ? (
                    <p className="text-xs text-muted">Không có báo cáo mở.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.openReports.map((r) => {
                        const t = REPORT_TARGET_META[r.target_type] ?? { label: r.target_type, tone: "neutral" as const };
                        return (
                          <Link
                            key={r.id}
                            href="/admin/reports"
                            className="block rounded-xl border border-line bg-surface p-3 transition hover:border-rose-400/60"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge tone={t.tone}>{t.label}</Badge>
                              <span className="text-[11px] text-muted">{timeAgo(r.created_at, data.now)}</span>
                            </div>
                            <div className="mt-1.5 truncate text-xs font-bold">
                              {REPORT_REASON[r.reason] ?? r.reason}: {r.label ?? "Đối tượng"}
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{r.detail}</p>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sắp kết thúc (<48h) */}
                <div className="min-w-0 space-y-2.5 rounded-2xl border border-line bg-surface-2/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <Clock className="size-4 text-sky-500" /> Sắp đóng &lt; 48h ({data.endingSoon.length})
                    </span>
                    <Link href="/admin/scheduler" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                      Lập lịch
                    </Link>
                  </div>
                  {data.endingSoon.length === 0 ? (
                    <p className="text-xs text-muted">Không có chiến dịch LIVE nào sắp đóng trong 48 giờ tới.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.endingSoon.map((p) => {
                        const pct = percentOf(p.pledged_amount, p.goal_amount);
                        const left = timeLeft(p.end_at, data.now);
                        return (
                          <Link
                            key={p.id}
                            href={`/p/${p.slug}`}
                            className="block rounded-xl border border-line bg-surface p-3 transition hover:border-sky-400/60"
                          >
                            <div className="truncate text-sm font-semibold">{p.title}</div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                              <span className={pct >= 100 ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-semibold text-amber-600 dark:text-amber-400"}>
                                {pct}% ({formatCompactVnd(p.pledged_amount)})
                              </span>
                              <span className="text-muted">{left.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Biểu đồ thống kê */}
      <section>
        <SectionTitle
          title="Biểu đồ phân tích nền tảng"
          description="Số liệu cập nhật thời gian thực từ hệ thống (tiền giữ chỗ, trạng thái, thể loại và tăng trưởng người dùng)."
        />
        <DashboardCharts
          perDay={data.perDay}
          byStatus={data.byStatus}
          byCategory={data.byCategory}
          newUsers={data.newUsers}
        />
      </section>

      {/* Nhật ký gần đây */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="size-5 text-indigo-500" />
            <div>
              <h3 className="font-bold">Nhật ký thao tác gần đây</h3>
              <p className="text-xs text-muted">Mọi hành động quản trị và chạy bộ lập lịch đều được ghi lại</p>
            </div>
          </div>
          <ButtonLink href="/admin/audit" variant="ghost" size="xs">
            Xem toàn bộ <ArrowRight className="size-3.5" />
          </ButtonLink>
        </div>

        <div className="divide-y divide-line">
          {data.recentAudit.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Chưa có nhật ký nào.</p>
          ) : (
            data.recentAudit.map((row) => (
              <div key={row.id} className="flex flex-col gap-1.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge tone={auditTone(row.action)}>{row.action}</Badge>
                  <span className="font-semibold">{row.actor ?? "Hệ thống"}</span>
                  <span className="max-w-full truncate text-muted">
                    {row.project_title || row.user_name || row.category_name || row.entity_type}
                  </span>
                  {row.detail && <span className="max-w-full truncate text-xs text-muted">— {row.detail}</span>}
                </div>
                <span className="shrink-0 text-xs text-muted" title={formatDate(row.created_at, true)}>
                  {timeAgo(row.created_at, data.now)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
