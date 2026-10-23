"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BadgeDollarSign,
  Ban,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  Flag,
  FolderHeart,
  Headphones,
  History,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
  UserCheck,
  UserCog,
  UserPlus,
  UserRoundCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { RoleConnectionPanel } from "@/components/workspace/role-connection-panel";
import { useQueryTab } from "@/hooks/use-query-tab";
import type { AdminDashboardData, FraudAlert } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";

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
    title: "Việc nào cần Admin xử lý trước?",
    description:
      "Xem hồ sơ đến hạn, cảnh báo đang mở và các mốc vận hành quan trọng trong cùng một ca trực.",
    icon: BarChart3,
  },
  reviews: {
    eyebrow: "Kiểm duyệt chiến dịch",
    title: "Đọc hồ sơ và bằng chứng trước khi duyệt.",
    description:
      "Mỗi quyết định gắn với đúng campaign, phiên bản gửi duyệt, checklist và lý do của quản trị viên.",
    icon: FileCheck2,
  },
  fraud: {
    eyebrow: "Rủi ro giao dịch",
    title: "Đọc tín hiệu trước khi đưa ra kết luận.",
    description:
      "Điểm AI chỉ sắp thứ tự kiểm tra; Admin vẫn xem dấu hiệu, lịch sử và tự xác nhận quyết định cuối.",
    icon: ShieldAlert,
  },
  users: {
    eyebrow: "Tài khoản & quyền truy cập",
    title: "Quản lý người dùng theo trạng thái thật.",
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

const reviewDecisionLabels: Record<ReviewDecision, string> = {
  APPROVED: "ĐÃ DUYỆT",
  CHANGES: "YÊU CẦU SỬA",
  REJECTED: "TỪ CHỐI",
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
        Thao tác này sẽ được ghi vào nhật ký quản trị cùng người thực hiện và thời điểm xử lý.
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
            <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-lg bg-forest px-2 py-1 text-[9px] font-bold text-white group-hover:block">
              {formatVnd(item.amount, true)}
            </span>
          </div>
          <p
            className={`mt-3 text-center text-[10px] font-bold ${index === data.length - 1 ? "text-coral-dark" : "text-ink-muted"}`}
          >
            {item.month}
          </p>
        </div>
      ))}
    </div>
  );
}

