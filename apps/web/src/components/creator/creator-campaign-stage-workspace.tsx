"use client";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FilePenLine,
  LoaderCircle,
  MapPin,
  PackageCheck,
  ReceiptText,
  Rocket,
  Truck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useQueryTab } from "@/hooks/use-query-tab";
import type {
  CampaignOperationsData,
  CampaignStatus,
  CreatorPortfolioCampaign,
} from "@/lib/api/contracts";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

type StageTab = "overview" | "review" | "fulfillment";
type FulfillmentStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";

const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  PENDING: "Chờ xử lý",
  PREPARING: "Đang chuẩn bị",
  SHIPPED: "Đã gửi",
  DELIVERED: "Đã giao",
};

function postOperation(action: string, payload: Record<string, unknown>) {
  return clientRequest<{ data: { auditId: string } }>(
    "/api/v1/creator/operations",
    {
      method: "POST",
      body: JSON.stringify({ action, payload }),
    },
  );
}

function DraftOrReviewWorkspace({
  campaign,
  operations,
}: {
  campaign: CreatorPortfolioCampaign;
  operations: CampaignOperationsData;
}) {
  const router = useRouter();
  const [tab, setTab] = useQueryTab<StageTab>(
    ["overview", "review"],
    "overview",
  );
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const isReviewing = status === "IN_REVIEW";
  const isReady = status === "PRE_LAUNCH";
  const isLaunched = status === "LIVE";
  const readiness = isReviewing || isReady || isLaunched ? 100 : 82;
  const editHref = `/creator/campaigns/new?campaign=${campaign.slug}`;
  const checklist = [
    ["Thông tin và mục tiêu", `${formatVnd(campaign.goalAmount, true)} · 30 ngày`, true],
    ["Câu chuyện và rủi ro", "Đã có bản nội dung để chỉnh tiếp", true],
    ["Gói ủng hộ", "2 gói chính · 2 phần bổ sung", true],
    ["Giao hàng và nhóm", `${operations.team.length} thành viên · giao toàn quốc`, true],
    [
      "Kiểm duyệt",
      isReady
        ? "Đã duyệt, có thể mở gọi vốn"
        : isLaunched
          ? "Đã duyệt và đã mở gọi vốn"
        : isReviewing
          ? "Bản gửi đang nằm trong hàng chờ"
          : "Chưa gửi hoặc đang chỉnh theo phản hồi",
      isReviewing || isReady || isLaunched,
    ],
  ] as const;

  const launch = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await postOperation("LAUNCH", { campaignId: campaign.id });
      setStatus("LIVE");
      setNotice({
        tone: "success",
        message: "Đã mở gọi vốn. Danh mục chiến dịch đang được cập nhật.",
      });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: clientRequestMessage(
          error,
          "Chưa thể mở gọi vốn. Bạn thử lại sau nhé.",
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-shell py-6 sm:py-8">
      <div
        className="flex gap-1 overflow-x-auto rounded-[14px] border border-line bg-white p-2"
        role="tablist"
        aria-label="Quản lý hồ sơ chiến dịch"
      >
        {[
          { id: "overview" as const, label: "Tổng quan hồ sơ", icon: ClipboardCheck },
          { id: "review" as const, label: "Tiến độ xét duyệt", icon: BadgeCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold ${tab === item.id ? "bg-forest text-white" : "text-ink-soft hover:bg-forest/5"}`}
            >
              <Icon className={`size-4 ${tab === item.id ? "text-lime" : "text-ink-muted"}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {notice.tone === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}
          {notice.message}
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <article className="rounded-[20px] border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="eyebrow text-[#587024]">
                  <FilePenLine className="size-4" /> Hồ sơ đang chuẩn bị
                </p>
                <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.035em]">
                  Hoàn thiện từng phần, không trộn với ORBIT One
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                  Đây là dữ liệu riêng của {campaign.title}. Thành viên, gói quà,
                  lượt xét duyệt và cam kết sau này đều dùng mã {campaign.id}.
                </p>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[14px] bg-[#f2f4eb] p-4">
                <p className="text-xs text-ink-muted">Mục tiêu dự kiến</p>
                <p className="mt-2 font-display text-xl font-extrabold tabular-nums">
                  {formatVnd(campaign.goalAmount, true)}
                </p>
              </div>
              <div className="rounded-[14px] bg-[#f2f4eb] p-4">
                <p className="text-xs text-ink-muted">Nhóm hiện tại</p>
                <p className="mt-2 font-display text-xl font-extrabold tabular-nums">
                  {campaign.teamSize} người
                </p>
              </div>
              <div className="rounded-[14px] bg-[#f2f4eb] p-4">
                <p className="text-xs text-ink-muted">Cam kết</p>
                <p className="mt-2 font-display text-xl font-extrabold tabular-nums">0</p>
                <p className="mt-1 text-[10px] text-ink-muted">Chưa mở gọi vốn</p>
              </div>
            </div>

            <div className="mt-7 space-y-1">
              {checklist.map(([label, detail, done], index) => (
                <div
                  key={label}
                  className="grid gap-3 border-b border-line py-4 last:border-b-0 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className={`grid size-9 place-items-center rounded-full ${done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {done ? <Check className="size-4" /> : index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">{detail}</p>
                  </div>
                  <span className="text-[10px] font-bold text-ink-muted">
                    {done ? "Đã có dữ liệu" : "Cần xử lý"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {isReady ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void launch()}
                  className="button-dark"
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Rocket className="size-4" />
                  )}
                  Mở gọi vốn
                </button>
              ) : isLaunched ? (
                <Link href="/creator" className="button-dark">
                  <Rocket className="size-4" /> Xem danh mục đang gọi vốn
                </Link>
              ) : (
                <Link href={editHref} className="button-dark">
                  <FilePenLine className="size-4" />
                  {isReviewing ? "Xem bản đã gửi" : "Tiếp tục chỉnh sửa"}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setTab("review")}
                className="button-secondary"
              >
                Xem luồng xét duyệt <ArrowRight className="size-4" />
              </button>
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-[20px] bg-forest p-6 text-white">
              <p className="eyebrow text-lime">Độ sẵn sàng hồ sơ</p>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-5xl font-extrabold text-lime">
                  {readiness}
                </span>
                <span className="pb-1 text-sm text-white/45">/100</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-lime"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              <p className="mt-4 text-xs leading-6 text-white/58">
                Điểm này kiểm tra độ đầy đủ của hồ sơ, không phải xác suất gọi
                vốn thành công.
              </p>
            </div>
            <div className="rounded-[20px] border border-line bg-white p-5">
              <p className="text-xs font-bold text-ink-muted">Việc kế tiếp</p>
              <p className="mt-2 font-display text-lg font-extrabold">
                {campaign.nextActionLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-ink-soft">
                {campaign.nextActionDetail}
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <section className="mt-5 overflow-hidden rounded-[20px] border border-line bg-white">
          <div className="border-b border-line bg-[#f4f5ef] p-5 sm:p-7">
            <p className="eyebrow text-[#587024]">
              <BadgeCheck className="size-4" /> Luồng duyệt có người quyết định
            </p>
            <h2 className="mt-3 font-display text-2xl font-extrabold">
              Hồ sơ đi qua bốn mốc rõ ràng
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              Hệ thống chỉ ghi nhận trạng thái và bằng chứng. Quản trị viên vẫn
              đọc hồ sơ trước khi duyệt, yêu cầu sửa hoặc từ chối.
            </p>
          </div>
          <ol className="grid md:grid-cols-4">
            {[
              ["1", "Lưu bản nháp", "Chủ dự án chỉnh nội dung và quà tặng.", true],
              ["2", "Gửi xét duyệt", "Tạo một phiên bản hồ sơ trong hàng chờ.", isReviewing || isReady],
              ["3", "Admin phản hồi", "Lý do và người xử lý được lưu cùng quyết định.", isReady],
              ["4", "Mở gọi vốn", "Chỉ mở sau khi hồ sơ đã được duyệt.", isLaunched],
            ].map(([step, label, detail, done], index) => (
              <li
                key={String(step)}
                className="border-b border-line p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <span className={`grid size-9 place-items-center rounded-full text-xs font-extrabold ${done ? "bg-emerald-100 text-emerald-800" : "bg-[#eceee7] text-ink-muted"}`}>
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <p className="mt-4 text-sm font-extrabold">{label}</p>
                <p className="mt-2 text-xs leading-5 text-ink-muted">{detail}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function SuccessfulWorkspace({
  campaign,
  operations,
}: {
  campaign: CreatorPortfolioCampaign;
  operations: CampaignOperationsData;
}) {
  const [tab, setTab] = useQueryTab<StageTab>(
    ["overview", "fulfillment"],
    "overview",
  );
  const [orders, setOrders] = useState(
    operations.fulfillment.previousCampaign.orders,
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const addressPercent = Math.round(
    (operations.fulfillment.currentCampaign.addressReadyCount /
      campaign.backerCount) *
      100,
  );
  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(fulfillmentLabels) as FulfillmentStatus[]).map((status) => [
          status,
          orders.filter((order) => order.status === status).length,
        ]),
      ) as Record<FulfillmentStatus, number>,
    [orders],
  );
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  const updateOrder = async (orderId: string, status: FulfillmentStatus) => {
    setBusy(orderId);
    setNotice(null);
    try {
      await postOperation("UPDATE_FULFILLMENT", {
        campaignId: campaign.id,
        orderId,
        status,
      });
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status } : order,
        ),
      );
      setNotice({
        tone: "success",
        message: `Đã cập nhật ${orderId} thành “${fulfillmentLabels[status]}”.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: clientRequestMessage(
          error,
          "Chưa thể cập nhật đơn. Bạn thử lại sau nhé.",
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const exportOrders = () => {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [
      ["Mã đơn", "Người ủng hộ", "Gói quà", "Thành phố", "Trạng thái"],
      ...orders.map((order) => [
        order.id,
        order.backer,
        order.reward,
        order.city,
        fulfillmentLabels[order.status],
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${campaign.slug}-giao-hang.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setNotice({ tone: "success", message: "Đã tải danh sách giao hàng mẫu." });
  };

  return (
    <div className="container-shell py-6 sm:py-8">
      <div
        className="flex gap-1 overflow-x-auto rounded-[14px] border border-line bg-white p-2"
        role="tablist"
        aria-label="Theo dõi chiến dịch đã thành công"
      >
        {[
          { id: "overview" as const, label: "Tổng kết gọi vốn", icon: Banknote },
          { id: "fulfillment" as const, label: "Giao quà & đối soát", icon: Truck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold ${tab === item.id ? "bg-forest text-white" : "text-ink-soft hover:bg-forest/5"}`}
            >
              <Icon className={`size-4 ${tab === item.id ? "text-lime" : "text-ink-muted"}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {notice.tone === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}
          {notice.message}
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="mt-5 space-y-5">
          <section className="overflow-hidden rounded-[22px] bg-[#102a22] text-white">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status="SUCCESSFUL" />
                  <span className="text-xs font-bold text-white/48">
                    Chốt ngày 18/05/2026
                  </span>
                </div>
                <h2 className="mt-5 max-w-2xl font-display text-3xl font-extrabold tracking-[-0.04em]">
                  Vượt mục tiêu, chuyển sang trách nhiệm giao quà
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                  Tiền chỉ được thu sau khi chiến dịch đạt mục tiêu. Từ mốc này,
                  mỗi cam kết hợp lệ được nối với tối đa một hồ sơ giao nhận.
                </p>
                <div className="mt-7">
                  <div className="flex items-end justify-between gap-3">
                    <span className="font-display text-3xl font-extrabold text-lime">
                      {formatVnd(campaign.pledgedAmount)}
                    </span>
                    <span className="text-xs font-bold text-white/64">
                      {percent}% mục tiêu
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full w-full rounded-full bg-lime" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-white/10 bg-white/[0.04] lg:border-l lg:border-t-0">
                {[
                  ["Mục tiêu", formatVnd(campaign.goalAmount, true)],
                  ["Người ủng hộ", formatNumber(campaign.backerCount)],
                  ["Đã thu", formatVnd(campaign.pledgedAmount, true)],
                  ["Chờ địa chỉ", formatNumber(operations.fulfillment.currentCampaign.surveyPendingCount)],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-r border-white/10 p-5 last:border-b-0">
                    <p className="text-[10px] text-white/42">{label}</p>
                    <p className="mt-2 font-display text-lg font-extrabold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow text-[#587024]">
                  <PackageCheck className="size-4" /> Bốn mốc sau gọi vốn
                </p>
                <h2 className="mt-3 font-display text-2xl font-extrabold">
                  Cùng một dữ liệu, không nhập lại đơn bằng tay
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTab("fulfillment")}
                className="button-secondary"
              >
                Mở danh sách giao quà <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                ["01", "Đạt mục tiêu", `${percent}% · đã chốt`],
                ["02", "Thu tiền", `${formatNumber(campaign.backerCount)} cam kết`],
                ["03", "Xác nhận địa chỉ", `${addressPercent}% đã đủ`],
                ["04", "Giao quà", "Theo dõi từng đơn"],
              ].map(([step, label, detail]) => (
                <div key={step} className="border-l-2 border-[#cbdc72] bg-[#f5f6f0] p-4">
                  <p className="text-[10px] font-extrabold text-[#71813a]">{step}</p>
                  <p className="mt-3 text-sm font-extrabold">{label}</p>
                  <p className="mt-1 text-xs text-ink-muted">{detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section id="orbit-drip-fulfillment" className="mt-5 scroll-mt-28 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Tổng đơn", value: formatNumber(campaign.backerCount), icon: UsersRound },
              { label: "Đủ địa chỉ", value: formatNumber(operations.fulfillment.currentCampaign.addressReadyCount), icon: ClipboardCheck },
              { label: "Chờ phản hồi", value: formatNumber(operations.fulfillment.currentCampaign.surveyPendingCount), icon: AlertCircle },
              { label: "Đã giao trong mẫu", value: String(statusCounts.DELIVERED), icon: CheckCircle2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-[16px] border border-line bg-white p-4">
                <Icon className="size-4 text-[#687b31]" />
                <p className="mt-4 font-display text-2xl font-extrabold tabular-nums">{value}</p>
                <p className="mt-1 text-xs text-ink-muted">{label}</p>
              </div>
            ))}
          </div>

          <article className="overflow-hidden rounded-[20px] border border-line bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-end sm:p-6">
              <div>
                <p className="eyebrow text-[#587024]">
                  <Truck className="size-4" /> Danh sách đối soát
                </p>
                <h2 className="mt-3 font-display text-2xl font-extrabold">
                  4 đơn đại diện trong bản demo
                </h2>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Bản thật sẽ phân trang đủ {formatNumber(campaign.backerCount)} đơn và đọc từ fulfillment repository.
                </p>
              </div>
              <button type="button" onClick={exportOrders} className="button-secondary">
                <Download className="size-4" /> Xuất CSV mẫu
              </button>
            </div>
            <div className="divide-y divide-line md:hidden">
              {orders.map((order) => (
                <section key={order.id} className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                        Mã đơn
                      </p>
                      <p className="mt-1 text-sm font-extrabold">{order.id}</p>
                    </div>
                    <span className="rounded-full bg-[#f1f4e7] px-3 py-1 text-[10px] font-extrabold text-[#587024]">
                      {order.city}
                    </span>
                  </div>

                  <dl className="grid gap-3 rounded-[14px] bg-[#f7f7f3] p-4 text-xs">
                    <div className="grid grid-cols-[88px_1fr] gap-3">
                      <dt className="text-ink-muted">Người nhận</dt>
                      <dd className="font-bold text-ink">{order.backer}</dd>
                    </div>
                    <div className="grid grid-cols-[88px_1fr] gap-3">
                      <dt className="text-ink-muted">Gói quà</dt>
                      <dd className="leading-5 text-ink-soft">{order.reward}</dd>
                    </div>
                  </dl>

                  <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    Trạng thái giao quà
                    <span className="relative mt-2 block">
                      <select
                        name={`fulfillment-card-status-${order.id}`}
                        value={order.status}
                        disabled={busy === order.id}
                        onChange={(event) =>
                          void updateOrder(
                            order.id,
                            event.target.value as FulfillmentStatus,
                          )
                        }
                        className="h-12 w-full rounded-[12px] border border-line bg-white px-3 pr-10 text-sm font-bold normal-case tracking-normal text-ink outline-none focus:border-forest"
                      >
                        {(Object.keys(fulfillmentLabels) as FulfillmentStatus[]).map(
                          (status) => (
                            <option key={status} value={status}>
                              {fulfillmentLabels[status]}
                            </option>
                          ),
                        )}
                      </select>
                      {busy === order.id ? (
                        <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink" />
                      ) : null}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className="button-secondary w-full min-h-11 px-4 text-xs"
                  >
                    <Eye className="size-4" /> Xem chi tiết đơn
                  </button>
                </section>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[940px] w-full text-left text-xs">
                <thead className="bg-[#f4f5ef] text-[10px] text-ink-muted">
                  <tr>
                    <th className="px-5 py-3 font-bold">Mã đơn</th>
                    <th className="px-5 py-3 font-bold">Người ủng hộ</th>
                    <th className="px-5 py-3 font-bold">Gói quà</th>
                    <th className="px-5 py-3 font-bold">Thành phố</th>
                    <th className="px-5 py-3 font-bold">Trạng thái</th>
                    <th className="px-5 py-3 font-bold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-line">
                      <td className="px-5 py-4 font-extrabold">{order.id}</td>
                      <td className="px-5 py-4">{order.backer}</td>
                      <td className="px-5 py-4 text-ink-soft">{order.reward}</td>
                      <td className="px-5 py-4 text-ink-soft">{order.city}</td>
                      <td className="px-5 py-3">
                        <span className="relative block min-w-40">
                          <select
                            name={`fulfillment-table-status-${order.id}`}
                            value={order.status}
                            disabled={busy === order.id}
                            onChange={(event) =>
                              void updateOrder(
                                order.id,
                                event.target.value as FulfillmentStatus,
                              )
                            }
                            aria-label={`Trạng thái ${order.id}`}
                            className="h-11 w-full rounded-[10px] border border-line bg-white px-3 pr-9 text-xs font-bold outline-none focus:border-forest"
                          >
                            {(Object.keys(fulfillmentLabels) as FulfillmentStatus[]).map(
                              (status) => (
                                <option key={status} value={status}>
                                  {fulfillmentLabels[status]}
                                </option>
                              ),
                            )}
                          </select>
                          {busy === order.id ? (
                            <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
                          ) : null}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 font-bold text-ink-soft hover:border-coral/30 hover:text-coral-dark"
                        >
                          <Eye className="size-4" /> Mở
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}
      <Modal
        open={Boolean(selectedOrder)}
        title={selectedOrder ? `Chi tiết ${selectedOrder.id}` : "Chi tiết đơn giao quà"}
        description="Thông tin này được ghép từ cam kết, thanh toán đã thu và hồ sơ giao nhận của cùng một chiến dịch."
        onClose={() => setSelectedOrderId(null)}
        locked={Boolean(selectedOrder && busy === selectedOrder.id)}
      >
        {selectedOrder ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] bg-[#f4f5ef] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Người nhận</p>
                <p className="mt-2 text-sm font-extrabold">{selectedOrder.backer}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                  <MapPin className="size-3.5" /> {selectedOrder.city}
                </p>
              </div>
              <div className="rounded-[16px] bg-[#f4f5ef] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Giá trị đã thu</p>
                <p className="mt-2 text-sm font-extrabold">{formatVnd(selectedOrder.amount)}</p>
                <p className="mt-1 text-xs text-ink-muted">{selectedOrder.reward}</p>
              </div>
            </div>

            <div className="rounded-[16px] border border-line p-4">
              <p className="flex items-center gap-2 text-xs font-extrabold text-ink">
                <ReceiptText className="size-4 text-[#687b31]" /> Chuỗi liên kết dữ liệu
              </p>
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-ink-muted">Chiến dịch</dt>
                  <dd className="mt-1 break-all font-bold">{selectedOrder.campaignId}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Mã cam kết</dt>
                  <dd className="mt-1 font-bold">{selectedOrder.pledgeReference}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Fulfillment</dt>
                  <dd className="mt-1 break-all font-bold">{selectedOrder.fulfillmentId}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Vận chuyển</dt>
                  <dd className="mt-1 font-bold">
                    {selectedOrder.carrier
                      ? `${selectedOrder.carrier} · ${selectedOrder.trackingCode}`
                      : "Chưa bàn giao đơn vị vận chuyển"}
                  </dd>
                </div>
              </dl>
            </div>

            <label className="block text-xs font-bold text-ink-soft">
              Cập nhật trạng thái giao quà
              <span className="relative mt-2 block">
                <select
                  name={`fulfillment-detail-status-${selectedOrder.id}`}
                  value={selectedOrder.status}
                  disabled={busy === selectedOrder.id}
                  onChange={(event) =>
                    void updateOrder(
                      selectedOrder.id,
                      event.target.value as FulfillmentStatus,
                    )
                  }
                  className="input-field pr-10 font-bold"
                >
                  {(Object.keys(fulfillmentLabels) as FulfillmentStatus[]).map(
                    (status) => (
                      <option key={status} value={status}>
                        {fulfillmentLabels[status]}
                      </option>
                    ),
                  )}
                </select>
                {busy === selectedOrder.id ? (
                  <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
                ) : null}
              </span>
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export function CreatorCampaignStageWorkspace({
  campaign,
  operations,
}: {
  campaign: CreatorPortfolioCampaign;
  operations: CampaignOperationsData;
}) {
  if (campaign.status === "SUCCESSFUL") {
    return <SuccessfulWorkspace campaign={campaign} operations={operations} />;
  }
  return <DraftOrReviewWorkspace campaign={campaign} operations={operations} />;
}
