"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, FileText, Image as ImageIcon, Pencil, Plus, ShieldAlert, Trash2, Video } from "lucide-react";
import type { SectionRow } from "@/server/queries/studio";
import { deleteSectionAction, moveSectionAction, saveRisksAction, saveSectionAction } from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ImageUploadButton } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { COVER_GALLERY } from "./meta";
import { StudioImage } from "./media";

const KIND_META = {
  TEXT: { label: "Đoạn văn", icon: FileText, tone: "violet" as const },
  IMAGE: { label: "Hình ảnh", icon: ImageIcon, tone: "sky" as const },
  VIDEO: { label: "Video", icon: Video, tone: "emerald" as const },
};

export function ContentEditor({
  projectId,
  sections,
  risks,
}: {
  projectId: string;
  sections: SectionRow[];
  risks: string;
}) {
  const [editing, setEditing] = useState<SectionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [riskText, setRiskText] = useState(risks);
  const textCount = sections.filter((s) => s.kind === "TEXT" && s.body.trim().length > 0).length;

  return (
    <div className="space-y-6">
      {/* Sections List */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold">Nội dung Campaign (Sections)</h3>
              <Badge tone={textCount >= 2 ? "emerald" : "amber"}>
                {textCount}/2 section chữ tối thiểu
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Chia câu chuyện thành nhiều phần rõ ràng: vấn đề, giải pháp, hình ảnh sản phẩm, tiến độ &amp; đội ngũ.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Thêm section
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface-2/40 p-8 text-center">
              <p className="text-sm font-medium text-muted">Chưa có section nội dung nào. Hãy thêm section đầu tiên để kể câu chuyện dự án!</p>
              <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Thêm section đầu tiên
              </Button>
            </div>
          ) : (
            sections.map((s, idx) => {
              const meta = KIND_META[s.kind];
              const Icon = meta.icon;
              return (
                <div key={s.id} className="rounded-2xl border border-line bg-surface-2/30 p-4 transition hover:border-violet-400/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-bold text-muted">
                        #{idx + 1}
                      </span>
                      <Badge tone={meta.tone}>
                        <Icon className="size-3" /> {meta.label}
                      </Badge>
                      <h4 className="truncate font-bold">{s.heading || "(Không tiêu đề)"}</h4>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <ActionForm action={moveSectionAction}>
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="section_id" value={s.id} />
                        <input type="hidden" name="dir" value="up" />
                        <SubmitButton variant="ghost" size="xs" disabled={idx === 0} aria-label="Lên">
                          <ArrowUp className="size-3.5" />
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm action={moveSectionAction}>
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="section_id" value={s.id} />
                        <input type="hidden" name="dir" value="down" />
                        <SubmitButton variant="ghost" size="xs" disabled={idx === sections.length - 1} aria-label="Xuống">
                          <ArrowDown className="size-3.5" />
                        </SubmitButton>
                      </ActionForm>
                      <Button variant="ghost" size="xs" onClick={() => setEditing(s)}>
                        <Pencil className="size-3.5" /> Sửa
                      </Button>
                      <ActionForm action={deleteSectionAction} confirm="Xoá mục nội dung này?">
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="section_id" value={s.id} />
                        <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="size-3.5" />
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </div>

                  {s.kind === "TEXT" && (
                    <p className="mt-2.5 line-clamp-3 whitespace-pre-line text-sm text-muted">{s.body}</p>
                  )}
                  {s.kind === "IMAGE" && s.media_url && (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-line">
                        <StudioImage src={s.media_url} alt={s.heading || "Ảnh campaign"} sizes="160px" />
                      </div>
                      <div className="min-w-0 text-xs text-muted">
                        <div className="truncate font-mono">{s.media_url}</div>
                        {s.body && <p className="mt-1 line-clamp-2 text-sm text-fg">{s.body}</p>}
                      </div>
                    </div>
                  )}
                  {s.kind === "VIDEO" && s.media_url && (
                    <div className="mt-2.5 rounded-xl bg-surface px-3 py-2 text-xs text-muted">
                      <span className="font-semibold text-fg">Video URL: </span>
                      <span className="break-all font-mono">{s.media_url}</span>
                      {s.body && <p className="mt-1 text-fg">{s.body}</p>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Risks & Mitigation */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <ShieldAlert className="size-4" />
            </span>
            <div>
              <h3 className="text-lg font-bold">Rủi ro &amp; phương án dự phòng</h3>
              <p className="text-xs text-muted">Minh bạch giúp tăng uy tín và điểm dự đoán AI (tối thiểu 20 ký tự).</p>
            </div>
          </div>
          <Badge tone={riskText.trim().length >= 20 ? "emerald" : "amber"}>
            {riskText.trim().length}/20+ ký tự
          </Badge>
        </div>

        <ActionForm action={saveRisksAction} className="mt-4 space-y-3">
          <input type="hidden" name="project_id" value={projectId} />
          <Textarea
            name="risks"
            value={riskText}
            onChange={(e) => setRiskText(e.target.value)}
            placeholder="Ví dụ: Sản xuất phần cứng có thể trễ 2–3 tuần nếu linh kiện thiếu hụt; nhóm đã làm việc sẵn với 2 nhà cung cấp dự phòng và cam kết cập nhật hằng tuần…"
            rows={4}
          />
          <div className="flex justify-end">
            <SubmitButton variant="secondary" size="sm" pendingText="Đang lưu…">
              Lưu phần rủi ro
            </SubmitButton>
          </div>
        </ActionForm>
      </div>

      <Dialog
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Chỉnh sửa section nội dung" : "Thêm section nội dung"}
        description="Hỗ trợ đoạn văn (TEXT), hình ảnh minh hoạ (IMAGE) hoặc video (VIDEO)."
        wide
      >
        {(creating || editing) && (
          <SectionFormBody
            key={editing?.id ?? "new"}
            projectId={projectId}
            initial={editing}
            onDone={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function SectionFormBody({
  projectId,
  initial,
  onDone,
}: {
  projectId: string;
  initial: SectionRow | null;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"TEXT" | "IMAGE" | "VIDEO">(initial?.kind ?? "TEXT");
  const [mediaUrl, setMediaUrl] = useState(initial?.media_url ?? "");

  return (
    <ActionForm action={saveSectionAction} onSuccess={onDone} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {initial && <input type="hidden" name="section_id" value={initial.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Loại section</span>
        <div className="grid grid-cols-3 gap-2">
          {(["TEXT", "IMAGE", "VIDEO"] as const).map((k) => {
            const m = KIND_META[k];
            const Icon = m.icon;
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-violet-500 bg-violet-500/12 text-violet-700 dark:text-violet-300"
                    : "border-line bg-surface hover:bg-surface-2",
                )}
              >
                <Icon className="size-4" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Tiêu đề mục (tuỳ chọn)">
        <Input name="heading" defaultValue={initial?.heading ?? ""} placeholder="Ví dụ: Câu chuyện ra đời, Thiết kế chi tiết…" />
      </Field>

      {kind !== "TEXT" && (
        <div className="space-y-3">
          <Field
            label={kind === "IMAGE" ? "Đường dẫn hình ảnh" : "Đường dẫn video (YouTube / MP4)"}
            required
          >
            <div className="flex flex-wrap gap-2">
              <Input
                name="media_url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={kind === "IMAGE" ? "Dán đường dẫn ảnh (https://...) hoặc tải lên" : "https://www.youtube.com/watch?v=..."}
                className="min-w-[200px] flex-1"
                required
              />
              {kind === "IMAGE" && (
                <ImageUploadButton folder="sections" label="Tải ảnh lên" onUploaded={setMediaUrl} className="h-11 px-3" />
              )}
            </div>
          </Field>

          {kind === "IMAGE" && (
            <div>
              <div className="mb-1.5 text-xs font-semibold text-muted">Hoặc chọn nhanh ảnh minh hoạ 3D có sẵn:</div>
              <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-line bg-surface-2/40 p-2 sm:grid-cols-6">
                {COVER_GALLERY.slice(0, 16).map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setMediaUrl(url)}
                    className={cn(
                      "relative aspect-[16/10] overflow-hidden rounded-lg border-2 transition",
                      mediaUrl === url ? "border-violet-500 ring-2 ring-violet-500/30" : "border-transparent hover:border-line",
                    )}
                  >
                    <StudioImage src={url} alt="" sizes="100px" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Field
        label={kind === "TEXT" ? "Nội dung đoạn văn" : "Chú thích / mô tả (tuỳ chọn)"}
        required={kind === "TEXT"}
      >
        <Textarea
          name="body"
          defaultValue={initial?.body ?? ""}
          rows={kind === "TEXT" ? 6 : 2}
          required={kind === "TEXT"}
          placeholder={kind === "TEXT" ? "Chia sẻ chi tiết về sản phẩm, giá trị mang lại và kế hoạch thực hiện…" : "Mô tả ngắn cho ảnh hoặc video này"}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Huỷ
        </Button>
        <SubmitButton pendingText="Đang lưu…">
          {initial ? "Lưu thay đổi" : "Thêm section"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
