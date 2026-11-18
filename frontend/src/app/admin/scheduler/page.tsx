import Link from "next/link";
import { CalendarClock, Clock, Cpu, Flame, History, ShieldCheck, Timer } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { schedulerOverview } from "@/server/queries/admin";
import { ManualSettleForm, RunSchedulerButton } from "@/components/admin/scheduler-controls";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/primitives";
import { formatCompactVnd, formatDate, percentOf, timeAgo, timeLeft } from "@/lib/utils";

export const metadata = { title: "Bộ lập lịch" };

export default async function AdminSchedulerPage() {
  await requireSystemPerm("admin.scheduler.run", "/admin/scheduler");
  const data = await schedulerOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tự động hoá All-or-Nothing"
        title="Bộ lập lịch chiến dịch"
        description="Tự động mở dự án đã hẹn lịch và chốt thanh toán (CAPTURE khi đạt mục tiêu / VOID khi không đạt) ngay khi chiến dịch hết hạn."
        actions={<RunSchedulerButton />}
      />

      {/* Giải thích cơ chế automation */}
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
            <Cpu className="size-5" />
          </div>
          <div className="space-y-2 text-sm">
            <h2 className="font-bold">Cơ chế vận hành tự động &amp; Idempotent</h2>
            <div className="grid gap-3 text-xs text-muted sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                <div className="font-bold text-fg">1. Mở chiến dịch đúng hẹn</div>
                <p className="mt-1">
                  Các dự án <code>SCHEDULED</code> có <code>start_at ≤ hiện tại</code> tự chuyển sang <code>LIVE</code> và báo người theo dõi.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                <div className="font-bold text-fg">2. Chốt All-or-Nothing</div>
                <p className="mt-1">
                  Khi <code>LIVE</code> quá <code>end_at</code>: đạt mục tiêu → <code>SUCCESS</code> + <code>CAPTURE</code>; chưa đạt →{" "}
                  <code>FAILED</code> + <code>VOID</code>.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                <div className="font-bold text-fg">3. An toàn chống trừ trùng</div>
                <p className="mt-1">
                  Khoá <code>idempotency_key = pledge_id:ACTION</code> đảm bảo chạy lại nhiều lần không bao giờ trừ tiền trùng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Đếm ngược sắp mở & sắp kết thúc */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-sky-500" />
              <h3 className="font-bold">Sắp mở gọi vốn ({data.toOpen.length})</h3>
            </div>
            <Badge tone="sky">SCHEDULED</Badge>
          </div>
          {data.toOpen.length === 0 ? (
            <p className="text-sm text-muted">Hiện chưa có dự án nào đang chờ mở lịch.</p>
          ) : (
            <div className="space-y-2.5">
              {data.toOpen.map((p) => {
                const due = new Date(p.start_at).getTime() <= data.now;
                return (
                  <Link
                    key={p.id}
                    href={`/p/${p.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/50 p-3.5 transition hover:border-sky-400/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold">{p.title}</div>
                      <div className="mt-0.5 text-xs text-muted">Hẹn mở: {formatDate(p.start_at, true)}</div>
                    </div>
                    <Badge tone={due ? "emerald" : "sky"}>{due ? "Đến hạn mở" : timeAgo(p.start_at, data.now)}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Timer className="size-5 text-rose-500" />
              <h3 className="font-bold">LIVE sắp kết thúc ({data.toClose.length})</h3>
            </div>
            <Badge tone="emerald">Top 5 gần nhất</Badge>
          </div>
          {data.toClose.length === 0 ? (
            <p className="text-sm text-muted">Không có chiến dịch LIVE nào đang chờ kết thúc.</p>
          ) : (
            <div className="space-y-2.5">
              {data.toClose.map((p) => {
                const pct = percentOf(p.held, p.goal_amount);
                const left = timeLeft(p.end_at, data.now);
                const willPass = p.held >= p.goal_amount;
                return (
                  <Link
                    key={p.id}
                    href={`/p/${p.slug}`}
                    className="block rounded-xl border border-line bg-surface-2/50 p-3.5 transition hover:border-violet-400/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{p.title}</span>
                      <Badge tone={left.ended ? "rose" : "amber"}>{left.label}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                      <span>
                        Giữ chỗ <b className="text-fg">{formatCompactVnd(p.held)}</b> / {formatCompactVnd(p.goal_amount)} ({pct}%)
                      </span>
                      <span className={willPass ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {willPass ? "Đủ mục tiêu → CAPTURE" : "Chưa đủ → VOID"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Tất toán chiến dịch thủ công */}
      <section className="card border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-rose-500/5 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Flame className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">Tất toán chiến dịch thủ công</h3>
              <p className="text-xs text-muted">
                Chốt sớm một chiến dịch đang gọi vốn để đối soát và thực thi CAPTURE (đạt mục tiêu) hoặc VOID (không đạt).
              </p>
            </div>
          </div>
          <Badge tone="amber">Đối soát thủ công</Badge>
        </div>

        <ManualSettleForm liveProjects={data.live} />
      </section>

      {/* Lịch sử chạy scheduler_runs */}
      <section className="space-y-4">
        <SectionTitle
          title={
            <span className="flex items-center gap-2">
              <History className="size-5 text-violet-500" /> Lịch sử chạy bộ lập lịch
            </span>
          }
          description="20 lần chạy gần nhất (tự động AUTO hoặc thủ công MANUAL)."
        />

        {data.runs.length === 0 ? (
          <EmptyState title="Chưa có lịch sử chạy bộ lập lịch" />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {data.runs.map((run) => {
                const ms = Math.max(0, new Date(run.finished_at).getTime() - new Date(run.started_at).getTime());
                return (
                  <div key={run.id} className="card space-y-2 p-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={run.trigger_source === "MANUAL" ? "violet" : "neutral"}>{run.trigger_source}</Badge>
                      <span className="text-muted">
                        {formatDate(run.started_at, true)} ({ms}ms)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 font-semibold">
                      <span>Mở: {run.opened_count}</span>
                      <span>· Thành công: {run.success_count}</span>
                      <span>· Thất bại: {run.failed_count}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">· Capture: {run.captured_count}</span>
                      <span>· Void: {run.voided_count}</span>
                    </div>
                    <div className="text-muted">
                      {run.actor ? `Bởi ${run.actor}` : "Chạy tự động"} {run.note ? `· ${run.note}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="card hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Nguồn</th>
                    <th className="px-4 py-3">Người kích hoạt</th>
                    <th className="px-4 py-3 text-center">Mở</th>
                    <th className="px-4 py-3 text-center">Đạt / Hụt</th>
                    <th className="px-4 py-3 text-center">Capture / Void</th>
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
                            <Clock className="size-3" /> {run.trigger_source}
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
    </div>
  );
}
