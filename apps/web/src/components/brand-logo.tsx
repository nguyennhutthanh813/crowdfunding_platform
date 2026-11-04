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
      <rect x="1" y="1" width="62" height="62" rx="11" fill="#f2eadb" stroke="#17392f" strokeWidth="2" />
      <text x="32" y="28" textAnchor="middle" fill="#17392f" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-1">PT</text>
      <path d="M12 33h40" stroke="#c95339" strokeWidth="3" strokeLinecap="round" />
      <text x="32" y="55" textAnchor="middle" fill="#17392f" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-1">NT</text>
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
            <span className="xl:hidden">Phước Thịnh × Nhật Thanh</span>
            <span className="hidden xl:inline">Võ Phước Thịnh × Nhật Thanh Nguyễn</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
