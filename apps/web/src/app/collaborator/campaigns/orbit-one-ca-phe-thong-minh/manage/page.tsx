import type { Metadata } from "next";
import { ArrowLeft, Eye, FolderKanban, Sparkles } from "lucide-react";
import Link from "next/link";
import { CreatorCampaignOperations } from "@/components/creator/creator-campaign-operations";
import { api } from "@/lib/api";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyOperationsPreviewState } from "@/lib/preview-read-models";

export const metadata: Metadata = {
  title: "Cập nhật chiến dịch ORBIT One",
  description:
    "Đăng cập nhật và trả lời bình luận trong phạm vi được chủ dự án phân công.",
};

export default async function CollaboratorCampaignManagePage() {
  const [assistant, baseOperations, session, platformState] = await Promise.all(
    [
      api.getCreatorAssistantData(),
      api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
      getServerSession(),
      getServerPlatformPreviewState(),
    ],
  );
  const access = session
    ? resolveCampaignAccess(baseOperations.campaignId, session, platformState)
    : null;
  if (
    !access?.canOpenWorkspace ||
    (!access.canPostUpdates && !access.canReplyComments)
  ) {
    return (
      <CampaignAccessNotice message="Bạn chưa được cấp quyền đăng cập nhật hoặc trả lời trong dự án này. Hãy trao đổi với chủ dự án nếu cần thay đổi phân công." />
    );
  }
  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-[#c8d9ec] bg-[#e8f0f8] py-8 sm:py-10">
        <div className="container-shell">
          <Link
            href="/collaborator"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#315b86] hover:text-blue-700"
          >
            <ArrowLeft className="size-4" /> Trở về công việc được giao
          </Link>
          <div className="mt-7 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="eyebrow text-[#2869ac]">
                <FolderKanban className="size-4" /> Nội dung được phân công
              </span>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                ORBIT One — cùng nhóm cập nhật tiến độ.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                Bạn có thể đăng cập nhật và trả lời bình luận. Các thiết lập
                quan trọng vẫn do chủ dự án quản lý.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/collaborator/forecast"
                className="button-secondary min-h-11 px-4 text-xs"
              >
                <Sparkles className="size-4" /> Xem dự báo
              </Link>
              <Link
                href="/projects/orbit-one-ca-phe-thong-minh"
                className="button-primary min-h-11 px-4 text-xs"
              >
                <Eye className="size-4" /> Xem trang công khai
              </Link>
            </div>
          </div>
        </div>
      </div>
      <CreatorCampaignOperations
        viewerRole="collaborator"
        assistantData={assistant.comments}
        operations={operations}
      />
    </section>
  );
}
