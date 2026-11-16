"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PledgeFlow } from "@/components/pledge/pledge-flow";
import { Modal } from "@/components/ui/modal";
import type { CampaignDetail } from "@/lib/api";

export function ProjectPledgeModalButton({
  campaign,
  initialRewardId,
  label = "Ủng hộ dự án",
  className = "",
  fullWidth = false,
}: {
  campaign: CampaignDetail;
  initialRewardId?: string;
  label?: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`button-primary min-h-12 ${fullWidth ? "w-full" : ""} ${className}`}
      >
        {label} <ArrowRight className="size-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Ủng hộ "${campaign.title}"`}
        description="Quy trình ủy quyền cam kết 4 bước theo cơ chế All-or-Nothing."
        badge="M02 · All-or-Nothing"
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-ink-muted">
              ⓘ Bạn chưa bị trừ tiền cho đến khi dự án đạt 100% mục tiêu trước hạn.
            </span>
            <Link
              href={`/pledge/${campaign.slug}${initialRewardId ? `?reward=${encodeURIComponent(initialRewardId)}` : ""}`}
              onClick={() => setOpen(false)}
              className="font-bold text-[#047857] hover:underline"
            >
              Mở trang toàn màn hình →
            </Link>
          </div>
        }
      >
        <div className="-mt-3 max-h-[75dvh] overflow-y-auto pr-1">
          <PledgeFlow
            campaign={campaign}
            initialRewardId={initialRewardId}
          />
        </div>
      </Modal>
    </>
  );
}

