import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  invert?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  invert = false,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div className="max-w-2xl">
        <p className={`eyebrow ${invert ? 'text-lime' : 'text-coral'}`}>
          {eyebrow}
        </p>
        <h2
          className={`mt-3 font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.045em] sm:text-4xl ${invert ? 'text-white' : 'text-ink'}`}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={`mt-4 max-w-xl text-[15px] leading-7 ${invert ? 'text-white/58' : 'text-ink-soft'}`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
