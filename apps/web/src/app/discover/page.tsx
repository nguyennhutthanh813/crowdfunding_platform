import type { Metadata } from "next";
import { Compass, SlidersHorizontal } from "lucide-react";
import { DiscoverGrid } from "@/components/discover/discover-grid";
import { api } from "@/lib/api";

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
  const [campaigns, params] = await Promise.all([
    api.listCampaigns(),
    searchParams,
  ]);
  return (
    <>
      <section className="border-b border-line bg-canvas-soft py-11 sm:py-14">
        <div className="container-shell">
          <span className="eyebrow text-coral-dark">
            <Compass className="size-4" /> Khám phá dự án
          </span>
          <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
                Tìm ý tưởng bạn muốn thấy thành hiện thực.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft sm:text-base">
                Duyệt dự án đang gọi vốn, gần đạt mục tiêu hoặc chuẩn bị ra mắt.
                Gợi ý cá nhân hóa chỉ giúp bạn bắt đầu nhanh hơn; quyết định vẫn
                thuộc về bạn.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-[9px] border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-muted">
              <SlidersHorizontal className="size-4 text-coral-dark" />{" "}
              {campaigns.length} dự án
            </div>
          </div>
        </div>
      </section>
      <DiscoverGrid
        campaigns={campaigns}
        initialQuery={params.q ?? ""}
        initialCategory={params.category ?? "Tất cả"}
        initialStatus={params.status}
        initialView={params.view}
        initialSort={params.sort}
      />
    </>
  );
}
