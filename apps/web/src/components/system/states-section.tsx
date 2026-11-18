"use client";

import { useState } from "react";
import { ArrowRight, Package, ShieldAlert, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, PledgeStatusBadge, ProjectStatusBadge } from "@/components/ui/primitives";

interface TransitionRule {
  from: string;
  to: string;
  actor: string;
  trigger: string;
}

const PROJECT_STATES = [
  "DRAFT",
  "PENDING_REVIEW",
  "REJECTED",
  "SCHEDULED",
  "LIVE",
  "SUSPENDED",
  "SUCCESS",
  "FAILED",
  "FULFILLING",
  "COMPLETED",
  "CANCELLED",
] as const;

const PROJECT_TRANSITIONS: TransitionRule[] = [
  { from: "DRAFT", to: "PENDING_REVIEW", actor: "Creator", trigger: "Đạt checklist bắt buộc → khoá goal & duration" },
  { from: "DRAFT", to: "CANCELLED", actor: "Creator", trigger: "Huỷ bản nháp trước khi mở" },
  { from: "PENDING_REVIEW", to: "DRAFT", actor: "Creator / Admin", trigger: "Rút lại hồ sơ hoặc Admin yêu cầu chỉnh sửa" },
  { from: "PENDING_REVIEW", to: "REJECTED", actor: "Admin", trigger: "Từ chối kèm lý do (>= 5 ký tự)" },
  { from: "PENDING_REVIEW", to: "SCHEDULED", actor: "Admin", trigger: "Duyệt, giữ lịch mở tương lai (bật preview)" },
  { from: "PENDING_REVIEW", to: "LIVE", actor: "Admin", trigger: "Duyệt và mở gọi vốn ngay" },
  { from: "PENDING_REVIEW", to: "CANCELLED", actor: "Creator", trigger: "Huỷ trước khi khởi chạy" },
  { from: "REJECTED", to: "DRAFT", actor: "Creator", trigger: "Chỉnh sửa lại hồ sơ" },
  { from: "REJECTED", to: "CANCELLED", actor: "Creator", trigger: "Ngừng dự án" },
  { from: "SCHEDULED", to: "LIVE", actor: "Scheduler / Creator", trigger: "Tới start_at hoặc Creator mở sớm" },
  { from: "SCHEDULED", to: "SUSPENDED", actor: "Admin", trigger: "Tạm gỡ do vi phạm trước khi mở" },
  { from: "SCHEDULED", to: "CANCELLED", actor: "Creator", trigger: "Huỷ trước khi khởi chạy" },
  { from: "LIVE", to: "SUCCESS", actor: "Scheduler", trigger: "Hết hạn (end_at <= now) và raised >= goal" },
  { from: "LIVE", to: "FAILED", actor: "Scheduler", trigger: "Hết hạn (end_at <= now) và raised < goal" },
  { from: "LIVE", to: "SUSPENDED", actor: "Admin", trigger: "Tạm gỡ để xác minh báo cáo vi phạm" },
  { from: "LIVE", to: "CANCELLED", actor: "Creator", trigger: "Chỉ được huỷ nếu không còn pledge hiệu lực (trg_projects_cancel_guard)" },
  { from: "SUSPENDED", to: "LIVE", actor: "Admin", trigger: "Khôi phục khi chiến dịch vẫn còn hạn" },
  { from: "SUSPENDED", to: "SCHEDULED", actor: "Admin", trigger: "Khôi phục khi chưa tới ngày mở" },
  { from: "SUSPENDED", to: "FAILED", actor: "Admin", trigger: "Khôi phục nhưng đã quá hạn → VOID các pledge" },
  { from: "SUSPENDED", to: "CANCELLED", actor: "Admin / Creator", trigger: "Huỷ sau khi không còn pledge giữ chỗ" },
  { from: "SUCCESS", to: "FULFILLING", actor: "Creator", trigger: "Bắt đầu đóng gói & sinh shipments cho quà vật lý" },
  { from: "SUCCESS", to: "COMPLETED", actor: "Creator", trigger: "Hoàn tất ngay nếu chỉ có quà số" },
  { from: "FULFILLING", to: "COMPLETED", actor: "Creator", trigger: "Đã giao xong toàn bộ phần quà" },
];

const PLEDGE_STATES = ["AUTHORIZED", "CAPTURED", "CAPTURE_FAILED", "VOIDED", "CANCELLED", "REFUNDED"] as const;