function OverviewPanel({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[18px] border border-line bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold">Ca trực ngày 13/09</p>
            <p className="mt-1 text-[10px] text-ink-muted">
              Việc cần xử lý trước khi chuyển ca chiều
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
            <Check className="size-3.5" /> {data.operations.reconciliationLabel}
          </span>
        </div>
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              icon: FileCheck2,
              value: `${data.operations.reviewsDueToday} hồ sơ`,
              label: "đến hạn duyệt hôm nay",
              detail: `${data.operations.overdueReviews} hồ sơ đã quá SLA`,
              tone: "text-amber-700 bg-amber-50",
            },
            {
              icon: CircleDollarSign,
              value: formatVnd(data.operations.authorizedAmount, true),
              label: "đang giữ hạn mức",
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
                  <p className="mt-1 text-[10px] text-ink-muted">{item.detail}</p>
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
              <p className="mt-1 text-[10px] text-ink-muted">
                Gồm cam kết còn giữ hạn mức và khoản đã thu tiền
              </p>
            </div>
            <span className="rounded-[8px] bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              +8,8% tháng này
            </span>
          </div>
          <RevenueChart data={data.fundingSeries} />
        </article>
        <article className="rounded-[18px] bg-[#20232c] p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-lime">
                <ShieldAlert className="size-4" /> Rủi ro cần xem
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                Cảnh báo mới nhất
              </h2>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-red-500/16 text-red-300">
              <AlertTriangle className="size-5" />
            </span>
          </div>
          <div className="mt-6 rounded-[12px] border border-white/8 bg-white/6 p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs font-bold">
                  {data.alerts[0].campaignTitle}
                </p>
                <p className="mt-1 text-[10px] text-white/68">
                  {data.alerts[0].userLabel} · {data.alerts[0].createdAt}
                </p>
              </div>
              <p className="font-display text-3xl font-extrabold text-red-300">
                {data.alerts[0].riskScore}
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-[11px] text-white/55">
              {data.alerts[0].signals.map((signal) => (
                <li key={signal} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-300" />
                  {signal}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 text-xs leading-5 text-white/68">
            Điểm số chỉ giúp quản trị viên sắp xếp thứ tự kiểm tra, không tự động
            khóa tài khoản.
          </p>
        </article>
      </div>

      <section className="rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-coral">
              <History className="size-4" /> Nhật ký quyết định
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold">
              Thao tác gần nhất của ca vận hành
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
            <Clock3 className="size-3.5" /> {data.operations.snapshotAt}
          </span>
        </div>
        <div className="mt-5 divide-y divide-line border-y border-line">
          {data.recentDecisions.map((entry) => (
            <div key={entry.id} className="grid gap-2 py-4 sm:grid-cols-[84px_1fr_1.2fr] sm:items-start">
              <p className="text-[10px] font-bold text-ink-muted">{entry.time}</p>
              <div>
                <p className="text-xs font-bold">{entry.action}</p>
                <p className="mt-1 text-[10px] text-ink-muted">{entry.actor}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-soft">{entry.target}</p>
                <p className="mt-1 text-[10px] leading-5 text-ink-muted">{entry.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewPanel({ data }: { data: AdminDashboardData }) {
  const [reviews, setReviews] = useState(data.reviewQueue);
  const [feedback, setFeedback] = useState<Record<string, string>>({
    rev_03: "Bổ sung kế hoạch giao hàng và mô tả rõ rủi ro nhà cung cấp.",
  });
  const [decisions, setDecisions] = useState<Record<string, ReviewDecision>>(
    {},
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    decision: ReviewDecision;
  } | null>(null);

  const requestDecision = (id: string, decision: ReviewDecision) => {
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
      setDecisions((current) => ({ ...current, [id]: decision }));
      setReviews((current) => current.filter((review) => review.id !== id));
      setPendingDecision(null);
      setNotice("Đã lưu quyết định và gửi phản hồi cho chủ dự án.");
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
          Chiến dịch chờ duyệt
        </h2>
        <p className="mt-2 text-xs text-ink-muted">
          Checklist, quyết định và phản hồi đều được lưu vào nhật ký hệ thống.
        </p>
      </div>
      {notice ? (
        <AdminNotice message={notice} className="mt-4" />
      ) : null}
      <div className="mt-6 space-y-4">
        {reviews.map((item) => {
          const decision = decisions[item.id];
          return (
            <article
              key={item.id}
              className="rounded-[22px] border border-line bg-white p-5"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${item.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
                    >
                      {item.status === "PENDING" ? "CHỜ DUYỆT" : "CẦN BỔ SUNG"}
                    </span>
                    {decision ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                        {reviewDecisionLabels[decision]}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-extrabold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-ink-muted">
                    {item.creator} · {item.category} · bản gửi v{item.submissionVersion}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold text-ink-soft">
                    <span>{item.documentCount} tài liệu đính kèm</span>
                    <span>Phụ trách: {item.assignedTo}</span>
                    <span
                      className={
                        item.reviewDueAt.startsWith("Quá")
                          ? "text-red-700"
                          : "text-ink-soft"
                      }
                    >
                      SLA: {item.reviewDueAt}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 w-40 rounded-full bg-forest/7">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${item.completeness}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-ink-muted">
                      {item.completeness}% đầy đủ
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-[10px] sm:grid-cols-3">
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
                  <label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-expanded={expandedReview === item.id}
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
                  </div>
                  {pendingDecision?.id === item.id ? (
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
                <div className="mt-5 rounded-2xl bg-[#f6f5f0] p-4 text-xs text-ink-soft">
                  <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row">
                    <p className="font-bold text-ink">Chi tiết checklist kiểm duyệt</p>
                    <p className="text-[10px] text-ink-muted">Gửi {item.submittedAt}</p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {item.checks.map((check) => (
                      <div key={check.label}>
                        <p className="font-bold text-ink">{check.label}</p>
                        <p className="mt-1 leading-5">{check.detail}</p>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
}

function FraudPanel({ data }: { data: AdminDashboardData }) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<
    Record<string, FraudAlert["status"]>
  >({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] = useState<{
    id: string;
    status: "CLEARED" | "ESCALATED";
  } | null>(null);
  const filtered = useMemo(
    () =>
      data.alerts.filter((alert) =>
        `${alert.campaignTitle} ${alert.userLabel}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.alerts, query],
  );

  const resolve = async (
    alert: FraudAlert,
    status: "CLEARED" | "ESCALATED",
  ) => {
    const resolution = notes[alert.id]?.trim();
    if (!resolution) {
      setNotice("Cần nhập lý do trước khi kết luận cảnh báo.");
      return;
    }
    setBusy(alert.id);
    try {
      await callAdminAction("RESOLVE_FRAUD", {
        alertId: alert.id,
        status,
        resolution,
      });
      setStatuses((current) => ({ ...current, [alert.id]: status }));
      setPendingResolution(null);
      setNotice(
        status === "CLEARED"
          ? "Đã kết luận không có rủi ro."
          : "Đã chuyển cảnh báo sang bước kiểm tra sâu.",
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
          <p className="eyebrow text-coral">
            <ShieldAlert className="size-4" /> Phát hiện gian lận
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold">
            Cảnh báo cần con người xem xét
          </h2>
        </div>
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="admin-fraud-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-field input-with-icon min-w-64 pr-11"
            placeholder="Tìm chiến dịch hoặc người dùng…"
            aria-label="Tìm cảnh báo theo chiến dịch hoặc người dùng"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-ink-muted hover:bg-stone-100 hover:text-ink"
              aria-label="Xóa từ khóa tìm cảnh báo"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
      </div>
      {notice ? (
        <AdminNotice message={notice} className="mt-4" />
      ) : null}
      <div className="mt-6 space-y-4">
        {filtered.map((alert) => {
          const status = statuses[alert.id] ?? alert.status;
          const riskTone =
            alert.riskScore >= 85
              ? "bg-red-50 text-red-700"
              : alert.riskScore >= 70
                ? "bg-amber-50 text-amber-700"
                : "bg-yellow-50 text-yellow-700";
          return (
            <article
              key={alert.id}
              className="rounded-[22px] border border-line bg-white p-5"
            >
              <div className="grid gap-5 xl:grid-cols-[105px_1fr_300px] xl:items-start">
                <div>
                  <p
                    className={`inline-flex rounded-xl px-3 py-2 font-display text-2xl font-extrabold ${riskTone}`}
                  >
                    {alert.riskScore}
                  </p>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                    Điểm rủi ro
                  </p>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-extrabold">
                      {alert.campaignTitle}
                    </h3>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-600">
                      {fraudStatusLabels[status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {alert.userLabel} · {formatVnd(alert.amount)} ·{" "}
                    {alert.createdAt}
                  </p>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Tín hiệu đã tổng hợp
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {alert.signals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-line bg-[#faf9f5] px-2.5 py-1 text-[10px] text-ink-soft"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      Lý do xử lý
                    </span>
                    <textarea
                      name={`fraud-note-${alert.id}`}
                      value={notes[alert.id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [alert.id]: event.target.value,
                        }))
                      }
                      className="input-field mt-2 min-h-20 resize-y text-xs"
                      placeholder="Kết luận dựa trên tín hiệu nào?"
                      required
                      aria-invalid={
                        pendingResolution?.id === alert.id &&
                        !(notes[alert.id]?.trim())
                      }
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy === alert.id}
                      onClick={() => {
                        if (!notes[alert.id]?.trim()) {
                          setNotice("Cần nhập lý do trước khi kết luận cảnh báo.");
                          return;
                        }
                        setNotice(null);
                        setPendingResolution({ id: alert.id, status: "CLEARED" });
                      }}
                      className="button-secondary min-h-11 px-3 text-xs"
                    >
                      <ShieldCheck className="size-3.5" /> Không có rủi ro
                    </button>
                    <button
                      type="button"
                      disabled={busy === alert.id}
                      onClick={() => {
                        if (!notes[alert.id]?.trim()) {
                          setNotice("Cần nhập lý do trước khi kết luận cảnh báo.");
                          return;
                        }
                        setNotice(null);
                        setPendingResolution({ id: alert.id, status: "ESCALATED" });
                      }}
                      className="button-dark min-h-11 px-3 text-xs"
                    >
                      {busy === alert.id ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Flag className="size-3.5" />
                      )}{" "}
                      Kiểm tra sâu
                    </button>
                  </div>
                  {pendingResolution?.id === alert.id ? (
                    <InlineActionConfirm
                      title={
                        pendingResolution.status === "CLEARED"
                          ? "Kết luận không có rủi ro?"
                          : "Chuyển cảnh báo sang kiểm tra sâu?"
                      }
                      detail="Lý do xử lý và người thao tác sẽ được ghi vào nhật ký quản trị của bản demo."
                      confirmLabel={
                        pendingResolution.status === "CLEARED"
                          ? "Xác nhận kết luận"
                          : "Chuyển kiểm tra sâu"
                      }
                      danger={pendingResolution.status === "ESCALATED"}
                      busy={busy === alert.id}
                      onConfirm={() =>
                        void resolve(alert, pendingResolution.status)
                      }
                      onCancel={() => setPendingResolution(null)}
                    />
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        {!filtered.length ? (
          <div className="rounded-[20px] border border-dashed border-line bg-white px-5 py-10 text-center">
            <ShieldCheck className="mx-auto size-6 text-emerald-600" />
            <h3 className="mt-3 font-display text-lg font-extrabold">
              Không có cảnh báo phù hợp
            </h3>
            <p className="mt-2 text-xs text-ink-muted">
              Thử đổi từ khóa hoặc quay lại toàn bộ hàng cảnh báo.
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="button-secondary mt-4 min-h-11 px-4 text-xs"
              >
                <X className="size-3.5" /> Xem toàn bộ cảnh báo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Không tự khóa người
        dùng dựa trên mô hình. Giao diện chỉ hiển thị tín hiệu tổng hợp, không
        công khai IP hoặc dấu vân tay thiết bị.
      </div>
    </div>
  );
}

function UsersPanel({ data }: { data: AdminDashboardData }) {
  const [users, setUsers] = useState<AdminDashboardData["users"]>(data.users);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "newest" | "lastSeen" | "name" | "campaigns" | "pledges"
  >("newest");

  // Modals state
  const [selectedUser, setSelectedUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [detailTab, setDetailTab] = useState<
    "overview" | "roles" | "campaigns" | "pledges" | "moderation"
  >("overview");

  const [statusTargetUser, setStatusTargetUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [statusReason, setStatusReason] = useState("");

  const [roleTargetUser, setRoleTargetUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [selectedRoleToToggle, setSelectedRoleToToggle] = useState<string>("");
  const [roleReason, setRoleReason] = useState("");

  const [resetTargetUser, setResetTargetUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Người ủng hộ",
    phone: "",
    location: "TP. Hồ Chí Minh",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Metric counts
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedCount = users.filter((u) => u.status === "SUSPENDED").length;
  const reviewingCount = users.filter((u) => u.status === "REVIEWING").length;
  const creatorCount = users.filter((u) =>
    u.roles.includes("Chủ dự án"),
  ).length;
  const adminCount = users.filter((u) =>
    u.roles.includes("Quản trị viên"),
  ).length;

  // Filtered & sorted users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    const keyword = query.trim().toLocaleLowerCase("vi");
    if (keyword) {
      result = result.filter((user) =>
        `${user.name} ${user.email} ${user.location} ${user.phone ?? ""} ${user.roles.join(" ")} ${user.status}`
          .toLocaleLowerCase("vi")
          .includes(keyword),
      );
    }

    // Role filter
    if (roleFilter !== "ALL") {
      result = result.filter((user) => user.roles.includes(roleFilter));
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "vi");
      }
      if (sortBy === "campaigns") {
        return (b.campaignCount ?? 0) - (a.campaignCount ?? 0);
      }
      if (sortBy === "pledges") {
        return (b.totalPledgedAmount ?? 0) - (a.totalPledgedAmount ?? 0);
      }
      if (sortBy === "lastSeen") {
        return a.lastSeen.localeCompare(b.lastSeen, "vi");
      }
      return 0; // Default order
    });

    return result;
  }, [users, query, roleFilter, statusFilter, sortBy]);

  // Handlers
  const handleToggleStatus = async () => {
    if (!statusTargetUser) return;
    const nextStatus: "ACTIVE" | "SUSPENDED" =
      statusTargetUser.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const reason =
      statusReason.trim() ||
      (nextStatus === "ACTIVE"
        ? "Quản trị viên mở khóa tài khoản"
        : "Quản trị viên tạm khóa tài khoản");

    setBusy(statusTargetUser.id);
    setNotice(null);

    try {
      await callAdminAction("SET_USER_STATUS", {
        userId: statusTargetUser.id,
        status: nextStatus,
        reason,
      });

      const updatedUsers = users.map((u) => {
        if (u.id === statusTargetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action:
              nextStatus === "ACTIVE"
                ? "MỞ KHÓA TÀI KHOẢN"
                : "TẠM KHÓA TÀI KHOẢN",
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          return {
            ...u,
            status: nextStatus,
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      if (selectedUser?.id === statusTargetUser.id) {
        setSelectedUser(
          updatedUsers.find((u) => u.id === statusTargetUser.id) ?? null,
        );
      }

      setNotice(
        nextStatus === "ACTIVE"
          ? `Đã mở khóa tài khoản cho ${statusTargetUser.name}.`
          : `Đã tạm khóa tài khoản của ${statusTargetUser.name}.`,
      );
      setStatusTargetUser(null);
      setStatusReason("");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể cập nhật trạng thái tài khoản. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleToggleRole = async (targetRole: string) => {
    if (!roleTargetUser) return;
    const hasRole = roleTargetUser.roles.includes(targetRole);
    const action = hasRole ? "REMOVE_USER_ROLE" : "ASSIGN_USER_ROLE";
    const reason =
      roleReason.trim() ||
      (hasRole
        ? `Thu hồi vai trò ${targetRole}`
        : `Cấp bổ sung vai trò ${targetRole}`);

    setBusy(roleTargetUser.id);
    setNotice(null);

    try {
      await callAdminAction(action, {
        userId: roleTargetUser.id,
        role: targetRole,
        reason,
      });

      const updatedRoles = hasRole
        ? roleTargetUser.roles.filter((r) => r !== targetRole)
        : [...roleTargetUser.roles, targetRole];

      const updatedUsers = users.map((u) => {
        if (u.id === roleTargetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action: hasRole
              ? `THU HỒI VAI TRÒ ${targetRole.toUpperCase()}`
              : `CẤP VAI TRÒ ${targetRole.toUpperCase()}`,
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          return {
            ...u,
            roles: updatedRoles.length ? updatedRoles : ["Người ủng hộ"],
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      const newActiveUser =
        updatedUsers.find((u) => u.id === roleTargetUser.id) ?? null;
      setRoleTargetUser(newActiveUser);
      if (selectedUser?.id === roleTargetUser.id) {
        setSelectedUser(newActiveUser);
      }

      setNotice(
        hasRole
          ? `Đã thu hồi vai trò "${targetRole}" từ ${roleTargetUser.name}.`
          : `Đã cấp vai trò "${targetRole}" cho ${roleTargetUser.name}.`,
      );
      setRoleReason("");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể cập nhật vai trò người dùng. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTargetUser) return;
    if (newPassword.length < 8) {
      setNotice("Mật khẩu mới tối thiểu 8 ký tự.");
      return;
    }
    const reason =
      resetReason.trim() || "Đặt lại mật khẩu theo yêu cầu hỗ trợ bảo mật";

    setBusy(resetTargetUser.id);
    setNotice(null);

    try {
      await callAdminAction("RESET_USER_PASSWORD", {
        userId: resetTargetUser.id,
        newPassword,
        reason,
      });

      const updatedUsers = users.map((u) => {
        if (u.id === resetTargetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action: "ĐẶT LẠI MẬT KHẨU TẠM THỜI",
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          return {
            ...u,
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      if (selectedUser?.id === resetTargetUser.id) {
        setSelectedUser(
          updatedUsers.find((u) => u.id === resetTargetUser.id) ?? null,
        );
      }

      setNotice(
        `Đã đặt lại mật khẩu tạm thời cho ${resetTargetUser.name}. Hãy gửi mật khẩu cho người dùng.`,
      );
      setResetTargetUser(null);
      setNewPassword("");
      setResetReason("");
      setCopiedPassword(false);
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể đặt lại mật khẩu. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.name.trim()) {
      setCreateError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes("@")) {
      setCreateError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError("Mật khẩu phải từ 8 ký tự trở lên.");
      return;
    }

    setBusy("create");

    try {
      const res = await callAdminAction("CREATE_USER", {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        location: createForm.location.trim() || "Việt Nam",
        phone: createForm.phone.trim() || "0900 000 000",
      });

      const parts = createForm.name.trim().split(/\s+/);
      const initials =
        parts.length === 1
          ? parts[0].slice(0, 2).toUpperCase()
          : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

      const newUser: (typeof users)[number] = {
        id: `usr_${Date.now().toString(36)}`,
        name: createForm.name.trim(),
        initials,
        email: createForm.email.trim().toLowerCase(),
        location: createForm.location.trim() || "Việt Nam",
        phone: createForm.phone.trim() || "0900 000 000",
        roles: [createForm.role],
        status: "ACTIVE",
        lastSeen: "Vừa tạo",
        createdAt: "Hôm nay",
        emailVerified: true,
        campaignCount: 0,
        pledgeCount: 0,
        totalPledgedAmount: 0,
        fraudAlertCount: 0,
        campaigns: [],
        pledges: [],
        moderationActions: [
          {
            id: `mod_${Date.now()}`,
            action: "TẠO TÀI KHOẢN MỚI",
            reason: "Tạo trực tiếp từ trung tâm quản trị viên",
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          },
        ],
      };

      setUsers([newUser, ...users]);
      setNotice(`Đã tạo thành công tài khoản cho "${newUser.name}"!`);
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "Người ủng hộ",
        phone: "",
        location: "TP. Hồ Chí Minh",
      });
    } catch (error) {
      setCreateError(
        adminRequestError(
          error,
          "Chưa thể tạo tài khoản mới. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header & Action ─────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="eyebrow text-coral flex items-center gap-1.5 font-bold">
            <UserRoundCog className="size-4" /> Quản trị người dùng & phân quyền
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Danh sách tài khoản hệ thống
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Kiểm soát tài khoản người dùng, phân bổ vai trò quản trị/chủ dự án và
            xử lý khóa tài khoản kèm nhật ký kiểm duyệt.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#142d25] active:scale-[0.98]"
        >
          <UserPlus className="size-4" />
          <span>Thêm người dùng mới</span>
        </button>
      </div>

      {/* ── Metric Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-[20px] border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Tổng người dùng
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-stone-100 text-ink">
              <Users className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-ink">
            {totalCount}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Tài khoản trong hệ thống
          </p>
        </div>

        <div className="rounded-[20px] border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Đang hoạt động
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Check className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-emerald-700">
            {activeCount}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {Math.round((activeCount / (totalCount || 1)) * 100)}% người dùng bình thường
          </p>
        </div>

        <div className="rounded-[20px] border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Đã khóa & Rủi ro
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-red-50 text-red-600">
              <Ban className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-red-700">
            {suspendedCount + reviewingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {suspendedCount} bị khóa · {reviewingCount} đang xem xét
          </p>
        </div>

        <div className="rounded-[20px] border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Chủ dự án & QTV
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <Shield className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-purple-700">
            {creatorCount + adminCount}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {creatorCount} chủ dự án · {adminCount} quản trị viên
          </p>
        </div>
      </div>

      {notice ? <AdminNotice message={notice} /> : null}

      {/* ── Filters & Search Toolbar ────────────────────────── */}
      <div className="space-y-3 rounded-[22px] border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              name="admin-user-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field input-with-icon w-full pr-10 text-xs"
              placeholder="Tìm theo tên hiển thị, email, số điện thoại, vị trí hoặc vai trò…"
              aria-label="Tìm người dùng"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-stone-100 hover:text-ink"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>

          {/* Quick Selects */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <SlidersHorizontal className="size-3.5" />
              <span>Trạng thái:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-forest"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="SUSPENDED">Đã tạm khóa</option>
              <option value="REVIEWING">Đang xem xét rủi ro</option>
            </select>

            <div className="flex items-center gap-1.5 pl-2 text-xs text-ink-muted">
              <span>Sắp xếp:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-forest"
            >
              <option value="newest">Mặc định</option>
              <option value="name">Tên (A-Z)</option>
              <option value="campaigns">Nhiều dự án nhất</option>
              <option value="pledges">Ủng hộ nhiều nhất</option>
              <option value="lastSeen">Hoạt động gần nhất</option>
            </select>
          </div>
        </div>

        {/* Role pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
          <span className="text-[11px] font-semibold text-ink-muted mr-1">
            Vai trò:
          </span>
          {[
            { id: "ALL", label: "Tất cả", count: totalCount },
            { id: "Quản trị viên", label: "Quản trị viên", count: adminCount },
            { id: "Chủ dự án", label: "Chủ dự án", count: creatorCount },
            {
              id: "Người ủng hộ",
              label: "Người ủng hộ",
              count: users.filter((u) => u.roles.includes("Người ủng hộ")).length,
            },
            {
              id: "Cộng tác viên",
              label: "Cộng tác viên",
              count: users.filter((u) => u.roles.includes("Cộng tác viên")).length,
            },
          ].map((pill) => {
            const active = roleFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setRoleFilter(pill.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                  active
                    ? "bg-forest text-white shadow-sm"
                    : "bg-[#f3f3ed] text-ink-soft hover:bg-stone-200"
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-white text-ink-muted"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}

          {(query || roleFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRoleFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-coral hover:underline"
            >
              <X className="size-3" /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ── Users Table ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#f3f3ed] text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-4 font-bold">Người dùng</th>
                <th className="px-5 py-4 font-bold">Vai trò & Quyền</th>
                <th className="px-5 py-4 font-bold">Đóng góp & Dự án</th>
                <th className="px-5 py-4 font-bold">Trạng thái</th>
                <th className="px-5 py-4 font-bold">Truy cập cuối</th>
                <th className="px-5 py-4 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredUsers.map((user) => {
                const isAdmin = user.roles.includes("Quản trị viên");
                const isCreator = user.roles.includes("Chủ dự án");

                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-stone-50/70"
                  >
                    {/* User Profile */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setDetailTab("overview");
                          }}
                          className={`relative grid size-10 shrink-0 place-items-center rounded-xl font-display text-xs font-black shadow-xs transition hover:scale-105 ${
                            isAdmin
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : isCreator
                                ? "bg-coral/15 text-coral-dark border border-coral/30"
                                : "bg-[#eef0f3] text-[#343741]"
                          }`}
                        >
                          {user.initials}
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setDetailTab("overview");
                            }}
                            className="text-left font-bold text-ink hover:text-coral transition hover:underline flex items-center gap-1.5"
                          >
                            <span className="truncate">{user.name}</span>
                            {user.emailVerified ? (
                              <span
                                title="Đã xác thực email"
                                className="inline-block text-emerald-600"
                              >
                                <Check className="size-3 stroke-[3]" />
                              </span>
                            ) : null}
                          </button>
                          <span className="block truncate text-[11px] text-ink-muted">
                            {user.email}
                          </span>
                          {user.phone ? (
                            <span className="mt-0.5 block text-[10px] text-ink-muted">
                              📞 {user.phone} · 📍 {user.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Roles */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.map((role) => {
                          const badgeStyle =
                            role === "Quản trị viên"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : role === "Chủ dự án"
                                ? "bg-coral/10 text-coral-dark border-coral/20"
                                : role === "Cộng tác viên"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200";

                          return (
                            <span
                              key={role}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeStyle}`}
                            >
                              {role === "Quản trị viên" && (
                                <Shield className="size-2.5" />
                              )}
                              {role === "Chủ dự án" && (
                                <FolderHeart className="size-2.5" />
                              )}
                              {role === "Người ủng hộ" && (
                                <Coins className="size-2.5" />
                              )}
                              {role}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Contribution */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <span className="block font-semibold text-ink">
                          {user.campaignCount ? (
                            <span className="text-coral-dark font-extrabold">
                              {user.campaignCount} chiến dịch
                            </span>
                          ) : (
                            <span className="text-ink-muted font-normal">
                              Chưa tạo dự án
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-ink-muted">
                          {user.totalPledgedAmount ? (
                            <span>
                              Ủng hộ:{" "}
                              <strong className="text-ink font-bold">
                                {formatVnd(user.totalPledgedAmount)}
                              </strong>{" "}
                              ({user.pledgeCount} lượt)
                            </span>
                          ) : (
                            "Chưa có lượt ủng hộ"
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          user.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : user.status === "SUSPENDED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            user.status === "ACTIVE"
                              ? "bg-emerald-500 animate-pulse"
                              : user.status === "SUSPENDED"
                                ? "bg-red-500"
                                : "bg-amber-500"
                          }`}
                        />
                        {user.status === "ACTIVE"
                          ? "Đang hoạt động"
                          : user.status === "SUSPENDED"
                            ? "Đã tạm khóa"
                            : "Đang xem xét"}
                      </span>
                    </td>

                    {/* Last seen */}
                    <td className="px-5 py-4">
                      <span className="block font-medium text-ink-soft">
                        {user.lastSeen}
                      </span>
                      <span className="block text-[10px] text-ink-muted">
                        Tạo ngày: {user.createdAt ?? "Chưa rõ"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* View detail */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setDetailTab("overview");
                          }}
                          className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-muted hover:border-forest/40 hover:text-forest transition"
                          title="Xem hồ sơ chi tiết"
                        >
                          <Eye className="size-3.5" />
                        </button>

                        {/* Manage roles */}
                        <button
                          type="button"
                          onClick={() => {
                            setRoleTargetUser(user);
                            setSelectedRoleToToggle("");
                            setRoleReason("");
                          }}
                          className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-muted hover:border-purple-300 hover:text-purple-700 transition"
                          title="Phân quyền vai trò"
                        >
                          <UserCog className="size-3.5" />
                        </button>

                        {/* Reset password */}
                        <button
                          type="button"
                          onClick={() => {
                            setResetTargetUser(user);
                            setNewPassword("");
                            setResetReason("");
                            setCopiedPassword(false);
                          }}
                          className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-muted hover:border-amber-300 hover:text-amber-700 transition"
                          title="Đặt lại mật khẩu tạm"
                        >
                          <KeyRound className="size-3.5" />
                        </button>

                        {/* Suspend / Unlock */}
                        <button
                          type="button"
                          disabled={busy === user.id}
                          onClick={() => {
                            setStatusTargetUser(user);
                            setStatusReason("");
                          }}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                            user.status === "SUSPENDED"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          {user.status === "SUSPENDED" ? (
                            <>
                              <ShieldCheck className="size-3" />
                              <span>Mở khóa</span>
                            </>
                          ) : (
                            <>
                              <Ban className="size-3" />
                              <span>Khóa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredUsers.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <UserRoundCog className="mx-auto size-8 text-stone-300" />
                    <p className="mt-3 font-bold text-ink">
                      Không tìm thấy tài khoản phù hợp
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc vai
                      trò / trạng thái.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setRoleFilter("ALL");
                        setStatusFilter("ALL");
                      }}
                      className="button-ghost mt-3 min-h-10 px-4 text-xs font-bold"
                    >
                      <X className="size-3.5" /> Đặt lại bộ lọc
                    </button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-line bg-[#fbfbfa] px-5 py-3 text-xs text-ink-muted">
          <span>
            Hiển thị <strong>{filteredUsers.length}</strong> /{" "}
            {users.length} tài khoản
          </span>
          <span>Cập nhật theo dữ liệu phiên trực tiếp</span>
        </div>
      </div>

      {/* ── Modal 1: User Full Detail Drawer / Modal ─────────── */}
      {selectedUser ? (
        <Modal
          open
          size="lg"
          title={`Hồ sơ tài khoản: ${selectedUser.name}`}
          description={`ID: ${selectedUser.id} · Tham gia từ: ${selectedUser.createdAt ?? "2025"}`}
          onClose={() => setSelectedUser(null)}
        >
          <div className="space-y-5">
            {/* User Profile Bar */}
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="grid size-12 place-items-center rounded-2xl bg-forest/10 font-display text-base font-black text-forest">
                  {selectedUser.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-extrabold text-ink">
                      {selectedUser.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selectedUser.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {selectedUser.status === "ACTIVE"
                        ? "Hoạt động"
                        : "Bị khóa"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">{selectedUser.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRoleTargetUser(selectedUser);
                    setSelectedRoleToToggle("");
                    setRoleReason("");
                  }}
                  className="button-ghost min-h-10 px-3 text-xs font-bold"
                >
                  <UserCog className="size-3.5" /> Phân quyền
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetUser(selectedUser);
                    setNewPassword("");
                    setResetReason("");
                  }}
                  className="button-ghost min-h-10 px-3 text-xs font-bold"
                >
                  <KeyRound className="size-3.5" /> Đặt lại mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusTargetUser(selectedUser);
                    setStatusReason("");
                  }}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold ${
                    selectedUser.status === "SUSPENDED"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {selectedUser.status === "SUSPENDED" ? (
                    <>
                      <ShieldCheck className="size-3.5" /> Mở khóa
                    </>
                  ) : (
                    <>
                      <Ban className="size-3.5" /> Khóa tài khoản
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-line gap-2 text-xs">
              {[
                { id: "overview", label: "Tổng quan & Liên hệ", icon: Eye },
                {
                  id: "roles",
                  label: `Vai trò (${selectedUser.roles.length})`,
                  icon: Shield,
                },
                {
                  id: "campaigns",
                  label: `Chiến dịch (${selectedUser.campaigns?.length ?? selectedUser.campaignCount ?? 0})`,
                  icon: FolderHeart,
                },
                {
                  id: "pledges",
                  label: `Lượt ủng hộ (${selectedUser.pledges?.length ?? selectedUser.pledgeCount ?? 0})`,
                  icon: Coins,
                },
                {
                  id: "moderation",
                  label: `Nhật ký kiểm duyệt (${selectedUser.moderationActions?.length ?? 1})`,
                  icon: History,
                },
              ].map((tabItem) => {
                const active = detailTab === tabItem.id;
                const Icon = tabItem.icon;
                return (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => setDetailTab(tabItem.id as any)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 font-bold transition ${
                      active
                        ? "border-forest text-forest"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{tabItem.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Overview */}
            {detailTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-stone-50/50 p-4 space-y-2.5 text-xs">
                    <p className="font-bold text-ink">Thông tin cá nhân</p>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Email</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.email}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Xác thực email</span>
                      <span className="font-semibold text-emerald-700">
                        {selectedUser.emailVerified
                          ? "✓ Đã xác thực"
                          : "Chưa xác thực"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Số điện thoại</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.phone ?? "Chưa có"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Địa chỉ / Vị trí</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Ngày đăng ký</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.createdAt ?? "2025"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-stone-50/50 p-4 space-y-2.5 text-xs">
                    <p className="font-bold text-ink">Tiểu sử & Giới thiệu</p>
                    <p className="text-ink-soft leading-relaxed italic">
                      "{selectedUser.bio ?? "Người dùng chưa cập nhật tiểu sử."}"
                    </p>
                    <div className="pt-2">
                      <p className="font-bold text-ink mb-1.5">
                        Tóm tắt hoạt động
                      </p>
                      <ul className="space-y-1 text-ink-muted text-[11px]">
                        <li>
                          • Hoạt động gần nhất:{" "}
                          <strong>{selectedUser.lastSeen}</strong>
                        </li>
                        <li>
                          • Tổng tiền cam kết ủng hộ:{" "}
                          <strong className="text-forest font-bold">
                            {formatVnd(selectedUser.totalPledgedAmount ?? 0)}
                          </strong>
                        </li>
                        <li>
                          • Cảnh báo rủi ro gian lận liên quan:{" "}
                          <strong
                            className={
                              selectedUser.fraudAlertCount
                                ? "text-red-700"
                                : "text-emerald-700"
                            }
                          >
                            {selectedUser.fraudAlertCount ?? 0} cảnh báo
                          </strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Roles */}
            {detailTab === "roles" && (
              <div className="space-y-4 text-xs">
                <p className="text-ink-muted">
                  Quản trị viên có thể thêm hoặc thu hồi quyền truy cập của người
                  dùng. Mọi thay đổi đều được ghi vết phục vụ kiểm toán an toàn.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: "Quản trị viên",
                      name: "Quản trị viên (ADMIN)",
                      desc: "Toàn quyền kiểm duyệt dự án, quản lý tài khoản và thiết lập cấu hình.",
                      color: "border-purple-200 bg-purple-50/40 text-purple-900",
                    },
                    {
                      id: "Chủ dự án",
                      name: "Chủ dự án (CREATOR)",
                      desc: "Tạo, quản trị chiến dịch gọi vốn, cấu hình gói quà và cập nhật tiến độ.",
                      color: "border-coral/20 bg-coral/5 text-coral-dark",
                    },
                    {
                      id: "Người ủng hộ",
                      name: "Người ủng hộ (BACKER)",
                      desc: "Khám phá dự án, đặt gói cam kết giữ tiền và bình luận trao đổi.",
                      color: "border-blue-200 bg-blue-50/40 text-blue-900",
                    },
                    {
                      id: "Cộng tác viên",
                      name: "Cộng tác viên (COLLABORATOR)",
                      desc: "Hỗ trợ trả lời cộng đồng và quản lý vận chuyển theo lời mời của chủ dự án.",
                      color: "border-amber-200 bg-amber-50/40 text-amber-900",
                    },
                  ].map((roleItem) => {
                    const active = selectedUser.roles.includes(roleItem.id);
                    return (
                      <div
                        key={roleItem.id}
                        className={`rounded-xl border p-4 transition ${roleItem.color}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-sm">
                              {roleItem.name}
                            </p>
                            <p className="mt-1 text-[11px] leading-4 text-ink-muted">
                              {roleItem.desc}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              active
                                ? "bg-emerald-600 text-white"
                                : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {active ? "ĐÃ CẤP" : "CHƯA CÓ"}
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-line/60 flex justify-end">
                          <button
                            type="button"
                            disabled={busy === selectedUser.id}
                            onClick={() => {
                              setRoleTargetUser(selectedUser);
                              setSelectedRoleToToggle(roleItem.id);
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              active
                                ? "border border-red-300 text-red-700 hover:bg-red-50"
                                : "bg-forest text-white hover:bg-[#142d25]"
                            }`}
                          >
                            {active ? "Thu hồi vai trò" : "Cấp vai trò này"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Campaigns */}
            {detailTab === "campaigns" && (
              <div className="space-y-3 text-xs">
                {selectedUser.campaigns && selectedUser.campaigns.length > 0 ? (
                  selectedUser.campaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-stone-50/50 p-3.5"
                    >
                      <div>
                        <p className="font-bold text-ink">{camp.title}</p>
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          Mục tiêu: {formatVnd(camp.goalAmount)} · Đã gây quỹ:{" "}
                          <strong className="text-forest">
                            {formatVnd(camp.pledgedAmount)}
                          </strong>{" "}
                          ({camp.backerCount} người ủng hộ)
                        </p>
                      </div>
                      <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[10px] font-bold text-ink-soft">
                        {camp.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-ink-muted">
                    <FolderHeart className="mx-auto size-6 text-stone-300" />
                    <p className="mt-2 font-bold text-ink">
                      Chưa có chiến dịch nào
                    </p>
                    <p className="text-xs">
                      Người dùng này chưa phát động dự án gây quỹ nào.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Pledges */}
            {detailTab === "pledges" && (
              <div className="space-y-3 text-xs">
                {selectedUser.pledges && selectedUser.pledges.length > 0 ? (
                  selectedUser.pledges.map((pledge) => (
                    <div
                      key={pledge.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-stone-50/50 p-3.5"
                    >
                      <div>
                        <p className="font-bold text-ink">
                          {pledge.campaignTitle}
                        </p>
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          Số tiền giữ:{" "}
                          <strong className="text-forest">
                            {formatVnd(pledge.amount)}
                          </strong>{" "}
                          · Thời gian: {pledge.pledgedAt}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-[10px] font-bold">
                        {pledge.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-ink-muted">
                    <Coins className="mx-auto size-6 text-stone-300" />
                    <p className="mt-2 font-bold text-ink">
                      Chưa có lịch sử ủng hộ
                    </p>
                    <p className="text-xs">
                      Người dùng chưa thực hiện lệnh cam kết đóng góp nào.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Moderation history */}
            {detailTab === "moderation" && (
              <div className="space-y-3 text-xs">
                {selectedUser.moderationActions &&
                selectedUser.moderationActions.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedUser.moderationActions.map((mod) => (
                      <div
                        key={mod.id}
                        className="rounded-xl border border-line bg-stone-50/60 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-forest">
                            {mod.action}
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            {mod.createdAt}
                          </span>
                        </div>
                        <p className="mt-1 text-ink-soft">{mod.reason}</p>
                        <p className="mt-1 text-[10px] text-ink-muted">
                          Thực hiện bởi: <strong>{mod.adminName}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-ink-muted">
                    <History className="mx-auto size-6 text-stone-300" />
                    <p className="mt-2 font-bold text-ink">
                      Chưa có lịch sử xử lý
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {/* ── Modal 2: Suspend / Unlock Confirmation ─────────── */}
      {statusTargetUser ? (
        <Modal
          open
          size="sm"
          title={`${
            statusTargetUser.status === "SUSPENDED" ? "Mở khóa" : "Khóa"
          } tài khoản ${statusTargetUser.name}`}
          description={`Tài khoản: ${statusTargetUser.email}`}
          onClose={() => setStatusTargetUser(null)}
          locked={busy === statusTargetUser.id}
        >
          <div className="space-y-4 text-xs">
            <p
              className={`rounded-xl border p-3.5 leading-relaxed ${
                statusTargetUser.status === "SUSPENDED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {statusTargetUser.status === "SUSPENDED"
                ? "Người dùng sẽ có thể đăng nhập lại vào hệ thống, tiếp tục vận hành chiến dịch và thực hiện cam kết tài chính."
                : "Người dùng sẽ ngay lập tức bị chấm dứt phiên đăng nhập, không thể bình luận hay thực hiện cam kết mới. Dữ liệu đối soát vẫn được lưu trữ nguyên vẹn."}
            </p>

            <div>
              <label className="block font-bold text-ink mb-1.5">
                Lý do thực hiện (Bắt buộc lưu vết kiểm toán):
              </label>
              <select
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full rounded-xl border border-line bg-[#fbfbfa] p-2.5 text-xs text-ink outline-none mb-2"
              >
                <option value="">-- Chọn lý do mẫu hoặc tự nhập --</option>
                <option value="Vi phạm chính sách cộng đồng và điều khoản sử dụng">
                  Vi phạm chính sách cộng đồng & điều khoản
                </option>
                <option value="Phát hiện dấu hiệu gian lận thanh toán hoặc rủi ro thẻ">
                  Dấu hiệu gian lận thanh toán hoặc rủi ro
                </option>
                <option value="Spam nội dung hoặc gửi tin nhắn quấy rối thành viên khác">
                  Spam nội dung / quấy rối
                </option>
                <option value="Tài khoản đã hoàn tất xác minh bổ sung và được phục hồi">
                  Đã hoàn tất xác minh bổ sung (Mở khóa)
                </option>
                <option value="Yêu cầu tạm đóng tài khoản từ chính chủ tài khoản">
                  Yêu cầu từ chủ tài khoản
                </option>
              </select>
              <textarea
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Nhập chi tiết căn cứ xử lý tài khoản…"
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink outline-none focus:border-forest"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                disabled={busy === statusTargetUser.id}
                onClick={() => setStatusTargetUser(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy === statusTargetUser.id}
                onClick={handleToggleStatus}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold text-white transition ${
                  statusTargetUser.status === "SUSPENDED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busy === statusTargetUser.id ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {busy === statusTargetUser.id
                  ? "Đang lưu…"
                  : statusTargetUser.status === "SUSPENDED"
                    ? "Xác nhận mở khóa"
                    : "Xác nhận khóa tài khoản"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ── Modal 3: Fast Role Management ───────────────────── */}
      {roleTargetUser ? (
        <Modal
          open
          size="sm"
          title={`Phân quyền tài khoản: ${roleTargetUser.name}`}
          description={`Email: ${roleTargetUser.email}`}
          onClose={() => setRoleTargetUser(null)}
          locked={busy === roleTargetUser.id}
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-muted">
              Chọn vai trò bạn muốn cấp thêm hoặc thu hồi từ tài khoản này:
            </p>

            <div className="space-y-2">
              {[
                {
                  id: "Quản trị viên",
                  label: "Quản trị viên (ADMIN)",
                  badge: "bg-purple-50 text-purple-700",
                },
                {
                  id: "Chủ dự án",
                  label: "Chủ dự án (CREATOR)",
                  badge: "bg-coral/10 text-coral-dark",
                },
                {
                  id: "Người ủng hộ",
                  label: "Người ủng hộ (BACKER)",
                  badge: "bg-blue-50 text-blue-700",
                },
                {
                  id: "Cộng tác viên",
                  label: "Cộng tác viên (COLLABORATOR)",
                  badge: "bg-amber-50 text-amber-700",
                },
              ].map((roleOption) => {
                const hasRole = roleTargetUser.roles.includes(roleOption.id);
                return (
                  <div
                    key={roleOption.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-stone-50/60 p-3"
                  >
                    <div>
                      <span className="font-bold text-ink">
                        {roleOption.label}
                      </span>
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${roleOption.badge}`}
                      >
                        {hasRole ? "Đang có quyền" : "Chưa cấp"}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={busy === roleTargetUser.id}
                      onClick={() => handleToggleRole(roleOption.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        hasRole
                          ? "border border-red-200 text-red-700 hover:bg-red-50"
                          : "bg-forest text-white hover:bg-[#142d25]"
                      }`}
                    >
                      {hasRole ? "Gỡ quyền" : "Cấp quyền"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">
                Lý do thay đổi quyền (Lưu nhật ký kiểm toán):
              </label>
              <input
                type="text"
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                placeholder="Ví dụ: Phê duyệt tham gia ban quản trị nền tảng…"
                className="input-field text-xs w-full"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setRoleTargetUser(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ── Modal 4: Reset Password ─────────────────────────── */}
      {resetTargetUser ? (
        <Modal
          open
          size="sm"
          title={`Đặt lại mật khẩu cho ${resetTargetUser.name}`}
          description={`Tài khoản: ${resetTargetUser.email}`}
          onClose={() => setResetTargetUser(null)}
          locked={busy === resetTargetUser.id}
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-muted">
              Nhập mật khẩu tạm thời mới hoặc bấm nút tạo mật khẩu tự động bên
              dưới. Người dùng sẽ dùng mật khẩu này để đăng nhập lần kế tiếp.
            </p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-ink">Mật khẩu mới:</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-bold text-coral hover:underline"
                >
                  ⚡ Tạo mật khẩu ngẫu nhiên
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập ít nhất 8 ký tự…"
                  className="input-field text-xs w-full pr-10 font-mono"
                />
                {newPassword ? (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink"
                    title="Sao chép mật khẩu"
                  >
                    <Copy className="size-3.5" />
                  </button>
                ) : null}
              </div>
              {copiedPassword ? (
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                  ✓ Đã sao chép vào bộ nhớ tạm!
                </span>
              ) : null}
            </div>

            <div>
              <label className="block font-bold text-ink mb-1.5">
                Lý do đặt lại mật khẩu:
              </label>
              <input
                type="text"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="Ví dụ: Người dùng yêu cầu qua hotline hỗ trợ…"
                className="input-field text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy === resetTargetUser.id || newPassword.length < 8}
                onClick={handleResetPassword}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-xs font-bold text-white transition hover:bg-[#142d25] disabled:opacity-50"
              >
                {busy === resetTargetUser.id ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                <span>Xác nhận đổi mật khẩu</span>
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ── Modal 5: Create User ────────────────────────────── */}
      {isCreateOpen ? (
        <Modal
          open
          size="md"
          title="Tạo tài khoản người dùng mới"
          description="Tài khoản mới sẽ được cấp ngay quyền truy cập và sẵn sàng đăng nhập trên nền tảng."
          onClose={() => setIsCreateOpen(false)}
          locked={busy === "create"}
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            {createError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 font-medium">
                {createError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Họ và tên hiển thị *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Ví dụ: Hoàng Hải Đăng"
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Email đăng nhập *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="email@example.com"
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Mật khẩu ban đầu (tối thiểu 8 ký tự) *
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Nhập mật khẩu an toàn…"
                  className="input-field text-xs w-full font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Vai trò mặc định *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value })
                  }
                  className="w-full rounded-xl border border-line bg-[#fbfbfa] p-2.5 text-xs text-ink outline-none"
                >
                  <option value="Người ủng hộ">Người ủng hộ (BACKER)</option>
                  <option value="Chủ dự án">Chủ dự án (CREATOR)</option>
                  <option value="Quản trị viên">Quản trị viên (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Số điện thoại liên hệ
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                  placeholder="0901 234 567"
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Địa điểm / Tỉnh thành
                </label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, location: e.target.value })
                  }
                  placeholder="TP. Hồ Chí Minh"
                  className="input-field text-xs w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                disabled={busy === "create"}
                onClick={() => setIsCreateOpen(false)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy === "create"}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-forest px-5 text-xs font-bold text-white transition hover:bg-[#142d25] disabled:opacity-50"
              >
                {busy === "create" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                <span>Tạo tài khoản ngay</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function SettingsPanel({ data }: { data: AdminDashboardData }) {
  const initialFee = data.operations.platformFeePercent.toFixed(1);
  const managedCampaign = data.operations.managedCampaign;
  const [fee, setFee] = useState(initialFee);
  const [savedFee, setSavedFee] = useState(initialFee);
  const [campaignSuspended, setCampaignSuspended] = useState(
    managedCampaign.status === "SUSPENDED",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [campaignConfirming, setCampaignConfirming] = useState(false);
  const [audit, setAudit] = useState([
    "06/09 14:20 · adm_01 duyệt ORBIT One",
    "05/09 09:10 · hệ thống tạo cảnh báo FRA-001",
  ]);
  const feeNumber = Number(fee);
  const feeInvalid =
    fee.trim() === "" || !Number.isFinite(feeNumber) || feeNumber < 0 || feeNumber > 20;

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
      setAudit((rows) => [`Vừa xong · cập nhật phí ${fee}%`, ...rows]);
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
      setCampaignSuspended(next);
      setAudit((rows) => [
        `Vừa xong · ${next ? "khóa" : "mở"} ${managedCampaign.title}`,
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
          Chỉ chiến dịch tạo sau thời điểm hiệu lực nhận mức phí mới; chiến dịch
          cũ giữ nguyên mức phí đã chốt.
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
              className="input-field pr-12 text-lg font-bold"
              aria-invalid={feeInvalid}
              aria-describedby="platform-fee-note platform-fee-error"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-ink-muted">
              %
            </span>
          </div>
        </label>
        <div id="platform-fee-note" className="mt-4 rounded-xl bg-[#f2f6e8] p-3 text-[11px] text-[#566c27]">
          Mức đang áp dụng: <strong>{savedFee}%</strong> · hiệu lực cho chiến
          dịch mới
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
        <div className="mt-6 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">{managedCampaign.title}</p>
              <p className="mt-1 text-[10px] text-ink-muted">
                Điểm rủi ro {managedCampaign.riskScore} · {managedCampaign.relatedAlerts} cảnh báo liên quan
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${campaignSuspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {campaignSuspended ? "ĐÃ KHÓA" : "ĐANG HOẠT ĐỘNG"}
            </span>
          </div>
          <label className="mt-4 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
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
          <p id="campaign-action-note" className="mt-2 text-[10px] leading-4 text-ink-muted">
            Hệ thống sẽ hỏi lại trước khi thay đổi trạng thái công khai.
          </p>
          {campaignConfirming ? (
            <InlineActionConfirm
              title={
                campaignSuspended
                  ? "Khôi phục chiến dịch này?"
                  : "Khóa chiến dịch này?"
              }
              detail={`Căn cứ sẽ lưu vào nhật ký: “${reason.trim()}”`}
              confirmLabel={campaignSuspended ? "Xác nhận khôi phục" : "Xác nhận khóa"}
              danger={!campaignSuspended}
              busy={busy === "campaign"}
              onConfirm={() => void toggleCampaign()}
              onCancel={() => setCampaignConfirming(false)}
            />
          ) : null}
        </div>
      </article>
      <article className="rounded-[20px] bg-forest p-6 text-white xl:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-lime">
              <History className="size-4" /> Nhật ký hệ thống
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold">
              Thao tác gần nhất
            </h2>
          </div>
          <ChevronRight className="size-5 text-white/35" />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {audit.slice(0, 4).map((entry) => (
            <div
              key={entry}
              className="rounded-xl border border-white/8 bg-white/6 px-4 py-3 text-[11px] text-white/58"
            >
              {entry}
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function AdminContent({
  tab,
  data,
}: {
  tab: AdminTab;
  data: AdminDashboardData;
}) {
  if (tab === "overview") return <OverviewPanel data={data} />;
  if (tab === "reviews") return <ReviewPanel data={data} />;
  if (tab === "fraud") return <FraudPanel data={data} />;
  if (tab === "users") return <UsersPanel data={data} />;
  return <SettingsPanel data={data} />;
}

export function AdminWorkspace({ data }: { data: AdminDashboardData }) {
  const [tab, setTab] = useQueryTab<AdminTab>(adminTabIds, "overview");
  const currentTab = adminTabCopy[tab];
  const CurrentTabIcon = currentTab.icon;
  const metrics = [
    {
      label: "Tổng cam kết",
      value: formatVnd(data.metrics.grossPledged, true),
      detail: "Từ tháng 4 đến nay",
      icon: CircleDollarSign,
      tone: "bg-[#eef4df] text-[#566c27]",
      tab: "overview" as const,
    },
    {
      label: "Doanh thu phí",
      value: formatVnd(data.metrics.platformRevenue, true),
      detail: "Phần phí đã ghi nhận",
      icon: BadgeDollarSign,
      tone: "bg-[#fff0e9] text-coral-dark",
      tab: "settings" as const,
    },
    {
      label: "Hồ sơ chờ duyệt",
      value: String(data.reviewQueue.length),
      detail: `${data.operations.reviewsDueToday} hồ sơ đến hạn hôm nay`,
      icon: FileCheck2,
      tone: "bg-blue-50 text-blue-700",
      tab: "reviews" as const,
    },
    {
      label: "Cảnh báo đang mở",
      value: String(data.metrics.openAlerts),
      detail: `${data.alerts.length} cảnh báo ưu tiên`,
      icon: ShieldAlert,
      tone: "bg-red-50 text-red-700",
      tab: "fraud" as const,
    },
    {
      label: "Người dùng demo",
      value: String(data.users.length),
      detail: "Có role và trạng thái đối chiếu",
      icon: UserRoundCog,
      tone: "bg-[#eeeef3] text-[#4c4f60]",
      tab: "users" as const,
    },
  ];

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-white/10 bg-[#1d2028] py-7 text-white sm:py-9">
        <div className="container-shell">
          <span className="eyebrow text-[#ffb3b7]">
            <CurrentTabIcon className="size-4" /> {currentTab.eyebrow}
          </span>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                {currentTab.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
                {currentTab.description}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-[9px] border border-white/15 bg-white/7 px-4 py-2 text-xs text-white/72">
              <span className="size-1.5 rounded-full bg-lime" /> Chốt dữ liệu {data.operations.snapshotAt}
            </span>
          </div>
        </div>
      </div>

      <div id="workspace-content" className="container-shell scroll-mt-28 pt-6">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#676a75]" role="status" aria-live="polite">
          <ShieldCheck className="size-3.5" /> Đang xem: {currentTab.title}
        </div>

        <div className="mt-3 min-w-0">
          {adminTabIds.map((panelTab) => (
            <section key={panelTab} hidden={tab !== panelTab}>
              <AdminContent tab={panelTab} data={data} />
            </section>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-[#9f2630]">Đi nhanh trong bàn kiểm soát</p>
              <h2 className="mt-1 font-display text-lg font-extrabold">
                Mỗi số liệu mở đúng khu vực xử lý
              </h2>
            </div>
            <span className="hidden text-[10px] text-ink-muted sm:block">
              Trạng thái lấy từ cùng read model
            </span>
          </div>
          <div className="grid overflow-hidden rounded-[16px] border border-line bg-white sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const active = tab === metric.tab;
              return (
                <button
                  key={metric.label}
                  type="button"
                  onClick={() => setTab(metric.tab)}
                  aria-current={active ? "page" : undefined}
                  className={`flex cursor-pointer items-center gap-4 border-b border-line p-4 text-left transition-colors last:border-b-0 hover:bg-[#f8f8f5] sm:border-r xl:border-b-0 xl:last:border-r-0 ${active ? "bg-[#f3f0f0] shadow-[inset_3px_0_0_#bd3038]" : "bg-white"}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-[9px] ${metric.tone}`}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-extrabold">{metric.value}</p>
                    <p className="mt-1 truncate text-xs text-ink-muted">{metric.label}</p>
                    <p className="mt-0.5 text-[9px] leading-4 text-ink-muted">{metric.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {tab === "overview" ? (
          <div className="mt-6">
            <RoleConnectionPanel
              role="ADMIN"
              eyebrow="Đường đi của một quyết định"
              title="Admin nhận dữ liệu gì và trả kết quả về đâu?"
              description="Hàng chờ gom hồ sơ, tín hiệu và mốc SLA để quản trị viên đọc nhanh hơn. AI chỉ xếp thứ tự kiểm tra; quyết định cuối vẫn cần người xử lý, lý do và nhật ký."
              recordCode={`OPS · ${data.operations.snapshotAt}`}
              steps={[
                {
                  actor: "Chủ dự án",
                  title: data.reviewQueue[0]
                    ? `Gửi hồ sơ bản v${data.reviewQueue[0].submissionVersion}`
                    : "Gửi hồ sơ kiểm duyệt",
                  detail: data.reviewQueue[0]
                    ? `${data.reviewQueue[0].title} · ${data.reviewQueue[0].documentCount} mục nội dung.`
                    : "Hồ sơ giữ campaign ID, phiên bản và tài liệu liên quan.",
                  kind: "campaign",
                  state: "done",
                },
                {
                  actor: "AI / Worker",
                  title: data.alerts[0]
                    ? `Đưa cảnh báo điểm ${data.alerts[0].riskScore} lên trước`
                    : "Sắp xếp tín hiệu cần xem",
                  detail: "Điểm số không tự khóa người dùng, chiến dịch hay khoản tiền.",
                  kind: "system",
                  state: "done",
                },
                {
                  actor: "Trần Khánh An · Admin",
                  title: `${data.operations.reviewsDueToday} hồ sơ đến hạn hôm nay`,
                  detail: "Đọc checklist và bằng chứng, sau đó chọn duyệt, yêu cầu sửa hoặc chuyển kiểm tra sâu.",
                  kind: "admin",
                  state: "current",
                },
                {
                  actor: "Creator + nhật ký hệ thống",
                  title: "Nhận trạng thái và lý do",
                  detail: "Kết quả quay lại đúng campaign; actor, thời gian và căn cứ được giữ để đối chiếu.",
                  kind: "person",
                  state: "next",
                },
              ]}
              action={{
                label: "Mở hàng chờ kiểm duyệt",
                href: "/admin?tab=reviews",
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
