"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Thanh tiến độ gọi vốn: SSR hiển thị đúng %, khi vào màn hình chạy mượt từ 0, phát sáng; vượt 100% đổi màu vàng. */
export function FundingBar({ percent, className, size = "md", showLabel = false }: { percent: number; className?: string; size?: "sm" | "md" | "lg"; showLabel?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const w = Math.min(100, Math.max(0, percent));
  useEffect(() => {
    const host = ref.current;
    const bar = barRef.current;
    if (!host || !bar || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        animate(bar, { width: ["0%", `${w}%`] }, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
      },
      { rootMargin: "-40px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [w]);
  const over = percent >= 100;
  const h = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" }[size];
  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className={cn("w-full overflow-hidden rounded-full bg-zinc-500/15", h)}>
        <div
          ref={barRef}
          className={cn("relative h-full rounded-full", over ? "bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-400" : "bg-money-gradient")}
          style={{ width: `${w}%`, boxShadow: over ? "0 0 16px rgba(245,158,11,0.6)" : "0 0 12px rgba(16,185,129,0.45)" }}
        >
          <div className="shimmer absolute inset-0 rounded-full opacity-60" />
        </div>
      </div>
      {showLabel && <div className="mt-1 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">{percent}%</div>}
    </div>
  );
}
