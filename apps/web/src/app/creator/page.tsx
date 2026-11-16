import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  MessageSquareText,
  Plus,
  Rocket,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { CreatorCampaignTree } from "@/components/creator/creator-campaign-tree";
import { CreatorOnboarding } from "@/components/creator/creator-onboarding";
import { CreatorPortfolioBoard } from "@/components/creator/creator-portfolio-board";
import { CreatorStudioWorkspace } from "@/components/creator/creator-studio-workspace";
import { RoleMissionBar } from "@/components/workspace/quick-role-switcher";
import { api } from "@/lib/api";
import { buildMockCreatorPortfolio } from "@/lib/api/mock/creator-portfolio";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import {
  applyCampaignCardPreviewState,
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";
import { localDbEnabled } from "@/lib/local-db/database";

export const metadata: Metadata = {
  title: "Không gian Chủ dự án",
  description:
    "Theo dõi chiến dịch, việc cần làm, dự báo và vận hành gọi vốn trên FundViet.",
};

export default async function CreatorPage() {
  const [campaigns, prediction, baseOperations, session, platformState] =
    await Promise.all([
      api.listCampaigns(),
      api.getCreatorAiDashboard(),
      api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
      getServerSession(),
      getServerPlatformPreviewState(),
    ]);
  const basePortfolio = buildMockCreatorPortfolio(session?.user.id, session ? {
    name: session.user.name,
    initials: session.user.initials,
  } : undefined);
  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );
  const portfolioWithReviewState = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
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
        : platformState.campaignDrafts[item.id]
          ? {
              ...item,
              openTaskCount: (platformState.campaignTasks ?? []).filter((task) =>
                task.campaignId === item.id && task.status !== "DONE").length,
              teamSize: 1 + (platformState.acceptedCollaborators[item.id] ?? []).length,
            }
          : item,
    ),
  };
  const givenName = session ? getFriendlyName(session.user.name) : "bạn";

  if (session?.user.id !== "usr_hoang_linh") {
    return <CreatorOnboarding givenName={givenName} portfolio={portfolio} localDbAvailable={localDbEnabled()} />;
  }

  const baseCampaign =
    campaigns.find((item) => item.id === portfolio.activeCampaignId) ??
    campaigns.find((item) => item.id === operations.campaignId);
  if (!baseCampaign) {
    return <CreatorOnboarding givenName={givenName} portfolio={portfolio} localDbAvailable={localDbEnabled()} />;
  }
  const campaign = applyCampaignCardPreviewState(baseCampaign, platformState);
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const openTasks = operations.tasks.filter((task) => task.status !== "DONE");
  const urgentTaskCount = openTasks.filter((task) => task.priority === "HIGH").length;
  const urgentPrimaryTask =
    openTasks.find((task) => task.priority === "HIGH") ?? openTasks[0];
  const draftReview = platformState.submittedReviews.find(
    (review) => review.campaignId === "cmp_orbit_mini",
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

  const portfolioSlot = (
    <CreatorPortfolioBoard portfolio={portfolio} showTimeline={false} />
  );

  const tasksSlot = (
    <div className="space-y-5">
      <article
        id="viec-can-lam"
        className="surface-card scroll-mt-24 rounded-[20px] p-5 sm:p-6"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-[#047857]">Cần bạn xem</p>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold">
              Việc cần ưu tiên
            </h2>
          </div>
          <span className="text-xs text-ink-muted tabular-nums">
            Cập nhật lúc {operations.snapshotAt}
          </span>
        </div>
        <div className="mt-5 divide-y divide-line border-y border-line">
          {openTasks.slice(0, 3).map((task) => {
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
                ? "bg-emerald-50 text-[#047857]"
                : task.area === "FULFILLMENT"
                  ? "bg-sky-50 text-sky-700"
                  : "bg-slate-100 text-slate-700";
            return (
              <Link
                key={task.title}
                href={task.hrefByRole.creator}
                className="group flex items-start gap-4 p-4 hover:bg-canvas-soft sm:items-center"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">
                    {task.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-5 text-ink-muted">
                    {task.detail}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink-soft">
                    <span>{task.assigneeName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" /> {task.dueLabel}
                    </span>
                  </span>
                </span>
                <ArrowRight className="mt-2 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-[#047857] sm:mt-0" />
              </Link>
            );
          })}
        </div>
        {openTasks.length > 3 ? (
          <details className="group/more mt-4">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-[#047857] hover:underline [&::-webkit-details-marker]:hidden">
              <span className="group-open/more:hidden">Xem thêm {openTasks.length - 3} việc khác ↓</span>
              <span className="hidden group-open/more:inline">Thu gọn danh sách việc ↑</span>
            </summary>
            <div className="mt-3 divide-y divide-line border-t border-line">
              {openTasks.slice(3).map((task) => {
                const Icon =
                  task.area === "COMMUNITY"
                    ? MessageSquareText
                    : task.area === "FULFILLMENT"
                      ? CalendarDays
                      : task.area === "COMPLIANCE"
                        ? CheckCircle2
                        : Bell;
                return (
                  <Link
                    key={task.title}
                    href={task.hrefByRole.creator}
                    className="group flex items-start gap-4 p-3.5 hover:bg-canvas-soft sm:items-center"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{task.title}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-muted">
                        {task.assigneeName} · {task.dueLabel}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-ink-muted group-hover:text-[#047857]" />
                  </Link>
                );
              })}
            </div>
          </details>
        ) : null}
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        <details className="surface-card group/team rounded-[20px] p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="eyebrow text-[#047857]">Nhóm dự án</p>
              <h3 className="mt-1 font-display text-lg font-extrabold text-ink">
                {operations.team.length} thành viên đang tham gia
              </h3>
            </div>
            <span className="rounded-lg border border-line bg-canvas-soft px-2.5 py-1 text-[11px] font-bold text-ink-soft">
              <span className="group-open/team:hidden">Mở danh sách ↓</span>
              <span className="hidden group-open/team:inline">Thu gọn ↑</span>
            </span>
          </summary>
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            {operations.team.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#ECFDF5] text-[11px] font-extrabold text-[#047857]">
                  {member.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{member.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {member.role}
                  </p>
                </div>
                <span className="text-right text-[11px] leading-4 text-ink-muted tabular-nums">
                  {member.openTasks} việc mở
                  <br />{member.lastSeen}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/creator/campaigns/orbit-one-ca-phe-thong-minh/manage"
            className="button-secondary mt-5 w-full text-xs"
          >
            Quản lý cộng tác viên
          </Link>
        </details>

        <details className="surface-card group/handoff rounded-[20px] border-l-4 border-l-[#059669] p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#047857]">
                BÀN GIAO GẦN NHẤT · {operations.handoffs[0].at}
              </p>
              <p className="mt-1 truncate text-sm font-bold text-ink">
                {operations.handoffs[0].title}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-[#047857]">
              <span className="group-open/handoff:hidden">Chi tiết ↓</span>
              <span className="hidden group-open/handoff:inline">Thu gọn ↑</span>
            </span>
          </summary>
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[11px] font-semibold text-ink-muted">
              {operations.handoffs[0].from} → {operations.handoffs[0].to}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-ink-soft">
              {operations.handoffs[0].note}
            </p>
          </div>
        </details>
      </div>
    </div>
  );

  const ecosystemSlot = (
    <div className="space-y-5">
      <article className="rounded-[20px] border border-[#DDD6FE] bg-gradient-to-br from-[#F5F3FF] to-surface p-5 text-ink sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-[#DDD6FE] bg-surface px-4 py-2.5 text-center shadow-2xs">
              <p className="text-[11px] font-bold text-[#7C3AED]">✦ Xác suất AI</p>
              <p className="font-display text-3xl font-extrabold tracking-[-0.05em] text-[#7C3AED] tabular-nums">
                {prediction.score}%
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#7C3AED]">
                ✦ Tín hiệu dự báo AI (Mô hình SHAP)
              </p>
              <p className="mt-1 max-w-xl text-xs leading-5 text-ink-soft">
                Theo vận tốc hiện tại, hệ thống ước tính chiến dịch có thể đạt khoảng{" "}
                <strong className="tabular-nums">
                  {formatVnd(operations.funding.projectedMinAmount, true)}–{formatVnd(operations.funding.projectedMaxAmount, true)}
                </strong>
                . Dự báo mang tính tham khảo giúp tối ưu thông số.
              </p>
            </div>
          </div>
          <Link
            href="/creator/ai"
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#6D28D9]"
          >
            Mở AI Insights &amp; What-if <ArrowRight className="size-4" />
          </Link>
        </div>
      </article>
      <CreatorCampaignTree portfolio={portfolio} localDbAvailable={localDbEnabled()} />
    </div>
  );

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-16">
      <div className="border-b border-line bg-surface py-4 sm:py-5">
        <div className="container-shell flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#047857]">
              <Rocket className="size-3.5" /> Creator Studio
            </span>
            <h1 className="mt-2 max-w-3xl font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
              Chào {givenName}, bạn đang quản lý {portfolio.summary.total} chiến dịch.
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-soft sm:text-sm">
              Theo dõi danh mục chiến dịch, xử lý đầu việc ưu tiên và mô phỏng AI ngay tại một màn hình gọn gàng.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/creator/campaigns/new"
              className="button-primary min-h-10 px-4 text-xs"
            >
              <Plus className="size-4" /> Tạo chiến dịch mới
            </Link>
            <Link
              href={`/projects/${campaign.slug}`}
              className="button-secondary min-h-10 px-4 text-xs"
            >
              <Eye className="size-4" /> Xem trang công khai
            </Link>
          </div>
        </div>
      </div>

      <div className="container-shell min-w-0 pt-4">
        <RoleMissionBar role="CREATOR" />
        {draftReview ? (
          <article className="mb-4 grid gap-3 rounded-2xl border border-emerald-200 bg-[#ECFDF5]/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#047857] text-white">
                <FileCheck2 className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold text-ink">ORBIT Mini · gửi duyệt lần {draftReview.submissionVersion}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${draftDecision === "APPROVED" ? "bg-emerald-100 text-emerald-800" : draftDecision === "CHANGES" || draftDecision === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {reviewLabel.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  {draftFeedback ||
                    `Hồ sơ đạt ${draftReview.completeness}/100 và đang chờ quản trị viên xét duyệt ${draftReview.documentCount} mục nội dung.`}
                </p>
              </div>
            </div>
            <Link
              href="/creator/campaigns/new?campaign=orbit-mini-bo-pha-gon"
              className="button-secondary min-h-10 px-4 text-xs"
            >
              Mở bản nháp <ArrowRight className="size-4" />
            </Link>
          </article>
        ) : null}

        <div className="mb-4 grid min-w-0 grid-cols-2 gap-2.5 xl:grid-cols-4">
          {[
            {
              label: "Đã gây quỹ (ORBIT One)",
              value: formatVnd(campaign.pledgedAmount),
              detail: `${percent}% mục tiêu (${formatVnd(campaign.goalAmount, true)})`,
              icon: WalletCards,
              href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=overview",
              isAi: false,
            },
            {
              label: "Số người ủng hộ",
              value: `${formatNumber(campaign.backerCount)}`,
              detail: `+${formatNumber(operations.today.backerCount)} lượt mới gần nhất`,
              icon: WalletCards,
              href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
              isAi: false,
            },
            {
              label: "✦ Xác suất AI dự báo",
              value: `${prediction.score}%`,
              detail: "Mở AI Insights & What-if",
              icon: BarChart3,
              href: "/creator/ai",
              isAi: true,
            },
            {
              label: "Còn lại / Việc mở",
              value: `${campaign.daysLeft} ngày · ${openTasks.length} việc`,
              detail: `${urgentTaskCount} việc ưu tiên cao`,
              icon: CheckCircle2,
              href: "/creator#viec-can-lam",
              isAi: false,
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className={`group min-w-0 rounded-2xl border bg-surface p-3.5 transition-[border-color,transform] hover:-translate-y-0.5 ${
                  metric.isAi
                    ? "border-[#DDD6FE] bg-gradient-to-br from-[#F5F3FF]/70 to-surface hover:border-[#7C3AED]"
                    : "border-line hover:border-[#047857]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[11px] font-bold leading-4 ${metric.isAi ? "text-[#7C3AED]" : "text-ink-muted"}`}>
                    {metric.label}
                  </p>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${metric.isAi ? "bg-[#F5F3FF] text-[#7C3AED]" : "bg-[#ECFDF5] text-[#047857]"}`}>
                    <Icon className="size-4" />
                  </span>
                </div>
                <p className={`mt-2.5 font-display text-lg font-extrabold leading-tight tracking-[-0.04em] tabular-nums sm:text-xl ${metric.isAi ? "text-[#7C3AED]" : "text-ink"}`}>
                  {metric.value}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted tabular-nums">
                  {metric.detail}
                </p>
              </Link>
            );
          })}
        </div>

        <CreatorStudioWorkspace
          portfolioCount={portfolio.summary.total}
          openTaskCount={openTasks.length}
          urgentTaskCount={urgentTaskCount}
          aiScore={prediction.score}
          urgentTaskTitle={urgentPrimaryTask?.title}
          urgentTaskHref={urgentPrimaryTask?.hrefByRole.creator ?? "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage"}
          portfolioSlot={portfolioSlot}
          tasksSlot={tasksSlot}
          ecosystemSlot={ecosystemSlot}
        />
      </div>
    </section>
  );
}
