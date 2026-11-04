import type { AuthorizePledgeInput } from "@/lib/api";
import { api } from "@/lib/api";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import {
  getServerPlatformPreviewState,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { localDbEnabled } from "@/lib/local-db/database";
import { authorizePublicPreviewPledge, publicPreviewCampaignDetail } from "@/lib/creator/public-preview-campaigns";
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";

function isAuthorizeInput(value: unknown): value is AuthorizePledgeInput {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<AuthorizePledgeInput>;
  const addressValid =
    body.address === null ||
    Boolean(
      body.address &&
        typeof body.address.fullName === "string" &&
        body.address.fullName.trim().length >= 2 &&
        body.address.fullName.length <= 80 &&
        typeof body.address.phone === "string" &&
        /^0\d{9}$/.test(body.address.phone.replace(/\D/g, "")) &&
        typeof body.address.line1 === "string" &&
        body.address.line1.trim().length >= 5 &&
        body.address.line1.length <= 160 &&
        typeof body.address.city === "string" &&
        body.address.city.trim().length >= 2 &&
        body.address.city.length <= 80,
    );
  return Boolean(
    typeof body.campaignId === "string" &&
    body.campaignId.length > 0 &&
    body.campaignId.length <= 80 &&
    ((typeof body.rewardId === "string" && body.rewardId.length > 0) ||
      body.rewardId === null) &&
    Array.isArray(body.addOnIds) &&
    body.addOnIds.length <= 6 &&
    body.addOnIds.every((id) => typeof id === "string" && id.length > 0) &&
    (typeof body.shippingOptionId === "string" ||
      body.shippingOptionId === null) &&
    typeof body.bonusAmount === "number" &&
    addressValid,
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

  const platformState = await getServerPlatformPreviewState();
  if (platformState.campaignStatuses[body.campaignId] === "SUSPENDED") {
    return NextResponse.json(
      {
        error: {
          code: "CAMPAIGN_SUSPENDED",
          message:
            "Chiến dịch đang tạm dừng nên chưa thể nhận thêm cam kết ủng hộ.",
          fieldErrors: {},
        },
      },
      { status: 423 },
    );
  }

  try {
    const ownDraft = platformState.campaignDrafts[body.campaignId];
    if (ownDraft?.ownerId === access.session.user.id) throw new Error("SELF_PLEDGE_NOT_ALLOWED");
    const isNewCampaign = isPreviewCampaignId(body.campaignId);
    const campaignCard = isNewCampaign ? null : (await api.listCampaigns()).find(
      (campaign) => campaign.id === body.campaignId,
    );
    const campaign = isNewCampaign
      ? publicPreviewCampaignDetail(body.campaignId, platformState)
      : campaignCard ? await api.getCampaignBySlug(campaignCard.slug) : null;
    if (!campaign || (isNewCampaign && campaign.status !== "LIVE")) throw new Error("CAMPAIGN_NOT_LIVE");
    const result = isNewCampaign
      ? authorizePublicPreviewPledge(body, campaign)
      : await api.authorizePledge(body);
    const rewardTitle = body.rewardId
      ? (campaign?.rewards.find((reward) => reward.id === body.rewardId)
          ?.title ?? "Gói ủng hộ")
      : "Ủng hộ không nhận quà";
    const pledge = {
      authorizationId: result.authorizationId,
      campaignId: body.campaignId,
      backerId: access.session.user.id,
      backerName: access.session.user.name,
      rewardId: body.rewardId,
      rewardTitle,
      totalAmount: result.totalAmount,
      city: body.address?.city ?? "Không cần giao hàng",
      authorizedAt: result.authorizedAt,
      addOnIds: [...new Set(body.addOnIds)],
      shippingOptionId: body.shippingOptionId,
      address: body.address ? {
        fullName: body.address.fullName,
        city: body.address.city.trim(),
        ...(localDbEnabled() ? { phone: body.address.phone, line1: body.address.line1.trim() } : {}),
      } : null,
    };
    const nextPlatformState = {
      ...platformState,
      pledges: [
        pledge,
        ...platformState.pledges.filter(
          (item) =>
            item.campaignId !== body.campaignId ||
            item.backerId !== access.session.user.id,
        ),
      ].slice(0, localDbEnabled() ? undefined : 5),
    };
    const response = NextResponse.json(result, { status: 201 });
    return writePlatformPreviewCookie(response, nextPlatformState, {
      campaignId: body.campaignId,
      actorUserId: access.session.user.id,
      actorRole: "BACKER",
      eventType: "AUTHORIZE_PLEDGE",
      stage: "FUNDING",
      visibility: "INVOLVED",
      title: "Ghi cam kết ủng hộ mẫu",
      detail: `${result.totalAmount.toLocaleString("vi-VN")} đ · ${rewardTitle}. Chưa thu tiền thật.`,
      refId: result.authorizationId,
    }) ?? response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "PLEDGE_INVALID";
    const conflictCodes = new Set(["CAMPAIGN_NOT_LIVE"]);
    const messages: Record<string, string> = {
      CAMPAIGN_NOT_LIVE: "Chiến dịch không còn nhận cam kết",
      SELF_PLEDGE_NOT_ALLOWED: "Chủ dự án không thể tự cam kết cho chiến dịch của mình",
      INVALID_REWARD: "Gói ủng hộ không thuộc chiến dịch",
      REWARD_SOLD_OUT: "Gói ủng hộ này đã hết số lượng; bạn chọn gói khác nhé",
      INVALID_ADD_ON: "Phần bổ sung không thuộc chiến dịch",
      ADD_ON_REQUIRES_REWARD:
        "Chỉ có thể chọn phần bổ sung khi đã chọn gói ủng hộ",
      INVALID_BONUS: "Khoản góp thêm không hợp lệ",
      PLEDGE_TOO_LOW: "Mức ủng hộ tối thiểu là 50.000 đ",
      SHIPPING_REQUIRED:
        "Gói quà này cần chọn cách giao và nhập đủ địa chỉ nhận hàng",
      SHIPPING_NOT_APPLICABLE:
        "Gói đã chọn không phát sinh giao hàng; vui lòng bỏ lựa chọn vận chuyển",
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
