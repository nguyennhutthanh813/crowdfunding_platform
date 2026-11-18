import type { AuthorizePledgeInput } from "@/lib/api";
import { api } from "@/lib/api";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";

import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";

function isAuthorizeInput(value: unknown): value is AuthorizePledgeInput {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<AuthorizePledgeInput>;
  return Boolean(
    body.campaignId &&
    (typeof body.rewardId === "string" || body.rewardId === null) &&
    (Array.isArray(body.addOnIds) || Array.isArray(body.addOns)) &&
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

    // Chuẩn hóa campaignId thành UUID hợp lệ
    let realCampaignId = body.campaignId;
    let campaignSlug = "";
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realCampaignId);
    if (!isUuid) {
      const foundCampaign =
        (await api.getCampaignBySlug(realCampaignId)) ||
        (await api.listCampaigns()).find(
          (c) => c.slug === realCampaignId || c.id === realCampaignId,
        );
      if (foundCampaign) {
        realCampaignId = foundCampaign.id;
        campaignSlug = foundCampaign.slug;
      }
    } else {
      const foundCampaign = (await api.listCampaigns()).find(
        (c) => c.id === realCampaignId,
      );
      if (foundCampaign) {
        campaignSlug = foundCampaign.slug;
      }
    }

    // Lưu cam kết thật vào cơ sở dữ liệu PostgreSQL NestJS nếu có token
    try {
      const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realCampaignId);
      if (isRealUuid) {
        const addOnsList =
          Array.isArray(body.addOns) && body.addOns.length > 0
            ? body.addOns.map((item) => ({
                addOnId: item.addOnId,
                quantity: Math.max(1, Number(item.quantity) || 1),
              }))
            : (body.addOnIds || []).map((id) => ({ addOnId: id, quantity: 1 }));

        let shippingAddressId = (body as { addressId?: string }).addressId;
        if (!shippingAddressId && body.address) {
          try {
            const addrRes = await fetchBackendWithAuth(
              "/users/me/addresses",
              { method: "GET" },
              access.session,
            );
            if (addrRes.response.ok) {
              const addrs = (await addrRes.response.json()) as
                | Array<{ id?: string; isDefault?: boolean }>
                | { data?: Array<{ id?: string; isDefault?: boolean }> };
              const list = Array.isArray(addrs) ? addrs : addrs?.data || [];
              const def = list.find((a) => a.isDefault) || list[0];
              if (def?.id) shippingAddressId = def.id;
            }

            // Nếu chưa có địa chỉ lưu trong DB nhưng đã nhập trên form, tạo mới luôn vào DB
            if (!shippingAddressId && body.address.fullName?.trim() && body.address.line1?.trim()) {
              const createAddrRes = await fetchBackendWithAuth(
                "/users/me/addresses",
                {
                  method: "POST",
                  body: JSON.stringify({
                    recipientName: body.address.fullName.trim(),
                    phone: body.address.phone.trim() || "0912345678",
                    line1: body.address.line1.trim(),
                    province: body.address.city || "TP. Hồ Chí Minh",
                    isDefault: true,
                  }),
                },
                access.session,
              );
              if (createAddrRes.response.ok) {
                const createdAddr = (await createAddrRes.response.json()) as { id?: string };
                if (createdAddr?.id) shippingAddressId = createdAddr.id;
              }
            }
          } catch {
            // ignore address lookup error
          }
        }

        const validRewardId =
          body.rewardId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.rewardId)
            ? body.rewardId
            : undefined;

        const validShippingOptionId =
          body.shippingOptionId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.shippingOptionId)
            ? body.shippingOptionId
            : undefined;

        const pledgeRes = await fetchBackendWithAuth(
          "/pledges",
          {
            method: "POST",
            body: JSON.stringify({
              campaignId: realCampaignId,
              rewardTierId: validRewardId,
              shippingOptionId: validShippingOptionId,
              shippingAddressId: shippingAddressId || undefined,
              bonusAmount: body.bonusAmount || 0,
              addOns: addOnsList,
              isUpdate: Boolean(body.isUpdate),
            }),
          },
          access.session,
        );

        if (pledgeRes.response.ok) {
          const pledgeData = await pledgeRes.response.json();
          if (pledgeData?.id) {
            try {
              const paymentRes = await fetchBackendWithAuth(
                "/payments/create-intent",
                {
                  method: "POST",
                  body: JSON.stringify({
                    pledgeId: pledgeData.id,
                    simulateSuccess: true,
                  }),
                },
                access.session,
              );
              if (paymentRes.response.ok) {
                const paymentData = await paymentRes.response.json();
                if (paymentData?.authorizationId) {
                  result.authorizationId = paymentData.authorizationId;
                }
              }
            } catch (payErr) {
              console.warn("Payment intent authorization failed:", payErr);
            }
          }
        } else {
          const errDetail = await pledgeRes.response.text().catch(() => "");
          console.warn("Could not save pledge to NestJS:", pledgeRes.response.status, errDetail);
          if (pledgeRes.response.status === 409) {
            return Response.json(
              { message: "Bạn đã có khoản cam kết cho chiến dịch này. Vui lòng chuyển sang cập nhật cam kết hiện có." },
              { status: 409 },
            );
          }
        }
      }
    } catch (dbErr) {
      console.warn("Could not save pledge directly to NestJS DB:", dbErr);
    }

    const campaignCard = (await api.listCampaigns()).find(
      (campaign) =>
        campaign.id === realCampaignId ||
        campaign.slug === realCampaignId ||
        (campaignSlug && campaign.slug === campaignSlug),
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
            campaignId: realCampaignId,
            campaignSlug: campaignSlug || campaign?.slug,
            rewardId: body.rewardId,
            rewardTitle,
            totalAmount: result.totalAmount,
            authorizedAt: result.authorizedAt,
          },
          ...previousPledges,
        ].slice(0, 10),
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
