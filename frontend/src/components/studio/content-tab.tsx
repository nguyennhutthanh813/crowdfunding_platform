"use client";

import { useState } from "react";
import { Check, Image as ImageIcon } from "lucide-react";
import type { SectionRow, StudioProject } from "@/server/queries/studio";
import { updateBasicsAction } from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ImageUploadButton } from "@/components/ui/image-upload";
import { cn } from "@/lib/utils";
import { COVER_GALLERY } from "./meta";
import { StudioImage } from "./media";
import { ContentEditor } from "./content-editor";

export function ContentTab({
  project,
  categories,
  sections,
}: {
  project: StudioProject;
  categories: { id: string; name: string; slug: string; image_url: string | null; color: string }[];
  sections: SectionRow[];
}) {
  const [coverUrl, setCoverUrl] = useState(project.cover_url ?? COVER_GALLERY[0]);
  const [showGallery, setShowGallery] = useState(false);

  return (
    <div className="space-y-6">
      <ActionForm action={updateBasicsAction} className="card space-y-4 p-5 sm:p-6">
        <input type="hidden" name="project_id" value={project.id} />
        <input type="hidden" name="cover_url" value={coverUrl} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">Thông tin cơ bản &amp; truyền thông</h3>
            <p className="text-sm text-muted">Cập nhật tên, mô tả ngắn, thể loại, ảnh bìa và video giới thiệu.</p>
          </div>
          <SubmitButton size="sm" pendingText="Đang lưu…">
            Lưu thông tin cơ bản
          </SubmitButton>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên dự án (5–80 ký tự)" required>
            <Input name="title" defaultValue={project.title} minLength={5} maxLength={80} required />
          </Field>
          <Field label="Thể loại" required>
            <Select name="category_id" defaultValue={project.category_id} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Mô tả ngắn (blurb)" required>
          <Textarea name="blurb" defaultValue={project.blurb} maxLength={200} rows={2} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ảnh bìa dự án">
            <div className="flex flex-wrap gap-2">
              <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." className="min-w-[180px] flex-1" />
              <ImageUploadButton folder="projects" label="Tải ảnh bìa" onUploaded={setCoverUrl} className="h-11 px-3" />
              <button
                type="button"
                onClick={() => setShowGallery((o) => !o)}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold hover:bg-surface-2"
              >
                <ImageIcon className="size-4" /> Thư viện 3D
              </button>
            </div>
          </Field>
          <Field label="Video giới thiệu (URL)">
            <Input name="video_url" defaultValue={project.video_url ?? ""} placeholder="https://www.youtube.com/watch?v=..." />
          </Field>
        </div>

        {showGallery && (
          <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto rounded-2xl border border-line bg-surface-2/40 p-2.5 sm:grid-cols-6">
            {COVER_GALLERY.map((url) => {
              const selected = coverUrl === url;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setCoverUrl(url)}
                  className={cn(
                    "relative aspect-[16/10] overflow-hidden rounded-xl border-2 transition",
                    selected ? "border-violet-500 ring-2 ring-violet-500/30" : "border-transparent",
                  )}
                >
                  <StudioImage src={url} alt="" sizes="120px" />
                  {selected && (
                    <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-violet-600 text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ActionForm>

      <ContentEditor projectId={project.id} sections={sections} risks={project.risks} />
    </div>
  );
}
