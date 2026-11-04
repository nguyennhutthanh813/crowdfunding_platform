import type { Metadata } from "next";
import { CampaignWizard } from "@/components/creator/campaign-wizard";

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
  const isEditing = Boolean(campaign);
  const editingOrbitMini = campaign === "orbit-mini-bo-pha-gon";

  return (
    <CampaignWizard
      prefillSample={editingOrbitMini}
      mode={isEditing ? "edit" : "create"}
      campaignId={editingOrbitMini ? "cmp_orbit_mini" : undefined}
      campaignSlug={campaign}
    />
  );
}
