import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Info,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CreatorAiDashboardData } from "@/lib/api";
import {
  formatNumber,
  formatVietnameseDateTime,
  formatVnd,
  fundingPercent,
} from "@/lib/format";

const priorityLabels = {
  HIGH: "Cần làm sớm",
  MEDIUM: "Nên cân nhắc",
  LOW: "Theo dõi",
};

const riskLabels: Record<
  CreatorAiDashboardData["riskLevel"],
  { label: string; className: string }
> = {
  LOW: {
    label: "RỦI RO THẤP",
    className: "bg-emerald-50 text-emerald-700",
  },
  MEDIUM: {
    label: "RỦI RO TRUNG BÌNH",
    className: "bg-amber-50 text-amber-700",
  },
  HIGH: {
    label: "RỦI RO CAO",
    className: "bg-red-50 text-red-700",
  },
};

function toChartPercent(value: number, goalAmount: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const pct =
    value > 100 && goalAmount > 0 ? (value / goalAmount) * 100 : value;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function FundingChart({
  data,
  goalAmount,
}: {
  data: CreatorAiDashboardData["timeline"];
  goalAmount: number;
}) {
  const width = 620;
  const height = 230;
  const pad = 28;
  const normalized = data.map((item) => ({
    day: item.day,
    actual: toChartPercent(item.actual, goalAmount),
    expected: toChartPercent(item.expected, goalAmount),
  }));
  const stepDivisor = Math.max(1, normalized.length - 1);
  const points = (key: "actual" | "expected") =>
    normalized
      .map((item, index) => {
        const x = pad + (index / stepDivisor) * (width - pad * 2);
        const y = height - pad - (item[key] / 100) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="mt-5 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[560px]"
        role="img"
        aria-label="Biểu đồ phần trăm mục tiêu thực tế so với kỳ vọng"
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
        {normalized.map((item, index) => {
          const x = pad + (index / stepDivisor) * (width - pad * 2);
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

export function CreatorAiDashboard({
  data,
  variant = "creator",
}: {
  data: CreatorAiDashboardData;
  variant?: "creator" | "collaborator";
}) {
  const phase =
    data.phase ??
    (["DRAFT", "IN_REVIEW", "PRE_LAUNCH", "CHANGES_REQUESTED"].includes(
      data.campaign.status,
    )
      ? "PREPARATION"
      : data.campaign.status === "LIVE"
        ? "LIVE"
        : "ENDED");

  const scoreTone =
    data.score >= 75
      ? "text-emerald-700"
      : data.score >= 55
        ? "text-amber-700"
        : "text-red-700";
  const riskBadge = riskLabels[data.riskLevel] ?? riskLabels.MEDIUM;
  const raisedPct = fundingPercent(
    data.campaign.pledgedAmount,
    data.campaign.goalAmount,
  );
  const lastPoint = data.timeline[data.timeline.length - 1];
  const latestActualPct = lastPoint
    ? toChartPercent(lastPoint.actual, data.campaign.goalAmount)
    : 0;
  const latestExpectedPct = lastPoint
    ? toChartPercent(lastPoint.expected, data.campaign.goalAmount)
    : 0;
  const chartHeadline =
    phase === "ENDED"
      ? latestActualPct >= 100
        ? "Chiến dịch đã hoàn thành mục tiêu"
        : "Tổng kết tiến độ gọi vốn"
      : latestActualPct >= latestExpectedPct
        ? "Thực tế đang đi trước đường kỳ vọng"
        : "Thực tế đang chậm hơn đường kỳ vọng";

  const pace = data.paceMetrics;
  const readiness = data.readinessItems ?? [];
  const readinessDoneCount = readiness.filter((item) => item.done).length;

  return (
    <div className="container-shell -mt-4 relative z-10 pt-0">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <article className="min-w-0 rounded-[20px] border border-line bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow text-coral">
              <Sparkles className="size-4" />{" "}
              {phase === "PREPARATION"
                ? "Mức độ sẵn sàng"
                : "Đánh giá hiện tại"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${riskBadge.className}`}
            >
              {riskBadge.label}
            </span>
          </div>
          <p
            className="mt-3 truncate text-xs font-bold text-ink"
            title={data.campaign.title}
          >
            {data.campaign.title}
          </p>
          <div
            className="mx-auto mt-8 grid size-52 place-items-center rounded-full p-4"
            style={{
              background: `conic-gradient(var(--coral) ${data.score * 3.6}deg, rgba(16,37,30,0.08) 0deg)`,
            }}
          >
            <div className="grid size-full place-items-center rounded-full bg-[#fbfaf6] text-center">
              <div>
                <p
                  className={`font-display text-6xl font-extrabold tracking-[-0.07em] ${scoreTone}`}
                >
                  {data.score}%
                </p>
                <p className="mt-1 text-xs font-bold text-ink-soft">
                  {phase === "PREPARATION"
                    ? "độ sẵn sàng mở bán"
                    : "khả năng đạt mục tiêu"}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-7 text-center text-xs leading-5 text-ink-muted">
            {phase === "PREPARATION" ? (
              <>
                Mục tiêu gọi vốn{" "}
                <strong className="text-ink">
                  {formatVnd(data.campaign.goalAmount, true)}
                </strong>{" "}
                · Đánh giá dựa trên hồ sơ chuẩn bị và tín hiệu quan tâm trước mở bán.
              </>
            ) : (
              <>
                Đã huy động{" "}
                <strong className="text-ink">
                  {formatVnd(data.campaign.pledgedAmount, true)}
                </strong>{" "}
                ({raisedPct}% mục tiêu) từ{" "}
                <strong className="text-ink">
                  {formatNumber(data.campaign.backerCount)}
                </strong>{" "}
                lượt ủng hộ.
              </>
            )}
          </p>
          <p className="mt-2 text-center text-[11px] text-ink-muted">
            Cập nhật lúc {formatVietnameseDateTime(data.model.evaluatedAt)}
          </p>
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f2f6e8] p-4 text-xs leading-5 text-[#53622f]">
            <Info className="mt-0.5 size-4 shrink-0" /> Kết quả hỗ trợ tham khảo theo dữ liệu hiện tại, không phải cam kết kết quả.{" "}
            {variant === "collaborator"
              ? "Nhóm vẫn cần trao đổi với chủ dự án trước khi đổi kế hoạch."
              : "Chủ dự án vẫn cần theo dõi thực tế và cập nhật tiến độ thường xuyên."}
          </div>
        </article>

        {phase === "PREPARATION" ? (
          <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="eyebrow text-coral">
                  <ClipboardCheck className="size-4" /> Hồ sơ trước mở bán
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
                  Kiểm tra độ sẵn sàng trước khi gọi vốn
                </h2>
                <p className="mt-1.5 text-xs text-ink-muted">
                  Chiến dịch chưa mở nhận tiền nên chưa phát sinh biểu đồ dòng tiền theo ngày.
                </p>
              </div>
              {readiness.length > 0 ? (
                <span className="shrink-0 rounded-full bg-[#f2f6e8] px-3 py-1.5 text-xs font-bold text-[#53622f]">
                  Đạt {readinessDoneCount}/{readiness.length} hạng mục
                </span>
              ) : null}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {readiness.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    item.done
                      ? "border-emerald-200/70 bg-emerald-50/40"
                      : "border-amber-200/80 bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-ink">{item.label}</p>
                    {item.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ) : (
          <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="eyebrow text-coral">
                  <TrendingUp className="size-4" /> Nhịp gọi vốn tích lũy
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
                  {chartHeadline}
                </h2>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Trục dọc: % mục tiêu vốn · Trục ngang: số ngày kể từ lúc mở bán
                </p>
              </div>
              <div className="flex gap-4 text-[10px] text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-coral" /> Thực tế tích lũy
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-px w-4 border-t-2 border-dashed border-[#9ca8a2]" />{" "}
                  Kỳ vọng tuyến tính
                </span>
              </div>
            </div>
            <FundingChart
              data={data.timeline}
              goalAmount={data.campaign.goalAmount}
            />
            {pace ? (
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Thời gian
                  </p>
                  <p className="mt-1 font-display text-sm font-extrabold text-ink">
                    Ngày {pace.elapsedDays}/{pace.totalDays}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {pace.daysLeft > 0 ? `Còn ${pace.daysLeft} ngày` : "Đã hết hạn"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Tốc độ hiện tại
                  </p>
                  <p className="mt-1 font-display text-sm font-extrabold text-ink">
                    {formatVnd(pace.dailyAverageAmount, true)}/ngày
                  </p>
                  <p className="text-[11px] text-ink-muted">Trung bình thực tế</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Cần đạt mỗi ngày
                  </p>
                  <p className="mt-1 font-display text-sm font-extrabold text-ink">
                    {pace.requiredDailyAmount === 0
                      ? "Đã đủ 100%"
                      : `${formatVnd(pace.requiredDailyAmount, true)}/ngày`}
                  </p>
                  <p className="text-[11px] text-ink-muted">Để về đích đúng hạn</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Ước tính cuối kỳ
                  </p>
                  <p className="mt-1 font-display text-sm font-extrabold text-ink">
                    {pace.projectedPercent}% mục tiêu
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    ~{formatVnd(pace.projectedAmount, true)}
                  </p>
                </div>
              </div>
            ) : null}
          </article>
        )}
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-coral">
                <BarChart3 className="size-4" /> Yếu tố ảnh hưởng
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                {phase === "PREPARATION"
                  ? "Các yếu tố cấu thành hồ sơ"
                  : "Các yếu tố tác động đến tiến độ"}
              </h2>
            </div>
            <span className="hidden rounded-full border border-line px-3 py-1.5 text-[10px] font-bold text-ink-muted sm:block">
              {phase === "PREPARATION" ? "Giai đoạn chuẩn bị" : "Giai đoạn gọi vốn"}
            </span>
          </div>
          <div className="mt-7 space-y-6">
            {data.factors.map((factor) => {
              const impactPoints =
                factor.impact <= 1
                  ? Math.round(factor.impact * 100)
                  : Math.round(factor.impact);
              return (
                <div key={factor.label}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {factor.label}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {factor.detail}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${factor.direction === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {factor.direction === "positive" ? "+" : "−"}
                      {impactPoints} điểm
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest/7">
                    <div
                      className={`h-full rounded-full ${factor.direction === "positive" ? "bg-emerald-500" : "bg-coral"}`}
                      style={{
                        width: `${Math.min(100, impactPoints * 2.5)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <div className="space-y-5">
          {phase === "PREPARATION" ? (
            <article className="rounded-[20px] bg-forest p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-lime">
                    <Users className="size-4" /> Tín hiệu trước khi mở
                  </p>
                  <h2 className="mt-2 font-display text-xl font-extrabold">
                    Mức quan tâm trước ngày gọi vốn
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
                      <p className="mt-3 font-display text-xl font-extrabold">
                        {formatNumber(item.value)}
                      </p>
                      <p className="mt-1 text-[10px] text-white/42">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>
          ) : (
            <article className="rounded-[20px] bg-forest p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-lime">
                    <TrendingUp className="size-4" /> Động lực gần đây
                  </p>
                  <h2 className="mt-2 font-display text-xl font-extrabold">
                    Hoạt động trong 7 ngày qua
                  </h2>
                </div>
                <CheckCircle2 className="size-5 text-lime" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/7 p-3">
                  <Target className="size-3.5 text-lime" />
                  <p className="mt-3 font-display text-xl font-extrabold">
                    {formatNumber(pace?.pledgeCountLast7Days ?? 0)}
                  </p>
                  <p className="mt-1 text-[10px] text-white/42">
                    Lượt góp 7 ngày
                  </p>
                </div>
                <div className="rounded-2xl bg-white/7 p-3">
                  <TrendingUp className="size-3.5 text-lime" />
                  <p className="mt-3 font-display text-xl font-extrabold">
                    {formatVnd(pace?.amountLast7Days ?? 0, true)}
                  </p>
                  <p className="mt-1 text-[10px] text-white/42">
                    Tiền vào 7 ngày
                  </p>
                </div>
                <div className="rounded-2xl bg-white/7 p-3">
                  <Users className="size-3.5 text-lime" />
                  <p className="mt-3 font-display text-xl font-extrabold">
                    {formatNumber(data.preLaunchSignals.saves)}
                  </p>
                  <p className="mt-1 text-[10px] text-white/42">Lượt lưu</p>
                </div>
              </div>
            </article>
          )}

          <article className="rounded-[20px] border border-line bg-white p-6">
            <p className="eyebrow text-coral">
              <Target className="size-4" /> Tóm tắt chỉ số chiến dịch
            </p>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Danh mục</dt>
                <dd className="text-right font-bold">{data.campaign.category}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Mục tiêu vốn</dt>
                <dd className="font-bold">{formatVnd(data.campaign.goalAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Đã huy động</dt>
                <dd className="font-bold text-emerald-700">
                  {formatVnd(data.campaign.pledgedAmount)} ({raisedPct}%)
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Người ủng hộ</dt>
                <dd className="font-bold">
                  {formatNumber(data.campaign.backerCount)} lượt
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Thời gian còn lại</dt>
                <dd className="font-bold">
                  {data.campaign.daysLeft > 0
                    ? `${data.campaign.daysLeft} ngày`
                    : "Đã kết thúc"}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </div>

      <article className="mt-5 rounded-[20px] border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-coral">
              <Lightbulb className="size-4" /> Việc nên làm tiếp
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">
              Việc nên làm từ các yếu tố ảnh hưởng
            </h2>
          </div>
          <p className="text-[11px] text-ink-muted">
            Gợi ý tham khảo cho chủ dự án dựa trên trạng thái hồ sơ hiện tại
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
                  className={`rounded-full px-2 py-1 text-[9px] font-bold ${suggestion.priority === "HIGH" ? "bg-red-50 text-red-700" : suggestion.priority === "MEDIUM" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
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
              <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-coral-dark">
                Căn cứ từ dữ liệu chiến dịch
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
