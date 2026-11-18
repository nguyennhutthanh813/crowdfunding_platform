import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLocalImage } from "./meta";

/** Hiển thị ảnh dự án/nội dung: dùng next/image cho đường dẫn nội bộ /..., dùng <img> cho URL ngoài. */
export function StudioImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 420px",
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-gradient-to-br from-violet-500/15 via-surface-2 to-emerald-500/15 text-muted", className)}>
        <ImageOff className="size-6 opacity-50" />
      </div>
    );
  }
  if (isLocalImage(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />
  );
}

/** Chuyển ISO UTC sang chuỗi YYYY-MM-DDTHH:mm theo giờ Việt Nam (UTC+7) cho input datetime-local. */
export function toVnDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  return new Date(ms + 7 * 3_600_000).toISOString().slice(0, 16);
}
