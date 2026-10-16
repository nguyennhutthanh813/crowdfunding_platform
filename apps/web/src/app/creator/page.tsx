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
  FolderKanban,
  MessageSquareText,
  Plus,
  Rocket,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { CreatorOnboarding } from "@/components/creator/creator-onboarding";
import { CreatorPortfolioBoard } from "@/components/creator/creator-portfolio-board";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleConnectionPanel } from "@/components/workspace/role-connection-panel";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import {
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Không gian Chủ dự án",
  description:
    "Theo dõi chiến dịch, việc cần làm, dự báo và vận hành gọi vốn trên Góp.",
};

export default async function CreatorPage() {
  const [campaigns, basePortfolio, prediction, baseOperations, session, platformState] =
    await Promise.all([
      api.listCampaigns(),
      api.getCreatorPortfolio(),
      api.getCreatorAiDashboard(),
      api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
      getServerSession(),
      getServerPlatformPreviewState(),
    ]);
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
        : item,
    ),
  };
  const givenName = session ? getFriendlyName(session.user.name) : "bạn";

  if (session?.user.id !== "usr_hoang_linh") {
    return <CreatorOnboarding givenName={givenName} />;
  }

  const campaign =
    campaigns.find((item) => item.id === portfolio.activeCampaignId) ??
    campaigns.find((item) => item.id === operations.campaignId);
  if (!campaign) {
    return <CreatorOnboarding givenName={givenName} />;
  }
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const openTasks = operations.tasks.filter((task) => task.status !== "DONE");
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

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-9 sm:py-11">
        <div className="container-shell flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <span className="eyebrow text-[#526827]">
              <Rocket className="size-4" /> Không gian Chủ dự án
            </span>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              Chào {givenName}, bạn đang quản lý {portfolio.summary.total} chiến dịch.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft">
              Mỗi chiến dịch có trạng thái, nhóm cộng tác và dòng tiền riêng.
              ORBIT One đang được chọn để theo dõi sát trong phiên hôm nay.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/creator/campaigns/new"
              className="button-primary min-h-11 px-4 text-xs"
            >
              <Plus className="size-4" /> Tạo chiến dịch
            </Link>
            <Link
              href={`/projects/${campaign.slug}`}
              className="button-secondary min-h-11 px-4 text-xs"
            >
              <Eye className="size-4" /> Xem trang công khai
            </Link>
          </div>
        </div>
      </div>

      <div className="container-shell min-w-0 pt-8">
        <CreatorPortfolioBoard portfolio={portfolio} />
        {draftReview ? (
          <article className="mb-5 mt-6 grid gap-4 rounded-[18px] border border-[#cbd7bd] bg-[#f4f7ed] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest text-lime">
                <FileCheck2 className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold">ORBIT Mini · bản gửi v{draftReview.submissionVersion}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${draftDecision === "APPROVED" ? "bg-emerald-100 text-emerald-800" : draftDecision === "CHANGES" || draftDecision === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {reviewLabel.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  {draftFeedback ||
                    `Hồ sơ đạt ${draftReview.completeness}/100 và đang chờ quản trị viên đọc ${draftReview.documentCount} mục nội dung.`}
                </p>
              </div>
            </div>
            <Link
              href="/creator/campaigns/new"
              className="button-secondary min-h-11 px-4 text-xs"
            >
              Mở bản nháp <ArrowRight className="size-4" />
            </Link>
          </article>
        ) : null}
        <RoleConnectionPanel
          role="CREATOR"
          eyebrow="Chiến dịch đang chọn · bốn điểm bàn giao"
          title="ORBIT đang được nối giữa ai với ai?"
          description="Mỗi cam kết đi vào cùng snapshot của chiến dịch; từ đây nhóm ORBIT nhận việc, quản trị viên theo dõi số tổng hợp và hệ thống chỉ thu tiền sau khi chiến dịch đạt mục tiêu."
          recordCode={`CMP · ${campaign.id.replace("cmp_", "").toLocaleUpperCase("vi")}`}
          steps={[
            {
              actor: "Chủ dự án + Admin",
              title: "Hồ sơ đã qua kiểm duyệt",
              detail: "Mục tiêu và hạn chót được khóa trước khi mở gọi vốn.",
              kind: "admin",
              state: "done",
            },
            {
              actor: "Cộng đồng",
              title: `${formatNumber(campaign.backerCount)} người đã cam kết`,
              detail: `${formatVnd(campaign.pledgedAmount)} đang tính vào tiến độ, chưa phải tiền được rút.`,
              kind: "money",
              state: "current",
            },
            {
              actor: `Nhóm ORBIT · ${operations.team.length} người`,
              title: `${openTasks.length} việc đang được xử lý`,
              detail: "Creator giao đúng người; Collaborator chỉ thấy phần được cấp quyền.",
              kind: "team",
              state: "current",
            },
            {
              actor: operations.funding.deadlineLabel,
              title: "Chốt All-or-Nothing",
              detail: "Đạt mục tiêu mới thu tiền và mở giao quà; không đạt thì hủy giữ hạn mức.",
              kind: "system",
              state: "next",
            },
          ]}
          action={{
            label: "Mở snapshot vận hành",
            href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=overview",
          }}
        />
        <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Đã cam kết",
              value: formatVnd(campaign.pledgedAmount),
              detail: `${percent}% mục tiêu`,
              icon: WalletCards,
              href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=overview",
            },
            {
              label: "Phát sinh hôm nay",
              value: formatVnd(operations.today.pledgedAmount, true),
              detail: `+${formatNumber(operations.today.backerCount)} người ủng hộ`,
              icon: WalletCards,
              href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
            },
            {
              label: "Dự báo đạt mục tiêu",
              value: `${prediction.score}%`,
              detail: "Cập nhật 12/09 lúc 06:00",
              icon: BarChart3,
              href: "/creator/ai",
            },
            {
              label: "Việc cần xử lý",
              value: String(openTasks.length),
              detail: `${openTasks.filter((task) => task.priority === "HIGH").length} việc ưu tiên cao`,
              icon: CheckCircle2,
              href: "/creator#viec-can-lam",
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="group min-w-0 rounded-[16px] border border-line bg-white p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-forest/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold text-ink-muted">
                    {metric.label}
                  </p>
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#edf1e3] text-forest transition-transform group-hover:scale-105">
                    <Icon className="size-4" />
                  </span>
                </div>
                <p className="mt-4 truncate font-display text-2xl font-extrabold tracking-[-0.04em]">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {metric.detail}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <article className="surface-card overflow-hidden rounded-[20px]">
              <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
                <CampaignVisual
                  {...campaign.visual}
                  compact
                  priority
                  className="min-h-60 md:min-h-full"
                />
                <div className="min-w-0 p-6 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={campaign.status} />
                    <span className="rounded-full bg-[#eef3df] px-2.5 py-1 text-[10px] font-bold text-[#587024]">
                      {campaign.daysLeft} ngày còn lại
                    </span>
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-[-0.04em]">
                    {campaign.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    {campaign.blurb}
                  </p>
                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="font-bold">
                        {formatVnd(campaign.pledgedAmount)}
                      </span>
                      <span className="text-ink-muted">
                        Mục tiêu {formatVnd(campaign.goalAmount)}
                      </span>
                    </div>
                    <ProgressBar value={percent} className="mt-2" />
                  </div>
                  <div className="mt-5 grid gap-3 border-y border-line py-4 text-xs sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-ink-muted">Còn thiếu</p>
                      <p className="mt-1 font-bold">
                        {formatVnd(operations.funding.remainingAmount, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted">Nhịp cần giữ</p>
                      <p className="mt-1 font-bold">
                        {formatVnd(operations.funding.neededPerDay, true)}/ngày
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted">Chốt chiến dịch</p>
                      <p className="mt-1 font-bold">01/10 · 23:59</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link
                      href="/creator/campaigns/orbit-one-ca-phe-thong-minh/manage"
                      className="button-dark"
                    >
                      <FolderKanban className="size-4" /> Vận hành chiến dịch
                    </Link>
                    <Link href="/creator/ai" className="button-secondary">
                      <Sparkles className="size-4" /> Xem dự báo
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            <article
              id="viec-can-lam"
              className="surface-card scroll-mt-24 rounded-[20px] p-5 sm:p-7"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow text-coral">Cần bạn xem</p>
                  <h2 className="mt-2 font-display text-2xl font-extrabold">
                    Ưu tiên của hôm nay
                  </h2>
                </div>
                <span className="text-xs text-ink-muted">
                  Chốt lúc {operations.snapshotAt}
                </span>
              </div>
              <div className="mt-6 divide-y divide-line border-y border-line">
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
                      className="group flex items-start gap-4 p-4 hover:bg-[#fafbf7] sm:items-center"
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-[10px] ${tone}`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">
                          {task.title}
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-ink-muted">
                          {task.detail}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-ink-soft">
                          <span>{task.assigneeName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3" /> {task.dueLabel}
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="mt-2 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-coral sm:mt-0" />
                    </Link>
                  );
                })}
              </div>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-[20px] border border-[#cbd7bd] bg-[#e5ecdd] p-6 text-ink sm:p-7">
              <p className="eyebrow text-[#587024]">
                <Sparkles className="size-4" /> Tín hiệu dự báo
              </p>
              <div className="mt-5 flex items-end gap-3">
                <span className="font-display text-5xl font-extrabold tracking-[-0.06em] text-forest">
                  {prediction.score}%
                </span>
                <span className="mb-1 text-xs leading-5 text-[#526159]">
                  khả năng đạt
                  <br /> mục tiêu hiện tại
                </span>
              </div>
              <p className="mt-5 text-sm leading-7 text-ink-soft">
                Nếu giữ nhịp hiện tại, hệ thống ước tính chiến dịch khép lại
                trong khoảng {formatVnd(operations.funding.projectedMinAmount, true)}–
                {formatVnd(operations.funding.projectedMaxAmount, true)}. Đây là
                dự báo, không phải số tiền chắc chắn thu được.
              </p>
              <Link
                href="/creator/ai"
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-forest hover:text-coral-dark"
              >
                Xem yếu tố ảnh hưởng <ArrowRight className="size-4" />
              </Link>
            </article>

            <article className="surface-card rounded-[20px] p-6">
              <p className="eyebrow text-coral">Nhóm dự án</p>
              <h2 className="mt-3 font-display text-xl font-extrabold">
                ORBIT hiện có {operations.team.length} thành viên
              </h2>
              <div className="mt-5 space-y-3">
                {operations.team.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-[10px] bg-[#edf0e7] text-[10px] font-extrabold text-forest">
                      {member.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{member.name}</p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {member.role}
                      </p>
                    </div>
                    <span className="text-right text-[9px] leading-4 text-ink-muted">
                      {member.openTasks} việc mở
                      <br />{member.lastSeen}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/creator/campaigns/orbit-one-ca-phe-thong-minh/manage"
                className="button-secondary mt-6 w-full text-xs"
              >
                Quản lý cộng tác viên
              </Link>
            </article>

            <article className="border-l-2 border-[#9bb56c] px-5 py-1">
              <p className="text-[10px] font-bold text-[#587024]">
                BÀN GIAO GẦN NHẤT
              </p>
              <p className="mt-2 text-sm font-bold">
                {operations.handoffs[0].title}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                {operations.handoffs[0].from} → {operations.handoffs[0].to} · {operations.handoffs[0].at}
              </p>
              <p className="mt-2 text-xs leading-5 text-ink-soft">
                {operations.handoffs[0].note}
              </p>
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}
