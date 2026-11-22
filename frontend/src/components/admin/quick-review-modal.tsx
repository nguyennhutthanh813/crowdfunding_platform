"use client";

import Link from "next/link";
import { useState } from "react";
import { Brain, CheckCircle2, ExternalLink, Loader2, ShieldAlert, User, Zap } from "lucide-react";
import { toast } from "sonner";
import type { AdminReviewDetail } from "@/server/queries/admin";
import { fetchAdminReviewDetailAction } from "@/server/actions/admin";
import { ReviewDecisionForm } from "./review-decision-form";
import { SafeAvatar } from "./safe-image";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { formatDate, formatVnd } from "@/lib/utils";

export function QuickReviewModalButton({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdminReviewDetail | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    const res = await fetchAdminReviewDetailAction(slug);
    setLoading(false);
    if (res.ok && res.detail) {
      setDetail(res.detail);
    } else {
      toast.error(res.error || "Không tải được hồ sơ kiểm duyệt.");
      setOpen(false);
    }
  };

  const requiredOk = detail ? detail.checklist.every((c) => !c.required || c.ok) : true;
  const aiPct = detail?.prediction ? Math.round(detail.prediction.probability * 100) : null;

  return (
    <>
      <Button type="button" variant="primary" size="sm" onClick={handleOpen}>
        <Zap className="size-4" /> Duyệt nhanh
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={`Duyệt nhanh: ${title}`}
        description={detail ? `${detail.project.category} · Mục tiêu ${formatVnd(detail.project.goal_amount)} · ${detail.project.duration_days} ngày` : undefined}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">Cần đọc toàn bộ câu chuyện &amp; lịch sử phần quà chi tiết?</span>
            <Link
              href={`/admin/reviews/${slug}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400"
            >
              Mở trang chi tiết đầy đủ <ExternalLink className="size-3.5" />
            </Link>
          </div>
        }
      >
        {loading || !detail ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="size-6 animate-spin text-violet-500" />
            <span>Đang tải checklist &amp; hồ sơ kiểm duyệt…</span>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            {/* Tóm tắt kiểm tra */}
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-line bg-surface-2/50 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ProjectStatusBadge status={detail.project.status} />
                  {aiPct !== null && (
                    <Badge tone={aiPct >= 66 ? "emerald" : aiPct >= 40 ? "amber" : "rose"}>
                      <Brain className="size-3" /> Sẵn sàng AI: {aiPct}%
                    </Badge>
                  )}
                  <Badge tone="neutral">Gửi lúc {formatDate(detail.project.submitted_at, true)}</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{detail.project.blurb}</p>
              </div>

              {/* Chủ dự án */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  <SafeAvatar name={detail.creator.display_name} src={detail.creator.avatar_url} size={36} />
                  <div className="min-w-0">
                    <div className="truncate font-bold">{detail.creator.display_name}</div>
                    <div className="truncate text-muted">
                      @{detail.creator.username} · Tham gia {detail.creator.accountAgeDays} ngày · {detail.pastProjects.length} dự án trước
                    </div>
                  </div>
                </div>
                <Badge tone={detail.creator.status === "ACTIVE" ? "emerald" : "rose"}>
                  <User className="size-3" /> {detail.creator.status === "ACTIVE" ? "Hoạt động" : "Khoá"}
                </Badge>
              </div>

              {/* Kiểm tra an toàn */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">Kiểm tra tự động</div>
                {detail.extraChecks.map((ck) => (
                  <div key={ck.key} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      {ck.ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : <ShieldAlert className="size-4 text-rose-500" />}
                      <span>{ck.label}</span>
                    </div>
                    <span className="text-muted">{ck.detail}</span>
                  </div>
                ))}
              </div>

              {/* Checklist nội dung */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  Checklist hồ sơ ({detail.checklist.filter((c) => c.ok).length}/{detail.checklist.length})
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {detail.checklist.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2/40 px-2.5 py-1.5 text-xs"
                    >
                      {item.ok ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form ra quyết định */}
            <div>
              <ReviewDecisionForm
                projectId={detail.project.id}
                status={detail.project.status}
                willSchedule={detail.willSchedule}
                desiredStart={detail.desiredStart}
                requiredOk={requiredOk}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
