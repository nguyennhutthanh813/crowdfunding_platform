interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = "size-10" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.5" y="1.5" width="61" height="61" rx="15" fill="#f7f3e8" stroke="#17392f" strokeWidth="2" />
      <rect x="7.5" y="10" width="23" height="32" rx="9" fill="#17392f" />
      <rect x="33.5" y="10" width="23" height="32" rx="9" fill="#b74934" />
      <text x="19" y="31" textAnchor="middle" fill="#fffef7" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800" letterSpacing="-1">PT</text>
      <text x="45" y="31" textAnchor="middle" fill="#fffef7" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800" letterSpacing="-1">NT</text>
      <path d="M19 45L32 55L45 45" fill="none" stroke="#17392f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="54" r="3.5" fill="#b74934" />
    </svg>
  );
}

export function BrandLogo({
  className = "",
  compact = false,
  light = true,
}: {
  className?: string;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className="size-10 shrink-0 sm:size-11" />
      {!compact ? (
        <span className="leading-none">
          <span
            className={`block font-display text-[1.45rem] font-extrabold tracking-[-0.075em] ${light ? "text-white" : "text-forest"}`}
          >
            Góp
          </span>
          <span
            className={`mt-1 block whitespace-nowrap text-[11px] font-bold ${light ? "text-[#efb29d]" : "text-[#9c3d2b]"}`}
          >
            <span className="xl:hidden">Phước Thịnh × Nhựt Thanh</span>
            <span className="hidden xl:inline">Võ Phước Thịnh × Nguyễn Nhựt Thanh</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
