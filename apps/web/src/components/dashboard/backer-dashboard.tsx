"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Bookmark,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  FolderHeart,
  Gift,
  GitFork,
  LayoutDashboard,
  Mail,
  MessageSquare,
  PackageCheck,
  ReceiptText,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleConnectionPanel } from "@/components/workspace/role-connection-panel";
import { useQueryTab } from "@/hooks/use-query-tab";
import type { BackedProject, CampaignCardData, UserDashboardData } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";

const tabs = [
  { id: "backed", label: "Dự án đã ủng hộ", icon: FolderHeart },
  { id: "saved", label: "Đã lưu", icon: Bookmark },
  { id: "following", label: "Đang theo dõi", icon: Users },
  { id: "messages", label: "Tin nhắn", icon: Mail },
  { id: "activity", label: "Hoạt động", icon: Activity },
  { id: "settings", label: "Cài đặt", icon: Settings },
] as const;
type DashboardTab = (typeof tabs)[number]["id"];
const dashboardTabIds = tabs.map((item) => item.id);

const dashboardTabCopy: Record<
  DashboardTab,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  backed: {
    eyebrow: "Cam kết & dòng tiền",
    title: "Các khoản ủng hộ của bạn.",
    description:
      "Xem số tiền đang giữ hạn mức, khoản đã thu và tình trạng giao quà của từng chiến dịch.",
    icon: FolderHeart,
  },
  saved: {
    eyebrow: "Danh sách cân nhắc",
    title: "Những dự án bạn đã lưu.",
    description:
      "So sánh tiến độ, thời gian còn lại rồi quyết định dự án nào đáng để tìm hiểu tiếp.",
    icon: Bookmark,
  },
  following: {
    eyebrow: "Chủ dự án đang theo dõi",
    title: "Những nhóm bạn đang quan tâm.",
    description:
      "Theo dõi nhịp cập nhật của từng đội ngũ mà không cần lưu lại mọi chiến dịch của họ.",
    icon: Users,
  },
  messages: {
    eyebrow: "Trao đổi theo chiến dịch",
    title: "Tin nhắn với đội dự án.",
    description:
      "Mỗi cuộc trao đổi gắn với đúng campaign bạn đã ủng hộ để câu hỏi và phản hồi không bị lẫn.",
    icon: Mail,
  },
  activity: {
    eyebrow: "Nhật ký tài khoản",
    title: "Hoạt động gần đây của bạn.",
    description:
      "Đối chiếu các lần cam kết, lưu dự án, đọc tin và những thay đổi vừa diễn ra trong phiên demo.",
    icon: Activity,
  },
  settings: {
    eyebrow: "Tùy chọn cá nhân",
    title: "Thông báo và quyền riêng tư.",
    description:
      "Chọn loại cập nhật muốn nhận và cách thông tin của bạn được sử dụng trong bản trải nghiệm.",
    icon: Settings,
  },
};

