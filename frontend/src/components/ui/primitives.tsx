import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import { cn, initials } from "@/lib/utils";
import { PLEDGE_STATUS, PROJECT_STATUS, ROLE_META, TONE_CLASSES, type Tone } from "@/lib/status";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("card", className)} {...props} />;
}

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE_CLASSES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function ProjectStatusBadge({ status, className }: { status: string; className?: string }) {
  const m = PROJECT_STATUS[status] ?? { label: status, tone: "neutral" as Tone, hint: "" };
  return (
    <span title={m.hint}>
      <Badge tone={m.tone} dot className={className}>{m.label}</Badge>
    </span>
  );
}

export function PledgeStatusBadge({ status }: { status: string }) {
  const m = PLEDGE_STATUS[status] ?? { label: status, tone: "neutral" as Tone, hint: "" };
  return (
    <span title={m.hint}>
      <Badge tone={m.tone} dot>{m.label}</Badge>
    </span>
  );
}

/** Nhãn vai trò hiển thị cạnh tên (FR11): CREATOR · COLLAB · BACKER · ADMIN */
export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const m = ROLE_META[role];
  if (!m) return null;
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-1.5 py-px text-[10px] font-bold tracking-wider text-white", className)}
      style={{ background: m.color }}
    >
      {m.short}
    </span>
  );
}

const AVATAR_COLORS = ["#7C3AED", "#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#F43F5E", "#14B8A6"];
export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const color = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-surface", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
      aria-hidden
    >
      {src ? (
        src.startsWith("/") ? (
          <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-xl bg-surface-2", className)}><div className="shimmer absolute inset-0" /></div>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">{children}</kbd>;
}
