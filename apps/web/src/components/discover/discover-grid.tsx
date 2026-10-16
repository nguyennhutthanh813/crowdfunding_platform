"use client";

import { ArrowDownUp, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CampaignCard } from "@/components/campaign/campaign-card";
import type { CampaignCardData } from "@/lib/api";
import { fundingPercent } from "@/lib/format";

const views = [
  "Tất cả",
  "Thịnh hành",
  "Gần đạt mục tiêu",
  "Mới ra mắt",
  "Sắp ra mắt",
] as const;
type DiscoverView = (typeof views)[number];

const sortOptions = [
  { id: "recommended", label: "Phù hợp nhất" },
  { id: "ending", label: "Sắp kết thúc" },
  { id: "backers", label: "Nhiều người ủng hộ" },
  { id: "progress", label: "Tiến độ cao" },
] as const;
type DiscoverSort = (typeof sortOptions)[number]["id"];

const viewQueryValues: Partial<Record<DiscoverView, string>> = {
  "Thịnh hành": "trending",
  "Gần đạt mục tiêu": "near-goal",
  "Mới ra mắt": "new",
};

function readInitialView(status?: string, view?: string): DiscoverView {
  if (status === "PRE_LAUNCH") return "Sắp ra mắt";
  return (
    Object.entries(viewQueryValues).find(([, value]) => value === view)?.[0] ??
    "Tất cả"
  ) as DiscoverView;
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      if (category !== "Tất cả") params.set("category", category);
      else params.delete("category");

      if (view === "Sắp ra mắt") params.set("status", "PRE_LAUNCH");
      else params.delete("status");
      const viewValue = viewQueryValues[view];
      if (viewValue) params.set("view", viewValue);
      else params.delete("view");
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
        (view === "Thịnh hành" && (campaign.predictionScore ?? 0) >= 80) ||
        (view === "Gần đạt mục tiêu" && percent >= 75 && percent < 100) ||
        (view === "Mới ra mắt" &&
          campaign.status === "LIVE" &&
          campaign.daysLeft >= 20) ||
        (view === "Sắp ra mắt" && campaign.status === "PRE_LAUNCH");
      return matchesQuery && matchesCategory && matchesView;
    });

    if (sort === "ending") {
      return matches.sort((a, b) => {
        if (a.status === "PRE_LAUNCH") return 1;
        if (b.status === "PRE_LAUNCH") return -1;
        return a.daysLeft - b.daysLeft;
      });
    }
    if (sort === "backers") {
      return matches.sort((a, b) => b.backerCount - a.backerCount);
    }
    if (sort === "progress") {
      return matches.sort(
        (a, b) =>
          fundingPercent(b.pledgedAmount, b.goalAmount) -
          fundingPercent(a.pledgedAmount, a.goalAmount),
      );
    }
    return matches;
  }, [campaigns, category, query, sort, view]);

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
  };

  return (
    <section className="page-section pt-10 sm:pt-12">
      <div className="container-shell">
        <div className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_220px_220px]">
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
          <div
            className="mt-4 flex gap-1 overflow-x-auto border-t border-line pt-3"
            role="group"
            aria-label="Bộ lọc nhanh"
          >
            {views.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                aria-pressed={view === item}
                className={`min-h-11 shrink-0 cursor-pointer rounded-[9px] border px-3 py-2 text-xs font-bold transition-[background-color,color,border-color] duration-200 ${view === item ? "border-forest/10 bg-[#e7eee4] text-forest" : "border-transparent text-ink-soft hover:bg-forest/5 hover:text-ink"}`}
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
                  className="rounded-lg bg-[#eef1e7] px-2.5 py-1.5 text-[10px] font-bold text-forest"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-ink-soft" role="status" aria-live="polite">
            <strong className="font-display text-xl text-ink">
              {filtered.length}
            </strong>{" "}
            kết quả phù hợp
          </p>
          {activeFilters.length ? (
            <button
              type="button"
              onClick={reset}
              className="button-ghost min-h-11 px-3 text-xs"
            >
              <X className="size-3.5" /> Xóa bộ lọc
            </button>
          ) : null}
        </div>

        {filtered.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                showReason={view === "Thịnh hành"}
              />
            ))}
          </div>
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
