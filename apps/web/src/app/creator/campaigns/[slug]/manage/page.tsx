import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, FilePenLine, PackageCheck } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CreatorCampaignStageWorkspace } from "@/components/creator/creator-campaign-stage-workspace";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import {
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";

export const metadata: Metadata = {
  title: "Quản lý chiến dịch",
  description:
    "Theo dõi hồ sơ, xét duyệt và giao quà của từng chiến dịch riêng biệt.",
};

const stageCopy = {
  DRAFT: {
    eyebrow: "Bản nháp đang làm",
    title: "Hoàn thiện hồ sơ trước khi gửi duyệt.",
    detail:
      "Thông tin, câu chuyện, gói quà và nhóm cộng tác được lưu riêng cho chiến dịch này.",
  },
  IN_REVIEW: {
    eyebrow: "Đang xét duyệt",
    title: "Hồ sơ đang được quản trị viên kiểm tra.",
    detail:
      "Theo dõi đúng phiên bản đã gửi và chờ phản hồi; chưa mở nhận cam kết ở giai đoạn này.",
  },
  PRE_LAUNCH: {
    eyebrow: "Đã duyệt · chờ mở",
    title: "Kiểm tra lần cuối trước khi gọi vốn.",
    detail:
      "Hồ sơ đã qua kiểm duyệt. Chủ dự án là người quyết định thời điểm công bố chiến dịch.",
  },
  LIVE: {
    eyebrow: "Đang gọi vốn",
    title: "Chiến dịch vừa được mở trong phiên demo.",
    detail:
      "Dữ liệu cam kết sẽ bắt đầu xuất hiện khi cộng đồng thực hiện ủng hộ.",
  },
  SUCCESSFUL: {
    eyebrow: "Sau gọi vốn",
    title: "Đối soát tiền và giao quà theo từng cam kết.",
    detail:
      "Chiến dịch đã đạt mục tiêu và thu tiền. Trạng thái giao nhận được tách riêng cho từng người ủng hộ.",
  },
  FAILED: {
    eyebrow: "Đã đóng chiến dịch",
    title: "Kiểm tra việc hủy giữ hạn mức.",
    detail:
      "Chiến dịch không đạt mục tiêu nên không thu tiền và không tạo hồ sơ giao quà.",
  },
  SUSPENDED: {
    eyebrow: "Đang tạm dừng",
    title: "Đọc lý do trước khi chỉnh hồ sơ.",
    detail:
      "Các thao tác gọi vốn được khóa cho đến khi yêu cầu của quản trị viên được xử lý.",
  },
} as const;

export default async function CreatorCampaignStagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [basePortfolio, baseOperations, session, platformState] =
    await Promise.all([
      api.getCreatorPortfolio(),
      api.getCampaignOperations(slug).catch(() => null),
      getServerSession(),
      getServerPlatformPreviewState(),
    ]);
  const portfolio = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
  );
  const campaign = portfolio.campaigns.find((item) => item.slug === slug);
  if (!campaign || !baseOperations) notFound();

  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );
  const copy = stageCopy[campaign.status];
  const isSuccessful = campaign.status === "SUCCESSFUL";
  const editHref = `/creator/campaigns/new?campaign=${campaign.slug}`;

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-16">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8 sm:py-10">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="eyebrow text-[#526827]">
                {isSuccessful ? (
                  <PackageCheck className="size-4" />
                ) : (
                  <BadgeCheck className="size-4" />
                )}
                {copy.eyebrow}
              </span>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                {campaign.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                {copy.title} {copy.detail}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/creator" className="button-secondary min-h-11 px-4 text-xs">
                <ArrowLeft className="size-4" /> Danh mục chiến dịch
              </Link>
              {isSuccessful ? (
                <Link
                  href={`/creator/campaigns/${campaign.slug}/manage?tab=fulfillment`}
                  className="button-primary min-h-11 px-4 text-xs"
                >
                  <PackageCheck className="size-4" /> Mở giao quà
                </Link>
              ) : (
                <Link href={editHref} className="button-primary min-h-11 px-4 text-xs">
                  <FilePenLine className="size-4" /> Chỉnh sửa hồ sơ
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreatorCampaignStageWorkspace
        campaign={campaign}
        operations={operations}
      />
    </section>
  );
}
