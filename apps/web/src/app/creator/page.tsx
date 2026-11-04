import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { CreatorCampaignsWorkspace } from "@/components/creator/creator-campaigns-workspace";
import { CreatorOnboarding } from "@/components/creator/creator-onboarding";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import {
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý chiến dịch | Chủ dự án",
  description:
    "Quản lý danh mục chiến dịch gọi vốn, theo dõi tiến độ xét duyệt và vận hành dự án trên Góp.",
};

export default async function CreatorPage() {
  const [session, platformState] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  const basePortfolio = await api.getCreatorPortfolio(
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
  );

  const portfolioWithReviewState = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
  );

  const activeCampaignSlug =
    portfolioWithReviewState.campaigns.find(
      (c) => c.id === portfolioWithReviewState.activeCampaignId,
    )?.slug ?? portfolioWithReviewState.campaigns[0]?.slug;

  const [campaigns, baseOperations] = await Promise.all([
    api.listCampaigns(),
    activeCampaignSlug
      ? api.getCampaignOperations(activeCampaignSlug).catch(() => null)
      : null,
  ]);

  const campaign =
    (activeCampaignSlug
      ? campaigns.find((item) => item.slug === activeCampaignSlug)
      : null) ??
    (portfolioWithReviewState.campaigns.length > 0
      ? campaigns.find(
          (item) => item.id === portfolioWithReviewState.campaigns[0].id,
        ) ?? portfolioWithReviewState.campaigns[0]
      : null) ??
    campaigns[0];

  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
    campaign,
  );

  const portfolio = {
    ...portfolioWithReviewState,
    campaigns: portfolioWithReviewState.campaigns.map((item) =>
      item.id === operations.campaignId
        ? {
            ...item,
            openTaskCount: operations.tasks.filter(
              (task) => task.status !== "DONE",
            ).length,
            teamSize: operations.team.length,
          }
        : item,
    ),
  };
  const givenName = session ? getFriendlyName(session.user.name) : "bạn";

  const draftReview = platformState.submittedReviews.find(
    (review) =>
      (campaign && review.campaignId === campaign.id) ||
      (campaign &&
        review.title.toLowerCase().trim() ===
          campaign.title.toLowerCase().trim()),
  );
  const draftDecision = draftReview
    ? platformState.reviewDecisions[draftReview.id]
    : undefined;
  const draftFeedback = draftReview
    ? platformState.reviewFeedback[draftReview.id]
    : undefined;
  const reviewLabel =
    draftDecision === "APPROVED"
      ? "Đã được duyệt"
      : draftDecision === "CHANGES"
        ? "Cần chỉnh sửa"
        : draftDecision === "REJECTED"
          ? "Đã bị từ chối"
          : "Đang chờ duyệt";

  if (!campaign || portfolio.campaigns.length === 0) {
    return (
      <CreatorOnboarding
        givenName={givenName}
        submittedTitle={draftReview?.title}
        reviewStatus={draftReview ? reviewLabel : undefined}
      />
    );
  }

  const openTasks = operations.tasks.filter((task) => task.status !== "DONE");

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-24">
      {/* Clean Management Header */}
      <div className="border-b border-line bg-white py-6">
        <div className="container-shell flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-[-0.035em] text-forest sm:text-3xl">
              Chiến dịch của tôi
            </h1>
            <p className="mt-1 text-xs text-ink-muted sm:text-sm">
              Quản lý danh mục chiến dịch gọi vốn, theo dõi tiến độ xét duyệt và
              thực hiện các thao tác vận hành.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/creator/campaigns/new"
              className="button-primary min-h-11 px-5 text-xs font-bold shadow-sm"
            >
              <Plus className="size-4" /> Thêm chiến dịch mới
            </Link>
          </div>
        </div>
      </div>

      <div className="container-shell min-w-0 pt-7">
        {/* Admin Review Feedback Alert if feedback is present */}
        {draftReview && (draftFeedback || draftDecision === "CHANGES") ? (
          <article className="mb-6 flex items-start justify-between gap-4 rounded-[18px] border border-amber-300 bg-amber-50/90 p-5 sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-600 text-white">
                <FileCheck2 className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold text-amber-950">
                    Phản hồi từ ban quản trị cho {draftReview.title}
                  </p>
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                    {reviewLabel.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-amber-900/90">
                  {draftFeedback ||
                    "Hồ sơ cần cập nhật thêm một số thông tin trước khi mở gọi vốn chính thức."}
                </p>
              </div>
            </div>
            <Link
              href={`/creator/campaigns/new?campaign=${campaign.slug}`}
              className="button-secondary min-h-10 shrink-0 px-4 text-xs font-bold"
            >
              Chỉnh sửa hồ sơ <ArrowRight className="size-4" />
            </Link>
          </article>
        ) : null}

        {/* The Interactive Campaign Workspace (Filters + Distinct Cards Grid) */}
        <CreatorCampaignsWorkspace
          portfolio={portfolio}
          tasksCount={openTasks.length}
        />

        {/* Tasks Section if open tasks exist */}
        {openTasks.length > 0 ? (
          <article className="mt-10 rounded-[20px] border border-line bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-xl font-extrabold text-ink">
                  Việc cần xử lý hôm nay ({openTasks.length})
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Các nhiệm vụ ưu tiên thuộc chiến dịch đang vận hành
                </p>
              </div>
              <span className="text-xs text-ink-muted">
                Cập nhật lúc {operations.snapshotAt}
              </span>
            </div>

            <div className="mt-5 divide-y divide-line border-t border-line">
              {openTasks.map((task) => {
                const Icon =
                  task.area === "COMMUNITY"
                    ? MessageSquareText
                    : task.area === "FULFILLMENT"
                      ? CalendarDays
                      : task.area === "COMPLIANCE"
                        ? CheckCircle2
                        : Bell;
                const tone =
                  task.priority === "HIGH"
                    ? "bg-[#fff1eb] text-coral-dark"
                    : task.area === "FULFILLMENT"
                      ? "bg-[#e9f1f7] text-[#35698c]"
                      : "bg-[#eef2df] text-[#607324]";

                return (
                  <Link
                    key={task.title}
                    href={task.hrefByRole.creator}
                    className="group flex items-start gap-4 py-4 px-2 hover:bg-[#fafbf7] rounded-xl transition-colors sm:items-center"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink group-hover:text-forest">
                        {task.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-ink-muted">
                        {task.detail}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink-soft">
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px]">
                          {task.assigneeName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3 text-ink-muted" />{" "}
                          {task.dueLabel}
                        </span>
                        {task.priority === "HIGH" ? (
                          <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[9px] font-bold text-coral-dark">
                            ƯU TIÊN CAO
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ArrowRight className="mt-2 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-coral sm:mt-0" />
                  </Link>
                );
              })}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function MessageSquareText(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M13 8H7" />
      <path d="M17 12H7" />
    </svg>
  );
}
