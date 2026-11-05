import type { Metadata } from "next";
import {
  ArrowLeft,
  BadgeCheck,
  FilePenLine,
  PackageCheck,
  AlertTriangle,
  UsersRound,
} from "lucide-react";
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
  const [session, platformState] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  const [basePortfolio, baseOperations, publicDetail] = await Promise.all([
    api.getCreatorPortfolio(
      session?.user.id,
      session?.tokens?.accessToken,
      session?.user
        ? {
            name: session.user.name,
            id: session.user.id,
            email: session.user.email,
            initials: session.user.initials,
          }
        : undefined,
    ),
    api.getCampaignOperations(slug).catch(() => null),
    api.getCampaignBySlug(slug).catch(() => null),
  ]);

  const portfolio = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
  );
  const ownedCampaign = portfolio.campaigns.find((item) => item.slug === slug);
  const isOwnerByPublicDetail = Boolean(
    session?.user?.id &&
      (publicDetail?.creator?.id === session.user.id ||
        (publicDetail as any)?.creatorId === session.user.id),
  );

  if (!ownedCampaign && !isOwnerByPublicDetail) {
    notFound();
  }

  const campaign =
    ownedCampaign ??
    (publicDetail && isOwnerByPublicDetail
      ? {
          id: publicDetail.id,
          slug: publicDetail.slug,
          title: publicDetail.title,
          blurb: publicDetail.blurb,
          category: publicDetail.category,
          location: publicDetail.location,
          status: publicDetail.status,
          ownership: "OWNER" as const,
          goalAmount: publicDetail.goalAmount,
          pledgedAmount: publicDetail.pledgedAmount,
          backerCount: publicDetail.backerCount,
          daysLeft: publicDetail.daysLeft,
          teamSize: 1,
          openTaskCount: 0,
          fundingTrend: [],
          nextAction: "OPERATE" as const,
          nextActionLabel: "Vận hành",
          nextActionDetail: "",
        }
      : null);

  if (!campaign) notFound();

  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
    campaign,
  );
  const isNeedsChanges =
    campaign.reviewStatus === "NEEDS_CHANGES" ||
    Boolean(campaign.reviewFeedback);
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
                {isNeedsChanges ? "Cần chỉnh sửa hồ sơ" : copy.eyebrow}
              </span>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                {campaign.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                {copy.title} {copy.detail}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/creator" className="button-secondary min-h-11 px-4 text-xs font-bold">
                <ArrowLeft className="size-4" /> Danh mục chiến dịch
              </Link>
              <Link
                href={`/creator/campaigns/${campaign.slug}/manage?tab=team`}
                className="button-secondary min-h-11 px-4 text-xs font-bold"
              >
                <UsersRound className="size-4" /> Đội ngũ ({operations.team.length})
              </Link>
              {isSuccessful ? (
                <Link
                  href={`/creator/campaigns/${campaign.slug}/manage?tab=fulfillment`}
                  className="button-primary min-h-11 px-4 text-xs"
                >
                  <PackageCheck className="size-4" /> Mở giao quà
                </Link>
              ) : (
                <Link
                  href={editHref}
                  className={`button-primary min-h-11 px-4 text-xs ${
                    isNeedsChanges ? "bg-red-600 hover:bg-red-700 text-white" : ""
                  }`}
                >
                  <FilePenLine className="size-4" />{" "}
                  {isNeedsChanges ? "Sửa hồ sơ theo yêu cầu" : "Chỉnh sửa hồ sơ"}
                </Link>
              )}
            </div>
          </div>

          {isNeedsChanges ? (
            <div className="mt-6 flex items-start gap-3.5 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-ink shadow-sm">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-sm">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-red-950 text-sm">
                  Ban quản trị yêu cầu chỉnh sửa thông tin hồ sơ
                </p>
                <p className="mt-1 text-xs leading-relaxed text-red-900 font-medium italic">
                  &quot;{campaign.reviewFeedback || "Vui lòng cập nhật bổ sung hồ sơ theo các ghi chú của ban quản trị."}&quot;
                </p>
                <div className="mt-3">
                  <Link
                    href={editHref}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow transition hover:bg-red-700"
                  >
                    <FilePenLine className="size-3.5" /> Chỉnh sửa hồ sơ ngay
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <CreatorCampaignStageWorkspace
        campaign={campaign}
        operations={operations}
      />
    </section>
  );
}
