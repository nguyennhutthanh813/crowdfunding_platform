import type { AuthorizePledgeInput } from "@/lib/api";
import { api } from "@/lib/api";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";

function isAuthorizeInput(value: unknown): value is AuthorizePledgeInput {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<AuthorizePledgeInput>;
  return Boolean(
    body.campaignId &&
    (typeof body.rewardId === "string" || body.rewardId === null) &&
    Array.isArray(body.addOnIds) &&
    typeof body.bonusAmount === "number" &&
    body.address?.fullName &&
    body.address?.phone &&
    body.address?.line1 &&
    body.address?.city,
  );
}

export async function POST(request: Request) {
  const access = await requireSession(["BACKER"]);
  if (access.response) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "JSON không hợp lệ" }, { status: 400 });
  }

  if (!isAuthorizeInput(body)) {
    return Response.json(
      { message: "Thiếu thông tin cam kết hoặc địa chỉ giao hàng" },
      { status: 422 },
    );
  }

  try {
    const result = await api.authorizePledge(body);
    const campaignCard = (await api.listCampaigns()).find(
      (campaign) => campaign.id === body.campaignId,
    );
    const campaign = campaignCard
      ? await api.getCampaignBySlug(campaignCard.slug)
      : null;
    const rewardTitle = body.rewardId
      ? (campaign?.rewards.find((reward) => reward.id === body.rewardId)
          ?.title ?? "Gói ủng hộ")
      : "Ủng hộ không nhận quà";
    const previousPledges =
      access.session.previewState?.authorizedPledges ?? [];
    const nextSession = {
      ...access.session,
      previewState: {
        ...access.session.previewState,
        authorizedPledges: [
          {
            authorizationId: result.authorizationId,
            campaignId: body.campaignId,
            rewardId: body.rewardId,
            rewardTitle,
            totalAmount: result.totalAmount,
            authorizedAt: result.authorizedAt,
          },
          ...previousPledges,
        ].slice(0, 5),
      },
    };
    const response = NextResponse.json(result, { status: 201 });
    return writePreviewSessionCookie(response, nextSession) ?? response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "PLEDGE_INVALID";
    const conflictCodes = new Set(["CAMPAIGN_NOT_LIVE"]);
    const messages: Record<string, string> = {
      CAMPAIGN_NOT_LIVE: "Chiến dịch không còn nhận cam kết",
      INVALID_REWARD: "Gói ủng hộ không thuộc chiến dịch",
      INVALID_ADD_ON: "Phần bổ sung không thuộc chiến dịch",
      ADD_ON_REQUIRES_REWARD:
        "Chỉ có thể chọn phần bổ sung khi đã chọn gói ủng hộ",
      INVALID_BONUS: "Khoản góp thêm không hợp lệ",
      PLEDGE_TOO_LOW: "Mức ủng hộ tối thiểu là 50.000 đ",
    };
    return Response.json(
      {
        error: {
          code,
          message: messages[code] ?? "Cam kết không hợp lệ",
          fieldErrors: {},
          requestId: `req_${crypto.randomUUID().slice(0, 8)}`,
        },
      },
      { status: conflictCodes.has(code) ? 409 : 422 },
    );
  }
}
