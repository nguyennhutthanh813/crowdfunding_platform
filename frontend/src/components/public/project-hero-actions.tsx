"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Flag, Play, Share2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { recordProjectViewAction } from "@/server/actions/public";
import { reportAction } from "@/server/actions/social";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form";
import { SmartImage, VideoFrame } from "./smart-image";
import { cn } from "@/lib/utils";

/** Ghi nhận 1 lượt xem mỗi 12 giờ cho dự án khi mở /p/[slug]. */
export function ViewTracker({ projectId }: { projectId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordProjectViewAction(projectId);
  }, [projectId]);
  return null;
}

/** Nút sao chép liên kết chia sẻ dự án. */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (navigator.share) {
        await navigator.share({ title, url });
      }
      setCopied(true);
      toast.success("Đã sao chép liên kết dự án!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép liên kết lúc này.");
    }
  };

  return (
    <Button type="button" variant="outline" size="md" onClick={handleCopy} className={className}>
      {copied ? <Check className="size-4 text-emerald-500" /> : <Share2 className="size-4" />}
      {copied ? "Đã chép" : "Chia sẻ"}
    </Button>
  );
}

const REPORT_REASONS = [
  { value: "MISLEADING", label: "Thông tin sai lệch / không trung thực" },
  { value: "SCAM", label: "Dấu hiệu lừa đảo" },
  { value: "PROHIBITED", label: "Nội dung bị cấm / vi phạm bản quyền" },
  { value: "SPAM", label: "Spam / quảng cáo" },
  { value: "HARASSMENT", label: "Quấy rối / ngôn từ xúc phạm" },
  { value: "OTHER", label: "Lý do khác" },
] as const;

/** Hộp thoại báo cáo vi phạm (dự án, bình luận hoặc người dùng). */
export function ReportDialog({
  targetType,
  projectId,
  commentId,
  userId,
  targetLabel,
  canReport,
  isGuest,
  compact,
  className,
}: {
  targetType: "PROJECT" | "COMMENT" | "USER";
  projectId?: string;
  commentId?: string;
  userId?: string;
  targetLabel?: string;
  canReport: boolean;
  isGuest: boolean;
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(targetType === "COMMENT" ? "SPAM" : "MISLEADING");
  const [detail, setDetail] = useState("");
  const [pending, startTransition] = useTransition();

  if (!isGuest && !canReport) return null;

  const onTriggerClick = () => {
    if (isGuest) {
      toast.error("Vui lòng đăng nhập để gửi báo cáo.");
      router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setOpen(true);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await reportAction({
        targetType,
        projectId,
        commentId,
        userId,
        reason,
        detail: detail.trim(),
      });
      if (!res.ok) {
        toast.error(res.error ?? "Không thể gửi báo cáo.");
        return;
      }
      toast.success(res.message ?? "Đã gửi báo cáo tới Quản trị viên.");
      setDetail("");
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={onTriggerClick}
        title="Báo cáo vi phạm"
        className={
          compact
            ? cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400",
                className,
              )
            : buttonClass("ghost", "sm", cn("text-muted hover:text-rose-600 dark:hover:text-rose-400", className))
        }
      >
        <Flag className="size-3.5" />
        <span>{compact ? "Báo cáo" : "Báo cáo vi phạm"}</span>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Báo cáo vi phạm"
        description={
          targetLabel
            ? `Gửi phản ánh về ${targetLabel} tới Quản trị viên xem xét.`
            : "Quản trị viên sẽ xem xét báo cáo của bạn và xử lý theo quy định nền tảng."
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Lý do báo cáo" required>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mô tả chi tiết" hint="Cung cấp thêm ngữ cảnh hoặc dẫn chứng giúp Quản trị viên xử lý nhanh hơn.">
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={1000}
              placeholder="Nhập chi tiết vấn đề bạn phát hiện…"
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? "Đang gửi…" : "Gửi báo cáo"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** Khung ảnh bìa hero kèm nút mở video giới thiệu (nếu có videoUrl). */
export function HeroMedia({
  coverUrl,
  videoUrl,
  title,
  categoryName,
  categoryColor,
}: {
  coverUrl: string | null;
  videoUrl: string | null;
  title: string;
  categoryName: string;
  categoryColor: string;
}) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <>
      <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-[1.5rem] border border-line bg-surface-2 shadow-soft">
        {coverUrl ? (
          <SmartImage
            src={coverUrl}
            alt={title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-muted">Chưa có ảnh bìa</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
            style={{ background: categoryColor }}
          >
            {categoryName}
          </span>
        </div>

        {videoUrl && (
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="glass absolute bottom-4 left-4 inline-flex items-center gap-2.5 rounded-full border border-white/25 px-4 py-2 text-sm font-bold text-fg shadow-lg transition hover:scale-105"
          >
            <span className="grid size-8 place-items-center rounded-full bg-brand-gradient text-white shadow">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
            <span>Xem video giới thiệu</span>
          </button>
        )}
      </div>

      {videoUrl && (
        <Dialog open={videoOpen} onClose={() => setVideoOpen(false)} title={`Video giới thiệu — ${title}`} wide>
          <VideoFrame url={videoUrl} title={title} />
        </Dialog>
      )}
    </>
  );
}

/** Thanh CTA cố định đáy mobile — chỉ xuất hiện sau khi người dùng cuộn qua khối gọi vốn chính. */
export function MobileStickyPledgeBar({
  targetId = "mobile-funding-anchor",
  amountLabel,
  metaLabel,
  href,
  ctaLabel,
}: {
  targetId?: string;
  amountLabel: string;
  metaLabel: string;
  href: string;
  ctaLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.bottom <= 72;
        setVisible(scrolledPast);
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[64px] z-40 md:hidden">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-emerald-600 dark:text-emerald-400">
            {amountLabel}
          </div>
          <div className="truncate text-[11px] text-muted">{metaLabel}</div>
        </div>
        <ButtonLink href={href} size="sm" className="shrink-0">
          <Wallet className="size-4" /> {ctaLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
