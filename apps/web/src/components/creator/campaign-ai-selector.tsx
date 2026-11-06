"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, FolderKanban } from "lucide-react";

interface CampaignOption {
  id: string;
  slug: string;
  title: string;
  status: string;
}

export function CampaignAiSelector({
  campaigns,
  currentId,
}: {
  campaigns: CampaignOption[];
  currentId: string;
}) {
  const router = useRouter();

  return (
    <div className="relative mt-7 flex max-w-xl items-center justify-between rounded-[12px] border border-line bg-white px-4 py-2.5 shadow-sm transition hover:border-forest/40">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-forest/5 text-forest">
          <FolderKanban className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="campaign-select"
            className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted"
          >
            Đang phân tích chiến dịch
          </label>
          <select
            id="campaign-select"
            value={currentId}
            onChange={(e) => {
              router.push(
                `/creator/ai?campaignId=${encodeURIComponent(e.target.value)}`,
              );
            }}
            aria-label="Chọn chiến dịch để phân tích dự báo"
            className="w-full cursor-pointer truncate bg-transparent pr-6 font-display text-sm font-bold text-ink outline-none"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — [{c.status}]
              </option>
            ))}
          </select>
        </div>
      </div>
      <ChevronDown className="pointer-events-none size-4 shrink-0 text-ink-muted" />
    </div>
  );
}