const PLEDGE_TRANSITIONS: TransitionRule[] = [
  { from: "AUTHORIZED", to: "CAPTURED", actor: "Scheduler", trigger: "Dự án SUCCESS → trừ tiền MockPay (CAPTURE)" },
  { from: "AUTHORIZED", to: "CAPTURE_FAILED", actor: "Scheduler", trigger: "Dự án SUCCESS nhưng thẻ hết hạn / từ chối" },
  { from: "AUTHORIZED", to: "VOIDED", actor: "Scheduler", trigger: "Dự án FAILED → giải phóng tiền giữ chỗ (VOID)" },
  { from: "AUTHORIZED", to: "CANCELLED", actor: "Backer", trigger: "Backer tự huỷ hoặc đổi pledge khi dự án đang LIVE" },
  { from: "CAPTURE_FAILED", to: "CAPTURED", actor: "Hệ thống / Backer", trigger: "Cập nhật thẻ và trừ tiền lại thành công" },
  { from: "CAPTURE_FAILED", to: "VOIDED", actor: "Hệ thống", trigger: "Không thu được sau thời gian chờ → giải phóng" },
  { from: "CAPTURED", to: "REFUNDED", actor: "Admin", trigger: "Hoàn tiền xử lý sự cố / báo cáo vi phạm" },
];

