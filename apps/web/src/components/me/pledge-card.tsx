"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  MapPin,
  Package,
  Pencil,
  Receipt,
  Truck,
  XCircle,
} from "lucide-react";
import type { MyPledge } from "@/server/queries/me";
import { cancelMyPledgeAction } from "@/server/actions/me";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { FundingBar } from "@/components/ui/funding-bar";
import { Badge, Card, PledgeStatusBadge, ProjectStatusBadge } from "@/components/ui/primitives";
import { SafeImage } from "./safe-media";
import { SHIPMENT_STATUS } from "@/lib/status";
import { cn, formatDate, formatVnd, percentOf, timeLeft } from "@/lib/utils";

const TX_KIND_LABEL: Record<string, string> = {
  AUTHORIZE: "Giữ chỗ",
  CAPTURE: "Thu tiền",
  VOID: "Giải phóng",
  REFUND: "Hoàn tiền",
};

type StepState = "done" | "active" | "error" | "muted";

function buildTimeline(p: MyPledge): { label: string; sub: string; state: StepState }[] {
  const step1: { label: string; sub: string; state: StepState } = {
    label: "Giữ chỗ",
    sub: formatDate(p.created_at),
    state: "done",
  };

  let step2: { label: string; sub: string; state: StepState };
  if (p.status === "CANCELLED") {
    step2 = { label: "Đã huỷ", sub: formatDate(p.cancelled_at), state: "muted" };
  } else if (p.status === "VOIDED") {
    step2 = { label: "Không đạt mục tiêu", sub: formatDate(p.voided_at ?? p.ended_at), state: "muted" };
  } else if (p.status === "CAPTURED" || p.status === "REFUNDED") {
    step2 = { label: "Đạt mục tiêu", sub: formatDate(p.captured_at ?? p.ended_at), state: "done" };
  } else if (p.status === "CAPTURE_FAILED") {
    step2 = { label: "Đạt mục tiêu", sub: "Chờ thu lại", state: "error" };
  } else {
    step2 = { label: "Chờ kết thúc", sub: timeLeft(p.end_at).label, state: "active" };
  }

  let step3: { label: string; sub: string; state: StepState };
  if (p.status === "CAPTURED") {
    step3 = { label: "Đã thanh toán", sub: formatDate(p.captured_at), state: "done" };
  } else if (p.status === "CAPTURE_FAILED") {
    step3 = { label: "Trừ tiền lỗi", sub: "Cần đổi thẻ", state: "error" };
  } else if (p.status === "REFUNDED") {
    step3 = { label: "Đã hoàn tiền", sub: "Hoàn tất", state: "muted" };
  } else if (p.status === "VOIDED" || p.status === "CANCELLED") {
    step3 = { label: "Không trừ tiền", sub: "Đã giải phóng", state: "muted" };
  } else {
    step3 = { label: "Thanh toán", sub: "Chưa trừ tiền", state: "muted" };
  }

  let step4: { label: string; sub: string; state: StepState };
  if (p.status === "VOIDED" || p.status === "CANCELLED" || p.status === "REFUNDED") {
    step4 = { label: "Nhận quà", sub: "Không áp dụng", state: "muted" };
  } else if (!p.ships_physical) {
    step4 = {
      label: "Quà số",
      sub: p.status === "CAPTURED" ? "Qua email / tài khoản" : "Khi dự án thành công",
      state: p.status === "CAPTURED" ? "done" : "muted",
    };
  } else if (p.ship_status === "DELIVERED") {
    step4 = { label: "Đã giao quà", sub: formatDate(p.delivered_at), state: "done" };
  } else if (p.ship_status === "SHIPPED") {
    step4 = { label: "Đang giao", sub: p.carrier ?? "Đang vận chuyển", state: "active" };
  } else if (p.ship_status === "PREPARING") {
    step4 = { label: "Chuẩn bị quà", sub: "Đang đóng gói", state: "active" };
  } else {
    step4 = { label: "Giao quà", sub: p.estimated_delivery ? `Dự kiến ${p.estimated_delivery}` : "Chờ giao", state: "muted" };
  }

  return [step1, step2, step3, step4];
}

