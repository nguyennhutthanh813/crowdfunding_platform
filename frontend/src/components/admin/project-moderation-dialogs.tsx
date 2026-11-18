"use client";

import { useState } from "react";
import { RotateCcw, ShieldBan } from "lucide-react";
import { restoreProjectAction, takedownProjectAction } from "@/server/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import { formatDate } from "@/lib/utils";

const SUSPEND_TEMPLATES = [
  "Nghi vi phạm bản quyền hình ảnh / nội dung — tạm gỡ để xác minh.",
  "Thông số sản phẩm chưa trung thực với mô tả gây hiểu nhầm cho người ủng hộ.",
  "Nhận nhiều báo cáo vi phạm từ cộng đồng — tạm dừng kiểm tra.",
];

export function TakedownProjectButton({
  projectId,
  projectTitle,
  status,
  openReports,
}: {
  projectId: string;
  projectTitle: string;
  status: string;
  openReports: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!["LIVE", "SCHEDULED"].includes(status)) return null;

  return (
    <>
      <Button type="button" variant="danger" size="xs" onClick={() => setOpen(true)}>
        <ShieldBan className="size-3.5" /> Tạm gỡ
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tạm gỡ dự án vi phạm"
        description={`Dự án “${projectTitle}” sẽ chuyển sang trạng thái Tạm gỡ (SUSPENDED) và ẩn khỏi danh sách công khai.`}
      >
        <ActionForm
          action={takedownProjectAction}
          onSuccess={() => {
            setOpen(false);
            setReason("");
          }}
          className="space-y-4"
        >
          {(state) => (
            <>
              <input type="hidden" name="projectId" value={projectId} />
              {openReports >= 3 && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-300">
                  Dự án này đang có {openReports} báo cáo mở cần ưu tiên xác minh.
                </div>
              )}
              <Field label="Lý do tạm gỡ" required error={state?.fieldErrors?.reason} hint="Bắt buộc ít nhất 5 ký tự. Creator sẽ nhận thông báo lý do này.">
                <Textarea
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  minLength={5}
                  placeholder="Nhập lý do tạm gỡ..."
                />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {SUSPEND_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setReason(tpl)}
                    className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-muted transition hover:text-fg"
                  >
                    + {tpl.slice(0, 36)}…
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Huỷ
                </Button>
                <SubmitButton variant="danger" size="sm" pendingText="Đang gỡ...">
                  Xác nhận tạm gỡ
                </SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function RestoreProjectButton({
  projectId,
  projectTitle,
  status,
  endAt,
}: {
  projectId: string;
  projectTitle: string;
  status: string;
  endAt: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (status !== "SUSPENDED") return null;

  return (
    <>
      <Button type="button" variant="success" size="xs" onClick={() => setOpen(true)}>
        <RotateCcw className="size-3.5" /> Khôi phục
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Khôi phục dự án"
        description={`Khôi phục “${projectTitle}” sau khi đã xác minh hợp lệ.`}
      >
        <ActionForm action={restoreProjectAction} onSuccess={() => setOpen(false)} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-muted">
            Hệ thống tự chuyển về <b>Sắp mở</b> hoặc <b>Đang gọi vốn</b> nếu còn hạn ({formatDate(endAt, true)}). Nếu chiến dịch đã hết hạn trong thời gian bị gỡ, hệ thống sẽ chốt <b>Không đạt (FAILED)</b> và giải phóng toàn bộ tiền giữ chỗ.
          </div>
          <Field label="Ghi chú khôi phục (tuỳ chọn)">
            <Textarea name="note" placeholder="Ví dụ: Creator đã bổ sung chứng từ bản quyền hợp lệ." className="min-h-20" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <SubmitButton variant="success" size="sm" pendingText="Đang khôi phục...">
              Xác nhận khôi phục
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
