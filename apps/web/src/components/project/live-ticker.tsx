"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { flagOf, formatCompactVnd, timeAgo } from "@/lib/utils";

/** Dải chạy "vừa có người góp vốn" — tạo cảm giác nền tảng đang sống. */
export function LiveTicker({ items }: { items: { id: string; backer: string; title: string; slug: string; amount: number; created_at: string; country: string }[] }) {
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-line bg-surface/60 py-3 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="animate-marquee flex w-max gap-8 hover:[animation-play-state:paused]">
        {loop.map((it, i) => (
          <Link key={`${it.id}-${i}`} href={`/p/${it.slug}`} className="flex shrink-0 items-center gap-2 text-sm">
            <span className="relative flex size-2"><span className="animate-pulse-ring absolute inline-flex size-2 rounded-full bg-emerald-500" /></span>
            <span>{flagOf(it.country)}</span>
            <span className="font-semibold">{it.backer}</span>
            <span className="text-muted">vừa góp</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCompactVnd(it.amount)}</span>
            <span className="text-muted">cho</span>
            <span className="max-w-56 truncate font-medium">{it.title}</span>
            <span className="text-xs text-muted">· {timeAgo(it.created_at)}</span>
            <Sparkles className="size-3.5 text-amber-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
