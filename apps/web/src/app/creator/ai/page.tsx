import type { Metadata } from "next";
import {
  BrainCircuit,
  Eye,
  FolderKanban,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { CampaignContentAssistant } from "@/components/creator/campaign-content-assistant";
import { CreatorAiDashboard } from "@/components/creator/creator-ai-dashboard";
import { CampaignAiSelector } from "@/components/creator/campaign-ai-selector";
import { api } from "@/lib/api";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";

export const metadata: Metadata = {
  title: "Dự báo chiến dịch",
  description:
    "Dự báo khả năng đạt mục tiêu, phân tích yếu tố SHAP và mức quan tâm của cộng đồng trước khi mở gọi vốn.",
};

export default async function CreatorAiPage({
  searchParams,
}: {
  searchParams?: Promise<{ campaignId?: string; slug?: string }>;
}) {
  const [session, platform, resolvedParams] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
    searchParams,
  ]);

  if (!session) {
    return (
      <CampaignAccessNotice message="Vui lòng đăng nhập tài khoản Nhà sáng tạo hoặc Cộng tác viên để xem phân tích dự báo." />
    );
  }

  // Fetch all campaigns for campaign switcher
  const allCampaigns = await api.listCampaigns();

  // Determine requested campaign
  const requestedIdOrSlug =
    resolvedParams?.campaignId || resolvedParams?.slug || allCampaigns[0]?.id;

  const selectedCampaign =
    allCampaigns.find(
      (c) => c.id === requestedIdOrSlug || c.slug === requestedIdOrSlug,
    ) || allCampaigns[0];

  const targetCampaignId = selectedCampaign?.id || "cmp_orbit";

  const access = resolveCampaignAccess(targetCampaignId, session, platform);
  if (!access.canViewAi && !session.user?.roles?.includes("CREATOR")) {
    return (
      <CampaignAccessNotice message="Bạn chưa được cấp quyền xem dự báo của chiến dịch này." />
    );
  }

  const [data, assistant] = await Promise.all([
    api.getCreatorAiDashboard(selectedCampaign?.id || selectedCampaign?.slug),
    api.getCreatorAssistantData(),
  ]);

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8 sm:py-10">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="eyebrow text-[#526827]">
                <BrainCircuit className="size-4" /> Mô hình XGBoost & SHAP Attribution
              </span>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                Dự báo xác suất & Phân rã yếu tố ảnh hưởng
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                Hệ thống trích xuất đặc trưng thực tế từ cơ sở dữ liệu chiến dịch (mục tiêu vốn, mẫu thử, gói quà, tương tác pre-launch) để tính toán điểm số và gợi ý cải thiện theo thời gian thực.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="#content-assistant"
                className="button-dark min-h-11 px-4 text-xs"
              >
                <Sparkles className="size-4" /> Tối ưu nội dung
              </Link>
              <Link
                href={`/projects/${data.campaign.slug}`}
                className="button-secondary min-h-11 px-4 text-xs"
              >
                <Eye className="size-4" /> Xem trang dự án
              </Link>
              <Link
                href={`/creator/campaigns/${data.campaign.slug}/manage`}
                className="button-secondary min-h-11 px-4 text-xs"
              >
                <FolderKanban className="size-4" /> Vận hành
              </Link>
              <Link
                href="/creator/campaigns/new"
                className="button-primary min-h-11 px-4 text-xs"
              >
                <Plus className="size-4" /> Tạo bản nháp
              </Link>
            </div>
          </div>

          {/* Interactive Campaign Switcher */}
          <CampaignAiSelector
            campaigns={allCampaigns.map((c) => ({
              id: c.id,
              slug: c.slug,
              title: c.title,
              status: c.status,
            }))}
            currentId={data.campaign.id}
          />
        </div>
      </div>
      <CreatorAiDashboard data={data} />
      <CampaignContentAssistant data={assistant.content} />
    </section>
  );
}
