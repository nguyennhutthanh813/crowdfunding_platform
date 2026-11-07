import type { CampaignStatus, CreatorPortfolioCampaign } from "@/lib/api/contracts";
import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";

export function isPreviewCampaignId(id: string) {
  return /^cmp_preview_[a-f0-9]{12}$/.test(id);
}

export function previewCampaignStatus(
  campaignId: string,
  platform: PlatformPreviewState,
): CampaignStatus {
  if (platform.campaignStatuses[campaignId]) return platform.campaignStatuses[campaignId];
  const review = platform.submittedReviews.find(
    (item) => item.campaignId === campaignId,
  );
  if (!review) return "DRAFT";
  const decision = platform.reviewDecisions[review.id];
  if (decision === "APPROVED") return "PRE_LAUNCH";
  if (decision === "CHANGES" || decision === "REJECTED") return "DRAFT";
  return "IN_REVIEW";
}

export function previewCampaignsForOwner(
  ownerId: string,
  platform: PlatformPreviewState,
): CreatorPortfolioCampaign[] {
  return Object.values(platform.campaignDrafts)
    .filter(
      (item) => isPreviewCampaignId(item.campaignId) && item.ownerId === ownerId,
    )
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .map((item) => {
      const review = platform.submittedReviews.find(
        (row) => row.campaignId === item.campaignId,
      );
      const decision = review && platform.reviewDecisions[review.id];
      const status = previewCampaignStatus(item.campaignId, platform);
      const launchAt = platform.campaignLaunchAt?.[item.campaignId];
      const elapsedDays = launchAt
        ? Math.max(0, Math.floor((Date.now() - new Date(launchAt).getTime()) / 86_400_000))
        : 0;
      const acceptedTeam = platform.acceptedCollaborators[item.campaignId] ?? [];
      return {
        id: item.campaignId,
        slug: item.campaignId,
        title: item.draft.title || "Chiến dịch chưa đặt tên",
        blurb: item.draft.blurb || "Bản nháp mới, chưa có mô tả ngắn.",
        category: item.draft.category || "Chưa chọn",
        location: item.draft.location || "Chưa cập nhật",
        status,
        ownership: "OWNER" as const,
        goalAmount: Number(item.draft.goal) || 0,
        pledgedAmount: platform.pledges.filter((pledge) => pledge.campaignId === item.campaignId)
          .reduce((sum, pledge) => sum + pledge.totalAmount, 0),
        backerCount: new Set(platform.pledges.filter((pledge) => pledge.campaignId === item.campaignId)
          .map((pledge) => pledge.backerId)).size,
        daysLeft: Math.max(0, (Number(item.draft.duration) || 0) - elapsedDays),
        teamSize: 1 + acceptedTeam.length,
        openTaskCount: 0,
        fundingTrend: [],
        nextAction: status === "DRAFT" ? "CONTINUE_DRAFT" as const
          : status === "LIVE" ? "OPERATE" as const : "FOLLOW_REVIEW" as const,
        nextActionLabel:
          status === "DRAFT"
            ? "Tiếp tục bản nháp"
            : status === "IN_REVIEW"
              ? "Xem hồ sơ đang duyệt"
            : status === "LIVE" ? "Theo dõi chiến dịch"
              : status === "PRE_LAUNCH" ? "Xem trước & mở gọi vốn"
                : status === "SUSPENDED" ? "Xem trạng thái tạm dừng"
                  : "Xem kết quả duyệt",
        nextActionDetail:
          decision === "CHANGES" || decision === "REJECTED"
            ? platform.reviewFeedback[review!.id] || "Xem lại góp ý của quản trị viên."
            : status === "IN_REVIEW"
              ? `Hồ sơ gửi lần ${review?.submissionVersion ?? 1} đang chờ quản trị viên.`
              : status === "PRE_LAUNCH"
                ? "Hồ sơ đã duyệt. Kiểm tra trang xem trước rồi mở gọi vốn khi sẵn sàng."
                : status === "LIVE"
                  ? "Trang dự án đang công khai và có thể nhận cam kết mẫu."
                  : status === "SUSPENDED"
                    ? "Chiến dịch đang tạm dừng; không nhận cam kết mới."
                  : "Hồ sơ đã lưu, chưa gửi xét duyệt và chưa nhận cam kết.",
      };
    });
}
