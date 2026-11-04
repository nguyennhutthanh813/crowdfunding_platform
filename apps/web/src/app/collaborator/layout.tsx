import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { previewInvitationsForUser } from "@/lib/auth/preview-collaborators";
import { applyCampaignCardPreviewState, applyOperationsPreviewState } from "@/lib/preview-read-models";
import { buildCollaboratorWorkspaceSnapshot } from "@/lib/workspace-snapshot";

export default async function CollaboratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [campaign, baseOperations, session, platformState] = await Promise.all([
    api.getCampaignBySlug("orbit-one-ca-phe-thong-minh"),
    api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  if (!campaign) return null;
  const visibleCampaign = applyCampaignCardPreviewState(campaign, platformState);
  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );

  const hasSeedCampaign = session
    ? resolveCampaignAccess("cmp_orbit", session, platformState).isCollaborator
    : false;
  const invitations = session ? previewInvitationsForUser(session, platformState) : [];
  const snapshot = hasSeedCampaign
    ? buildCollaboratorWorkspaceSnapshot(visibleCampaign, operations, session!.user.id)
    : {
        entityCode: "NHÓM · GÓP",
        contextTitle: "Việc nhóm của tôi",
        contextDetail: invitations.length
          ? `${invitations.length} chiến dịch mời bạn cộng tác`
          : "Chưa có chiến dịch nào giao cho bạn",
        statusLabel: "CỘNG TÁC VIÊN",
        primaryMetric: { label: "lời mời", value: String(invitations.length) },
        secondaryMetric: { label: "đã tham gia", value: String(invitations.filter((item) => item.accepted).length) },
        updatedLabel: "Quyền được xác nhận riêng cho từng chiến dịch",
      };

  return (
    <RoleWorkspaceShell
      role="COLLABORATOR"
      snapshot={{ ...snapshot, hasSeedCollaboratorCampaign: hasSeedCampaign,
        collaboratorInvitations: invitations }}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
