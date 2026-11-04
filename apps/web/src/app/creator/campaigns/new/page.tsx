import type { Metadata } from "next";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { CampaignWizard } from "@/components/creator/campaign-wizard";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { previewCampaignStatus } from "@/lib/creator/preview-campaigns";

export const metadata: Metadata = {
  title: "Tạo chiến dịch",
  description:
    "Tạo hồ sơ chiến dịch riêng, lưu nháp và gửi quản trị viên xét duyệt trong bản demo.",
};

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; draft?: string }>;
}) {
  const { campaign, draft: draftId } = await searchParams;
  const [session, platformState] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  if (!session?.user.roles.includes("CREATOR")) {
    return <CampaignAccessNotice message="Hãy đăng nhập bằng tài khoản có vai trò Chủ dự án để tạo hồ sơ." />;
  }
  if (campaign) {
    if (campaign !== "orbit-mini-bo-pha-gon" || session.user.id !== "usr_hoang_linh") {
      return <CampaignAccessNotice message="Hồ sơ mẫu này không thuộc tài khoản đang đăng nhập." />;
    }
    const miniReview = platformState.submittedReviews.find((item) => item.campaignId === "cmp_orbit_mini");
    const miniDecision = miniReview && platformState.reviewDecisions[miniReview.id];
    return (
      <CampaignWizard
        prefillSample
        mode="edit"
        campaignId="cmp_orbit_mini"
        campaignSlug="orbit-mini-bo-pha-gon"
        initialDraft={platformState.campaignDrafts.cmp_orbit_mini}
        reviewStatus={miniReview && !miniDecision ? "IN_REVIEW" : miniDecision === "APPROVED" ? "PRE_LAUNCH" : "DRAFT"}
        reviewFeedback={miniReview ? platformState.reviewFeedback[miniReview.id] : undefined}
      />
    );
  }
  if (draftId) {
    const saved = platformState.campaignDrafts[draftId];
    if (!saved || saved.ownerId !== session.user.id) {
      return <CampaignAccessNotice message="Bản nháp không tồn tại trong dữ liệu thử hoặc không thuộc tài khoản đang đăng nhập." />;
    }
    const review = platformState.submittedReviews.find((item) => item.campaignId === draftId);
    return (
      <CampaignWizard
        mode="create"
        campaignId={draftId}
        initialDraft={saved}
        reviewStatus={previewCampaignStatus(draftId, platformState)}
        reviewFeedback={review ? platformState.reviewFeedback[review.id] : undefined}
      />
    );
  }
  return <CampaignWizard mode="create" />;
}
