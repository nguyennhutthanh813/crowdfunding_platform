"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeDollarSign,
  Ban,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  FileCheck2,
  Flag,
  History,
  Headphones,
  LoaderCircle,
  Radar,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminReviewTree } from "@/components/admin/admin-review-tree";
import { Modal } from "@/components/ui/modal";
import { RoleMissionBar } from "@/components/workspace/quick-role-switcher";
import { useQueryTab } from "@/hooks/use-query-tab";
import type { AdminDashboardData, FraudAlert } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";
import { triggerParticleBurst } from "@/lib/ui/particle-burst";

const nav = [
  { id: "overview", label: "Tổng quan", icon: BarChart3 },
  { id: "reviews", label: "Duyệt chiến dịch", icon: FileCheck2 },
  { id: "fraud", label: "Cảnh báo gian lận", icon: ShieldAlert },
  { id: "users", label: "Người dùng", icon: UserRoundCog },
  { id: "settings", label: "Phí & nhật ký", icon: Settings2 },
] as const;

type AdminTab = (typeof nav)[number]["id"];
const adminTabIds = nav.map((item) => item.id);
type ReviewDecision = "APPROVED" | "CHANGES" | "REJECTED";

const adminTabCopy: Record<
  AdminTab,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  overview: {
    eyebrow: "Tổng quan ca trực",
    title: "Việc nào cần xử lý trước?",
    description:
      "Xem hồ sơ đến hạn, cảnh báo đang mở và các mốc vận hành quan trọng trong cùng một ca trực.",
    icon: BarChart3,
  },
  reviews: {
    eyebrow: "Kiểm duyệt chiến dịch",
    title: "Đọc hồ sơ và bằng chứng trước khi duyệt.",
    description:
      "Mỗi quyết định gắn với đúng chiến dịch, phiên bản gửi duyệt, danh sách kiểm tra và lý do của quản trị viên.",
    icon: FileCheck2,
  },
  fraud: {
    eyebrow: "Rủi ro giao dịch",
    title: "Đọc tín hiệu trước khi đưa ra kết luận.",
    description:
      "Điểm cảnh báo chỉ giúp sắp thứ tự kiểm tra; quản trị viên vẫn phải đọc dấu hiệu, lịch sử và tự xác nhận quyết định cuối.",
    icon: ShieldAlert,
  },
  users: {
    eyebrow: "Tài khoản & quyền truy cập",
    title: "Quản lý người dùng theo trạng thái hiện có.",
    description:
      "Tìm tài khoản, đối chiếu vai trò và chỉ khóa khi có lý do rõ ràng cùng bước xác nhận lần hai.",
    icon: UserRoundCog,
  },
  settings: {
    eyebrow: "Cấu hình vận hành",
    title: "Phí nền tảng và nhật ký thay đổi.",
    description:
      "Thay đổi cấu hình có phản hồi rõ, còn lịch sử cho biết ai đã làm gì và vào thời điểm nào.",
    icon: Settings2,
  },
};

const fraudStatusLabels: Record<FraudAlert["status"], string> = {
  NEW: "Mới",
  REVIEWING: "Đang xem",
  CLEARED: "Không có rủi ro",
  ESCALATED: "Kiểm tra sâu",
};

