"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Rocket, Search, Sparkles, Users } from "lucide-react";
import type { StudioCard } from "@/server/queries/studio";
import { LeaveProjectButton } from "@/components/studio/studio-invitations";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { FundingBar } from "@/components/ui/funding-bar";
import { EmptyState } from "@/components/ui/layout-bits";
import { ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { TiltCard } from "@/components/fx/motion";
import { PROJECT_STATUS } from "@/lib/status";
import { cn, formatCompactVnd, formatDate, percentOf, timeLeft } from "@/lib/utils";
import { StudioImage } from "./media";

const PAGE_SIZE = 6;

const STATUS_ORDER = ["LIVE", "PENDING_REVIEW", "SCHEDULED", "DRAFT", "REJECTED", "SUCCESS", "FULFILLING", "COMPLETED", "SUSPENDED", "FAILED", "CANCELLED"];

const TONE_BOX: Record<StudioCard["next"]["tone"], string> = {
  violet: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  slate: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

export function StudioProjectsGrid({ mine, collab }: { mine: StudioCard[]; collab: StudioCard[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "CREATOR" | "COLLABORATOR">("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const orderedAll = useMemo(
    () => (mine.length === 0 && collab.length > 0 ? [...collab, ...mine] : [...mine, ...collab]),
    [mine, collab],
  );

  const rolePool = useMemo(() => {
    if (roleFilter === "CREATOR") return mine;
    if (roleFilter === "COLLABORATOR") return collab;
    return orderedAll;
  }, [orderedAll, mine, collab, roleFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of rolePool) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [rolePool]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rolePool.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.category_name.toLowerCase().includes(q) ||
        (p.blurb ?? "").toLowerCase().includes(q)
      );
    });
  }, [rolePool, statusFilter, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, pages);
  const startIdx = (curPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Thanh tìm kiếm & lọc vai trò / trạng thái */}
      <div className="card space-y-3.5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm dự án theo tên, mô tả hoặc thể loại…"
              className="pl-10"
            />
          </div>

          {mine.length > 0 && collab.length > 0 && (
            <div className="inline-flex shrink-0 rounded-xl border border-line bg-surface-2/60 p-1 text-xs font-semibold">
              {[
                { key: "ALL" as const, label: `Tất cả (${orderedAll.length})` },
                { key: "CREATOR" as const, label: `Của tôi (${mine.length})` },
                { key: "COLLABORATOR" as const, label: `Cộng tác (${collab.length})` },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setRoleFilter(opt.key);
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 transition",
                    roleFilter === opt.key ? "bg-violet-600 text-white shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setPage(1);
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition",
              statusFilter === "ALL"
                ? "border-violet-500/40 bg-violet-600 text-white shadow-sm"
                : "border-line bg-surface text-muted hover:text-fg",
            )}
          >
            <span>Tất cả</span>
            <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", statusFilter === "ALL" ? "bg-white/25" : "bg-surface-2")}>
              {rolePool.length}
            </span>
          </button>
          {STATUS_ORDER.filter((st) => (statusCounts[st] ?? 0) > 0).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "border-violet-500/40 bg-violet-600 text-white shadow-sm"
                    : "border-line bg-surface text-muted hover:text-fg",
                )}
              >
                <span>{PROJECT_STATUS[st]?.label ?? st}</span>
                <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-white/25" : "bg-surface-2")}>
                  {statusCounts[st]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          title="Không tìm thấy dự án phù hợp"
          description="Thử đổi từ khoá tìm kiếm hoặc xoá bộ lọc trạng thái hiện tại."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setRoleFilter("ALL");
                setStatusFilter("ALL");
                setPage(1);
              }}
            >
              Xoá bộ lọc
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              Hiển thị <b className="text-fg">{startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)}</b> trên{" "}
              <b className="text-fg">{filtered.length}</b> dự án
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((p) => (
              <StudioProjectCard key={p.id} card={p} />
            ))}
          </div>

          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-muted">
                Trang <b className="text-fg">{curPage}</b> / {pages}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={curPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" /> Trước
                </Button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={n === curPage ? "primary" : "outline"}
                    size="xs"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={curPage >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Sau <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {mine.length === 0 && collab.length > 0 && (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold">Muốn khởi tạo chiến dịch riêng?</div>
            <p className="text-xs text-muted">Bắt đầu dự án mới của riêng bạn bất cứ lúc nào.</p>
          </div>
          <ButtonLink href="/studio/new" size="sm" className="shrink-0">
            <Rocket className="size-4" /> Tạo dự án mới
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function StudioProjectCard({ card: p }: { card: StudioCard }) {
  const pct = percentOf(p.pledged_amount, p.goal_amount);
  const left = timeLeft(p.end_at);
  const isDraft = p.role_code === "CREATOR" && ["DRAFT", "REJECTED"].includes(p.status);

  return (
    <TiltCard max={4} className="h-full rounded-[1.25rem]">
      <div className="card flex h-full flex-col overflow-hidden">
        <div className="relative aspect-[16/10] overflow-hidden">
          <StudioImage src={p.cover_url} alt={p.title} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow" style={{ background: p.category_color }}>
              {p.category_name}
            </span>
            <RoleBadge role={p.role_code} />
          </div>
          <div className="absolute bottom-3 left-3">
            <ProjectStatusBadge status={p.status} className="bg-surface/95 shadow-sm ring-1 ring-black/10 backdrop-blur-md" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <Link href={isDraft ? `/studio/${p.slug}/setup` : `/studio/${p.slug}`} className="font-bold leading-snug hover:text-violet-600 dark:hover:text-violet-400">
              <h3 className="line-clamp-2">{p.title}</h3>
            </Link>
            <p className="mt-1 line-clamp-1 text-xs text-muted">{p.blurb || "Chưa có mô tả ngắn"}</p>
          </div>

          <div className="space-y-1.5">
            <FundingBar percent={pct} size="sm" />
            <div className="flex items-center justify-between text-xs">
              <span>
                <b className="text-emerald-600 dark:text-emerald-400">{formatCompactVnd(p.pledged_amount)}</b>{" "}
                <span className="text-muted">/ {formatCompactVnd(p.goal_amount)} ({pct}%)</span>
              </span>
              <span className="flex items-center gap-2 text-muted">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {p.backers_count}
                </span>
                {p.status === "LIVE" && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {left.label.replace("Còn ", "")}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Gợi ý bước tiếp theo */}
          <Link
            href={p.next.href}
            className={cn(
              "mt-auto block rounded-xl border p-3 transition hover:brightness-95 dark:hover:brightness-110",
              TONE_BOX[p.next.tone],
            )}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 shrink-0" /> {p.next.title}
              </span>
              <ArrowRight className="size-3.5 shrink-0" />
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] opacity-90">{p.next.detail}</p>
            {p.next.countdownTo && (
              <div className="mt-1 text-[11px] font-semibold">Mở lúc: {formatDate(p.next.countdownTo, true)}</div>
            )}
            {p.next.progress !== undefined && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                <div className="h-full rounded-full bg-current" style={{ width: `${Math.min(100, Math.max(4, p.next.progress))}%` }} />
              </div>
            )}
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {isDraft ? (
                <ButtonLink href={`/studio/${p.slug}/setup`} size="xs">
                  Tiếp tục thiết lập
                </ButtonLink>
              ) : (
                <ButtonLink href={`/studio/${p.slug}`} size="xs" variant="secondary">
                  Mở Studio
                </ButtonLink>
              )}
              {isDraft && (
                <Link href={`/studio/${p.slug}`} className="font-semibold text-muted hover:text-fg">
                  Không gian quản lý
                </Link>
              )}
              {p.role_code === "COLLABORATOR" && (
                <LeaveProjectButton projectId={p.id} projectTitle={p.title} size="xs" redirectOnLeave={false} />
              )}
            </div>
            <Link href={`/p/${p.slug}`} className="font-semibold text-muted hover:text-violet-600 dark:hover:text-violet-400">
              Xem trang →
            </Link>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
