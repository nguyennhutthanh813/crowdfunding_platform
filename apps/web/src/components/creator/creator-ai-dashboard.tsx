import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Info,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CreatorAiDashboardData } from "@/lib/api";
import { formatNumber } from "@/lib/format";

const priorityLabels = {
  HIGH: "Cần làm sớm",
  MEDIUM: "Nên cân nhắc",
  LOW: "Theo dõi",
};

function FundingChart({ data }: { data: CreatorAiDashboardData["timeline"] }) {
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

export function CreatorAiDashboard({
  data,
  variant = "creator",
}: {
  data: CreatorAiDashboardData;
  variant?: "creator" | "collaborator";
}) {
  const scoreTone =
    data.score >= 75
      ? "text-emerald-700"
      : data.score >= 55
        ? "text-amber-700"
        : "text-red-700";
  return (
    <div className="container-shell -mt-4 relative z-10 pt-0">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <article className="min-w-0 rounded-[20px] border border-line bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-coral">
              <Sparkles className="size-4" /> Dự báo hôm nay
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              RỦI RO THẤP
            </span>
          </div>
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
                  khả năng đạt mục tiêu
                </p>
              </div>
            </div>
          </div>
          <p className="mt-7 text-center text-xs leading-5 text-ink-muted">
            Cao hơn <strong className="text-ink">14 điểm</strong> so với lần
            đánh giá trước khi mở gọi vốn.
          </p>
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f2f6e8] p-4 text-xs leading-5 text-[#53622f]">
            <Info className="mt-0.5 size-4 shrink-0" /> Dự báo không phải lời
            đảm bảo.{" "}
            {variant === "collaborator"
              ? "Nhóm vẫn cần trao đổi với chủ dự án trước khi đổi kế hoạch."
              : "Chủ dự án vẫn cần công khai rủi ro và cập nhật tiến độ."}
          </div>
        </article>

        <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="eyebrow text-coral">
                <TrendingUp className="size-4" /> Nhịp gọi vốn
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
                Thực tế đang đi trước đường kỳ vọng
              </h2>
            </div>
            <div className="flex gap-4 text-[10px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-coral" /> Thực tế
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-px w-4 border-t-2 border-dashed border-[#9ca8a2]" />{" "}
                Kỳ vọng
              </span>
            </div>
          </div>
          <FundingChart data={data.timeline} />
        </article>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-coral">
                <BarChart3 className="size-4" /> Yếu tố ảnh hưởng
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                Yếu tố đang tác động đến dự báo
              </h2>
            </div>
            <span className="hidden rounded-full border border-line px-3 py-1.5 text-[10px] font-bold text-ink-muted sm:block">
              SHAP · giải thích từng yếu tố
            </span>
          </div>
          <div className="mt-7 space-y-6">
            {data.factors.map((factor) => (
              <div key={factor.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-ink">{factor.label}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {factor.detail}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${factor.direction === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {factor.direction === "positive" ? "+" : "−"}
                    {factor.impact} điểm
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest/7">
                  <div
                    className={`h-full rounded-full ${factor.direction === "positive" ? "bg-emerald-500" : "bg-coral"}`}
                    style={{ width: `${Math.min(100, factor.impact * 3.2)}%` }}
                  />
                </div>
              </div>
            ))}
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
          <article className="rounded-[20px] border border-line bg-white p-6">
            <p className="eyebrow text-coral">
              <ShieldCheck className="size-4" /> Mô hình dự kiến
            </p>
            <p className="mt-3 text-xs leading-5 text-ink-muted">
              Số liệu dưới đây dùng để minh họa giao diện, chưa phải kết quả
              huấn luyện hoặc kiểm thử mô hình của nhóm.
            </p>
            <dl className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Mô hình</dt>
                <dd className="text-right font-bold">{data.model.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Phiên bản</dt>
                <dd className="font-mono font-bold">{data.model.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">ROC-AUC minh họa</dt>
                <dd className="font-bold text-emerald-700">
                  {data.model.rocAuc}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Nguồn</dt>
                <dd className="font-bold">Dữ liệu mẫu</dd>
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
            Xác suất minh họa, không dùng để quyết định góp tiền
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
