"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import type { AdminReportRow } from "@/server/queries/admin";
import { handleReportAction } from "@/server/actions/admin";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

function DecisionButton({
  value,
  variant,
  children,
}: {
  value: "RESOLVED" | "DISMISSED";
  variant: Parameters<typeof buttonClass>[0];
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="decision"
      value={value}
      disabled={pending}
      className={buttonClass(variant, "sm")}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ReportHandleForm({
  report,
  viewerId,
  canModerateComment,
  canTakedown,
  canLockUser,
}: {
  report: AdminReportRow;
  viewerId: string;
  canModerateComment: boolean;
  canTakedown: boolean;
  canLockUser: boolean;
}) {
  const [quickAction, setQuickAction] = useState("none");

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

  return (
    <ActionForm action={handleReportAction} className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5">
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
        <DecisionButton value="DISMISSED" variant="outline">
          <X className="size-4" /> Bỏ qua
        </DecisionButton>
        <DecisionButton value="RESOLVED" variant={quickAction === "none" ? "success" : "danger"}>
          <Check className="size-4" /> {quickAction === "none" ? "Đánh dấu đã xử lý" : "Xử lý & thực thi"}
        </DecisionButton>
      </div>
    </ActionForm>
  );
}
