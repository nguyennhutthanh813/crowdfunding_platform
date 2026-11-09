import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Info,
  Lightbulb,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CreatorAiDashboardData } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

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
    <div className="mt-5 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[560px]"
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
  const isMock = data.model.status === "MOCK";
  const snapshotDate = formatDate(data.model.inputSnapshotAt, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const riskLabel = `${isMock ? "Rủi ro giả định" : "Rủi ro dự báo"} ${{
    LOW: "thấp",
    MEDIUM: "vừa",
    HIGH: "cao",
  }[data.riskLevel]}`;
  return (
    <div className="container-shell -mt-4 relative z-10 pt-0">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <article className="min-w-0 rounded-[20px] border border-line bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-coral">
              <BarChart3 className="size-4" /> {isMock ? "Kịch bản mẫu" : "Dự báo chiến dịch"}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              {riskLabel}
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
                  {isMock ? "xác suất minh họa" : "khả năng đạt mục tiêu"}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-7 text-center text-xs leading-5 text-ink-muted">
            {isMock
              ? `Mốc dữ liệu giả định: ${snapshotDate}. Số ${data.score}% chỉ minh họa cách trình bày; nhóm chưa đo độ chính xác của mô hình.`
              : `Dữ liệu đầu vào chốt ngày ${snapshotDate}. Xem thêm kết quả đánh giá trước khi dùng dự báo.`}
          </p>
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f2f6e8] p-4 text-xs leading-5 text-[#53622f]">
            <Info className="mt-0.5 size-4 shrink-0" /> {isMock ? "Đây chưa phải xác suất tính từ mô hình đã huấn luyện." : "Dự báo không đảm bảo chiến dịch sẽ đạt mục tiêu."}{" "}
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
                {isMock ? "Tiến độ vốn trong kịch bản mẫu" : "Tiến độ vốn so với tham chiếu"}
              </h2>
            </div>
            <div className="flex gap-4 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-coral" /> {isMock ? "Dữ liệu mẫu" : "Đã ghi nhận"}
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

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-coral">
                <BarChart3 className="size-4" /> Yếu tố ảnh hưởng
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                {isMock ? "Giả định về các yếu tố ảnh hưởng" : "Yếu tố ảnh hưởng đến dự báo"}
              </h2>
            </div>
            <span className="hidden rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-ink-muted sm:block">
              {isMock ? "Chưa có giải thích từ mô hình" : "Diễn giải của mô hình"}
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
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${factor.direction === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {factor.direction === "positive" ? "+" : "−"}
                    {factor.impact} điểm{isMock ? " giả định" : ""}
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
                  {isMock ? "Mức quan tâm trong bộ mẫu" : "Mức quan tâm trước khi mở"}
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
                    <p className="mt-1 text-[11px] text-white/42">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
          <article className="rounded-[20px] border border-line bg-white p-6">
            <p className="eyebrow text-coral">
              <ShieldCheck className="size-4" /> {isMock ? "Mô hình dự kiến" : "Thông tin mô hình"}
            </p>
            <p className="mt-3 text-xs leading-5 text-ink-muted">
              {isMock
                ? "Nhóm dự kiến huấn luyện mô hình phân loại. Bản đang xem chỉ là dữ liệu minh họa, chưa có kết quả đánh giá trên tập kiểm thử."
                : "Thông tin kết quả đánh giá cần đi cùng tập dữ liệu và cách chia tập kiểm thử."}
            </p>
            <dl className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Mô hình</dt>
                <dd className="text-right font-bold">{data.model.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{isMock ? "Mã bộ mẫu" : "Phiên bản"}</dt>
                <dd className="font-mono font-bold">{data.model.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">ROC-AUC</dt>
                <dd className="font-bold">{data.model.status === "EVALUATED" && data.model.rocAuc !== null ? data.model.rocAuc : "Chưa đo"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Nguồn dữ liệu</dt>
                <dd className="text-right font-bold">{isMock ? "Bộ mẫu ORBIT One" : "Dữ liệu đầu vào"} · {snapshotDate}</dd>
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
              {isMock ? "Gợi ý để nhóm thảo luận" : "Việc nên cân nhắc"}
            </h2>
          </div>
          <p className="text-[11px] text-ink-muted">
            {isMock ? "Chưa có bằng chứng đo tác động của từng gợi ý" : "Nhóm cần kiểm tra trước khi áp dụng"}
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
                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${suggestion.priority === "HIGH" ? "bg-red-50 text-red-700" : suggestion.priority === "MEDIUM" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
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
              <p className="mt-4 text-[11px] font-bold text-coral-dark">
                {isMock ? "Ghi chú theo kịch bản mẫu" : "Ghi chú từ dữ liệu chiến dịch"}
              </p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
