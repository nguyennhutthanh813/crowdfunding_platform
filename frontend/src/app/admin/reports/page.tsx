import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, ExternalLink, MessageSquare, ShieldAlert, User } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { adminReports, REPORT_REASON } from "@/server/queries/admin";
import { REPORT_STATUS_META, REPORT_TARGET_META, serverNow } from "@/components/admin/admin-helpers";
import { ReportHandleForm } from "@/components/admin/report-handle-form";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata = { title: "Báo cáo vi phạm" };

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireSystemPerm("admin.report.handle", "/admin/reports");
  const sp = await searchParams;
  const rawTab = firstParam(sp.tab).toUpperCase();
  const status = ["OPEN", "RESOLVED", "DISMISSED"].includes(rawTab) ? rawTab : "OPEN";

  const { rows, counts } = adminReports(status);
  const now = serverNow();

  const canModerateComment = hasSystemPerm(viewer, "admin.comment.moderate");
  const canTakedown = hasSystemPerm(viewer, "admin.project.takedown");
  const canLockUser = hasSystemPerm(viewer, "admin.user.lock");

  const tabs = [
    { key: "OPEN", label: "Chờ xử lý", count: counts.OPEN ?? 0 },
    { key: "RESOLVED", label: "Đã xử lý", count: counts.RESOLVED ?? 0 },
    { key: "DISMISSED", label: "Đã bỏ qua", count: counts.DISMISSED ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kiểm duyệt cộng đồng · BR13"
        title="Báo cáo vi phạm"
        description="Xem nội dung bị báo cáo (dự án, bình luận, người dùng) và xử lý kèm chế tài nếu có vi phạm."
      />

      <Suspense fallback={<div className="h-10" />}>
        <LinkTabs items={tabs} active={status} id="admin-reports-tabs" />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          title={status === "OPEN" ? "Không có báo cáo nào đang chờ xử lý" : "Chưa có báo cáo ở mục này"}
          description="Mọi phản ánh từ cộng đồng sẽ được xếp theo thứ tự thời gian tại đây."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const targetMeta = REPORT_TARGET_META[r.target_type] ?? { label: r.target_type, tone: "neutral" as const };
            const statusMeta = REPORT_STATUS_META[r.status] ?? { label: r.status, tone: "neutral" as const };
            return (
              <article key={r.id} className="card space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={targetMeta.tone}>{targetMeta.label}</Badge>
                    <Badge tone="rose" dot>
                      {REPORT_REASON[r.reason] ?? r.reason}
                    </Badge>
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                  </div>
                  <div className="text-xs text-muted" title={formatDate(r.created_at, true)}>
                    Gửi bởi <b>{r.reporter}</b> (@{r.reporter_username}) · {timeAgo(r.created_at, now)}
                  </div>
                </div>

                {/* Chi tiết người báo cáo nêu */}
                {r.detail && (
                  <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Nội dung báo cáo: </span>
                    <span className="text-fg">{r.detail}</span>
                  </div>
                )}

                {/* Xem trước đối tượng bị báo cáo */}
                <div className="rounded-xl border border-line bg-surface p-3.5 text-sm">
                  {r.target_type === "PROJECT" && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs font-semibold text-muted">Dự án bị báo cáo</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{r.project_title ?? "Dự án"}</span>
                          {r.project_status && <ProjectStatusBadge status={r.project_status} />}
                        </div>
                      </div>
                      {r.project_slug && (
                        <div className="flex gap-2">
                          <Link
                            href={`/p/${r.project_slug}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-violet-400/60"
                          >
                            Xem dự án <ExternalLink className="size-3" />
                          </Link>
                          <Link
                            href={`/admin/projects?q=${encodeURIComponent(r.project_slug)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-rose-400/60"
                          >
                            Quản lý
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {r.target_type === "COMMENT" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <MessageSquare className="size-3.5" /> Bình luận của{" "}
                          <b className="text-fg">{r.comment_author ?? "Người dùng"}</b>
                          {r.project_title && (
                            <>
                              {" "}
                              trên{" "}
                              <Link href={`/p/${r.project_slug}`} className="text-violet-600 hover:underline dark:text-violet-400">
                                {r.project_title}
                              </Link>
                            </>
                          )}
                        </span>
                        {r.comment_status && (
                          <Badge tone={r.comment_status === "VISIBLE" ? "sky" : "neutral"}>
                            Trạng thái bình luận: {r.comment_status}
                          </Badge>
                        )}
                      </div>
                      <blockquote className="rounded-lg bg-surface-2 px-3 py-2 text-sm italic text-fg/90">
                        “{r.comment_body ?? "(Bình luận không còn nội dung)"}”
                      </blockquote>
                    </div>
                  )}

                  {r.target_type === "USER" && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted" />
                        <span className="font-bold">{r.user_name}</span>
                        <span className="text-xs text-muted">@{r.user_username}</span>
                        {r.user_status && (
                          <Badge tone={r.user_status === "LOCKED" ? "rose" : "emerald"}>{r.user_status}</Badge>
                        )}
                        {r.user_is_admin === 1 && (
                          <Badge tone="rose">
                            <ShieldAlert className="size-3" /> ADMIN
                          </Badge>
                        )}
                      </div>
                      {r.user_username && (
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(r.user_username)}`}
                          className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                        >
                          Xem trong Quản lý người dùng →
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Khối xử lý / kết quả */}
                {r.status === "OPEN" ? (
                  <ReportHandleForm
                    report={r}
                    viewerId={viewer.id}
                    canModerateComment={canModerateComment}
                    canTakedown={canTakedown}
                    canLockUser={canLockUser}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span>
                        <b>Kết quả:</b> {r.resolution || "Đã xử lý"}
                      </span>
                    </div>
                    <span className="text-muted">
                      Xử lý bởi <b>{r.handler ?? "Admin"}</b> · {formatDate(r.handled_at, true)}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
