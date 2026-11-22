"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminCategory } from "@/server/queries/admin";
import { deleteCategoryAction, saveCategoryAction, toggleCategoryAction } from "@/server/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ImageUploadButton } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/primitives";
import { cn, formatCompactVnd, slugify } from "@/lib/utils";
import { SafeImage } from "./safe-image";

const COLOR_PRESETS = ["#7C3AED", "#EC4899", "#F97316", "#D97706", "#8B5CF6", "#F43F5E", "#0EA5E9", "#10B981", "#6366F1"];

export function CategoryManager({
  categories,
  presetImages,
}: {
  categories: AdminCategory[];
  presetImages: string[];
}) {
  const [editing, setEditing] = useState<AdminCategory | "NEW" | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState(presetImages[0] ?? "");
  const [color, setColor] = useState("#7C3AED");
  const [sortOrder, setSortOrder] = useState(0);

  const openCreate = () => {
    setEditing("NEW");
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setImageUrl(presetImages[0] ?? "");
    setColor("#7C3AED");
    setSortOrder(categories.length);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setSlugTouched(true);
    setDescription(cat.description);
    setImageUrl(cat.image_url ?? presetImages[0] ?? "");
    setColor(cat.color || "#7C3AED");
    setSortOrder(cat.sort_order);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) setSlug(slugify(val));
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          Tổng <b>{categories.length}</b> thể loại · Đang hiển thị{" "}
          <b>{categories.filter((c) => c.is_active === 1).length}</b>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Thêm thể loại
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={cn(
              "card flex flex-col justify-between overflow-hidden transition",
              cat.is_active === 0 && "opacity-70",
            )}
          >
            <div>
              <div className="relative flex items-center gap-3.5 border-b border-line p-4" style={{ background: `${cat.color}10` }}>
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface">
                  <SafeImage src={cat.image_url} alt={cat.name} fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                    <h3 className="truncate font-bold">{cat.name}</h3>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={cat.is_active === 1 ? "emerald" : "neutral"} dot>
                      {cat.is_active === 1 ? "Đang bật" : "Đã ẩn"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <p className="line-clamp-2 min-h-10 text-xs text-muted">{cat.description || "Chưa có mô tả."}</p>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2/80 p-2.5 text-center">
                  <div>
                    <div className="text-sm font-extrabold tabular-nums">{cat.projects}</div>
                    <div className="text-[10px] text-muted">Dự án</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-emerald-600 tabular-nums dark:text-emerald-400">{cat.live}</div>
                    <div className="text-[10px] text-muted">Đang chạy</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold tabular-nums">{formatCompactVnd(cat.pledged)}</div>
                    <div className="text-[10px] text-muted">Đã gọi</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
              <Button type="button" variant="outline" size="xs" onClick={() => openEdit(cat)}>
                <Pencil className="size-3.5" /> Sửa
              </Button>
              <div className="flex items-center gap-1.5">
                <ActionForm action={toggleCategoryAction}>
                  <input type="hidden" name="id" value={cat.id} />
                  <SubmitButton variant={cat.is_active === 1 ? "ghost" : "success"} size="xs">
                    {cat.is_active === 1 ? (
                      <>
                        <EyeOff className="size-3.5" /> Ẩn
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" /> Bật
                      </>
                    )}
                  </SubmitButton>
                </ActionForm>
                {cat.projects === 0 && (
                  <ActionForm action={deleteCategoryAction} confirm={`Xoá thể loại "${cat.name}"?`}>
                    <input type="hidden" name="id" value={cat.id} />
                    <SubmitButton variant="ghost" size="xs" className="text-rose-600 hover:bg-rose-500/10">
                      <Trash2 className="size-3.5" /> Xoá
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "NEW" ? "Thêm thể loại mới" : editing ? `Chỉnh sửa thể loại: ${editing.name}` : ""}
        description="Thể loại hiển thị trên trang chủ, bộ lọc khám phá và khi Chủ dự án tạo dự án."
      >
        <ActionForm action={saveCategoryAction} onSuccess={() => setEditing(null)} className="space-y-4">
          {(state) => (
            <>
              {editing && editing !== "NEW" && <input type="hidden" name="id" value={editing.id} />}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên thể loại" required error={state?.fieldErrors?.name}>
                  <Input
                    name="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    minLength={2}
                    maxLength={50}
                    placeholder="Ví dụ: Âm nhạc"
                  />
                </Field>
                <Field label="Đường dẫn (slug)" error={state?.fieldErrors?.slug} hint="Tự tạo từ tên nếu để trống.">
                  <Input
                    name="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="am-nhac"
                  />
                </Field>
              </div>

              <Field label="Mô tả ngắn">
                <Textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-20"
                  placeholder="Mô tả ngắn gọn về các dự án thuộc thể loại này..."
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Màu đại diện" error={state?.fieldErrors?.color}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#7C3AED"}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-11 w-12 cursor-pointer rounded-xl border border-line bg-surface p-1"
                    />
                    <Input name="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#7C3AED" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "size-6 rounded-full border-2 transition",
                          color.toLowerCase() === c.toLowerCase() ? "scale-110 border-fg" : "border-transparent",
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Chọn màu ${c}`}
                      />
                    ))}
                  </div>
                </Field>

                <Field label="Thứ tự sắp xếp">
                  <Input
                    type="number"
                    name="sort_order"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  />
                </Field>
              </div>

              <Field label="Ảnh 3D minh hoạ" hint="Tải ảnh từ thiết bị, chọn nhanh bộ ảnh có sẵn hoặc nhập đường dẫn.">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ImageUploadButton folder="categories" label="Tải ảnh thể loại lên" onUploaded={setImageUrl} />
                    {imageUrl && <span className="truncate text-[11px] text-muted max-w-[240px]">{imageUrl}</span>}
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {presetImages.map((img) => {
                      const active = imageUrl === img;
                      return (
                        <button
                          key={img}
                          type="button"
                          onClick={() => setImageUrl(img)}
                          className={cn(
                            "relative aspect-square overflow-hidden rounded-xl border-2 transition",
                            active ? "border-violet-500 ring-2 ring-violet-500/30" : "border-line opacity-75 hover:opacity-100",
                          )}
                        >
                          <SafeImage src={img} alt="" fill sizes="64px" className="object-cover" />
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    name="image_url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="/v3/categories/tech.webp"
                  />
                </div>
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                  Huỷ
                </Button>
                <SubmitButton variant="primary" size="sm" pendingText="Đang lưu...">
                  {editing === "NEW" ? "Tạo thể loại" : "Lưu thay đổi"}
                </SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}
