import Link from "next/link";
import { ArrowRight, Brain, CalendarClock, CheckCircle2, Clock, History, ShieldAlert } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { reviewQueue } from "@/server/queries/admin";
import { formatWaiting, REVIEW_DECISION_META } from "@/components/admin/admin-helpers";
import { SafeImage } from "@/components/admin/safe-image";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/layout-bits";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { formatDate, formatVnd } from "@/lib/utils";

export const metadata = { title: "Duyệt dự án" };

export default async function AdminReviewsPage() {
  await requireSystemPerm("admin.project.review", "/admin/reviews");
  const { queue, history } = await reviewQueue();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Kiểm duyệt nội dung"
        title={`Hàng chờ duyệt (${queue.length})`}
        description="Kiểm tra nội dung chiến dịch, mức quà, checklist tự động, từ khoá cấm và dự đoán AI trước khi công khai."
      />

      {queue.length === 0 ? (
        <EmptyState
          title="Hàng chờ duyệt đang trống"
          description="Tất cả dự án gửi duyệt đã được xử lý. Khi Creator gửi dự án mới, dự án sẽ xuất hiện tại đây."
          action={
            <ButtonLink href="/admin/projects" variant="outline" size="sm">
              Xem danh sách dự án
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-4">
          {queue.map((item) => {
            const aiPct = item.prob != null ? Math.round(item.prob * 100) : null;
            return (
              <div key={item.id} className="card overflow-hidden p-4 sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2 md:w-52">
                    <SafeImage src={item.cover_url} alt={item.title} fill sizes="(max-width:768px) 100vw, 208px" className="object-cover" />
                    <span
                      className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.category}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="amber" dot>
                        <Clock className="size-3" /> Chờ {formatWaiting(item.waitingMs)}
                      </Badge>
                      <Badge tone={item.requiredOk ? "emerald" : "rose"}>
                        {item.requiredOk ? <CheckCircle2 className="size-3" /> : <ShieldAlert className="size-3" />}
                        Checklist {item.passed}/{item.total}
                      </Badge>
                      {aiPct !== null && (
                        <Badge tone={aiPct >= 66 ? "emerald" : aiPct >= 40 ? "amber" : "rose"}>
                          <Brain className="size-3" /> AI {aiPct}%
                        </Badge>
                      )}
                      {item.start_at && (
                        <Badge tone="sky">
                          <CalendarClock className="size-3" /> Hẹn mở {formatDate(item.start_at)}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight">{item.title}</h3>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.blurb}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span>
                        Creator: <b className="text-fg">{item.creator}</b> (@{item.creator_username})
                      </span>
                      <span>
                        Mục tiêu: <b className="text-fg">{formatVnd(item.goal_amount)}</b>
                      </span>
                      <span>
                        Thời lượng: <b className="text-fg">{item.duration_days} ngày</b>
                      </span>
                      <span>Gửi lúc: {formatDate(item.submitted_at, true)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end">
                    <ButtonLink href={`/admin/reviews/${item.slug}`} variant="primary" size="sm">
                      Xem &amp; duyệt <ArrowRight className="size-4" />
                    </ButtonLink>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lịch sử duyệt gần đây */}
      <section className="space-y-4">
        <SectionTitle
          title={
            <span className="flex items-center gap-2">
              <History className="size-5 text-indigo-500" /> Lịch sử duyệt gần đây
            </span>
          }
          description="15 quyết định duyệt gần nhất trên nền tảng."
        />
        <div className="card divide-y divide-line overflow-hidden">
          {history.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">Chưa có lịch sử duyệt dự án.</div>
          ) : (
            history.map((h) => {
              const dec = REVIEW_DECISION_META[h.decision] ?? { label: h.decision, tone: "neutral" as const };
              return (
                <div key={h.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={dec.tone}>{dec.label}</Badge>
                      <Link href={`/admin/reviews/${h.slug}`} className="truncate font-bold hover:text-violet-600 hover:underline">
                        {h.title}
                      </Link>
                      <ProjectStatusBadge status={h.status} />
                    </div>
                    {h.note && <p className="text-xs text-muted">“{h.note}”</p>}
                  </div>
                  <div className="shrink-0 text-xs text-muted sm:text-right">
                    <div>Bởi {h.reviewer}</div>
                    <div>{formatDate(h.created_at, true)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
