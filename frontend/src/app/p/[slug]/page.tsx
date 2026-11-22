import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  HeartHandshake,
  Lock,
  MapPin,
  MessageSquare,
  Newspaper,
  Package,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { getViewer } from "@/server/auth/session";
import { PUBLIC_STATUSES, hasSystemPerm } from "@/server/rbac/rbac";
import { getProjectDetail } from "@/server/queries/public";
import { ProjectCard } from "@/components/project/project-card";
import { FollowButton, SaveButton } from "@/components/project/social-buttons";
import { CountUp } from "@/components/fx/motion";
import { ButtonLink } from "@/components/ui/button";
import { FundingBar } from "@/components/ui/funding-bar";
import { EmptyState, StatCard } from "@/components/ui/layout-bits";
import { Avatar, Badge, Divider, PledgeStatusBadge, ProjectStatusBadge, RoleBadge, Skeleton } from "@/components/ui/primitives";
import { LinkTabs, type TabItem } from "@/components/ui/tabs";
import { CommentsSection } from "@/components/public/comments-section";
import { CommunityChart } from "@/components/public/community-chart";
import { HeroMedia, ReportDialog, ShareButton, ViewTracker } from "@/components/public/project-hero-actions";
import { SmartImage, VideoFrame } from "@/components/public/smart-image";
import { PROJECT_STATUS } from "@/lib/status";
import {
  COUNTRY_NAMES,
  flagOf,
  formatCompactVnd,
  formatDate,
  formatVnd,
  percentOf,
  timeAgo,
  timeLeft,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

type TabKey = "campaign" | "rewards" | "creator" | "faq" | "updates" | "comments" | "community";
const VALID_TABS: TabKey[] = ["campaign", "rewards", "creator", "faq", "updates", "comments", "community"];

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getProjectDetail(slug);
  if (!detail) {
    return { title: "Không tìm thấy dự án" };
  }
  return {
    title: detail.project.title,
    description: detail.project.blurb || `${detail.project.title} trên FundViet`,
  };
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const rawTab = typeof sp.tab === "string" ? sp.tab : "campaign";
  const tab: TabKey = VALID_TABS.includes(rawTab as TabKey) ? (rawTab as TabKey) : "campaign";

  const [viewer, detail] = await Promise.all([getViewer(), getProjectDetail(slug)]);
  if (!detail) notFound();

  const {
    project,
    ctx,
    blocker,
    counts,
    statusNote,
    sections,
    tiers,
    addOns,
    faqs,
    updates,
    comments,
    community,
    creator: creatorInfo,
    saved: savedSet,
  } = detail;

  const isEnded = ["SUCCESS", "FAILED", "FULFILLING", "COMPLETED"].includes(project.status);
  const showFundingBar = project.status === "LIVE" || project.status === "SCHEDULED";
  const isPublicComments =
    (PUBLIC_STATUSES as readonly string[]).includes(project.status) &&
    (project.status !== "SCHEDULED" || project.is_preview_public === 1);

  const pct = percentOf(project.pledged_amount, project.goal_amount);
  const left = timeLeft(project.end_at);

  const showSave = !viewer || hasSystemPerm(viewer, "project.save");
  const showFollow = (!viewer || hasSystemPerm(viewer, "user.follow")) && viewer?.id !== project.creator_id;
  const showMessage = (!viewer || hasSystemPerm(viewer, "message.send")) && viewer?.id !== project.creator_id;
  const canReport = Boolean(viewer && hasSystemPerm(viewer, "report.create") && !ctx.isMember);

  const tabs: TabItem[] = [
    { key: "campaign", label: "Chiến dịch" },
    { key: "rewards", label: "Phần quà", count: counts.tiers },
    { key: "creator", label: "Chủ dự án" },
    { key: "faq", label: "Hỏi đáp", count: counts.faqs },
    { key: "updates", label: "Cập nhật", count: counts.updates },
    { key: "comments", label: "Bình luận", count: counts.comments },
    { key: "community", label: "Cộng đồng", count: counts.backers },
  ];

  // Thẻ trạng thái hoàn thành / tiến độ (dùng chung cho desktop sidebar và mobile)
  const renderFundingBlock = () => (
    <div className="space-y-4">
      {showFundingBar && (
        <>
          <div>
            <div className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              <CountUp value={project.pledged_amount} format="vnd" />
            </div>
            <div className="mt-1 text-sm text-muted">
              đã được góp trên mục tiêu <b className="text-fg">{formatVnd(project.goal_amount)}</b> ({pct}%)
            </div>
          </div>

          <FundingBar percent={pct} size="lg" />

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2/70 p-3.5">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Users className="size-3.5" /> Người ủng hộ
              </div>
              <div className="mt-0.5 text-lg font-extrabold tabular-nums">
                {project.backers_count.toLocaleString("vi-VN")}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Clock className="size-3.5" /> {project.status === "SCHEDULED" ? "Ngày mở" : "Thời hạn"}
              </div>
              <div className="mt-0.5 text-lg font-extrabold">
                {project.status === "SCHEDULED" ? formatDate(project.start_at) : left.label}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dự án đã kết thúc -> Ẩn thanh tiến trình, hiển thị theo completed_display */}
      {isEnded && (
        <CompletedDisplayCard
          project={project}
          pct={pct}
          updates={updates}
          hasPledge={ctx.hasPledge}
          isMember={ctx.isMember}
        />
      )}

      {/* CTA chính */}
      <div className="space-y-2.5 pt-1">
        {blocker === null ? (
          <ButtonLink
            href={`/p/${project.slug}/back${ctx.pledge?.status === "AUTHORIZED" ? "?change=1" : ""}`}
            size="lg"
            className="w-full"
          >
            <Wallet className="size-5" />
            {ctx.pledge?.status === "AUTHORIZED" ? "Đổi mức góp vốn" : "Góp vốn ngay"}
          </ButtonLink>
        ) : blocker === "LOGIN" ? (
          <ButtonLink
            href={`/login?next=${encodeURIComponent(`/p/${project.slug}/back`)}`}
            size="lg"
            className="w-full"
          >
            Đăng nhập để góp vốn
          </ButtonLink>
        ) : (
          <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center text-sm font-semibold text-muted">
            {blocker}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {showSave && <SaveButton projectId={project.id} saved={ctx.saved} variant="full" className="flex-1" />}
          <ShareButton title={project.title} className="flex-1" />
        </div>

        {(canReport || !viewer) && (
          <div className="flex justify-center pt-1">
            <ReportDialog
              targetType="PROJECT"
              projectId={project.id}
              targetLabel={project.title}
              canReport={canReport}
              isGuest={!viewer}
            />
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-3 py-2.5 text-xs text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        <span>
          <b className="text-fg">Chỉ thu tiền khi đạt mục tiêu:</b> Bạn chỉ bị trừ tiền nếu chiến dịch đạt 100% mục tiêu trước{" "}
          {formatDate(project.end_at, true)}.
        </span>
      </div>
    </div>
  );

  const renderHeaderBlock = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href="/explore" className="hover:text-fg">
          Khám phá
        </Link>
        <span>/</span>
        <Link
          href={`/explore?category=${project.category_slug}`}
          className="font-semibold hover:text-fg"
          style={{ color: project.category_color }}
        >
          {project.category_name}
        </Link>
        <span className="ml-auto">
          <ProjectStatusBadge status={project.status} />
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-balance sm:text-3xl">{project.title}</h1>
        {project.blurb && <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{project.blurb}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2/50 p-3">
        <Link href={`/u/${project.creator_username}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar name={project.creator_name} src={project.creator_avatar} size={38} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-bold">{project.creator_name}</span>
              <RoleBadge role="CREATOR" />
            </div>
            <div className="text-xs text-muted">
              @{project.creator_username}
              {project.creator_province ? ` · ${project.creator_province}` : ""}
            </div>
          </div>
        </Link>
        {showFollow && <FollowButton userId={project.creator_id} following={ctx.followingCreator} size="sm" />}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-32 pt-6 sm:px-6 sm:pt-8 md:pb-8">
      <ViewTracker projectId={project.id} />

      {/* ───────── BANNERS NGỮ CẢNH ───────── */}
      <div className="space-y-3">
        {ctx.isMember && (
          <div className="card flex flex-col gap-3 border-amber-500/30 bg-amber-500/8 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm">
              <RoleBadge role={ctx.role!} />
              <span>
                Bạn là <b>{ctx.role === "CREATOR" ? "Chủ dự án" : "Cộng tác viên"}</b> của dự án này.
              </span>
            </div>
            <ButtonLink href={`/studio/${project.slug}`} variant="secondary" size="sm">
              Quản lý trong Studio
            </ButtonLink>
          </div>
        )}

        {project.status === "SCHEDULED" && (
          <div className="card flex flex-col gap-2 border-sky-500/35 bg-sky-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <Eye className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
              <div>
                <div className="font-bold text-sky-800 dark:text-sky-200">
                  Bản xem trước – mở góp vốn ngày {formatDate(project.start_at, true)}
                </div>
                <p className="text-muted">
                  Bạn có thể đọc câu chuyện, xem các mức quà và lưu dự án để nhận thông báo khi chính thức mở góp vốn.
                </p>
              </div>
            </div>
          </div>
        )}

        {["DRAFT", "PENDING_REVIEW", "REJECTED", "SUSPENDED", "CANCELLED"].includes(project.status) && (
          <div className="card flex items-start gap-3 border-rose-500/35 bg-rose-500/8 p-4 text-sm">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-500" />
            <div>
              <div className="font-bold">
                Trạng thái nội bộ: {PROJECT_STATUS[project.status]?.label ?? project.status}
              </div>
              <p className="mt-0.5 text-muted">
                {PROJECT_STATUS[project.status]?.hint}. Trang này hiện chỉ hiển thị cho nhóm dự án và Quản trị viên.
              </p>
              {statusNote && (
                <p className="mt-1.5 rounded-xl bg-surface px-3 py-2 text-xs text-fg">
                  <b>Ghi chú kiểm duyệt:</b> {statusNote}
                </p>
              )}
            </div>
          </div>
        )}

        {ctx.pledge && (
          <div className="card flex flex-col gap-3 border-emerald-500/35 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                {ctx.pledge.status === "AUTHORIZED" ? (
                  <>
                    Bạn đã góp <b>{formatVnd(ctx.pledge.total_amount)}</b>
                    {ctx.pledge.tier_title ? ` (${ctx.pledge.tier_title})` : ""} — Đổi / xem tại Của tôi
                  </>
                ) : (
                  <>
                    Khoản góp vốn của bạn: <b>{formatVnd(ctx.pledge.total_amount)}</b> ({ctx.pledge.code})
                  </>
                )}
              </span>
              <PledgeStatusBadge status={ctx.pledge.status} />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {ctx.pledge.status === "AUTHORIZED" && blocker === null && (
                <ButtonLink href={`/p/${project.slug}/back?change=1`} variant="outline" size="xs">
                  Đổi mức góp
                </ButtonLink>
              )}
              <ButtonLink href="/me/backed" variant="secondary" size="xs">
                Xem tại Của tôi
              </ButtonLink>
            </div>
          </div>
        )}
      </div>

      {/* ───────── BỐ CỤC CHÍNH (HERO + TABS + SIDEBAR STICKY) ───────── */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* Cột trái: Media -> (Mobile Funding Card) -> Tabs -> Tab Content */}
        <div className="min-w-0 space-y-6">
          <HeroMedia
            coverUrl={project.cover_url}
            videoUrl={project.video_url}
            title={project.title}
            categoryName={project.category_name}
            categoryColor={project.category_color}
          />

          {/* Thẻ thông tin & góp vốn trên mobile (< lg) */}
          <div className="card space-y-5 p-5 lg:hidden">
            {renderHeaderBlock()}
            <Divider />
            {renderFundingBlock()}
          </div>

          {/* Thanh 7 Tabs */}
          <div className="card p-2">
            <Suspense fallback={<Skeleton className="h-10 w-full" />}>
              <LinkTabs items={tabs} active={tab} id="project-tabs" />
            </Suspense>
          </div>

          {/* ───────── NỘI DUNG TAB ───────── */}
          {tab === "campaign" && (
            <div className="space-y-6">
              {sections.length === 0 ? (
                <EmptyState compact title="Chưa có nội dung chiến dịch" description="Chủ dự án đang hoàn thiện phần mô tả." />
              ) : (
                sections.map((sec) => (
                  <article key={sec.id} className="card space-y-3 p-5 sm:p-6">
                    {sec.heading && <h2 className="text-xl font-extrabold tracking-tight">{sec.heading}</h2>}
                    {sec.kind === "TEXT" && <div className="prose-fv text-sm text-fg/90 sm:text-base">{sec.body}</div>}
                    {sec.kind === "IMAGE" && sec.media_url && (
                      <figure className="space-y-2">
                        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2">
                          <SmartImage
                            src={sec.media_url}
                            alt={sec.heading || project.title}
                            width={1200}
                            height={720}
                            className="h-auto w-full object-cover"
                          />
                        </div>
                        {sec.body && <figcaption className="text-xs text-muted">{sec.body}</figcaption>}
                      </figure>
                    )}
                    {sec.kind === "VIDEO" && sec.media_url && (
                      <div className="space-y-2">
                        <VideoFrame url={sec.media_url} title={sec.heading || project.title} />
                        {sec.body && <p className="text-xs text-muted">{sec.body}</p>}
                      </div>
                    )}
                  </article>
                ))
              )}

              {/* Rủi ro & thách thức */}
              {project.risks && (
                <details open className="card group p-5 sm:p-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-extrabold">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-amber-500" /> Rủi ro & thách thức
                    </span>
                    <ChevronDown className="size-5 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="prose-fv mt-3 text-sm text-muted sm:text-base">{project.risks}</p>
                </details>
              )}

              {/* Gợi ý nhanh các mức quà cuối phần chiến dịch */}
              {tiers.length > 0 && (
                <div className="card space-y-4 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-extrabold">Các mức quà nổi bật</h2>
                    <Link
                      href={`/p/${project.slug}?tab=rewards`}
                      className="text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
                    >
                      Xem tất cả ({tiers.length}) →
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tiers.slice(0, 4).map((t) => {
                      const soldOut = t.remaining === 0;
                      const canChoose = !soldOut && (blocker === null || blocker === "LOGIN");
                      return (
                        <div key={t.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-surface-2/50 p-4">
                          <div>
                            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              {formatVnd(t.amount)}
                            </div>
                            <div className="mt-0.5 font-bold">{t.title}</div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted">{t.description}</p>
                          </div>
                          {canChoose ? (
                            <ButtonLink
                              href={
                                blocker === "LOGIN"
                                  ? `/login?next=${encodeURIComponent(`/p/${project.slug}/back?tier=${t.id}`)}`
                                  : `/p/${project.slug}/back?tier=${t.id}`
                              }
                              size="sm"
                              variant="outline"
                              className="w-full"
                            >
                              Chọn mức này
                            </ButtonLink>
                          ) : (
                            <span className="text-xs font-semibold text-muted">
                              {soldOut ? "Đã hết suất" : "Không thể chọn lúc này"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "rewards" && (
            <div className="space-y-6">
              {/* Góp không nhận quà */}
              <div className="card flex flex-col justify-between gap-4 border-violet-500/25 bg-violet-500/5 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2 text-lg font-extrabold">
                    <HeartHandshake className="size-5 text-violet-500" /> Góp vốn không nhận quà
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Ủng hộ dự án với số tiền tuỳ chọn (từ 10.000đ) để góp phần giúp ý tưởng thành hiện thực.
                  </p>
                </div>
                {(blocker === null || blocker === "LOGIN") && (
                  <ButtonLink
                    href={
                      blocker === "LOGIN"
                        ? `/login?next=${encodeURIComponent(`/p/${project.slug}/back?tier=none`)}`
                        : `/p/${project.slug}/back?tier=none`
                    }
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    Góp không nhận quà
                  </ButtonLink>
                )}
              </div>

              {/* Danh sách mức quà */}
              {tiers.length === 0 ? (
                <EmptyState compact title="Chưa có mức quà nào" description="Bạn vẫn có thể góp vốn không nhận quà." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {tiers.map((t) => {
                    const soldOut = t.remaining === 0;
                    const canChoose = !soldOut && (blocker === null || blocker === "LOGIN");
                    return (
                      <div key={t.id} className="card flex flex-col justify-between gap-4 p-5">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                {formatVnd(t.amount)}
                              </div>
                              <h3 className="mt-0.5 text-base font-extrabold">{t.title}</h3>
                            </div>
                            {t.quantity_limit !== null && (
                              <Badge tone={soldOut ? "rose" : "amber"}>
                                {soldOut ? "Hết suất" : `Còn ${t.remaining}/${t.quantity_limit}`}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted">{t.description}</p>

                          {t.items.length > 0 && (
                            <div className="space-y-1 rounded-xl bg-surface-2/60 p-3 text-xs">
                              <div className="font-bold text-muted">Bao gồm:</div>
                              <ul className="space-y-1">
                                {t.items.map((it) => (
                                  <li key={it.name} className="flex items-center gap-1.5 font-medium">
                                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                                    {it.quantity > 1 ? `${it.quantity} × ` : ""}
                                    {it.name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs text-muted">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1">
                              <Clock className="size-3.5" /> Giao dự kiến: <b className="text-fg">{t.estimated_delivery}</b>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1">
                              <Truck className="size-3.5" />
                              {t.ships_physical === 1 ? `Phí ship ${formatVnd(t.shipping_fee)}` : "Quà số"}
                            </span>
                          </div>
                        </div>

                        {canChoose ? (
                          <ButtonLink
                            href={
                              blocker === "LOGIN"
                                ? `/login?next=${encodeURIComponent(`/p/${project.slug}/back?tier=${t.id}`)}`
                                : `/p/${project.slug}/back?tier=${t.id}`
                            }
                            size="md"
                            className="w-full"
                          >
                            Chọn mức này
                          </ButtonLink>
                        ) : (
                          <div className="rounded-xl bg-surface-2 py-2.5 text-center text-xs font-semibold text-muted">
                            {soldOut ? "Mức quà này đã hết suất" : "Không khả dụng lúc này"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add-on mua kèm */}
              {addOns.length > 0 && (
                <div className="card space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <Package className="size-5 text-violet-500" />
                    <h2 className="text-lg font-extrabold">Quà kèm tuỳ chọn</h2>
                  </div>
                  <p className="text-sm text-muted">
                    Có thể chọn mua thêm ở Bước 2 khi bạn chọn mức quà tương thích.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addOns.map((a) => (
                      <div key={a.id} className="rounded-2xl border border-line bg-surface-2/50 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold">{a.title}</div>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {formatVnd(a.price)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">{a.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                          <span>Tối đa {a.max_per_pledge}/lần góp</span>
                          {a.left !== null && <span>· Còn {a.left}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "creator" && creatorInfo && (
            <div className="space-y-6">
              <div className="card space-y-5 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar name={project.creator_name} src={project.creator_avatar} size={64} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black">{project.creator_name}</h2>
                        <RoleBadge role="CREATOR" />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <span>@{project.creator_username}</span>
                        {(project.creator_province || project.creator_country) && (
                          <span className="inline-flex items-center gap-1">
                            · <MapPin className="size-3.5" />
                            {[project.creator_province, COUNTRY_NAMES[project.creator_country] ?? project.creator_country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                      {project.creator_bio && (
                        <p className="mt-3 text-sm leading-relaxed text-fg/90">{project.creator_bio}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {showFollow && (
                      <FollowButton userId={project.creator_id} following={ctx.followingCreator} size="md" />
                    )}
                    {showMessage && (
                      <ButtonLink
                        href={
                          viewer
                            ? `/me/messages/new?to=${encodeURIComponent(project.creator_username)}&project=${encodeURIComponent(project.slug)}`
                            : `/login?next=${encodeURIComponent(`/me/messages/new?to=${project.creator_username}&project=${project.slug}`)}`
                        }
                        variant="outline"
                        size="md"
                      >
                        <MessageSquare className="size-4" /> Nhắn tin
                      </ButtonLink>
                    )}
                    <ButtonLink href={`/u/${project.creator_username}`} variant="ghost" size="md">
                      Xem hồ sơ →
                    </ButtonLink>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Dự án đã mở" value={creatorInfo.stats.projects} tone="violet" />
                  <StatCard label="Thành công" value={creatorInfo.stats.success} tone="emerald" />
                  <StatCard label="Tổng vốn gọi được" value={formatCompactVnd(creatorInfo.stats.raised)} tone="amber" />
                  <StatCard label="Người theo dõi" value={creatorInfo.stats.followers} tone="sky" />
                </div>
              </div>

              {creatorInfo.others.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-extrabold">Dự án khác của {project.creator_name}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {creatorInfo.others.map((o) => (
                      <ProjectCard key={o.id} p={o} saved={savedSet.has(o.id)} showSave={showSave} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "faq" && (
            <div className="space-y-3">
              {faqs.length === 0 ? (
                <EmptyState
                  compact
                  title="Chưa có câu hỏi thường gặp"
                  description="Bạn có thể đặt câu hỏi ở tab Bình luận hoặc nhắn tin trực tiếp cho chủ dự án."
                />
              ) : (
                faqs.map((f, i) => (
                  <details key={f.id} open={i === 0} className="card group p-4 sm:p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-bold">
                      <span>{f.question}</span>
                      <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="prose-fv mt-3 text-sm text-muted sm:text-base">{f.answer}</p>
                  </details>
                ))
              )}
            </div>
          )}

          {tab === "updates" && (
            <div className="space-y-4">
              {updates.length === 0 ? (
                <EmptyState
                  compact
                  title="Chưa có bản tin cập nhật nào"
                  description="Lưu dự án hoặc quay lại sau để theo dõi tiến độ từ chủ dự án."
                />
              ) : (
                updates.map((u) => {
                  const locked = u.backers_only === 1 && !ctx.hasPledge && !ctx.isMember;
                  return (
                    <article key={u.id} className="card space-y-3 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.author_name} src={u.author_avatar} size={34} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/u/${u.author_username}`}
                                className="text-sm font-bold hover:text-violet-600 dark:hover:text-violet-400"
                              >
                                {u.author_name}
                              </Link>
                              {u.author_role && <RoleBadge role={u.author_role} />}
                            </div>
                            <div className="text-xs text-muted">
                              {formatDate(u.published_at, true)} · {timeAgo(u.published_at)}
                            </div>
                          </div>
                        </div>
                        {u.backers_only === 1 && (
                          <Badge tone="violet">
                            <Lock className="size-3" /> Chỉ dành cho backer
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-extrabold">{u.title}</h3>

                      {locked ? (
                        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-violet-500/35 bg-violet-500/5 p-4 sm:flex-row sm:items-center">
                          <div className="flex items-start gap-2.5 text-sm text-muted">
                            <Lock className="mt-0.5 size-4 shrink-0 text-violet-500" />
                            <span>
                              Nội dung bản tin này chỉ hiển thị cho người đã góp vốn cho dự án.
                            </span>
                          </div>
                          {(blocker === null || blocker === "LOGIN") && (
                            <ButtonLink
                              href={
                                blocker === "LOGIN"
                                  ? `/login?next=${encodeURIComponent(`/p/${project.slug}/back`)}`
                                  : `/p/${project.slug}/back`
                              }
                              size="xs"
                              className="shrink-0"
                            >
                              Góp vốn để xem
                            </ButtonLink>
                          )}
                        </div>
                      ) : (
                        <div className="prose-fv text-sm text-fg/90 sm:text-base">{u.body}</div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          )}

          {tab === "comments" && (
            <CommentsSection
              projectId={project.id}
              slug={project.slug}
              comments={comments}
              isPublic={isPublicComments}
              viewer={
                viewer
                  ? {
                      id: viewer.id,
                      displayName: viewer.displayName,
                      avatarUrl: viewer.avatarUrl,
                      isAdmin: ctx.isAdmin,
                      canComment: ctx.canComment,
                      canModerate: ctx.canModerate,
                      canDelete: ctx.canDelete,
                      canReport: hasSystemPerm(viewer, "report.create"),
                    }
                  : null
              }
            />
          )}

          {tab === "community" && community && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Người ủng hộ"
                  value={community.totals.backers.toLocaleString("vi-VN")}
                  icon={<Users className="size-5" />}
                  tone="violet"
                />
                <StatCard
                  label="Tổng tiền đã góp"
                  value={formatCompactVnd(community.totals.amount)}
                  sub={formatVnd(community.totals.amount)}
                  icon={<Wallet className="size-5" />}
                  tone="emerald"
                />
                <StatCard
                  label="Trung bình / người"
                  value={formatVnd(community.totals.avg)}
                  sub={`Cao nhất ${formatCompactVnd(community.totals.max_amount)}`}
                  icon={<Award className="size-5" />}
                  tone="amber"
                />
              </div>

              <CommunityChart data={community.daily} />

              <div className="grid gap-5 md:grid-cols-2">
                {/* Theo quốc gia (v_project_backer_countries) */}
                <div className="card space-y-4 p-4 sm:p-5">
                  <div>
                    <h3 className="text-base font-bold">Người ủng hộ theo quốc gia</h3>
                    <p className="text-xs text-muted">
                      Thống kê cộng đồng toàn cầu (từ bảng góp vốn đang hiệu lực).
                    </p>
                  </div>
                  {community.countries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">Chưa có dữ liệu quốc gia.</p>
                  ) : (
                    <div className="space-y-3">
                      {community.countries.map((c) => {
                        const share = percentOf(c.backers, Math.max(1, community.totals.backers));
                        return (
                          <div key={c.country_code} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex items-center gap-2 font-semibold">
                                <span className="text-base">{flagOf(c.country_code)}</span>
                                <span>{COUNTRY_NAMES[c.country_code] ?? c.country_code}</span>
                              </span>
                              <span className="text-xs text-muted tabular-nums">
                                <b className="text-fg">{c.backers}</b> người · {formatCompactVnd(c.amount)} ({share}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                              <div
                                className="h-full rounded-full bg-brand-gradient"
                                style={{ width: `${Math.max(4, share)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Theo tỉnh/thành Việt Nam */}
                <div className="card space-y-4 p-4 sm:p-5">
                  <div>
                    <h3 className="text-base font-bold">Tỉnh / thành nhận quà nhiều nhất</h3>
                    <p className="text-xs text-muted">
                      Góp không nhận quà: <b>{community.totals.no_reward}</b> · Ủng hộ ẩn danh:{" "}
                      <b>{community.totals.anonymous}</b>
                    </p>
                  </div>
                  {community.provinces.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">Chưa có địa chỉ giao hàng được ghi nhận.</p>
                  ) : (
                    <div className="space-y-3">
                      {community.provinces.map((p) => {
                        const topMax = Math.max(1, community.provinces[0]?.n ?? 1);
                        const w = Math.round((p.n / topMax) * 100);
                        return (
                          <div key={p.province} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <MapPin className="size-3.5 text-emerald-500" />
                                {p.province}
                              </span>
                              <span className="text-xs font-bold tabular-nums text-muted">
                                {p.n} lượt giao
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                              <div
                                className="h-full rounded-full bg-money-gradient"
                                style={{ width: `${Math.max(6, w)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cột phải sticky (desktop lg+) */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <div className="card space-y-5 p-6">
            {renderHeaderBlock()}
            <Divider />
            {renderFundingBlock()}
          </div>
        </aside>
      </div>

      {/* Thanh CTA cố định trên mobile (đặt phía trên MobileNav) */}
      {(blocker === null || blocker === "LOGIN") && (
        <div className="fixed inset-x-3 bottom-[64px] z-40 md:hidden">
          <div className="glass flex items-center justify-between gap-3 rounded-2xl border border-line px-3.5 py-2.5 shadow-lg">
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatCompactVnd(project.pledged_amount)}
              </div>
              <div className="text-[11px] text-muted">
                {pct}% · {left.label}
              </div>
            </div>
            <ButtonLink
              href={
                blocker === null
                  ? `/p/${project.slug}/back${ctx.pledge?.status === "AUTHORIZED" ? "?change=1" : ""}`
                  : `/login?next=${encodeURIComponent(`/p/${project.slug}/back`)}`
              }
              size="sm"
              className="shrink-0"
            >
              {blocker === "LOGIN"
                ? "Đăng nhập để góp"
                : ctx.pledge?.status === "AUTHORIZED"
                  ? "Đổi mức góp"
                  : "Góp vốn ngay"}
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletedDisplayCard({
  project,
  pct,
  updates,
  hasPledge,
  isMember,
}: {
  project: {
    slug: string;
    status: string;
    goal_amount: number;
    pledged_amount: number;
    backers_count: number;
    ended_at: string | null;
    end_at: string | null;
    completed_display: "SUMMARY" | "UPDATES" | "THANK_YOU";
    completed_message: string | null;
    creator_name: string;
    creator_avatar: string | null;
  };
  pct: number;
  updates: { id: string; title: string; body: string; backers_only: number; published_at: string }[];
  hasPledge: boolean;
  isMember: boolean;
}) {
  const failed = project.status === "FAILED";
  const endedAt = formatDate(project.ended_at ?? project.end_at);

  if (failed) {
    return (
      <div className="space-y-2.5 rounded-2xl border border-line bg-surface-2/80 p-4">
        <div className="flex items-center gap-2 font-bold">
          <Clock className="size-4 text-muted" /> Chiến dịch đã kết thúc — chưa đạt mục tiêu
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Dự án gọi được <b className="text-fg">{formatVnd(project.pledged_amount)}</b> ({pct}% mục tiêu{" "}
          {formatVnd(project.goal_amount)}) từ <b className="text-fg">{project.backers_count}</b> người ủng hộ. Theo cơ
          chế All-or-Nothing, toàn bộ khoản giữ chỗ đã được giải phóng và không ai bị trừ tiền.
        </p>
      </div>
    );
  }

  if (project.completed_display === "THANK_YOU") {
    return (
      <div className="space-y-3 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/12 via-surface-2 to-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
          <Sparkles className="size-4" /> Lời cảm ơn từ Creator
        </div>
        <p className="text-sm font-medium leading-relaxed text-fg">
          “{project.completed_message || "Cảm ơn cộng đồng đã tin tưởng và đồng hành cùng dự án thành công!"}”
        </p>
        <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted">
          <span className="flex items-center gap-2">
            <Avatar name={project.creator_name} src={project.creator_avatar} size={24} />
            <b className="text-fg">{project.creator_name}</b>
          </span>
          <span className="tabular-nums">
            {formatCompactVnd(project.pledged_amount)} · {project.backers_count} backer
          </span>
        </div>
      </div>
    );
  }

  if (project.completed_display === "UPDATES") {
    const highlights = updates.slice(0, 2);
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <Newspaper className="size-4" /> Cập nhật tiến độ sau chiến dịch
          </span>
          <Link
            href={`/p/${project.slug}?tab=updates`}
            className="text-xs font-bold text-violet-600 hover:underline dark:text-violet-400"
          >
            Xem tất cả →
          </Link>
        </div>
        {highlights.length === 0 ? (
          <p className="text-xs text-muted">Chiến dịch đã thành công với {formatVnd(project.pledged_amount)}.</p>
        ) : (
          <div className="space-y-2">
            {highlights.map((u) => {
              const locked = u.backers_only === 1 && !hasPledge && !isMember;
              return (
                <Link
                  key={u.id}
                  href={`/p/${project.slug}?tab=updates`}
                  className="block rounded-xl border border-line bg-surface p-2.5 transition hover:border-violet-400/50"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="truncate">{u.title}</span>
                    <span className="shrink-0 font-normal text-muted">{formatDate(u.published_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {locked ? "Bản tin dành riêng cho người đã góp vốn." : u.body}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Tổng kết: <b className="text-fg">{formatCompactVnd(project.pledged_amount)}</b> ({pct}%)
          </span>
          <span>{project.backers_count} người ủng hộ</span>
        </div>
      </div>
    );
  }

  // Mặc định SUMMARY
  return (
    <div className="space-y-3 rounded-2xl border border-violet-500/30 bg-violet-500/8 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          <Award className="size-4" /> Tổng kết chiến dịch
        </span>
        <span className="text-xs text-muted">Kết thúc {endedAt}</span>
      </div>
      <div className="text-2xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
        {formatVnd(project.pledged_amount)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-surface p-2.5">
          <div className="text-muted">Đạt được</div>
          <div className="mt-0.5 font-extrabold">{pct}% mục tiêu</div>
        </div>
        <div className="rounded-xl bg-surface p-2.5">
          <div className="text-muted">Người ủng hộ</div>
          <div className="mt-0.5 font-extrabold tabular-nums">{project.backers_count} backer</div>
        </div>
      </div>
      {project.completed_message && <p className="text-xs text-muted">{project.completed_message}</p>}
    </div>
  );
}
