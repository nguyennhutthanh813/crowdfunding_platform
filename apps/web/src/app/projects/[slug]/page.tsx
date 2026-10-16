import type { Metadata } from "next";
import {
  BadgeCheck,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { NotifyButton } from "@/components/notify-button";
import { ProjectActions } from "@/components/campaign/project-actions";
import { ProjectExperience } from "@/components/campaign/project-experience";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

export async function generateStaticParams() {
  const campaigns = await api.listCampaigns();
  return campaigns.map((campaign) => ({ slug: campaign.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await api.getCampaignBySlug(slug);
  if (!campaign) return { title: "Không tìm thấy dự án" };
  return { title: campaign.title, description: campaign.blurb };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const campaign = await api.getCampaignBySlug(slug);
  if (!campaign) notFound();
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const isPreLaunch = campaign.status === "PRE_LAUNCH";
  const canPledge = campaign.status === "LIVE";
  const isSuccessful = campaign.status === "SUCCESSFUL";
  const isFailed = campaign.status === "FAILED";
  const launchDate = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(campaign.launchDate));
  const shortLaunchDate = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(campaign.launchDate));

  return (
    <>
      <section className="border-b border-line bg-canvas-soft pb-12 pt-7 sm:pt-9">
        <div className="container-shell">
          <nav
            aria-label="Đường dẫn trang"
            className="flex flex-wrap items-center gap-2 text-xs text-ink-muted"
          >
            <Link href="/discover" className="hover:text-coral-dark">
              Khám phá
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/discover?category=${encodeURIComponent(campaign.category)}`}
              className="hover:text-coral-dark"
            >
              {campaign.category}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              {campaign.visual.label}
            </span>
          </nav>
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={campaign.status} />
                <span className="rounded-[8px] border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink-soft">
                  Góp chọn
                </span>
              </div>
              <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.35rem,4.4vw,3.75rem)] font-extrabold leading-[1.07] tracking-[-0.05em]">
                {campaign.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
                {campaign.blurb}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-coral" /> {campaign.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-coral" />{" "}
                  {campaign.creator.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-coral" />
                  {isPreLaunch ? "Dự kiến mở" : "Mở ngày"} {launchDate}
                </span>
              </div>
            </div>
            <div className="lg:pt-1">
              <ProjectActions campaignId={campaign.id} />
            </div>
          </div>

          <div className="mt-9 grid gap-6 lg:grid-cols-[1.48fr_0.72fr] lg:items-stretch">
            <CampaignVisual
              {...campaign.visual}
              priority
              className="aspect-[16/10] rounded-[20px] border border-line"
            />
            <aside className="flex flex-col justify-between rounded-[20px] border border-line bg-white p-6 sm:p-7">
              <div>
                <p className="font-display text-3xl font-extrabold tracking-[-0.045em] text-coral-dark sm:text-4xl">
                  {formatVnd(campaign.pledgedAmount, true)}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  đã cam kết trên mục tiêu{" "}
                  {formatVnd(campaign.goalAmount, true)}
                </p>
                <ProgressBar value={percent} className="mt-5 h-2.5" />
                <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-5">
                  <div className="flex flex-col">
                    <dt className="mt-1 text-xs text-ink-muted">mục tiêu</dt>
                    <dd className="order-first font-display text-xl font-extrabold">
                      {percent}%
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="mt-1 text-xs text-ink-muted">
                      người ủng hộ
                    </dt>
                    <dd className="order-first font-display text-xl font-extrabold">
                      {formatNumber(campaign.backerCount)}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="mt-1 text-xs text-ink-muted">
                      {isPreLaunch ? "ngày dự kiến mở" : "ngày còn"}
                    </dt>
                    <dd className="order-first font-display text-xl font-extrabold">
                      {isPreLaunch ? shortLaunchDate : campaign.daysLeft}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 flex items-start gap-3 rounded-[10px] border-l-2 border-[#9eb24e] bg-[#f2f5e9] p-4 text-xs leading-5 text-[#4a5f2d]">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {isPreLaunch ? (
                      <>
                        <strong>Đang xem trước:</strong> dự án chưa nhận cam kết
                        ủng hộ. Bạn có thể đăng ký để được nhắc khi nhóm mở.
                      </>
                    ) : canPledge ? (
                      <>
                        <strong>All-or-Nothing:</strong> thẻ chỉ được giữ hạn
                        mức. Khoản tiền chỉ được thu khi dự án đạt mục tiêu lúc
                        kết thúc.
                      </>
                    ) : isSuccessful ? (
                      <>
                        <strong>Đã đạt mục tiêu:</strong> các cam kết hợp lệ đã
                        được thu và nhóm đang thực hiện kế hoạch sản xuất, giao
                        quà.
                      </>
                    ) : isFailed ? (
                      <>
                        <strong>Không đạt mục tiêu:</strong> toàn bộ ủy quyền đã
                        được hủy, người ủng hộ không bị thu tiền.
                      </>
                    ) : (
                      <>
                        <strong>Đã khép lại:</strong> chiến dịch không nhận thêm
                        cam kết mới.
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-6">
                {isPreLaunch ? (
                  <NotifyButton campaignId={campaign.id} fullWidth />
                ) : canPledge ? (
                  <Link
                    href={`/projects/${campaign.slug}?tab=rewards#noi-dung-du-an`}
                    className="button-primary w-full"
                  >
                    Chọn gói ủng hộ
                  </Link>
                ) : (
                  <p className="rounded-[12px] bg-forest px-5 py-3 text-center text-xs font-bold text-white">
                    {isSuccessful
                      ? "Đã gọi vốn thành công"
                      : isFailed
                        ? "Đã kết thúc · không thu tiền"
                        : "Chiến dịch đã kết thúc"}
                  </p>
                )}
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
                <Users className="size-3.5" />
                {isPreLaunch
                  ? "Đăng ký nhắc có thể tắt bất cứ lúc nào"
                  : canPledge
                    ? "Xem lại đầy đủ chi phí trước khi xác nhận"
                    : isSuccessful
                      ? "Theo dõi cập nhật sản xuất và tiến độ giao quà"
                      : isFailed
                        ? "Cam kết đã hủy theo nguyên tắc All-or-Nothing"
                        : "Không còn nhận cam kết mới"}
              </p>
            </aside>
          </div>
        </div>
      </section>
      <ProjectExperience
        key={query.tab ?? "story"}
        campaign={campaign}
        initialTab={query.tab}
      />
    </>
  );
}
