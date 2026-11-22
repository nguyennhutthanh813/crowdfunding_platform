"use client";

import { useState } from "react";
import { CheckCheck, Cpu, Flame, Mail, Play } from "lucide-react";
import { flushEmailOutboxAction, runSchedulerNowAction, settleLiveProjectNowAction } from "@/server/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { formatCompactVnd, formatVnd, percentOf } from "@/lib/utils";

export interface LiveScheduledProject {
  id: string;
  slug: string;
  title: string;
  end_at: string;
  goal_amount: number;
  held: number;
  backers: number;
}

export function RunSchedulerButton() {
  return (
    <ActionForm action={runSchedulerNowAction}>
      <SubmitButton variant="primary" size="md" pendingText="Đang quét chiến dịch...">
        <Play className="size-4" /> Chạy bộ lập lịch ngay
      </SubmitButton>
    </ActionForm>
  );
}

export function FlushEmailOutboxButton() {
  return (
    <ActionForm action={flushEmailOutboxAction}>
      <SubmitButton variant="outline" size="sm" pendingText="Đang gửi…">
        <Mail className="size-4" /> Gửi ngay hàng đợi
      </SubmitButton>
    </ActionForm>
  );
}

export function SchedulerMechanismButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="md" onClick={() => setOpen(true)}>
        <Cpu className="size-4 text-indigo-500" /> Cơ chế
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Quy trình xử lý tự động theo lịch"
        description="Bộ lập lịch chạy định kỳ để đảm bảo chiến dịch mở bán và chốt thanh toán đúng hạn, không trùng lặp."
      >
        <div className="grid gap-3 text-xs text-muted sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div className="font-bold text-fg">1. Mở chiến dịch đúng hẹn</div>
            <p className="mt-1 leading-relaxed">
              Các dự án <b>Sắp mở</b> đến giờ hẹn sẽ tự chuyển sang <b>Đang gọi vốn</b> và gửi thông báo cho người theo dõi.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div className="font-bold text-fg">2. Chốt kết quả gọi vốn</div>
            <p className="mt-1 leading-relaxed">
              Khi hết hạn: đạt mục tiêu sẽ chuyển sang <b>Thành công</b> và <b>thu tiền</b>; chưa đạt sẽ <b>hoàn lại hạn mức giữ chỗ</b>.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div className="font-bold text-fg">3. An toàn chống trừ trùng</div>
            <p className="mt-1 leading-relaxed">
              Mỗi giao dịch có mã chống trùng lặp riêng để đảm bảo chạy lại nhiều lần không bao giờ thu tiền hai lần.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function ManualSettleModalButton({ liveProjects }: { liveProjects: LiveScheduledProject[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="gold" size="md" onClick={() => setOpen(true)}>
        <Flame className="size-4" /> Tất toán thủ công ({liveProjects.length})
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Tất toán chiến dịch thủ công"
        description="Chốt sớm một chiến dịch đang gọi vốn để đối soát thu tiền (đạt mục tiêu) hoặc giải phóng hạn mức (không đạt)."
      >
        <ManualSettleForm liveProjects={liveProjects} onSuccess={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

export function ManualSettleForm({
  liveProjects,
  onSuccess,
}: {
  liveProjects: LiveScheduledProject[];
  onSuccess?: () => void;
}) {
  const [selectedId, setSelectedId] = useState(liveProjects[0]?.id ?? "");
  const chosen = liveProjects.find((p) => p.id === selectedId) ?? liveProjects[0];

  if (liveProjects.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
        Hiện không còn dự án nào đang gọi vốn.
      </div>
    );
  }

  const willSucceed = chosen ? chosen.held >= chosen.goal_amount : false;
  const pct = chosen ? percentOf(chosen.held, chosen.goal_amount) : 0;

  return (
    <ActionForm
      action={settleLiveProjectNowAction}
      onSuccess={onSuccess}
      confirm={
        chosen
          ? `Xác nhận tất toán sớm chiến dịch “${chosen.title}” (${willSucceed ? "thu tiền đạt mục tiêu" : "giải phóng hạn mức"})?`
          : undefined
      }
      className="space-y-4"
    >
      <Field
        label="Chọn chiến dịch đang chạy để tất toán thủ công"
        hint="Dùng khi Quản trị viên cần chốt sớm một chiến dịch theo quy trình đối soát đạt mục tiêu mới thu tiền."
      >
        <Select name="projectId" value={chosen?.id ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
          {liveProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({percentOf(p.held, p.goal_amount)}% · {p.backers} khoản giữ chỗ)
            </option>
          ))}
        </Select>
      </Field>

      {chosen && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/80 p-3.5 text-sm">
          <div className="space-y-0.5">
            <div className="font-semibold">
              Đang giữ chỗ: <span className="text-emerald-600 dark:text-emerald-400">{formatVnd(chosen.held)}</span> /{" "}
              {formatCompactVnd(chosen.goal_amount)} ({pct}%)
            </div>
            <div className="text-xs text-muted">{chosen.backers} khoản góp vốn đang ở trạng thái giữ chỗ</div>
          </div>
          <Badge tone={willSucceed ? "emerald" : "amber"} dot>
            {willSucceed ? "Đạt mục tiêu → Thu tiền" : "Chưa đạt → Hoàn hạn mức"}
          </Badge>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton variant="gold" size="sm" pendingText="Đang tất toán...">
          <CheckCheck className="size-4" /> Tất toán chiến dịch này
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
