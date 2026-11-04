import type { Metadata } from "next";
import { Compass, SlidersHorizontal } from "lucide-react";
import { DiscoverGrid } from "@/components/discover/discover-grid";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { applyCampaignCardPreviewState } from "@/lib/preview-read-models";
import { publicPreviewCampaigns } from "@/lib/creator/public-preview-campaigns";
import { DEMO_SNAPSHOT_AT } from "@/lib/api/mock/relational-store";

export const metadata: Metadata = {
  title: "Khám phá dự án",
  description:
    "Tìm kiếm và lọc các chiến dịch gọi vốn cộng đồng theo lĩnh vực và trạng thái.",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    view?: string;
    sort?: string;
  }>;
}) {
  const [baseCampaigns, params, platformState] = await Promise.all([
    api.listCampaigns(),
    searchParams,
    getServerPlatformPreviewState(),
  ]);
  const campaigns = [
    ...publicPreviewCampaigns(platformState),
    ...baseCampaigns.map((campaign) => applyCampaignCardPreviewState(campaign, platformState)),
  ];
  return (
    <>
      <section className="border-b border-line bg-canvas-soft py-6 sm:py-10">
        <div className="container-shell">
          <span className="eyebrow text-coral-dark">
            <Compass className="size-4" /> Khám phá dự án
          </span>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:mt-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl font-display text-[1.9rem] leading-[1.12] font-extrabold tracking-[-0.045em] sm:text-5xl">
                Tìm dự án bạn muốn ủng hộ
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft sm:mt-4 sm:text-base sm:leading-7">
                Tìm theo tên, chọn lĩnh vực hoặc xem những dự án sắp mở gọi vốn.
              </p>
            </div>
            <div className="hidden w-fit items-center gap-2 rounded-[9px] border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-muted sm:inline-flex">
              <SlidersHorizontal className="size-4 text-coral-dark" />{" "}
              {campaigns.length} dự án
            </div>
          </div>
        </div>
      </section>
      <DiscoverGrid
        campaigns={campaigns}
        snapshotAt={DEMO_SNAPSHOT_AT}
        initialQuery={params.q ?? ""}
        initialCategory={params.category ?? "Tất cả"}
        initialStatus={params.status}
        initialView={params.view}
        initialSort={params.sort}
      />
    </>
  );
}
