"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Check, CheckCircle2, ExternalLink, Eye, Loader2, MessageSquare, ShieldAlert, User, X } from "lucide-react";
import { toast } from "sonner";
import type { AdminReportRow } from "@/server/queries/admin";
import { handleReportAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/form";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import type { Tone } from "@/lib/status";
import { formatDate, timeAgo } from "@/lib/utils";

export function ReportHandleForm({
  report,
  viewerId,
  canModerateComment,
  canTakedown,
  canLockUser,
  onSuccess,
}: {
  report: AdminReportRow;
  viewerId: string;
  canModerateComment: boolean;
  canTakedown: boolean;
  canLockUser: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [quickAction, setQuickAction] = useState("none");
  const [pendingDecision, setPendingDecision] = useState<"RESOLVED" | "DISMISSED" | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSuspendProject =
    canTakedown &&
    Boolean(report.project_id) &&
    ["LIVE", "SCHEDULED"].includes(report.project_status ?? "");

  const canLockTargetUser =
    canLockUser &&
    Boolean(report.user_id) &&
    report.user_id !== viewerId &&
    report.user_is_admin !== 1 &&
    report.user_status !== "LOCKED";

  const canCommentAction = canModerateComment && report.target_type === "COMMENT" && Boolean(report.comment_id);

  const submitDecision = (decision: "RESOLVED" | "DISMISSED") => {
    const formEl = formRef.current;
    if (!formEl) return;
    setPendingDecision(decision);
    startTransition(async () => {
      const fd = new FormData(formEl);
      fd.set("decision", decision);
      const res = await handleReportAction(null, fd);
      setPendingDecision(null);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      if (res?.ok) {
        if (res.message) toast.success(res.message);
        onSuccess?.();
        router.refresh();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5"
    >
      <input type="hidden" name="reportId" value={report.id} />

      <div className="grid gap-2.5 sm:grid-cols-[1fr_230px]">
        <Input
          name="resolution"
          placeholder="Ghi chú kết quả xử lý (tuỳ chọn, >= 5 ký tự nếu kèm chế tài)..."
          className="h-10"
        />

        <Select
          name="quickAction"
          value={quickAction}
          onChange={(e) => setQuickAction(e.target.value)}
          className="h-10"
          aria-label="Thao tác kiểm duyệt kèm theo"
        >
          <option value="none">Chỉ đánh dấu xử lý</option>
          {canCommentAction && report.comment_status !== "HIDDEN" && (
            <option value="hide_comment">Ẩn bình luận vi phạm</option>
          )}
          {canCommentAction && report.comment_status !== "DELETED" && (
            <option value="delete_comment">Xoá bình luận vi phạm</option>
          )}
          {canSuspendProject && <option value="suspend_project">Tạm gỡ dự án</option>}
          {canLockTargetUser && <option value="lock_user">Khoá tài khoản vi phạm</option>}
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => submitDecision("DISMISSED")}
        >
          {isPending && pendingDecision === "DISMISSED" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}{" "}
          Bỏ qua
        </Button>
        <Button
          type="button"
          variant={quickAction === "none" ? "success" : "danger"}
          size="sm"
          disabled={isPending}
          onClick={() => submitDecision("RESOLVED")}
        >
          {isPending && pendingDecision === "RESOLVED" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}{" "}
          {quickAction === "none" ? "Đánh dấu đã xử lý" : "Xử lý & thực thi"}
        </Button>
      </div>
    </form>
  );
}

export function ReportDetailModalButton({
  report,
  reasonLabel,
  targetMeta,
  statusMeta,
  nowMs,
  viewerId,
  canModerateComment,
  canTakedown,
  canLockUser,
}: {
  report: AdminReportRow;
  reasonLabel: string;
  targetMeta: { label: string; tone: Tone };
  statusMeta: { label: string; tone: Tone };
  nowMs: number;
  viewerId: string;
  canModerateComment: boolean;
  canTakedown: boolean;
  canLockUser: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOpenReport = report.status === "OPEN";

  return (
    <>
      <Button
        type="button"
        variant={isOpenReport ? "primary" : "outline"}
        size="xs"
        onClick={() => setOpen(true)}
      >
        <Eye className="size-3.5" /> {isOpenReport ? "Xem & Xử lý" : "Chi tiết"}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={
          <div className="flex flex-wrap items-center gap-2">
            <span>Báo cáo vi phạm: {reasonLabel}</span>
            <Badge tone={targetMeta.tone}>{targetMeta.label}</Badge>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>
        }
        description={`Gửi bởi ${report.reporter} (@${report.reporter_username}) · ${timeAgo(report.created_at, nowMs)} (${formatDate(report.created_at, true)})`}
      >
        <div className="space-y-4 text-sm">
          {report.detail && (
            <div className="rounded-xl border border-line bg-surface-2/50 p-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Nội dung người báo cáo nêu</div>
              <p className="mt-1 text-fg">{report.detail}</p>
            </div>
          )}

          <div className="rounded-xl border border-line bg-surface p-3.5">
            {report.target_type === "PROJECT" && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-semibold text-muted">Dự án bị báo cáo</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{report.project_title ?? "Dự án"}</span>
                    {report.project_status && <ProjectStatusBadge status={report.project_status} />}
                  </div>
                </div>
                {report.project_slug && (
                  <div className="flex gap-2">
                    <Link
                      href={`/p/${report.project_slug}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-violet-400/60"
                    >
                      Xem dự án <ExternalLink className="size-3" />
                    </Link>
                    <Link
                      href={`/admin/projects?q=${encodeURIComponent(report.project_slug)}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-rose-400/60"
                    >
                      Quản lý
                    </Link>
                  </div>
                )}
              </div>
            )}

            {report.target_type === "COMMENT" && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <MessageSquare className="size-3.5" /> Bình luận của{" "}
                    <b className="text-fg">{report.comment_author ?? "Người dùng"}</b>
                    {report.project_title && report.project_slug && (
                      <>
                        {" "}trên{" "}
                        <Link href={`/p/${report.project_slug}`} className="text-violet-600 hover:underline dark:text-violet-400">
                          {report.project_title}
                        </Link>
                      </>
                    )}
                  </span>
                  {report.comment_status && (
                    <Badge tone={report.comment_status === "VISIBLE" ? "sky" : "neutral"}>
                      {report.comment_status === "VISIBLE"
                        ? "Đang hiển thị"
                        : report.comment_status === "HIDDEN"
                          ? "Đã ẩn"
                          : "Đã xoá"}
                    </Badge>
                  )}
                </div>
                <blockquote className="rounded-lg bg-surface-2 px-3 py-2 text-sm italic text-fg/90">
                  “{report.comment_body ?? "(Bình luận không còn nội dung)"}”
                </blockquote>
              </div>
            )}

            {report.target_type === "USER" && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <User className="size-4 text-muted" />
                  <span className="font-bold">{report.user_name}</span>
                  <span className="text-xs text-muted">@{report.user_username}</span>
                  {report.user_status && (
                    <Badge tone={report.user_status === "LOCKED" ? "rose" : "emerald"}>
                      {report.user_status === "LOCKED" ? "Đã khoá" : "Hoạt động"}
                    </Badge>
                  )}
                  {report.user_is_admin === 1 && (
                    <Badge tone="rose">
                      <ShieldAlert className="size-3" /> Quản trị viên
                    </Badge>
                  )}
                </div>
                {report.user_username && (
                  <Link
                    href={`/admin/users?q=${encodeURIComponent(report.user_username)}`}
                    className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                  >
                    Mở trong Quản lý người dùng →
                  </Link>
                )}
              </div>
            )}
          </div>

          {isOpenReport ? (
            <ReportHandleForm
              report={report}
              viewerId={viewerId}
              canModerateComment={canModerateComment}
              canTakedown={canTakedown}
              canLockUser={canLockUser}
              onSuccess={() => setOpen(false)}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>
                  <b>Kết quả:</b> {report.resolution || "Đã xử lý"}
                </span>
              </div>
              <span className="text-muted">
                Xử lý bởi <b>{report.handler ?? "Quản trị viên"}</b> · {formatDate(report.handled_at, true)}
              </span>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
