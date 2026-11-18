import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action, image = "/v3/brand/empty.webp", compact }: { title: string; description?: ReactNode; action?: ReactNode; image?: string; compact?: boolean }) {
  return (
    <div className={cn("card flex flex-col items-center text-center", compact ? "gap-2 p-6" : "gap-3 p-10")}>
      <Image src={image} alt="" width={compact ? 96 : 150} height={compact ? 96 : 150} className="animate-float rounded-3xl" />
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, tone = "violet", className }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "violet" | "emerald" | "amber" | "sky" | "rose"; className?: string }) {
  const tones = {
    violet: "from-violet-500/15 text-violet-600 dark:text-violet-300",
    emerald: "from-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    amber: "from-amber-500/15 text-amber-600 dark:text-amber-300",
    sky: "from-sky-500/15 text-sky-600 dark:text-sky-300",
    rose: "from-rose-500/15 text-rose-600 dark:text-rose-300",
  };
  return (
    <div className={cn("card relative overflow-hidden p-4 sm:p-5", className)}>
      <div className={cn("pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br to-transparent blur-xl", tones[tone])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted">{label}</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
        </div>
        {icon && <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br to-transparent", tones[tone])}>{icon}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