export function PledgeCard({ p }: { p: MyPledge }) {
  const pct = percentOf(p.p_pledged, p.goal_amount);
  const steps = buildTimeline(p);
  const shipMeta = p.ship_status ? SHIPMENT_STATUS[p.ship_status] : null;

  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <Link
            href={`/p/${p.slug}`}
            className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2 sm:h-20 sm:w-28"
          >
            {p.cover_url && <SafeImage src={p.cover_url} alt={p.title} fill sizes="112px" className="object-cover" />}
          </Link>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <ProjectStatusBadge status={p.p_status} />
              <PledgeStatusBadge status={p.status} />
              {p.is_anonymous === 1 && <Badge tone="slate">Ẩn danh</Badge>}
            </div>
            <Link
              href={`/p/${p.slug}`}
              className="line-clamp-2 block text-base font-bold leading-snug hover:text-violet-600 dark:hover:text-violet-400"
            >
              {p.title}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>
                Creator:{" "}
                <Link href={`/u/${p.creator_username}`} className="font-medium text-fg hover:underline">
                  {p.creator_name}
                </Link>
              </span>
              <span className="font-mono text-[11px]">{p.code}</span>
              <span suppressHydrationWarning>Góp ngày {formatDate(p.created_at, true)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-baseline justify-between gap-2 rounded-2xl bg-surface-2 px-3.5 py-2.5 sm:flex-col sm:items-end sm:text-right">
          <span className="text-xs font-medium text-muted">Tổng góp vốn</span>
          <span className="text-lg font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatVnd(p.total_amount)}
          </span>
          {p.card_brand && p.card_last4 && (
            <span className="hidden items-center gap-1 text-[11px] text-muted sm:inline-flex">
              <CreditCard className="size-3" /> {p.card_brand} •••• {p.card_last4}
            </span>
          )}
        </div>
      </div>

      {/* Live progress bar */}
      {p.p_status === "LIVE" && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2/50 p-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold">
              Tiến độ dự án: <span className="text-emerald-600 dark:text-emerald-400">{pct}%</span> ({formatVnd(p.p_pledged)} /{" "}
              {formatVnd(p.goal_amount)})
            </span>
            <span className="text-muted" suppressHydrationWarning>
              {timeLeft(p.end_at).label}
            </span>
          </div>
          <FundingBar percent={pct} size="sm" />
        </div>
      )}

      {/* 4-step horizontal timeline */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((s, idx) => (
          <div
            key={s.label}
            className={cn(
              "relative rounded-xl border px-3 py-2 text-xs",
              s.state === "done" && "border-emerald-500/25 bg-emerald-500/5",
              s.state === "active" && "border-violet-500/35 bg-violet-500/8",
              s.state === "error" && "border-rose-500/35 bg-rose-500/8",
              s.state === "muted" && "border-line bg-surface-2/40 opacity-80",
            )}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  s.state === "done" && "bg-emerald-500 text-white",
                  s.state === "active" && "bg-violet-600 text-white",
                  s.state === "error" && "bg-rose-500 text-white",
                  s.state === "muted" && "bg-zinc-400/30 text-muted",
                )}
              >
                {s.state === "done" ? <Check className="size-2.5" /> : s.state === "error" ? <XCircle className="size-2.5" /> : idx + 1}
              </span>
              <span className="truncate">{s.label}</span>
            </div>
            <div className="mt-0.5 truncate pl-5 text-[11px] text-muted" suppressHydrationWarning>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown & shipping details */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-fg">
            <Package className="size-3.5 text-violet-500" /> Chi tiết phần quà
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">{p.tier_title ?? "Góp vốn không nhận quà"}</span>
            <span className="font-semibold">{formatVnd(p.reward_amount)}</span>
          </div>
          {p.addOns.map((a) => (
            <div key={a.title} className="flex justify-between gap-2">
              <span className="text-muted">
                + {a.title} ×{a.quantity}
              </span>
              <span className="font-semibold">{formatVnd(a.unit_price * a.quantity)}</span>
            </div>
          ))}
          {p.bonus_amount > 0 && (
            <div className="flex justify-between gap-2">
              <span className="text-muted">Ủng hộ thêm</span>
              <span className="font-semibold">{formatVnd(p.bonus_amount)}</span>
            </div>
          )}
          {p.shipping_amount > 0 && (
            <div className="flex justify-between gap-2">
              <span className="text-muted">Phí vận chuyển</span>
              <span className="font-semibold">{formatVnd(p.shipping_amount)}</span>
            </div>
          )}
          {p.estimated_delivery && (
            <div className="pt-1 text-[11px] text-muted">Dự kiến giao: {p.estimated_delivery}</div>
          )}
          {p.note && <div className="rounded-lg bg-surface px-2 py-1 text-[11px] italic text-muted">Ghi chú: “{p.note}”</div>}
        </div>

        <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs space-y-2">
          {shipMeta ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold text-fg">
                  <Truck className="size-3.5 text-sky-500" /> Vận chuyển quà
                </span>
                <Badge tone={shipMeta.tone} dot>
                  {shipMeta.label}
                </Badge>
              </div>
              {p.tracking_code && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5">
                  <span className="text-muted">{p.carrier ?? "Đơn vị VC"}:</span>
                  <code className="font-mono font-bold text-fg">{p.tracking_code}</code>
                </div>
              )}
              {(p.shipped_at || p.delivered_at) && (
                <div className="text-[11px] text-muted" suppressHydrationWarning>
                  {p.shipped_at && <span>Gửi ngày {formatDate(p.shipped_at)}</span>}
                  {p.shipped_at && p.delivered_at && " · "}
                  {p.delivered_at && <span>Giao ngày {formatDate(p.delivered_at)}</span>}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 font-bold text-fg">
              <MapPin className="size-3.5 text-emerald-500" /> Thông tin giao nhận
            </div>
          )}

          {p.ship_address ? (
            <div className="text-muted leading-relaxed">
              <span className="font-semibold text-fg">{p.ship_recipient}</span>
              <br />
              {p.ship_address}
              {p.ship_province ? `, ${p.ship_province}` : ""}
            </div>
          ) : (
            <div className="text-muted">Gói quà số / không yêu cầu địa chỉ giao hàng vật lý.</div>
          )}
        </div>
      </div>

      {/* Transaction accordion & Actions */}
      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-start sm:justify-between">
        <details className="group flex-1 text-xs">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold text-muted transition hover:text-fg">
            <Receipt className="size-3.5" />
            Lịch sử giao dịch ({p.transactions.length})
            <ChevronDown className="size-3.5 transition group-open:rotate-180" />
          </summary>
          <div className="mt-2.5 space-y-1.5 rounded-xl border border-line bg-surface-2/40 p-2.5">
            {p.transactions.map((tx) => (
              <div key={tx.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-1.5 last:border-0 last:pb-0">
                <div>
                  <span className="font-semibold text-fg">{TX_KIND_LABEL[tx.kind] ?? tx.kind}</span>
                  <span className="ml-2 text-muted">{tx.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">{formatVnd(tx.amount)}</span>
                  <Badge tone={tx.status === "SUCCEEDED" ? "emerald" : "rose"}>
                    {tx.status === "SUCCEEDED" ? "Thành công" : "Thất bại"}
                  </Badge>
                  <span className="text-[11px] text-muted" suppressHydrationWarning>
                    {formatDate(tx.created_at, true)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ButtonLink href={`/p/${p.slug}`} variant="ghost" size="xs">
            <ExternalLink className="size-3.5" /> Xem dự án
          </ButtonLink>
          {p.changeable && (
            <>
              <ButtonLink href={`/p/${p.slug}/back?change=1`} variant="outline" size="sm">
                <Pencil className="size-3.5" /> Đổi pledge
              </ButtonLink>
              <ActionForm
                action={cancelMyPledgeAction}
                confirm={`Bạn chắc chắn muốn huỷ pledge ${p.code} cho "${p.title}"? Khoản giữ chỗ sẽ được giải phóng ngay.`}
              >
                <input type="hidden" name="pledgeId" value={p.id} />
                <SubmitButton variant="danger" size="sm" pendingText="Đang huỷ…">
                  Huỷ pledge
                </SubmitButton>
              </ActionForm>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
