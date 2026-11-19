"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { processVnpayGatewayAction } from "@/server/actions/public";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Badge, Card, Divider } from "@/components/ui/primitives";
import { cn, formatVnd } from "@/lib/utils";

export interface VnpayBankItem {
  code: string;
  name: string;
  shortName: string;
  channel: "VNPAYQR" | "VNBANK" | "INTCARD";
}

export interface VnpayOrderViewData {
  order: {
    txnRef: string;
    purpose: string;
    amount: number;
    bankCode: string;
    payChannel: "VNPAYQR" | "VNBANK" | "INTCARD";
    orderInfo: string;
    status: string;
    expiresAt: string;
    createdAt: string;
    signatureVerified: boolean;
    tmnCode: string;
  };
  project: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    goal_amount: number;
    end_at: string | null;
  };
  qrDataUrl: string;
  banks: VnpayBankItem[];
}

const SANDBOX_SCENARIOS = [
  { code: "00", label: "00 · Thanh toán thành công", tone: "emerald" as const },
  { code: "51", label: "51 · Không đủ số dư", tone: "amber" as const },
  { code: "11", label: "11 · Sai mã OTP / Hết hạn", tone: "amber" as const },
  { code: "12", label: "12 · Thẻ đang bị khoá", tone: "rose" as const },
  { code: "75", label: "75 · Ngân hàng bảo trì", tone: "slate" as const },
];

