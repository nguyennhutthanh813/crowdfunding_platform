"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareWarning, XCircle } from "lucide-react";
import { decideReviewAction } from "@/server/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/form";
import { cn, formatDate } from "@/lib/utils";

type Decision = "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";

const OPTIONS: {
  key: Decision;
  label: string;
  desc: string;
  icon: typeof CheckCircle2;
  ring: string;
  btnVariant: "success" | "secondary" | "danger";
  submitText: string;
}[] = [
  {
    key: "APPROVED",
    label: "Duyệt dự án",
    desc: "Công khai hoặc chuyển sang lịch hẹn mở",
    icon: CheckCircle2,
    ring: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    btnVariant: "success",
    submitText: "Xác nhận duyệt dự án",
  },
  {
    key: "CHANGES_REQUESTED",
    label: "Yêu cầu chỉnh sửa",
    desc: "Trả về bản nháp kèm góp ý cho Chủ dự án",
    icon: MessageSquareWarning,
    ring: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    btnVariant: "secondary",
    submitText: "Gửi yêu cầu chỉnh sửa",
  },
  {
    key: "REJECTED",
    label: "Từ chối dự án",
    desc: "Không đạt tiêu chuẩn nền tảng",
    icon: XCircle,
    ring: "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    btnVariant: "danger",
    submitText: "Xác nhận từ chối",
  },
];

const QUICK_NOTES = [
  "Đủ thông tin, phần quà và kế hoạch rủi ro hợp lệ.",
  "Vui lòng bổ sung thông số kỹ thuật và ảnh thực tế của sản phẩm.",
  "Cần làm rõ tiến độ sản xuất và chính sách bảo hành cho người ủng hộ.",
  "Nội dung có dấu hiệu vi phạm chính sách hoặc từ khoá cấm.",
];

export function ReviewDecisionForm({
  projectId,
  status,
  willSchedule,
  desiredStart,
  requiredOk,
}: {
  projectId: string;
  status: string;
  willSchedule: boolean;
  desiredStart: string | null;
  requiredOk: boolean;
}) {
  const [decision, setDecision] = useState<Decision>("APPROVED");
  const [note, setNote] = useState("");
  const current = OPTIONS.find((o) => o.key === decision)!;

  if (status !== "PENDING_REVIEW") {
    return (
      <div className="card border-line/80 bg-surface-2/60 p-5 text-sm">
        <div className="font-bold">Dự án không còn ở hàng chờ duyệt</div>
        <p className="mt-1 text-muted">Trạng thái hiện tại là {status}. Chỉ dự án ở trạng thái Chờ duyệt mới thao tác duyệt được.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h3 className="text-base font-bold">Quyết định kiểm duyệt</h3>
        <p className="mt-0.5 text-xs text-muted">
          {willSchedule
            ? `Chủ dự án đã hẹn ngày mở ${formatDate(desiredStart, true)} — duyệt sẽ chuyển sang Sắp mở.`
            : "Chủ dự án chưa đặt lịch tương lai — duyệt sẽ mở gọi vốn ngay lập tức."}
        </p>
      </div>

      {!requiredOk && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-700 dark:text-amber-300">
          Lưu ý: Dự án chưa đạt toàn bộ mục bắt buộc trong checklist tự động. Cân nhắc chọn “Yêu cầu chỉnh sửa”.
        </div>
      )}

      <ActionForm action={decideReviewAction} className="space-y-4">
        {(state) => (
          <>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="decision" value={decision} />

            <div className="grid gap-2">
              {OPTIONS.map((opt) => {
                const selected = decision === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDecision(opt.key)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                      selected ? opt.ring : "border-line bg-surface hover:border-violet-400/40",
                    )}
                  >
                    <opt.icon className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{opt.label}</div>
                      <div className="text-xs opacity-80">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <Field
              label={decision === "APPROVED" ? "Ghi chú duyệt (tuỳ chọn)" : "Lý do / góp ý cho Chủ dự án"}
              required={decision !== "APPROVED"}
              error={state?.fieldErrors?.note}
              hint={decision === "APPROVED" ? "Ghi chú sẽ lưu vào lịch sử duyệt." : "Bắt buộc ít nhất 5 ký tự để Chủ dự án biết cần sửa gì."}
            >
              <Textarea
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required={decision !== "APPROVED"}
                minLength={decision === "APPROVED" ? 0 : 5}
                placeholder="Nhập nhận xét kiểm duyệt..."
                className="min-h-24"
              />
            </Field>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setNote(tpl)}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted transition hover:border-violet-400/50 hover:text-fg"
                >
                  + {tpl.slice(0, 34)}…
                </button>
              ))}
            </div>

            <SubmitButton variant={current.btnVariant} className="w-full" pendingText="Đang xử lý...">
              {current.submitText}
            </SubmitButton>
          </>
        )}
      </ActionForm>
    </div>
  );
}
