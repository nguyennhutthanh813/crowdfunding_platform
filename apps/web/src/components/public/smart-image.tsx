import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Hiển thị ảnh an toàn: dùng next/image cho đường dẫn nội bộ (/...)
 * và <img> chuẩn cho URL ngoài (http/https) để không lỗi domain chưa cấu hình.
 */
export function SmartImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  priority,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) return null;
  if (src.startsWith("/")) {
    if (fill) {
      return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={width ?? 1200}
        height={height ?? 750}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }
  // URL ngoài (creator nhập từ internet) — dùng <img> thay vì next/image theo quy ước dự án.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      className={cn(fill ? "absolute inset-0 h-full w-full" : "h-auto w-full", className)}
    />
  );
}

/** Chuẩn hoá link YouTube / Vimeo sang dạng embed, hoặc trả về null nếu là file video trực tiếp. */
export function toEmbedVideoUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url) || url.startsWith("/uploads/")) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1]?.split("/")[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      if (u.hostname.startsWith("player.vimeo.com")) return url;
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return null;
  }
}

export function VideoFrame({ url, title, className }: { url: string; title: string; className?: string }) {
  const embed = toEmbedVideoUrl(url);
  if (!embed) {
    return (
      <video src={url} controls playsInline preload="metadata" className={cn("aspect-video w-full rounded-2xl bg-black", className)}>
        Trình duyệt của bạn không hỗ trợ phát video.
      </video>
    );
  }
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-2xl bg-black", className)}>
      <iframe
        src={embed}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
