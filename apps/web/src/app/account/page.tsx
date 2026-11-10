import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { AccountWorkspace } from "@/components/account/account-workspace";
import { RoleGate } from "@/components/auth/role-gate";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { previewInvitationsForUser } from "@/lib/auth/preview-collaborators";
import { mockCampaignMembers, mockCampaigns } from "@/lib/api/mock/relational-store";

export const metadata: Metadata = {
  title: "Tài khoản của tôi",
  description: "Quản lý hồ sơ, vai trò, thông báo và bảo mật tài khoản Góp.",
};

export default async function AccountPage() {
  const [session, platform] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  const invited = session
    ? previewInvitationsForUser(session, platform).map((item) => ({
        campaignId: item.campaignId,
        title: item.title,
        accepted: item.accepted,
      }))
    : [];
  const seedTeams = session
    ? mockCampaignMembers
        .filter((member) =>
          member.userId === session.user.id && member.role === "COLLABORATOR")
        .map((member) => ({
          campaignId: member.campaignId,
          title: mockCampaigns.find((campaign) =>
            campaign.id === member.campaignId)?.title ?? "Chiến dịch",
          accepted: true,
        }))
    : [];
  const teamCampaigns = [...seedTeams, ...invited];
  return (
    <RoleGate allowedRoles={["BACKER", "CREATOR", "COLLABORATOR", "ADMIN"]}>
      <section className="min-h-screen bg-[#efeee8] pb-16">
        <div className="border-b border-line bg-canvas-soft py-8 sm:py-10">
          <div className="container-shell">
            <span className="eyebrow text-coral-dark">
              <Settings2 className="size-4" /> Tài khoản
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              Tài khoản của bạn
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
              Cập nhật hồ sơ, kiểm tra quyền truy cập và xem thông báo liên quan đến tài khoản.
            </p>
          </div>
        </div>
        <AccountWorkspace teamCampaigns={teamCampaigns} />
      </section>
    </RoleGate>
  );
}
