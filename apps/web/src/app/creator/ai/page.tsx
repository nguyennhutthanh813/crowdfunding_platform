import type { Metadata } from "next";
import { BrainCircuit, Plus } from "lucide-react";
import Link from "next/link";
import { CampaignAiSelector } from "@/components/creator/campaign-ai-selector";
import { CreatorAiDashboard } from "@/components/creator/creator-ai-dashboard";
import { api } from "@/lib/api";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { applyCreatorPortfolioPreviewState } from "@/lib/preview-read-models";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trợ lý AI & Dự báo | Chủ dự án",
  description:
    "Dự báo khả năng đạt mục tiêu, phân tích yếu tố ảnh hưởng và gợi ý cải thiện hồ sơ chiến dịch.",
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

  const basePortfolio = await api.getCreatorPortfolio(
    session.user.id,
    session.tokens?.accessToken,
    {
      name: session.user.name,
      id: session.user.id,
      email: session.user.email,
      initials: session.user.initials,
    },
  );
  const portfolio = applyCreatorPortfolioPreviewState(basePortfolio, platform);

  const availableCampaigns =
    portfolio.campaigns.length > 0
      ? portfolio.campaigns
      : session.user.roles.includes("ADMIN")
        ? await api.listCampaigns()
        : [];

  if (availableCampaigns.length === 0) {
    return (
      <section className="min-h-[70vh] bg-[var(--canvas)] py-14">
        <div className="container-shell max-w-2xl">
          <div className="rounded-[24px] border border-line bg-white p-8 text-center sm:p-10">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e5ebe5] text-[#526827]">
              <BrainCircuit className="size-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
              Chưa có chiến dịch để dự báo
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Hãy tạo bản nháp chiến dịch đầu tiên để hệ thống phân tích mức độ hoàn thiện hồ sơ, dự báo xác suất đạt mục tiêu và gợi ý các điểm cần bổ sung.
            </p>
            <div className="mt-7 flex justify-center">
              <Link
                href="/creator/campaigns/new"
                className="button-primary min-h-11 px-5 text-xs"
              >
                <Plus className="size-4" /> Tạo chiến dịch mới
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const requestedIdOrSlug =
    resolvedParams?.campaignId ||
    resolvedParams?.slug ||
    portfolio.activeCampaignId ||
    availableCampaigns[0]?.id;

  const selectedCampaign =
    availableCampaigns.find(
      (c) => c.id === requestedIdOrSlug || c.slug === requestedIdOrSlug,
    ) || availableCampaigns[0];

  const access = resolveCampaignAccess(
    selectedCampaign.id,
    session,
    platform,
    selectedCampaign,
  );
  if (!access.canViewAi && !access.isOwner) {
    return (
      <CampaignAccessNotice message="Bạn chưa được cấp quyền xem dự báo của chiến dịch này." />
    );
  }

  const data = await api.getCreatorAiDashboard(
    selectedCampaign.id || selectedCampaign.slug,
  );

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8 sm:py-10">
        <div className="container-shell">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              Phân tích & Dự báo chiến dịch
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
              Đánh giá độ sẵn sàng hồ sơ trước khi mở bán hoặc theo dõi tốc độ gọi vốn thực tế khi chiến dịch đang chạy để đưa ra gợi ý cải thiện kịp thời.
            </p>
          </div>

          <CampaignAiSelector
            campaigns={availableCampaigns.map((c) => ({
              id: c.id,
              slug: c.slug,
              title: c.title,
              status: c.status,
            }))}
            currentId={selectedCampaign.id}
          />
        </div>
      </div>
      <CreatorAiDashboard data={data} />
    </section>
  );
}
