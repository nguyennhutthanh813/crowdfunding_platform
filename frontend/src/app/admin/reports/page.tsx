import { Suspense } from "react";
import { requireSystemPerm } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { adminReports, REPORT_REASON } from "@/server/queries/admin";
import { REPORT_STATUS_META, REPORT_TARGET_META, serverNow } from "@/components/admin/admin-helpers";
import { ReportDetailModalButton } from "@/components/admin/report-handle-form";
import { PaginationBar } from "@/components/ui/pagination";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/primitives";
import { LinkTabs } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/utils";

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
  const page = Number(firstParam(sp.page)) || 1;

  const { rows, counts, total, page: curPage, pages } = await adminReports(status, page);
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Kiểm duyệt cộng đồng"
        title="Báo cáo vi phạm"
        description="Danh sách gọn các phản ánh vi phạm; bấm Xem & Xử lý để xem đầy đủ chi tiết và quyết định trong hộp thoại."
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
        <>
          {/* Mobile cards gọn */}
          <div className="space-y-2.5 lg:hidden">
            {rows.map((r) => {
              const targetMeta = REPORT_TARGET_META[r.target_type] ?? { label: r.target_type, tone: "neutral" as const };
              const statusMeta = REPORT_STATUS_META[r.status] ?? { label: r.status, tone: "neutral" as const };
              const reasonLabel = REPORT_REASON[r.reason] ?? r.reason;
              const targetTitle =
                r.target_type === "PROJECT"
                  ? r.project_title ?? "Dự án"
                  : r.target_type === "COMMENT"
                    ? `Bình luận của ${r.comment_author ?? "Thành viên"}`
                    : `${r.user_name ?? "Tài khoản"} (@${r.user_username ?? ""})`;
              return (
                <div key={r.id} className="card space-y-2.5 p-3.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={targetMeta.tone}>{targetMeta.label}</Badge>
                      <Badge tone="rose" dot>{reasonLabel}</Badge>
                    </div>
                    <span className="text-[11px] text-muted">{timeAgo(r.created_at, now)}</span>
                  </div>
                  <div className="font-bold text-fg">{targetTitle}</div>
                  {r.detail && <p className="line-clamp-2 text-muted">{r.detail}</p>}
                  <div className="flex items-center justify-between border-t border-line pt-2.5">
                    <span className="text-muted">Bởi @{r.reporter_username}</span>
                    <ReportDetailModalButton
                      report={r}
                      reasonLabel={reasonLabel}
                      targetMeta={targetMeta}
                      statusMeta={statusMeta}
                      nowMs={now}
                      viewerId={viewer.id}
                      canModerateComment={canModerateComment}
                      canTakedown={canTakedown}
                      canLockUser={canLockUser}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table gọn */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Đối tượng bị báo cáo</th>
                  <th className="px-4 py-3">Lý do &amp; Nội dung</th>
                  <th className="px-4 py-3">Người báo cáo</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const targetMeta = REPORT_TARGET_META[r.target_type] ?? { label: r.target_type, tone: "neutral" as const };
                  const statusMeta = REPORT_STATUS_META[r.status] ?? { label: r.status, tone: "neutral" as const };
                  const reasonLabel = REPORT_REASON[r.reason] ?? r.reason;
                  const targetTitle =
                    r.target_type === "PROJECT"
                      ? r.project_title ?? "Dự án"
                      : r.target_type === "COMMENT"
                        ? `Bình luận của ${r.comment_author ?? "Thành viên"}`
                        : `${r.user_name ?? "Tài khoản"} (@${r.user_username ?? ""})`;
                  const subContext =
                    r.target_type === "COMMENT" && r.comment_body
                      ? `“${r.comment_body}”`
                      : r.project_title && r.target_type !== "PROJECT"
                        ? r.project_title
                        : "";
                  return (
                    <tr key={r.id} className="transition hover:bg-surface-2/40">
                      <td className="max-w-[260px] px-4 py-3">
                        <div className="mb-1">
                          <Badge tone={targetMeta.tone}>{targetMeta.label}</Badge>
                        </div>
                        <div className="truncate font-bold">{targetTitle}</div>
                        {subContext && <div className="truncate text-xs text-muted">{subContext}</div>}
                      </td>
                      <td className="max-w-[300px] px-4 py-3">
                        <Badge tone="rose" dot>{reasonLabel}</Badge>
                        {r.detail && <div className="mt-1 truncate text-xs text-muted">{r.detail}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                        <div className="font-semibold text-fg">{r.reporter}</div>
                        <div>
                          @{r.reporter_username} · {timeAgo(r.created_at, now)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                        {r.handler && <div className="mt-1 text-[11px] text-muted">{r.handler}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <ReportDetailModalButton
                          report={r}
                          reasonLabel={reasonLabel}
                          targetMeta={targetMeta}
                          statusMeta={statusMeta}
                          nowMs={now}
                          viewerId={viewer.id}
                          canModerateComment={canModerateComment}
                          canTakedown={canTakedown}
                          canLockUser={canLockUser}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            basePath="/admin/reports"
            page={curPage}
            pages={pages}
            total={total}
            params={{ tab: status }}
            itemLabel="báo cáo"
          />
        </>
      )}
    </div>
  );
}
