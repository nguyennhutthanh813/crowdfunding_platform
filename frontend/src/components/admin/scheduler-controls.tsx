"use client";

import { useState } from "react";
import { Flame, Play, Sparkles } from "lucide-react";
import { demoExpireProjectAction, runSchedulerNowAction } from "@/server/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { formatCompactVnd, formatVnd, percentOf } from "@/lib/utils";

export interface LiveDemoProject {
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

export function DemoExpireForm({ liveProjects }: { liveProjects: LiveDemoProject[] }) {
  const [selectedId, setSelectedId] = useState(liveProjects[0]?.id ?? "");
  const chosen = liveProjects.find((p) => p.id === selectedId) ?? liveProjects[0];

  if (liveProjects.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
        Hiện không còn dự án nào ở trạng thái Đang gọi vốn (LIVE) để demo kết thúc.
      </div>
    );
  }

  const willSucceed = chosen ? chosen.held >= chosen.goal_amount : false;
  const pct = chosen ? percentOf(chosen.held, chosen.goal_amount) : 0;

  return (
    <ActionForm
      action={demoExpireProjectAction}
      confirm={
        chosen
          ? `Xác nhận kết thúc ngay chiến dịch “${chosen.title}” và chạy chốt ${willSucceed ? "CAPTURE (trừ tiền)" : "VOID (giải phóng giữ chỗ)"}?`
          : undefined
      }
      className="space-y-4"
    >
      <Field label="Chọn chiến dịch LIVE để giả lập hết hạn" hint="Chỉ dùng khi trình bày demo luồng All-or-Nothing (FR23): đặt end_at về quá khứ 1 phút rồi chạy scheduler.">
        <Select name="projectId" value={chosen?.id ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
          {liveProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({percentOf(p.held, p.goal_amount)}% · {p.backers} pledge)
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
            <div className="text-xs text-muted">{chosen.backers} pledge ở trạng thái AUTHORIZED</div>
          </div>
          <Badge tone={willSucceed ? "emerald" : "amber"} dot>
            {willSucceed ? "Đạt mục tiêu → sẽ CAPTURE" : "Chưa đạt → sẽ VOID"}
          </Badge>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Sparkles className="size-3.5 text-amber-500" /> Ghi nhật ký scheduler.demo_expire &amp; scheduler_runs
        </span>
        <SubmitButton variant="gold" size="sm" pendingText="Đang chốt...">
          <Flame className="size-4" /> Kết thúc ngay để demo
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
