import "server-only";
import { redirect } from "next/navigation";
import { apiFetch, apiGet } from "../api";
import type { ProjectCardData } from "./projects";

export interface MeSummary {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string;
  country_code: string;
  created_at: string;
  creator_count: number;
  collab_count: number;
  total_backed: number;
  backed_projects: number;
  saved_count: number;
  following_count: number;
  follower_count: number;
  unread_notifications: number;
  unread_messages: number;
  pending_invites: number;
}

export interface InvitationRow {
  id: string;
  message: string;
  expires_at: string;
  created_at: string;
  project_id: string;
  project_title: string;
  project_slug: string;
  project_cover: string | null;
  project_status: string;
  inviter_name: string;
  inviter_username: string;
  inviter_avatar: string | null;
}

export interface MyPledge {
  id: string;
  code: string;
  status: string;
  reward_amount: number;
  bonus_amount: number;
  add_on_amount: number;
  shipping_amount: number;
  total_amount: number;
  is_anonymous: number;
  note: string;
  ship_recipient: string | null;
  ship_address: string | null;
  ship_province: string | null;
  created_at: string;
  captured_at: string | null;
  voided_at: string | null;
  cancelled_at: string | null;
  project_id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  p_status: string;
  start_at: string | null;
  end_at: string | null;
  ended_at: string | null;
  goal_amount: number;
  p_pledged: number;
  backers_count: number;
  creator_name: string;
  creator_username: string;
  tier_title: string | null;
  ships_physical: number | null;
  estimated_delivery: string | null;
  card_brand: string | null;
  card_last4: string | null;
  ship_status: string | null;
  carrier: string | null;
  tracking_code: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  addOns: { title: string; quantity: number; unit_price: number }[];
  transactions: { id: string; kind: string; amount: number; status: string; message: string; created_at: string }[];
  changeable: boolean;
}

export interface Recommendation {
  project: ProjectCardData;
  score: number;
  reasons: string[];
  parts: { affinity: number; followed: number; momentum: number; popularity: number; urgency: number };
}

export const RECO_WEIGHTS = { affinity: 0.45, followed: 0.2, momentum: 0.2, popularity: 0.1, urgency: 0.05 } as const;

export interface FollowedCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  followed_at: string;
  live_count: number;
  project_count: number;
  follower_count: number;
  latest: ProjectCardData | null;
}

export interface ConversationRow {
  id: string;
  subject: string;
  last_message_at: string;
  last_read_at: string | null;
  project_title: string | null;
  project_slug: string | null;
  project_status: string | null;
  other_id: string | null;
  other_name: string | null;
  other_username: string | null;
  other_avatar: string | null;
  other_role: string | null;
  last_body: string | null;
  last_sender: string | null;
  unread: number;
}

export interface ActivityItem {
  id: string;
  kind: "UPDATE" | "STATUS" | "PLEDGE" | "PLEDGE_CANCEL" | "COMMENT";
  at: string;
  title: string;
  body: string;
  link: string;
  project_title: string;
  project_slug: string;
  cover_url: string | null;
  meta: string | null;
  locked: number;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar: string | null;
}

export interface TwoFactorStatusInfo {
  enabled: boolean;
  verifiedAt: string | null;
  backupCodesRemaining: number;
}

export interface ActiveSessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export async function meSummary(): Promise<MeSummary | null> {
  const res = await apiGet<{ ok?: boolean; summary?: MeSummary }>("/me/summary");
  return res.summary ?? null;
}

export async function meOverviewBundle() {
  const { status, data: res } = await apiFetch<{
    ok?: boolean;
    summary?: MeSummary;
    invitations?: InvitationRow[];
    waiting?: {
      id: string;
      code: string;
      total_amount: number;
      slug: string;
      title: string;
      cover_url: string | null;
      end_at: string;
      goal_amount: number;
      pledged_amount: number;
      backers_count: number;
      tier_title: string | null;
    }[];
    notifications?: NotificationRow[];
    recos?: { items: Recommendation[]; coldStart: boolean; topCategories: { name: string; weight: number }[] };
    savedIds?: string[];
  }>("/me/overview");
  if (status === 401) redirect("/login?next=/me");
  const fallbackSummary: MeSummary = {
    id: "",
    username: "thanhvien",
    display_name: "Thành viên",
    email: "",
    avatar_url: null,
    bio: "",
    country_code: "VN",
    created_at: new Date().toISOString(),
    creator_count: 0,
    collab_count: 0,
    total_backed: 0,
    backed_projects: 0,
    saved_count: 0,
    following_count: 0,
    follower_count: 0,
    unread_notifications: 0,
    unread_messages: 0,
    pending_invites: 0,
  };
  return {
    summary: res.summary ?? fallbackSummary,
    invitations: res.invitations ?? [],
    waiting: res.waiting ?? [],
    notifications: res.notifications ?? [],
    recos: res.recos ?? { items: [], coldStart: true, topCategories: [] },
    saved: new Set(res.savedIds ?? []),
  };
}

export async function myPledges(): Promise<MyPledge[]> {
  const res = await apiGet<{ ok?: boolean; pledges?: MyPledge[] }>("/me/pledges");
  return res.pledges ?? [];
}

