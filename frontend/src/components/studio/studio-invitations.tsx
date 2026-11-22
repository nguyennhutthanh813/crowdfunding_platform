"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Clock, HelpCircle, Loader2, LogOut, MailCheck, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import type { StudioInvitationItem } from "@/server/queries/studio";
import { respondInvitationAction } from "@/server/actions/me";
import { leaveProjectAction } from "@/server/actions/studio";
import { SafeAvatar, SafeImage } from "@/components/me/safe-media";
import { celebrate } from "@/components/fx/confetti";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { formatDate, timeLeft } from "@/lib/utils";

export function CollaboratorRoleInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="xs" onClick={() => setOpen(true)}>
        <HelpCircle className="size-3.5" /> Quyền Cộng tác viên là gì?
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Vai trò Cộng tác viên trong Studio"
        description="Cộng tác viên đồng hành cùng Chủ dự án vận hành nội dung cộng đồng mỗi ngày."
      >
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-4" /> Việc bạn được phép làm
            </div>
            <ul className="space-y-1.5 text-muted">
              <li>• Xem dự án trước khi công khai (bản nháp, chờ duyệt).</li>
              <li>• Soạn &amp; sắp xếp câu hỏi thường gặp (Hỏi đáp).</li>
              <li>• Viết bản nháp bản tin cập nhật gửi Chủ dự án duyệt đăng.</li>
              <li>• Trả lời, kiểm duyệt &amp; lọc bình luận cộng đồng với nhãn Cộng tác viên.</li>
              <li>• Xem thống kê lượt xem, dòng tiền chung và kết quả phân tích AI.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 space-y-2">
            <div className="font-bold text-fg">Giới hạn bảo vệ cho Chủ dự án</div>
            <ul className="space-y-1.5 text-muted">
              <li>• Không sửa mục tiêu, thời lượng gọi vốn hay phần quà tặng.</li>
              <li>• Không công khai bản tin hoặc gửi duyệt / huỷ dự án.</li>
              <li>• Không xem danh sách địa chỉ, SĐT của người ủng hộ.</li>
              <li>• Không mời hoặc gỡ các Cộng tác viên khác.</li>
            </ul>
            <p className="pt-1 text-[11px] text-muted">
              Bạn có thể chủ động rời khỏi dự án bất cứ lúc nào bằng nút <b>Rời dự án</b>.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function InvitationDecisionActions({ inv }: { inv: StudioInvitationItem }) {
  const router = useRouter();
  const [pendingDecision, setPendingDecision] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitDecision = (decision: "ACCEPT" | "DECLINE") => {
    if (decision === "DECLINE" && !window.confirm(`Từ chối lời mời cộng tác trên "${inv.title}"?`)) {
      return;
    }
    setPendingDecision(decision);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", inv.id);
      fd.set("decision", decision);
      const res = await respondInvitationAction(null, fd);
      setPendingDecision(null);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      if (res?.ok) {
        if (res.message) toast.success(res.message);
        if (res.celebrate) celebrate();
        if (res.redirect) router.push(res.redirect);
        else router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-2.5">
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={isPending}
        onClick={() => submitDecision("DECLINE")}
      >
        {isPending && pendingDecision === "DECLINE" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" />
        )}{" "}
        Từ chối
      </Button>
      <Button
        type="button"
        variant="success"
        size="xs"
        disabled={isPending}
        onClick={() => submitDecision("ACCEPT")}
      >
        {isPending && pendingDecision === "ACCEPT" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}{" "}
        Chấp nhận &amp; vào Studio
      </Button>
    </div>
  );
}

export function StudioInvitationsPanel({ invitations }: { invitations: StudioInvitationItem[] }) {
  if (invitations.length === 0) return null;

  return (
    <section className="card space-y-3 border-sky-500/30 bg-gradient-to-br from-sky-500/8 via-surface to-violet-500/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow">
            <MailCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold sm:text-base">Lời mời làm Cộng tác viên đang chờ ({invitations.length})</h2>
            <p className="text-xs text-muted">Nhận lời để mở ngay không gian Studio dự án — không cần rời trang.</p>
          </div>
        </div>
        <CollaboratorRoleInfoButton />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {invitations.map((inv) => {
          const left = timeLeft(inv.expires_at);
          return (
            <div
              key={inv.id}
              className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-3.5 shadow-sm"
            >
              <div className="flex min-w-0 gap-3">
                <Link
                  href={`/p/${inv.slug}`}
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2"
                >
                  {inv.project_cover && (
                    <SafeImage src={inv.project_cover} alt={inv.title} fill sizes="96px" className="object-cover" />
                  )}
                </Link>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ProjectStatusBadge status={inv.project_status} />
                    <RoleBadge role="COLLABORATOR" />
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted" title={formatDate(inv.expires_at, true)}>
                      <Clock className="size-3" /> {left.ended ? "Sắp hết hạn" : left.label}
                    </span>
                  </div>
                  <Link href={`/p/${inv.slug}`} className="line-clamp-1 block text-sm font-bold hover:text-violet-600">
                    {inv.title}
                  </Link>
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                    <SafeAvatar name={inv.inviter} src={inv.inviter_avatar} size={18} />
                    <span className="truncate">
                      <b className="text-fg">{inv.inviter}</b> (@{inv.inviter_username}) mời bạn
                    </span>
                  </div>
                </div>
              </div>

              {inv.message && (
                <p className="break-words rounded-xl bg-surface-2/70 px-3 py-1.5 text-xs italic text-muted">“{inv.message}”</p>
              )}

              <InvitationDecisionActions inv={inv} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function LeaveProjectButton({
  projectId,
  projectTitle,
  size = "xs",
  redirectOnLeave = true,
}: {
  projectId: string;
  projectTitle: string;
  size?: "xs" | "sm";
  redirectOnLeave?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirmLeave = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", projectId);
      const res = await leaveProjectAction(null, fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      if (res?.ok) {
        if (res.message) toast.success(res.message);
        setOpen(false);
        if (redirectOnLeave && res.redirect) {
          router.push(res.redirect);
        } else {
          router.refresh();
        }
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        className="text-rose-600 hover:border-rose-400/60 hover:bg-rose-500/10 dark:text-rose-400"
      >
        <LogOut className="size-3.5" /> Rời dự án
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Rời vai trò Cộng tác viên"
        description={`Bạn xác nhận ngừng làm Cộng tác viên cho dự án “${projectTitle}”?`}
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
            Sau khi rời, bạn sẽ không còn quyền truy cập Studio của dự án này (Chủ dự án sẽ nhận được thông báo và vẫn giữ các đóng góp đã tạo).
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="sky">Thành viên: Cộng tác viên</Badge>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
                Huỷ
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmLeave}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
                {isPending ? "Đang rời…" : "Xác nhận rời dự án"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
