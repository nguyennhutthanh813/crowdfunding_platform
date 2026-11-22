import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-muted/70 shadow-[inset_0_1px_0_rgba(0,0,0,0.02)] transition focus:border-violet-500/60 focus:outline-none focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(base, "h-11", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(base, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(base, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b84b3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className, required }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("block space-y-1.5 text-left", className)}>
      <span className="block text-sm font-semibold text-fg">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {error ? (
        <span className="block whitespace-normal text-xs font-medium text-rose-500">{error}</span>
      ) : hint ? (
        <span className="block whitespace-normal text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Toggle({ name, defaultChecked, label, description }: { name: string; defaultChecked?: boolean; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-surface p-3.5 transition hover:border-violet-400/40">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-zinc-300 transition peer-checked:bg-violet-600 dark:bg-zinc-700" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
