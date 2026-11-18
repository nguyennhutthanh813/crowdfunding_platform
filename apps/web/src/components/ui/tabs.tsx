"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
  href?: string; // nếu không có → dùng ?tab=key
}

/** Thanh tab dạng link (giữ được trạng thái khi chia sẻ URL), có vạch trượt động. */
export function LinkTabs({ items, active, param = "tab", className, id = "tabs" }: { items: TabItem[]; active: string; param?: string; className?: string; id?: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <div className={cn("no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1", className)} role="tablist">
      {items.map((t) => {
        const q = new URLSearchParams(sp.toString());
        q.set(param, t.key);
        const href = t.href ?? `${pathname}?${q.toString()}`;
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={href}
            scroll={false}
            role="tab"
            aria-selected={on}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
              on ? "text-white" : "text-muted hover:bg-violet-500/8 hover:text-fg",
            )}
          >
            {on && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-xl bg-brand-gradient shadow-[0_6px_18px_-6px_rgba(109,74,255,0.7)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", on ? "bg-white/25" : "bg-surface-2")}>{t.count}</span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
