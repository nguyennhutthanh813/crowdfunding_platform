"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Save,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import type {
  CampaignContentAssistantData,
  ContentCheckStatus,
} from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVietnameseDateTime, formatVnd } from "@/lib/format";

const checkStyles: Record<
  ContentCheckStatus,
  { label: string; tone: string; icon: typeof CheckCircle2 }
> = {
  GOOD: {
    label: "Ổn",
    tone: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  IMPROVE: {
    label: "Nên bổ sung",
    tone: "bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  MISSING: {
    label: "Đang thiếu",
    tone: "bg-red-50 text-red-700",
    icon: AlertTriangle,
  },
};

async function callAssistant(action: string, payload: Record<string, unknown>) {
  return clientRequest<{
    data: { score?: number; processedAt: string };
  }>("/api/v1/creator/assistant", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

async function saveDraft(title: string, blurb: string) {
  await clientRequest("/api/v1/creator/operations", {
    method: "POST",
    body: JSON.stringify({
      action: "SAVE_DRAFT",
      payload: { campaignId: "cmp_orbit", title, blurb },
    }),
  });
}

export function CampaignContentAssistant({
  data,
}: {
  data: CampaignContentAssistantData;
}) {
  const [title, setTitle] = useState(data.currentTitle);
  const [blurb, setBlurb] = useState(data.currentBlurb);
  const [score, setScore] = useState(data.score);
  const [analyzedAt, setAnalyzedAt] = useState(data.analyzedAt);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{
    field: "title" | "blurb";
    value: string;
  } | null>(null);

  const applyOption = (field: "title" | "blurb", value: string) => {
    const previous = field === "title" ? title : blurb;
    setUndo({ field, value: previous });
    if (field === "title") setTitle(value);
    else setBlurb(value);
    setNotice(
      "Đã đưa phương án vào bản nháp. Bạn vẫn có thể sửa lại bằng tay.",
    );
  };

  const undoOption = () => {
    if (!undo) return;
    if (undo.field === "title") setTitle(undo.value);
    else setBlurb(undo.value);
    setUndo(null);
    setNotice("Đã hoàn tác thay đổi gần nhất.");
  };

  const analyze = async () => {
    setBusy("analyze");
    setNotice("");
    try {
      const result = await callAssistant("ANALYZE_DRAFT", {
        campaignId: "cmp_orbit",
        title,
        blurb,
      });
      setScore(result.data.score ?? score);
      setAnalyzedAt(result.data.processedAt);
      setNotice("Đã phân tích lại bản nháp bằng dữ liệu mô phỏng.");
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể phân tích lúc này. Nội dung bạn đang sửa vẫn được giữ."));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    setNotice("");
    try {
      await saveDraft(title, blurb);
      setNotice("Đã lưu tiêu đề và mô tả ngắn vào bản nháp trải nghiệm.");
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể lưu bản nháp. Nội dung trên màn hình vẫn còn nguyên."));
    } finally {
      setBusy(null);
    }
  };

  const formattedAnalyzedAt = formatVietnameseDateTime(analyzedAt);
  const formattedInputSnapshot = formatVietnameseDateTime(
    data.runMeta.inputSnapshotAt,
  );

  return (
    <section id="content-assistant" className="container-shell mt-8">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white">
        <div className="flex flex-col justify-between gap-5 border-b border-line bg-[#edf1e4] p-5 sm:flex-row sm:items-end sm:p-7">
          <div>
            <span className="eyebrow text-coral">
              <Sparkles className="size-4" /> Hỗ trợ nội dung bản nháp
            </span>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-[-0.045em]">
              Chỉnh từng phần có căn cứ, không viết lại cả câu chuyện.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
              Gợi ý dưới đây dựa trên checklist và dữ liệu mẫu. Chủ dự án là
              người chọn, sửa và chịu trách nhiệm cho nội dung cuối cùng.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {undo ? (
              <button
                type="button"
                onClick={undoOption}
                className="button-ghost"
              >
                <Undo2 className="size-4" /> Hoàn tác
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void analyze()}
              className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${busy === "analyze" ? "animate-spin" : ""}`}
              />
              {busy === "analyze" ? "Đang phân tích…" : "Phân tích lại"}
            </button>
          </div>
        </div>

        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.65fr)]">
          <div className="min-w-0 p-5 sm:p-7 lg:border-r lg:border-line">
            <div className="grid gap-5">
              <label>
                <span className="flex items-center justify-between gap-3 text-xs font-bold text-ink-soft">
                  Tiêu đề chiến dịch
                  <span className="font-normal text-ink-muted">
                    {title.length}/80 ký tự
                  </span>
                </span>
                <input
                  name="campaign-title"
                  value={title}
                  maxLength={80}
                  onChange={(event) => setTitle(event.target.value)}
                  className="input-field mt-2"
                />
              </label>
              <label>
                <span className="flex items-center justify-between gap-3 text-xs font-bold text-ink-soft">
                  Mô tả ngắn
                  <span className="font-normal text-ink-muted">
                    {blurb.length}/160 ký tự
                  </span>
                </span>
                <textarea
                  name="campaign-blurb"
                  value={blurb}
                  maxLength={160}
                  onChange={(event) => setBlurb(event.target.value)}
                  className="input-field mt-2 min-h-24 resize-y"
                />
              </label>
            </div>

            <div className="mt-7 border-t border-line pt-6">
              <p className="text-xs font-bold">
                Ba cách đặt tiêu đề dễ hiểu hơn
              </p>
              <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
                {data.titleOptions.map((option) => (
                  <div
                    key={option.id}
                    className="p-4 sm:flex sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-6">
                        {option.text}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                        {option.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyOption("title", option.text)}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3.5 text-[11px] font-bold text-coral-dark hover:border-coral/40 hover:bg-[#fff7f2] sm:mt-0"
                    >
                      Dùng phương án này <Check className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold">Mô tả ngắn có thêm bằng chứng</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {data.blurbOptions.map((option) => (
                  <div key={option.id} className="rounded-2xl bg-[#f7f6f1] p-4">
                    <p className="text-xs font-semibold leading-6">
                      {option.text}
                    </p>
                    <p className="mt-2 text-[10px] leading-4 text-ink-muted">
                      {option.reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => applyOption("blurb", option.text)}
                      className="mt-3 text-[11px] font-bold text-coral-dark hover:underline"
                    >
                      Đưa vào bản nháp
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p
                role={notice.startsWith("Chưa") ? "alert" : "status"}
                className={`text-xs leading-5 ${notice.startsWith("Chưa") ? "text-red-600" : "text-emerald-700"}`}
              >
                {notice || "Các thay đổi chỉ nằm trong bản nháp trải nghiệm."}
              </p>
              <button
                type="button"
                disabled={busy !== null || !title.trim() || !blurb.trim()}
                onClick={() => void save()}
                className="button-dark shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="size-4" />
                {busy === "save" ? "Đang lưu…" : "Lưu vào bản nháp"}
              </button>
            </div>
          </div>

          <aside className="min-w-0 bg-[#fbfaf6] p-5 sm:p-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Độ sẵn sàng nội dung
                </p>
                <p className="mt-2 font-display text-5xl font-extrabold tracking-[-0.07em] text-coral-dark">
                  {score}
                  <span className="text-xl text-ink-muted">/100</span>
                </p>
              </div>
              <FileText className="size-7 text-coral" />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-forest/8">
              <div
                className="h-full rounded-full bg-coral"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="mt-4 flex gap-4 text-[10px] text-ink-muted">
              <span>{data.wordCount} từ</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" /> {data.readingMinutes} phút đọc
              </span>
            </div>
            <p className="mt-2 text-[10px] text-ink-muted">
              Phân tích lúc {formattedAnalyzedAt}
            </p>
            <details className="mt-4 rounded-xl border border-line bg-white p-3 text-[10px] text-ink-muted">
              <summary className="cursor-pointer font-bold text-ink-soft">
                Thông tin lần gợi ý
              </summary>
              <p className="mt-2 leading-5">
                {data.runMeta.engineLabel} · bộ hướng dẫn {data.runMeta.promptVersion}
                {" · "}dữ liệu chốt {formattedInputSnapshot}. Kết quả chỉ điền
                vào bản nháp, chủ dự án vẫn phải đọc và quyết định.
              </p>
            </details>

            <div className="mt-6 space-y-3">
              {data.checks.map((check) => {
                const config = checkStyles[check.status];
                const Icon = config.icon;
                return (
                  <div
                    key={check.id}
                    className="border-t border-line pt-3 first:border-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold">{check.label}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${config.tone}`}
                      >
                        <Icon className="size-3" /> {config.label}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-4 text-ink-muted">
                      {check.finding}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 rounded-2xl bg-forest p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-lime">
                So sánh gói Early Bird
              </p>
              <p className="mt-3 font-display text-xl font-extrabold">
                {formatVnd(data.rewardBenchmark.currentAmount)}
              </p>
              <p className="mt-1 text-[10px] text-white/48">
                Trung vị {formatVnd(data.rewardBenchmark.medianAmount)} ·{" "}
                {data.rewardBenchmark.sampleSize} dự án{" "}
                {data.rewardBenchmark.category}
              </p>
              <p className="mt-3 text-[11px] leading-5 text-white/65">
                {data.rewardBenchmark.note}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
