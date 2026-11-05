import type { Metadata } from "next";
import { CampaignWizard } from "@/components/creator/campaign-wizard";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyCreatorPortfolioPreviewState } from "@/lib/preview-read-models";

export const metadata: Metadata = {
  title: "Tạo / Chỉnh sửa chiến dịch",
  description:
    "Tạo chiến dịch, chỉnh sửa nội dung và xem trước khi gửi duyệt.",
};

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const isEditing = Boolean(campaign);
  const editingOrbitMini = campaign === "orbit-mini-bo-pha-gon";

  let initialDraft: any = undefined;
  let initialRewards: any = undefined;
  let initialAddOns: any = undefined;
  let initialCollaborators: any = undefined;
  let campaignId: string | undefined = editingOrbitMini
    ? "cmp_orbit_mini"
    : undefined;
  let reviewFeedback: string | null = null;

  if (campaign && !editingOrbitMini) {
    const [session, platformState] = await Promise.all([
      getServerSession(),
      getServerPlatformPreviewState(),
    ]);

    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:3001/api";

    let rawCampaign: any = null;

    // 1. Thử lấy từ backend NestJS API
    const endpointsToTry = [
      `${apiUrl}/campaigns/${encodeURIComponent(campaign)}`,
      `http://127.0.0.1:3001/api/campaigns/${encodeURIComponent(campaign)}`,
    ];

    for (const url of endpointsToTry) {
      if (rawCampaign) break;
      try {
        const res = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          rawCampaign = await res.json();
        }
      } catch {
        // Tiếp tục thử fallback
      }
    }

    // 2. Lấy từ portfolio preview nếu có
    let basePortfolio = null;
    try {
      basePortfolio = await api.getCreatorPortfolio(
        session?.user.id,
        session?.tokens?.accessToken,
        session?.user
          ? {
              name: session.user.name,
              id: session.user.id,
              email: session.user.email,
              initials: session.user.initials,
            }
          : undefined,
      );
    } catch {
      // Bỏ qua lỗi portfolio
    }

    const portfolio = basePortfolio
      ? applyCreatorPortfolioPreviewState(basePortfolio, platformState)
      : null;
    const portfolioCampaign = portfolio?.campaigns.find(
      (c) => c.slug === campaign,
    );

    // Đảm bảo chỉ người sở hữu chiến dịch mới được tải dữ liệu vào form chỉnh sửa
    const isOwner = Boolean(
      portfolioCampaign ||
        (rawCampaign &&
          session?.user?.id &&
          (rawCampaign.creatorId === session.user.id ||
            rawCampaign.creator?.id === session.user.id)),
    );

    if (rawCampaign && !isOwner) {
      rawCampaign = null;
    }

    if (rawCampaign) {
      campaignId = rawCampaign.id;
      const videoMedia = rawCampaign.media?.find(
        (m: any) => m.mediaType === "VIDEO",
      );
      const imageMedia = rawCampaign.media?.find(
        (m: any) => m.mediaType === "IMAGE" || !m.mediaType,
      );

      initialDraft = {
        title: rawCampaign.title || "",
        blurb: rawCampaign.blurb || "",
        category: rawCampaign.category?.slug || rawCampaign.category?.name || "cong-nghe-sang-tao",
        goal: String(rawCampaign.goalAmount || ""),
        duration: String(rawCampaign.durationDays || 30),
        location: rawCampaign.location || "TP. Hồ Chí Minh",
        imageUrl: imageMedia?.url || "",
        story:
          rawCampaign.storyMarkdown ||
          (typeof rawCampaign.story === "string"
            ? rawCampaign.story
            : rawCampaign.story?.paragraphs?.join("\n\n")) ||
          rawCampaign.blurb ||
          "",
        risks:
          rawCampaign.risksMarkdown ||
          (typeof rawCampaign.risks === "string"
            ? rawCampaign.risks
            : rawCampaign.story?.risks) ||
          "",
        shippingFee: "45000",
        hasVideo: Boolean(videoMedia?.url),
        videoUrl: videoMedia?.url || "",
      };

      if (
        Array.isArray(rawCampaign.rewardTiers) &&
        rawCampaign.rewardTiers.length > 0
      ) {
        initialRewards = rawCampaign.rewardTiers.map(
          (r: any, idx: number) => ({
            id: idx + 1,
            title: r.title || "",
            amount: String(r.amount || ""),
            delivery: r.estimatedDelivery
              ? new Date(r.estimatedDelivery).toLocaleDateString("vi-VN", {
                  month: "2-digit",
                  year: "numeric",
                })
              : "12/2026",
            limit: r.quantityLimit ? String(r.quantityLimit) : "",
          }),
        );
      }

      if (Array.isArray(rawCampaign.addOns) && rawCampaign.addOns.length > 0) {
        initialAddOns = rawCampaign.addOns.map((a: any, idx: number) => ({
          id: idx + 1,
          title: a.title || "",
          amount: String(a.amount || ""),
        }));
      }

      if (Array.isArray(rawCampaign.members) && rawCampaign.members.length > 0) {
        initialCollaborators = rawCampaign.members.map(
          (m: any, idx: number) => ({
            id: idx + 1,
            email: m.user?.email || "",
            name: m.user?.displayName || "Thành viên",
            canUpdate: m.canPostUpdates ?? true,
            canReply: m.canReplyComments ?? true,
            canViewAi: m.canViewAiDashboard ?? true,
          }),
        );
      }

      // Lấy phản hồi yêu cầu sửa của ban quản trị nếu có
      reviewFeedback =
        rawCampaign.reviews?.find(
          (r: any) => r.decision === "CHANGES_REQUESTED" || r.feedback,
        )?.feedback ||
        portfolioCampaign?.reviewFeedback ||
        (platformState?.reviewFeedback
          ? platformState.reviewFeedback[rawCampaign.id]
          : null) ||
        null;
    } else if (portfolioCampaign) {
      campaignId = portfolioCampaign.id;
      initialDraft = {
        title: portfolioCampaign.title || "",
        blurb: portfolioCampaign.blurb || "",
        category: portfolioCampaign.category || "Công nghệ & Sáng tạo",
        goal: String(portfolioCampaign.goalAmount || ""),
        duration: "30",
        location: portfolioCampaign.location || "TP. Hồ Chí Minh",
        story:
          (portfolioCampaign as any).story ||
          portfolioCampaign.blurb ||
          "",
        risks: (portfolioCampaign as any).risks || "",
        shippingFee: "45000",
        hasVideo: false,
        videoUrl: "",
      };
      reviewFeedback = portfolioCampaign.reviewFeedback || null;
    }
  }

  return (
    <CampaignWizard
      key={campaign || "new"}
      prefillSample={editingOrbitMini}
      mode={isEditing ? "edit" : "create"}
      campaignId={campaignId}
      campaignSlug={campaign}
      initialDraft={initialDraft}
      initialRewards={initialRewards}
      initialAddOns={initialAddOns}
      initialCollaborators={initialCollaborators}
      reviewFeedback={reviewFeedback}
    />
  );
}
