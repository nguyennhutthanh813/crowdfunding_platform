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
  LayoutDashboard,
  Mail,
  MessageSquare,
  PackageCheck,
  ReceiptText,
  Send,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { BackerPledgeTree } from "@/components/dashboard/backer-pledge-tree";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleMissionBar } from "@/components/workspace/quick-role-switcher";
import { useQueryTab } from "@/hooks/use-query-tab";
import type { BackedProject, UserDashboardData } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";
import { backerFulfillmentText } from "@/lib/pledge/backer-fulfillment";
import { triggerParticleBurst } from "@/lib/ui/particle-burst";

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
      "Theo dõi trạng thái cam kết, tiến độ gọi vốn và tình trạng giao quà của từng chiến dịch.",
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
      "Mỗi cuộc trao đổi gắn với đúng chiến dịch bạn đã ủng hộ, nên câu hỏi và phản hồi không bị lẫn.",
    icon: Mail,
  },
  activity: {
    eyebrow: "Nhật ký tài khoản",
    title: "Hoạt động gần đây của bạn.",
    description:
      "Đối chiếu các lần cam kết, lưu dự án, đọc tin và những cập nhật gần đây trên tài khoản của bạn.",
    icon: Activity,
  },
  settings: {
    eyebrow: "Tùy chọn cá nhân",
    title: "Thông báo và quyền riêng tư.",
    description:
      "Chọn loại cập nhật muốn nhận và quản lý tùy chọn quyền riêng tư của tài khoản.",
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
    <details className="group/attn mt-5 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40">
      <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs transition hover:bg-amber-50/80 sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-extrabold text-amber-800">
            <AlertCircle className="size-3.5" /> Cần bạn xác nhận ({data.attentionItems.length})
          </span>
          <span className="truncate font-bold text-ink">{primary.title}</span>
          <span className="hidden text-ink-muted sm:inline">· {primary.dueLabel}</span>
        </div>
        <span className="inline-flex items-center gap-2 font-bold text-[#047857]">
          <span className="group-open/attn:hidden">Xem chi tiết ↓</span>
          <span className="hidden group-open/attn:inline">Thu gọn ↑</span>
        </span>
      </summary>
      <div className="grid border-t border-amber-200/80 bg-surface lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink">
                {primary.title}
              </h2>
              <p className="mt-1.5 max-w-xl text-xs leading-6 text-ink-soft">
                {primary.detail}
              </p>
              <p className="mt-1.5 text-[11px] font-bold text-[#047857]">
                {primary.dueLabel}
              </p>
            </div>
            <Link
              href={primary.href}
              className="button-primary min-h-10 shrink-0 px-4 text-xs"
            >
              {primary.actionLabel} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
        {updates.length ? (
          <div className="border-t border-slate-200 bg-canvas-soft/60 p-5 lg:border-l lg:border-t-0 sm:p-6">
            <p className="text-[11px] font-bold tracking-wide text-ink-muted">
              CẬP NHẬT LIÊN QUAN
            </p>
            <div className="mt-3 space-y-3">
              {updates.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex items-start justify-between gap-3"
                >
                  <span>
                    <span className="block text-xs font-bold group-hover:text-[#047857]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-muted">
                      {item.dueLabel}
                    </span>
                  </span>
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-ink-muted group-hover:text-[#047857]" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

const fulfillmentSteps = [
  { key: "PENDING", label: "Đã đặt", icon: Clock3 },
  { key: "PREPARING", label: "Đang sản xuất", icon: PackageCheck },
  { key: "SHIPPED", label: "Đang giao", icon: Truck },
  { key: "DELIVERED", label: "Đã nhận", icon: CheckCircle2 },
] as const;

function stepIndexForFulfillment(status: BackedProject["fulfillmentStatus"]): number {
  if (status === "DELIVERED") return 3;
  if (status === "SHIPPED") return 2;
  if (status === "PREPARING") return 1;
  return 0;
}

function DeliveryStepper({ pledge }: { pledge: BackedProject }) {
  const activeStep = stepIndexForFulfillment(pledge.fulfillmentStatus);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-ink">Tiến độ nhận quà</span>
        <span className="font-semibold text-[#047857]">
          {backerFulfillmentText(pledge)}
        </span>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {fulfillmentSteps.map((step, index) => {
          const Icon = step.icon;
          const reached = index <= activeStep;
          return (
            <li
              key={step.key}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-bold ${
                reached
                  ? "border-emerald-200 bg-[#ECFDF5] text-[#047857]"
                  : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">
                {index + 1}. {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function BackedProjectCard({
  item,
  index,
  captured,
  onSelectReceipt,
  onOpenMessages,
}: {
  item: BackedProject;
  index: number;
  captured: boolean;
  onSelectReceipt: (pledgeId: string) => void;
  onOpenMessages: (recipientKey?: string, subject?: string) => void;
}) {
  const isCanceled = item.paymentStatus === "CANCELED" || item.paymentStatus === "FAILED";
  return (
    <article className="overflow-hidden rounded-[18px] border border-slate-200 bg-white transition-colors hover:border-slate-300">
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
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    captured
                      ? "bg-[#ECFDF5] text-[#047857] ring-1 ring-emerald-200"
                      : isCanceled
                        ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                  }`}
                >
                  {captured ? (
                    <>
                      <CheckCircle2 className="size-3.5" /> ✓ Đã trừ tiền
                    </>
                  ) : isCanceled ? (
                    <>
                      <XCircle className="size-3.5" /> ○ Không bị trừ tiền
                    </>
                  ) : (
                    <>
                      <Clock3 className="size-3.5" /> ● Chưa trừ tiền — chờ đạt Goal
                    </>
                  )}
                </span>
                <StatusBadge status={item.paymentStatus} />
              </div>
              <Link
                href={`/projects/${item.campaign.slug}`}
                className="mt-3 block font-display text-lg font-extrabold leading-snug text-ink hover:text-[#047857]"
              >
                {item.campaign.title}
              </Link>
              <p className="mt-1.5 text-xs text-ink-muted">
                Gói chọn: <strong>{item.rewardTitle}</strong>
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted tabular-nums">
                <ReceiptText className="size-3.5" /> {item.referenceCode}
                <span aria-hidden="true">·</span>
                {new Intl.DateTimeFormat("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(item.pledgedAt))}
              </p>
            </div>
            <p className="font-display text-xl font-extrabold text-[#047857] tabular-nums">
              {formatVnd(item.amount)}
            </p>
          </div>

          {captured ? (
            <DeliveryStepper pledge={item} />
          ) : (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-ink-soft">
              <ShieldCheck className="size-3.5 shrink-0 text-[#047857]" />
              <span>
                {isCanceled
                  ? "Đã giải tỏa ủy quyền — không trừ tiền."
                  : "Chưa trừ tiền cho đến khi dự án đạt 100% mục tiêu."}
              </span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-medium text-ink-muted">
              Mốc tiếp theo: <strong className="text-ink-soft">{item.nextStep}</strong> ({item.nextStepAt})
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onSelectReceipt(item.pledgeId)}
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-[#047857]"
              >
                <ReceiptText className="size-3.5" /> Xem biên nhận
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenMessages(
                    `${item.campaign.id}:${item.campaign.creator.id}`,
                    `Trao đổi về ${item.campaign.title}`,
                  )
                }
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-[#047857]"
              >
                <MessageSquare className="size-3.5" /> Nhắn chủ dự án
              </button>
              <Link
                href={`/projects/${item.campaign.slug}`}
                className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[#047857] hover:underline"
              >
                Chi tiết <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

const ESCROW_SIM_STEPS = [
  { id: 1, title: "1. Giữ chỗ 0đ", detail: "Ủy quyền thẻ an toàn" },
  { id: 2, title: "2. Đạt 100% Goal", detail: "Chốt thu tự động" },
  { id: 3, title: "3. QC & Đóng gói", detail: "Kiểm hàng tại xưởng" },
  { id: 4, title: "4. Giao quà & Biên nhận", detail: "Xác thực nhận hàng" },
] as const;

function BackedPanel({
  data,
  onOpenMessages,
}: {
  data: UserDashboardData;
  onOpenMessages: (recipientKey?: string, subject?: string) => void;
}) {
  const [selectedPledgeId, setSelectedPledgeId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "captured" | "unsettled">("all");
  const [escrowSimStep, setEscrowSimStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [simRunning, setSimRunning] = useState(false);

  useEffect(() => {
    if (!simRunning) return;
    const timer = window.setInterval(() => {
      setEscrowSimStep((prev) => {
        if (prev >= 4) {
          setSimRunning(false);
          triggerParticleBurst({ colors: ["#059669", "#0284C7", "#7C3AED"] });
          return 4;
        }
        return (prev + 1) as 0 | 1 | 2 | 3 | 4;
      });
    }, 520);
    return () => window.clearInterval(timer);
  }, [simRunning]);

  const startEscrowSim = (x?: number, y?: number) => {
    if (simRunning) return;
    setEscrowSimStep(1);
    setSimRunning(true);
    triggerParticleBurst({ x, y, count: 16, colors: ["#059669", "#7C3AED"] });
  };

  const selectedPledge = data.backedProjects.find(
    (item) => item.pledgeId === selectedPledgeId,
  );
  const capturedProjects = data.backedProjects.filter(
    (item) => item.paymentStatus === "CAPTURED",
  );
  const unsettledProjects = data.backedProjects.filter(
    (item) => item.paymentStatus !== "CAPTURED",
  );
  const deliveringCount = data.backedProjects.filter(
    (item) => item.fulfillmentStatus === "PREPARING" || item.fulfillmentStatus === "SHIPPED",
  ).length;
  const totalCommitted = data.backedProjects.reduce((sum, p) => sum + p.amount, 0);
  const totalCaptured = capturedProjects.reduce((sum, p) => sum + p.amount, 0);
  const totalUnsettled = unsettledProjects.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">
            Các dự án đã ủng hộ
          </h2>
          <p className="mt-1 text-xs text-ink-muted sm:text-sm">
            Phân tách rõ khoản đã chốt thu sau khi đạt mục tiêu và khoản chưa/không bị trừ tiền theo All-or-Nothing.
          </p>
        </div>
        <div
          className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
          role="group"
          aria-label="Lọc trạng thái trừ tiền"
        >
          {[
            { id: "all", label: `Tất cả (${data.backedProjects.length})` },
            { id: "captured", label: `✓ Đã trừ (${capturedProjects.length})` },
            { id: "unsettled", label: `● Chưa trừ (${unsettledProjects.length})` },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={paymentFilter === option.id}
              onClick={() => setPaymentFilter(option.id as typeof paymentFilter)}
              className={`min-h-8 cursor-pointer rounded-lg px-2.5 text-[11px] font-bold transition ${
                paymentFilter === option.id
                  ? "bg-[#047857] text-white shadow-2xs"
                  : "text-ink-soft hover:bg-white hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {data.backedProjects.length ? (
        <>
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-[#ECFDF5]/60 via-surface to-[#F5F3FF]/35 p-4 shadow-2xs">
            {simRunning ? (
              <div
                aria-hidden="true"
                className="gop-scan-beam pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#059669]/25 via-[#7C3AED]/15 to-transparent"
              />
            ) : null}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-emerald-200 bg-slate-900 shadow-2xs">
                  <Image
                    src="/images/3d/fulfillment-pipeline-3d.jpg"
                    alt="Mô hình 3D két sắt ủy quyền All-or-Nothing và dây chuyền giao quà"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#047857] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                      <ShieldCheck className="size-3" /> Live Escrow Auto-Sim
                    </span>
                    <span className="text-[11px] font-bold text-[#047857]">
                      Bảo vệ All-or-Nothing
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    Chỉ trừ tiền thật &amp; mở giao quà 4 chặng khi dự án đạt 100% Goal.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5 text-[11px] font-bold tabular-nums">
                  <span className="rounded-xl border border-line bg-surface px-3 py-1.5 text-ink">
                    Tổng giữ chỗ: <strong>{formatVnd(totalCommitted, true)}</strong>
                  </span>
                  <span className="rounded-xl border border-emerald-200 bg-[#ECFDF5] px-3 py-1.5 text-[#047857]">
                    Đã chốt thu: <strong>{formatVnd(totalCaptured, true)}</strong> ({capturedProjects.length})
                  </span>
                  <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-800">
                    Chờ/Hủy: <strong>{formatVnd(totalUnsettled, true)}</strong> · Đang giao: <strong>{deliveringCount}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={simRunning}
                  onClick={(event) => startEscrowSim(event.clientX, event.clientY)}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6D28D9] disabled:opacity-70"
                >
                  <Zap className={`size-3.5 ${simRunning ? "animate-spin" : ""}`} />
                  {simRunning
                    ? `Đang mô phỏng (${escrowSimStep}/4)…`
                    : escrowSimStep === 4
                      ? "Chạy lại 4 chặng"
                      : "⚡ Mô phỏng tự động 4 chặng"}
                </button>
              </div>
            </div>

            {escrowSimStep > 0 ? (
              <div className="mt-3.5 border-t border-emerald-200/70 pt-3">
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#059669] via-[#0284C7] to-[#7C3AED] transition-all duration-300"
                    style={{ width: `${(escrowSimStep / 4) * 100}%` }}
                  />
                </div>
                <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ESCROW_SIM_STEPS.map((st) => {
                    const reached = escrowSimStep >= st.id;
                    const active = escrowSimStep === st.id;
                    return (
                      <li
                        key={st.id}
                        className={`rounded-xl border px-3 py-2 text-[11px] transition ${
                          active
                            ? "border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6] ring-2 ring-[#7C3AED]/15"
                            : reached
                              ? "border-emerald-200 bg-[#ECFDF5] text-[#047857]"
                              : "border-line bg-surface text-ink-muted"
                        }`}
                      >
                        <p className="font-extrabold">{st.title}</p>
                        <p className="mt-0.5 text-[10px]">{st.detail}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-6">
            {paymentFilter !== "unsettled" ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                  <span className="size-2.5 rounded-full bg-[#059669]" />
                  Nhóm 1: Đã trừ tiền — Dự án đạt mục tiêu ({capturedProjects.length})
                </h3>
              </div>
              {capturedProjects.length ? (
                <div className="space-y-4">
                  {capturedProjects.map((item, index) => (
                    <BackedProjectCard
                      key={item.pledgeId}
                      item={item}
                      index={index}
                      captured
                      onSelectReceipt={setSelectedPledgeId}
                      onOpenMessages={onOpenMessages}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-xs text-ink-muted">
                  Chưa có khoản ủng hộ nào hoàn tất đối soát thu tiền.
                </p>
              )}
            </div>
            ) : null}

            {paymentFilter !== "captured" ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                  <span className="size-2.5 rounded-full bg-sky-500" />
                  Nhóm 2: Chưa / Không bị trừ tiền ({unsettledProjects.length})
                </h3>
              </div>
              {unsettledProjects.length ? (
                <div className="space-y-4">
                  {unsettledProjects.map((item, index) => (
                    <BackedProjectCard
                      key={item.pledgeId}
                      item={item}
                      index={index}
                      captured={false}
                      onSelectReceipt={setSelectedPledgeId}
                      onOpenMessages={onOpenMessages}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-xs text-ink-muted">
                  Tất cả khoản cam kết của bạn đều đã được quyết toán.
                </p>
              )}
            </div>
            ) : null}
          </div>

          <BackerPledgeTree
            projects={data.backedProjects}
            backerName={data.user.name}
          />

          <Modal
            open={Boolean(selectedPledge)}
            badge={selectedPledge ? selectedPledge.referenceCode : undefined}
            title={
              selectedPledge
                ? `Biên nhận cam kết · ${selectedPledge.campaign.title}`
                : "Biên nhận cam kết"
            }
            description={
              selectedPledge
                ? `Chủ dự án: ${selectedPledge.campaign.creator.name} · Gói quà: ${selectedPledge.rewardTitle}`
                : undefined
            }
            onClose={() => setSelectedPledgeId(null)}
            footer={
              selectedPledge ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/projects/${selectedPledge.campaign.slug}`}
                      className="button-secondary min-h-10 px-4 text-xs"
                    >
                      Xem trang dự án
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPledgeId(null)}
                    className="button-dark min-h-10 px-4 text-xs"
                  >
                    Đóng
                  </button>
                </div>
              ) : undefined
            }
          >
            {selectedPledge ? (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-2xl border border-line bg-[#f7f5f0] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Mã tham chiếu
                    </p>
                    <p className="mt-1 font-mono text-xs font-bold text-ink">
                      {selectedPledge.referenceCode} ({selectedPledge.pledgeId})
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Số tiền cam kết
                    </p>
                    <p className="mt-1 font-display text-lg font-extrabold text-coral-dark">
                      {formatVnd(selectedPledge.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Trạng thái thanh toán
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge status={selectedPledge.paymentStatus} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Tiến độ giao quà
                    </p>
                    <p className="mt-1 text-xs font-bold text-ink">
                      {backerFulfillmentText(selectedPledge)}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#d29b66]/45 bg-[#fff8f0] p-4">
                  <p className="text-xs font-bold text-ink">
                    Mốc tiếp theo · {selectedPledge.nextStepAt}
                  </p>
                  <p className="mt-1.5 text-xs leading-6 text-ink-soft">
                    {selectedPledge.nextStep}
                  </p>
                </div>
              </div>
            ) : null}
          </Modal>
        </>
      ) : (
        <DashboardEmptyState
          icon={FolderHeart}
          title="Bạn chưa ủng hộ dự án nào"
          detail="Hãy bắt đầu bằng một dự án có kế hoạch rõ ràng. Trước khi xác nhận, FundViet luôn cho bạn xem đầy đủ khoản tiền, quà và phí giao hàng."
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-coral">
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
  presetRecipientKey,
  presetSubject,
}: {
  data: UserDashboardData;
  composeOpen: boolean;
  onComposeOpenChange: (open: boolean) => void;
  presetRecipientKey?: string;
  presetSubject?: string;
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
  const activeRecipientKey =
    presetRecipientKey &&
    recipients.some((item) => item.key === presetRecipientKey)
      ? presetRecipientKey
      : draftMessage.recipientKey || recipients[0]?.key || "";
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

  const activeSubject = draftMessage.subject || presetSubject || "";

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSubject.trim() || !draftMessage.body.trim()) return;
    const recipient = recipients.find(
      (item) => item.key === activeRecipientKey,
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
        subject: activeSubject,
        body: draftMessage.body,
      });
      setSentMessages((current) => [
        {
          id: `sent-${Date.now()}`,
          campaignId: recipient.campaignId,
          senderId: session?.user.id ?? "preview-backer",
          recipientId: recipient.userId,
          recipient: recipient.name,
          subject: activeSubject.trim(),
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
          <span className="rounded-full bg-coral px-2.5 py-1 text-[11px] font-bold text-white">
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
                value={activeRecipientKey}
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
                value={activeSubject}
                onChange={(event) =>
                  setDraftMessage((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                className="input-field mt-2"
                placeholder="Ví dụ: Hỏi về thời gian giao quà"
                maxLength={80}
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
              maxLength={240}
            />
            <span className="mt-1.5 flex justify-between gap-4 text-[11px] text-ink-muted">
              <span>Viết ngắn gọn để nhóm dự án phản hồi nhanh hơn.</span>
              <span>{draftMessage.body.length}/240</span>
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
                !activeSubject.trim() ||
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
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Vừa gửi
          </p>
          {sentMessages.map((message) => (
            <article
              key={message.id}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold">Đến {message.recipient}</p>
                <span className="text-[11px] text-emerald-700">
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
          {data.messages.map((message) => {
            const matchedRecipient = recipients.find(
              (item) => item.name === message.sender,
            );
            return (
              <div
                key={message.id}
                className={`p-4 hover:bg-[#fafaf6] ${!readIds.has(message.id) ? "bg-[#fffaf6]" : ""}`}
              >
                <button
                  type="button"
                  aria-expanded={selectedId === message.id}
                  onClick={() => openMessage(message.id)}
                  className="flex w-full cursor-pointer gap-4 text-left"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9eddf] text-xs font-bold">
                    {message.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="truncate font-display text-sm font-extrabold">
                        {message.sender}
                      </p>
                      <span className="shrink-0 text-[11px] text-ink-muted">
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
                  </div>
                  {!readIds.has(message.id) ? (
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-coral" />
                  ) : null}
                </button>
                {selectedId === message.id ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-14">
                    <p className="text-[11px] font-bold text-coral-dark">
                      Tin nhắn đã được đánh dấu là đã đọc.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftMessage((current) => ({
                          ...current,
                          recipientKey:
                            matchedRecipient?.key ??
                            current.recipientKey ??
                            recipients[0]?.key ??
                            "",
                          subject: message.subject.startsWith("Phản hồi:")
                            ? message.subject
                            : `Phản hồi: ${message.subject}`.slice(0, 80),
                        }));
                        onComposeOpenChange(true);
                      }}
                      className="button-secondary min-h-9 px-3 text-xs"
                    >
                      <MessageSquare className="size-3.5" /> Phản hồi tin nhắn
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
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
              <p className="mt-2 text-[11px] text-ink-muted">
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
  presetRecipientKey,
  presetSubject,
}: {
  tab: DashboardTab;
  data: UserDashboardData;
  onOpenMessages: (recipientKey?: string, subject?: string) => void;
  messageComposerOpen: boolean;
  onMessageComposerOpenChange: (open: boolean) => void;
  presetRecipientKey?: string;
  presetSubject?: string;
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
        presetRecipientKey={presetRecipientKey}
        presetSubject={presetSubject}
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
  const [presetRecipientKey, setPresetRecipientKey] = useState<
    string | undefined
  >(undefined);
  const [presetSubject, setPresetSubject] = useState<string | undefined>(
    undefined,
  );
  const currentTab = dashboardTabCopy[tab];
  const CurrentTabIcon = currentTab.icon;
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
      <div className="border-b border-line bg-surface py-4 sm:py-5">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#047857]">
                <CurrentTabIcon className="size-3.5" /> {currentTab.eyebrow}
              </span>
              <h1 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
                {currentTab.title}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-soft sm:text-sm">
                {currentTab.description}
              </p>
            </div>
            <div className="flex w-fit items-center gap-3 rounded-xl border border-line bg-canvas-soft px-3.5 py-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-[#047857] font-display text-xs font-extrabold text-white">
                {data.user.initials}
              </span>
              <div>
                <p className="text-xs font-bold text-ink">{data.user.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  Xin chào {friendlyName} · từ {data.user.memberSince}
                </p>
              </div>
              <CircleUserRound className="size-4 text-[#047857]" />
            </div>
          </div>
        </div>
      </div>

      <div id="workspace-content" className="container-shell scroll-mt-28 pt-4">
        <RoleMissionBar role="BACKER" />
        <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const active = tab === stat.tab;
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => setTab(stat.tab)}
                aria-pressed={active}
                className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border bg-surface p-2.5 text-left transition-[border-color,transform] hover:-translate-y-0.5 sm:gap-3 sm:p-3.5 ${active ? "border-[#047857] ring-2 ring-[#047857]/15" : "border-line hover:border-line-strong"}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#ECFDF5] text-[#047857] sm:size-9">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-extrabold text-ink tabular-nums sm:text-xl">
                    {stat.value}
                  </p>
                  <p className="text-[11px] font-semibold text-ink-muted">{stat.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="mb-4 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xs"
          role="tablist"
          aria-label="Khu vực người ủng hộ"
        >
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition ${
                  active
                    ? "bg-[#047857] text-white shadow-xs"
                    : "text-ink-soft hover:bg-canvas-soft hover:text-ink"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center gap-2 text-xs font-bold text-ink-muted"
          role="status"
          aria-live="polite"
        >
          <LayoutDashboard className="size-3.5 text-[#047857]" /> Đang xem: {currentTab.title}
        </div>

        {tab === "backed" ? (
          <AttentionRail data={data} />
        ) : null}

        <div className="mt-4 min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          {dashboardTabIds.map((panelTab) => (
            <section key={panelTab} hidden={tab !== panelTab}>
              <DashboardContent
                tab={panelTab}
                data={data}
                messageComposerOpen={messageComposerOpen}
                onMessageComposerOpenChange={setMessageComposerOpen}
                presetRecipientKey={presetRecipientKey}
                presetSubject={presetSubject}
                onOpenMessages={(recipientKey, subject) => {
                  if (recipientKey) setPresetRecipientKey(recipientKey);
                  if (subject) setPresetSubject(subject);
                  setMessageComposerOpen(true);
                  setTab("messages");
                }}
              />
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
