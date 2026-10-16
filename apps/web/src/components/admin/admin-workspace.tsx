"use client";

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
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserRoundCog,
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
  const [users, setUsers] = useState(data.users);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    if (!keyword) return users;
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.location} ${user.roles.join(" ")} ${user.status}`
        .toLocaleLowerCase("vi")
        .includes(keyword),
    );
  }, [query, users]);
  const pendingUser = users.find((user) => user.id === pendingUserId) ?? null;

  const toggle = async (id: string, current: string) => {
    const status = current === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setBusy(id);
    setNotice(null);
    try {
      await callAdminAction("SET_USER_STATUS", {
        userId: id,
        status,
        reason: "Cập nhật từ bảng quản trị",
      });
      setUsers((rows) =>
        rows.map((user) => (user.id === id ? { ...user, status } : user)),
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
      {notice ? (
        <AdminNotice message={notice} className="mt-4" />
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-[#f3f3ed] text-[10px] uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-5 py-4">Người dùng</th>
              <th className="px-5 py-4">Vai trò</th>
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
                    <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-[#eef0f3] font-display text-[10px] font-extrabold text-[#343741]">
                      {user.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">{user.name}</span>
                      <span className="mt-0.5 block truncate text-[9px] text-ink-muted">
                        {user.email}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-ink-soft">
                  {user.roles.join(" · ")}
                  <span className="mt-1 block text-[9px] text-ink-muted">
                    {user.location}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-bold ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : user.status === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {user.status === "ACTIVE"
                      ? "Đang hoạt động"
                      : user.status === "SUSPENDED"
                        ? "Đã khóa"
                        : "Đang xem xét"}
                  </span>
                </td>
                <td className="px-5 py-4 text-ink-muted">{user.lastSeen}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    disabled={busy === user.id}
                    onClick={() => setPendingUserId(user.id)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3 font-bold text-ink-soft hover:border-coral/30 hover:text-coral-dark"
                  >
                    {user.status === "SUSPENDED" ? (
                      <ShieldCheck className="size-3.5" />
                    ) : (
                      <Ban className="size-3.5" />
                    )}
                    {user.status === "SUSPENDED" ? "Mở khóa" : "Khóa"}
                  </button>
                </td>
              </tr>
            ))}
            {!filteredUsers.length ? (
              <tr>
                <td
                  colSpan={5}
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
        <InlineActionConfirm
          title={`${pendingUser.status === "SUSPENDED" ? "Mở khóa" : "Khóa"} tài khoản ${pendingUser.name}?`}
          detail={
            pendingUser.status === "SUSPENDED"
              ? "Người dùng sẽ đăng nhập và dùng lại các quyền đang có."
              : "Người dùng sẽ bị dừng đăng nhập; dữ liệu chiến dịch và cam kết vẫn được giữ để đối soát."
          }
          confirmLabel={pendingUser.status === "SUSPENDED" ? "Xác nhận mở khóa" : "Xác nhận khóa"}
          danger={pendingUser.status !== "SUSPENDED"}
          busy={busy === pendingUser.id}
          onConfirm={() => void toggle(pendingUser.id, pendingUser.status)}
          onCancel={() => setPendingUserId(null)}
        />
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
