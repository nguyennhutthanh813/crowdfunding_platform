"use client";

import { useState } from "react";
import { AlertTriangle, Calendar, ExternalLink, Eye, RotateCcw, ShieldBan, Users } from "lucide-react";
import { restoreProjectAction, takedownProjectAction } from "@/server/actions/admin";
import { SafeImage } from "@/components/admin/safe-image";
import { FraudRiskPanel } from "@/components/admin/fraud-risk-panel";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import { FundingBar } from "@/components/ui/funding-bar";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { formatCompactVnd, formatDate, formatVnd, percentOf } from "@/lib/utils";

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
              <Field label="Lý do tạm gỡ" required error={state?.fieldErrors?.reason} hint="Bắt buộc ít nhất 5 ký tự. Chủ dự án sẽ nhận thông báo lý do này.">
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
            Hệ thống tự chuyển về <b>Sắp mở</b> hoặc <b>Đang gọi vốn</b> nếu còn hạn ({formatDate(endAt, true)}). Nếu chiến dịch đã hết hạn trong thời gian bị gỡ, hệ thống sẽ chốt <b>Không đạt</b> và giải phóng toàn bộ tiền giữ chỗ.
          </div>
          <Field label="Ghi chú khôi phục (tuỳ chọn)">
            <Textarea name="note" placeholder="Ví dụ: Chủ dự án đã bổ sung chứng từ bản quyền hợp lệ." className="min-h-20" />
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

export interface AdminProjectInspectSummary {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  category: string;
  color: string;
  creator: string;
  creator_username: string;
  status: string;
  pledged_amount: number;
  goal_amount: number;
  backers_count: number;
  open_reports: number;
  end_at: string | null;
}

export function QuickProjectInspectButton({
  project: p,
  compact = false,
}: {
  project: AdminProjectInspectSummary;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = percentOf(p.pledged_amount, p.goal_amount);
  const detailHref = p.status === "PENDING_REVIEW" ? `/admin/reviews/${p.slug}` : `/p/${p.slug}`;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setOpen(true)}
        title="Xem nhanh"
        aria-label="Xem nhanh"
      >
        <Eye className="size-3.5" />
        {compact ? <span className="hidden 2xl:inline">Xem nhanh</span> : "Xem nhanh"}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={p.title}
        description={`${p.category} · Chủ dự án: ${p.creator} (@${p.creator_username})`}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2 sm:w-44">
              <SafeImage src={p.cover_url} alt={p.title} fill sizes="176px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: p.color }}>
                  {p.category}
                </span>
                <ProjectStatusBadge status={p.status} />
                {p.open_reports > 0 && (
                  <Badge tone={p.open_reports >= 3 ? "rose" : "amber"}>
                    <AlertTriangle className="size-3" /> {p.open_reports} báo cáo mở
                  </Badge>
                )}
              </div>

              <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatVnd(p.pledged_amount)} ({pct}%)
                  </span>
                  <span className="text-muted">Mục tiêu {formatCompactVnd(p.goal_amount)}</span>
                </div>
                <FundingBar percent={pct} size="sm" />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" /> {p.backers_count} người ủng hộ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5" /> Đóng: {p.end_at ? formatDate(p.end_at, true) : "Chưa đặt lịch"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {open && (
            <div className="rounded-2xl border border-line p-3.5">
              <FraudRiskPanel slug={p.slug} compact />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={detailHref} variant="primary" size="sm">
                <ExternalLink className="size-3.5" /> {p.status === "PENDING_REVIEW" ? "Mở hồ sơ kiểm duyệt" : "Mở trang công khai"}
              </ButtonLink>
              {p.open_reports > 0 && (
                <ButtonLink href="/admin/reports" variant="outline" size="sm">
                  <AlertTriangle className="size-3.5" /> Xem báo cáo vi phạm
                </ButtonLink>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
