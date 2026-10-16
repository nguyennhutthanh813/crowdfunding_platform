import {
  Coffee,
  Dice5,
  Headphones,
  HeartPulse,
  LampDesk,
  Leaf,
} from 'lucide-react';
import Image from 'next/image';

export type CampaignMotif = 'coffee' | 'game' | 'light' | 'health' | 'music' | 'eco';
export type CampaignPalette = 'ember' | 'mint' | 'indigo' | 'sun' | 'rose' | 'ocean';

const icons = {
  coffee: Coffee,
  game: Dice5,
  light: LampDesk,
  health: HeartPulse,
  music: Headphones,
  eco: Leaf,
};

const palettes: Record<CampaignPalette, string> = {
  ember: 'from-[#51291f] via-[#b84e34] to-[#f4a15c] text-[#fff5e9]',
  mint: 'from-[#173e31] via-[#2f7557] to-[#b9dc8d] text-[#f4ffe9]',
  indigo: 'from-[#191d48] via-[#4350a0] to-[#d28bd4] text-[#fbf4ff]',
  sun: 'from-[#493b22] via-[#a47a34] to-[#f4d58a] text-[#fff9e8]',
  rose: 'from-[#492238] via-[#a64664] to-[#f3a1a6] text-[#fff5f7]',
  ocean: 'from-[#13384a] via-[#267994] to-[#9bd7dc] text-[#f2fdff]',
};

interface CampaignVisualProps {
  motif: CampaignMotif;
  palette: CampaignPalette;
  label: string;
  imageSrc?: string;
  imageAlt?: string;
  compact?: boolean;
  className?: string;
  priority?: boolean;
}

export function CampaignVisual({
  motif,
  palette,
  label,
  imageSrc,
  imageAlt,
  compact = false,
  className = '',
  priority = false,
}: CampaignVisualProps) {
  const Icon = icons[motif];
  return (
    <div
      className={`relative isolate overflow-hidden bg-gradient-to-br ${palettes[palette]} ${className}`}
      role="group"
      aria-label={`Hình ảnh dự án ${label}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt ?? `Hình ảnh dự án ${label}`}
          fill
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          sizes={
            compact
              ? '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'
              : '(max-width: 1024px) 100vw, 58vw'
          }
          className="object-cover"
        />
      ) : (
        <>
          <div className="absolute -right-[12%] -top-[25%] aspect-square w-[70%] rounded-full border border-white/20 bg-white/8 backdrop-blur-md" />
          <div className="absolute -bottom-[28%] -left-[8%] aspect-square w-[58%] rounded-full border border-white/12 bg-black/8" />
          <div className="absolute left-[12%] top-[14%] h-px w-[56%] bg-gradient-to-r from-white/50 to-transparent" />
          <div
            className="absolute bottom-[14%] right-[10%] grid grid-cols-3 gap-1.5 opacity-40"
            aria-hidden="true"
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={index} className="size-1 rounded-full bg-white" />
            ))}
          </div>
          <div
            className={`relative z-10 flex h-full flex-col justify-between ${compact ? 'p-5' : 'p-7 sm:p-9'}`}
          >
            <span className="eyebrow text-current/70">Hình đang cập nhật</span>
            <div className="flex items-end justify-between gap-4">
              <div>
                <Icon
                  className={`${compact ? 'size-8' : 'size-11'} mb-4 stroke-[1.5]`}
                  aria-hidden="true"
                />
                <p
                  className={`font-display font-extrabold tracking-[-0.06em] ${compact ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}
                >
                  {label}
                </p>
              </div>
              <span className="rounded-full border border-white/22 bg-white/10 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur">
                Đang hoàn thiện
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
