import type { Metadata } from "next";
import { CampaignWizard } from "@/components/creator/campaign-wizard";
import { getServerSession } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Tạo chiến dịch",
  description:
    "Tạo chiến dịch, cấu hình gói ủng hộ và xem trước khi gửi duyệt.",
};

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const session = await getServerSession();
  const editingOrbitMini = campaign === "orbit-mini-bo-pha-gon";
  return (
    <CampaignWizard
      prefillSample={session?.user.id === "usr_hoang_linh"}
      mode={editingOrbitMini ? "edit" : "create"}
      campaignId="cmp_orbit_mini"
      campaignSlug={editingOrbitMini ? campaign : undefined}
    />
  );
}
