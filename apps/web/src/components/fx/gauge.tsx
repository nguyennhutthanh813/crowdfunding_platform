"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Đồng hồ đo % khả năng thành công (AI) — SSR hiển thị đủ số & cung tròn, khi vào màn hình chạy mượt. */
export function Gauge({ value, size = 180, label = "khả năng thành công", className }: { value: number; size?: number; label?: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const pct = Math.max(0, Math.min(100, value));
  const r = size / 2 - 14;
  const c = Math.PI * r; // nửa vòng
  const targetOffset = c * (1 - pct / 100);
  const color = pct >= 66 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#F43F5E";

  useEffect(() => {
    const host = hostRef.current;
    const path = pathRef.current;
    if (!host || !path || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        animate(path, { strokeDashoffset: [c, targetOffset] }, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
      },
      { rootMargin: "-20px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [c, targetOffset]);

  return (
    <div ref={hostRef} className={cn("relative inline-flex flex-col items-center", className)} style={{ width: size }}>
      <svg width={size} height={size / 2 + 14} viewBox={`0 0 ${size} ${size / 2 + 14}`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <path d={`M14 ${size / 2} A ${r} ${r} 0 0 1 ${size - 14} ${size / 2}`} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={14} strokeLinecap="round" />
        <path
          ref={pathRef}
          d={`M14 ${size / 2} A ${r} ${r} 0 0 1 ${size - 14} ${size / 2}`}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={targetOffset}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-4xl font-black tabular-nums" style={{ color }}>
          {Math.round(pct)}%
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
      </div>
    </div>
  );
}