export async function savedProjects() {
  const res = await apiGet<{
    ok?: boolean;
    upcoming?: (ProjectCardData & { saved_at: string })[];
    others?: (ProjectCardData & { saved_at: string })[];
    hidden?: number;
    savedIds?: string[];
  }>("/me/saved");
  return {
    upcoming: res.upcoming ?? [],
    others: res.others ?? [],
    hidden: res.hidden ?? 0,
    saved: new Set(res.savedIds ?? []),
  };
}

export async function recommendations(limit = 12) {
  const res = await apiGet<{
    ok?: boolean;
    items?: Recommendation[];
    coldStart?: boolean;
    topCategories?: { name: string; weight: number }[];
    savedIds?: string[];
  }>(`/me/recommendations?limit=${limit}`);
  return {
    items: res.items ?? [],
    coldStart: Boolean(res.coldStart),
    topCategories: res.topCategories ?? [],
    saved: new Set(res.savedIds ?? []),
  };
}

export async function followingBundle() {
  const res = await apiGet<{
    ok?: boolean;
    creators?: FollowedCreator[];
    suggestions?: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string;
      live_count: number;
      backers: number;
      follower_count: number;
      affinity: number;
    }[];
    savedIds?: string[];
  }>("/me/following");
  return {
    creators: res.creators ?? [],
    suggestions: res.suggestions ?? [],
    saved: new Set(res.savedIds ?? []),
  };
}

export async function myConversations(): Promise<ConversationRow[]> {
  const res = await apiGet<{ ok?: boolean; conversations?: ConversationRow[] }>("/me/conversations");
  return res.conversations ?? [];
}

export async function conversationComposeMeta(to: string, project: string) {
  const qs = new URLSearchParams();
  if (to) qs.set("to", to);
  if (project) qs.set("project", project);
  const res = await apiGet<{
    ok?: boolean;
    targetUser?: { id: string; username: string; display_name: string; avatar_url: string | null; bio: string; status: string } | null;
    targetProject?: { id: string; slug: string; title: string; cover_url: string | null; status: string; creator_id: string } | null;
    followed?: FollowedCreator[];
    pledges?: MyPledge[];
    suggestions?: { username: string; display_name: string; avatar_url: string | null }[];
  }>(`/me/conversations/compose-meta?${qs.toString()}`);
  return {
    targetUser: res.targetUser ?? null,
    targetProject: res.targetProject ?? null,
    followed: res.followed ?? [],
    pledges: res.pledges ?? [],
    suggestions: res.suggestions ?? [],
  };
}

export async function conversationThread(conversationId: string) {
  const res = await apiGet<{
    ok?: boolean;
    thread?: {
      conv: {
        id: string;
        subject: string;
        created_at: string;
        project_id: string | null;
        project_title: string | null;
        project_slug: string | null;
        project_status: string | null;
        project_cover: string | null;
      };
      participants: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        role: string | null;
        last_read_at: string | null;
      }[];
      messages: { id: string; sender_id: string; body: string; created_at: string }[];
      myLastReadAt: string | null;
    };
  }>(`/me/conversations/${encodeURIComponent(conversationId)}`);
  return res.thread ?? null;
}

export async function activityFeed(limit = 80): Promise<ActivityItem[]> {
  const res = await apiGet<{ ok?: boolean; items?: ActivityItem[] }>(`/me/activity?limit=${limit}`);
  return res.items ?? [];
}

export async function myNotifications(unreadOnly: boolean, limit = 150): Promise<NotificationRow[]> {
  const res = await apiGet<{ ok?: boolean; notifications?: NotificationRow[] }>(
    `/me/notifications?unread=${unreadOnly ? "1" : "0"}&limit=${limit}`,
  );
  return res.notifications ?? [];
}

export async function settingsData() {
  const { status, data: res } = await apiFetch<{
    ok?: boolean;
    user?: {
      username: string;
      email: string;
      display_name: string;
      bio: string;
      country_code: string;
      province: string | null;
      avatar_url: string | null;
      created_at: string;
      email_verified_at: string | null;
    };
    settings?: {
      notify_new_project: number;
      notify_project_update: number;
      notify_comment_reply: number;
      notify_message: number;
      hide_backed_projects: number;
    };
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
    cards?: {
      id: string;
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
      holder_name: string;
      is_default: number;
      used: number;
      active_use: number;
    }[];
    sessions?: number;
    twoFactor?: TwoFactorStatusInfo & { remainingBackupCodes?: number };
    sessionList?: ActiveSessionInfo[];
  }>("/me/settings");

  if (status === 401 || !res.user) {
    redirect("/login?next=/me/settings");
  }

  return {
    user: res.user,
    settings: res.settings ?? {
      notify_new_project: 1,
      notify_project_update: 1,
      notify_comment_reply: 1,
      notify_message: 1,
      hide_backed_projects: 0,
    },
    addresses: res.addresses ?? [],
    cards: res.cards ?? [],
    sessions: res.sessions ?? 0,
    twoFactor: {
      enabled: Boolean(res.twoFactor?.enabled),
      verifiedAt: res.twoFactor?.verifiedAt ?? null,
      backupCodesRemaining: Number(res.twoFactor?.backupCodesRemaining ?? res.twoFactor?.remainingBackupCodes ?? 0),
    },
    sessionList: res.sessionList ?? [],
  };
}
