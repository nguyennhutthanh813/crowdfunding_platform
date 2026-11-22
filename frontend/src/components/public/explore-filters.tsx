"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { motion } from "motion/react";
import { ArrowUpDown, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface ExploreCategoryItem {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  color: string;
  live_count: number;
  total_count: number;
}

const STATUS_OPTIONS = [
  { key: "ALL", label: "Tất cả" },
  { key: "LIVE", label: "Đang gọi vốn" },
  { key: "SCHEDULED", label: "Sắp mở" },
  { key: "ENDED", label: "Đã kết thúc" },
] as const;

const SORT_OPTIONS = [
  { key: "trending", label: "Thịnh hành 7 ngày" },
  { key: "newest", label: "Mới nhất" },
  { key: "ending", label: "Sắp kết thúc" },
  { key: "funded", label: "% đạt mục tiêu cao" },
  { key: "backers", label: "Nhiều người góp nhất" },
] as const;

export function ExploreFilters({
  categories,
  q,
  category,
  status,
  sort,
  total,
}: {
  categories: ExploreCategoryItem[];
  q: string;
  category: string;
  status: string;
  sort: string;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [queryText, setQueryText] = useState(q);

  const navigate = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || (v === "ALL" && k === "status") || (v === "trending" && k === "sort")) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ q: queryText.trim() || null });
  };

  const hasFilter = Boolean(q || category || status !== "ALL" || sort !== "trending");

  return (
    <div className={cn("space-y-4 transition-opacity", pending && "opacity-75")}>
      {/* Hàng tìm kiếm + trạng thái + sắp xếp */}
      <div className="card space-y-3 p-3.5 sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={onSearchSubmit} className="relative flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Tìm tên dự án, ý tưởng hoặc chủ dự án…"
                aria-label="Tìm kiếm dự án"
                className="pl-10 pr-9"
              />
              {queryText && (
                <button
                  type="button"
                  onClick={() => {
                    setQueryText("");
                    if (q) navigate({ q: null });
                  }}
                  className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                  aria-label="Xoá từ khoá"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="md" variant="primary">
              Tìm
            </Button>
          </form>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2.5 sm:justify-end">
            <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2/70 p-1">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => navigate({ status: opt.key })}
                    className={cn(
                      "relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                      active ? "text-white" : "text-muted hover:text-fg",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="explore-status-pill"
                        className="absolute inset-0 rounded-lg bg-brand-gradient shadow-[0_6px_16px_-6px_rgba(109,74,255,0.75)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="hidden size-4 text-muted sm:block" />
              <Select
                aria-label="Sắp xếp dự án"
                value={sort}
                onChange={(e) => navigate({ sort: e.target.value })}
                className="h-10 w-auto min-w-[175px] py-0 text-sm"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Chip thể loại 3D */}
        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 pt-1 sm:flex-wrap">
          <button
            type="button"
            onClick={() => navigate({ category: null })}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-bold transition sm:text-sm",
              !category
                ? "border-violet-500/50 bg-violet-500/12 text-violet-700 shadow-sm dark:text-violet-300"
                : "border-line bg-surface hover:border-violet-400/40 hover:bg-surface-2",
            )}
          >
            <span className="grid size-7 place-items-center rounded-xl bg-brand-gradient text-white">
              <Sparkles className="size-3.5" />
            </span>
            <span>Tất cả thể loại</span>
          </button>

          {categories.map((c) => {
            const active = category === c.slug;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate({ category: active ? null : c.slug })}
                className={cn(
                  "group inline-flex shrink-0 items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm",
                  active
                    ? "border-violet-500/60 bg-violet-500/10 text-fg shadow-sm ring-1 ring-violet-500/25"
                    : "border-line bg-surface text-muted hover:border-violet-400/40 hover:bg-surface-2 hover:text-fg",
                )}
                style={active ? { borderColor: c.color } : undefined}
              >
                <span
                  className="relative size-7 shrink-0 overflow-hidden rounded-xl"
                  style={{ background: `${c.color}18` }}
                >
                  {c.image_url && (
                    <Image
                      src={c.image_url}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  )}
                </span>
                <span className="font-bold text-fg">{c.name}</span>
                <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-muted">
                  {c.total_count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tóm tắt kết quả */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <div>
          Tìm thấy <b className="text-fg tabular-nums">{total}</b> dự án
          {q ? (
            <>
              {" "}
              với từ khoá <span className="font-semibold text-fg">“{q}”</span>
            </>
          ) : null}
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setQueryText("");
              startTransition(() => router.push(pathname, { scroll: false }));
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-violet-600 transition hover:bg-violet-500/10 dark:text-violet-400"
          >
            <RotateCcw className="size-3.5" /> Xoá bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}
