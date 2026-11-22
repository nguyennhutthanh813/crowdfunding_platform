import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, Clock, History, Mail, ShieldCheck, Timer } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { emailOutboxStatus, schedulerOverview } from "@/server/queries/admin";
import {
  FlushEmailOutboxButton,
  ManualSettleModalButton,
  RunSchedulerButton,
  SchedulerMechanismButton,
} from "@/components/admin/scheduler-controls";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/primitives";
import { LinkTabs } from "@/components/ui/tabs";
import { formatCompactVnd, formatDate, percentOf, timeAgo, timeLeft } from "@/lib/utils";

export const metadata = { title: "Bộ lập lịch" };

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function AdminSchedulerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSystemPerm("admin.scheduler.run", "/admin/scheduler");
  const sp = await searchParams;
  const rawTab = firstParam(sp.tab).trim().toLowerCase();
  const activeTab = rawTab === "runs" ? "runs" : "outbox";

  const [data, outbox] = await Promise.all([schedulerOverview(), emailOutboxStatus()]);

  const tabs = [
    { key: "outbox", label: "Hàng đợi email thông báo", count: outbox?.stats.PENDING ?? 0 },
    { key: "runs", label: "Lịch sử chạy bộ lập lịch", count: data.runs.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tự động hoá theo lịch"
        title="Bộ lập lịch chiến dịch"
        description="Theo dõi chiến dịch sắp mở, sắp hết hạn, gửi hàng đợi email và thực thi chốt thanh toán."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SchedulerMechanismButton />
            <ManualSettleModalButton liveProjects={data.live} />
            <RunSchedulerButton />
          </div>
        }
      />

      {/* Đếm ngược sắp mở & sắp kết thúc */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-sky-500" />
              <h3 className="font-bold">Sắp mở gọi vốn ({data.toOpen.length})</h3>
            </div>
            <Badge tone="sky">Sắp mở</Badge>
          </div>
          {data.toOpen.length === 0 ? (
            <p className="text-sm text-muted">Hiện chưa có dự án nào đang chờ mở lịch.</p>
          ) : (
            <div className="space-y-2">
              {data.toOpen.map((p) => {
                const due = new Date(p.start_at).getTime() <= data.now;
                return (
                  <Link
                    key={p.id}
                    href={`/p/${p.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/50 p-3 transition hover:border-sky-400/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{p.title}</div>
                      <div className="mt-0.5 text-xs text-muted">Hẹn mở: {formatDate(p.start_at, true)}</div>
                    </div>
                    <Badge tone={due ? "emerald" : "sky"}>{due ? "Đến hạn mở" : timeAgo(p.start_at, data.now)}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="card space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Timer className="size-5 text-rose-500" />
              <h3 className="font-bold">Đang gọi vốn sắp kết thúc ({data.toClose.length})</h3>
            </div>
            <Badge tone="emerald">Top 5 gần nhất</Badge>
          </div>
          {data.toClose.length === 0 ? (
            <p className="text-sm text-muted">Không có chiến dịch nào đang chờ kết thúc.</p>
          ) : (
            <div className="space-y-2">
              {data.toClose.map((p) => {
                const pct = percentOf(p.held, p.goal_amount);
                const left = timeLeft(p.end_at, data.now);
                const willPass = p.held >= p.goal_amount;
                return (
                  <Link
                    key={p.id}
                    href={`/p/${p.slug}`}
                    className="block rounded-xl border border-line bg-surface-2/50 p-3 transition hover:border-violet-400/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{p.title}</span>
                      <Badge tone={left.ended ? "rose" : "amber"}>{left.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                      <span>
                        Giữ chỗ <b className="text-fg">{formatCompactVnd(p.held)}</b> / {formatCompactVnd(p.goal_amount)} ({pct}%)
                      </span>
                      <span className={willPass ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {willPass ? "Đủ mục tiêu → Thu tiền" : "Chưa đủ → Hoàn hạn mức"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <LinkTabs items={tabs} active={activeTab} id="admin-scheduler-tabs" />
      </Suspense>

      {activeTab === "outbox" ? (
        <section className="card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
                <Mail className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">Hàng đợi email thông báo</h3>
                  {outbox && (
                    <Badge tone={outbox.smtpConfigured ? "emerald" : "amber"} dot>
                      {outbox.smtpConfigured ? "Đã cấu hình" : "Chưa cấu hình SMTP – email sẽ được bỏ qua"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted">Theo dõi trạng thái gửi email thông báo tự động và xử lý lại các thư lỗi.</p>
              </div>
            </div>
            <FlushEmailOutboxButton />
          </div>

          {!outbox ? (
            <p className="text-sm text-muted">Hiện chưa tải được trạng thái hàng đợi email.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { label: "Đang chờ", val: outbox.stats.PENDING, cls: "text-amber-600 dark:text-amber-400" },
                  { label: "Đang gửi", val: outbox.stats.SENDING, cls: "text-sky-600 dark:text-sky-400" },
                  { label: "Đã gửi", val: outbox.stats.SENT, cls: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Đã bỏ qua", val: outbox.stats.SKIPPED, cls: "text-muted" },
                  { label: "Thất bại", val: outbox.stats.FAILED, cls: "text-rose-600 dark:text-rose-400" },
                ].map((st) => (
                  <div key={st.label} className="rounded-xl border border-line bg-surface-2/60 p-3">
                    <div className="text-xs text-muted">{st.label}</div>
                    <div className={`mt-1 text-xl font-black tabular-nums ${st.cls}`}>{st.val}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-line pt-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  Email gửi thất bại gần đây ({outbox.recentFailures.length})
                </div>
                {outbox.recentFailures.length === 0 ? (
                  <p className="text-xs text-muted">Chưa có email gửi thất bại nào.</p>
                ) : (
                  <div className="divide-y divide-line rounded-xl border border-line bg-surface-2/40">
                    {outbox.recentFailures.map((f) => (
                      <div key={f.id} className="flex flex-col gap-1 px-3.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{f.title}</div>
                          <div className="truncate text-rose-600 dark:text-rose-400">{f.last_error || "Không rõ nguyên nhân lỗi"}</div>
                        </div>
                        <div className="shrink-0 text-muted">
                          Thử {f.attempts} lần · {formatDate(f.created_at, true)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="size-5 text-violet-500" />
            <h3 className="font-bold">20 lần chạy bộ lập lịch gần nhất</h3>
          </div>

          {data.runs.length === 0 ? (
            <EmptyState title="Chưa có lịch sử chạy bộ lập lịch" />
          ) : (
            <>
              <div className="space-y-2.5 md:hidden">
                {data.runs.map((run) => {
                  const ms = Math.max(0, new Date(run.finished_at).getTime() - new Date(run.started_at).getTime());
                  return (
                    <div key={run.id} className="card space-y-2 p-3.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={run.trigger_source === "MANUAL" ? "violet" : "neutral"}>
                          {run.trigger_source === "MANUAL" ? "Thủ công" : "Tự động"}
                        </Badge>
                        <span className="text-muted">
                          {formatDate(run.started_at, true)} ({ms}ms)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 font-semibold">
                        <span>Mở: {run.opened_count}</span>
                        <span>· Thành công: {run.success_count}</span>
                        <span>· Thất bại: {run.failed_count}</span>
                        <span className="text-emerald-600 dark:text-emerald-400">· Thu tiền: {run.captured_count}</span>
                        <span>· Giải phóng: {run.voided_count}</span>
                      </div>
                      <div className="text-muted">
                        {run.actor ? `Bởi ${run.actor}` : "Chạy tự động"} {run.note ? `· ${run.note}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Nguồn</th>
                      <th className="px-4 py-3">Người kích hoạt</th>
                      <th className="px-4 py-3 text-center">Mở</th>
                      <th className="px-4 py-3 text-center">Đạt / Hụt</th>
                      <th className="px-4 py-3 text-center">Thu tiền / Giải phóng</th>
                      <th className="px-4 py-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {data.runs.map((run) => {
                      const ms = Math.max(0, new Date(run.finished_at).getTime() - new Date(run.started_at).getTime());
                      return (
                        <tr key={run.id} className="transition hover:bg-surface-2/40">
                          <td className="whitespace-nowrap px-4 py-3 text-muted">
                            <div className="font-semibold text-fg">{formatDate(run.started_at, true)}</div>
                            <div>{ms} ms</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={run.trigger_source === "MANUAL" ? "violet" : "neutral"}>
                              <Clock className="size-3" /> {run.trigger_source === "MANUAL" ? "Thủ công" : "Tự động"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {run.actor ? (
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <ShieldCheck className="size-3.5 text-rose-500" /> {run.actor}
                              </span>
                            ) : (
                              <span className="text-muted">Hệ thống</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold tabular-nums">{run.opened_count}</td>
                          <td className="px-4 py-3 text-center tabular-nums">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{run.success_count}</span> /{" "}
                            <span>{run.failed_count}</span>
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{run.captured_count}</span> /{" "}
                            <span>{run.voided_count}</span>
                          </td>
                          <td className="max-w-xs px-4 py-3 text-muted">{run.note || "Hoàn tất"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
