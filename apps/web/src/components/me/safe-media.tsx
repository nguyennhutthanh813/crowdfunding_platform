import Image from "next/image";
import { Avatar } from "@/components/ui/primitives";
import { cn, initials } from "@/lib/utils";

const AVATAR_COLORS = ["#7C3AED", "#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#F43F5E", "#14B8A6"];

export function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  className,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) return null;
  if (src.startsWith("/")) {
    return fill ? (
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />
    ) : (
      <Image src={src} alt={alt} width={width ?? 400} height={height ?? 300} priority={priority} className={className} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={cn(fill && "absolute inset-0 size-full", className)}
    />
  );
}

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
  if (!src || src.startsWith("/")) {
    return <Avatar name={name} src={src} size={size} className={className} />;
  }
  const color = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-surface", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full object-cover" />
      <span className="sr-only">{initials(name)}</span>
    </span>
  );
}
