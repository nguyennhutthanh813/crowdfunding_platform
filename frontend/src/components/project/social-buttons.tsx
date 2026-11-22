"use client";

import { useOptimistic, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Bookmark, Heart, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { toggleFollowAction, toggleSaveAction } from "@/server/actions/social";
import { burstAt } from "@/components/fx/confetti";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";

export function SaveButton({ projectId, saved, variant = "icon", className }: { projectId: string; saved: boolean; variant?: "icon" | "full"; className?: string }) {
  const [opt, setOpt] = useOptimistic(saved);
  const [, start] = useTransition();
  const router = useRouter();
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;
    start(async () => {
      setOpt(!opt);
      const r = await toggleSaveAction(projectId);
      if (!r.ok) {
        toast.error(r.error);
        if (r.needLogin) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      if (r.on) { burstAt(clientX, clientY); toast.success("Đã lưu dự án — xem lại trong mục Của tôi"); }
      router.refresh();
    });
  };
  if (variant === "full")
    return (
      <button onClick={onClick} className={buttonClass(opt ? "secondary" : "outline", "md", className)} aria-pressed={opt}>
        <Bookmark className={cn("size-4", opt && "fill-violet-500 text-violet-500")} /> {opt ? "Đã lưu" : "Lưu dự án"}
      </button>
    );
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={onClick}
      aria-pressed={opt}
      aria-label={opt ? "Bỏ lưu" : "Lưu dự án"}
      className={cn("glass grid size-9 place-items-center rounded-full shadow-md ring-1 ring-white/30 transition hover:scale-110", className)}
    >
      <Heart className={cn("size-[18px] transition", opt ? "fill-rose-500 text-rose-500" : "text-fg")} />
    </motion.button>
  );
}

export function FollowButton({ userId, following, size = "sm", className }: { userId: string; following: boolean; size?: "sm" | "md"; className?: string }) {
  const [opt, setOpt] = useOptimistic(following);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <button
      onClick={(e) => {
        const { clientX, clientY } = e;
        start(async () => {
          setOpt(!opt);
          const r = await toggleFollowAction(userId);
          if (!r.ok) {
            toast.error(r.error);
            if (r.needLogin) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
            return;
          }
          if (r.on) { burstAt(clientX, clientY, "#7C5CFF"); toast.success("Đã theo dõi — bạn sẽ nhận thông báo khi chủ dự án ra dự án mới"); }
          router.refresh();
        });
      }}
      className={buttonClass(opt ? "secondary" : "primary", size, className)}
      aria-pressed={opt}
    >
      {opt ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      {opt ? "Đang theo dõi" : "Theo dõi"}
    </button>
  );
}
