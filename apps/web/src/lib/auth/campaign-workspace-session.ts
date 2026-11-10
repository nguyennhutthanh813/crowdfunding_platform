import type { SessionResult } from "@/lib/api/contracts";
import { mockCampaignMembers } from "@/lib/api/mock/relational-store";
import type { PlatformPreviewState } from "./platform-preview-cookie";
import { previewInvitationsForUser } from "./preview-collaborators";

// Cộng tác là quan hệ với chiến dịch, không phải quyền được cấp vĩnh viễn cho tài khoản.
export function campaignWorkspaceSession(
  session: SessionResult,
  platform: PlatformPreviewState,
): SessionResult {
  const seedMember = mockCampaignMembers.some((member) =>
    member.userId === session.user.id && member.role === "COLLABORATOR");
  const joinedCampaign = previewInvitationsForUser(session, platform).some(
    (item) => item.accepted,
  );
  const accountRoles = session.user.roles.filter((role) => role !== "COLLABORATOR");
  const roles = seedMember || joinedCampaign
    ? [...accountRoles, "COLLABORATOR" as const]
    : accountRoles;
  const activeRole = roles.includes(session.user.activeRole)
    ? session.user.activeRole
    : roles[0] ?? "BACKER";
  return { ...session, user: { ...session.user, roles, activeRole } };
}
