"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Gift,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  PackagePlus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AuthorizePledgeResult, CampaignDetail } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";

const steps = [
  { label: "Gói ủng hộ", icon: Gift },
  { label: "Phần bổ sung", icon: PackagePlus },
  { label: "Giao hàng", icon: MapPin },
  { label: "Xác nhận", icon: CheckCircle2 },
];

const NO_REWARD_ID = "no_reward";

export function PledgeFlow({
  campaign,
  initialRewardId,
}: {
  campaign: CampaignDetail;
  initialRewardId?: string;
}) {
  const defaultReward =
    initialRewardId === NO_REWARD_ID ||
    campaign.rewards.some(
      (reward) =>
        reward.id === initialRewardId &&
        (reward.limit === undefined || reward.claimed < reward.limit),
    )
      ? initialRewardId!
      : (campaign.rewards.find(
          (reward) =>
            reward.featured &&
            (reward.limit === undefined || reward.claimed < reward.limit),
        )?.id ??
        campaign.rewards.find(
          (reward) => reward.limit === undefined || reward.claimed < reward.limit,
        )?.id ??
        NO_REWARD_ID);
  const defaultRewardItem =
    campaign.rewards.find((reward) => reward.id === defaultReward) ?? null;
  const shippingOptions = campaign.shippingOptions ?? [];
  const [step, setStep] = useState(0);
  const [rewardId, setRewardId] = useState<string>(defaultReward);
  const [shippingOptionId, setShippingOptionId] = useState<string | null>(
    defaultRewardItem?.requiresShipping ? (shippingOptions[0]?.id ?? null) : null,
  );
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [bonus, setBonus] = useState(
    defaultReward === NO_REWARD_ID ? "100000" : "0",
  );
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    line1: "",
    city: "",
  });
  const [understandsDemo, setUnderstandsDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuthorizePledgeResult | null>(null);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);

  const reward = campaign.rewards.find((item) => item.id === rewardId) ?? null;
  const selectedAddOns = reward
    ? campaign.addOns.filter((item) => addOnIds.includes(item.id))
    : [];
  const needsShipping = Boolean(
    reward?.requiresShipping ||
      selectedAddOns.some((addOn) => addOn.requiresShipping),
  );
  const visibleSteps = steps
    .map((item, index) => ({ ...item, index }))
    .filter((item) => needsShipping || item.index !== 2);
  const shippingOption = shippingOptions.find(
    (option) => option.id === shippingOptionId,
  );
  const addOnAmount = selectedAddOns.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const bonusAmount = Math.max(0, Number(bonus) || 0);
  const rewardAmount = reward?.amount ?? 0;
  const shippingAmount = needsShipping ? (shippingOption?.feeAmount ?? 0) : 0;
  const total = rewardAmount + addOnAmount + bonusAmount + shippingAmount;

  const stepIssues = useMemo(() => {
    const issues: string[] = [];
    if (step === 0 && !rewardId) issues.push("Chọn một gói ủng hộ để đi tiếp.");
    if (step === 1 && rewardId === NO_REWARD_ID && bonusAmount < 50_000) {
      issues.push("Khoản ủng hộ không nhận quà tối thiểu là 50.000 đ.");
    }
    if (step === 2 && needsShipping) {
      if (!shippingOptionId) issues.push("Chọn cách giao quà để tiếp tục.");
      if (address.fullName.trim().length < 2) issues.push("Nhập họ và tên người nhận.");
      if (!/^0\d{9}$/.test(address.phone.replace(/\D/g, ""))) {
        issues.push("Số điện thoại cần đủ 10 số và bắt đầu bằng 0.");
      }
      if (address.line1.trim().length < 5) {
        issues.push("Nhập địa chỉ giao hàng cụ thể hơn.");
      }
      if (address.city.trim().length < 2) issues.push("Nhập tỉnh hoặc thành phố giao hàng.");
    }
    if (step === 3 && !understandsDemo)
      issues.push("Xác nhận bạn đã hiểu đây chỉ là cam kết mẫu.");
    return issues;
  }, [
    address,
    bonusAmount,
    needsShipping,
    rewardId,
    shippingOptionId,
    step,
    understandsDemo,
  ]);
  const canContinue = stepIssues.length === 0;
  const showStepErrors = attemptedStep === step && !canContinue;

  const goToNextStep = () => {
    if (!canContinue) {
      setAttemptedStep(step);
      return;
    }
    setAttemptedStep(null);
    setStep((value) => value === 1 && !needsShipping ? 3 : Math.min(3, value + 1));
  };

  const toggleAddOn = (id: string) => {
    const nextIds = addOnIds.includes(id)
      ? addOnIds.filter((item) => item !== id)
      : [...addOnIds, id];
    const nextNeedsShipping = Boolean(
      reward?.requiresShipping ||
        campaign.addOns.some(
          (addOn) =>
            nextIds.includes(addOn.id) && addOn.requiresShipping,
        ),
    );
    setAddOnIds(nextIds);
    setShippingOptionId(
      nextNeedsShipping ? (shippingOptionId ?? shippingOptions[0]?.id ?? null) : null,
    );
  };
  const selectNoReward = () => {
    setRewardId(NO_REWARD_ID);
    setShippingOptionId(null);
    setAddOnIds([]);
    if (bonusAmount < 50_000) setBonus("100000");
  };
  const selectReward = (id: string) => {
    const nextReward = campaign.rewards.find((item) => item.id === id);
    if (!nextReward || (nextReward.limit !== undefined && nextReward.claimed >= nextReward.limit))
      return;
    if (rewardId === NO_REWARD_ID) setBonus("0");
    setRewardId(id);
    setShippingOptionId(
      nextReward?.requiresShipping ? (shippingOptions[0]?.id ?? null) : null,
    );
  };

  const authorize = async () => {
    setSubmitting(true);
    setError("");
    try {
      const data = await clientRequest<AuthorizePledgeResult>(
        "/api/v1/pledges/authorize",
        {
        method: "POST",
        body: JSON.stringify({
          campaignId: campaign.id,
          rewardId: reward?.id ?? null,
          addOnIds: reward ? addOnIds : [],
          shippingOptionId: needsShipping ? shippingOptionId : null,
          bonusAmount,
          address: needsShipping ? address : null,
        }),
        },
      );
      setResult(data);
    } catch (error) {
      setError(clientRequestMessage(error, "Chưa thể ghi nhận cam kết. Bạn kiểm tra lại thông tin rồi thử thêm một lần nhé."));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-[20px] border border-emerald-200 bg-white p-6 text-center sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="eyebrow mt-6 text-emerald-700">Đã ghi nhận cam kết</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
          Cảm ơn bạn đã góp sức.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-ink-soft">
          Cam kết mẫu <strong>{formatVnd(result.totalAmount)}</strong> đã được lưu
          trong bản demo đang dùng. Chưa có thẻ, ngân hàng hay
          cổng thanh toán nào tham gia.
        </p>
        <dl className="mx-auto mt-7 grid max-w-md gap-3 rounded-2xl bg-[#f5f6ef] p-5 text-left text-xs sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Mã cam kết mẫu</dt>
            <dd className="mt-1 font-mono font-bold text-ink">
              {result.authorizationId}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Trạng thái</dt>
            <dd className="mt-1 font-bold text-emerald-700">
              ĐÃ GHI NHẬN MẪU · CHƯA THU
            </dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="button-dark">
            Xem dự án đã ủng hộ <ArrowRight className="size-4" />
          </Link>
          <Link
            href={`/projects/${campaign.slug}`}
            className="button-secondary"
          >
            Trở lại dự án
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-9">
      <ol className={`grid gap-2 ${needsShipping ? "grid-cols-4" : "grid-cols-3"}`} aria-label="Các bước ủng hộ">
        {visibleSteps.map((item, displayIndex) => {
          const Icon = item.icon;
          const active = item.index === step;
          const done = item.index < step;
          return (
            <li key={item.label} aria-current={active ? "step" : undefined}>
              <button
                type="button"
                onClick={() => {
                  if (item.index < step) setStep(item.index);
                }}
                disabled={item.index > step}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition-[background-color,border-color,color] duration-200 sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:py-2.5 sm:text-left ${active ? "border-coral bg-[#fff4ef] text-coral-dark" : done ? "cursor-pointer border-forest bg-forest text-white" : "border-line bg-white/55 text-ink-muted"}`}
              >
                <span
                  className={`hidden size-7 shrink-0 place-items-center rounded-lg sm:grid ${active ? "bg-coral text-white" : done ? "bg-lime text-forest" : "bg-forest/6"}`}
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </span>
                <span className="text-xs font-bold leading-tight sm:text-sm">
                  {displayIndex + 1}. {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="rounded-[20px] border border-line bg-white p-5 sm:p-7">
          {step === 0 ? (
            <div>
              <p className="eyebrow text-coral">Bước 1</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                Chọn gói ủng hộ
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Mỗi lần ủng hộ chọn tối đa một gói quà, hoặc chỉ góp tiền cho ý
                tưởng.
              </p>
              <div className="mt-6 space-y-3">
                {campaign.rewards.map((item) => (
                  <label
                    key={item.id}
                    className={`block cursor-pointer rounded-[12px] border p-4 transition-[border-color,background-color] duration-200 ${rewardId === item.id ? "border-coral bg-[#fff8f4]" : "border-line hover:border-forest/25"}`}
                  >
                    <div className="flex gap-4">
                      <input
                        type="radio"
                        name="reward"
                        value={item.id}
                        checked={rewardId === item.id}
                        disabled={item.limit !== undefined && item.claimed >= item.limit}
                        onChange={() => selectReward(item.id)}
                        className="mt-1 size-4 accent-[#f36545]"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-display font-extrabold">
                            {item.title}
                          </p>
                          <p className="font-display font-extrabold text-coral-dark">
                            {formatVnd(item.amount)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink-soft">
                          {item.description}
                        </p>
                        <p className="mt-2 text-xs text-ink-muted">
                          Dự kiến giao: {item.estimatedDelivery}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-forest">
                          {item.limit !== undefined && item.claimed >= item.limit
                            ? "Gói đã hết lượt chọn"
                            : item.requiresShipping
                            ? "Quà vật lý · cần địa chỉ nhận hàng"
                            : "Quà số · không phát sinh phí giao"}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
                <label
                  className={`block cursor-pointer rounded-[12px] border p-4 transition-[border-color,background-color] duration-200 ${rewardId === NO_REWARD_ID ? "border-coral bg-[#fff8f4]" : "border-line hover:border-forest/25"}`}
                >
                  <div className="flex gap-4">
                    <input
                      type="radio"
                      name="reward"
                      value={NO_REWARD_ID}
                      checked={rewardId === NO_REWARD_ID}
                      onChange={selectNoReward}
                      className="mt-1 size-4 accent-[#f36545]"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-display font-extrabold">
                          Ủng hộ không nhận quà
                        </p>
                        <p className="font-display text-sm font-extrabold text-coral-dark">
                          Từ 50.000 ₫
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        Toàn bộ khoản đóng góp được tính vào mục tiêu; bạn chọn
                        số tiền ở bước kế tiếp.
                      </p>
                      <p className="mt-2 text-xs text-ink-muted">
                        Không phát sinh phần bổ sung hoặc phí giao hàng.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <p className="eyebrow text-coral">Bước 2</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                {reward ? "Thêm phụ kiện" : "Chọn mức ủng hộ"}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {reward
                  ? "Phần bổ sung là tùy chọn và có thể bỏ qua."
                  : "Mức tối thiểu là 50.000 đ và không kèm quà."}
              </p>
              {reward ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {campaign.addOns.map((item) => {
                    const checked = addOnIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`cursor-pointer rounded-[12px] border p-4 ${checked ? "border-coral bg-[#fff8f4]" : "border-line"}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            name={`add-on-${item.id}`}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddOn(item.id)}
                            className="mt-1 size-4 accent-[#f36545]"
                          />
                          <div>
                            <p className="font-display text-sm font-extrabold">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-ink-muted">
                              {item.description}
                            </p>
                            <p className="mt-3 text-sm font-bold text-coral-dark">
                              + {formatVnd(item.amount)}
                            </p>
                            {item.requiresShipping ? (
                              <p className="mt-1 text-[11px] font-semibold text-forest">
                                Phụ kiện vật lý · tính giao cùng gói chính
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-lime/50 bg-[#f5f8e8] p-4 text-xs leading-5 text-[#53622f]">
                  Cảm ơn bạn đã chọn ủng hộ thuần túy. Phần bổ sung và phí giao
                  hàng được tự động bỏ khỏi tóm tắt.
                </div>
              )}
              <label className="mt-6 block">
                <span className="text-sm font-bold text-ink-soft">
                  {reward
                    ? "Góp thêm tự nguyện (đ)"
                    : "Số tiền muốn ủng hộ (đ)"}
                </span>
                <input
                  name="pledge-bonus"
                  type="number"
                  min={reward ? 0 : 50_000}
                  step="50000"
                  value={bonus}
                  onChange={(event) => setBonus(event.target.value)}
                  className="input-field mt-2"
                  aria-describedby="bonus-note"
                />
                <span
                  id="bonus-note"
                  className="mt-2 block text-xs text-ink-muted"
                >
                  {reward
                    ? "Khoản này không thay đổi gói quà bạn đã chọn."
                    : "Không phát sinh gói quà, phần bổ sung hoặc phí giao hàng."}
                </span>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="eyebrow text-coral">Bước 3</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                {needsShipping ? "Cách giao và địa chỉ nhận" : "Không cần giao hàng"}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {needsShipping
                  ? "Chọn đúng phương thức giao trước khi nhập địa chỉ tại Việt Nam."
                  : "Gói này không có quà vật lý nên hệ thống không hỏi địa chỉ và không cộng phí giao."}
              </p>
              {needsShipping ? (
                <>
                  <fieldset className="mt-6">
                    <legend className="text-sm font-bold text-ink-soft">
                      Phương thức giao
                    </legend>
                    <div className="mt-2 grid gap-2">
                      {shippingOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 ${shippingOptionId === option.id ? "border-coral bg-[#fff8f4]" : "border-line"}`}
                        >
                          <span className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="shipping-option"
                              value={option.id}
                              checked={shippingOptionId === option.id}
                              onChange={() => setShippingOptionId(option.id)}
                              className="mt-0.5 size-4 accent-[#f36545]"
                            />
                            <span>
                              <span className="block text-xs font-bold">
                                {option.name}
                              </span>
                              <span className="mt-1 block text-[11px] text-ink-muted">
                                Dự kiến {option.estimatedDaysMin}–{option.estimatedDaysMax} ngày
                              </span>
                            </span>
                          </span>
                          <span className="text-xs font-bold text-coral-dark">
                            {formatVnd(option.feeAmount)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-1">
                      <span className="text-sm font-bold text-ink-soft">
                        Họ và tên
                      </span>
                      <input
                        name="shipping-full-name"
                        value={address.fullName}
                        onChange={(event) =>
                          setAddress({ ...address, fullName: event.target.value })
                        }
                        className="input-field mt-2"
                        placeholder="Nguyễn Minh Anh"
                        autoComplete="name"
                        required
                        aria-invalid={
                          showStepErrors && address.fullName.trim().length < 2
                        }
                        aria-describedby={showStepErrors ? "pledge-step-errors" : undefined}
                      />
                    </label>
                    <label>
                      <span className="text-sm font-bold text-ink-soft">
                        Số điện thoại
                      </span>
                      <input
                        name="shipping-phone"
                        type="tel"
                        value={address.phone}
                        onChange={(event) =>
                          setAddress({ ...address, phone: event.target.value })
                        }
                        className="input-field mt-2"
                        placeholder="09xx xxx xxx"
                        autoComplete="tel"
                        required
                        aria-invalid={
                          showStepErrors &&
                          !/^0\d{9}$/.test(address.phone.replace(/\D/g, ""))
                        }
                        aria-describedby={showStepErrors ? "pledge-step-errors" : undefined}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-sm font-bold text-ink-soft">
                        Địa chỉ
                      </span>
                      <input
                        name="shipping-address-line1"
                        value={address.line1}
                        onChange={(event) =>
                          setAddress({ ...address, line1: event.target.value })
                        }
                        className="input-field mt-2"
                        placeholder="Số nhà, tên đường, phường/xã"
                        autoComplete="street-address"
                        required
                        aria-invalid={
                          showStepErrors && address.line1.trim().length < 5
                        }
                        aria-describedby={showStepErrors ? "pledge-step-errors" : undefined}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-sm font-bold text-ink-soft">
                        Tỉnh / Thành phố
                      </span>
                      <input
                        name="shipping-city"
                        value={address.city}
                        onChange={(event) =>
                          setAddress({ ...address, city: event.target.value })
                        }
                        className="input-field mt-2"
                        autoComplete="address-level1"
                        list="goi-y-tinh-thanh"
                        aria-label="Tỉnh hoặc thành phố nhận hàng"
                        placeholder="Ví dụ: Huế, Hà Nội, Cần Thơ…"
                        maxLength={80}
                        required
                        aria-invalid={showStepErrors && address.city.trim().length < 2}
                        aria-describedby={showStepErrors ? "shipping-city-hint pledge-step-errors" : "shipping-city-hint"}
                      />
                      <datalist id="goi-y-tinh-thanh">
                        <option value="TP. Hồ Chí Minh" />
                        <option value="Hà Nội" />
                        <option value="Đà Nẵng" />
                        <option value="Cần Thơ" />
                        <option value="Huế" />
                      </datalist>
                      <span id="shipping-city-hint" className="mt-2 block text-xs leading-5 text-ink-muted">Có thể tự nhập tỉnh/thành khác nếu không thấy trong gợi ý.</span>
                    </label>
                  </div>
                  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f4f6e8] p-4 text-xs leading-5 text-[#4c612d]">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Phí giao theo cách bạn chọn là {formatVnd(shippingAmount)}.
                      Hãy kiểm tra lại địa chỉ trước khi tiếp tục.
                    </span>
                  </div>
                </>
              ) : (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-lime/50 bg-[#f5f8e8] p-4 text-xs leading-5 text-[#53622f]">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {reward
                      ? `${reward.title} là gói quà số. Bạn có thể chuyển thẳng sang bước xác nhận.`
                      : "Khoản ủng hộ này không kèm quà. Bạn có thể chuyển thẳng sang bước xác nhận."}
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p className="eyebrow text-coral">Bước {needsShipping ? 4 : 3}</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                Kiểm tra và xác nhận
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Đối chiếu gói quà, phí giao và tổng cam kết trong phần tóm tắt trước khi
                lưu. Bước này không yêu cầu thông tin thẻ.
              </p>
              <dl className="mt-6 rounded-2xl border border-line bg-canvas-soft p-4 text-sm lg:hidden">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Gói đã chọn</dt>
                  <dd className="text-right font-semibold">{reward?.title ?? "Không nhận quà"}</dd>
                </div>
                <div className="mt-3 flex justify-between gap-4">
                  <dt className="text-ink-muted">Phần bổ sung và giao hàng</dt>
                  <dd className="text-right font-semibold">
                    {formatVnd(addOnAmount + shippingAmount)}
                  </dd>
                </div>
                <div className="mt-4 flex justify-between gap-4 border-t border-line pt-4">
                  <dt className="font-bold">Tổng cam kết mẫu</dt>
                  <dd className="font-display text-lg font-extrabold text-coral-dark">
                    {formatVnd(total)}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>Đây là bản dùng thử:</strong> số tiền được tính vào tiến độ
                  mẫu của dự án. Bạn không cần nhập thẻ; hệ thống không giữ hay
                  trừ tiền. Khi có thanh toán thật, chỉ chiến dịch đạt mục tiêu
                  mới được thu tiền.
                </span>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 text-sm leading-6 text-ink-soft">
                <input
                  type="checkbox"
                  name="understands-demo"
                  checked={understandsDemo}
                  onChange={(event) => setUnderstandsDemo(event.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-[#f36545]"
                  aria-describedby={showStepErrors ? "pledge-step-errors" : undefined}
                />
                Tôi hiểu đây là cam kết mẫu và không có khoản tiền nào được giữ
                hoặc thu.
              </label>
              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700"
                >
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          {showStepErrors ? (
            <div
              id="pledge-step-errors"
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
            >
              <p className="font-extrabold">Còn thiếu một chút thông tin:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {stepIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
            <button
              type="button"
              disabled={step === 0 || submitting}
              onClick={() => {
                setAttemptedStep(null);
                setStep((value) => value === 3 && !needsShipping ? 1 : Math.max(0, value - 1));
              }}
              className="button-ghost disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="size-4" /> Quay lại
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={goToNextStep}
                aria-describedby={showStepErrors ? "pledge-step-errors" : undefined}
                className="button-dark"
              >
                Tiếp tục <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  if (!canContinue) {
                    setAttemptedStep(step);
                    return;
                  }
                  void authorize();
                }}
                aria-describedby={showStepErrors ? "pledge-step-errors" : undefined}
                className="button-primary min-w-44 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" /> Đang xử lý
                  </>
                ) : (
                  <>
                    <Check className="size-4" /> Ghi nhận cam kết mẫu
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <aside className="rounded-[20px] border border-line bg-white p-5 lg:sticky lg:top-24 sm:p-6">
          <p className="eyebrow text-coral">Tóm tắt cam kết</p>
          <h2 className="mt-3 font-display text-lg font-extrabold leading-snug">
            {campaign.visual.label}
          </h2>
          <dl className="mt-6 space-y-3 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">
                {reward?.title ?? "Ủng hộ không nhận quà"}
              </dt>
              <dd className="font-bold">
                {reward ? formatVnd(reward.amount) : "—"}
              </dd>
            </div>
            {selectedAddOns.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <dt className="text-ink-muted">{item.title}</dt>
                <dd className="font-bold">{formatVnd(item.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Giao hàng</dt>
              <dd className="font-bold">
                {needsShipping
                  ? shippingOption
                    ? formatVnd(shippingAmount)
                    : "Chưa chọn"
                  : "Không cần giao"}
              </dd>
            </div>
            {bonusAmount ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  {reward ? "Góp thêm" : "Khoản ủng hộ"}
                </dt>
                <dd className="font-bold">{formatVnd(bonusAmount)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-end justify-between">
              <span className="font-bold">Tổng cam kết</span>
              <span className="font-display text-2xl font-extrabold text-coral-dark">
                {formatVnd(total)}
              </span>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-ink-muted">
              <LockKeyhole className="mt-0.5 size-3 shrink-0" /> Giá và phí được
              hệ thống kiểm tra lại trước khi ghi nhận.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
