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
      <defs>
        <linearGradient id="fundviet-mark-g" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#fundviet-mark-g)" />
      <path
        d="M20 46V18h18.5c6.4 0 10.5 4 10.5 9.5S44.9 37 38.5 37H29"
        stroke="#fff"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="46" cy="14.5" r="5" fill="#BBF7D0" />
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
      <BrandMark className="size-9 shrink-0 sm:size-10" />
      {!compact ? (
        <span className="leading-none">
          <span
            className={`block font-display text-[1.35rem] font-extrabold tracking-[-0.06em] ${light ? "text-white" : "text-ink"}`}
          >
            Fund<span className={light ? "text-[#86efac]" : "text-coral-dark"}>Việt</span>
          </span>
          <span
            className={`mt-1 block whitespace-nowrap text-[11px] font-semibold ${light ? "text-white/55" : "text-ink-muted"}`}
          >
            Gọi vốn cộng đồng
          </span>
        </span>
      ) : null}
    </span>
  );
}
