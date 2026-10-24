"use client";

import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CampaignCard } from "@/components/campaign/campaign-card";
import type { CampaignCardData } from "@/lib/api";
import { fundingPercent } from "@/lib/format";

const views = [
  "Tất cả",
  "Đang gọi vốn",
  "Thành công",
  "Sắp ra mắt",
  "Gần đạt mục tiêu",
  "Thịnh hành",
] as const;
type DiscoverView = (typeof views)[number];

const sortOptions = [
  { id: "recommended", label: "Phù hợp nhất" },
  { id: "newest", label: "Mới nhất" },
  { id: "backers", label: "Nhiều người ủng hộ nhất" },
  { id: "progress", label: "Tiến độ cao nhất" },
  { id: "ending", label: "Sắp kết thúc" },
  { id: "goal-desc", label: "Mục tiêu: Cao → Thấp" },
  { id: "goal-asc", label: "Mục tiêu: Thấp → Cao" },
] as const;
type DiscoverSort = (typeof sortOptions)[number]["id"];

const viewQueryValues: Record<DiscoverView, string> = {
  "Tất cả": "",
  "Đang gọi vốn": "live",
  "Thành công": "successful",
  "Sắp ra mắt": "pre-launch",
  "Gần đạt mục tiêu": "near-goal",
  "Thịnh hành": "trending",
};

