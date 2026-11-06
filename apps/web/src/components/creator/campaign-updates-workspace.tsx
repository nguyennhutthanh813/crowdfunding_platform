"use client";

import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  LoaderCircle,
  Megaphone,
  Newspaper,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVietnameseDateTime } from "@/lib/format";

export interface CampaignUpdateItem {
  id?: string;
  title: string;
  when: string;
  excerpt?: string;
  commentCount?: number;
}

export function CampaignUpdatesWorkspace({
  campaignId,
  campaignSlug,
  campaignTitle,
  initialUpdates = [],
  isOwner = true,
  canPostUpdates = true,
}: {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  initialUpdates: CampaignUpdateItem[];
  isOwner?: boolean;
  canPostUpdates?: boolean;
}) {
  const router = useRouter();
  const [updates, setUpdates] = useState<CampaignUpdateItem[]>(initialUpdates);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const formatWhen = (when: string) => {
    if (!when) return "Vừa cập nhật";
    if (when === "Trong phiên này" || when === "Vừa cập nhật") return when;
    try {
      const d = new Date(when);
      if (!isNaN(d.getTime())) {
        return formatVietnameseDateTime(d);
      }
    } catch {}
    return when;
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);

    if (!title.trim() || !body.trim()) {
      setNotice({
        tone: "error",
        message: "Vui lòng nhập đầy đủ tiêu đề và nội dung bản tin tiến độ.",
      });
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      await clientRequest("/api/v1/creator/operations", {
        method: "POST",
        body: JSON.stringify({
          action: "PUBLISH_UPDATE",
          payload: {
            campaignId,
            title: title.trim(),
            body: body.trim(),
          },
        }),
      });

      const newUpdate: CampaignUpdateItem = {
        id: `upd_${Date.now()}`,
        title: title.trim(),
        when: "Vừa cập nhật",
        excerpt: body.trim().slice(0, 180),
        commentCount: 0,
      };

      setUpdates([newUpdate, ...updates]);
      setTitle("");
      setBody("");
      setAttempted(false);
      setNotice({
        tone: "success",
        message:
          "Đã đăng bản tin cập nhật thành công! Hệ thống đã gửi thông báo in-app đến toàn bộ người ủng hộ.",
      });
      router.refresh();
    } catch (err) {
      setNotice({
        tone: "error",
        message: clientRequestMessage(
          err,
          "Chưa thể đăng bản tin lúc này. Vui lòng thử lại sau.",
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col justify-between gap-4 rounded-[20px] border border-line bg-white p-5 sm:flex-row sm:items-center sm:p-7">
        <div>
          <span className="eyebrow text-coral">
            <Megaphone className="size-4" /> Nhật ký tiến độ dự án
          </span>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
            Thông tin minh bạch tới người ủng hộ
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Mỗi bản tin được xuất bản sẽ tự động thông báo in-app đến toàn bộ người đã góp vốn cho {campaignTitle}.
          </p>
        </div>
        <Link
          href={`/projects/${campaignSlug}?tab=updates`}
          target="_blank"
          className="button-secondary min-h-10 self-start px-3.5 text-xs font-bold sm:self-center"
        >
          <ExternalLink className="size-3.5" /> Xem ngoài trang dự án
        </Link>
      </div>

      {/* Main Grid: Left = Post Form, Right = History */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        {/* Form composer */}
        <article className="rounded-[20px] border border-line bg-white p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-forest/5 text-forest">
              <Newspaper className="size-4" />
            </span>
            <h3 className="font-display text-lg font-extrabold text-ink">
              Soạn bản tin cập nhật mới
            </h3>
          </div>

          {notice ? (
            <div
              role={notice.tone === "error" ? "alert" : "status"}
              className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold ${
                notice.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {notice.tone === "error" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{notice.message}</span>
            </div>
          ) : null}

          {!canPostUpdates ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900">
              Bạn chưa được cấp quyền đăng bản tin cập nhật cho chiến dịch này. Vui lòng liên hệ Chủ dự án để được phân quyền.
            </div>
          ) : (
            <form onSubmit={handlePublish} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="update-title"
                  className="block text-xs font-bold text-ink-soft"
                >
                  Tiêu đề bản tin <span className="text-coral">*</span>
                </label>
                <input
                  id="update-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật tuần 3: Đã hoàn tất mẻ nung gốm đầu tiên & kiểm tra bao bì"
                  maxLength={100}
                  className={`input-field mt-1.5 text-sm font-bold ${
                    attempted && !title.trim() ? "border-red-500 bg-red-50/30" : ""
                  }`}
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
                  <span>
                    {attempted && !title.trim() ? (
                      <span className="font-semibold text-red-600">
                        Vui lòng nhập tiêu đề ngắn gọn nêu đúng mốc tiến độ.
                      </span>
                    ) : (
                      "Nêu rõ mốc thực hiện để người ủng hộ dễ nắm bắt."
                    )}
                  </span>
                  <span>{title.length}/100</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="update-body"
                  className="block text-xs font-bold text-ink-soft"
                >
                  Nội dung chi tiết (Markdown) <span className="text-coral">*</span>
                </label>
                <textarea
                  id="update-body"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Mô tả cụ thể những công việc nhóm đã hoàn thành trong tuần qua, hình ảnh thử nghiệm tại xưởng, các mốc thời gian giao hàng dự kiến hoặc các rủi ro phát sinh nếu có..."
                  maxLength={2000}
                  className={`input-field mt-1.5 resize-y text-xs leading-relaxed ${
                    attempted && !body.trim() ? "border-red-500 bg-red-50/30" : ""
                  }`}
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
                  <span>
                    {attempted && !body.trim() ? (
                      <span className="font-semibold text-red-600">
                        Vui lòng bổ sung nội dung mô tả tiến độ thực tế.
                      </span>
                    ) : (
                      "Hỗ trợ Markdown cơ bản (danh sách gạch đầu dòng, liên kết, in đậm)."
                    )}
                  </span>
                  <span>{body.length}/2000</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line pt-4">
                <p className="text-[11px] text-ink-muted">
                  Thông báo sẽ gửi ngay sau khi bấm đăng.
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="button-dark min-h-11 px-5 text-xs font-bold disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" /> Đang đăng bản tin...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" /> Đăng cập nhật ngay
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </article>

        {/* History Timeline */}
        <aside className="space-y-4">
          <div className="rounded-[20px] border border-line bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-ink">
                Bản tin đã công bố ({updates.length})
              </h3>
              <span className="rounded-full bg-forest/5 px-2.5 py-1 text-[10px] font-bold text-forest">
                CÔNG KHAI
              </span>
            </div>

            {updates.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-[#faf9f5] p-8 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-white text-ink-muted shadow-sm">
                  <FileText className="size-5" />
                </div>
                <p className="mt-3 font-display text-sm font-bold text-ink">
                  Chưa có bản tin tiến độ nào
                </p>
                <p className="mt-1 text-xs text-ink-muted max-w-[240px]">
                  Hãy đăng bản tin đầu tiên để cập nhật tình hình sản xuất cho cộng đồng người ủng hộ.
                </p>
              </div>
            ) : (
              <div className="mt-5 divide-y divide-line">
                {updates.map((item, idx) => (
                  <div key={item.id || `${item.title}-${idx}`} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-forest/10 px-2 py-0.5 text-[10px] font-bold text-forest">
                        #{updates.length - idx}
                      </span>
                      <span className="text-[10px] text-ink-muted">
                        {formatWhen(item.when)}
                      </span>
                    </div>
                    <h4 className="mt-2 font-display text-sm font-extrabold text-ink hover:text-coral transition-colors">
                      {item.title}
                    </h4>
                    {item.excerpt ? (
                      <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                        {item.excerpt}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-ink-muted">
                        {item.commentCount ? `${item.commentCount} bình luận` : "Chưa có bình luận"}
                      </span>
                      <Link
                        href={`/projects/${campaignSlug}?tab=updates`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-coral-dark hover:underline"
                      >
                        Xem bài viết <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[20px] bg-forest p-6 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-lime" />
              <p className="eyebrow text-lime">Mẹo giữ niềm tin với Backer</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/75">
              Các chiến dịch cập nhật tiến độ đều đặn mỗi 7–10 ngày (kể cả khi gặp sự cố kỹ thuật hoặc chờ linh kiện) duy trì tỷ lệ hài lòng của người ủng hộ lên tới hơn 92%.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

