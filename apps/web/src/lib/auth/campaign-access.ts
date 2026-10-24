import type { SessionResult } from "@/lib/api/contracts";
import {
  findMockCampaign,
  getCampaignMembership,
} from "@/lib/api/mock/relational-store";
import type { PlatformPreviewState } from "./platform-preview-cookie";
import { campaignMemberKey } from "./campaign-permissions";

export function resolveCampaignAccess(
  campaignId: string,
  session: SessionResult,
  platform?: PlatformPreviewState,
) {
  const campaign = findMockCampaign(campaignId);
  const membership = campaign
    ? getCampaignMembership(campaign.id, session.user.id)
    : null;
  const isCreatorRole = session.user.roles.includes("CREATOR");
  const isDraftOrWizard =
    campaign?.status === "DRAFT" || campaignId === "cmp_orbit_mini";
  const isOwner = Boolean(
    (membership?.role === "OWNER" || (isDraftOrWizard && isCreatorRole)) &&
      isCreatorRole,
  );
  const isCollaborator = Boolean(
    membership?.role === "COLLABORATOR" &&
      session.user.roles.includes("COLLABORATOR"),
  );
  const permissions =
    platform?.collaboratorPermissions[
      campaignMemberKey(campaignId, session.user.id)
    ];

  return {
    campaign: campaign
      ? {
          ...campaign,
          status: platform?.campaignStatuses[campaignId] ?? campaign.status,
        }
      : null,
    membership,
    isOwner,
    isCollaborator,
    canOpenWorkspace: isOwner || isCollaborator,
    canPostUpdates:
      isOwner ||
      Boolean(
        isCollaborator &&
        (permissions
          ? permissions.includes("Đăng cập nhật")
          : membership?.canPostUpdates),
      ),
    canReplyComments:
      isOwner ||
      Boolean(
        isCollaborator &&
        (permissions
          ? permissions.includes("Trả lời bình luận")
          : membership?.canReplyComments),
      ),
    canViewAi:
      isOwner ||
      Boolean(
        isCollaborator &&
        (permissions
          ? permissions.includes("Xem dự báo")
          : membership?.canViewAiDashboard),
      ),
  };
}