function readInitialView(status?: string, view?: string): DiscoverView {
  if (status === "LIVE") return "Đang gọi vốn";
  if (status === "SUCCESSFUL") return "Thành công";
  if (status === "PRE_LAUNCH") return "Sắp ra mắt";
  if (view) {
    const entry = Object.entries(viewQueryValues).find(([, val]) => val === view);
    if (entry) return entry[0] as DiscoverView;
  }
  return "Tất cả";
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function DiscoverGrid({
  campaigns,
  initialQuery,
  initialCategory,
  initialStatus,
  initialView,
  initialSort,
}: {
  campaigns: CampaignCardData[];
  initialQuery: string;
  initialCategory: string;
  initialStatus?: string;
  initialView?: string;
  initialSort?: string;
}) {
  const categories = [
    "Tất cả",
    ...Array.from(new Set(campaigns.map((item) => item.category))),
  ];
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(
    categories.includes(initialCategory) ? initialCategory : "Tất cả",
  );
  const [view, setView] = useState<DiscoverView>(() =>
    readInitialView(initialStatus, initialView),
  );
  const [sort, setSort] = useState<DiscoverSort>(() =>
    sortOptions.some((item) => item.id === initialSort)
      ? (initialSort as DiscoverSort)
      : "recommended",
  );

  // Pagination states (DISC-06)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const gridTopRef = useRef<HTMLDivElement>(null);

  // Synchronize URL search params
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");

      if (category !== "Tất cả") params.set("category", category);
      else params.delete("category");

      if (view === "Đang gọi vốn") params.set("status", "LIVE");
      else if (view === "Thành công") params.set("status", "SUCCESSFUL");
      else if (view === "Sắp ra mắt") params.set("status", "PRE_LAUNCH");
      else params.delete("status");

      const viewValue = viewQueryValues[view];
      if (viewValue && !["live", "successful", "pre-launch"].includes(viewValue)) {
        params.set("view", viewValue);
      } else {
        params.delete("view");
      }

      if (sort !== "recommended") params.set("sort", sort);
      else params.delete("sort");

      const queryString = params.toString();
      window.history.replaceState(
        null,
        "",
        queryString ? `/discover?${queryString}` : "/discover",
      );
    }, 180);

    return () => window.clearTimeout(timer);
  }, [category, query, sort, view]);

  // Reset page when filter inputs change
  useEffect(() => {
    setPage(1);
  }, [query, category, view, sort, pageSize]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    const matches = campaigns.filter((campaign) => {
      const matchesQuery =
        !normalizedQuery ||
        normalize(
          `${campaign.title} ${campaign.blurb} ${campaign.tags.join(" ")}`,
        ).includes(normalizedQuery);

      const matchesCategory =
        category === "Tất cả" || campaign.category === category;

      const percent = fundingPercent(
        campaign.pledgedAmount,
        campaign.goalAmount,
      );

      const matchesView =
        view === "Tất cả" ||
        (view === "Đang gọi vốn" && campaign.status === "LIVE") ||
        (view === "Thành công" && campaign.status === "SUCCESSFUL") ||
        (view === "Sắp ra mắt" && campaign.status === "PRE_LAUNCH") ||
        (view === "Gần đạt mục tiêu" && percent >= 75 && percent < 100) ||
        (view === "Thịnh hành" && (campaign.predictionScore ?? 0) >= 80);

      return matchesQuery && matchesCategory && matchesView;
    });

    const sorted = [...matches];
    if (sort === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime(),
      );
    } else if (sort === "ending") {
      sorted.sort((a, b) => {
        if (a.status === "PRE_LAUNCH") return 1;
        if (b.status === "PRE_LAUNCH") return -1;
        return a.daysLeft - b.daysLeft;
      });
    } else if (sort === "backers") {
      sorted.sort((a, b) => b.backerCount - a.backerCount);
    } else if (sort === "progress") {
      sorted.sort(
        (a, b) =>
          fundingPercent(b.pledgedAmount, b.goalAmount) -
          fundingPercent(a.pledgedAmount, a.goalAmount),
      );
    } else if (sort === "goal-desc") {
      sorted.sort((a, b) => b.goalAmount - a.goalAmount);
    } else if (sort === "goal-asc") {
      sorted.sort((a, b) => a.goalAmount - b.goalAmount);
    }

    return sorted;
  }, [campaigns, category, query, sort, view]);

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCampaigns = filtered.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const activeFilters = [
    query.trim() ? `Từ khóa: “${query.trim()}”` : null,
    category !== "Tất cả" ? category : null,
    view !== "Tất cả" ? view : null,
    sort !== "recommended"
      ? sortOptions.find((item) => item.id === sort)?.label
      : null,
  ].filter((item): item is string => Boolean(item));

  const reset = () => {
    setQuery("");
    setCategory("Tất cả");
    setView("Tất cả");
    setSort("recommended");
    setPage(1);
  };

  return (
    <section className="page-section pt-10 sm:pt-12" ref={gridTopRef}>
      <div className="container-shell">
        <div className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_220px_240px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="project-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-field input-with-icon pr-12"
                placeholder="Tìm theo tên, mô tả hoặc từ khóa…"
                aria-label="Tìm dự án"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-xl text-ink-muted hover:bg-forest/6"
                  aria-label="Xóa từ khóa"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>
            <label className="relative">
              <span className="sr-only">Lọc theo danh mục</span>
              <select
                name="project-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="input-field min-w-52 cursor-pointer appearance-none pr-10"
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <SlidersHorizontal className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            </label>
            <label className="relative">
              <span className="sr-only">Sắp xếp dự án</span>
              <select
                name="project-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as DiscoverSort)}
                className="input-field cursor-pointer appearance-none pr-10"
              >
                {sortOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ArrowDownUp className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            </label>
          </div>

          {/* Quick status & view pills (DISC-04) */}
          <div
            className="mt-4 flex gap-1.5 overflow-x-auto border-t border-line pt-3"
            role="group"
            aria-label="Bộ lọc nhanh và trạng thái"
          >
            {views.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                aria-pressed={view === item}
                className={`min-h-10 shrink-0 cursor-pointer rounded-[9px] border px-3 py-1.5 text-xs font-bold transition-[background-color,color,border-color] duration-200 ${
                  view === item
                    ? "border-forest/15 bg-forest text-lime shadow-xs"
                    : "border-transparent bg-canvas-soft/80 text-ink-soft hover:bg-forest/8 hover:text-ink"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {activeFilters.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="text-[11px] font-semibold text-ink-muted">
                Đang áp dụng:
              </span>
              {activeFilters.map((item) => (
                <span
                  key={item}
                  className="rounded-lg bg-[#eef1e7] px-2.5 py-1 text-[11px] font-bold text-forest"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Results count & page size controls */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink-soft" role="status" aria-live="polite">
            <strong className="font-display text-xl text-ink">
              {totalItems}
            </strong>{" "}
            kết quả phù hợp
            {totalItems > 0 && (
              <span className="ml-2 text-xs text-ink-muted">
                (Hiển thị {startIndex + 1}–
                {Math.min(startIndex + pageSize, totalItems)})
              </span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <span>Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="cursor-pointer rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-ink hover:border-forest"
                aria-label="Số dự án mỗi trang"
              >
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={12}>12</option>
              </select>
            </label>
            {activeFilters.length ? (
              <button
                type="button"
                onClick={reset}
                className="button-ghost min-h-9 px-3 text-xs"
              >
                <X className="size-3.5" /> Xóa bộ lọc
              </button>
            ) : null}
          </div>
        </div>

        {/* Campaign cards grid */}
        {paginatedCampaigns.length ? (
          <>
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  showReason={view === "Thịnh hành"}
                />
              ))}
            </div>

            {/* Pagination navigation controls (DISC-06) */}
            {totalPages > 1 && (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-6"
                aria-label="Phân trang danh sách chiến dịch"
              >
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="button-secondary min-h-10 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="size-4" /> Trước
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => {
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => handlePageChange(pageNum)}
                          aria-current={isActive ? "page" : undefined}
                          className={`grid size-10 place-items-center rounded-lg text-xs font-bold transition-colors ${
                            isActive
                              ? "bg-forest text-lime shadow-xs"
                              : "border border-line bg-white text-ink-soft hover:bg-forest/5 hover:text-ink"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    },
                  )}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="button-secondary min-h-10 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Trang sau"
                >
                  Tiếp <ChevronRight className="size-4" />
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="mt-6 rounded-[18px] border border-dashed border-forest/20 bg-white/55 py-20 text-center">
            <Search className="mx-auto size-9 text-ink-muted" />
            <h2 className="mt-4 font-display text-xl font-extrabold">
              Chưa có dự án phù hợp
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Thử đổi từ khóa hoặc xóa bớt bộ lọc.
            </p>
            <button type="button" onClick={reset} className="button-dark mt-5">
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
