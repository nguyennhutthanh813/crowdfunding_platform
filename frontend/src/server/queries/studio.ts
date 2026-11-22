import "server-only";
import { cache } from "react";
import { apiGet } from "../api";
import type { ProjectRole } from "../rbac/rbac";
import type { Factor, PredictionResult, Suggestion } from "../services/ai/predict";

export interface NextStep {
  title: string;
  detail: string;
  tone: "violet" | "amber" | "rose" | "sky" | "emerald" | "slate";
  href: string;
  progress?: number;
  countdownTo?: string | null;
}

export interface StudioCard {
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
  updated_at: string;
  role_code: ProjectRole;
  category_name: string;
  category_color: string;
  next: NextStep;
}

export interface StudioProject {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  cover_url: string | null;
  video_url: string | null;
  category_id: string;
  category_name: string;
  category_color: string;
  creator_id: string;
  creator_name: string;
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
  submitted_at: string | null;
  approved_at: string | null;
  launched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PredictionRow {
  id: string;
  mode: "PRELAUNCH" | "LIVE";
  probability: number;
  band: "LOW" | "MEDIUM" | "HIGH";
  projected_amount: number | null;
  factors: Factor[];
  suggestions: Suggestion[];
  model_version: string;
  created_at: string;
  requested_by_name: string | null;
}

export interface SectionRow {
  id: string;
  kind: "TEXT" | "IMAGE" | "VIDEO";
  heading: string;
  body: string;
  media_url: string | null;
  sort_order: number;
}

export interface TierRow {
  id: string;
  title: string;
  description: string;
  amount: number;
  estimated_delivery: string;
  quantity_limit: number | null;
  claimed_count: number;
  ships_physical: number;
  shipping_fee: number;
  is_active: number;
  sort_order: number;
  pledge_count: number;
  items: { name: string; quantity: number }[];
  add_on_ids: string[];
}

export interface AddOnRow {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number | null;
  sold_count: number;
  max_per_pledge: number;
  is_active: number;
  tier_ids: string[];
}

export interface UpdateRow {
  id: string;
  title: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
  backers_only: number;
  author_id: string;
  author_name: string;
  author_role: string | null;
  publisher_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_by_name: string;
  updated_by_name: string | null;
  updated_at: string;
}

export interface InboxComment {
  id: string;
  body: string;
  status: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  is_backer: number;
  label: string | null;
  sentiment: string | null;
  needs_action: number | null;
  topic: string | null;
  summary: string | null;
  suggested_reply: string | null;
  confidence: number | null;
  handled_at: string | null;
  handled_by_name: string | null;
  replies: { id: string; body: string; created_at: string; author_name: string; role_code: string | null; status: string }[];
}

export interface BackerRow {
  id: string;
  code: string;
  name: string;
  username: string;
  is_anonymous: number;
  tier_id: string | null;
  tier: string | null;
  add_ons: string | null;
  reward_amount: number;
  bonus_amount: number;
  add_on_amount: number;
  shipping_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  ship_recipient: string | null;
  ship_phone: string | null;
  ship_address: string | null;
  ship_province: string | null;
  country_code: string;
  note: string;
}

export interface ShipmentRow {
  pledge_id: string;
  code: string;
  name: string;
  tier: string | null;
  status: "PREPARING" | "SHIPPED" | "DELIVERED";
  carrier: string | null;
  tracking_code: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  ship_recipient: string | null;
  ship_phone: string | null;
  ship_address: string | null;
  ship_province: string | null;
}

export interface StudioInvitationItem {
  id: string;
  title: string;
  slug: string;
  project_cover: string | null;
  project_status: string;
  inviter: string;
  inviter_username: string;
  inviter_avatar: string | null;
  message: string;
  expires_at: string;
  created_at: string;
}

export async function getStudioIndexBundle() {
  const res = await apiGet<{
    ok?: boolean;
    mine?: StudioCard[];
    collab?: StudioCard[];
    invitations?: StudioInvitationItem[];
  }>("/studio/projects");
  return {
    mine: res.mine ?? [],
    collab: res.collab ?? [],
    invitations: res.invitations ?? [],
  };
}

export async function listCategoriesForStudio() {
  const res = await apiGet<{
    ok?: boolean;
    categories?: { id: string; name: string; slug: string; image_url: string | null; color: string }[];
  }>("/studio/categories");
  return res.categories ?? [];
}

export const getStudioWorkspace = cache(async (slug: string, tab = "overview") => {
  const res = await apiGet<{
    ok?: boolean;
    project?: StudioProject;
    access?: { role: ProjectRole | null; perms: string[] };
    counts?: { pendingComments: number; draftUpdates: number; faqs: number; backers: number };
    reviews?: { id: string; decision: string; note: string; created_at: string; reviewer: string }[];
    timeline?: { id: string; from_status: string | null; to_status: string; reason: string; created_at: string; actor: string | null }[];
    overview?: {
      daily: {
        stat_date: string;
        new_backers: number;
        new_pledges: number;
        pledged_amount: number;
        cumulative_amount: number;
        cumulative_backers: number;
        views: number;
        saves: number;
        comments: number;
      }[];
      views7: number;
      saves: number;
      latest: PredictionRow | null;
      history: { t: string; p: number }[];
      pledges: { id: string; name: string; amount: number; status: string; created_at: string; tier: string | null }[];
      comments: { id: string; name: string; body: string; created_at: string; label: string | null }[];
    } | null;
    checklist?: { key: string; label: string; ok: boolean; required: boolean }[] | null;
    draftPrediction?: PredictionResult | null;
    team?: {
      user_id: string;
      display_name: string;
      username: string;
      avatar_url: string | null;
      email: string;
      role_code: ProjectRole;
      status: string;
      joined_at: string;
      removed_at: string | null;
    }[] | null;
    sections?: SectionRow[] | null;
    categories?: { id: string; name: string; slug: string; image_url: string | null; color: string }[] | null;
    rewards?: { tiers: TierRow[]; addOns: AddOnRow[] } | null;
    updates?: UpdateRow[] | null;
    faqs?: FaqRow[] | null;
    inbox?: InboxComment[] | null;
    backers?: BackerRow[] | null;
    shipments?: ShipmentRow[] | null;
    digitalCaptured?: number;
    invitations?: {
      id: string;
      email: string;
      invitee_name: string | null;
      status: string;
      message: string;
      expires_at: string;
      created_at: string;
      responded_at: string | null;
    }[] | null;
    collabPerms?: { code: string; name: string; module: string }[] | null;
    allPerms?: { code: string; name: string; module: string }[] | null;
    anyPledge?: boolean;
  }>(`/studio/projects/${encodeURIComponent(slug)}?tab=${encodeURIComponent(tab)}`);
  if (!res.ok || !res.project || !res.access) return null;
  return res;
});

export async function getStudioSetupBundle(slug: string) {
  const res = await apiGet<{
    ok?: boolean;
    project?: StudioProject;
    access?: { role: ProjectRole | null; perms: string[] };
    categories?: { id: string; name: string; slug: string; image_url: string | null; color: string }[];
    sections?: SectionRow[];
    rewards?: { tiers: TierRow[]; addOns: AddOnRow[] };
    checklist?: { key: string; label: string; ok: boolean; required: boolean }[];
    prediction?: PredictionResult | null;
    reviews?: { id: string; decision: string; note: string; created_at: string; reviewer: string }[];
  }>(`/studio/projects/${encodeURIComponent(slug)}/setup`);
  if (!res.ok || !res.project || !res.access) return null;
  return {
    project: res.project,
    access: res.access,
    categories: res.categories ?? [],
    sections: res.sections ?? [],
    rewards: res.rewards ?? { tiers: [], addOns: [] },
    checklist: res.checklist ?? [],
    prediction: res.prediction ?? null,
    reviews: res.reviews ?? [],
  };
}

export async function getStudioBackersExport(slug: string) {
  return apiGet<{ ok?: boolean; project?: StudioProject; backers?: BackerRow[]; error?: string }>(
    `/studio/projects/${encodeURIComponent(slug)}/backers`,
  );
}
