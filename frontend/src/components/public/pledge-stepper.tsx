"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Gift,
  HeartHandshake,
  Lock,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import type { AddOnVM, TierVM } from "@/server/queries/public";
import { submitPledgeAction } from "@/server/actions/public";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge, Divider } from "@/components/ui/primitives";
import { SmartImage } from "./smart-image";
import { cn, formatDate, formatVnd } from "@/lib/utils";

export interface SavedCardItem {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: number;
}

export interface SavedAddressItem {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  province: string;
  is_default: number;
}

const VN_PROVINCES = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Huế",
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Ninh",
  "Bình Dương",
  "Bình Định",
  "Bình Thuận",
  "Cà Mau",
  "Đắk Lắk",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Tĩnh",
  "Hải Dương",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tiền Giang",
  "Trà Vinh",
  "Vĩnh Long",
  "Vĩnh Phúc",
];

function checkLuhn(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

function detectBrand(raw: string): "VISA" | "MASTERCARD" | "JCB" | "NAPAS" {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("4")) return "VISA";
  if (/^5[1-5]|^2[2-7]/.test(d)) return "MASTERCARD";
  if (/^35/.test(d)) return "JCB";
  return "NAPAS";
}

function formatCardNumber(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function PledgeStepper({
  project,
  tiers,
  addOns,
  cards,
  addresses,
  viewerName,
  initialTierId,
  initialBonus,
  initialAddOns,
  initialAddressId,
  initialCardId,
  initialAnonymous,
  initialNote,
  existingPledge,
}: {
  project: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    goal_amount: number;
    end_at: string | null;
  };
  tiers: TierVM[];
  addOns: AddOnVM[];
  cards: SavedCardItem[];
  addresses: SavedAddressItem[];
  viewerName: string;
  initialTierId: string | null;
  initialBonus: number;
  initialAddOns: Record<string, number>;
  initialAddressId: string | null;
  initialCardId: string | null;
  initialAnonymous: boolean;
  initialNote: string;
  existingPledge: { code: string; total_amount: number; tier_title: string | null } | null;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Bước 1: Quà & ủng hộ thêm
  const [tierId, setTierId] = useState<string | null>(initialTierId);
  const [noRewardAmount, setNoRewardAmount] = useState<number>(
    initialTierId === null && initialBonus >= 10_000 ? initialBonus : 100_000,
  );
  const [extraBonus, setExtraBonus] = useState<number>(initialTierId !== null ? initialBonus : 0);

  // Bước 2: Add-on & địa chỉ Việt Nam
  const [addOnQty, setAddOnQty] = useState<Record<string, number>>(initialAddOns);
  const [addressMode, setAddressMode] = useState<"saved" | "new">(addresses.length > 0 ? "saved" : "new");
  const [addressId, setAddressId] = useState<string>(initialAddressId ?? addresses[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState(viewerName);
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("TP. Hồ Chí Minh");

  // Bước 3: Cổng VNPAY hoặc Thẻ lưu sẵn & tuỳ chọn
  const [paymentGateway, setPaymentGateway] = useState<"VNPAY" | "CARD">("VNPAY");
  const [vnpPayChannel, setVnpPayChannel] = useState<"VNPAYQR" | "VNBANK" | "INTCARD">("VNBANK");
  const [vnpBankCode, setVnpBankCode] = useState<string>("NCB");
  const [cardMode, setCardMode] = useState<"saved" | "new">(cards.length > 0 ? "saved" : "new");
  const [paymentMethodId, setPaymentMethodId] = useState<string>(initialCardId ?? cards[0]?.id ?? "");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState(12);
  const [expYear, setExpYear] = useState(2029);
  const [holderName, setHolderName] = useState(viewerName.toUpperCase());
  const [anonymous, setAnonymous] = useState(initialAnonymous);
  const [note, setNote] = useState(initialNote);

  const selectedTier = tiers.find((t) => t.id === tierId) ?? null;
  const anyTierMapping = tiers.some((t) => t.addOnIds.length > 0);
  const compatibleAddOns = !selectedTier
    ? []
    : selectedTier.addOnIds.length > 0
      ? addOns.filter((a) => selectedTier.addOnIds.includes(a.id))
      : anyTierMapping
        ? []
        : addOns;

  const shipsPhysical = Boolean(selectedTier && selectedTier.ships_physical === 1);
  const rewardAmount = selectedTier ? selectedTier.amount : 0;
  const bonusAmount = selectedTier ? Math.max(0, Math.round(extraBonus || 0)) : Math.max(0, Math.round(noRewardAmount || 0));

  const selectedAddOnLines = compatibleAddOns
    .map((a) => ({ ...a, qty: addOnQty[a.id] ?? 0 }))
    .filter((a) => a.qty > 0);
  const addOnAmount = selectedAddOnLines.reduce((s, a) => s + a.price * a.qty, 0);
  const shippingAmount = shipsPhysical && selectedTier ? selectedTier.shipping_fee : 0;
  const totalAmount = rewardAmount + bonusAmount + addOnAmount + shippingAmount;

  const cleanDigits = cardNumber.replace(/\D/g, "");
  const isDeclinedTestCard = cleanDigits === "4000000000000002";
  const isCardLuhnValid = cleanDigits.length >= 12 && checkLuhn(cleanDigits);
  const detectedBrand = detectBrand(cleanDigits);

  const selectTier = (nextTierId: string | null) => {
    setTierId(nextTierId);
    if (!nextTierId) {
      setAddOnQty({});
      return;
    }
    const nextTier = tiers.find((t) => t.id === nextTierId);
    if (!nextTier) return;
    const allowedIds = new Set(
      nextTier.addOnIds.length > 0
        ? nextTier.addOnIds
        : anyTierMapping
          ? []
          : addOns.map((a) => a.id),
    );
    setAddOnQty((prev) => {
      const next: Record<string, number> = {};
      for (const [id, q] of Object.entries(prev)) {
        if (allowedIds.has(id) && q > 0) next[id] = q;
      }
      return next;
    });
  };

  const goStep2 = () => {
    if (!selectedTier && bonusAmount < 10_000) {
      toast.error("Số tiền góp không nhận quà tối thiểu là 10.000đ.");
      return;
    }
    if (selectedTier && selectedTier.remaining === 0) {
      toast.error("Mức quà này đã hết suất.");
      return;
    }
    setStep(2);
  };

  const goStep3 = () => {
    if (shipsPhysical) {
      if (addressMode === "saved") {
        if (!addressId) {
          toast.error("Vui lòng chọn địa chỉ giao hàng.");
          return;
        }
      } else {
        const cleanPhone = phone.replace(/\D/g, "");
        if (recipientName.trim().length < 2) {
          toast.error("Tên người nhận phải từ 2 ký tự trở lên.");
          return;
        }
        if (cleanPhone.length < 9 || cleanPhone.length > 12) {
          toast.error("Số điện thoại phải gồm 9–12 chữ số.");
          return;
        }
        if (line1.trim().length < 3) {
          toast.error("Vui lòng nhập số nhà và tên đường (tối thiểu 3 ký tự).");
          return;
        }
        if (!province.trim()) {
          toast.error("Vui lòng chọn Tỉnh / Thành phố.");
          return;
        }
      }
    }
    setStep(3);
  };

  const addOnJson = JSON.stringify(
    selectedAddOnLines.map((a) => ({ id: a.id, quantity: a.qty })),
  );

  return (
    <div className="space-y-6">
      {existingPledge && (
        <div className="card flex flex-col gap-3 border-violet-500/35 bg-violet-500/8 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-violet-600 dark:text-violet-400" />
            <div className="text-sm">
              <div className="font-bold">
                Đang đổi mức góp vốn (thay thế mã <span className="font-mono">{existingPledge.code}</span>)
              </div>
              <p className="mt-0.5 text-muted">
                Khoản giữ chỗ hiện tại: <b className="text-fg">{formatVnd(existingPledge.total_amount)}</b>
                {existingPledge.tier_title ? ` · ${existingPledge.tier_title}` : " · Không nhận quà"}. Khi xác nhận bên dưới, hệ thống sẽ giải phóng khoản cũ và tạo khoản mới.
              </p>
            </div>
          </div>
          <Link href="/me/backed" className="shrink-0 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400">
            Xem lịch sử ở Của tôi →
          </Link>
        </div>
      )}

      {/* Thanh tiến trình 3 bước */}
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { n: 1 as const, label: "Chọn mức quà", icon: Gift },
          { n: 2 as const, label: "Add-on & địa chỉ", icon: Package },
          { n: 3 as const, label: "Thanh toán", icon: CreditCard },
        ].map((s) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <li key={s.n} className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (s.n < step) setStep(s.n);
                }}
                disabled={s.n > step}
                className={cn(
                  "flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl border px-2 py-2 text-left transition sm:px-3 sm:py-2.5",
                  active
                    ? "border-violet-500/60 bg-violet-500/10 text-fg shadow-sm"
                    : done
                      ? "border-emerald-500/40 bg-emerald-500/8 text-fg hover:border-emerald-500/60"
                      : "border-line bg-surface text-muted opacity-70",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-lg text-xs font-bold sm:size-7 sm:rounded-xl",
                    active
                      ? "bg-brand-gradient text-white"
                      : done
                        ? "bg-emerald-500 text-white"
                        : "bg-surface-2 text-muted",
                  )}
                >
                  {done ? <Check className="size-3.5 sm:size-4" /> : s.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-muted">
                    Bước {s.n}
                  </span>
                  <span className="block truncate text-xs font-bold sm:text-sm">{s.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Cột nội dung các bước */}
        <div className="space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              {/* Góp không nhận quà */}
              <div
                onClick={() => selectTier(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && selectTier(null)}
                className={cn(
                  "card cursor-pointer p-4 transition sm:p-5",
                  tierId === null
                    ? "border-violet-500 ring-2 ring-violet-500/20"
                    : "hover:border-violet-400/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                        tierId === null ? "border-violet-600 bg-violet-600 text-white" : "border-muted/40",
                      )}
                    >
                      {tierId === null && <Check className="size-3" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 font-bold">
                        <HeartHandshake className="size-4 text-violet-500" />
                        Góp vốn không nhận quà
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        Ủng hộ tinh thần cho dự án với bất kỳ số tiền nào từ 10.000đ.
                      </p>
                    </div>
                  </div>
                </div>

                {tierId === null && (
                  <div
                    className="mt-4 space-y-3 border-t border-line pt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Field label="Số tiền muốn góp (VND)" hint="Tối thiểu 10.000đ">
                      <Input
                        type="number"
                        min={10_000}
                        step={10_000}
                        value={noRewardAmount}
                        onChange={(e) => setNoRewardAmount(Number(e.target.value))}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {[50_000, 100_000, 200_000, 500_000, 1_000_000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setNoRewardAmount(v)}
                          className={cn(
                            "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                            noRewardAmount === v
                              ? "border-violet-500 bg-violet-500/12 text-violet-700 dark:text-violet-300"
                              : "border-line bg-surface-2 text-muted hover:text-fg",
                          )}
                        >
                          {formatVnd(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Danh sách mức quà */}
              {tiers.map((t) => {
                const soldOut = t.remaining === 0;
                const active = tierId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => !soldOut && selectTier(t.id)}
                    role="button"
                    tabIndex={soldOut ? -1 : 0}
                    onKeyDown={(e) => !soldOut && e.key === "Enter" && selectTier(t.id)}
                    className={cn(
                      "card p-4 transition sm:p-5",
                      soldOut
                        ? "cursor-not-allowed opacity-55"
                        : active
                          ? "cursor-pointer border-violet-500 ring-2 ring-violet-500/20"
                          : "cursor-pointer hover:border-violet-400/50",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2",
                            active ? "border-violet-600 bg-violet-600 text-white" : "border-muted/40",
                          )}
                        >
                          {active && <Check className="size-3" />}
                        </span>
                        <div>
                          <div className="text-base font-extrabold">{t.title}</div>
                          <div className="mt-0.5 text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {formatVnd(t.amount)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.ships_physical === 1 ? (
                          <Badge tone="sky">
                            <Truck className="size-3" /> Giao hàng +{formatVnd(t.shipping_fee)}
                          </Badge>
                        ) : (
                          <Badge tone="slate">Quà số · không giao</Badge>
                        )}
                        {t.quantity_limit !== null && (
                          <Badge tone={soldOut ? "rose" : "amber"}>
                            {soldOut ? "Hết suất" : `Còn ${t.remaining}/${t.quantity_limit} suất`}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="mt-2.5 pl-8 text-sm text-muted">{t.description}</p>

                    {t.items.length > 0 && (
                      <ul className="mt-3 space-y-1 pl-8 text-sm">
                        {t.items.map((it) => (
                          <li key={it.name} className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                            <span>
                              {it.quantity > 1 ? `${it.quantity} × ` : ""}
                              {it.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4 pl-8 text-xs text-muted">
                      <span>Giao dự kiến: <b className="text-fg">{t.estimated_delivery}</b></span>
                      {t.addOnIds.length > 0 && <span>Có {t.addOnIds.length} add-on mua kèm</span>}
                    </div>

                    {active && (
                      <div
                        className="mt-4 space-y-2 border-t border-line pl-8 pt-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Field
                          label="Ủng hộ thêm ngoài mức quà (tuỳ chọn)"
                          hint="Giúp dự án nhanh đạt mục tiêu hoặc stretch goal."
                        >
                          <Input
                            type="number"
                            min={0}
                            step={10_000}
                            value={extraBonus}
                            onChange={(e) => setExtraBonus(Math.max(0, Number(e.target.value) || 0))}
                          />
                        </Field>
                        <div className="flex flex-wrap gap-2">
                          {[0, 50_000, 100_000, 200_000].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setExtraBonus(v)}
                              className={cn(
                                "rounded-xl border px-2.5 py-1 text-xs font-semibold transition",
                                extraBonus === v
                                  ? "border-violet-500 bg-violet-500/12 text-violet-700 dark:text-violet-300"
                                  : "border-line bg-surface-2 text-muted hover:text-fg",
                              )}
                            >
                              {v === 0 ? "Không thêm" : `+${formatVnd(v)}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end">
                <Button type="button" size="lg" onClick={goStep2} className="w-full sm:w-auto">
                  Tiếp tục: Add-on & giao hàng <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Add-on mua kèm */}
              <div className="card space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-base font-bold sm:text-lg">Add-on mua kèm (tuỳ chọn)</h2>
                  <p className="text-sm text-muted">
                    {!selectedTier
                      ? "Góp không nhận quà không kèm add-on. Bạn có thể quay lại Bước 1 để chọn mức quà."
                      : compatibleAddOns.length === 0
                        ? "Mức quà bạn chọn không có add-on mua kèm."
                        : "Chọn thêm phụ kiện hoặc sản phẩm bổ sung cho mức quà đã chọn."}
                  </p>
                </div>

                {compatibleAddOns.length > 0 && (
                  <div className="space-y-3">
                    {compatibleAddOns.map((a) => {
                      const q = addOnQty[a.id] ?? 0;
                      const maxAllowed = a.left === null ? a.max_per_pledge : Math.min(a.max_per_pledge, a.left);
                      return (
                        <div
                          key={a.id}
                          className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-surface-2/50 p-3.5 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="font-bold">{a.title}</div>
                            <p className="text-xs text-muted">{a.description}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatVnd(a.price)}
                              </span>
                              <span className="text-muted">· tối đa {maxAllowed}/lần góp</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              disabled={q <= 0}
                              onClick={() => setAddOnQty((p) => ({ ...p, [a.id]: Math.max(0, q - 1) }))}
                              className="grid size-9 place-items-center rounded-xl border border-line bg-surface transition hover:bg-surface-2 disabled:opacity-40"
                              aria-label={`Giảm ${a.title}`}
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold tabular-nums">{q}</span>
                            <button
                              type="button"
                              disabled={q >= maxAllowed}
                              onClick={() => setAddOnQty((p) => ({ ...p, [a.id]: Math.min(maxAllowed, q + 1) }))}
                              className="grid size-9 place-items-center rounded-xl border border-line bg-surface transition hover:bg-surface-2 disabled:opacity-40"
                              aria-label={`Tăng ${a.title}`}
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Địa chỉ giao hàng nội bộ Việt Nam */}
              <div className="card space-y-4 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                      <MapPin className="size-4 text-violet-500" /> Địa chỉ giao hàng (Việt Nam)
                    </h2>
                    <p className="text-sm text-muted">
                      {shipsPhysical
                        ? "Chỉ giao nội bộ Việt Nam. Ảnh chụp địa chỉ sẽ được lưu kèm pledge."
                        : "Mức bạn chọn là quà số hoặc không nhận quà — không cần địa chỉ giao hàng."}
                    </p>
                  </div>
                </div>

                {shipsPhysical && (
                  <>
                    {addresses.length > 0 && (
                      <div className="space-y-2.5">
                        {addresses.map((addr) => {
                          const checked = addressMode === "saved" && addressId === addr.id;
                          return (
                            <label
                              key={addr.id}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition",
                                checked
                                  ? "border-violet-500 bg-violet-500/8"
                                  : "border-line hover:border-violet-400/40",
                              )}
                            >
                              <input
                                type="radio"
                                name="_ui_addr"
                                checked={checked}
                                onChange={() => {
                                  setAddressMode("saved");
                                  setAddressId(addr.id);
                                }}
                                className="mt-1 accent-violet-600"
                              />
                              <div className="min-w-0 text-sm">
                                <div className="flex flex-wrap items-center gap-2 font-bold">
                                  <span>{addr.recipient_name}</span>
                                  <span className="font-mono text-xs text-muted">{addr.phone}</span>
                                  <Badge tone="slate">{addr.label}</Badge>
                                  {addr.is_default === 1 && <Badge tone="violet">Mặc định</Badge>}
                                </div>
                                <p className="mt-1 text-muted">
                                  {[addr.line1, addr.ward, addr.district, addr.province].filter(Boolean).join(", ")}
                                </p>
                              </div>
                            </label>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setAddressMode(addressMode === "new" ? "saved" : "new")}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-semibold transition",
                            addressMode === "new"
                              ? "border-violet-500 bg-violet-500/8 text-violet-700 dark:text-violet-300"
                              : "border-line text-muted hover:border-violet-400/50 hover:text-fg",
                          )}
                        >
                          <Plus className="size-4" /> Nhập địa chỉ giao hàng mới
                        </button>
                      </div>
                    )}

                    {addressMode === "new" && (
                      <div className="grid gap-3.5 rounded-2xl border border-line bg-surface-2/40 p-4 sm:grid-cols-2">
                        <Field label="Tên người nhận" required>
                          <Input
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Nguyễn Minh Anh"
                          />
                        </Field>
                        <Field label="Số điện thoại" required hint="9–12 chữ số">
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0901234567"
                            inputMode="tel"
                          />
                        </Field>
                        <Field label="Địa chỉ chi tiết (số nhà, tên đường)" required className="sm:col-span-2">
                          <Input
                            value={line1}
                            onChange={(e) => setLine1(e.target.value)}
                            placeholder="123 Nguyễn Trãi"
                          />
                        </Field>
                        <Field label="Phường / Xã">
                          <Input
                            value={ward}
                            onChange={(e) => setWard(e.target.value)}
                            placeholder="Phường Bến Thành"
                          />
                        </Field>
                        <Field label="Quận / Huyện">
                          <Input
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="Quận 1"
                          />
                        </Field>
                        <Field label="Tỉnh / Thành phố" required className="sm:col-span-2">
                          <Select value={province} onChange={(e) => setProvince(e.target.value)}>
                            {VN_PROVINCES.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="outline" size="md" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" /> Quay lại
                </Button>
                <Button type="button" size="lg" onClick={goStep3} className="w-full sm:w-auto">
                  Tiếp tục: Thanh toán <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <ActionForm action={submitPledgeAction} className="space-y-5">
              {/* Toàn bộ dữ liệu đã chọn ở Bước 1–3 */}
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="tierId" value={tierId ?? "none"} />
              <input type="hidden" name="bonusAmount" value={String(bonusAmount)} />
              <input type="hidden" name="addOns" value={addOnJson} />
              <input type="hidden" name="addressMode" value={addressMode} />
              <input type="hidden" name="addressId" value={addressId} />
              <input type="hidden" name="recipientName" value={recipientName} />
              <input type="hidden" name="phone" value={phone} />
              <input type="hidden" name="line1" value={line1} />
              <input type="hidden" name="ward" value={ward} />
              <input type="hidden" name="district" value={district} />
              <input type="hidden" name="province" value={province} />
              <input type="hidden" name="paymentGateway" value={paymentGateway} />
              <input type="hidden" name="vnpPayChannel" value={vnpPayChannel} />
              <input type="hidden" name="vnpBankCode" value={vnpBankCode} />
              <input type="hidden" name="cardMode" value={cardMode} />
              <input type="hidden" name="paymentMethodId" value={paymentMethodId} />
              <input type="hidden" name="cardNumber" value={cardNumber} />
              <input type="hidden" name="expMonth" value={String(expMonth)} />
              <input type="hidden" name="expYear" value={String(expYear)} />
              <input type="hidden" name="holderName" value={holderName} />
              <input type="hidden" name="anonymous" value={anonymous ? "1" : "0"} />
              <input type="hidden" name="note" value={note} />
              <input type="hidden" name="replaceExisting" value={existingPledge ? "1" : "0"} />

              {/* Lựa chọn cổng thanh toán VNPAY hoặc Thẻ Token hoá */}
              <div className="card space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                      <CreditCard className="size-4 text-violet-500" /> Chọn kênh thanh toán ký quỹ
                    </h2>
                    <p className="text-xs text-muted">
                      Hỗ trợ cổng VNPAY chuẩn chữ ký số HMAC-SHA512 hoặc thẻ lưu sẵn Token hoá.
                    </p>
                  </div>
                  <Badge tone="emerald">
                    <Lock className="size-3" /> Chuẩn bảo mật PCI-DSS &amp; SHA-512
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentGateway("VNPAY")}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition",
                      paymentGateway === "VNPAY"
                        ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/20"
                        : "border-line bg-surface hover:border-sky-400/50",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-extrabold text-sky-700 dark:text-sky-300">
                        <span className="rounded-md bg-gradient-to-r from-red-600 to-blue-700 px-2 py-0.5 text-[11px] font-black tracking-wider text-white">
                          VNPAY
                        </span>
                        Cổng VNPAY Sandbox
                      </span>
                      <Badge tone="sky">Khuyên dùng</Badge>
                    </div>
                    <p className="text-xs text-muted">
                      Quét mã VNPAY-QR, thẻ ATM nội địa (NCB, Vietcombank, BIDV, Techcombank, MB...) hoặc thẻ quốc tế.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentGateway("CARD")}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition",
                      paymentGateway === "CARD"
                        ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20"
                        : "border-line bg-surface hover:border-violet-400/50",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-extrabold">Thẻ lưu sẵn (1 chạm)</span>
                      <Badge tone="violet">Token hoá</Badge>
                    </div>
                    <p className="text-xs text-muted">
                      Uỷ quyền giữ chỗ trực tiếp bằng thẻ VISA / MasterCard / JCB / NAPAS đã liên kết trong tài khoản.
                    </p>
                  </button>
                </div>

                {paymentGateway === "VNPAY" && (
                  <div className="space-y-4 rounded-2xl border border-sky-500/30 bg-sky-500/[0.05] p-4">
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Phương thức trên cổng VNPAY
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {[
                          { ch: "VNBANK" as const, bank: "NCB", title: "Thẻ ATM / Ngân hàng", sub: "NCB, VCB, TCB, MB, BIDV..." },
                          { ch: "VNPAYQR" as const, bank: "VNPAYQR", title: "Quét mã VNPAY-QR", sub: "App Ngân hàng & Ví VNPAY" },
                          { ch: "INTCARD" as const, bank: "VISA", title: "Thẻ Quốc tế", sub: "Visa / MasterCard / JCB" },
                        ].map((opt) => {
                          const active = vnpPayChannel === opt.ch;
                          return (
                            <button
                              key={opt.ch}
                              type="button"
                              onClick={() => {
                                setVnpPayChannel(opt.ch);
                                setVnpBankCode(opt.bank);
                              }}
                              className={cn(
                                "rounded-xl border p-3 text-left transition",
                                active
                                  ? "border-sky-500 bg-surface shadow-sm"
                                  : "border-line bg-surface/60 hover:border-sky-400/40",
                              )}
                            >
                              <div className="text-xs font-bold">{opt.title}</div>
                              <div className="mt-0.5 text-[11px] text-muted">{opt.sub}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {vnpPayChannel === "VNBANK" && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-fg">Chọn ngân hàng nội địa:</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { code: "NCB", label: "NCB (Thẻ test chuẩn)" },
                            { code: "VCB", label: "Vietcombank" },
                            { code: "TCB", label: "Techcombank" },
                            { code: "MBB", label: "MB Bank" },
                            { code: "BIDV", label: "BIDV" },
                            { code: "CTG", label: "VietinBank" },
                            { code: "ACB", label: "ACB" },
                          ].map((b) => (
                            <button
                              key={b.code}
                              type="button"
                              onClick={() => setVnpBankCode(b.code)}
                              className={cn(
                                "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                                vnpBankCode === b.code
                                  ? "border-sky-500 bg-sky-600 text-white"
                                  : "border-line bg-surface text-muted hover:text-fg",
                              )}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-line bg-surface p-3 text-xs text-muted">
                      Khi bấm tiếp tục, hệ thống sẽ khởi tạo đơn ký quỹ có chữ ký số <b>HMAC-SHA512</b> và chuyển bạn sang giao diện <b>Cổng thanh toán VNPAY Sandbox</b> để xác nhận OTP / mã QR.
                    </div>
                  </div>
                )}

                {paymentGateway === "CARD" && cards.length > 0 && (
                  <div className="space-y-2.5">
                    {cards.map((c) => {
                      const checked = cardMode === "saved" && paymentMethodId === c.id;
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition",
                            checked
                              ? "border-violet-500 bg-violet-500/8"
                              : "border-line hover:border-violet-400/40",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="_ui_card"
                              checked={checked}
                              onChange={() => {
                                setCardMode("saved");
                                setPaymentMethodId(c.id);
                              }}
                              className="accent-violet-600"
                            />
                            <div>
                              <div className="flex items-center gap-2 font-bold">
                                <span>{c.brand}</span>
                                <span className="font-mono text-sm">•••• {c.last4}</span>
                                {c.is_default === 1 && <Badge tone="violet">Mặc định</Badge>}
                              </div>
                              <div className="text-xs text-muted">
                                Hết hạn {String(c.exp_month).padStart(2, "0")}/{c.exp_year}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCardMode(cardMode === "new" ? "saved" : "new")}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-semibold transition",
                        cardMode === "new"
                          ? "border-violet-500 bg-violet-500/8 text-violet-700 dark:text-violet-300"
                          : "border-line text-muted hover:border-violet-400/50 hover:text-fg",
                      )}
                    >
                      <Plus className="size-4" /> Liên kết thẻ mới
                    </button>
                  </div>
                )}

                {paymentGateway === "CARD" && cardMode === "new" && (
                  <div className="space-y-4 rounded-2xl border border-line bg-surface-2/40 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted">Điền nhanh thẻ thử:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCardNumber("4242 4242 4242 4242");
                          setExpMonth(12);
                          setExpYear(2029);
                          setHolderName(viewerName.toUpperCase());
                        }}
                        className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 font-mono font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
                      >
                        4242 4242 4242 4242 (Hợp lệ)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCardNumber("4000 0000 0000 0002");
                          setExpMonth(12);
                          setExpYear(2029);
                          setHolderName(viewerName.toUpperCase());
                        }}
                        className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 font-mono font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300"
                      >
                        4000 0000 0000 0002 (Thử từ chối)
                      </button>
                    </div>

                    <Field label="Số thẻ" required>
                      <div className="relative">
                        <Input
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="4242 4242 4242 4242"
                          inputMode="numeric"
                          className="pr-24 font-mono"
                        />
                        {cleanDigits.length > 0 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-bold">
                            {detectedBrand}
                          </span>
                        )}
                      </div>
                      {cleanDigits.length >= 12 && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                          {isDeclinedTestCard ? (
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                              <AlertCircle className="size-3.5" /> Thẻ thử mô phỏng bị ngân hàng từ chối.
                            </span>
                          ) : isCardLuhnValid ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5" /> Số thẻ hợp lệ (Luhn OK).
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                              <AlertCircle className="size-3.5" /> Số thẻ chưa đúng chuẩn Luhn.
                            </span>
                          )}
                        </div>
                      )}
                    </Field>

                    <div className="grid gap-3.5 sm:grid-cols-3">
                      <Field label="Tháng hết hạn" required>
                        <Select value={expMonth} onChange={(e) => setExpMonth(Number(e.target.value))}>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              Tháng {String(m).padStart(2, "0")}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Năm hết hạn" required>
                        <Select value={expYear} onChange={(e) => setExpYear(Number(e.target.value))}>
                          {Array.from({ length: 10 }, (_, i) => 2026 + i).map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Tên chủ thẻ" required>
                        <Input
                          value={holderName}
                          onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                          placeholder="NGUYEN MINH ANH"
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* Tuỳ chọn ẩn danh & lời nhắn */}
              <div className="card space-y-4 p-4 sm:p-5">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2/40 p-3.5 transition hover:border-violet-400/40">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="mt-1 size-4 accent-violet-600"
                  />
                  <span className="text-sm">
                    <span className="block font-bold">Ủng hộ ẩn danh</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Tên bạn sẽ hiển thị là “Một người ủng hộ” trên bảng công khai (Creator vẫn thấy thông tin giao quà nếu có).
                    </span>
                  </span>
                </label>

                <Field label="Lời nhắn gửi tới Creator (tuỳ chọn)" hint={`${note.length}/300 ký tự`}>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 300))}
                    maxLength={300}
                    placeholder="Chúc dự án sớm cán đích nhé!"
                    className="min-h-20"
                  />
                </Field>
              </div>

              {/* Giải thích All-or-Nothing */}
              <div className="card flex items-start gap-3 border-emerald-500/30 bg-emerald-500/8 p-4 text-sm">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-300">
                    Chưa trừ tiền ngay — Cơ chế All-or-Nothing
                  </div>
                  <p className="mt-1 text-muted">
                    Khoản <b className="text-fg">{formatVnd(totalAmount)}</b> chỉ được <b>giữ chỗ</b>. Hệ thống chỉ thu tiền nếu dự án đạt mục tiêu <b className="text-fg">{formatVnd(project.goal_amount)}</b> trước <b className="text-fg">{formatDate(project.end_at, true)}</b>. Bạn có thể đổi hoặc huỷ bất kỳ lúc nào trước khi kết thúc.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="outline" size="md" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4" /> Quay lại
                </Button>
                <SubmitButton
                  variant="primary"
                  size="lg"
                  pendingText={paymentGateway === "VNPAY" ? "Đang kết nối cổng VNPAY…" : "Đang xử lý giữ chỗ…"}
                >
                  <ShieldCheck className="size-5" />
                  {paymentGateway === "VNPAY"
                    ? `Thanh toán qua VNPAY · ${formatVnd(totalAmount)}`
                    : existingPledge
                      ? "Xác nhận đổi góp vốn"
                      : `Xác nhận giữ chỗ ${formatVnd(totalAmount)}`}
                </SubmitButton>
              </div>
            </ActionForm>
          )}
        </div>

        {/* Cột tóm tắt sticky */}
        <aside className="card sticky top-24 space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {project.cover_url && (
                <SmartImage src={project.cover_url} alt={project.title} fill sizes="56px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Tóm tắt góp vốn</div>
              <div className="line-clamp-2 text-sm font-bold leading-snug">{project.title}</div>
            </div>
          </div>

          <Divider />

          <dl className="space-y-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted">
                {selectedTier ? selectedTier.title : "Góp không nhận quà"}
              </dt>
              <dd className="shrink-0 font-semibold tabular-nums">
                {formatVnd(selectedTier ? rewardAmount : bonusAmount)}
              </dd>
            </div>

            {selectedTier && bonusAmount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Ủng hộ thêm</dt>
                <dd className="font-semibold tabular-nums">+{formatVnd(bonusAmount)}</dd>
              </div>
            )}

            {selectedAddOnLines.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3">
                <dt className="text-muted">
                  {a.qty} × {a.title}
                </dt>
                <dd className="shrink-0 font-semibold tabular-nums">+{formatVnd(a.price * a.qty)}</dd>
              </div>
            ))}

            {shipsPhysical && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Phí giao hàng (VN)</dt>
                <dd className="font-semibold tabular-nums">{formatVnd(shippingAmount)}</dd>
              </div>
            )}
          </dl>

          <Divider />

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold">Tổng giữ chỗ</span>
            <span className="text-2xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
              {formatVnd(totalAmount)}
            </span>
          </div>

          <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted">
            Trạng thái ban đầu: <b className="text-fg">Đang giữ chỗ (AUTHORIZED)</b> — chưa trừ tiền thẻ hôm nay.
          </div>
        </aside>
      </div>
    </div>
  );
}
