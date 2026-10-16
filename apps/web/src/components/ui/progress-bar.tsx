export function ProgressBar({
  value,
  className = '',
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const width = Math.min(100, Math.max(0, value));
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
        className="h-full rounded-full bg-coral transition-[width] duration-700"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
