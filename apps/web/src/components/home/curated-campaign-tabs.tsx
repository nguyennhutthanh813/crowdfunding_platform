"use client";

import { ArrowRight, Clock3, Flame, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CampaignCard } from "@/components/campaign/campaign-card";
import type { CampaignCardData } from "@/lib/api";
import { fundingPercent } from "@/lib/format";

type CuratedTabId = "trending" | "nearly" | "newest" | "ai";

const TABS: Array<{
  id: CuratedTabId;
  label: string;
  subtitle: string;
  href: string;
  icon: typeof Flame;
  isAi?: boolean;
}> = [
  {
    id: "trending",
    label: "Đang thịnh hành",
    subtitle: "Xếp theo lượng người ủng hộ quan tâm nhiều nhất tuần này.",
    href: "/discover?sort=trending",
    icon: Flame,
  },
  {
    id: "nearly",
    label: "Sắp cán đích",
    subtitle: "Các chiến dịch đang tiến sát 100% mục tiêu trước hạn chốt.",
    href: "/discover?sort=nearly_funded",
    icon: Target,
  },
  {
    id: "newest",
    label: "Mới ra mắt",
    subtitle: "Dự án vừa lên sóng để bạn đón đầu gói Early Bird.",
    href: "/discover?sort=newest",
    icon: Clock3,
  },
  {
    id: "ai",
    label: "✦ Điểm AI cao nhất",
    subtitle: "Xếp hạng theo thuật toán dự báo xác suất thành công của FundViet AI.",
    href: "/discover?sort=ai_score",
    icon: Sparkles,
    isAi: true,
  },
];

export function CuratedCampaignTabs({
  campaigns,
}: {
  campaigns: CampaignCardData[];
}) {
  const [activeTab, setActiveTab] = useState<CuratedTabId>("trending");

  const activeConfig = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const items = useMemo(() => {
    const livePool = campaigns.filter((c) => c.status === "LIVE");
    const pool = livePool.length >= 3 ? livePool : campaigns;
    const copy = [...pool];

    if (activeTab === "nearly") {
      copy.sort(
        (a, b) =>
          fundingPercent(b.pledgedAmount, b.goalAmount) -
          fundingPercent(a.pledgedAmount, a.goalAmount),
      );
    } else if (activeTab === "newest") {
      copy.sort((a, b) => b.daysLeft - a.daysLeft);
    } else if (activeTab === "ai") {
      copy.sort((a, b) => (b.predictionScore ?? 0) - (a.predictionScore ?? 0));
    } else {
      copy.sort((a, b) => b.backerCount - a.backerCount);
    }

    return copy.slice(0, 3);
  }, [activeTab, campaigns]);

  return (
    <section className="border-t border-slate-200/80 bg-surface py-12 sm:py-14">
      <div className="container-shell">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#047857]">Xếp hạng thông minh</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl">
              Chọn góc nhìn bạn quan tâm
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">{activeConfig.subtitle}</p>
          </div>

          <div
            role="tablist"
            aria-label="Bộ lọc chiến dịch nổi bật"
            className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-canvas-soft p-1.5"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition ${
                    active
                      ? tab.isAi
                        ? "bg-[#7C3AED] text-white shadow-xs"
                        : "bg-[#047857] text-white shadow-xs"
                      : tab.isAi
                        ? "text-[#7C3AED] hover:bg-violet-50"
                        : "text-ink-soft hover:bg-surface hover:text-ink"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {items.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              showReason={activeTab === "ai"}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href={activeConfig.href}
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[#047857] hover:underline"
          >
            Xem toàn bộ danh sách {activeConfig.label.replace("✦ ", "").toLowerCase()}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

