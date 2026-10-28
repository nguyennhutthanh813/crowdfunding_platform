import type { Metadata } from "next";
import { BackerDashboard } from "@/components/dashboard/backer-dashboard";
import { api } from "@/lib/api";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { buildUserDashboard } from "@/lib/dashboard-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Không gian của tôi",
  description:
    "Theo dõi các khoản ủng hộ, dự án đã lưu, chủ dự án và tin nhắn.",
};

export default async function DashboardPage() {
  const [data, session, campaigns, platformState] = await Promise.all([
    api.getUserDashboard(),
    getServerSession(),
    api.listCampaigns(),
    getServerPlatformPreviewState(),
  ]);
  const personalizedData = session
    ? buildUserDashboard(data, campaigns, session, platformState)
    : data;
  const friendlyName = getFriendlyName(personalizedData.user.name);

  return <BackerDashboard data={personalizedData} friendlyName={friendlyName} />;
}
