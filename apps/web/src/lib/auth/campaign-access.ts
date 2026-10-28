import type { SessionResult } from "@/lib/api/contracts";
import type { PlatformPreviewState } from "./platform-preview-cookie";
import { campaignMemberKey } from "./campaign-permissions";

export function resolveCampaignAccess(
  campaignId: string,
  session: SessionResult,
  platform?: PlatformPreviewState,
  campaignData?: any,
) {
  const isCreatorRole = session.user.roles.includes("CREATOR");
  const isCollaboratorRole = session.user.roles.includes("COLLABORATOR");
  const isOwner = isCreatorRole;
  const isCollaborator = isCollaboratorRole;
  const permissions =
    platform?.collaboratorPermissions[
      campaignMemberKey(campaignId, session.user.id)
    ];

  return {
    campaign: campaignData ?? {
      id: campaignId,
      title: "Chiến dịch",
      status: platform?.campaignStatuses[campaignId] ?? (campaignData?.status || "LIVE"),
    },
    membership: {
      userId: session.user.id,
      role: isOwner ? "OWNER" : "COLLABORATOR",
      canPostUpdates: true,
      canReplyComments: true,
      canViewAiDashboard: true,
    },
    isOwner,
    isCollaborator,
    canOpenWorkspace: isOwner || isCollaborator,
    canPostUpdates:
      isOwner ||
      Boolean(
        isCollaborator &&
        (permissions ? permissions.includes("Đăng cập nhật") : true),
      ),
    canReplyComments:
      isOwner ||
      Boolean(
        isCollaborator &&
        (permissions ? permissions.includes("Trả lời bình luận") : true),
      ),
    canViewAi:
      isOwner ||
      Boolean(
        isCollaborator &&
        (permissions ? permissions.includes("Xem dự báo") : true),
      ),
  };
}
