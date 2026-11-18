import "server-only";
import { cache } from "react";
import { apiGet } from "../api";
import type { ProjectRole } from "../rbac/rbac";
import type { ProjectCardData } from "./projects";

export interface ProjectFull {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  cover_url: string | null;
  video_url: string | null;
  goal_amount: number;
  duration_days: number;
  start_at: string | null;
  end_at: string | null;
  status: string;
  is_preview_public: number;
  risks: string;
  completed_display: "SUMMARY" | "UPDATES" | "THANK_YOU";
  completed_message: string | null;
  pledged_amount: number;
  backers_count: number;
  launched_at: string | null;
  ended_at: string | null;
  created_at: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_color: string;
  category_image: string | null;
  creator_id: string;
  creator_name: string;
  creator_username: string;
  creator_avatar: string | null;
  creator_bio: string;
  creator_country: string;
  creator_province: string | null;
}

export interface ViewerProjectContext {
  role: ProjectRole | null;
  perms: string[];
  isMember: boolean;
  isAdmin: boolean;
  canModerate: boolean;
  canDelete: boolean;
  canComment: boolean;
  saved: boolean;
  followingCreator: boolean;
  pledge: {
    id: string;
    code: string;
    total_amount: number;
    status: string;
    tier_title: string | null;
    created_at: string;
  } | null;
  hasPledge: boolean;
}

export interface TierVM {
  id: string;
  title: string;
  description: string;
  amount: number;
  estimated_delivery: string;
  quantity_limit: number | null;
  claimed_count: number;
  remaining: number | null;
  ships_physical: number;
  shipping_fee: number;
  items: { name: string; quantity: number }[];
  addOnIds: string[];
}

export interface AddOnVM {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number | null;
  sold_count: number;
  max_per_pledge: number;
  left: number | null;
}

export interface CommentVM {
  id: string;
  parent_id: string | null;
  body: string;
  status: "VISIBLE" | "HIDDEN" | "DELETED";
  moderated_reason: string | null;
  created_at: string;
  author_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  badge: "CREATOR" | "COLLABORATOR" | "BACKER" | null;
  likes: number;
  liked: number;
  replies: CommentVM[];
}

export interface ProjectDetailPayload {
  project: ProjectFull;
  ctx: ViewerProjectContext;
  blocker: string | null;
  counts: { tiers: number; faqs: number; updates: number; comments: number; backers: number };
  statusNote: string | null;
  sections: { id: string; kind: "TEXT" | "IMAGE" | "VIDEO"; heading: string; body: string; media_url: string | null }[];
  tiers: TierVM[];
  addOns: AddOnVM[];
  faqs: { id: string; question: string; answer: string; updated_at: string }[];
  updates: {
    id: string;
    title: string;
    body: string;
    backers_only: number;
    published_at: string;
    author_name: string;
    author_username: string;
    author_avatar: string | null;
    author_role: string | null;
  }[];
  comments: CommentVM[];
  community: {
    countries: { country_code: string; backers: number; amount: number }[];
    provinces: { province: string; n: number }[];
    daily: {
      stat_date: string;
      new_backers: number;
      pledged_amount: number;
      cumulative_amount: number;
      cumulative_backers: number;
      views: number;
    }[];
    totals: { backers: number; amount: number; avg: number; no_reward: number; anonymous: number; max_amount: number };
  };
  creator: {
    stats: { projects: number; success: number; raised: number; backers: number; followers: number };
    others: ProjectCardData[];
  };
  saved: Set<string>;
}

