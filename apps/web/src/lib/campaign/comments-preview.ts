import type { CampaignComment } from "@/lib/api/contracts";
import type { PlatformPreviewState, SharedCampaignComment } from "@/lib/auth/platform-preview-cookie";

export function commentLikeKey(campaignId: string, commentId: string) {
  return `${campaignId}:${commentId}`;
}

function displayTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2)
    .map((part) => part[0]?.toUpperCase()).join("");
}

function fromShared(row: SharedCampaignComment): CampaignComment {
  return {
    id: row.id,
    author: row.authorName,
    initials: row.authorInitials,
    badge: row.badge,
    kind: row.kind,
    body: row.body,
    createdAt: displayTime(row.createdAt),
    likes: 0,
  };
}

export function buildPreviewComments(
  campaignId: string,
  original: CampaignComment[],
  platform: PlatformPreviewState,
): CampaignComment[] {
  const likedCount = (id: string) => platform.commentLikes?.[commentLikeKey(campaignId, id)]?.length ?? 0;
  const byId = new Map<string, CampaignComment>();
  const copy = (row: CampaignComment): CampaignComment => {
    const item = { ...row, likes: row.likes + likedCount(row.id), replies: row.replies?.map(copy) };
    byId.set(item.id, item);
    return item;
  };
  const roots = original.map(copy);

  for (const reply of platform.commentReplies.filter((item) => item.campaignId === campaignId)) {
    const parent = byId.get(reply.commentId);
    if (!parent || byId.has(reply.id)) continue;
    const item: CampaignComment = {
      id: reply.id, author: reply.authorName, initials: initials(reply.authorName),
      badge: reply.authorRole, body: reply.body, createdAt: reply.createdAt,
      likes: likedCount(reply.id),
    };
    parent.replies = [item, ...(parent.replies ?? [])];
    byId.set(item.id, item);
  }

  const rows = platform.campaignComments.filter((item) => item.campaignId === campaignId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  for (const row of rows) {
    if (byId.has(row.id)) continue;
    const item = fromShared(row);
    item.likes = likedCount(item.id);
    const parent = row.parentId ? byId.get(row.parentId) : null;
    if (parent) parent.replies = [...(parent.replies ?? []), item];
    else if (!row.parentId) roots.unshift(item);
    byId.set(item.id, item);
  }
  return roots;
}

export function withViewerLikes(
  campaignId: string,
  comments: CampaignComment[],
  platform: PlatformPreviewState,
  viewerId?: string,
): CampaignComment[] {
  if (!viewerId) return comments;
  const mark = (row: CampaignComment): CampaignComment => ({
    ...row,
    viewerLiked: Boolean(platform.commentLikes?.[commentLikeKey(campaignId, row.id)]?.includes(viewerId)),
    replies: row.replies?.map(mark),
  });
  return comments.map(mark);
}
