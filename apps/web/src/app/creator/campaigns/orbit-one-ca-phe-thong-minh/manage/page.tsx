import type { Metadata } from "next";
import { FolderKanban, Sparkles } from "lucide-react";
import Link from "next/link";
import { CreatorCampaignOperations } from "@/components/creator/creator-campaign-operations";
import { api } from "@/lib/api";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyOperationsPreviewState } from "@/lib/preview-read-models";

export const metadata: Metadata = {
  title: "Vận hành ORBIT One",
  description:
    "Theo dõi gọi vốn, cộng tác viên và cộng đồng của chiến dịch ORBIT One.",
};

export default async function CreatorCampaignManagePage() {
  const [assistant, baseOperations, session, platformState] = await Promise.all(
    [
      api.getCreatorAssistantData(),
      api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
      getServerSession(),
      getServerPlatformPreviewState(),
    ],
  );
  if (
    !session ||
    !resolveCampaignAccess(baseOperations.campaignId, session, platformState)
      .isOwner
  ) {
    return (
      <CampaignAccessNotice message="Trang vận hành này thuộc chủ dự án ORBIT One. Tài khoản Chủ dự án khác không được xem dữ liệu vận hành của nhóm." />
    );
  }
  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8 sm:py-10">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="eyebrow text-[#526827]">
                <FolderKanban className="size-4" />
                Vận hành chiến dịch
              </span>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                ORBIT One — trung tâm vận hành.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                Theo dõi phản hồi xét duyệt, cộng tác viên, cập nhật cộng đồng
                và tiến độ giao quà tại một nơi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/creator/ai"
                className="button-secondary min-h-11 px-4 text-xs"
              >
                <Sparkles className="size-4" /> Xem dự báo
              </Link>
              <Link
                href="/projects/orbit-one-ca-phe-thong-minh"
                className="button-primary min-h-11 px-4 text-xs"
              >
                Xem trang công khai
              </Link>
            </div>
          </div>
        </div>
      </div>
      <CreatorCampaignOperations
        viewerRole="creator"
        assistantData={assistant.comments}
        operations={operations}
      />
    </section>
  );
}
