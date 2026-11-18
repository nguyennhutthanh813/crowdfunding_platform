import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getPledgeByCode, pledgeAddOnLines } from "@/server/queries/public";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout-bits";
import { Badge, Divider, PledgeStatusBadge } from "@/components/ui/primitives";
import { SuccessCelebration } from "@/components/public/success-celebration";
import { formatDate, formatVnd, percentOf } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Góp vốn thành công",
};

export default async function PledgeSuccessPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" ? sp.code.trim() : "";

  const viewer = await requireViewer(`/p/${slug}/back/success${code ? `?code=${encodeURIComponent(code)}` : ""}`);
  if (!code) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        <EmptyState
          title="Chưa có mã góp vốn"
          description="Bạn có thể kiểm tra toàn bộ lịch sử góp vốn tại mục Của tôi."
          action={<ButtonLink href="/me/backed">Xem lịch sử góp vốn</ButtonLink>}
        />
      </div>
    );
  }

  const pledge = getPledgeByCode(code, viewer.id);
  if (!pledge || pledge.slug !== slug) notFound();

  const addOnLines = pledgeAddOnLines(pledge.id);
  const pct = percentOf(pledge.pledged_amount, pledge.goal_amount);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <SuccessCelebration />

      {/* Thẻ chúc mừng */}
      <div className="card relative overflow-hidden p-6 text-center sm:p-8">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-col items-center">
          <Image
            src="/v3/brand/success.webp"
            alt="Góp vốn thành công"
            width={150}
            height={150}
            priority
            className="animate-float rounded-3xl"
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="violet">Mã {pledge.code}</Badge>
            <PledgeStatusBadge status={pledge.status} />
            {pledge.is_anonymous === 1 && <Badge tone="slate">Ẩn danh</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Góp vốn thành công!
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted sm:text-base">
            Cảm ơn bạn đã ủng hộ{" "}
            <Link href={`/p/${pledge.slug}`} className="font-bold text-fg hover:underline">
              {pledge.title}
            </Link>
            . Khoản <b className="text-emerald-600 dark:text-emerald-400">{formatVnd(pledge.total_amount)}</b> đã được giữ chỗ an toàn (chưa trừ tiền hôm nay).
          </p>

          <div className="mt-6 flex w-full flex-wrap justify-center gap-3">
            <ButtonLink href="/me/backed" size="md">
              <Wallet className="size-4" /> Xem tại Của tôi
            </ButtonLink>
            <ButtonLink href={`/p/${pledge.slug}`} variant="outline" size="md">
              <ArrowLeft className="size-4" /> Quay lại dự án
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Chi tiết khoản góp vốn */}
      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Chi tiết giữ chỗ</h2>
          <span className="text-xs text-muted">Tạo lúc {formatDate(pledge.created_at, true)}</span>
        </div>

        <dl className="space-y-2.5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted">Mức quà</dt>
            <dd className="text-right font-semibold">
              {pledge.tier_title ? `${pledge.tier_title} (${formatVnd(pledge.reward_amount)})` : "Góp không nhận quà"}
            </dd>
          </div>

          {pledge.bonus_amount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{pledge.tier_title ? "Ủng hộ thêm" : "Số tiền ủng hộ"}</dt>
              <dd className="font-semibold tabular-nums">{formatVnd(pledge.bonus_amount)}</dd>
            </div>
          )}

          {addOnLines.map((a) => (
            <div key={a.title} className="flex items-center justify-between gap-3">
              <dt className="text-muted">
                Add-on: {a.quantity} × {a.title}
              </dt>
              <dd className="font-semibold tabular-nums">{formatVnd(a.unit_price * a.quantity)}</dd>
            </div>
          ))}

          {pledge.shipping_amount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Phí giao hàng</dt>
              <dd className="font-semibold tabular-nums">{formatVnd(pledge.shipping_amount)}</dd>
            </div>
          )}
        </dl>

        <Divider />

        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold">Tổng giữ chỗ</span>
          <span className="text-2xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
            {formatVnd(pledge.total_amount)}
          </span>
        </div>

        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-2/70 p-3.5 text-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-muted">
              <CreditCard className="size-3.5" /> Thẻ giữ chỗ
            </div>
            <div className="mt-1 font-bold">
              {pledge.card_brand} · <span className="font-mono">•••• {pledge.card_last4}</span>
            </div>
          </div>

          {pledge.ship_address && (
            <div className="rounded-2xl bg-surface-2/70 p-3.5 text-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-muted">
                <MapPin className="size-3.5" /> Địa chỉ nhận quà
              </div>
              <div className="mt-1 font-bold">{pledge.ship_recipient}</div>
              <div className="text-xs text-muted">
                {[pledge.ship_address, pledge.ship_province].filter(Boolean).join(", ")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dòng thời gian All-or-Nothing */}
      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ShieldCheck className="size-5 text-emerald-500" /> Tiến trình All-or-Nothing
          </h2>
          <span className="text-xs font-semibold text-muted">
            Hiện đạt {pct}% mục tiêu
          </span>
        </div>

        <ol className="grid gap-4 sm:grid-cols-3">
          <li className="rounded-2xl border border-emerald-500/35 bg-emerald-500/8 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" /> Bước 1 · Hôm nay
            </div>
            <div className="mt-1.5 font-bold">Đã giữ chỗ</div>
            <p className="mt-1 text-xs text-muted">
              Thẻ của bạn chưa bị trừ tiền. Có thể đổi mức quà hoặc huỷ trước khi kết thúc.
            </p>
          </li>

          <li className="rounded-2xl border border-line bg-surface-2/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-400">
              <CalendarClock className="size-4" /> Bước 2 · {formatDate(pledge.end_at)}
            </div>
            <div className="mt-1.5 font-bold">Chốt chiến dịch</div>
            <p className="mt-1 text-xs text-muted">
              Đạt ≥ {formatVnd(pledge.goal_amount)} → trừ tiền tự động. Không đạt → giải phóng giữ chỗ.
            </p>
          </li>

          <li className="rounded-2xl border border-line bg-surface-2/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
              <Package className="size-4" /> Bước 3 · {pledge.estimated_delivery ?? "Sau chiến dịch"}
            </div>
            <div className="mt-1.5 font-bold">Sản xuất & giao quà</div>
            <p className="mt-1 text-xs text-muted">
              Theo dõi tiến độ qua Updates và xem mã vận đơn trong mục Đã góp vốn.
            </p>
          </li>
        </ol>
      </div>
    </div>
  );
}
