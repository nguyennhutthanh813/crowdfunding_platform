import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function isLocalImage(src: string | null | undefined): src is string {
  return Boolean(src && src.startsWith("/"));
}

/**
 * Ảnh an toàn cho khu vực quản trị:
 * chỉ truyền đường dẫn nội bộ `/...` vào `next/image`; URL ngoài dùng `<img>` chuẩn.
 */
export function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  className,
  fallbackClassName,
}: {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-surface-2 text-muted", fallbackClassName ?? className)}>
        <ImageOff className="size-5 opacity-60" />
      </div>
    );
  }
  if (isLocalImage(src)) {
    if (fill) {
      return <Image src={src} alt={alt} fill sizes={sizes ?? "100vw"} className={className} />;
    }
    return <Image src={src} alt={alt} width={width ?? 400} height={height ?? 240} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className={cn(fill ? "h-full w-full" : "", className)} />
  );
}

/** Avatar an toàn khi nguồn ảnh có thể là URL ngoài. */
export function SafeAvatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  if (!src || isLocalImage(src)) {
    return <Avatar name={name} src={src} size={size} className={className} />;
  }
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-surface", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" />
    </span>
  );
}