function DashboardEmptyState({
  icon: Icon,
  title,
  detail,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-6 rounded-[18px] border border-dashed border-forest/18 bg-[#fafbf7] px-5 py-10 text-center sm:px-8">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e9eddf] text-forest">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-ink-muted">
        {detail}
      </p>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="button-dark mt-5 min-h-11 px-4 text-xs cursor-pointer"
        >
          {actionLabel} <ArrowRight className="size-3.5" />
        </button>
      ) : actionHref ? (
        <Link
          href={actionHref}
          className="button-dark mt-5 min-h-11 px-4 text-xs"
        >
          {actionLabel} <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

async function updateDashboard(
  action: string,
  payload: Record<string, unknown>,
) {
  await clientRequest("/api/v1/me/dashboard", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

function AttentionRail({ data }: { data: UserDashboardData }) {
  if (!data.attentionItems.length) return null;
  const [primary, ...updates] = data.attentionItems;

  return (
    <section className="mt-5 grid overflow-hidden rounded-[18px] border border-[#d9b58e] bg-[#fffaf4] lg:grid-cols-[1.2fr_0.8fr]">
      <div className="p-5 sm:p-6">
        <p className="eyebrow text-coral-dark">
          <AlertCircle className="size-4" /> Cần bạn xác nhận
        </p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-xl font-extrabold">
              {primary.title}
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-ink-soft">
              {primary.detail}
            </p>
            <p className="mt-2 text-[10px] font-bold text-coral-dark">
              {primary.dueLabel}
            </p>
          </div>
          <Link
            href={primary.href}
            className="button-primary min-h-11 shrink-0 px-4 text-xs"
          >
            {primary.actionLabel} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <div className="border-t border-[#ead4bd] bg-[#f6eadf] p-5 lg:border-l lg:border-t-0 sm:p-6">
        <p className="text-[10px] font-bold tracking-wide text-ink-muted">
          CẬP NHẬT LIÊN QUAN
        </p>
        <div className="mt-3 space-y-4">
          {updates.map((item) => (
            <div key={item.id}>
              <Link
                href={item.href}
                className="group flex items-start justify-between gap-3"
              >
                <span>
                  <span className="block text-xs font-bold group-hover:text-coral-dark">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[10px] leading-5 text-ink-muted">
                    {item.detail}
                  </span>
                </span>
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-ink-muted group-hover:text-coral-dark" />
              </Link>
              <p className="mt-1 text-[9px] font-semibold text-ink-muted">
                {item.dueLabel}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PledgeOverviewCards({ projects }: { projects: BackedProject[] }) {
  const authorized = projects.filter((item) => item.paymentStatus === "AUTHORIZED");
  const captured = projects.filter((item) => item.paymentStatus === "CAPTURED");
  const delivered = projects.filter((item) => item.fulfillmentStatus === "DELIVERED");
  const totalAmount = projects.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mt-5 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Card 1: Tổng tiền cam kết */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-[#fafaf7] p-4 transition-all hover:border-forest/30">
          <div className="flex items-center justify-between text-xs font-bold text-ink-muted">
            <span>Tổng tiền đã ủng hộ</span>
            <span className="grid size-7 place-items-center rounded-lg border border-line bg-white text-forest">
              <FolderHeart className="size-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <p className="font-display text-2xl font-black text-ink">
              {formatVnd(totalAmount)}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-ink-muted">
              {projects.length} chiến dịch đã tham gia
            </p>
          </div>
        </div>

        {/* Card 2: Đang giữ hạn mức */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-[#fafaf7] p-4 transition-all hover:border-amber-300">
          <div className="flex items-center justify-between text-xs font-bold text-ink-muted">
            <span>Đang giữ hạn mức</span>
            <span className="grid size-7 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
              <Clock3 className="size-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <p className="font-display text-2xl font-black text-amber-900">
              {formatVnd(authorized.reduce((sum, item) => sum + item.amount, 0))}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-amber-700/80">
              {authorized.length} cam kết · Chưa trừ tiền
            </p>
          </div>
        </div>

        {/* Card 3: Phần thưởng đã nhận */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-[#fafaf7] p-4 transition-all hover:border-emerald-300">
          <div className="flex items-center justify-between text-xs font-bold text-ink-muted">
            <span>Phần thưởng đã nhận</span>
            <span className="grid size-7 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="size-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <p className="font-display text-2xl font-black text-emerald-900">
              {delivered.length} phần quà
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/80">
              {captured.length} khoản đã thu tiền thành công
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-line/70 bg-[#f7f6f1] px-3.5 py-2 text-[11px] text-ink-muted">
        <ShieldCheck className="size-3.5 shrink-0 text-forest" />
        <span>
          Cơ chế <strong>All-or-Nothing</strong>: Ngân hàng chỉ giữ hạn mức tạm thời; tiền chỉ chính thức được thu khi chiến dịch cán mốc mục tiêu.
        </span>
      </div>
    </div>
  );
}

function FulfillmentBadge({ status }: { status: BackedProject["fulfillmentStatus"] }) {
  if (status === "DELIVERED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="size-3 text-emerald-600" />
        Đã giao quà
      </span>
    );
  }
  if (status === "SHIPPED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
        <Truck className="size-3 text-sky-600" />
        Đang giao
      </span>
    );
  }
  if (status === "PREPARING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
        <PackageCheck className="size-3 text-amber-600" />
        Đang chuẩn bị
      </span>
    );
  }
  if (status === "NOT_APPLICABLE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-bold text-stone-500">
        <XCircle className="size-3 text-stone-400" />
        Không quà
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-bold text-stone-600">
      <Clock3 className="size-3 text-stone-500" />
      Chờ kết quả
    </span>
  );
}

type BackedFilter = "ALL" | "IN_PROGRESS" | "DELIVERED";

function BackedPanel({
  data,
  onOpenMessages,
}: {
  data: UserDashboardData;
  onOpenMessages: () => void;
}) {
  const [filter, setFilter] = useState<BackedFilter>("ALL");

  const filteredProjects = data.backedProjects.filter((item) => {
    if (filter === "IN_PROGRESS") {
      return item.fulfillmentStatus !== "DELIVERED";
    }
    if (filter === "DELIVERED") {
      return item.fulfillmentStatus === "DELIVERED";
    }
    return true;
  });

  const inProgressCount = data.backedProjects.filter(
    (item) => item.fulfillmentStatus !== "DELIVERED",
  ).length;
  const deliveredCount = data.backedProjects.filter(
    (item) => item.fulfillmentStatus === "DELIVERED",
  ).length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">
            Các dự án đã ủng hộ
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Theo dõi tiến trình thanh toán, cập nhật từ chủ dự án và hành trình nhận quà.
          </p>
        </div>

        {data.backedProjects.length ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-[#f8f8f5] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${filter === "ALL" ? "bg-white text-ink font-bold shadow-2xs" : "text-ink-muted hover:text-ink"}`}
            >
              Tất cả ({data.backedProjects.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("IN_PROGRESS")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${filter === "IN_PROGRESS" ? "bg-white text-ink font-bold shadow-2xs" : "text-ink-muted hover:text-ink"}`}
            >
              Đang chờ / Đang giao ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("DELIVERED")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${filter === "DELIVERED" ? "bg-white text-ink font-bold shadow-2xs" : "text-ink-muted hover:text-ink"}`}
            >
              Đã nhận quà ({deliveredCount})
            </button>
          </div>
        ) : null}
      </div>

      {data.backedProjects.length ? (
        <>
          <PledgeOverviewCards projects={data.backedProjects} />
          <div className="mt-5 space-y-4">
            {filteredProjects.map((item, index) => (
              <article
                key={item.pledgeId}
                className="overflow-hidden rounded-2xl border border-line bg-white shadow-2xs transition-shadow hover:shadow-xs"
              >
                {/* Header bar of the card */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 bg-[#fafaf7] px-5 py-3 text-xs">
                  <div className="flex items-center gap-2 text-ink-muted">
                    <ReceiptText className="size-3.5 text-forest shrink-0" />
                    <span className="font-mono font-bold text-ink">
                      {item.referenceCode || item.pledgeId.slice(0, 8).toUpperCase()}
                    </span>
                    <span aria-hidden="true" className="text-line">•</span>
                    <span>
                      {new Intl.DateTimeFormat("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }).format(new Date(item.pledgedAt))}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.paymentStatus} />
                    <FulfillmentBadge status={item.fulfillmentStatus} />
                  </div>
                </div>

                {/* Main body of the card */}
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Visual Thumbnail */}
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl border border-line bg-stone-100 sm:w-36">
                      <CampaignVisual
                        {...item.campaign.visual}
                        compact
                        priority={index === 0}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Campaign & Reward info */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${item.campaign.slug}`}
                        className="font-display text-base font-extrabold leading-snug text-ink transition-colors hover:text-coral-dark"
                      >
                        {item.campaign.title}
                      </Link>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
                        <Gift className="size-3.5 shrink-0 text-coral" />
                        <span>Gói quà: <strong className="text-ink">{item.rewardTitle}</strong></span>
                      </p>
                    </div>

                    {/* Amount pledged */}
                    <div className="border-t border-line/60 pt-3 text-left sm:border-0 sm:pt-0 sm:text-right shrink-0">
                      <p className="text-[11px] font-semibold text-ink-muted">Số tiền cam kết</p>
                      <p className="mt-0.5 font-display text-xl font-black text-ink">
                        {formatVnd(item.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Footer status message & action buttons */}
                  <div className="mt-4 flex flex-col justify-between gap-3 border-t border-line/70 pt-3.5 sm:flex-row sm:items-center">
                    {item.fulfillmentStatus === "DELIVERED" ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>Đơn hàng đã được giao thành công đến bạn ({item.nextStepAt})</span>
                      </div>
                    ) : item.fulfillmentStatus === "SHIPPED" ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                        <Truck className="size-4 shrink-0 text-sky-600" />
                        <span>Đang giao: {item.nextStep} ({item.nextStepAt})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <Clock3 className="size-4 shrink-0 text-stone-400" />
                        <span>Tiến độ: <span className="font-semibold text-ink-soft">{item.nextStep}</span> ({item.nextStepAt})</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={onOpenMessages}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink-soft shadow-2xs transition-colors hover:border-coral/40 hover:text-coral-dark"
                      >
                        <MessageSquare className="size-3.5" />
                        Nhắn chủ dự án
                      </button>
                      <Link
                        href={`/projects/${item.campaign.slug}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-forest px-3 text-xs font-bold text-lime shadow-2xs transition-colors hover:bg-forest/90"
                      >
                        Chi tiết <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <DashboardEmptyState
          icon={FolderHeart}
          title="Bạn chưa ủng hộ dự án nào"
          detail="Hãy bắt đầu bằng một dự án có kế hoạch rõ ràng. Trước khi xác nhận, Góp luôn cho bạn xem đầy đủ khoản tiền, quà và phí giao hàng."
          actionLabel="Khám phá dự án"
          actionHref="/discover"
        />
      )}
    </div>
  );
}

function SavedPanel({ data }: { data: UserDashboardData }) {
  const [savedIds, setSavedIds] = useState(
    () => new Set(data.savedProjects.map((campaign) => campaign.id)),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const visibleProjects = data.savedProjects.filter((campaign) =>
    savedIds.has(campaign.id),
  );

  const removeSavedProject = async (campaignId: string) => {
    setBusy(campaignId);
    setNotice("");
    try {
      await updateDashboard("SAVE_PROJECT", { campaignId, saved: false });
      setSavedIds((current) => {
        const next = new Set(current);
        next.delete(campaignId);
        return next;
      });
      setNotice("Đã bỏ dự án khỏi danh sách đã lưu.");
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể bỏ lưu. Bạn thử lại sau nhé."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Dự án đã lưu</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Quay lại khi bạn đã sẵn sàng quyết định.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visibleProjects.map((campaign) => (
          <article
            key={campaign.id}
            className="group overflow-hidden rounded-[22px] border border-line bg-white"
          >
            <Link href={`/projects/${campaign.slug}`}>
              <CampaignVisual
                {...campaign.visual}
                compact
                className="aspect-[16/8]"
              />
            </Link>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-coral">
                {campaign.category}
              </p>
              <Link
                href={`/projects/${campaign.slug}`}
                className="mt-2 block font-display font-extrabold leading-snug group-hover:text-coral-dark"
              >
                {campaign.title}
              </Link>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Link
                  href={`/projects/${campaign.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft"
                >
                  Xem lại <ArrowRight className="size-3.5" />
                </Link>
                <button
                  type="button"
                  disabled={busy === campaign.id}
                  onClick={() => void removeSavedProject(campaign.id)}
                  className="min-h-11 rounded-full border border-line px-3 text-[11px] font-bold text-ink-muted hover:border-coral/30 hover:text-coral-dark disabled:cursor-wait"
                >
                  {busy === campaign.id ? "Đang bỏ…" : "Bỏ lưu"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!visibleProjects.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <Bookmark className="mx-auto size-6 text-ink-muted" />
          <p className="mt-3 text-sm font-bold">Danh sách đã lưu đang trống</p>
          <Link
            href="/discover"
            className="mt-3 inline-flex text-xs font-bold text-coral-dark"
          >
            Khám phá dự án phù hợp
          </Link>
        </div>
      ) : null}
      <p className="mt-3 min-h-5 text-xs text-ink-muted" role="status">
        {notice}
      </p>
    </div>
  );
}

function FollowingPanel({ data }: { data: UserDashboardData }) {
  const [followingIds, setFollowingIds] = useState(
    () => new Set(data.following.map((creator) => creator.id)),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [followNotice, setFollowNotice] = useState("");

  const toggleFollowing = async (creatorId: string) => {
    const wasFollowing = followingIds.has(creatorId);
    setBusy(creatorId);
    setFollowNotice("");
    try {
      await updateDashboard("SET_CREATOR_FOLLOW", {
        creatorId,
        following: !wasFollowing,
      });
      setFollowingIds((current) => {
        const next = new Set(current);
        if (wasFollowing) next.delete(creatorId);
        else next.add(creatorId);
        return next;
      });
      setFollowNotice(
        wasFollowing
          ? "Đã bỏ theo dõi chủ dự án này."
          : "Đã theo dõi lại chủ dự án này.",
      );
    } catch (error) {
      setFollowNotice(clientRequestMessage(error, "Chưa thể lưu thay đổi. Bạn thử lại sau nhé."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">
        Chủ dự án đang theo dõi
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {data.following.map((creator) => (
          <article
            key={creator.id}
            className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-forest font-display text-xs font-extrabold text-lime">
              {creator.initials}
            </span>
            <div className="flex-1">
              <p className="font-display text-sm font-extrabold">
                {creator.name}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {creator.projects} dự án
              </p>
            </div>
            <button
              type="button"
              disabled={busy === creator.id}
              aria-pressed={followingIds.has(creator.id)}
              onClick={() => void toggleFollowing(creator.id)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${followingIds.has(creator.id) ? "border-line text-ink-soft" : "border-coral/30 bg-[#fff8f4] text-coral-dark"}`}
            >
              {busy === creator.id
                ? "Đang lưu…"
                : followingIds.has(creator.id)
                  ? "Đang theo dõi"
                  : "Theo dõi lại"}
            </button>
          </article>
        ))}
      </div>
      {!data.following.length ? (
        <DashboardEmptyState
          icon={Users}
          title="Chưa theo dõi chủ dự án nào"
          detail="Khi theo dõi một nhóm, các mốc ra mắt và cập nhật mới của họ sẽ xuất hiện tại đây."
          actionLabel="Tìm nhóm đáng quan tâm"
          actionHref="/discover"
        />
      ) : null}
      <p className="mt-3 min-h-5 text-xs text-ink-muted" role="status">
        {followNotice}
      </p>
    </div>
  );
}

function MessagesPanel({
  data,
  campaigns = [],
  composeOpen,
  onComposeOpenChange,
}: {
  data: UserDashboardData;
  campaigns?: CampaignCardData[];
  composeOpen: boolean;
  onComposeOpenChange: (open: boolean) => void;
}) {
  const { session } = useAuth();
  const [subTab, setSubTab] = useState<"inbox" | "sent">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // Xây dựng danh sách người nhận phong phú
  const recipientsMap = new Map<
    string,
    {
      key: string;
      campaignId: string;
      campaignTitle: string;
      userId: string;
      name: string;
    }
  >();

  // 1. Dự án đã ủng hộ
  for (const item of data.backedProjects) {
    if (item.campaign?.id && item.campaign.creator?.id) {
      recipientsMap.set(`${item.campaign.id}:${item.campaign.creator.id}`, {
        key: `${item.campaign.id}:${item.campaign.creator.id}`,
        campaignId: item.campaign.id,
        campaignTitle: item.campaign.title,
        userId: item.campaign.creator.id,
        name: item.campaign.creator.name,
      });
    }
  }

  // 2. Dự án đã lưu
  for (const item of data.savedProjects) {
    if (item.id && item.creator?.id) {
      recipientsMap.set(`${item.id}:${item.creator.id}`, {
        key: `${item.id}:${item.creator.id}`,
        campaignId: item.id,
        campaignTitle: item.title,
        userId: item.creator.id,
        name: item.creator.name,
      });
    }
  }

  // 3. Toàn bộ dự án hệ thống
  for (const item of campaigns) {
    if (item.id && item.creator?.id) {
      recipientsMap.set(`${item.id}:${item.creator.id}`, {
        key: `${item.id}:${item.creator.id}`,
        campaignId: item.id,
        campaignTitle: item.title,
        userId: item.creator.id,
        name: item.creator.name,
      });
    }
  }

  // 4. Những người đã gửi thư cho bạn
  for (const item of data.messages) {
    if (item.campaignId && item.senderId) {
      recipientsMap.set(`${item.campaignId}:${item.senderId}`, {
        key: `${item.campaignId}:${item.senderId}`,
        campaignId: item.campaignId,
        campaignTitle: item.campaignTitle || "Chiến dịch liên quan",
        userId: item.senderId,
        name: item.sender,
      });
    }
  }

  const recipients = Array.from(recipientsMap.values());

  const [draftMessage, setDraftMessage] = useState({
    recipientKey: recipients[0]?.key ?? "",
    subject: "",
    body: "",
  });

  const [sentMessages, setSentMessages] = useState<
    Array<{
      id: string;
      campaignId: string;
      campaignTitle?: string;
      senderId: string;
      recipientId: string;
      recipient: string;
      subject: string;
      body: string;
      sentAt: string;
      replies?: Array<{
        id: string;
        senderId: string;
        senderName: string;
        body: string;
        sentAt: string;
      }>;
    }>
  >(() => data.sentMessages);

  const [inboxMessages, setInboxMessages] = useState(() => data.messages);

  const [readIds, setReadIds] = useState(
    () =>
      new Set(
        data.messages.filter((item) => !item.unread).map((item) => item.id),
      ),
  );

  const openMessage = (messageId: string) => {
    setSelectedId((current) => (current === messageId ? null : messageId));
    if (readIds.has(messageId)) return;

    setSyncNotice("");
    setReadIds((current) => new Set(current).add(messageId));
    void updateDashboard("MARK_MESSAGE_READ", { messageId }).catch((error) => {
      setReadIds((current) => {
        const next = new Set(current);
        next.delete(messageId);
        return next;
      });
      setSyncNotice(
        clientRequestMessage(error, "Chưa thể đánh dấu đã đọc. Bạn thử lại sau nhé."),
      );
    });
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftMessage.subject.trim() || !draftMessage.body.trim()) return;
    const recipient =
      recipients.find((item) => item.key === draftMessage.recipientKey) ??
      recipients[0];
    if (!recipient) {
      setSyncNotice("Chưa xác định được dự án nhận tin nhắn.");
      return;
    }
    setSending(true);
    setSyncNotice("");
    try {
      await updateDashboard("SEND_MESSAGE", {
        campaignId: recipient.campaignId,
        recipientUserId: recipient.userId,
        subject: draftMessage.subject.trim(),
        body: draftMessage.body.trim(),
      });
      setSentMessages((current) => [
        {
          id: `sent-${Date.now()}`,
          campaignId: recipient.campaignId,
          campaignTitle: recipient.campaignTitle,
          senderId: session?.user.id ?? "preview-backer",
          recipientId: recipient.userId,
          recipient: recipient.name,
          subject: draftMessage.subject.trim(),
          body: draftMessage.body.trim(),
          sentAt: "Vừa xong",
          replies: [],
        },
        ...current,
      ]);
      setDraftMessage({
        recipientKey: recipients[0]?.key ?? "",
        subject: "",
        body: "",
      });
      onComposeOpenChange(false);
      setSubTab("sent");
      setSyncNotice("Tin nhắn đã được gửi thành công đến chủ dự án.");
    } catch (error) {
      setSyncNotice(
        clientRequestMessage(error, "Chưa thể gửi tin nhắn. Nội dung của bạn vẫn được giữ lại."),
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (parentMessage: any) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      const recipientId =
        parentMessage.senderId === session?.user.id
          ? parentMessage.recipientId
          : parentMessage.senderId;

      await updateDashboard("SEND_MESSAGE", {
        campaignId: parentMessage.campaignId,
        recipientUserId: recipientId,
        parentMessageId: parentMessage.id,
        subject: `Re: ${parentMessage.subject}`,
        body: replyText.trim(),
      });

      const newReply = {
        id: `reply-${Date.now()}`,
        senderId: session?.user.id || "",
        senderName: session?.user.name || "Bạn",
        body: replyText.trim(),
        sentAt: "Vừa xong",
      };

      setInboxMessages((current) =>
        current.map((item) =>
          item.id === parentMessage.id
            ? { ...item, replies: [...(item.replies || []), newReply] }
            : item,
        ),
      );
      setSentMessages((current) =>
        current.map((item) =>
          item.id === parentMessage.id
            ? { ...item, replies: [...(item.replies || []), newReply] }
            : item,
        ),
      );

      setReplyText("");
      setSyncNotice("Đã gửi phản hồi thành công.");
    } catch (err) {
      setSyncNotice(
        clientRequestMessage(err, "Chưa thể gửi phản hồi. Vui lòng thử lại."),
      );
    } finally {
      setReplying(false);
    }
  };

  const unreadCount = inboxMessages.filter((item) => !readIds.has(item.id)).length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">Hộp thư</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Trao đổi trực tiếp với các nhóm dự án bạn đã ủng hộ hoặc đang quan tâm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-[#f8f8f5] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSubTab("inbox")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                subTab === "inbox"
                  ? "bg-white text-ink font-bold shadow-2xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Mail className="size-3.5" />
              <span>Hộp thư đến</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-coral px-1.5 py-0.2 text-[9px] font-black text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setSubTab("sent")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                subTab === "sent"
                  ? "bg-white text-ink font-bold shadow-2xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Send className="size-3.5" />
              <span>Đã gửi ({sentMessages.length})</span>
            </button>
          </div>
          <button
            type="button"
            aria-expanded={composeOpen}
            onClick={() => onComposeOpenChange(!composeOpen)}
            className="button-dark min-h-10 px-3.5 text-xs font-bold cursor-pointer"
          >
            <MessageSquare className="size-3.5" /> Soạn tin
          </button>
        </div>
      </div>

      <p
        className={`mt-2 min-h-5 text-xs ${
          syncNotice.startsWith("Chưa") ? "text-red-600" : "text-emerald-700"
        }`}
        role={syncNotice.startsWith("Chưa") ? "alert" : "status"}
      >
        {syncNotice}
      </p>

      {/* Modal Soạn tin */}
      <Modal
        open={composeOpen}
        title="Soạn tin cho nhóm dự án"
        description="Tin nhắn được gắn với dự án và tài khoản người gửi để nhóm dự án có thể tra lại lịch sử."
        onClose={() => onComposeOpenChange(false)}
        locked={sending}
      >
        <form
          onSubmit={sendMessage}
          className="rounded-[18px] border border-coral/20 bg-[#fffaf6] p-4 sm:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-xs font-bold text-ink-soft">Gửi đến dự án</span>
              <select
                name="message-recipient"
                value={draftMessage.recipientKey || (recipients[0]?.key ?? "")}
                onChange={(event) =>
                  setDraftMessage((current) => ({
                    ...current,
                    recipientKey: event.target.value,
                  }))
                }
                className="input-field mt-2"
              >
                {recipients.length > 0 ? (
                  recipients.map((recipient) => (
                    <option key={recipient.key} value={recipient.key}>
                      {recipient.campaignTitle} · {recipient.name}
                    </option>
                  ))
                ) : (
                  <option value="">Chưa có dự án nào</option>
                )}
              </select>
            </label>
            <label>
              <span className="text-xs font-bold text-ink-soft">Chủ đề</span>
              <input
                name="message-subject"
                value={draftMessage.subject}
                onChange={(event) =>
                  setDraftMessage((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                className="input-field mt-2"
                placeholder="Ví dụ: Hỏi về chất liệu hoặc thời gian giao quà"
                maxLength={180}
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-xs font-bold text-ink-soft">Nội dung câu hỏi / trao đổi</span>
            <textarea
              name="message-body"
              value={draftMessage.body}
              onChange={(event) =>
                setDraftMessage((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              className="input-field mt-2 min-h-28 resize-y"
              placeholder="Viết nội dung bạn muốn trao đổi chi tiết với nhóm dự án…"
              maxLength={4000}
            />
            <span className="mt-1.5 flex justify-between gap-4 text-[10px] text-ink-muted">
              <span>Nhóm dự án sẽ nhận được thông báo và phản hồi qua hộp thư này.</span>
              <span>{draftMessage.body.length}/4000</span>
            </span>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onComposeOpenChange(false)}
              className="button-ghost min-h-11 px-4 text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={
                sending ||
                !draftMessage.subject.trim() ||
                !draftMessage.body.trim()
              }
              className="button-primary min-h-11 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Send className="size-4" />
              {sending ? "Đang gửi…" : "Gửi tin nhắn"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Tab Nội dung: Hộp thư đến */}
      {subTab === "inbox" ? (
        inboxMessages.length ? (
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-2xs">
            {inboxMessages.map((message) => {
              const isSelected = selectedId === message.id;
              const isUnread = !readIds.has(message.id);

              return (
                <div
                  key={message.id}
                  className={`transition-colors ${
                    isUnread ? "bg-[#fffaf4]" : "hover:bg-[#fafaf6]"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openMessage(message.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        openMessage(message.id);
                      }
                    }}
                    className="flex w-full cursor-pointer gap-4 p-4.5 text-left"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest/10 font-bold text-forest text-xs">
                      {message.initials || "DA"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-extrabold text-ink">
                            {message.sender}
                          </p>
                          {message.campaignTitle ? (
                            <span className="rounded-md border border-line bg-stone-100/70 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                              {message.campaignTitle}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] font-medium text-ink-muted">
                          {message.sentAt}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-xs text-ink">
                        {message.subject}
                      </p>
                      <p
                        className={`mt-1 text-xs text-ink-muted ${
                          isSelected ? "whitespace-pre-wrap leading-relaxed text-ink-soft" : "line-clamp-2"
                        }`}
                      >
                        {message.preview}
                      </p>
                    </div>
                    {isUnread ? (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-coral" />
                    ) : null}
                  </div>

                  {/* Khi tin nhắn được mở: Hiển thị thread hội thoại + Form Trả lời */}
                  {isSelected ? (
                    <div className="border-t border-line/70 bg-[#faf9f5] p-4.5 pl-14">
                      {message.replies && message.replies.length > 0 ? (
                        <div className="mb-4 space-y-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                            Các phản hồi trong cuộc trò chuyện
                          </p>
                          {message.replies.map((reply: any) => (
                            <div
                              key={reply.id}
                              className="rounded-xl border border-line bg-white p-3 text-xs"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted">
                                <span>{reply.senderName}</span>
                                <span>{reply.sentAt}</span>
                              </div>
                              <p className="mt-1 text-ink-soft leading-relaxed whitespace-pre-wrap">
                                {reply.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Form phản hồi trực tiếp */}
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-ink-soft">
                          Gửi phản hồi nhanh cho {message.sender}
                        </label>
                        <div className="mt-2 flex gap-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Nhập nội dung phản hồi của bạn…"
                            rows={2}
                            className="input-field min-h-16 flex-1 text-xs resize-y"
                          />
                          <button
                            type="button"
                            disabled={replying || !replyText.trim()}
                            onClick={() => handleSendReply(message)}
                            className="button-primary self-end px-3.5 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer"
                          >
                            <Send className="size-3.5" />
                            {replying ? "Đang gửi…" : "Gửi"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <DashboardEmptyState
            icon={Mail}
            title="Chưa có tin nhắn đến"
            detail="Khi chủ dự án gửi cập nhật riêng hoặc phản hồi câu hỏi của bạn, tin nhắn sẽ xuất hiện tại đây."
            actionLabel="Soạn tin nhắn mới"
            onAction={() => onComposeOpenChange(true)}
          />
        )
      ) : (
        /* Tab Nội dung: Thư đã gửi */
        sentMessages.length ? (
          <div className="mt-4 space-y-3">
            {sentMessages.map((message) => (
              <article
                key={message.id}
                className="overflow-hidden rounded-2xl border border-line bg-white p-4.5 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-ink">Gửi đến: {message.recipient}</span>
                    {message.campaignTitle ? (
                      <span className="rounded-md border border-line bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                        {message.campaignTitle}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] font-medium text-ink-muted">
                    {message.sentAt}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-ink">{message.subject}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft whitespace-pre-wrap">
                  {message.body}
                </p>

                {message.replies && message.replies.length > 0 ? (
                  <div className="mt-3 space-y-2 border-t border-line/70 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Phản hồi từ chủ dự án:
                    </p>
                    {message.replies.map((reply: any) => (
                      <div
                        key={reply.id}
                        className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                          <span>{reply.senderName}</span>
                          <span>{reply.sentAt}</span>
                        </div>
                        <p className="mt-1 text-emerald-950 leading-relaxed whitespace-pre-wrap">
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <DashboardEmptyState
            icon={Send}
            title="Chưa có thư đã gửi"
            detail="Bạn có thể chủ động liên hệ với bất kỳ chủ dự án nào để hỏi về quà tặng, tiến độ hoặc thắc mắc trước khi ủng hộ."
            actionLabel="Soạn tin nhắn ngay"
            onAction={() => onComposeOpenChange(true)}
          />
        )
      )}
    </div>
  );
}

function ActivityPanel({ data }: { data: UserDashboardData }) {
  if (!data.activities.length) {
    return (
      <div>
        <h2 className="font-display text-2xl font-extrabold">
          Hoạt động gần đây
        </h2>
        <DashboardEmptyState
          icon={Activity}
          title="Chưa có hoạt động nào"
          detail="Những lần lưu dự án, theo dõi nhóm hoặc cam kết ủng hộ của bạn sẽ được ghi lại theo thời gian."
          actionLabel="Bắt đầu khám phá"
          actionHref="/discover"
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">
        Hoạt động gần đây
      </h2>
      <div className="mt-6 space-y-0">
        {data.activities.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[34px_1fr] gap-4">
            <div className="flex flex-col items-center">
              <span className="grid size-8 place-items-center rounded-full bg-forest text-white">
                <Bell className="size-3.5" />
              </span>
              {index < data.activities.length - 1 ? (
                <span className="h-16 w-px bg-line" />
              ) : null}
            </div>
            <div className="pb-8">
              <p className="font-display text-sm font-extrabold">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-ink-soft">{item.detail}</p>
              <p className="mt-2 text-[10px] text-ink-muted">
                {item.occurredAt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const { session } = useAuth();
  if (!session) return null;

  const shortcuts = [
    {
      title: "Hồ sơ cá nhân",
      detail: "Tên hiển thị, giới thiệu ngắn và ảnh đại diện",
      href: "/account?tab=profile",
      icon: CircleUserRound,
    },
    {
      title: "Lĩnh vực quan tâm",
      detail: "Điều chỉnh dữ liệu dùng cho gợi ý dự án",
      href: "/account?tab=interests",
      icon: Bookmark,
    },
    {
      title: "Thông báo",
      detail: "Cập nhật chiến dịch, cam kết và gợi ý mới",
      href: "/account?tab=notifications",
      icon: Bell,
    },
    {
      title: "Bảo mật",
      detail: "Mật khẩu và thời hạn phiên đăng nhập",
      href: "/account?tab=security",
      icon: Settings,
    },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">
        Cài đặt tài khoản
      </h2>
      <div className="mt-6 rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-xl bg-forest font-display text-xs font-extrabold text-lime">
            {session.user.initials}
          </span>
          <div>
            <p className="font-display font-extrabold">{session.user.name}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {session.user.email} · {session.user.headline}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="group flex min-h-24 items-start gap-3 rounded-2xl border border-line bg-white p-4 hover:border-forest/20 hover:bg-[#fafbf7]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef1e7] text-forest">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-bold group-hover:text-coral-dark">
                  {shortcut.title}
                </span>
                <span className="mt-1 block text-[11px] leading-5 text-ink-muted">
                  {shortcut.detail}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DashboardContent({
  tab,
  data,
  campaigns = [],
  onOpenMessages,
  messageComposerOpen,
  onMessageComposerOpenChange,
}: {
  tab: DashboardTab;
  data: UserDashboardData;
  campaigns?: CampaignCardData[];
  onOpenMessages: () => void;
  messageComposerOpen: boolean;
  onMessageComposerOpenChange: (open: boolean) => void;
}) {
  if (tab === "backed") {
    return <BackedPanel data={data} onOpenMessages={onOpenMessages} />;
  }
  if (tab === "saved") return <SavedPanel data={data} />;
  if (tab === "following") return <FollowingPanel data={data} />;
  if (tab === "messages")
    return (
      <MessagesPanel
        data={data}
        campaigns={campaigns}
        composeOpen={messageComposerOpen}
        onComposeOpenChange={onMessageComposerOpenChange}
      />
    );
  if (tab === "activity") return <ActivityPanel data={data} />;
  return <SettingsPanel />;
}

export function BackerDashboard({
  data,
  friendlyName,
  campaigns = [],
}: {
  data: UserDashboardData;
  friendlyName: string;
  campaigns?: CampaignCardData[];
}) {
  const [tab, setTab] = useQueryTab<DashboardTab>(dashboardTabIds, "backed");
  const [messageComposerOpen, setMessageComposerOpen] = useState(false);
  const currentTab = dashboardTabCopy[tab];
  const CurrentTabIcon = currentTab.icon;
  const orbitPledge =
    data.backedProjects.find(
      (item) => item.campaign.slug === "orbit-one-ca-phe-thong-minh",
    ) ?? data.backedProjects[0];
  const stats = [
    {
      label: "Đã ủng hộ",
      value: data.stats.backed,
      icon: FolderHeart,
      tab: "backed" as const,
    },
    {
      label: "Đã lưu",
      value: data.stats.saved,
      icon: Bookmark,
      tab: "saved" as const,
    },
    {
      label: "Đang theo dõi",
      value: data.stats.following,
      icon: Users,
      tab: "following" as const,
    },
    {
      label: "Tin nhắn mới",
      value: data.stats.messages,
      icon: Mail,
      tab: "messages" as const,
    },
  ];
  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-[#dfcdbd] bg-[#f3e9df] py-8 sm:py-10">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <span className="eyebrow text-[#8c4b32]">
                <CurrentTabIcon className="size-4" /> {currentTab.eyebrow}
              </span>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                {currentTab.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                {currentTab.description}
              </p>
            </div>
            <div className="flex w-fit items-center gap-3 rounded-[12px] border border-[#dfcdbd] bg-white px-4 py-3">
              <span className="grid size-10 place-items-center rounded-[9px] bg-[#f1c98a] font-display text-sm font-extrabold text-[#56352b]">
                {data.user.initials}
              </span>
              <div>
                <p className="text-xs font-bold">{data.user.name}</p>
                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Xin chào {friendlyName} · thành viên từ {data.user.memberSince}
                </p>
              </div>
              <Sparkles className="size-4 text-[#a94f33]" />
            </div>
          </div>
        </div>
      </div>

      <div id="workspace-content" className="container-shell scroll-mt-28 pt-6">
        <div
          className="flex items-center gap-2 text-[10px] font-bold text-[#745f56]"
          role="status"
          aria-live="polite"
        >
          <LayoutDashboard className="size-3.5" /> Đang xem: {currentTab.title}
        </div>

        <div className="mt-3 min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          {dashboardTabIds.map((panelTab) => (
            <section key={panelTab} hidden={tab !== panelTab}>
              <DashboardContent
                tab={panelTab}
                data={data}
                campaigns={campaigns}
                messageComposerOpen={messageComposerOpen}
                onMessageComposerOpenChange={setMessageComposerOpen}
                onOpenMessages={() => {
                  setMessageComposerOpen(true);
                  setTab("messages");
                }}
              />
            </section>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-[#8c4b32]">Đi nhanh trong sổ ủng hộ</p>
              <h2 className="mt-1 font-display text-lg font-extrabold">
                Chuyển mục bằng số liệu đang có
              </h2>
            </div>
            <span className="hidden text-[10px] text-ink-muted sm:block">
              Mỗi ô mở một giao diện riêng
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const active = tab === stat.tab;
              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => setTab(stat.tab)}
                  aria-current={active ? "page" : undefined}
                  className={`flex cursor-pointer items-center gap-4 rounded-[14px] border bg-white p-4 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[#c79869] ${active ? "border-[#9f5c3e] shadow-[0_8px_20px_rgba(121,75,52,0.08)]" : "border-line"}`}
                >
                  <span className="grid size-10 place-items-center rounded-[9px] bg-forest text-lime">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-display text-2xl font-extrabold">
                      {stat.value}
                    </p>
                    <p className="text-[11px] text-ink-muted">{stat.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {tab === "backed" ? (
          <>
            <AttentionRail data={data} />
            {orbitPledge ? (
              <div className="mt-6">
                <RoleConnectionPanel
                  role="BACKER"
                  eyebrow="Dòng tiền của một cam kết"
                  title="Khoản ORBIT của bạn đang ở đâu?"
                  description={`${formatVnd(orbitPledge.amount)} đang được giữ hạn mức cho ${orbitPledge.campaign.title}. Chủ dự án nhìn thấy một chỗ đã giữ, nhưng chưa nhận tiền và chưa được tạo đơn giao quà.`}
                  recordCode={orbitPledge.referenceCode}
                  steps={[
                    {
                      actor: data.user.name,
                      title: "Đã xác nhận cam kết",
                      detail: `${orbitPledge.rewardTitle} · tổng ${formatVnd(orbitPledge.amount)}.`,
                      kind: "person",
                      state: "done",
                    },
                    {
                      actor: "Ngân hàng thử nghiệm",
                      title: "Đang giữ hạn mức",
                      detail: "Chưa chuyển tiền cho Góp hoặc nhóm ORBIT.",
                      kind: "money",
                      state: "current",
                    },
                    {
                      actor: "Xưởng chiến dịch",
                      title: "Ghi nhận một chỗ đã giữ",
                      detail: "Số tiền được cộng vào tiến độ gọi vốn, chưa mở giao quà.",
                      kind: "campaign",
                      state: "current",
                    },
                    {
                      actor: "Ngày 01/10/2026",
                      title: "Hệ thống chốt kết quả",
                      detail: "Đạt mục tiêu mới thu; không đạt thì tự hủy và không thu.",
                      kind: "system",
                      state: "next",
                    },
                  ]}
                  action={{
                    label: "Đối chiếu trang ORBIT",
                    href: `/projects/${orbitPledge.campaign.slug}`,
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
