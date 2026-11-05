"use client";

import {
  CampaignVisual,
  type CampaignMotif,
  type CampaignPalette,
} from "./campaign-visual";

interface ProjectHeroMediaProps {
  title: string;
  videoUrl?: string | null;
  visual: {
    motif: CampaignMotif;
    palette: CampaignPalette;
    label: string;
    imageSrc?: string;
    imageAlt?: string;
  };
  className?: string;
  priority?: boolean;
}

export function parseVideoEmbed(url?: string | null): {
  type: "youtube" | "vimeo" | "video" | null;
  embedUrl?: string;
  directUrl?: string;
} {
  if (!url) return { type: null };
  const trimmed = url.trim();

  // YouTube matchers: youtu.be/ID, watch?v=ID, embed/ID, shorts/ID
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/i,
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }

  // Vimeo matchers: vimeo.com/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Direct video file (.mp4, .webm, /uploads/...)
  const isDirectVideo =
    trimmed.endsWith(".mp4") ||
    trimmed.endsWith(".webm") ||
    trimmed.endsWith(".ogg") ||
    trimmed.startsWith("/uploads/") ||
    trimmed.includes("/uploads/videos/");

  if (isDirectVideo) {
    return {
      type: "video",
      directUrl: trimmed,
    };
  }

  return { type: null, directUrl: trimmed };
}

export function ProjectHeroMedia({
  title,
  videoUrl,
  visual,
  className = "",
  priority = false,
}: ProjectHeroMediaProps) {
  const parsed = parseVideoEmbed(videoUrl);
  const hasVideo = Boolean(parsed.type);

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Main Media Showcase Container (16:10 aspect ratio) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[20px] border border-line bg-black shadow-xs">
        {hasVideo ? (
          parsed.type === "youtube" || parsed.type === "vimeo" ? (
            <iframe
              src={parsed.embedUrl}
              title={`Video giới thiệu chiến dịch: ${title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : parsed.type === "video" ? (
            <video
              controls
              playsInline
              preload="metadata"
              src={parsed.directUrl}
              poster={visual.imageSrc}
              className="h-full w-full object-contain bg-black"
            >
              Trình duyệt của bạn không hỗ trợ phát video HTML5.
            </video>
          ) : (
            <CampaignVisual
              {...visual}
              priority={priority}
              className="h-full w-full"
            />
          )
        ) : (
          <CampaignVisual
            {...visual}
            priority={priority}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
}

