import type { SessionResult } from "@/lib/api/contracts";
import type { PlatformPreviewState } from "./platform-preview-cookie";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";

export function previewInvitationForUser(
  campaignId: string,
  session: SessionResult,
  platform: PlatformPreviewState,
) {
  if (!isPreviewCampaignId(campaignId)) return null;
  const snapshot = platform.campaignDrafts[campaignId];
  if (!snapshot || snapshot.ownerId === session.user.id) return null;
  const invitation = snapshot.collaborators?.find((item) =>
    item.email.trim().toLowerCase() === session.user.email.trim().toLowerCase());
  if (!invitation) return null;
  const status = previewCampaignStatus(campaignId, platform);
  if (status !== "PRE_LAUNCH" && status !== "LIVE" && status !== "SUSPENDED") return null;
  return {
    campaignId,
    title: snapshot.draft.title || "Hồ sơ chưa đặt tên",
    category: snapshot.draft.category || "Chưa phân loại",
    status,
    permissions: {
      canUpdate: invitation.canUpdate,
      canReply: invitation.canReply,
      canViewAi: invitation.canViewAi,
    },
    accepted: (platform.acceptedCollaborators[campaignId] ?? []).includes(session.user.id),
  };
}

export function previewInvitationsForUser(session: SessionResult, platform: PlatformPreviewState) {
  return Object.keys(platform.campaignDrafts).flatMap((campaignId) => {
    const invitation = previewInvitationForUser(campaignId, session, platform);
    return invitation ? [invitation] : [];
  });
}
