"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  HandCoins,
  MailCheck,
  MessageSquare,
  Newspaper,
  Rocket,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import type { NotificationRow } from "@/server/queries/me";
import { markNotificationsReadAction } from "@/server/actions/social";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { SafeAvatar } from "./safe-media";
import { cn, formatDate, timeAgo } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; tone: "violet" | "emerald" | "amber" | "sky" | "neutral"; icon: typeof Bell }> = {
  PLEDGE_RECEIVED: { label: "Pledge mới", tone: "emerald", icon: HandCoins },
  PLEDGE_CONFIRMED: { label: "Góp vốn", tone: "emerald", icon: HandCoins },
  PROJECT_UPDATE: { label: "Bản tin", tone: "violet", icon: Newspaper },
  PROJECT_LAUNCHED: { label: "Mở bán", tone: "sky", icon: Rocket },
  PROJECT_RESULT: { label: "Kết quả", tone: "amber", icon: ShieldCheck },
  COMMENT_REPLY: { label: "Trả lời", tone: "amber", icon: MessageSquare },
  NEW_COMMENT: { label: "Bình luận", tone: "amber", icon: MessageSquare },
  MESSAGE: { label: "Tin nhắn", tone: "violet", icon: MessageSquare },
  INVITATION: { label: "Lời mời", tone: "sky", icon: MailCheck },
  REVIEW_RESULT: { label: "Kiểm duyệt", tone: "sky", icon: ShieldCheck },
  NEW_PROJECT_FROM_FOLLOWED: { label: "Theo dõi", tone: "emerald", icon: Rocket },
  SHIPMENT: { label: "Giao quà", tone: "sky", icon: Truck },
  SYSTEM: { label: "Hệ thống", tone: "neutral", icon: Bell },
};

export function MarkAllNotificationsButton({ unreadCount }: { unreadCount: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={unreadCount === 0 || pending}
      onClick={() =>
        start(async () => {
          const res = await markNotificationsReadAction();
          if (res.ok) {
            toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
            router.refresh();
          }
        })
      }
    >
      <CheckCheck className="size-4" /> Đánh dấu tất cả đã đọc
    </Button>
  );
}

export function NotificationsList({ items }: { items: NotificationRow[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const openNotification = (n: NotificationRow) => {
    start(async () => {
      if (!n.read_at) await markNotificationsReadAction([n.id]);
      if (n.link) router.push(n.link);
      else router.refresh();
    });
  };

  const markOneRead = (id: string) => {
    start(async () => {
      await markNotificationsReadAction([id]);
      router.refresh();
    });
  };

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {items.map((n) => {
        const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
        const Icon = meta.icon;
        const unread = !n.read_at;

        return (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-3 p-4 transition hover:bg-surface-2/60",
              unread && "bg-violet-500/[0.04]",
            )}
          >
            <span
              className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-violet-600" : "bg-transparent")}
              aria-hidden
            />

            {n.actor_name ? (
              <SafeAvatar name={n.actor_name} src={n.actor_avatar} size={38} className="mt-0.5" />
            ) : (
              <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-surface-2 text-violet-600 dark:text-violet-300">
                <Icon className="size-4" />
              </span>
            )}

            <button
              type="button"
              disabled={pending}
              onClick={() => openNotification(n)}
              className="min-w-0 flex-1 space-y-1 text-left"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span className="text-[11px] text-muted" title={formatDate(n.created_at, true)} suppressHydrationWarning>
                  {timeAgo(n.created_at)}
                </span>
              </div>
              <div className={cn("text-sm leading-snug", unread ? "font-bold text-fg" : "font-semibold text-fg/85")}>
                {n.title}
              </div>
              {n.body && <p className="text-xs text-muted">{n.body}</p>}
            </button>

            {unread && (
              <button
                type="button"
                disabled={pending}
                onClick={() => markOneRead(n.id)}
                title="Đánh dấu đã đọc"
                className="grid size-8 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:border-violet-400/50 hover:text-violet-600"
              >
                <Check className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </Card>
  );
}