function formatCardInput(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function VnpayCheckoutClient({
  data,
  orderToken,
}: {
  data: VnpayOrderViewData;
  orderToken?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [channel, setChannel] = useState<"VNPAYQR" | "VNBANK" | "INTCARD">(data.order.payChannel);
  const [bankCode, setBankCode] = useState<string>(data.order.bankCode || "NCB");
  const [cardNumber, setCardNumber] = useState("9704 1985 2619 1432 198");
  const [cardHolder, setCardHolder] = useState("NGUYEN VAN A");
  const [issueDate, setIssueDate] = useState("07/15");
  const [otp, setOtp] = useState("123456");
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(data.order.expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(data.order.expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [data.order.expiresAt]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const domesticBanks = data.banks.filter((b) => b.channel === "VNBANK");

  const runPayment = (simulateCode?: string) => {
    startTransition(async () => {
      const res = await processVnpayGatewayAction({
        txnRef: data.order.txnRef,
        orderToken,
        payChannel: channel,
        bankCode: channel === "VNPAYQR" ? "VNPAYQR" : channel === "INTCARD" ? "VISA" : bankCode,
        cardNumber,
        cardHolder,
        issueDate,
        otp,
        simulateCode,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Không thể xử lý giao dịch VNPAY.");
        return;
      }
      if (res.returnUrl) {
        router.push(res.returnUrl);
      }
    });
  };

  const fillNcbSandbox = () => {
    setChannel("VNBANK");
    setBankCode("NCB");
    setCardNumber("9704 1985 2619 1432 198");
    setCardHolder("NGUYEN VAN A");
    setIssueDate("07/15");
    setOtp("123456");
    toast.success("Đã điền bộ thẻ kiểm thử chuẩn VNPAY Sandbox (NCB)!");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* Thanh nhận diện cổng VNPAY Sandbox */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950 via-blue-950 to-slate-900 px-5 py-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white px-3 py-1.5 text-sm font-black tracking-wider">
            <span className="text-red-600">VN</span>
            <span className="text-blue-700">PAY</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold sm:text-base">
              Cổng thanh toán VNPAY Sandbox · v2.1.0
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                HMAC-SHA512 Verified
              </span>
            </div>
            <p className="text-xs text-sky-200/80">
              Môi trường kiểm thử ký quỹ an toàn All-or-Nothing — không trừ tiền thật.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 font-mono text-sm font-bold">
          <Clock className={cn("size-4", secondsLeft <= 120 ? "text-rose-400 animate-pulse" : "text-sky-300")} />
          <span>
            {mins}:{secs}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Cột trái: Thông tin đơn hàng */}
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Thông tin đơn hàng</span>
            <Badge tone="emerald">
              <Lock className="size-3" /> {data.order.tmnCode}
            </Badge>
          </div>

          <div>
            <div className="text-xs text-muted">Số tiền thanh toán ký quỹ</div>
            <div className="mt-1 text-2xl font-black text-sky-600 tabular-nums dark:text-sky-400">
              {formatVnd(data.order.amount)}
            </div>
          </div>

          <Divider />

          <dl className="space-y-2.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Đơn vị thụ hưởng</dt>
              <dd className="font-bold text-right">FUNDVIET ESCROW</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Mã tham chiếu (vnp_TxnRef)</dt>
              <dd className="font-mono font-bold">{data.order.txnRef}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted">Dự án gọi vốn</dt>
              <dd className="font-semibold text-fg">{data.project.title}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted">Nội dung giao dịch</dt>
              <dd className="rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-[11px]">{data.order.orderInfo}</dd>
            </div>
          </dl>

          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 text-xs text-muted">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-4" /> Bảo vệ Backer 100%
            </div>
            <p className="mt-1 leading-relaxed">
              Số tiền này được giữ trong tài khoản ký quỹ. Nếu dự án không đạt mục tiêu khi kết thúc, hệ thống tự động giải phóng hoàn trả 100%.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => runPayment("24")}
            className="w-full text-rose-600 hover:bg-rose-500/10"
          >
            <XCircle className="size-4" /> Huỷ giao dịch (Mã 24)
          </Button>
        </Card>

        {/* Cột phải: Chọn phương thức & Nhập thẻ / QR */}
        <div className="space-y-5">
          {/* 3 Tab phương thức VNPAY */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "VNBANK" as const, label: "Thẻ ATM Nội địa", icon: Building2 },
              { id: "VNPAYQR" as const, label: "Quét VNPAY-QR", icon: QrCode },
              { id: "INTCARD" as const, label: "Thẻ Quốc tế", icon: CreditCard },
            ].map((t) => {
              const active = channel === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setChannel(t.id);
                    if (t.id === "VNBANK" && (bankCode === "VNPAYQR" || bankCode === "VISA")) setBankCode("NCB");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition sm:flex-row sm:text-sm",
                    active
                      ? "border-sky-500 bg-sky-500/10 text-sky-700 shadow-sm dark:text-sky-300"
                      : "border-line bg-surface text-muted hover:text-fg",
                  )}
                >
                  <t.icon className="size-4 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {channel === "VNPAYQR" ? (
            <Card className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-2xl border-2 border-sky-500/30 bg-white p-4 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.qrDataUrl} alt="Mã VNPAY-QR" className="size-52" />
                </div>
                <h3 className="mt-4 text-base font-extrabold">Quét mã qua Ứng dụng Ngân hàng hoặc Ví VNPAY</h3>
                <p className="mt-1 max-w-md text-xs text-muted">
                  Mở ứng dụng Mobile Banking (VCB Digibank, BIDV SmartBanking, VietinBank iPay, MB Bank...) chọn tính năng <b>QR Pay</b> để quét mã.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button type="button" size="lg" disabled={pending || secondsLeft === 0} onClick={() => runPayment("00")}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Xác nhận đã quét QR thành công
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="space-y-5 p-5 sm:p-6">
              {channel === "VNBANK" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Ngân hàng thanh toán</span>
                    <button
                      type="button"
                      onClick={fillNcbSandbox}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      <Sparkles className="size-3.5" /> Điền thẻ test chuẩn NCB Sandbox
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {domesticBanks.map((b) => (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => setBankCode(b.code)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                          bankCode === b.code
                            ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                            : "border-line bg-surface-2/60 text-fg hover:border-sky-400/50",
                        )}
                      >
                        {b.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {channel === "INTCARD" && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 p-3 text-xs">
                  <span className="font-semibold">Cổng thẻ quốc tế VNPAY (3D-Secure · VISA / MasterCard / JCB)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCardNumber("4242 4242 4242 4242");
                      setCardHolder("NGUYEN VAN A");
                      setIssueDate("12/29");
                      setOtp("123456");
                    }}
                    className="font-bold text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Điền nhanh thẻ Visa 4242
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Số thẻ"
                  hint={channel === "VNBANK" ? "Thẻ chuẩn NCB: 9704198526191432198" : "Ví dụ: 4242 4242 4242 4242"}
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                    placeholder="9704 1985 2619 1432 198"
                    className="font-mono text-base tracking-wider"
                    required
                  />
                </Field>

                <Field label="Tên chủ thẻ (không dấu)" required>
                  <Input
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="NGUYEN VAN A"
                    required
                  />
                </Field>

                <Field label={channel === "VNBANK" ? "Ngày phát hành (MM/YY)" : "Ngày hết hạn (MM/YY)"} required>
                  <Input
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value.slice(0, 5))}
                    placeholder="07/15"
                    className="font-mono"
                    required
                  />
                </Field>

                <Field
                  label="Mã xác thực OTP (6 chữ số)"
                  hint="Mã OTP mặc định VNPAY Sandbox: 123456 (nhập 000000 để thử kịch bản sai OTP)"
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="font-mono text-lg tracking-[0.35em] sm:max-w-[240px]"
                    required
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
                <Button
                  type="button"
                  size="lg"
                  disabled={pending || secondsLeft === 0}
                  onClick={() => runPayment()}
                  className="w-full sm:w-auto"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-5" />}
                  Xác nhận thanh toán {formatVnd(data.order.amount)}
                </Button>
              </div>
            </Card>
          )}

          {/* Bảng mô phỏng các mã phản hồi VNPAY phục vụ kiểm thử đồ án */}
          <Card className="space-y-3 border-dashed p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted">
              <AlertTriangle className="size-4 text-amber-500" />
              Bảng mô phỏng nhanh mã phản hồi VNPAY (Sandbox Test Cases)
            </div>
            <div className="flex flex-wrap gap-2">
              {SANDBOX_SCENARIOS.map((sc) => (
                <button
                  key={sc.code}
                  type="button"
                  disabled={pending}
                  onClick={() => runPayment(sc.code)}
                  className="rounded-xl border border-line bg-surface-2/70 px-3 py-1.5 text-xs font-semibold transition hover:border-sky-500 hover:text-fg disabled:opacity-50"
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
