import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Receipt, RotateCcw, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { apiFetch } from "@/server/api";
import { SuccessCelebration } from "@/components/public/success-celebration";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Divider } from "@/components/ui/primitives";
import { formatVnd } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kết quả giao dịch VNPAY" };

interface VerifiedReturn {
  ok?: boolean;
  signatureValid?: boolean;
  isSuccess?: boolean;
  responseCode?: string;
  message?: string;
  txnRef?: string;
  transactionNo?: string;
  bankCode?: string;
  cardType?: string;
  payDate?: string;
  orderInfo?: string;
  amount?: number;
  purpose?: string;
  projectSlug?: string;
  projectTitle?: string;
  pledgeCode?: string;
  error?: string;
}

function formatVnpPayDate(raw?: string) {
  if (!raw || raw.length !== 14) return raw || "—";
  return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
}

export default async function VnpayReturnPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }

  const { data } = await apiFetch<VerifiedReturn>(`/vnpay/verify-return?${qs.toString()}`);
  const ok = Boolean(data.isSuccess && data.signatureValid);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      {ok && <SuccessCelebration />}

      <Card className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div
            className={
              ok
                ? "grid size-16 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "grid size-16 place-items-center rounded-3xl bg-rose-500/15 text-rose-600 dark:text-rose-400"
            }
          >
            {ok ? <CheckCircle2 className="size-9" /> : <ShieldAlert className="size-9" />}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone={ok ? "emerald" : "rose"}>Mã phản hồi VNPAY: {data.responseCode ?? "99"}</Badge>
            <Badge tone={data.signatureValid ? "sky" : "rose"}>
              <ShieldCheck className="size-3" />
              {data.signatureValid ? "Xác thực giao dịch hợp lệ" : "Giao dịch chưa được xác thực"}
            </Badge>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            {ok ? "Giao dịch VNPAY thành công!" : "Giao dịch chưa hoàn tất"}
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted">{data.message ?? data.error}</p>
        </div>

        <Divider />

        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Số tiền giao dịch</dt>
            <dd className="text-lg font-black text-emerald-600 tabular-nums dark:text-emerald-400">
              {formatVnd(data.amount ?? 0)}
            </dd>
          </div>
          {data.pledgeCode && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Mã cam kết góp vốn</dt>
              <dd className="font-mono font-bold text-violet-600 dark:text-violet-400">{data.pledgeCode}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Mã tham chiếu giao dịch</dt>
            <dd className="font-mono font-semibold">{data.txnRef || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Mã giao dịch VNPAY</dt>
            <dd className="font-mono font-semibold">{data.transactionNo && data.transactionNo !== "0" ? data.transactionNo : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Ngân hàng / Phương thức</dt>
            <dd className="font-semibold">
              {data.bankCode || "—"} {data.cardType ? `(${data.cardType})` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Thời gian thanh toán</dt>
            <dd className="font-mono text-xs">{formatVnpPayDate(data.payDate)}</dd>
          </div>
          {data.projectTitle && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Dự án</dt>
              <dd className="text-right font-semibold">
                {data.projectSlug ? (
                  <Link href={`/p/${data.projectSlug}`} className="hover:underline">
                    {data.projectTitle}
                  </Link>
                ) : (
                  data.projectTitle
                )}
              </dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {ok ? (
            <>
              {data.projectSlug && data.pledgeCode && data.purpose !== "RETRY_CAPTURE" && (
                <ButtonLink href={`/p/${data.projectSlug}/back/success?code=${encodeURIComponent(data.pledgeCode)}`} size="md">
                  <Receipt className="size-4" /> Xem biên nhận chi tiết
                </ButtonLink>
              )}
              <ButtonLink href="/me/backed" variant={data.purpose === "RETRY_CAPTURE" ? "primary" : "outline"} size="md">
                <Wallet className="size-4" /> Quản lý tại Của tôi
              </ButtonLink>
            </>
          ) : (
            <>
              {data.projectSlug && (
                <ButtonLink href={`/p/${data.projectSlug}/back`} size="md">
                  <RotateCcw className="size-4" /> Thử thanh toán lại
                </ButtonLink>
              )}
              <ButtonLink href={data.projectSlug ? `/p/${data.projectSlug}` : "/explore"} variant="outline" size="md">
                <ArrowLeft className="size-4" /> Quay lại dự án
              </ButtonLink>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
