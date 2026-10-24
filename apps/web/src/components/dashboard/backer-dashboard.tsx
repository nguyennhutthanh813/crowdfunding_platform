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
import type { BackedProject, UserDashboardData } from "@/lib/api";
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
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
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
      <Link
        href={actionHref}
        className="button-dark mt-5 min-h-11 px-4 text-xs"
      >
        {actionLabel} <ArrowRight className="size-3.5" />
      </Link>
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

function PledgeLifecycleGuide({ projects }: { projects: BackedProject[] }) {
  const summarize = (statuses: BackedProject["paymentStatus"][]) => {
    const matched = projects.filter((item) => statuses.includes(item.paymentStatus));

    return {
      count: matched.length,
      amount: matched.reduce((total, item) => total + item.amount, 0),
    };
  };

  const authorized = summarize(["AUTHORIZED"]);
  const captured = summarize(["CAPTURED"]);
  const canceled = summarize(["CANCELED"]);
  const failed = summarize(["FAILED"]);

  return (
    <section
      aria-labelledby="pledge-lifecycle-title"
      className="mt-6 overflow-hidden rounded-[20px] border border-forest/15 bg-forest text-white"
    >
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="p-5 sm:p-6">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#d8e2c6]">
            <ShieldCheck className="size-4" /> Dòng tiền cam kết
          </p>
          <h3
            id="pledge-lifecycle-title"
            className="mt-3 max-w-sm font-display text-xl font-extrabold leading-snug"
          >
            Một khoản ủng hộ chỉ đi theo một trong hai kết quả.
          </h3>
          <p className="mt-2 max-w-md text-xs leading-6 text-white/70">
            Góp áp dụng All-or-Nothing: khi dự án còn chạy, ngân hàng mới giữ
            hạn mức. Nền tảng chưa thu tiền của bạn.
          </p>

          <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#dce7c8] text-forest">
                <Clock3 className="size-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold">Đang chạy · chưa thu</p>
                <p className="mt-1 text-[11px] text-white/65">
                  {authorized.count} cam kết · {formatVnd(authorized.amount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#f7f4ec] p-5 text-ink lg:border-l lg:border-t-0 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e9eddf] text-forest">
              <GitFork className="size-4" />
            </span>
            <div>
              <p className="text-xs font-extrabold">Khi chiến dịch kết thúc</p>
              <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                Hệ thống đối chiếu số tiền thực tế với mục tiêu đã công bố.
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-700/15 bg-white p-4">
              <dt className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
                <CheckCircle2 className="size-4" /> Đạt mục tiêu
              </dt>
              <dd className="mt-3 font-display text-lg font-extrabold">
                {formatVnd(captured.amount)}
              </dd>
              <dd className="mt-1 text-[10px] font-bold text-ink-muted">
                {captured.count} khoản đã thu tiền
              </dd>
              <dd className="mt-3 border-t border-line pt-3 text-[11px] leading-5 text-ink-soft">
                Tiền được thu, sau đó chủ dự án chuẩn bị và giao quà.
              </dd>
            </div>

            <div className="rounded-2xl border border-stone-300 bg-white p-4">
              <dt className="flex items-center gap-2 text-xs font-extrabold text-stone-700">
                <XCircle className="size-4" /> Không đạt mục tiêu
              </dt>
              <dd className="mt-3 font-display text-lg font-extrabold">
                {formatVnd(canceled.amount)}
              </dd>
              <dd className="mt-1 text-[10px] font-bold text-ink-muted">
                {canceled.count} khoản đã hủy giữ tiền
              </dd>
              <dd className="mt-3 border-t border-line pt-3 text-[11px] leading-5 text-ink-soft">
                Không thu tiền và cũng không tạo đơn giao quà.
              </dd>
            </div>
          </dl>

          {failed.count ? (
            <p className="mt-3 rounded-xl border border-amber-700/15 bg-[#fff8e8] px-3 py-2 text-[10px] font-semibold leading-5 text-amber-900">
              Có {failed.count} khoản thanh toán cần kiểm tra lại, tổng cộng {" "}
              {formatVnd(failed.amount)}. Đây là lỗi thanh toán, không phải kết
              quả gọi vốn của dự án.
            </p>
          ) : null}
          <p className="mt-3 text-[9px] font-semibold text-ink-muted">
            Số liệu được tính từ các cam kết đang hiển thị bên dưới.
          </p>
        </div>
      </div>
    </section>
  );
}

function FulfillmentState({ status }: { status: BackedProject["fulfillmentStatus"] }) {
  const states: Record<
    BackedProject["fulfillmentStatus"],
    { label: string; icon: LucideIcon; className: string }
  > = {
    PENDING: {
      label: "Chờ kết quả",
      icon: Clock3,
      className: "text-amber-700",
    },
    PREPARING: {
      label: "Đang chuẩn bị",
      icon: PackageCheck,
      className: "text-emerald-700",
    },
    SHIPPED: {
      label: "Đã bàn giao vận chuyển",
      icon: Truck,
      className: "text-sky-700",
    },
    DELIVERED: {
      label: "Đã giao",
      icon: CheckCircle2,
      className: "text-emerald-700",
    },
    NOT_APPLICABLE: {
      label: "Không áp dụng",
      icon: XCircle,
      className: "text-stone-500",
    },
  };
  const state = states[status];
  const Icon = state.icon;

  return (
    <div className="flex items-center gap-2 text-xs text-ink-soft">
      <Icon className={`size-4 shrink-0 ${state.className}`} />
      <span>
        Gói quà: <strong>{state.label}</strong>
      </span>
    </div>
  );
}

function BackedPanel({
  data,
  onOpenMessages,
}: {
  data: UserDashboardData;
  onOpenMessages: () => void;
}) {
  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-extrabold">
            Các dự án đã ủng hộ
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Mỗi khoản đều ghi rõ đã thu, đang chờ kết quả hay đã hủy.
          </p>
        </div>
        <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft">
          {data.backedProjects.length} cam kết gần đây
        </span>
      </div>
      {data.backedProjects.length ? (
        <>
          <PledgeLifecycleGuide projects={data.backedProjects} />
          <div className="mt-5 space-y-4">
            {data.backedProjects.map((item, index) => (
              <article
                key={item.pledgeId}
                className="overflow-hidden rounded-[18px] border border-line bg-white"
              >
                <div className="grid sm:grid-cols-[190px_1fr]">
                  <CampaignVisual
                    {...item.campaign.visual}
                    compact
                    priority={index === 0}
                    className="min-h-44 sm:min-h-full"
                  />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <StatusBadge status={item.paymentStatus} />
                        <Link
                          href={`/projects/${item.campaign.slug}`}
                          className="mt-3 block font-display text-lg font-extrabold leading-snug hover:text-coral-dark"
                        >
                          {item.campaign.title}
                        </Link>
                        <p className="mt-2 text-xs text-ink-muted">
                          {item.rewardTitle}
                        </p>
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ink-muted">
                          <ReceiptText className="size-3.5" /> {item.referenceCode}
                          <span aria-hidden="true">·</span>
                          {new Intl.DateTimeFormat("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(new Date(item.pledgedAt))}
                        </p>
                      </div>
                      <p className="font-display text-xl font-extrabold text-coral-dark">
                        {formatVnd(item.amount)}
                      </p>
                    </div>
                    <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                      <FulfillmentState status={item.fulfillmentStatus} />
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={onOpenMessages}
                          className="inline-flex min-h-11 items-center gap-1.5 px-1 text-xs font-bold text-ink-soft hover:text-coral-dark"
                        >
                          <MessageSquare className="size-3.5" /> Nhắn chủ dự án
                        </button>
                        <Link
                          href={`/projects/${item.campaign.slug}`}
                          className="inline-flex min-h-11 items-center gap-1.5 px-1 text-xs font-bold text-coral-dark"
                        >
                          Chi tiết <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                    <div className="mt-4 border-l-2 border-[#d29b66] bg-[#fff8f0] px-3 py-2.5">
                      <p className="text-[10px] font-bold text-ink">Mốc kế tiếp</p>
                      <p className="mt-1 text-[11px] leading-5 text-ink-soft">
                        {item.nextStep}
                      </p>
                      <p className="mt-1 text-[9px] font-semibold text-ink-muted">
                        {item.nextStepAt}
                      </p>
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
  composeOpen,
  onComposeOpenChange,
}: {
  data: UserDashboardData;
  composeOpen: boolean;
  onComposeOpenChange: (open: boolean) => void;
}) {
  const { session } = useAuth();
  const recipients = [
    ...new Map(
      data.backedProjects.map((item) => {
        const recipient = {
          key: `${item.campaign.id}:${item.campaign.creator.id}`,
          campaignId: item.campaign.id,
          campaignTitle: item.campaign.title,
          userId: item.campaign.creator.id,
          name: item.campaign.creator.name,
        };
        return [recipient.key, recipient] as const;
      }),
    ).values(),
  ];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [draftMessage, setDraftMessage] = useState({
    recipientKey: recipients[0]?.key ?? "",
    subject: "",
    body: "",
  });
  const [sentMessages, setSentMessages] = useState<
    Array<{
      id: string;
      campaignId: string;
      senderId: string;
      recipientId: string;
      recipient: string;
      subject: string;
      body: string;
      sentAt: string;
    }>
  >(() => data.sentMessages);
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
      setSyncNotice(clientRequestMessage(error, "Chưa thể đánh dấu đã đọc. Bạn thử lại sau nhé."));
    });
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftMessage.subject.trim() || !draftMessage.body.trim()) return;
    const recipient = recipients.find(
      (item) => item.key === draftMessage.recipientKey,
    );
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
        subject: draftMessage.subject,
        body: draftMessage.body,
      });
      setSentMessages((current) => [
        {
          id: `sent-${Date.now()}`,
          campaignId: recipient.campaignId,
          senderId: session?.user.id ?? "preview-backer",
          recipientId: recipient.userId,
          recipient: recipient.name,
          subject: draftMessage.subject.trim(),
          body: draftMessage.body.trim(),
          sentAt: "Vừa xong",
        },
        ...current,
      ]);
      setDraftMessage((current) => ({
        ...current,
        subject: "",
        body: "",
      }));
      onComposeOpenChange(false);
      setSyncNotice("Tin nhắn đã được gửi đến chủ dự án.");
    } catch (error) {
      setSyncNotice(clientRequestMessage(error, "Chưa thể gửi tin nhắn. Nội dung của bạn vẫn được giữ lại."));
    } finally {
      setSending(false);
    }
  };

  if (!recipients.length) {
    return (
      <div>
        <h2 className="font-display text-2xl font-extrabold">Hộp thư</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Tin nhắn với các nhóm dự án sẽ được lưu tại đây.
        </p>
        <DashboardEmptyState
          icon={Mail}
          title="Hộp thư đang trống"
          detail="Sau khi ủng hộ hoặc theo dõi một dự án, bạn có thể trao đổi trực tiếp với nhóm thực hiện từ trang chiến dịch."
          actionLabel="Xem dự án đang gọi vốn"
          actionHref="/discover?status=LIVE"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Hộp thư</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Tin nhắn từ những dự án bạn đã ủng hộ hoặc đang theo dõi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-coral px-2.5 py-1 text-[10px] font-bold text-white">
            {data.messages.filter((item) => !readIds.has(item.id)).length} chưa
            đọc
          </span>
          <button
            type="button"
            aria-expanded={composeOpen}
            onClick={() => onComposeOpenChange(!composeOpen)}
            className="button-dark min-h-11 px-4 text-xs"
          >
            <MessageSquare className="size-4" /> Soạn tin
          </button>
        </div>
      </div>
      <p
        className={`mt-3 min-h-5 text-xs ${syncNotice.startsWith("Chưa") ? "text-red-600" : "text-ink-muted"}`}
        role={syncNotice.startsWith("Chưa") ? "alert" : "status"}
      >
        {syncNotice}
      </p>
      <Modal
        open={composeOpen}
        title="Soạn tin cho nhóm dự án"
        description="Tin nhắn được gắn với đúng chiến dịch và tài khoản người gửi để nhóm dự án có thể tra lại lịch sử."
        onClose={() => onComposeOpenChange(false)}
        locked={sending}
      >
        <form
          onSubmit={sendMessage}
          className="rounded-[18px] border border-coral/20 bg-[#fffaf6] p-4 sm:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-xs font-bold text-ink-soft">Gửi đến</span>
              <select
                name="message-recipient"
                value={draftMessage.recipientKey}
                onChange={(event) =>
                  setDraftMessage((current) => ({
                    ...current,
                    recipientKey: event.target.value,
                  }))
                }
                className="input-field mt-2"
              >
                {recipients.map((recipient) => (
                  <option key={recipient.key} value={recipient.key}>
                    {recipient.campaignTitle} · {recipient.name}
                  </option>
                ))}
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
                placeholder="Ví dụ: Hỏi về thời gian giao quà"
                maxLength={180}
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-xs font-bold text-ink-soft">Nội dung</span>
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
              placeholder="Viết nội dung bạn muốn trao đổi với nhóm dự án…"
              maxLength={4000}
            />
            <span className="mt-1.5 flex justify-between gap-4 text-[10px] text-ink-muted">
              <span>Viết chi tiết để nhóm dự án phản hồi chính xác.</span>
              <span>{draftMessage.body.length}/4000</span>
            </span>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onComposeOpenChange(false)}
              className="button-ghost min-h-11 px-4 text-xs"
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
              className="button-primary min-h-11 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-4" />
              {sending ? "Đang gửi…" : "Gửi tin nhắn"}
            </button>
          </div>
        </form>
      </Modal>
      {sentMessages.length ? (
        <div className="mt-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Vừa gửi
          </p>
          {sentMessages.map((message) => (
            <article
              key={message.id}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold">Đến {message.recipient}</p>
                <span className="text-[10px] text-emerald-700">
                  {message.sentAt}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{message.subject}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                {message.body}
              </p>
            </article>
          ))}
        </div>
      ) : null}
      {data.messages.length ? (
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-white">
          {data.messages.map((message) => (
            <button
              key={message.id}
              type="button"
              aria-expanded={selectedId === message.id}
              onClick={() => openMessage(message.id)}
              className={`flex w-full cursor-pointer gap-4 p-4 text-left hover:bg-[#fafaf6] ${!readIds.has(message.id) ? "bg-[#fffaf6]" : ""}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9eddf] text-xs font-bold">
                {message.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <p className="truncate font-display text-sm font-extrabold">
                    {message.sender}
                  </p>
                  <span className="shrink-0 text-[10px] text-ink-muted">
                    {message.sentAt}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-ink-soft">
                  {message.subject}
                </p>
                <p
                  className={`mt-1 text-xs text-ink-muted ${selectedId === message.id ? "whitespace-normal leading-5" : "truncate"}`}
                >
                  {message.preview}
                </p>
                {selectedId === message.id ? (
                  <p className="mt-3 text-[10px] font-bold text-coral-dark">
                    Tin nhắn đã được đánh dấu là đã đọc.
                  </p>
                ) : null}
              </div>
              {!readIds.has(message.id) ? (
                <span className="mt-2 size-2 shrink-0 rounded-full bg-coral" />
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[22px] border border-dashed border-line bg-white p-7 text-center">
          <Mail className="mx-auto size-5 text-ink-muted" />
          <p className="mt-3 text-sm font-bold">Chưa có thư đến</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            Bạn vẫn có thể chủ động nhắn cho nhóm dự án bằng nút Soạn tin.
          </p>
        </div>
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
  onOpenMessages,
  messageComposerOpen,
  onMessageComposerOpenChange,
}: {
  tab: DashboardTab;
  data: UserDashboardData;
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
}: {
  data: UserDashboardData;
  friendlyName: string;
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
