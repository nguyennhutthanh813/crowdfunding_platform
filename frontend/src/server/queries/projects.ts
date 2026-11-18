import "server-only";
import { apiGet } from "../api";

export interface ProjectCardData {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  cover_url: string | null;
  status: string;
  goal_amount: number;
  pledged_amount: number;
  backers_count: number;
  start_at: string | null;
  end_at: string | null;
  category_name: string;
  category_slug: string;
  category_color: string;
  creator_id: string;
  creator_name: string;
  creator_username: string;
  creator_avatar: string | null;
}

export type SortKey = "trending" | "newest" | "ending" | "funded" | "backers";

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  color: string;
  live_count: number;
  total_count: number;
}

export interface RecentPledgeTicker {
  id: string;
  backer: string;
  title: string;
  slug: string;
  amount: number;
  created_at: string;
  country: string;
}

export interface PlatformStats {
  raised: number;
  backers: number;
  live: number;
  success: number;
  ended: number;
}

export async function getHomeFeed() {
  const res = await apiGet<{
    ok?: boolean;
    stats?: PlatformStats;
    categories?: CategorySummary[];
    trending?: ProjectCardData[];
    upcoming?: ProjectCardData[];
    recent?: RecentPledgeTicker[];
    savedIds?: string[];
  }>("/home");
  return {
    stats: res.stats ?? { raised: 0, backers: 0, live: 0, success: 0, ended: 0 },
    categories: res.categories ?? [],
    trending: res.trending ?? [],
    upcoming: res.upcoming ?? [],
    recent: res.recent ?? [],
    saved: new Set(res.savedIds ?? []),
  };
}

export async function listPublicProjects(
  opts: {
    status?: "LIVE" | "SCHEDULED" | "ENDED" | "ALL";
    category?: string;
    q?: string;
    sort?: SortKey;
    limit?: number;
    offset?: number;
  } = {},
) {
  const qs = new URLSearchParams();
  if (opts.status) qs.set("status", opts.status);
  if (opts.category) qs.set("category", opts.category);
  if (opts.q) qs.set("q", opts.q);
  if (opts.sort) qs.set("sort", opts.sort);
  if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
  if (opts.offset !== undefined) qs.set("offset", String(opts.offset));

  const res = await apiGet<{ ok?: boolean; rows?: ProjectCardData[]; total?: number; savedIds?: string[] }>(
    `/projects?${qs.toString()}`,
  );
  return {
    rows: res.rows ?? [],
    total: res.total ?? 0,
    saved: new Set(res.savedIds ?? []),
  };
}

export async function listCategories(): Promise<CategorySummary[]> {
  const res = await apiGet<{ ok?: boolean; categories?: CategorySummary[] }>("/categories");
  return res.categories ?? [];
}

export async function recentPledges(limit = 16): Promise<RecentPledgeTicker[]> {
  const res = await apiGet<{ ok?: boolean; rows?: RecentPledgeTicker[] }>(`/pledges/recent?limit=${limit}`);
  return res.rows ?? [];
}

export async function platformStats(): Promise<PlatformStats> {
  const res = await apiGet<{ ok?: boolean; stats?: PlatformStats }>("/stats");
  return res.stats ?? { raised: 0, backers: 0, live: 0, success: 0, ended: 0 };
}
