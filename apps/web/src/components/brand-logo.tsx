interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = 'size-10' }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="15" className="fill-lime" />
      <circle
        cx="22.5"
        cy="21.5"
        r="8.5"
        fill="none"
        className="stroke-forest"
        strokeWidth="4.5"
      />
      <path
        d="M31 13v20.1c0 6-3.7 9.4-9.2 9.4-3.5 0-6.5-1.4-8.3-4"
        fill="none"
        className="stroke-forest"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="13.5" cy="38.5" r="3.5" className="fill-forest" />
      <circle cx="37" cy="10.5" r="3.5" className="fill-coral" />
    </svg>
  );
}

export function BrandLogo({
  className = '',
  compact = false,
  light = true,
}: {
  className?: string;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className="size-10 shrink-0 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-[1.03]" />
      {!compact ? (
        <span className="leading-none">
          <span
            className={`block font-display text-[1.35rem] font-extrabold tracking-[-0.055em] ${light ? 'text-white' : 'text-forest'}`}
          >
            Góp Ý
          </span>
          <span
            className={`mt-1 hidden text-[9px] font-semibold tracking-[0.06em] sm:block ${light ? 'text-white/62' : 'text-ink-muted'}`}
          >
            Góp một phần · Làm nên chuyện
          </span>
        </span>
      ) : null}
    </span>
  );
}
