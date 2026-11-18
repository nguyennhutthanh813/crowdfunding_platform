import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="fv-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B6CFF" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="fv-g2" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="1" stopColor="#6EE7B7" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#fv-g1)" />
      <path d="M12 28V12h13" stroke="white" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12 20h8" stroke="white" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <path d="M22 28l5-9 3 5" stroke="url(#fv-g2)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="30" cy="12" r="3" fill="#FBBF24" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)} aria-label="FundViet — trang chủ">
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110" />
      <span className="text-lg font-black tracking-tight">
        Fund<span className="text-gradient">Viet</span>
      </span>
    </Link>
  );
}