export const getProjectDetail = cache(async (slug: string): Promise<ProjectDetailPayload | null> => {
  const res = await apiGet<{ ok?: boolean; savedIds?: string[] } & Partial<ProjectDetailPayload>>(
    `/projects/${encodeURIComponent(slug)}`,
  );
  if (!res.ok || !res.project || !res.ctx || !res.counts) return null;
  return {
    project: res.project,
    ctx: res.ctx,
    blocker: res.blocker ?? null,
    counts: res.counts,
    statusNote: res.statusNote ?? null,
    sections: res.sections ?? [],
    tiers: res.tiers ?? [],
    addOns: res.addOns ?? [],
    faqs: res.faqs ?? [],
    updates: res.updates ?? [],
    comments: res.comments ?? [],
    community: res.community ?? {
      countries: [],
      provinces: [],
      daily: [],
      totals: { backers: 0, amount: 0, avg: 0, no_reward: 0, anonymous: 0, max_amount: 0 },
    },
    creator: res.creator ?? {
      stats: { projects: 0, success: 0, raised: 0, backers: 0, followers: 0 },
      others: [],
    },
    saved: new Set(res.savedIds ?? []),
  };
});

export async function getProjectCheckout(slug: string) {
  const res = await apiGet<{
    ok?: boolean;
    project?: ProjectFull;
    blocker?: string | null;
    tiers?: TierVM[];
    addOns?: AddOnVM[];
    cards?: { id: string; brand: string; last4: string; exp_month: number; exp_year: number; is_default: number }[];
    addresses?: {
      id: string;
      label: string;
      recipient_name: string;
      phone: string;
      line1: string;
      ward: string;
      district: string;
      province: string;
      is_default: number;
    }[];
    existing?: {
      id: string;
      code: string;
      tier_id: string | null;
      bonus_amount: number;
      total_amount: number;
      address_id: string | null;
      payment_method_id: string;
      is_anonymous: number;
      note: string;
      tier_title: string | null;
    } | null;
    existingAddOns?: { add_on_id: string; quantity: number }[];
  }>(`/projects/${encodeURIComponent(slug)}/checkout`);
  if (!res.ok || !res.project) return null;
  return {
    project: res.project,
    blocker: res.blocker ?? null,
    tiers: res.tiers ?? [],
    addOns: res.addOns ?? [],
    cards: res.cards ?? [],
    addresses: res.addresses ?? [],
    existing: res.existing ?? null,
    existingAddOns: res.existingAddOns ?? [],
  };
}

export const getPublicProfileBundle = cache(async (username: string) => {
  const res = await apiGet<{
    ok?: boolean;
    profile?: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string;
      country_code: string;
      province: string | null;
      status: string;
      created_at: string;
      hide_backed: number | null;
      followers: number;
      following: number;
      created: number;
      backed: number;
      is_admin: number;
      collab: number;
    };
    following?: boolean;
    savedIds?: string[];
    createdProjects?: ProjectCardData[];
    backedProjects?: ProjectCardData[];
  }>(`/users/${encodeURIComponent(username)}`);
  if (!res.ok || !res.profile) return null;
  return {
    profile: res.profile,
    following: Boolean(res.following),
    saved: new Set(res.savedIds ?? []),
    createdProjects: res.createdProjects ?? [],
    backedProjects: res.backedProjects ?? [],
  };
});

export async function getPledgeReceipt(code: string) {
  const res = await apiGet<{
    ok?: boolean;
    pledge?: {
      id: string;
      code: string;
      status: string;
      reward_amount: number;
      bonus_amount: number;
      add_on_amount: number;
      shipping_amount: number;
      total_amount: number;
      created_at: string;
      is_anonymous: number;
      ship_recipient: string | null;
      ship_address: string | null;
      ship_province: string | null;
      tier_title: string | null;
      estimated_delivery: string | null;
      slug: string;
      title: string;
      cover_url: string | null;
      end_at: string | null;
      goal_amount: number;
      pledged_amount: number;
      card_brand: string;
      card_last4: string;
    };
    addOnLines?: { title: string; quantity: number; unit_price: number }[];
  }>(`/pledges/by-code/${encodeURIComponent(code)}`);
  if (!res.ok || !res.pledge) return null;
  return {
    pledge: res.pledge,
    addOnLines: res.addOnLines ?? [],
  };
}