export function StatesSection() {
  const [selectedProjectState, setSelectedProjectState] = useState<string>("LIVE");
  const [selectedPledgeState, setSelectedPledgeState] = useState<string>("AUTHORIZED");

  const projOut = PROJECT_TRANSITIONS.filter((t) => t.from === selectedProjectState);
  const projIn = PROJECT_TRANSITIONS.filter((t) => t.to === selectedProjectState);

  const pledgeOut = PLEDGE_TRANSITIONS.filter((t) => t.from === selectedPledgeState);
  const pledgeIn = PLEDGE_TRANSITIONS.filter((t) => t.to === selectedPledgeState);

  return (
    <div className="space-y-6">
      {/* 1. Máy trạng thái Dự án */}
      <div className="card space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold">1. Vòng đời Dự án (projects.status — 11 trạng thái)</h3>
            <p className="text-xs text-muted">
              Cưỡng chế bởi Trigger <code className="font-mono">trg_projects_status_flow</code> &{" "}
              <code className="font-mono">trg_projects_cancel_guard</code>. Bấm một trạng thái để xem các chuyển tiếp hợp lệ.
            </p>
          </div>
          <Badge tone="violet">trg_projects_status_flow</Badge>
        </div>

        {/* Sơ đồ luồng chính trực quan */}
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2/50 p-4">
          <div className="flex min-w-[660px] items-center justify-between gap-2 text-xs">
            {(["DRAFT", "PENDING_REVIEW", "SCHEDULED", "LIVE", "SUCCESS", "FULFILLING", "COMPLETED"] as const).map((st, idx, arr) => (
              <div key={st} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProjectState(st)}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 transition",
                    selectedProjectState === st
                      ? "border-violet-500 bg-violet-500/12 ring-2 ring-violet-500/40"
                      : "border-line bg-surface hover:border-violet-400/50",
                  )}
                >
                  <ProjectStatusBadge status={st} />
                </button>
                {idx < arr.length - 1 && <ArrowRight className="size-4 shrink-0 text-muted" />}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
            <span className="text-[11px] font-semibold text-muted">Nhánh phụ & kết thúc khác:</span>
            {(["REJECTED", "FAILED", "SUSPENDED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedProjectState(st)}
                className={cn(
                  "rounded-xl border px-2.5 py-1.5 transition",
                  selectedProjectState === st
                    ? "border-violet-500 bg-violet-500/12 ring-2 ring-violet-500/40"
                    : "border-line bg-surface hover:border-violet-400/50",
                )}
              >
                <ProjectStatusBadge status={st} />
              </button>
            ))}
          </div>
        </div>

        {/* Chi tiết chuyển tiếp vào / ra của trạng thái được chọn */}
        <div className="grid gap-4 md:grid-cols-2">
          <TransitionPanel
            title="Đi vào từ trạng thái"
            empty="Trạng thái khởi tạo (* -> DRAFT)"
            selected={selectedProjectState}
            rows={projIn}
            kind="project"
            mode="in"
            onPick={setSelectedProjectState}
          />
          <TransitionPanel
            title="Chuyển tiếp sang trạng thái"
            empty="Trạng thái kết thúc (terminal state)"
            selected={selectedProjectState}
            rows={projOut}
            kind="project"
            mode="out"
            onPick={setSelectedProjectState}
          />
        </div>

        {/* Lưới nhanh toàn bộ 11 trạng thái */}
        <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
          {PROJECT_STATES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedProjectState(st)}
              className={cn(
                "rounded-lg px-2 py-1 font-mono text-[11px] transition",
                selectedProjectState === st
                  ? "bg-brand-gradient font-bold text-white"
                  : "bg-surface-2 text-muted hover:text-fg",
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Máy trạng thái Pledge */}
      <div className="card space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold">2. Vòng đời Khoản góp vốn All-or-Nothing (pledges.status — 6 trạng thái)</h3>
            <p className="text-xs text-muted">
              Cưỡng chế bởi Trigger <code className="font-mono">trg_pledges_status_flow</code>,{" "}
              <code className="font-mono">trg_pledges_amount_immutable</code> và{" "}
              <code className="font-mono">trg_pledges_after_release</code>.
            </p>
          </div>
          <Badge tone="emerald">trg_pledges_status_flow</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-2/50 p-4">
          {PLEDGE_STATES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedPledgeState(st)}
              className={cn(
                "rounded-xl border px-3 py-2 transition",
                selectedPledgeState === st
                  ? "border-emerald-500 bg-emerald-500/12 ring-2 ring-emerald-500/40"
                  : "border-line bg-surface hover:border-emerald-400/50",
              )}
            >
              <PledgeStatusBadge status={st} />
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TransitionPanel
            title="Đi vào từ trạng thái"
            empty="Trạng thái khởi tạo (* -> AUTHORIZED)"
            selected={selectedPledgeState}
            rows={pledgeIn}
            kind="pledge"
            mode="in"
            onPick={setSelectedPledgeState}
          />
          <TransitionPanel
            title="Chuyển tiếp sang trạng thái"
            empty="Trạng thái kết thúc (terminal state)"
            selected={selectedPledgeState}
            rows={pledgeOut}
            kind="pledge"
            mode="out"
            onPick={setSelectedPledgeState}
          />
        </div>
      </div>

      {/* 3. Hai vòng đời phụ gọn: Shipment & Invitation */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Package className="size-4 text-violet-500" /> Giao quà (shipments.status)
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="amber">PREPARING</Badge>
            <ArrowRight className="size-3.5 text-muted" />
            <Badge tone="sky">SHIPPED</Badge>
            <ArrowRight className="size-3.5 text-muted" />
            <Badge tone="emerald">DELIVERED</Badge>
          </div>
          <p className="mt-2.5 text-xs text-muted">
            Trigger <code className="font-mono">trg_shipments_guard</code> chỉ cho tạo vận đơn với pledge{" "}
            <code className="font-mono">CAPTURED</code> có gói quà vật lý (<code className="font-mono">ships_physical = 1</code>).
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <UserPlus className="size-4 text-sky-500" /> Lời mời Collaborator (project_invitations.status)
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="amber">PENDING</Badge>
            <ArrowRight className="size-3.5 text-muted" />
            <Badge tone="emerald">ACCEPTED</Badge>
            <Badge tone="rose">DECLINED</Badge>
            <Badge tone="neutral">REVOKED</Badge>
            <Badge tone="slate">EXPIRED</Badge>
          </div>
          <p className="mt-2.5 text-xs text-muted">
            Partial unique index <code className="font-mono">uq_invitation_pending</code> chặn gửi trùng lời mời đang chờ cho cùng email trên 1 dự án.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-xs text-muted">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <span>
          Mọi chuyển tiếp trạng thái không nằm trong danh sách trên đều bị CSDL từ chối trực tiếp với thông báo lỗi rõ ràng và được dịch thân thiện qua{" "}
          <code className="font-mono">humanizeError()</code>.
        </span>
      </div>
    </div>
  );
}

function TransitionPanel({
  title,
  empty,
  rows,
  kind,
  mode,
  onPick,
}: {
  title: string;
  empty: string;
  selected: string;
  rows: TransitionRule[];
  kind: "project" | "pledge";
  mode: "in" | "out";
  onPick: (st: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
      <div className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">{title}</div>
      {rows.length === 0 ? (
        <div className="rounded-lg bg-surface p-3 text-xs text-muted">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const targetState = mode === "in" ? r.from : r.to;
            return (
              <li key={`${r.from}-${r.to}`} className="rounded-lg bg-surface p-2.5 text-xs ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => onPick(targetState)} className="inline-flex items-center gap-1.5 hover:opacity-80">
                    {kind === "project" ? <ProjectStatusBadge status={r.from} /> : <PledgeStatusBadge status={r.from} />}
                    <ArrowRight className="size-3.5 text-muted" />
                    {kind === "project" ? <ProjectStatusBadge status={r.to} /> : <PledgeStatusBadge status={r.to} />}
                  </button>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{r.actor}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted">{r.trigger}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
