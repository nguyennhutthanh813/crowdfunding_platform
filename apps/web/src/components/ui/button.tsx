import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success" | "gold";
type Size = "xs" | "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-[0_8px_24px_-8px_rgba(109,74,255,0.65)] hover:shadow-[0_10px_30px_-6px_rgba(109,74,255,0.8)] hover:brightness-110",
  secondary: "bg-surface-2 text-fg hover:bg-violet-500/10 border border-line",
  ghost: "text-fg hover:bg-violet-500/10",
  outline: "border border-line bg-surface text-fg hover:border-violet-400/60 hover:bg-violet-500/5",
  danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_8px_20px_-8px_rgba(225,29,72,0.6)]",
  success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.65)]",
  gold: "bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 hover:brightness-105 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.7)]",
};
const SIZES: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-lg",
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-13 px-7 text-base gap-2.5 rounded-2xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant, size, className, children, ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
