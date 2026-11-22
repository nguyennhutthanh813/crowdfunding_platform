"use client";

import { useState } from "react";
import { CheckCircle2, Eye, RotateCcw, XCircle } from "lucide-react";
import type { AdminTransactionRow } from "@/server/queries/admin";
import { refundPledgeAction, resolveFailedCaptureAction } from "@/server/actions/admin";
import { TX_KIND_META } from "@/components/admin/admin-helpers";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import { PledgeStatusBadge } from "@/components/ui/primitives";
import { formatDate, formatVnd } from "@/lib/utils";

const REFUND_PRESETS = [
  "Người ủng hộ gửi yêu cầu hoàn tiền hợp lệ trước khi giao quà vật lý.",
  "Đối soát trùng giao dịch qua cổng VNPAY — hoàn trả khoản dư.",
  "Nhà sáng tạo đồng ý hoàn tiền theo thoả thuận hỗ trợ cộng đồng.",
];

export function TransactionRowActions({ row }: { row: AdminTransactionRow }) {
  const [inspectOpen, setInspectOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reason, setReason] = useState("");

  const canRefund = row.pledge_status === "CAPTURED" && row.kind === "CAPTURE" && row.status === "SUCCEEDED";
  const canResolveFailed = row.pledge_status === "CAPTURE_FAILED";

  return (
    <>
      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={() => setInspectOpen(true)}>
          <Eye className="size-3.5" /> Đối soát
        </Button>

        {canRefund && (
          <Button type="button" variant="outline" size="xs" onClick={() => setRefundOpen(true)}>
            <RotateCcw className="size-3.5 text-amber-600" /> Hoàn tiền
          </Button>
        )}

        {canResolveFailed && (
          <Button type="button" variant="primary" size="xs" onClick={() => setResolveOpen(true)}>
            Xử lý lỗi thu
          </Button>
        )}
      </div>

      {/* Chi tiết đối soát giao dịch */}
      <Dialog
        open={inspectOpen}
        onClose={() => setInspectOpen(false)}
        title={`Chi tiết đối soát giao dịch · ${row.code}`}
        description="Thông tin bút toán tài chính và tham chiếu cổng thanh toán VNPAY / thẻ đã lưu."
      >
        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div>
              <span className="text-muted">Cổng thanh toán</span>
              <div className="mt-0.5 font-extrabold">{row.provider === "VNPAY" ? "VNPAY" : "Thẻ đã lưu"}</div>
            </div>
            <div>
              <span className="text-muted">Số tiền bút toán</span>
              <div className="mt-0.5 text-sm font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatVnd(row.amount)}
              </div>
            </div>
            <div>
              <span className="text-muted">Loại nghiệp vụ</span>
              <div className="mt-0.5 font-bold">{TX_KIND_META[row.kind]?.label ?? row.kind}</div>
            </div>
            <div>
              <span className="text-muted">Trạng thái góp vốn</span>
              <div className="mt-0.5">
                <PledgeStatusBadge status={row.pledge_status} />
              </div>
            </div>
          </div>

          <dl className="space-y-2 rounded-xl border border-line p-3.5">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Mã giao dịch cổng</dt>
              <dd className="font-mono font-bold">{row.provider_ref || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Mã tham chiếu VNPAY</dt>
              <dd className="font-mono font-bold">{row.vnp_txn_ref || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Ngân hàng / Mã phản hồi</dt>
              <dd className="font-mono font-semibold">
                {row.bank_code || "—"} {row.vnp_response_code ? `(Mã ${row.vnp_response_code})` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Mã chống trùng</dt>
              <dd className="truncate font-mono text-[11px]">{row.idempotency_key}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Thời điểm ghi sổ</dt>
              <dd>{formatDate(row.created_at, true)}</dd>
            </div>
            <div className="border-t border-line pt-2">
              <dt className="text-muted">Diễn giải</dt>
              <dd className="mt-0.5 font-medium text-fg">{row.message || "—"}</dd>
            </div>
          </dl>

          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setInspectOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Hộp thoại hoàn tiền VNPAY */}
      <Dialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title={`Hoàn tiền VNPAY · ${row.code}`}
        description={`Thực hiện hoàn trả ${formatVnd(row.amount)} cho ${row.backer} (@${row.backer_username}) trên dự án “${row.title}”.`}
      >
        <ActionForm
          action={refundPledgeAction}
          onSuccess={() => {
            setRefundOpen(false);
            setReason("");
          }}
          className="space-y-4"
        >
          <input type="hidden" name="pledgeId" value={row.pledge_id} />
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
            Hệ thống sẽ tạo giao dịch <b>Hoàn tiền</b> qua cổng VNPAY, chuyển trạng thái góp vốn sang <b>Đã hoàn tiền</b>, cập nhật lại tổng tiền dự án và gửi thông báo cho cả người ủng hộ lẫn chủ dự án.
          </div>
          <Field label="Lý do hoàn tiền đối soát" required hint="Bắt buộc tối thiểu 5 ký tự để lưu nhật ký kiểm toán.">
            <Textarea
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              required
              placeholder="Nhập lý do hoàn tiền..."
              className="min-h-24"
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {REFUND_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-muted hover:text-fg"
              >
                + {p.slice(0, 38)}…
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setRefundOpen(false)}>
              Huỷ
            </Button>
            <SubmitButton size="sm" variant="danger" pendingText="Đang hoàn tiền…">
              <RotateCcw className="size-3.5" /> Xác nhận hoàn {formatVnd(row.amount)}
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>

      {/* Hộp thoại xử lý khoản thu lỗi */}
      <Dialog
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title={`Xử lý khoản thu lỗi · ${row.code}`}
        description={`Khoản góp vốn ${formatVnd(row.amount)} của ${row.backer} đang ở trạng thái Trừ tiền lỗi.`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 p-3 text-xs">
            <span>Trạng thái hiện tại:</span>
            <PledgeStatusBadge status={row.pledge_status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionForm action={resolveFailedCaptureAction} onSuccess={() => setResolveOpen(false)}>
              <input type="hidden" name="pledgeId" value={row.pledge_id} />
              <input type="hidden" name="op" value="RETRY_CAPTURE" />
              <input type="hidden" name="note" value="Quản trị viên xác nhận đối soát thu tiền thành công qua VNPAY" />
              <SubmitButton variant="success" size="sm" className="w-full" pendingText="Đang thu lại…">
                <CheckCircle2 className="size-4" /> Xác nhận đã thu VNPAY
              </SubmitButton>
            </ActionForm>

            <ActionForm action={resolveFailedCaptureAction} onSuccess={() => setResolveOpen(false)}>
              <input type="hidden" name="pledgeId" value={row.pledge_id} />
              <input type="hidden" name="op" value="VOID" />
              <input type="hidden" name="note" value="Giải phóng khoản giữ chỗ do quá hạn thanh toán lại" />
              <SubmitButton variant="danger" size="sm" className="w-full" pendingText="Đang giải phóng…">
                <XCircle className="size-4" /> Giải phóng giữ chỗ
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      </Dialog>
    </>
  );
}
