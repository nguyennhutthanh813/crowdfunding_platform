"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImageAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

export function ImageUploadButton({
  folder = "uploads",
  label = "Tải ảnh lên",
  onUploaded,
  className,
}: {
  folder?: string;
  label?: string;
  onUploaded: (url: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Kích thước ảnh tối đa 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const res = await uploadImageAction(form);
      if (!res.ok || !res.url) {
        toast.error(res.error ?? "Không thể tải ảnh lên.");
        return;
      }
      onUploaded(res.url);
      toast.success(
        res.provider === "cloudinary" ? "Đã tải ảnh lên Cloudinary thành công!" : "Đã tải ảnh lên máy chủ thành công!",
      );
    } catch {
      toast.error("Có lỗi khi tải ảnh lên, vui lòng thử lại.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-500/20 disabled:opacity-60 dark:text-violet-300",
          className,
        )}
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
        {uploading ? "Đang tải lên…" : label}
      </button>
    </>
  );
}
