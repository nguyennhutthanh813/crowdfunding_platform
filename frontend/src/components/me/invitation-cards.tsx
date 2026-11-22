"use client";

import Link from "next/link";
import { Check, Clock, MailCheck, X } from "lucide-react";
import type { InvitationRow } from "@/server/queries/me";
import { respondInvitationAction } from "@/server/actions/me";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { SafeAvatar, SafeImage } from "./safe-media";
import { formatDate, timeLeft } from "@/lib/utils";

export function InvitationCards({ invitations }: { invitations: InvitationRow[] }) {
  if (invitations.length === 0) return null;

  return (
    <section id="invitations" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
            <MailCheck className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight sm:text-lg">Lời mời làm cộng tác viên</h2>
            <p className="text-xs text-muted">Khi đồng ý, bạn sẽ nhận quyền hỗ trợ vận hành dự án trong Studio.</p>
          </div>
        </div>
        <Badge tone="sky" dot>{invitations.length} lời mời đang chờ</Badge>
      </div>

      <div className="grid gap-3">
        {invitations.map((inv) => {
          const left = timeLeft(inv.expires_at);
          return (
            <Card key={inv.id} className="relative overflow-hidden border-sky-500/30 bg-gradient-to-br from-sky-500/5 via-surface to-violet-500/5 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href={`/p/${inv.project_slug}`}
                  className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2 sm:w-36"
                >
                  {inv.project_cover && (
                    <SafeImage src={inv.project_cover} alt={inv.project_title} fill sizes="144px" className="object-cover" />
                  )}
                </Link>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProjectStatusBadge status={inv.project_status} />
                    <RoleBadge role="COLLABORATOR" />
                    <span className="inline-flex items-center gap-1 text-xs text-muted" title={`Hết hạn: ${formatDate(inv.expires_at, true)}`}>
                      <Clock className="size-3" /> Hạn phản hồi: {left.ended ? formatDate(inv.expires_at) : left.label}
                    </span>
                  </div>

                  <Link href={`/p/${inv.project_slug}`} className="block text-base font-bold leading-snug hover:text-violet-600 dark:hover:text-violet-400">
                    {inv.project_title}
                  </Link>

                  <div className="flex items-center gap-2 text-xs text-muted">
                    <SafeAvatar name={inv.inviter_name} src={inv.inviter_avatar} size={22} />
                    <span>
                      <Link href={`/u/${inv.inviter_username}`} className="font-semibold text-fg hover:underline">
                        {inv.inviter_name}
                      </Link>{" "}
                      (@{inv.inviter_username}) mời bạn cộng tác
                    </span>
                  </div>

                  {inv.message && (
                    <p className="rounded-xl border border-line bg-surface/80 px-3 py-2 text-xs italic text-fg/90">
                      “{inv.message}”
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <ActionForm action={respondInvitationAction}>
                    <input type="hidden" name="id" value={inv.id} />
                    <input type="hidden" name="decision" value="ACCEPT" />
                    <SubmitButton variant="success" size="sm" className="w-full" pendingText="Đang nhận…">
                      <Check className="size-4" /> Nhận lời mời
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm
                    action={respondInvitationAction}
                    confirm={`Bạn chắc chắn muốn từ chối lời mời cộng tác trên "${inv.project_title}"?`}
                  >
                    <input type="hidden" name="id" value={inv.id} />
                    <input type="hidden" name="decision" value="DECLINE" />
                    <SubmitButton variant="outline" size="sm" className="w-full" pendingText="Đang xử lý…">
                      <X className="size-4" /> Từ chối
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