function InlineActionConfirm({
  title,
  detail,
  confirmLabel,
  busy,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  detail: string;
  confirmLabel: string;
  busy: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open
      title={title}
      description={detail}
      onClose={onCancel}
      locked={busy}
      size="sm"
    >
      <p className={`rounded-xl border px-4 py-3 text-xs leading-5 ${danger ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        Sau khi xác nhận, quyết định sẽ được ghi vào nhật ký vận hành và cập nhật trạng thái ngay lập tức.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="button-ghost min-h-11 px-4 text-xs"
        >
          Quay lại kiểm tra
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-extrabold disabled:cursor-wait disabled:opacity-60 ${danger ? "bg-red-700 text-white hover:bg-red-800" : "bg-forest text-white hover:bg-[#142d25]"}`}
        >
          {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {busy ? "Đang lưu…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

async function callAdminAction(
  action: string,
  payload: Record<string, unknown>,
) {
  return clientRequest<{ data: { auditId: string } }>("/api/v1/admin/actions", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

function adminRequestError(error: unknown, fallback: string) {
  return clientRequestMessage(error, fallback);
}

function AdminNotice({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  const isError = /^(Cần|Chưa|Mất|Không|Mức phí)/.test(message);

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold leading-5 ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      } ${className}`}
    >
      {isError ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <Check className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

function RevenueChart({ data }: { data: AdminDashboardData["fundingSeries"] }) {
  const max = Math.max(...data.map((item) => item.amount));
  return (
    <div className="mt-7 flex h-44 items-end gap-3 sm:gap-5">
      {data.map((item, index) => (
        <div
          key={item.month}
          className="flex h-full flex-1 flex-col justify-end"
        >
          <div
            className={`group relative w-full rounded-t-[8px] transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-95 ${index === data.length - 1 ? "bg-coral" : "bg-[#477060]"}`}
            style={{ height: `${Math.max(18, (item.amount / max) * 100)}%` }}
          >
            <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-lg bg-forest px-2 py-1 text-[11px] font-bold text-white group-hover:block">
              {formatVnd(item.amount, true)}
            </span>
          </div>
          <p
            className={`mt-3 text-center text-[11px] font-bold ${index === data.length - 1 ? "text-coral-dark" : "text-ink-muted"}`}
          >
            {item.month}
          </p>
        </div>
      ))}
    </div>
  );
}

function OverviewPanel({ data }: { data: AdminDashboardData }) {
  const [scanOpen, setScanOpen] = useState(false);
  const topAlert = data.alerts[0];
  const topReview = data.reviewQueue[0];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[18px] border border-line bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold">Ca trực vận hành · 13/09/2026</p>
            <p className="mt-1 text-[11px] text-ink-muted">
              Việc cần xử lý trước khi chuyển ca chiều · {data.operations.reconciliationLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              setScanOpen((prev) => !prev);
              triggerParticleBurst({
                x: event.clientX,
                y: event.clientY,
                colors: ["#7C3AED", "#E11D48", "#059669"],
              });
            }}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6D28D9]"
          >
            <Zap className="size-3.5" /> {scanOpen ? "Ẩn đề xuất AI" : "AI Quét & Đề xuất Ưu tiên"}
          </button>
        </div>
        {scanOpen ? (
          <div className="relative overflow-hidden border-b border-[#DDD6FE] bg-[#F5F3FF]/70 px-5 py-4 text-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl border border-[#DDD6FE] bg-slate-950 shadow-xs">
                <Image
                  src="/images/3d/fraud-shield-radar-3d.jpg"
                  alt="Mô hình 3D radar AI Isolation Forest"
                  fill
                  sizes="144px"
                  className="object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <span className="absolute bottom-1.5 left-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                  <Radar className="size-3 animate-spin" /> AI Radar Active
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[#7C3AED]">
                  ✦ Kết quả quét ưu tiên tự động trong ca (Isolation Forest + Rule Engine):
                </p>
                <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                  {topAlert ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-surface p-3">
                      <div>
                        <p className="font-bold text-rose-700">1. Rủi ro cao ({topAlert.riskScore}/100)</p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">{topAlert.campaignTitle}</p>
                      </div>
                      <Link href="/admin?tab=fraud" className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700">
                        Xử lý ngay
                      </Link>
                    </div>
                  ) : null}
                  {topReview ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-surface p-3">
                      <div>
                        <p className="font-bold text-amber-800">2. Hồ sơ chờ duyệt ({topReview.reviewDueAt})</p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">{topReview.title}</p>
                      </div>
                      <Link href="/admin?tab=reviews" className="shrink-0 rounded-lg bg-[#047857] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#065F46]">
                        Mở duyệt
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              icon: FileCheck2,
              value: `${data.operations.reviewsDueToday} hồ sơ`,
              label: "đến hạn trong ca trực",
              detail: `${data.operations.overdueReviews} hồ sơ đã quá hạn xử lý`,
              tone: "text-amber-700 bg-amber-50",
            },
            {
              icon: CircleDollarSign,
              value: formatVnd(data.operations.authorizedAmount, true),
              label: "cam kết đang ủy quyền",
              detail: `${data.operations.authorizedPledges.toLocaleString("vi-VN")} cam kết chưa thu`,
              tone: "text-blue-700 bg-blue-50",
            },
            {
              icon: Headphones,
              value: `${data.operations.supportCasesOpen} yêu cầu`,
              label: "hỗ trợ đang mở",
              detail: "3 yêu cầu liên quan thanh toán",
              tone: "text-red-700 bg-red-50",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex gap-3 p-5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-[10px] ${item.tone}`}>
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-display text-lg font-extrabold">{item.value}</p>
                  <p className="mt-0.5 text-xs font-semibold text-ink-soft">{item.label}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[18px] border border-line bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow text-coral">
                <BarChart3 className="size-4" /> Dòng vốn
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                Cam kết theo tháng
              </h2>
              <p className="mt-1 text-[11px] text-ink-muted">
                Tổng hợp giá trị cam kết và kết quả chốt thu theo từng tháng
              </p>
            </div>
            <span className="rounded-[8px] bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              +8,8% tháng này
            </span>
          </div>
          <RevenueChart data={data.fundingSeries} />
        </article>
        <article className="rounded-[18px] border border-rose-200 bg-rose-50/40 p-6 text-ink">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-[#E11D48]">
                <ShieldAlert className="size-4" /> Rủi ro cần xem
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
                Cảnh báo mới nhất
              </h2>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="size-5" />
            </span>
          </div>
          <div className="mt-6 rounded-xl border border-rose-200 bg-white p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-ink">
                  {data.alerts[0].campaignTitle}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {data.alerts[0].userLabel} · {data.alerts[0].createdAt}
                </p>
              </div>
              <p className="font-display text-3xl font-extrabold text-rose-700 tabular-nums">
                {data.alerts[0].riskScore}
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-[11px] text-ink-soft">
              {data.alerts[0].signals.map((signal) => (
                <li key={signal} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-600" />
                  {signal}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 text-xs leading-5 text-ink-muted">
            Điểm số chỉ giúp quản trị viên sắp xếp thứ tự kiểm tra, không tự động
            khóa tài khoản.
          </p>
        </article>
      </div>

      <details className="group/log rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="eyebrow text-[#047857]">
              <History className="size-4" /> Nhật ký quyết định ({data.recentDecisions.length})
            </p>
            <h2 className="mt-1.5 font-display text-xl font-extrabold text-ink">
              Thao tác gần nhất của ca vận hành
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-bold text-[#047857]">
            <span className="hidden items-center gap-1 text-[11px] font-medium text-ink-muted sm:inline-flex">
              <Clock3 className="size-3.5" /> {data.operations.snapshotAt}
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-ink-soft">
              <span className="group-open/log:hidden">Xem toàn bộ ↓</span>
              <span className="hidden group-open/log:inline">Thu gọn ↑</span>
            </span>
          </div>
        </summary>
        <div className="mt-5 divide-y divide-line border-y border-line">
          {data.recentDecisions.map((entry) => (
            <div key={entry.id} className="grid gap-2 py-4 sm:grid-cols-[84px_1fr_1.2fr] sm:items-start">
              <p className="text-[11px] font-bold text-ink-muted">{entry.time}</p>
              <div>
                <p className="text-xs font-bold">{entry.action}</p>
                <p className="mt-1 text-[11px] text-ink-muted">{entry.actor}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-soft">{entry.target}</p>
                <p className="mt-1 text-[11px] leading-5 text-ink-muted">{entry.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function ReviewPanel({ data }: { data: AdminDashboardData }) {
  const router = useRouter();
  const [decidedVersions, setDecidedVersions] = useState<Record<string, number>>({});
  const reviews = data.reviewQueue.filter((item) => decidedVersions[item.id] !== item.submissionVersion);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [scanningReviewId, setScanningReviewId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    decision: ReviewDecision;
  } | null>(null);

  useEffect(() => {
    if (!scanningReviewId) return;
    const timer = window.setTimeout(() => {
      const target = reviews.find((item) => item.id === scanningReviewId);
      setExpandedReview(scanningReviewId);
      if (target) {
        const passCount = target.checks.filter((check) => check.status === "PASS").length;
        const warnLabels = target.checks
          .filter((check) => check.status !== "PASS")
          .map((check) => check.label)
          .join(", ");
        const draftFeedback = warnLabels
          ? `✦ AI Đối chiếu 8 tiêu chí: đạt ${passCount}/${target.checks.length} nhóm (${target.completeness}% đầy đủ). Cần rà thêm: ${warnLabels}.`
          : `✦ AI Đối chiếu 8 tiêu chí: đạt ${passCount}/${target.checks.length} nhóm (${target.completeness}% đầy đủ). Câu chuyện, rủi ro, gói thưởng và tài liệu hợp lệ — đề xuất Duyệt.`;
        setFeedback((current) => ({
          ...current,
          [target.id]: current[target.id]?.trim() ? current[target.id] : draftFeedback,
        }));
        setNotice(`Đã đối chiếu hồ sơ "${target.title}" — xem chi tiết bằng chứng bên dưới.`);
      }
      setScanningReviewId(null);
      triggerParticleBurst({ colors: ["#7C3AED", "#059669", "#A7F3D0"] });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [reviews, scanningReviewId]);

  const requestDecision = (id: string, decision: ReviewDecision) => {
    if (decision === "APPROVED" && reviews.some((item) => item.id === id && item.evidence) && expandedReview !== id) {
      setExpandedReview(id);
      setNotice("Hãy mở và đọc nội dung chủ dự án đã gửi trước khi xác nhận duyệt.");
      return;
    }
    const reason = feedback[id]?.trim() ?? "";
    if (decision !== "APPROVED" && !reason) {
      setNotice("Cần nhập phản hồi khi yêu cầu sửa hoặc từ chối.");
      return;
    }
    setNotice(null);
    setPendingDecision({ id, decision });
  };

  const decide = async (id: string, decision: ReviewDecision) => {
    const reason = feedback[id]?.trim() ?? "";
    if (decision !== "APPROVED" && !reason) {
      setNotice("Cần nhập phản hồi khi yêu cầu sửa hoặc từ chối.");
      return;
    }
    setBusy(id);
    try {
      await callAdminAction("REVIEW_CAMPAIGN", {
        reviewId: id,
        decision,
        feedback: reason,
      });
      const version = reviews.find((item) => item.id === id)?.submissionVersion;
      if (version !== undefined) setDecidedVersions((current) => ({ ...current, [id]: version }));
      setPendingDecision(null);
      if (decision === "APPROVED") {
        triggerParticleBurst();
      }
      setNotice("Đã lưu quyết định và gửi phản hồi cho chủ dự án.");
      router.refresh();
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể lưu quyết định. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div>
        <p className="eyebrow text-coral">
          <FileCheck2 className="size-4" /> Hàng chờ xét duyệt
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">
          Hồ sơ cần theo dõi
        </h2>
        <p className="mt-2 text-xs text-ink-muted">
          Mở từng hồ sơ để đối chiếu nội dung đã gửi. Quyết định và phản hồi sẽ được gửi trực tiếp tới chủ dự án.
        </p>
      </div>
      {notice ? (
        <AdminNotice message={notice} className="mt-4" />
      ) : null}
      <div className="mt-6 space-y-4">
        {reviews.map((item) => {
          const needsChanges = item.status === "NEEDS_CHANGES";
          return (
            <article
              key={item.id}
              id={`review-${item.id}`}
              className="relative scroll-mt-28 overflow-hidden rounded-[22px] border border-line bg-white p-5"
            >
              {scanningReviewId === item.id ? (
                <div
                  aria-hidden="true"
                  className="gop-scan-beam pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#7C3AED]/25 via-emerald-400/15 to-transparent"
                />
              ) : null}
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
                    >
                      {item.status === "PENDING" ? "CHỜ DUYỆT" : "CẦN BỔ SUNG"}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-extrabold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-ink-muted">
                    {item.creator} · {item.category} · gửi duyệt lần {item.submissionVersion}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-ink-soft">
                    <span>{item.documentCount} mục nội dung đã khai báo</span>
                    <span>Phụ trách: {item.assignedTo}</span>
                    <span
                      className={
                        item.reviewDueAt.startsWith("Quá")
                          ? "text-red-700"
                          : "text-ink-soft"
                      }
                    >
                      Hạn xử lý: {item.reviewDueAt}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 w-40 rounded-full bg-forest/7">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${item.completeness}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-ink-muted">
                      {item.completeness}% đầy đủ
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-[11px] sm:grid-cols-3">
                    {item.checks.map((check) => (
                      <span
                        key={check.label}
                        title={check.detail}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-2 ${check.status === "PASS" ? "bg-emerald-50 text-emerald-700" : check.status === "WARN" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}
                      >
                        {check.status === "PASS" ? (
                          <Check className="size-3" />
                        ) : (
                          <AlertTriangle className="size-3" />
                        )}
                        {check.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  {needsChanges ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                      Đã yêu cầu chủ dự án bổ sung. Bản dữ liệu mẫu chưa lưu nội dung phản hồi cũ; xem checklist và chờ một lần gửi mới trước khi quyết định tiếp.
                    </p>
                  ) : <>
                  <label>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Phản hồi cho chủ dự án
                    </span>
                    <textarea
                      name={`review-feedback-${item.id}`}
                      value={feedback[item.id] ?? ""}
                      onChange={(event) =>
                        setFeedback((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className="input-field mt-2 min-h-24 resize-y text-xs"
                      placeholder="Nêu rõ mục cần sửa hoặc lý do từ chối…"
                    />
                  </label>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    Đọc hồ sơ trước khi duyệt. Nếu yêu cầu sửa hoặc từ chối, hãy ghi rõ lý do để chủ dự án biết cần làm gì.
                  </p>
                  </>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-expanded={expandedReview === item.id}
                      aria-controls={expandedReview === item.id ? `review-evidence-${item.id}` : undefined}
                      onClick={() =>
                        setExpandedReview((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                      className="button-ghost min-h-11 px-3 text-xs"
                    >
                      <Eye className="size-3.5" />
                      {expandedReview === item.id ? "Thu gọn" : "Xem hồ sơ"}
                    </button>
                    {!needsChanges ? <>
                    <button
                      type="button"
                      disabled={busy === item.id || scanningReviewId !== null}
                      onClick={(event) => {
                        setNotice(null);
                        setScanningReviewId(item.id);
                        triggerParticleBurst({
                          x: event.clientX,
                          y: event.clientY,
                          count: 12,
                          colors: ["#7C3AED", "#059669"],
                        });
                      }}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 text-xs font-bold text-[#7C3AED] transition hover:border-[#7C3AED] hover:bg-[#EDE9FE] disabled:opacity-60"
                    >
                      <Sparkles className={`size-3.5 ${scanningReviewId === item.id ? "animate-spin" : ""}`} />
                      {scanningReviewId === item.id ? "Đang đối chiếu…" : "✦ AI Đối chiếu 8 Tiêu chí"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => requestDecision(item.id, "CHANGES")}
                      className="button-secondary min-h-11 px-3 text-xs"
                    >
                      <X className="size-3.5" /> Yêu cầu sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => requestDecision(item.id, "REJECTED")}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-wait"
                    >
                      <Ban className="size-3.5" /> Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => requestDecision(item.id, "APPROVED")}
                      className="button-dark min-h-11 px-3 text-xs"
                    >
                      {busy === item.id ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}{" "}
                      Duyệt
                    </button>
                    </> : null}
                  </div>
                  {!needsChanges && pendingDecision?.id === item.id ? (
                    <InlineActionConfirm
                      title={
                        pendingDecision.decision === "APPROVED"
                          ? "Duyệt chiến dịch này?"
                          : pendingDecision.decision === "CHANGES"
                            ? "Gửi yêu cầu chỉnh sửa?"
                            : "Từ chối chiến dịch này?"
                      }
                      detail={
                        pendingDecision.decision === "APPROVED"
                          ? "Chiến dịch sẽ rời hàng chờ và chủ dự án nhận thông báo đã duyệt."
                          : "Chiến dịch sẽ rời hàng chờ hiện tại. Phản hồi vừa nhập sẽ được gửi cho chủ dự án."
                      }
                      confirmLabel={
                        pendingDecision.decision === "APPROVED"
                          ? "Xác nhận duyệt"
                          : pendingDecision.decision === "CHANGES"
                            ? "Gửi yêu cầu"
                            : "Xác nhận từ chối"
                      }
                      danger={pendingDecision.decision === "REJECTED"}
                      busy={busy === item.id}
                      onConfirm={() =>
                        void decide(item.id, pendingDecision.decision)
                      }
                      onCancel={() => setPendingDecision(null)}
                    />
                  ) : null}
                </div>
              </div>
              {expandedReview === item.id ? (
                <div id={`review-evidence-${item.id}`} className="mt-5 rounded-2xl bg-[#f6f5f0] p-4 text-xs text-ink-soft">
                  <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row">
                    <p className="font-bold text-ink">Chi tiết checklist kiểm duyệt</p>
                    <p className="text-[11px] text-ink-muted">Gửi {item.submittedAt}</p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {item.checks.map((check) => (
                      <div key={check.label}>
                        <p className="font-bold text-ink">{check.label}</p>
                        <p className="mt-1 leading-5">{check.detail}</p>
                      </div>
                    ))}
                  </div>
                  {item.evidence ? (
                    <div className="mt-5 space-y-4 border-t border-line pt-5">
                      <div>
                        <p className="font-bold text-ink">Mô tả chủ dự án đã gửi</p>
                        <p className="mt-1 whitespace-pre-wrap leading-6">{item.evidence.blurb}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <p><span className="block text-ink-muted">Mục tiêu</span><strong className="text-ink">{formatVnd(item.evidence.goalAmount)}</strong></p>
                        <p><span className="block text-ink-muted">Thời gian / địa điểm</span><strong className="text-ink">{item.evidence.durationDays} ngày · {item.evidence.location}</strong></p>
                        <p><span className="block text-ink-muted">Phí giao hàng</span><strong className="text-ink">{formatVnd(item.evidence.shippingFee)}</strong></p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div><p className="font-bold text-ink">Câu chuyện</p><p className="mt-1 whitespace-pre-wrap leading-6">{item.evidence.story}</p></div>
                        <div><p className="font-bold text-ink">Rủi ro và cách xử lý</p><p className="mt-1 whitespace-pre-wrap leading-6">{item.evidence.risks}</p></div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="font-bold text-ink">Gói ủng hộ</p>
                          <ul className="mt-2 space-y-1.5">
                            {item.evidence.rewards.map((reward, index) => (
                              <li key={`${reward.title}-${index}`}>{reward.title} · {formatVnd(reward.amount)} · {reward.limit} suất · giao {reward.delivery}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-bold text-ink">Phần bổ sung</p>
                          {item.evidence.addOns.length ? (
                            <ul className="mt-2 space-y-1.5">
                              {item.evidence.addOns.map((addOn, index) => (
                                <li key={`${addOn.title}-${index}`}>{addOn.title} · {formatVnd(addOn.amount)}</li>
                              ))}
                            </ul>
                          ) : <p className="mt-2">Chưa có phần bổ sung.</p>}
                        </div>
                      </div>
                      <p className="border-t border-line pt-3 text-[11px] leading-5 text-ink-muted">
                        Nội dung trên trích xuất từ hồ sơ gửi duyệt của chủ dự án. Quản trị viên đối chiếu đầy đủ trước khi đưa ra quyết định.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
        {!reviews.length ? (
          <div className="rounded-[20px] border border-dashed border-emerald-300 bg-emerald-50/70 px-5 py-10 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-[10px] bg-emerald-100 text-emerald-700">
              <ShieldCheck className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-extrabold text-emerald-950">
              Hàng chờ trong phiên đã xử lý xong
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-emerald-800/70">
              Các quyết định vừa thực hiện đã chuyển sang nhật ký. Hồ sơ mới sẽ
              xuất hiện ở đây khi chủ dự án gửi lại.
            </p>
          </div>
        ) : null}
      </div>

      <AdminReviewTree
        reviews={reviews}
        onOpenReview={(reviewId) => {
          if (!reviewId) return;
          setExpandedReview(reviewId);
          window.requestAnimationFrame(() => {
            document
              .getElementById(`review-${reviewId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        }}
      />
    </div>
  );
}

function buildFraudBreakdown(alert: FraudAlert) {
  const highRisk = alert.riskScore >= 70;
  return [
    {
      code: "R1",
      name: "Tần suất cam kết bất thường",
      triggered: alert.riskScore >= 65 || alert.signals.length >= 2,
      detail: alert.signals[0] ?? "Mật độ giao dịch vượt ngưỡng trung bình giờ.",
    },
    {
      code: "R2",
      name: "Giá trị giao dịch lệch chuẩn danh mục",
      triggered: alert.amount >= 5_000_000 || alert.riskScore >= 75,
      detail: `Giá trị ${formatVnd(alert.amount)} so với ngưỡng tham chiếu chiến dịch.`,
    },
    {
      code: "R3–R5",
      name: "Liên kết tài khoản & hành vi vòng lặp",
      triggered: highRisk,
      detail:
        alert.signals[1] ??
        "Tài khoản tạo mới và hành vi truy cập lặp trong khung thời gian ngắn.",
    },
    {
      code: "AI",
      name: "✦ Isolation Forest: Điểm dị biệt",
      triggered: alert.riskScore >= 60,
      detail: `Mô hình phát hiện bất thường chấm ${alert.riskScore}/100 điểm rủi ro tổng hợp.`,
    },
  ];
}

function FraudPanel({ data }: { data: AdminDashboardData }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "NEW" | "ESCALATED" | "CLEARED"
  >("ALL");
  const [minRisk, setMinRisk] = useState<0 | 40 | 60 | 70>(0);
  const [statuses, setStatuses] = useState<
    Record<string, FraudAlert["status"]>
  >({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drawerAlertId, setDrawerAlertId] = useState<string | null>(null);
  const [scanningRadar, setScanningRadar] = useState(false);
  const [radarLastScan, setRadarLastScan] = useState<string | null>(null);

  const runLiveRadarScan = (clientX?: number, clientY?: number) => {
    if (scanningRadar) return;
    setScanningRadar(true);
    window.setTimeout(() => {
      setScanningRadar(false);
      const now = new Date();
      setRadarLastScan(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
      );
      triggerParticleBurst({
        x: clientX,
        y: clientY,
        colors: ["#7C3AED", "#E11D48", "#10B981"],
        count: 34,
      });
    }, 900);
  };

  const filtered = useMemo(
    () =>
      data.alerts.filter((alert) => {
        const effectiveStatus = statuses[alert.id] ?? alert.status;
        const matchesQuery = `${alert.campaignTitle} ${alert.userLabel} ${alert.signals.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase());
        if (!matchesQuery) return false;
        if (alert.riskScore < minRisk) return false;
        if (statusFilter === "NEW") {
          return effectiveStatus === "NEW" || effectiveStatus === "REVIEWING";
        }
        if (statusFilter === "ESCALATED") return effectiveStatus === "ESCALATED";
        if (statusFilter === "CLEARED") return effectiveStatus === "CLEARED";
        return true;
      }),
    [data.alerts, minRisk, query, statusFilter, statuses],
  );

  const selectedAlert = useMemo(
    () => data.alerts.find((alert) => alert.id === drawerAlertId) ?? null,
    [data.alerts, drawerAlertId],
  );

  const resolve = async (
    alert: FraudAlert,
    status: "CLEARED" | "ESCALATED",
    fallbackNote?: string,
  ) => {
    const resolution = (notes[alert.id] ?? fallbackNote ?? "").trim();
    if (!resolution) {
      setNotice("Cần nhập ghi chú căn cứ xử lý trước khi quyết định.");
      return;
    }
    if (!notes[alert.id]?.trim() && fallbackNote) {
      setNotes((current) => ({ ...current, [alert.id]: fallbackNote }));
    }
    setBusy(alert.id);
    try {
      await callAdminAction("RESOLVE_FRAUD", {
        alertId: alert.id,
        status,
        resolution,
      });
      setStatuses((current) => ({ ...current, [alert.id]: status }));
      setDrawerAlertId(null);
      setNotice(
        status === "CLEARED"
          ? "Đã kết luận hợp lệ và bỏ qua cảnh báo."
          : fallbackNote
            ? "Đã đưa cảnh báo vào diện theo dõi."
            : "Đã chuyển cảnh báo sang kiểm tra sâu & khóa tạm đối soát.",
      );
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể lưu kết luận. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-[#E11D48]">
            <ShieldAlert className="size-4" /> Phát hiện gian lận · S13
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
            Fraud Queue — Hàng chờ cảnh báo
          </h2>
        </div>
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="admin-fraud-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-field input-with-icon min-w-64 pr-11"
            placeholder="Tìm chiến dịch, dấu hiệu hoặc tài khoản…"
            aria-label="Tìm cảnh báo theo chiến dịch hoặc người dùng"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-ink-muted hover:bg-slate-100 hover:text-ink"
              aria-label="Xóa từ khóa tìm cảnh báo"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
      </div>

        <div className="relative overflow-hidden rounded-2xl border border-[#DDD6FE] bg-[#0F172A] p-4 text-white shadow-card sm:p-5">
          {scanningRadar ? (
            <div
              aria-hidden="true"
              className="gop-scan-beam pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-[#7C3AED]/35 via-[#E11D48]/20 to-transparent"
            />
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-center">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/15 bg-slate-900">
              <Image
                src="/images/3d/fraud-shield-radar-3d.jpg"
                alt="Mô hình 3D radar AI Isolation Forest"
                fill
                sizes="240px"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full border border-violet-300/40 bg-slate-950/75 backdrop-blur-sm ${
                  scanningRadar ? "gop-radar-sweep" : ""
                }`}
              >
                <Radar className="size-4 text-violet-300" />
              </div>
              <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                Isolation Forest · s(x,n)
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-300">
                    <Sparkles className="size-3.5" /> ✦ AI Isolation Forest Live Radar Scanner
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Phân bố điểm bất thường{" "}
                    <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                      s(x,n) = 2^(-E(h(x))/c(n))
                    </code>{" "}
                    — bấm trực tiếp vào điểm cảnh báo để mở Drawer xử lý.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={scanningRadar}
                  onClick={(event) => runLiveRadarScan(event.clientX, event.clientY)}
                  className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#6D28D9] disabled:opacity-70"
                >
                  <Radar className={`size-3.5 ${scanningRadar ? "animate-spin" : ""}`} />
                  {scanningRadar ? "Đang quét dị biệt…" : "Quét AI Live Radar"}
                </button>
              </div>

              <div className="mt-3.5 rounded-xl border border-white/12 bg-slate-900/75 p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Bình thường (0–39)</span>
                  <span>Theo dõi (40–69)</span>
                  <span className="text-rose-400">Dị biệt cao (≥70)</span>
                </div>
                <div className="relative h-14 w-full rounded-lg border border-white/10 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/20 px-2">
                  <div className="absolute inset-y-0 left-[40%] border-l border-dashed border-white/15" />
                  <div className="absolute inset-y-0 left-[70%] border-l border-dashed border-rose-400/50" />
                  {data.alerts.map((alert, idx) => {
                    const effectiveStatus = statuses[alert.id] ?? alert.status;
                    const leftPct = Math.min(95, Math.max(5, alert.riskScore));
                    const topPct = 22 + ((idx * 27) % 52);
                    const isHigh = alert.riskScore >= 70;
                    const isCleared = effectiveStatus === "CLEARED";
                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setDrawerAlertId(alert.id);
                        }}
                        title={`${alert.campaignTitle} · Risk ${alert.riskScore}/100`}
                        aria-label={`Mở cảnh báo ${alert.campaignTitle}, điểm ${alert.riskScore}`}
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums transition hover:scale-110 ${
                          isCleared
                            ? "border border-emerald-300 bg-emerald-500/80 text-white"
                            : isHigh
                              ? "gop-glow-pulse border border-rose-300 bg-[#E11D48] text-white shadow-[0_0_12px_rgba(225,29,72,0.65)]"
                              : "border border-amber-300 bg-amber-500 text-slate-950"
                        }`}
                      >
                        {alert.riskScore}
                      </button>
                    );
                  })}
                </div>
                {radarLastScan ? (
                  <p className="mt-2 text-[11px] font-semibold text-emerald-300" role="status">
                    ✦ Hoàn tất quét {data.alerts.length} cụm giao dịch lúc {radarLastScan} · {data.alerts.filter((a) => a.riskScore >= 70).length} điểm dị biệt cao.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Lọc theo trạng thái xử lý"
        >
          {(
            [
              { key: "ALL", label: "Tất cả" },
              { key: "NEW", label: "Mới / Chưa xử lý" },
              { key: "ESCALATED", label: "Đang theo dõi / Khóa" },
              { key: "CLEARED", label: "Đã xử lý (Hợp lệ)" },
            ] as const
          ).map((item) => {
            const active = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(item.key)}
                className={`min-h-9 rounded-xl px-3 text-xs font-bold transition ${
                  active
                    ? "bg-[#0F172A] text-white"
                    : "text-ink-soft hover:bg-slate-100 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Lọc theo ngưỡng điểm Risk"
        >
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Lọc:
          </span>
          {([0, 40, 60, 70] as const).map((threshold) => {
            const active = minRisk === threshold;
            return (
              <button
                key={threshold}
                type="button"
                aria-pressed={active}
                onClick={() => setMinRisk(threshold)}
                className={`min-h-8 rounded-lg border px-2.5 text-xs font-bold tabular-nums transition ${
                  active
                    ? "border-[#E11D48] bg-rose-50 text-[#E11D48]"
                    : "border-slate-200 bg-white text-ink-soft hover:bg-slate-50"
                }`}
              >
                Risk ≥ {threshold}
              </button>
            );
          })}
        </div>
      </div>

      {notice ? (
        <AdminNotice message={notice} className="mt-4" />
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        {filtered.length ? (
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Risk Score</th>
                <th className="px-4 py-3.5">Dấu hiệu kích hoạt chính</th>
                <th className="px-4 py-3.5">Chiến dịch &amp; Tài khoản</th>
                <th className="px-4 py-3.5">Giá trị &amp; Thời điểm</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((alert) => {
                const status = statuses[alert.id] ?? alert.status;
                const isHigh = alert.riskScore >= 70;
                const isMid = alert.riskScore >= 40 && alert.riskScore < 70;
                return (
                  <tr
                    key={alert.id}
                    className="transition-colors hover:bg-slate-50/75"
                  >
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-display text-sm font-extrabold tabular-nums ${
                          isHigh
                            ? "bg-rose-50 text-rose-700"
                            : isMid
                              ? "bg-amber-50 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {alert.riskScore} {isHigh ? "●" : isMid ? "◐" : "○"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">
                        {alert.signals[0] ?? "Bất thường tần suất giao dịch"}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
                        ✦ Isolation Forest · {alert.signals.length} tín hiệu
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">{alert.campaignTitle}</p>
                      <p className="mt-0.5 text-ink-muted">{alert.userLabel}</p>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <p className="font-bold text-ink">
                        {formatVnd(alert.amount)}
                      </p>
                      <p className="mt-0.5 text-ink-muted">{alert.createdAt}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          status === "CLEARED"
                            ? "bg-emerald-50 text-emerald-700"
                            : status === "ESCALATED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {fraudStatusLabels[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setDrawerAlertId(alert.id);
                        }}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-ink transition hover:border-[#E11D48] hover:bg-rose-50 hover:text-[#E11D48]"
                      >
                        Chi tiết &amp; Xử lý →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-10 text-center">
            <ShieldCheck className="mx-auto size-6 text-emerald-600" />
            <h3 className="mt-3 font-display text-lg font-extrabold">
              Không có cảnh báo phù hợp
            </h3>
            <p className="mt-2 text-xs text-ink-muted">
              Thử đặt lại bộ lọc hoặc quay lại toàn bộ hàng cảnh báo.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("ALL");
                setMinRisk(0);
              }}
              className="button-secondary mt-4 min-h-10 px-4 text-xs"
            >
              <X className="size-3.5" /> Xem toàn bộ cảnh báo
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>Nguyên tắc kiểm duyệt:</strong> Hệ thống AI chấm điểm chỉ sắp
          xếp thứ tự ưu tiên, không tự khóa người dùng. Giao diện ẩn hoàn toàn IP
          và dấu vân tay thiết bị thô (SHA-256 salted).
        </span>
      </div>

      {selectedAlert ? (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết cảnh báo gian lận"
          onKeyDown={(event) => {
            if (event.key === "Escape") setDrawerAlertId(null);
          }}
        >
          <button
            type="button"
            aria-label="Đóng ngăn chi tiết cảnh báo"
            onClick={() => setDrawerAlertId(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
          />
          <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#E11D48]">
                  Drawer Chi tiết Cảnh báo M10 · {selectedAlert.id}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-xl bg-rose-50 px-3 py-1 font-display text-xl font-extrabold text-[#E11D48] tabular-nums">
                    Risk {selectedAlert.riskScore} / 100
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {fraudStatusLabels[statuses[selectedAlert.id] ?? selectedAlert.status]}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-extrabold text-ink">
                  {selectedAlert.campaignTitle}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết cảnh báo"
                onClick={() => setDrawerAlertId(null)}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-ink-soft hover:bg-slate-100 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Dấu hiệu kích hoạt (Rule Engine R1–R5 &amp; ✦ Isolation Forest)
                </p>
                <div className="mt-2.5 space-y-2">
                  {buildFraudBreakdown(selectedAlert).map((rule) => (
                    <div
                      key={rule.code}
                      className={`rounded-xl border p-3 text-xs ${
                        rule.triggered
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-ink">
                          {rule.triggered ? "✓ " : "○ "}[{rule.code}] {rule.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            rule.triggered
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rule.triggered ? "Kích hoạt" : "Bình thường"}
                        </span>
                      </div>
                      <p className="mt-1 text-ink-soft">{rule.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <p className="font-bold uppercase tracking-wider text-ink-muted">
                  Giao dịch liên quan (đã rút gọn)
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-ink-muted">Tài khoản liên quan</dt>
                    <dd className="mt-0.5 font-bold text-ink">
                      {selectedAlert.userLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Giá trị cam kết</dt>
                    <dd className="mt-0.5 font-bold text-ink tabular-nums">
                      {formatVnd(selectedAlert.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Thời điểm ghi nhận</dt>
                    <dd className="mt-0.5 font-bold text-ink tabular-nums">
                      {selectedAlert.createdAt}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Riêng tư (NFR-PRV01)</dt>
                    <dd className="mt-0.5 font-bold text-[#047857]">
                      Ẩn IP &amp; thiết bị thô (SHA-256)
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Ghi chú xử lý (bắt buộc khi Khóa / Kiểm tra sâu)
                  </span>
                  <textarea
                    name={`drawer-fraud-note-${selectedAlert.id}`}
                    value={notes[selectedAlert.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [selectedAlert.id]: event.target.value,
                      }))
                    }
                    className="input-field mt-2 min-h-24 w-full resize-y text-xs"
                    placeholder="Ghi rõ căn cứ trước khi chốt quyết định…"
                  />
                </label>
                {notice ? (
                  <p className="mt-2 text-xs font-semibold text-[#E11D48]">
                    {notice}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2.5 border-t border-slate-200 pt-4 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={busy === selectedAlert.id}
                  onClick={() => void resolve(selectedAlert, "CLEARED")}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-[#ECFDF5] px-3 text-xs font-bold text-[#047857] transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  <ShieldCheck className="size-4 shrink-0" /> Bỏ qua (Hợp lệ)
                </button>
                <button
                  type="button"
                  disabled={busy === selectedAlert.id}
                  onClick={() =>
                    void resolve(
                      selectedAlert,
                      "ESCALATED",
                      "Đưa vào diện theo dõi định kỳ.",
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  <ShieldAlert className="size-4 shrink-0" /> Theo dõi
                </button>
                <button
                  type="button"
                  disabled={busy === selectedAlert.id}
                  onClick={() => void resolve(selectedAlert, "ESCALATED")}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#E11D48] px-3 text-xs font-bold text-white transition hover:bg-[#BE123C] disabled:opacity-60"
                >
                  {busy === selectedAlert.id ? (
                    <LoaderCircle className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <Flag className="size-4 shrink-0" />
                  )}{" "}
                  Khóa / Kiểm tra sâu
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function relationSummary(relations: NonNullable<AdminDashboardData["users"][number]["campaignRelations"]>) {
  const labels = [
    ["OWNER", "sở hữu"],
    ["COLLABORATOR", "cộng tác"],
    ["INVITED", "lời mời"],
    ["REVOKED", "đã rời nhóm"],
  ] as const;
  return labels.flatMap(([kind, label]) => {
    const count = relations.filter((item) => item.kind === kind).length;
    return count ? [`${count} ${label}`] : [];
  }).join(" · ");
}

function UsersPanel({ data }: { data: AdminDashboardData }) {
  const { session } = useAuth();
  const [users, setUsers] = useState(data.users);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [userView, setUserView] = useState<"ACCOUNTS" | "SAMPLES">("ACCOUNTS");
  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    const inView = users.filter((user) => userView === "SAMPLES"
      ? user.accountKind === "SAMPLE_PROFILE" : user.accountKind !== "SAMPLE_PROFILE");
    if (!keyword) return inView;
    return inView.filter((user) =>
      `${user.name} ${user.email} ${user.location} ${user.roles.join(" ")} ${user.status} ${(user.campaignRelations ?? []).map((relation) => relation.title).join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(keyword),
    );
  }, [query, userView, users]);
  const pendingUser = users.find((user) => user.id === pendingUserId) ?? null;

  const toggle = async (id: string, current: string) => {
    const status = current === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setBusy(id);
    setNotice(null);
    try {
      await callAdminAction("SET_USER_STATUS", {
        userId: id,
        status,
        reason: reason.trim(),
      });
      setUsers((rows) =>
        rows.map((user) => (user.id === id ? { ...user, status,
          lastStatusChange: { reason: reason.trim(), changedAt: new Date().toISOString() } } : user)),
      );
      setNotice(
        status === "ACTIVE" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",
      );
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể cập nhật tài khoản. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
      setPendingUserId(null);
      setReason("");
    }
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-coral">
            <UserRoundCog className="size-4" /> Người dùng
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold">
            Quản lý tài khoản
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Một người có thể sở hữu nhiều chiến dịch và tham gia nhóm ở chiến dịch khác. Khóa tài khoản không xóa dự án hay lịch sử.</p>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="admin-user-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-field input-with-icon min-w-64 pr-11"
            placeholder="Tìm tên, vai trò hoặc trạng thái…"
            aria-label="Tìm người dùng"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-ink-muted hover:bg-stone-100 hover:text-ink"
              aria-label="Xóa từ khóa tìm người dùng"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Loại người dùng">
        <button type="button" className={userView === "ACCOUNTS" ? "button-dark min-h-10" : "button-secondary min-h-10"} aria-pressed={userView === "ACCOUNTS"} onClick={() => setUserView("ACCOUNTS")}>Tài khoản dùng được ({users.filter((user) => user.accountKind !== "SAMPLE_PROFILE").length})</button>
        <button type="button" className={userView === "SAMPLES" ? "button-dark min-h-10" : "button-secondary min-h-10"} aria-pressed={userView === "SAMPLES"} onClick={() => setUserView("SAMPLES")}>Hồ sơ dữ liệu mẫu ({users.filter((user) => user.accountKind === "SAMPLE_PROFILE").length})</button>
      </div>
      {notice ? (
        <AdminNotice message={notice} className="mt-4" />
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-[#f3f3ed] text-[11px] uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-5 py-4">Người dùng</th>
              <th className="px-5 py-4">Vai trò</th>
              <th className="px-5 py-4">Liên quan dự án</th>
              <th className="px-5 py-4">Trạng thái</th>
              <th className="px-5 py-4">Hoạt động cuối</th>
              <th className="px-5 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-[#eef0f3] font-display text-[11px] font-extrabold text-[#343741]">
                      {user.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">{user.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                        {user.email}
                      </span>
                      <span className="mt-1 block text-[10px] text-ink-muted">{user.accountKind === "REGISTERED" ? "Tài khoản đã đăng ký" : user.accountKind === "DEMO_LOGIN" ? "Có đăng nhập nhanh" : "Chỉ để mô phỏng dữ liệu"}</span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-ink-soft">
                  {user.roles.join(" · ")}
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    {user.location}
                  </span>
                </td>
                <td className="px-5 py-4 text-ink-soft">
                  {user.campaignRelations?.length ? <details className="group max-w-52">
                    <summary className="cursor-pointer font-bold text-forest underline-offset-2 hover:underline">
                      {relationSummary(user.campaignRelations)}
                    </summary>
                    <ul className="mt-2 space-y-1.5 border-l-2 border-line pl-2">
                      {user.campaignRelations.map((item) => <li key={`${item.campaignId}:${item.kind}`}>
                        <Link href={`/campaigns/${item.campaignId}/timeline`} className="block hover:text-forest hover:underline">
                          {item.title} <span className="text-[10px] text-ink-muted">· {item.kind === "OWNER" ? "Chủ dự án" : item.kind === "COLLABORATOR" ? "Thành viên" : item.kind === "REVOKED" ? "Đã rời nhóm" : "Chưa nhận lời"}</span>
                        </Link>
                      </li>)}
                    </ul>
                  </details> : <span className="text-ink-muted">Chưa có</span>}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : user.status === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {user.status === "ACTIVE"
                      ? "Đang hoạt động"
                      : user.status === "SUSPENDED"
                        ? "Đã khóa"
                        : "Đang xem xét"}
                  </span>
                  {user.lastStatusChange ? <p className="mt-2 max-w-44 text-[11px] leading-4 text-ink-muted" title={user.lastStatusChange.changedAt}>
                    Lý do gần nhất: {user.lastStatusChange.reason}
                  </p> : null}
                </td>
                <td className="px-5 py-4 text-ink-muted">{user.lastSeen}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    disabled={busy === user.id || user.id === session?.user.id || user.accountKind === "SAMPLE_PROFILE"}
                    onClick={() => { setReason(""); setPendingUserId(user.id); }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3 font-bold text-ink-soft hover:border-coral/30 hover:text-coral-dark"
                  >
                    {user.status === "SUSPENDED" ? (
                      <ShieldCheck className="size-3.5" />
                    ) : (
                      <Ban className="size-3.5" />
                    )}
                    {user.accountKind === "SAMPLE_PROFILE" ? "Chỉ xem" : user.id === session?.user.id ? "Tài khoản của bạn" : user.status === "SUSPENDED" ? "Mở khóa" : "Khóa"}
                  </button>
                </td>
              </tr>
            ))}
            {!filteredUsers.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-sm text-ink-muted"
                >
                  <UserRoundCog className="mx-auto size-6 text-stone-400" />
                  <p className="mt-3 font-bold text-ink">
                    Không tìm thấy tài khoản phù hợp
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Thử tìm bằng tên, email, vai trò hoặc trạng thái khác.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="button-ghost mt-3 min-h-11 px-4 text-xs"
                  >
                    <X className="size-3.5" /> Xóa từ khóa
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pendingUser ? (
        <Modal open title={`${pendingUser.status === "SUSPENDED" ? "Mở khóa" : "Khóa"} tài khoản ${pendingUser.name}?`}
          description={pendingUser.email} onClose={() => { if (busy !== pendingUser.id) setPendingUserId(null); }} locked={busy === pendingUser.id} size="sm">
          <p className="text-sm leading-6 text-ink-soft">{pendingUser.status === "SUSPENDED"
            ? "Người dùng sẽ đăng nhập và dùng lại các quyền đang có."
            : "Người dùng sẽ dừng thao tác; dự án, công việc và cam kết liên quan vẫn được giữ để đối soát."}</p>
          <label className="mt-4 block text-sm font-semibold">Lý do xử lý
            <textarea name="userStatusReason" className="input-field mt-2 min-h-24 w-full" value={reason} maxLength={240}
              onChange={(event) => setReason(event.target.value)} placeholder="Ghi lý do cụ thể để người sau hiểu quyết định này" />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="button-secondary" disabled={busy === pendingUser.id} onClick={() => setPendingUserId(null)}>Để sau</button>
            <button type="button" className="button-dark" disabled={!reason.trim() || busy === pendingUser.id}
              onClick={() => void toggle(pendingUser.id, pendingUser.status)}>
              {busy === pendingUser.id ? "Đang lưu…" : pendingUser.status === "SUSPENDED" ? "Xác nhận mở khóa" : "Xác nhận khóa"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function SettingsPanel({ data, localDbAvailable }: { data: AdminDashboardData; localDbAvailable: boolean }) {
  const initialFee = data.operations.platformFeePercent.toFixed(1);
  const controllableCampaigns = data.operations.controllableCampaigns ?? [data.operations.managedCampaign];
  const [selectedCampaignId, setSelectedCampaignId] = useState(controllableCampaigns[0].id);
  const managedCampaign = controllableCampaigns.find((campaign) => campaign.id === selectedCampaignId)
    ?? controllableCampaigns[0];
  const [fee, setFee] = useState(initialFee);
  const [savedFee, setSavedFee] = useState(initialFee);
  const [campaignStatusOverrides, setCampaignStatusOverrides] = useState<Record<string, "LIVE" | "SUSPENDED">>({});
  const campaignSuspended = (campaignStatusOverrides[managedCampaign.id] ?? managedCampaign.status) === "SUSPENDED";
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [campaignConfirming, setCampaignConfirming] = useState(false);
  const [audit, setAudit] = useState<string[]>([]);
  const [settlementCampaignId, setSettlementCampaignId] = useState(
    controllableCampaigns[0].id,
  );
  const [settlementScenario, setSettlementScenario] = useState<
    "REACHED_GOAL" | "MISSED_GOAL"
  >("REACHED_GOAL");
  const [settlementResult, setSettlementResult] = useState<{
    key: string;
    campaignTitle: string;
    outcome: "REACHED_GOAL" | "MISSED_GOAL";
    statusLabel: string;
    processedPledges: number;
    duplicatePrevented: boolean;
  } | null>(null);
  const [settledKeys, setSettledKeys] = useState<Record<string, number>>({});
  const [settlementStep, setSettlementStep] = useState<number>(0);
  const feeNumber = Number(fee);
  const feeInvalid =
    fee.trim() === "" || !Number.isFinite(feeNumber) || feeNumber < 0 || feeNumber > 20;

  const runTimeTravelSettlement = () => {
    const targetCampaign =
      controllableCampaigns.find((item) => item.id === settlementCampaignId) ??
      controllableCampaigns[0];
    const idempotencyKey = `stl_${targetCampaign.id}_${settlementScenario}`;
    const alreadySettled = Boolean(settledKeys[idempotencyKey]);
    const processedPledges = alreadySettled
      ? settledKeys[idempotencyKey]
      : targetCampaign.id === "cmp_orbit"
        ? 48
        : 12;

    setSettlementStep(1);
    window.setTimeout(() => setSettlementStep(2), 180);
    window.setTimeout(() => setSettlementStep(3), 360);
    window.setTimeout(() => {
      setSettlementStep(4);
      if (!alreadySettled) {
        setSettledKeys((current) => ({
          ...current,
          [idempotencyKey]: processedPledges,
        }));
        setAudit((rows) => [
          `${new Date().toLocaleString("vi-VN")} · Time Travel UC29: ${targetCampaign.title} → ${settlementScenario === "REACHED_GOAL" ? "CAPTURED / SUCCESSFUL" : "CANCELLED / FAILED"} (${processedPledges} cam kết)`,
          ...rows,
        ]);
      }
      setSettlementResult({
        key: idempotencyKey,
        campaignTitle: targetCampaign.title,
        outcome: settlementScenario,
        statusLabel:
          settlementScenario === "REACHED_GOAL"
            ? "SUCCESSFUL (Đã Capture Authorization)"
            : "FAILED (Đã Cancel/Giải tỏa Authorization)",
        processedPledges,
        duplicatePrevented: alreadySettled,
      });
      if (!alreadySettled) {
        triggerParticleBurst({ colors: ["#7C3AED", "#059669", "#2563EB"] });
      }
    }, 540);
  };

  const saveFee = async () => {
    if (feeInvalid) {
      setNotice("Mức phí cần nằm trong khoảng từ 0% đến 20%.");
      return;
    }
    setBusy("fee");
    setNotice(null);
    try {
      await callAdminAction("UPDATE_PLATFORM_FEE", {
        percent: Number(fee),
        appliesTo: "NEW_CAMPAIGNS",
      });
      setSavedFee(fee);
      setAudit((rows) => [`${new Date().toLocaleString("vi-VN")} · cập nhật phí ${fee}%`, ...rows]);
      setNotice("Đã lưu mức phí mới.");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể lưu mức phí. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };
  const toggleCampaign = async () => {
    if (!reason.trim()) return;
    setBusy("campaign");
    setNotice(null);
    const next = !campaignSuspended;
    try {
      await callAdminAction("SET_CAMPAIGN_STATUS", {
        campaignId: managedCampaign.id,
        status: next ? "SUSPENDED" : "LIVE",
        reason,
      });
      setCampaignStatusOverrides((current) => ({ ...current,
        [managedCampaign.id]: next ? "SUSPENDED" : "LIVE",
      }));
      setAudit((rows) => [
        `${new Date().toLocaleString("vi-VN")} · ${next ? "khóa" : "mở"} ${managedCampaign.title}`,
        ...rows,
      ]);
      setReason("");
      setNotice(next ? "Đã khóa chiến dịch." : "Đã khôi phục chiến dịch.");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể cập nhật chiến dịch. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
      setCampaignConfirming(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      {notice ? (
        <AdminNotice message={notice} className="xl:col-span-2" />
      ) : null}
      <article className="rounded-[20px] border border-line bg-white p-6">
        <p className="eyebrow text-coral">
          <BadgeDollarSign className="size-4" /> Phí nền tảng
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">
          Cấu hình phí nền tảng
        </h2>
        <p className="mt-3 text-xs leading-5 text-ink-muted">
          Tỷ lệ phí dịch vụ nền tảng áp dụng cho các chiến dịch mở gọi vốn mới sau khi lưu cấu hình.
        </p>
        <label className="mt-6 block">
          <span className="text-xs font-bold text-ink-soft">Phần trăm phí</span>
          <div className="relative mt-2">
            <input
              name="platform-fee-percent"
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
              className="input-field pr-12 text-lg font-bold tabular-nums"
              aria-invalid={feeInvalid}
              aria-describedby="platform-fee-note platform-fee-error"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-ink-muted">
              %
            </span>
          </div>
        </label>
        <div id="platform-fee-note" className="mt-4 rounded-xl bg-[#ECFDF5] p-3 text-[11px] text-[#047857]">
          Mức đang áp dụng: <strong className="tabular-nums">{savedFee}%</strong> · tính trên giao dịch đạt mục tiêu
        </div>
        {feeInvalid ? (
          <p id="platform-fee-error" role="alert" className="mt-2 text-xs font-semibold text-red-700">
            Nhập một số từ 0 đến 20. Có thể dùng một chữ số thập phân.
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy === "fee" || feeInvalid || fee === savedFee}
          onClick={() => void saveFee()}
          className="button-dark mt-5"
        >
          {busy === "fee" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}{" "}
          Lưu cấu hình
        </button>
      </article>
      <article className="rounded-[20px] border border-line bg-white p-6">
        <p className="eyebrow text-coral">
          <ShieldAlert className="size-4" /> Kiểm soát chiến dịch
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">
          Khóa hoặc khôi phục chiến dịch
        </h2>
        <label className="mt-5 block">
          <span className="text-xs font-bold text-ink-soft">Chọn chiến dịch cần theo dõi</span>
          <select name="managed-campaign" value={managedCampaign.id}
            onChange={(event) => { setSelectedCampaignId(event.target.value); setReason(""); setCampaignConfirming(false); }}
            className="input-field mt-2 min-h-11 w-full">
            {controllableCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>
              {campaign.title} · mã {campaign.id.slice(-6).toUpperCase()} · {(campaignStatusOverrides[campaign.id] ?? campaign.status) === "SUSPENDED" ? "Tạm dừng" : "Đang gọi vốn"}
            </option>)}
          </select>
        </label>
        <div className="mt-6 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">{managedCampaign.title}</p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {managedCampaign.riskScore === null
                  ? "Hồ sơ mới: chưa có điểm rủi ro AI; quản trị viên tự ghi căn cứ xử lý."
                  : `Điểm rủi ro ${managedCampaign.riskScore} · ${managedCampaign.relatedAlerts} cảnh báo liên quan`}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${campaignSuspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {campaignSuspended ? "ĐÃ KHÓA" : "ĐANG HOẠT ĐỘNG"}
            </span>
          </div>
          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Lý do bắt buộc
            </span>
            <textarea
              name="campaign-status-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setCampaignConfirming(false);
              }}
              className="input-field mt-2 min-h-20 resize-y text-xs"
              placeholder="Nêu căn cứ và phạm vi xử lý…"
              required
              aria-describedby="campaign-action-note"
            />
          </label>
          <button
            type="button"
            disabled={!reason.trim() || busy === "campaign"}
            onClick={() => setCampaignConfirming(true)}
            className="button-secondary mt-3"
          >
            {busy === "campaign" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : campaignSuspended ? (
              <ShieldCheck className="size-4" />
            ) : (
              <Ban className="size-4" />
            )}
            {campaignSuspended ? "Khôi phục chiến dịch" : "Khóa chiến dịch"}
          </button>
          <p id="campaign-action-note" className="mt-2 text-[11px] leading-4 text-ink-muted">
            Hệ thống sẽ hỏi lại trước khi thay đổi trạng thái công khai.
          </p>
          {campaignConfirming ? (
            <InlineActionConfirm
              title={
                campaignSuspended
                  ? "Khôi phục chiến dịch này?"
                  : "Khóa chiến dịch này?"
              }
              detail={`Lý do xử lý: “${reason.trim()}”`}
              confirmLabel={campaignSuspended ? "Xác nhận khôi phục" : "Xác nhận khóa"}
              danger={!campaignSuspended}
              busy={busy === "campaign"}
              onConfirm={() => void toggleCampaign()}
              onCancel={() => setCampaignConfirming(false)}
            />
          ) : null}
        </div>
      </article>
      <article className="rounded-[20px] border border-[#DDD6FE] bg-gradient-to-br from-[#F5F3FF]/80 to-white p-6 xl:col-span-2">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EDE9FE] pb-4 lg:flex-row lg:items-center">
          <div>
            <p className="eyebrow text-[#7C3AED]">
              <Zap className="size-4" /> Công cụ Demo Bảo vệ · UC29 / US11
            </p>
            <h2 className="mt-1.5 font-display text-xl font-extrabold text-ink">
              ⚡ Time Travel &amp; Settlement tự động
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Mô phỏng job định kỳ J01 (đẩy hạn kết thúc về hiện tại để kiểm chứng cơ chế Capture khi đạt Goal hoặc Cancel khi không đạt, bảo vệ Idempotency).
            </p>
          </div>
          <button
            type="button"
            onClick={runTimeTravelSettlement}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#6D28D9]"
          >
            <Zap className="size-4" /> Đẩy hạn về hiện tại &amp; Chạy Settlement (Time Travel) <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Chiến dịch cần tất toán</span>
            <select
              name="time-travel-campaign"
              value={settlementCampaignId}
              onChange={(event) => setSettlementCampaignId(event.target.value)}
              className="input-field mt-1.5 min-h-11 w-full bg-white text-xs font-semibold"
            >
              {controllableCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title} ({campaign.id})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Kịch bản kết quả tại hạn chốt</span>
            <select
              name="time-travel-scenario"
              value={settlementScenario}
              onChange={(event) =>
                setSettlementScenario(
                  event.target.value as "REACHED_GOAL" | "MISSED_GOAL",
                )
              }
              className="input-field mt-1.5 min-h-11 w-full bg-white text-xs font-semibold"
            >
              <option value="REACHED_GOAL">
                Đạt ≥ 100% Goal → Capture toàn bộ Authorization
              </option>
              <option value="MISSED_GOAL">
                Chưa đạt Goal (&lt; 100%) → Cancel/Giải tỏa Authorization
              </option>
            </select>
          </label>
        </div>

        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Quy trình Settlement 4 bước">
          {[
            { n: 1, title: "1. T=0 Deadline", desc: "Đẩy hạn chốt" },
            { n: 2, title: "2. Check Goal", desc: settlementScenario === "REACHED_GOAL" ? "Đạt ≥ 100%" : "Dưới 100%" },
            { n: 3, title: "3. Stripe Gate", desc: settlementScenario === "REACHED_GOAL" ? "Capture tiền" : "Cancel giữ chỗ" },
            { n: 4, title: "4. Idempotency", desc: "Khóa chống trùng" },
          ].map((step) => {
            const done = settlementStep >= step.n;
            const active = settlementStep === step.n;
            return (
              <li
                key={step.n}
                className={`rounded-xl border px-3 py-2 text-xs transition ${
                  active
                    ? "border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6] ring-2 ring-[#7C3AED]/20"
                    : done
                      ? "border-emerald-200 bg-[#ECFDF5] text-[#047857]"
                      : "border-line bg-surface text-ink-muted"
                }`}
              >
                <p className="font-extrabold">{step.title}</p>
                <p className="mt-0.5 text-[11px]">{step.desc}</p>
              </li>
            );
          })}
        </ol>

        {settlementResult ? (
          <div
            role="status"
            className={`mt-4 rounded-2xl border p-4 text-xs ${
              settlementResult.duplicatePrevented
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : settlementResult.outcome === "REACHED_GOAL"
                  ? "border-emerald-200 bg-[#ECFDF5] text-[#065F46]"
                  : "border-slate-300 bg-slate-50 text-ink"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold">
                {settlementResult.duplicatePrevented
                  ? "Idempotent (US11): Batch này đã quyết toán trước đó — không tạo giao dịch trùng."
                  : `Đã chạy Settlement cho "${settlementResult.campaignTitle}"`}
              </span>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-ink ring-1 ring-slate-200">
                Idempotency-Key: {settlementResult.key}
              </span>
            </div>
            <p className="mt-2 tabular-nums">
              Kết quả: <strong>{settlementResult.statusLabel}</strong> · Số cam kết xử lý:{" "}
              <strong>{settlementResult.processedPledges}</strong>
            </p>
          </div>
        ) : null}
      </article>

      <article className="rounded-[20px] border border-slate-200 bg-white p-6 text-ink xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-[#047857]">
              <History className="size-4" /> Nhật ký thao tác quản trị
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold text-ink">
              Thao tác vừa thực hiện trong phiên
            </h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-ink-soft">
            {localDbAvailable ? "Đồng bộ SQLite cục bộ" : "Phiên làm việc hiện tại"}
          </span>
        </div>
        {audit.length ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {audit.slice(0, 6).map((entry, index) => (
              <div
                key={`${entry}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-ink"
              >
                {entry}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs leading-6 text-ink-muted">
            Chưa có thay đổi cấu hình nào trong ca làm việc này. Mọi thay đổi phí, khóa chiến dịch hoặc chạy Time Travel Settlement sẽ được ghi dấu tại đây.
          </p>
        )}
      </article>
    </div>
  );
}

function AdminContent({
  tab,
  data,
  localDbAvailable,
}: {
  tab: AdminTab;
  data: AdminDashboardData;
  localDbAvailable: boolean;
}) {
  if (tab === "overview") return <OverviewPanel data={data} />;
  if (tab === "reviews") return <ReviewPanel data={data} />;
  if (tab === "fraud") return <FraudPanel data={data} />;
  if (tab === "users") return <UsersPanel data={data} />;
  return <SettingsPanel data={data} localDbAvailable={localDbAvailable} />;
}

export function AdminWorkspace({ data, localDbAvailable = false }: { data: AdminDashboardData; localDbAvailable?: boolean }) {
  const [tab, setTab] = useQueryTab<AdminTab>(adminTabIds, "overview");
  const currentTab = adminTabCopy[tab];
  const CurrentTabIcon = currentTab.icon;
  const metrics = [
    {
      label: "Tổng cam kết",
      value: formatVnd(data.metrics.grossPledged, true),
      detail: "Tổng lũy kế toàn sàn",
      icon: CircleDollarSign,
      tone: "bg-[#ECFDF5] text-[#047857]",
      tab: "overview" as const,
    },
    {
      label: "Doanh thu phí",
      value: formatVnd(data.metrics.platformRevenue, true),
      detail: "Phần phí đã ghi nhận",
      icon: BadgeDollarSign,
      tone: "bg-sky-50 text-sky-700",
      tab: "settings" as const,
    },
    {
      label: "Hồ sơ theo dõi",
      value: String(data.reviewQueue.length),
      detail: `${data.reviewQueue.filter((item) => item.status === "PENDING").length} chờ duyệt · ${data.reviewQueue.filter((item) => item.status === "NEEDS_CHANGES").length} chờ bổ sung`,
      icon: FileCheck2,
      tone: "bg-amber-50 text-amber-800",
      tab: "reviews" as const,
    },
    {
      label: "Cảnh báo đang mở",
      value: String(data.metrics.openAlerts),
      detail: `${data.alerts.length} cảnh báo ưu tiên`,
      icon: ShieldAlert,
      tone: "bg-rose-50 text-[#E11D48]",
      tab: "fraud" as const,
    },
  ];

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-16">
      <div className="border-b border-line bg-surface py-4 text-ink sm:py-5">
        <div className="container-shell">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-[#E11D48]">
            <CurrentTabIcon className="size-3.5" /> {currentTab.eyebrow}
          </span>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
                {currentTab.title}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-soft sm:text-sm">
                {currentTab.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-line bg-canvas-soft px-3.5 py-2 text-xs font-semibold text-ink-soft tabular-nums">
                <span className="size-1.5 rounded-full bg-[#059669]" /> Dữ liệu cập nhật {data.operations.snapshotAt}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div id="workspace-content" className="container-shell scroll-mt-28 pt-4">
        <RoleMissionBar role="ADMIN" />
        <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const active = tab === metric.tab;
            return (
              <button
                key={metric.label}
                type="button"
                onClick={() => setTab(metric.tab)}
                aria-pressed={active}
                className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${active ? "border-[#E11D48] bg-rose-50/35 ring-2 ring-[#E11D48]/12" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${metric.tone}`}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-extrabold text-ink tabular-nums sm:text-xl">{metric.value}</p>
                  <p className="mt-0.5 text-xs font-bold leading-4 text-ink-soft">{metric.label}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-ink-muted tabular-nums">{metric.detail}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="mb-4 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xs"
          role="tablist"
          aria-label="Khu vực quản trị hệ thống"
        >
          {nav.map((item) => {
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
                    ? "bg-[#E11D48] text-white shadow-xs"
                    : "text-ink-soft hover:bg-canvas-soft hover:text-ink"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-ink-muted" role="status" aria-live="polite">
          <ShieldCheck className="size-3.5 text-[#047857]" /> Đang xem: {currentTab.title}
        </div>

        <div className="mt-3 min-w-0">
          {adminTabIds.map((panelTab) => (
            <section key={panelTab} hidden={tab !== panelTab}>
              <AdminContent tab={panelTab} data={data} localDbAvailable={localDbAvailable} />
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
