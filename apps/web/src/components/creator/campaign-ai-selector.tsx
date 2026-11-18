"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, FolderKanban } from "lucide-react";

interface CampaignOption {
  id: string;
  slug: string;
  title: string;
  status: string;
}

const statusLabels: Record<string, { label: string; badgeClass: string }> = {
  DRAFT: {
    label: "Bản nháp",
    badgeClass: "bg-stone-100 text-stone-700",
  },
  IN_REVIEW: {
    label: "Đang duyệt",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  PRE_LAUNCH: {
    label: "Sắp mở",
    badgeClass: "bg-sky-50 text-sky-700",
  },
  LIVE: {
    label: "Đang gọi vốn",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  SUCCESSFUL: {
    label: "Thành công",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  FAILED: {
    label: "Đã kết thúc",
    badgeClass: "bg-red-50 text-red-700",
  },
  SUSPENDED: {
    label: "Tạm dừng",
    badgeClass: "bg-red-50 text-red-700",
  },
};

function getStatusMeta(status: string) {
  return (
    statusLabels[status] ?? {
      label: status,
      badgeClass: "bg-stone-100 text-stone-700",
    }
  );
}

export function CampaignAiSelector({
  campaigns,
  currentId,
}: {
  campaigns: CampaignOption[];
  currentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCampaign =
    campaigns.find((c) => c.id === currentId) ?? campaigns[0];
  const currentStatus = currentCampaign
    ? getStatusMeta(currentCampaign.status)
    : null;

  const uniqueStatuses = Array.from(new Set(campaigns.map((c) => c.status)));
  const filteredCampaigns =
    statusFilter === "ALL"
      ? campaigns
      : campaigns.filter((c) => c.status === statusFilter);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (campaignId: string) => {
    setOpen(false);
    if (campaignId !== currentId) {
      router.push(`/creator/ai?campaignId=${encodeURIComponent(campaignId)}`);
    }
  };

  return (
    <div ref={containerRef} className="relative mt-7 max-w-2xl">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3 text-left shadow-sm transition hover:border-forest/40"
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-forest/5 text-forest">
          <FolderKanban className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Đang phân tích chiến dịch
          </p>
          <p className="mt-0.5 truncate font-display text-sm font-bold text-ink">
            {currentCampaign?.title ?? "Chọn chiến dịch"}
          </p>
        </div>
        {currentStatus ? (
          <span
            className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold sm:inline-flex ${currentStatus.badgeClass}`}
          >
            {currentStatus.label}
          </span>
        ) : null}
        <ChevronDown
          className={`size-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Danh sách chiến dịch"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[16px] border border-line bg-white shadow-xl"
        >
          {uniqueStatuses.length > 1 ? (
            <div className="flex flex-wrap gap-1.5 border-b border-line bg-[#fafaf7] px-3 py-2.5">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  statusFilter === "ALL"
                    ? "bg-forest text-white"
                    : "bg-white text-ink-muted hover:text-ink"
                }`}
              >
                Tất cả ({campaigns.length})
              </button>
              {uniqueStatuses.map((st) => {
                const meta = getStatusMeta(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      statusFilter === st
                        ? "bg-forest text-white"
                        : "bg-white text-ink-muted hover:text-ink"
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="max-h-72 overflow-y-auto p-1.5">
            {filteredCampaigns.map((c) => {
              const isSelected = c.id === currentCampaign?.id;
              const meta = getStatusMeta(c.status);
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(c.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left transition ${
                    isSelected
                      ? "bg-[#f2f6e8] text-forest"
                      : "hover:bg-forest/5 text-ink"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Check
                      className={`size-4 shrink-0 ${
                        isSelected ? "text-forest opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="truncate text-sm font-semibold">
                      {c.title}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

