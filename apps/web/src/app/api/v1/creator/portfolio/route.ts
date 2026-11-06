import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";
import { transformCampaignCard } from "@/lib/api/http-api";
import type {
  CreatorCampaignNextAction,
  CreatorPortfolioData,
} from "@/lib/api/contracts";

export async function GET() {
  const access = await requireSession(["CREATOR"]);
  if (access.response) return access.response;

  const user = access.session!.user;
  let campaigns: any[] = [];

  try {
    const { response: res } = await fetchBackendWithAuth(
      "/campaigns/creator/my",
      { method: "GET" },
      access.session,
    );
    if (res.ok) {
      const data = await res.json();
      campaigns = Array.isArray(data) ? data : data.data || [];
    }
  } catch (err) {
    console.warn("Failed to fetch creator campaigns from backend:", err);
  }

  const mappedCampaigns = campaigns.map((c: any) => {
    const card = transformCampaignCard(c);
    const isOwner = Boolean(
      access.session?.user?.id &&
        (c.creatorId === access.session.user.id ||
          c.creator?.id === access.session.user.id),
    );
    let nextAction: CreatorCampaignNextAction = "OPERATE";
    let nextActionLabel = "Vận hành chiến dịch";
    let nextActionDetail =
      "Theo dõi số người ủng hộ và đăng bài viết cập nhật tiến độ.";

    if (c.status === "DRAFT") {
      nextAction = "CONTINUE_DRAFT";
      nextActionLabel = isOwner ? "Hoàn thiện bản nháp" : "Bản nháp đang làm";
      nextActionDetail = isOwner
        ? "Bổ sung gói quà, mô tả câu chuyện và gửi xét duyệt."
        : "Chủ dự án đang hoàn thiện nội dung hồ sơ.";
    } else if (c.status === "IN_REVIEW") {
      nextAction = "FOLLOW_REVIEW";
      nextActionLabel = "Theo dõi hàng chờ duyệt";
      nextActionDetail = "Hồ sơ đang được ban quản trị xem xét trong 24 giờ.";
    } else if (c.status === "PRE_LAUNCH") {
      nextAction = isOwner ? "LAUNCH" : "WAIT_LAUNCH";
      nextActionLabel = isOwner ? "Mở gọi vốn" : "Chờ chủ dự án mở gọi vốn";
      nextActionDetail = isOwner
        ? "Chiến dịch đã được ban quản trị phê duyệt. Bạn có thể mở gọi vốn bất cứ lúc nào."
        : "Chiến dịch đã được ban quản trị phê duyệt. Đang chờ chủ dự án chính thức mở gọi vốn.";
    } else if (c.status === "LIVE") {
      nextAction = "OPERATE";
      nextActionLabel = "Vận hành chiến dịch";
      nextActionDetail =
        "Theo dõi số người ủng hộ và đăng bài viết cập nhật tiến độ.";
    } else if (c.status === "SUCCESSFUL") {
      nextAction = "FULFILL";
      nextActionLabel = "Chuẩn bị giao quà";
      nextActionDetail =
        "Thu thập địa chỉ giao hàng và xuất danh sách sản xuất.";
    }

    return {
      id: card.id,
      slug: card.slug,
      title: card.title,
      blurb: card.blurb,
      category: card.category,
      location: card.location,
      status: card.status,
      ownership: (isOwner ? "OWNER" : "COLLABORATOR") as "OWNER" | "COLLABORATOR",
      goalAmount: card.goalAmount,
      pledgedAmount: card.pledgedAmount,
      backerCount: card.backerCount,
      daysLeft: card.daysLeft,
      teamSize: c.members?.length ?? 1,
      openTaskCount: 2,
      fundingTrend: [
        { date: "Tuần 1", amount: Math.round(card.pledgedAmount * 0.4) },
        { date: "Tuần 2", amount: Math.round(card.pledgedAmount * 0.3) },
        { date: "Tuần 3", amount: Math.round(card.pledgedAmount * 0.2) },
        { date: "Tuần 4", amount: Math.round(card.pledgedAmount * 0.1) },
      ],
      nextAction,
      nextActionLabel,
      nextActionDetail,
    };
  });

  const total = mappedCampaigns.length;
  const live = mappedCampaigns.filter((c) => c.status === "LIVE").length;
  const draftOrReview = mappedCampaigns.filter((c) =>
    ["DRAFT", "IN_REVIEW"].includes(c.status),
  ).length;
  const successful = mappedCampaigns.filter(
    (c) => c.status === "SUCCESSFUL",
  ).length;
  const totalPledgedAmount = mappedCampaigns.reduce(
    (sum, c) => sum + c.pledgedAmount,
    0,
  );

  const portfolio: CreatorPortfolioData = {
    owner: {
      id: user.id,
      name: user.name,
      initials: user.initials,
    },
    activeCampaignId: mappedCampaigns[0]?.id ?? "cmp_default",
    snapshotAt: new Date().toISOString(),
    summary: {
      total,
      live,
      draftOrReview,
      successful,
      totalPledgedAmount,
    },
    campaigns: mappedCampaigns,
  };

  return NextResponse.json(portfolio);
}
