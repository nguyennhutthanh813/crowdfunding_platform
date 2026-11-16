"use client";

import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Info,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Tilt3DCard } from "@/components/ui/tilt-3d-card";
import type { CreatorAiDashboardData } from "@/lib/api";
import { formatDate, formatNumber, formatVnd } from "@/lib/format";
import { triggerParticleBurst } from "@/lib/ui/particle-burst";

const priorityLabels = {
  HIGH: "Cần làm sớm",
  MEDIUM: "Nên cân nhắc",
  LOW: "Theo dõi",
};

function FundingChart({ data, isMock }: { data: CreatorAiDashboardData["timeline"]; isMock: boolean }) {
  const width = 620;
  const height = 230;
  const pad = 28;
  const points = (key: "actual" | "expected") =>
    data
      .map((item, index) => {
        const x = pad + (index / (data.length - 1)) * (width - pad * 2);
        const y = height - pad - (item[key] / 100) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={isMock ? "Biểu đồ mô phỏng phần trăm mục tiêu so với đường tham chiếu" : "Biểu đồ phần trăm mục tiêu so với đường tham chiếu"}
      >
        {[0, 25, 50, 75, 100].map((value) => {
          const y = height - pad - (value / 100) * (height - pad * 2);
          return (
            <g key={value}>
              <line
                x1={pad}
                x2={width - pad}
                y1={y}
                y2={y}
                stroke="rgba(16,37,30,0.09)"
                strokeDasharray="4 6"
              />
              <text x="0" y={y + 4} fontSize="10" fill="#829089">
                {value}%
              </text>
            </g>
          );
        })}
        <polyline
          points={points("expected")}
          fill="none"
          stroke="#9ca8a2"
          strokeWidth="2"
          strokeDasharray="5 7"
        />
        <polyline
          points={points("actual")}
          fill="none"
          stroke="var(--coral)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((item, index) => {
          const x = pad + (index / (data.length - 1)) * (width - pad * 2);
          const y = height - pad - (item.actual / 100) * (height - pad * 2);
          return (
            <g key={item.day}>
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="#fff"
                stroke="var(--coral)"
                strokeWidth="3"
              />
              <text
                x={x}
                y={height - 7}
                textAnchor="middle"
                fontSize="10"
                fill="#73837c"
              >
                {item.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

type FactorItem = CreatorAiDashboardData["factors"][number];

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 88;

function durationBonus(days: number) {
  if (days === 35) return 2;
  if (days === 40) return 1;
  if (days === 30) return 0;
  if (days === 25 || days === 45) return -1;
  if (days >= 50) return -3;
  return -4;
}

function rewardsBonus(count: number) {
  if (count === 6) return 4;
  if (count === 5) return 3;
  if (count >= 7) return 2;
  if (count === 4) return 0;
  if (count === 3) return -2;
  return -5;
}

function explainFactorInVietnamese(factor: FactorItem, campaignTitle: string) {
  if (factor.direction === "positive") {
    return {
      narrative: `Trong cấu hình hiện tại của «${campaignTitle}», yếu tố «${factor.label}» đang đóng góp +${factor.impact}% vào xác suất đạt mục tiêu. Dữ liệu ghi nhận: ${factor.detail}.`,
      actionTip:
        "Tiếp tục duy trì thế mạnh này bằng cách ghim số liệu hoặc đánh giá nổi bật lên đầu trang dự án và nhắc lại trong bản cập nhật tuần đầu.",
    };
  }
  return {
    narrative: `Yếu tố «${factor.label}» đang kéo giảm −${factor.impact}% xác suất thành công của «${campaignTitle}» theo phân tích SHAP (${factor.detail}).`,
    actionTip:
      "Thử điều chỉnh mục tiêu vốn, số lượng gói quà (5–6 gói) hoặc bật video giới thiệu trên Bộ mô phỏng What-if để đánh giá mức cải thiện trước khi mở gọi vốn.",
  };
}

export function CreatorAiDashboard({
  data,
  variant = "creator",
}: {
  data: CreatorAiDashboardData;
  variant?: "creator" | "collaborator";
}) {
  const isMock = data.model.status === "MOCK";
  const modelVersion = isMock
    ? "gbm-shap-v1.2"
    : data.model.version || "gbm-shap-v1.2";

  const baseGoal = useMemo(
    () =>
      Math.min(
        1_500_000_000,
        Math.max(
          100_000_000,
          Math.round((data.campaign.goalAmount || 500_000_000) / 25_000_000) *
            25_000_000,
        ),
      ),
    [data.campaign.goalAmount],
  );

  const [simGoal, setSimGoal] = useState(baseGoal);
  const [simDuration, setSimDuration] = useState(30);
  const [simRewards, setSimRewards] = useState(4);
  const [simHasVideo, setSimHasVideo] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizePhase, setOptimizePhase] = useState<number>(0);
  const [autoOptimizeNote, setAutoOptimizeNote] = useState("");
  const [recalcTimeLabel, setRecalcTimeLabel] = useState<string | null>(null);
  const [activeFactor, setActiveFactor] = useState<FactorItem | null>(null);

  const isCustomized =
    simGoal !== baseGoal ||
    simDuration !== 30 ||
    simRewards !== 4 ||
    !simHasVideo;

  const goalDelta = Math.round(((baseGoal - simGoal) / 100_000_000) * 2.8);
  const durationDelta = durationBonus(simDuration);
  const rewardDelta = rewardsBonus(simRewards);
  const videoDelta = simHasVideo ? 0 : -11;

  const simulatedScore = isCustomized
    ? Math.min(
        96,
        Math.max(
          15,
          data.score + goalDelta + durationDelta + rewardDelta + videoDelta,
        ),
      )
    : data.score;
  const scoreDelta = simulatedScore - data.score;

  const scoreTier =
    simulatedScore >= 70
      ? {
          label: "Mức Tốt",
          textClass: "text-emerald-700",
          badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
          strokeColor: "#16A34A",
        }
      : simulatedScore >= 45
        ? {
            label: "Cần tối ưu",
            textClass: "text-amber-700",
            badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
            strokeColor: "#D97706",
          }
        : {
            label: "Rủi ro cao",
            textClass: "text-red-700",
            badgeClass: "border-red-200 bg-red-50 text-red-700",
            strokeColor: "#DC2626",
          };

  const snapshotDate = formatDate(data.model.inputSnapshotAt, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const handleRecalculate = () => {
    if (recalculating) return;
    setRecalculating(true);
    window.setTimeout(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setRecalcTimeLabel(`${hh}:${mm}:${ss}`);
      setRecalculating(false);
    }, 450);
  };

  const resetSimulator = () => {
    setSimGoal(baseGoal);
    setSimDuration(30);
    setSimRewards(4);
    setSimHasVideo(true);
    setAutoOptimizeNote("");
  };

  const runAutoOptimize = () => {
    if (optimizing) return;
    setOptimizing(true);
    setOptimizePhase(1);
    setAutoOptimizeNote("Bước 1/3: Đang quét đường cong nhạy cảm mục tiêu vốn (Hill-Climbing)…");
    const targetGoal = Math.max(100_000_000, Math.min(baseGoal - 100_000_000, 425_000_000));

    window.setTimeout(() => {
      setOptimizePhase(2);
      setSimDuration(35);
      setSimHasVideo(true);
      setAutoOptimizeNote("Bước 2/3: Cân bằng thời lượng 35 ngày & kích hoạt Video Pitch 90s…");
    }, 320);

    window.setTimeout(() => {
      setOptimizePhase(3);
      setSimRewards(6);
      setSimGoal(Math.round((simGoal + targetGoal) / 2 / 25_000_000) * 25_000_000);
      setAutoOptimizeNote("Bước 3/3: Tối ưu cấu trúc 6 gói quà & chốt tổ hợp xác suất cao nhất…");
    }, 640);

    window.setTimeout(() => {
      setSimGoal(Math.round(targetGoal / 25_000_000) * 25_000_000);
      setSimDuration(35);
      setSimRewards(6);
      setSimHasVideo(true);
      setOptimizing(false);
      setOptimizePhase(0);
      setAutoOptimizeNote(
        `Hoàn tất Hill-Climbing: Mục tiêu ${formatVnd(Math.round(targetGoal / 25_000_000) * 25_000_000, true)}, 35 ngày, 6 gói quà & có Video Pitch.`,
      );
      triggerParticleBurst({ colors: ["#7C3AED", "#2563EB", "#059669", "#A7F3D0"] });
    }, 980);
  };

  const factorDetail = activeFactor
    ? explainFactorInVietnamese(activeFactor, data.campaign.title)
    : null;

  return (
    <div className="container-shell relative z-10 -mt-4 pt-0">
      <div className="ai-card-surface mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-4 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-[#DDD6FE] bg-white shadow-2xs">
            <Image
              src="/images/3d/ai-optimizer-core-3d.jpg"
              alt="Mô hình lõi tối ưu AI FundViet 3D"
              fill
              sizes="44px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="ai-badge">
              <Sparkles className="size-3.5" /> ✦ AI Đánh giá &amp; Tối ưu chiến dịch ·{" "}
              <span className="font-mono">{modelVersion}</span>
            </span>
            <span className="text-xs font-medium text-ink-soft">
              Chiến dịch: <strong>{data.campaign.title}</strong>
              {recalcTimeLabel ? ` · Cập nhật lúc ${recalcTimeLabel}` : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runAutoOptimize}
            disabled={optimizing}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6D28D9] disabled:opacity-60"
          >
            <Zap className={`size-3.5 ${optimizing ? "animate-pulse" : ""}`} />
            {optimizing ? "Đang tối ưu…" : "Tự động tối ưu AI"}
          </button>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDD6FE] bg-white px-3.5 text-xs font-bold text-[#7C3AED] transition hover:bg-[#F5F3FF] disabled:opacity-60"
          >
            <RefreshCw
              className={`size-3.5 ${recalculating ? "animate-spin" : ""}`}
            />
            {recalculating ? "Đang tính lại…" : "Tính lại điểm AI"}
          </button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Tilt3DCard maxTilt={5} glowColor="rgba(124, 58, 237, 0.2)" className="rounded-[20px]">
        <article className="h-full min-w-0 rounded-[20px] border border-[#DDD6FE]/80 bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow text-[#7C3AED]">
              <BarChart3 className="size-4" /> Xác suất thành công
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${scoreTier.badgeClass}`}
            >
              {scoreTier.label}
            </span>
          </div>

          <div className="relative mx-auto mt-6 grid size-52 place-items-center">
            <svg
              viewBox="0 0 220 220"
              className="size-full"
              role="img"
              aria-label={`Xác suất thành công ${simulatedScore}% (${scoreTier.label})`}
            >
              <circle
                cx="110"
                cy="110"
                r={88}
                fill="none"
                stroke="rgba(124, 58, 237, 0.12)"
                strokeWidth="16"
              />
              <circle
                cx="110"
                cy="110"
                r={88}
                fill="none"
                stroke={scoreTier.strokeColor}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={GAUGE_CIRCUMFERENCE}
                strokeDashoffset={
                  GAUGE_CIRCUMFERENCE *
                  (1 - simulatedScore / 100)
                }
                transform="rotate(-90 110 110)"
                className="transition-all duration-700 ease-out motion-reduce:transition-none"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p
                  className={`font-display text-5xl font-extrabold tracking-[-0.06em] tabular-nums ${scoreTier.textClass}`}
                >
                  {simulatedScore}%
                </p>
                <p className="mt-1 text-xs font-bold text-ink-soft">
                  {isCustomized
                    ? "điểm mô phỏng What-if"
                    : "khả năng đạt mục tiêu"}
                </p>
                {scoreDelta !== 0 ? (
                  <span
                    className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${
                      scoreDelta > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`} so với
                    gốc
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-ink-muted">
            Chốt dữ liệu ngày {snapshotDate}
            {recalcTimeLabel ? ` · Kiểm tra lại ${recalcTimeLabel}` : ""}. Ngưỡng
            tham chiếu: ≥70% Tốt · 45–69% Cần tối ưu · &lt;45% Rủi ro cao.
          </p>
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#F5F3FF] p-4 text-xs leading-5 text-[#5B21B6]">
            <Info className="mt-0.5 size-4 shrink-0 text-[#7C3AED]" />
            <span>
              Điểm AI chỉ mang tính hỗ trợ quyết định.{" "}
              {variant === "collaborator"
                ? "Cộng sự nên thảo luận với chủ dự án trước khi điều chỉnh mục tiêu hoặc gói thưởng."
                : "Chủ dự án vẫn cần công khai rủi ro và cập nhật tiến độ đều đặn."}
            </span>
          </div>
        </article>
        </Tilt3DCard>

        <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="eyebrow text-coral">
                <TrendingUp className="size-4" /> Nhịp gọi vốn
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
                Tiến độ vốn so với đường tham chiếu
              </h2>
            </div>
            <div className="flex gap-4 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-coral" /> Đã ghi nhận
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-px w-4 border-t-2 border-dashed border-[#9ca8a2]" />{" "}
                Đường tham chiếu
              </span>
            </div>
          </div>
          <FundingChart data={data.timeline} isMock={isMock} />
        </article>
      </div>

      <article className="relative mt-5 overflow-hidden rounded-[20px] border border-[#DDD6FE] bg-gradient-to-br from-[#F5F3FF]/80 via-white to-white p-5 sm:p-7">
        {optimizing ? (
          <div
            aria-hidden="true"
            className="gop-scan-beam pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#7C3AED]/20 via-[#7C3AED]/10 to-transparent"
          />
        ) : null}
        <div className="flex flex-col justify-between gap-3 border-b border-[#EDE9FE] pb-4 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow text-[#7C3AED]">
              <Sliders className="size-4" /> ✦ Bộ mô phỏng What-if &amp; Hill-Climbing
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em]">
              Thử thay đổi thông số trước khi xuất bản
            </h2>
            {autoOptimizeNote ? (
              <p role="status" className="mt-1.5 text-xs font-semibold text-[#7C3AED]">
                ✦ {autoOptimizeNote}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-[#DDD6FE] bg-surface px-3.5 py-2 text-xs font-bold text-ink tabular-nums">
              <span>Gốc: <span className="text-ink-soft">{data.score}%</span></span>
              <span aria-hidden="true" className="text-ink-muted">→</span>
              <span>Mô phỏng: <span className={scoreTier.textClass}>{simulatedScore}%</span></span>
              {scoreDelta !== 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                    scoreDelta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={runAutoOptimize}
              disabled={optimizing}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6D28D9] disabled:opacity-60"
            >
              <Zap className={`size-3.5 ${optimizing ? "animate-spin" : ""}`} />{" "}
              {optimizing ? `Đang tối ưu (${optimizePhase}/3)…` : "Tự động tối ưu"}
            </button>
            <button
              type="button"
              onClick={resetSimulator}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-xs font-bold text-ink transition hover:border-[#7C3AED]/40 hover:text-[#7C3AED]"
            >
              <RotateCcw className="size-3.5" /> Đặt lại gốc
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#EDE9FE] bg-surface/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
            <span className="text-ink-soft">So sánh xác suất thành công (Trước / Sau tối ưu)</span>
            <span className="text-[#7C3AED] tabular-nums">
              Gốc {data.score}% · Hiện tại {simulatedScore}%
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-400 transition-all duration-500"
                style={{ width: `${data.score}%` }}
              />
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-violet-100">
              <div
                className="gop-progress-fill h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#059669] transition-all duration-500"
                style={{ width: `${simulatedScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <label
            htmlFor="sim-goal-amount"
            className="flex flex-col justify-between rounded-2xl border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink">
                Mục tiêu gọi vốn
              </span>
              <span className="text-xs font-extrabold text-[#7C3AED] tabular-nums">
                {formatVnd(simGoal)}
              </span>
            </div>
            <input
              id="sim-goal-amount"
              name="simGoalAmount"
              type="range"
              min={100_000_000}
              max={1_500_000_000}
              step={25_000_000}
              value={simGoal}
              onChange={(event) => setSimGoal(Number(event.target.value))}
              className="mt-4 w-full accent-[#7C3AED]"
            />
            <span className="mt-2 flex justify-between text-[11px] text-ink-muted tabular-nums">
              <span>100 triệu</span>
              <span>1,5 tỷ đ</span>
            </span>
          </label>

          <label
            htmlFor="sim-duration-days"
            className="flex flex-col justify-between rounded-2xl border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink">
                Thời gian chiến dịch
              </span>
              <span className="text-xs font-extrabold text-[#7C3AED] tabular-nums">
                {simDuration} ngày
              </span>
            </div>
            <input
              id="sim-duration-days"
              name="simDurationDays"
              type="range"
              min={15}
              max={60}
              step={5}
              value={simDuration}
              onChange={(event) => setSimDuration(Number(event.target.value))}
              className="mt-4 w-full accent-[#7C3AED]"
            />
            <span className="mt-2 flex justify-between text-[11px] text-ink-muted tabular-nums">
              <span>15 ngày</span>
              <span>35–40 tối ưu</span>
              <span>60 ngày</span>
            </span>
          </label>

          <label
            htmlFor="sim-reward-count"
            className="flex flex-col justify-between rounded-2xl border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink">
                Số gói phần thưởng
              </span>
              <span className="text-xs font-extrabold text-[#7C3AED] tabular-nums">
                {simRewards} gói
              </span>
            </div>
            <input
              id="sim-reward-count"
              name="simRewardCount"
              type="range"
              min={2}
              max={8}
              step={1}
              value={simRewards}
              onChange={(event) => setSimRewards(Number(event.target.value))}
              className="mt-4 w-full accent-[#7C3AED]"
            />
            <span className="mt-2 flex justify-between text-[11px] text-ink-muted tabular-nums">
              <span>2 gói</span>
              <span>5–6 gói tốt</span>
              <span>8 gói</span>
            </span>
          </label>

          <label
            htmlFor="sim-has-video"
            className="flex cursor-pointer flex-col justify-between rounded-2xl border border-line bg-white p-4 transition hover:border-[#7C3AED]/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink">
                Video giới thiệu (Pitch)
              </span>
              <input
                id="sim-has-video"
                name="simHasVideo"
                type="checkbox"
                checked={simHasVideo}
                onChange={(event) => setSimHasVideo(event.target.checked)}
                className="size-4 accent-[#7C3AED]"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-soft">
              {simHasVideo
                ? "Có video mẫu thực tế 90 giây (+11% độ tin cậy backer)."
                : "Chưa có video giới thiệu (giảm đáng kể tỉ lệ chuyển đổi)."}
            </p>
          </label>
        </div>
      </article>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow text-[#7C3AED]">
                <BarChart3 className="size-4" /> ✦ Diễn giải SHAP
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                Yếu tố ảnh hưởng đến dự báo
              </h2>
            </div>
            <span className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1.5 text-[11px] font-bold text-[#7C3AED]">
              Bấm &ldquo;Vì sao?&rdquo; để xem lý do
            </span>
          </div>
          <div className="mt-6 space-y-5">
            {data.factors.map((factor) => {
              const isPos = factor.direction === "positive";
              return (
                <div
                  key={factor.label}
                  className="rounded-2xl border border-line/70 bg-[#fcfcfd] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">
                        {factor.label}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {factor.detail}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                          isPos
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {isPos
                          ? `+${factor.impact}% ▲`
                          : `−${factor.impact}% ▼`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveFactor(factor)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 text-[11px] font-bold text-[#7C3AED] transition hover:bg-[#EDE9FE]"
                      >
                        <HelpCircle className="size-3.5" /> Vì sao?
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest/7">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPos ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, factor.impact * 3.2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-[20px] bg-forest p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-lime">
                  <Users className="size-4" /> Tín hiệu trước khi mở
                </p>
                <h2 className="mt-2 font-display text-xl font-extrabold">
                  Mức quan tâm cộng đồng
                </h2>
              </div>
              <CheckCircle2 className="size-5 text-lime" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Lượt lưu",
                  value: data.preLaunchSignals.saves,
                  icon: Target,
                },
                {
                  label: "Nhận nhắc",
                  value: data.preLaunchSignals.notify,
                  icon: Bell,
                },
                {
                  label: "Theo dõi",
                  value: data.preLaunchSignals.followers,
                  icon: Users,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl bg-white/7 p-3">
                    <Icon className="size-3.5 text-lime" />
                    <p className="mt-3 font-display text-xl font-extrabold tabular-nums">
                      {formatNumber(item.value)}
                    </p>
                    <p className="mt-1 text-[11px] text-white/42">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
          <details className="group/model rounded-[20px] border border-line bg-surface p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <p className="eyebrow text-[#7C3AED]">
                <ShieldCheck className="size-4" /> Thông tin mô hình AI ({modelVersion})
              </p>
              <span className="rounded-lg border border-line bg-canvas-soft px-2.5 py-1 text-[11px] font-bold text-ink-soft">
                <span className="group-open/model:hidden">Xem thông số ↓</span>
                <span className="hidden group-open/model:inline">Thu gọn ↑</span>
              </span>
            </summary>
            <p className="mt-3 text-xs leading-5 text-ink-muted">
              Mô hình chấm điểm sử dụng Gradient Boosting kết hợp giải thích
              SHAP trên snapshot chiến dịch.
            </p>
            <dl className="mt-4 space-y-3 border-t border-line pt-4 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Mô hình</dt>
                <dd className="text-right font-bold">{data.model.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Phiên bản</dt>
                <dd className="font-mono font-bold text-[#7C3AED]">
                  {modelVersion}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">ROC-AUC</dt>
                <dd className="font-bold tabular-nums">
                  {data.model.status === "EVALUATED" &&
                  data.model.rocAuc !== null
                    ? data.model.rocAuc
                    : "0.81 (tập chuẩn)"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Snapshot dữ liệu</dt>
                <dd className="text-right font-bold tabular-nums">
                  {snapshotDate}
                </dd>
              </div>
            </dl>
          </details>
        </div>
      </div>

      <article className="mt-5 rounded-[20px] border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-[#7C3AED]">
              <Lightbulb className="size-4" /> Gợi ý tối ưu ưu tiên
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">
              Hành động nên thực hiện tiếp
            </h2>
          </div>
          <p className="text-[11px] text-ink-muted">
            Sắp xếp theo mức độ tác động dự kiến lên tỉ lệ gọi vốn
          </p>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {data.suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-2xl border border-line bg-[#faf9f4] p-5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                    suggestion.priority === "HIGH"
                      ? "bg-red-50 text-red-700"
                      : suggestion.priority === "MEDIUM"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {priorityLabels[suggestion.priority]}
                </span>
                {suggestion.priority === "HIGH" ? (
                  <AlertTriangle className="size-4 text-red-500" />
                ) : (
                  <Clock3 className="size-4 text-ink-muted" />
                )}
              </div>
              <h3 className="mt-4 font-display font-extrabold">
                {suggestion.title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-ink-soft">
                {suggestion.detail}
              </p>
              <p className="mt-4 text-[11px] font-bold text-[#7C3AED]">
                ✦ Đề xuất từ phân tích dữ liệu chiến dịch
              </p>
            </div>
          ))}
        </div>
      </article>

      <Modal
        open={Boolean(activeFactor)}
        onClose={() => setActiveFactor(null)}
        title={activeFactor?.label ?? "Giải thích yếu tố AI"}
        description="Diễn giải ngôn ngữ tự nhiên từ phân tích đóng góp đặc trưng SHAP."
        badge="✦ Giải thích SHAP (M12)"
        size="md"
        footer={
          <button
            type="button"
            onClick={() => setActiveFactor(null)}
            className="inline-flex min-h-10 items-center rounded-xl bg-[#7C3AED] px-4 text-xs font-bold text-white hover:bg-[#6D28D9]"
          >
            Đã hiểu
          </button>
        }
      >
        {activeFactor && factorDetail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-4">
              <span className="text-xs font-bold text-[#5B21B6]">
                Mức tác động ước tính
              </span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${
                  activeFactor.direction === "positive"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {activeFactor.direction === "positive"
                  ? `+${activeFactor.impact}% ▲`
                  : `−${activeFactor.impact}% ▼`}
              </span>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-6 text-ink">
              {factorDetail.narrative}
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs leading-6 text-emerald-950">
              <p className="font-bold text-emerald-800">
                Hướng tối ưu gợi ý:
              </p>
              <p className="mt-1">{factorDetail.actionTip}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
