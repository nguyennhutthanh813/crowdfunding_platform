export function ProgressBar({
  value,
  className = "",
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const width = Math.min(100, Math.max(0, value));
  const isComplete = value >= 100;
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-forest/9 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label ?? `Đã đạt ${Math.round(value)} phần trăm`}
    >
      <div
        className={`gop-progress-fill h-full rounded-full transition-[width] duration-700 ${
          isComplete
            ? "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500"
            : "bg-gradient-to-r from-coral-dark via-coral to-[#e05a42]"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
