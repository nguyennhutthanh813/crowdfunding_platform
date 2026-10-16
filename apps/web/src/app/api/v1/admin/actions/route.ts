import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  findMockCampaign,
  getMockCampaignReview,
  getMockFraudAlert,
  mockCampaignReviews,
  mockFraudAlerts,
  mockUsers,
} from "@/lib/api/mock/relational-store";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import {
  decodePlatformPreview,
  PLATFORM_PREVIEW_COOKIE_NAME,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";

const allowedActions = new Set([
  "REVIEW_CAMPAIGN",
  "RESOLVE_FRAUD",
  "UPDATE_PLATFORM_FEE",
  "SET_USER_STATUS",
  "SET_CAMPAIGN_STATUS",
]);

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function asPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(request: Request) {
  const access = await requireSession(["ADMIN"]);
  if (access.response) return access.response;
  const cookieStore = await cookies();
  const platformState = decodePlatformPreview(
    cookieStore.get(PLATFORM_PREVIEW_COOKIE_NAME)?.value,
  );

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.");
  }

  const body = asPayload(rawBody);
  const action = typeof body.action === "string" ? body.action : "";
  const payload = asPayload(body.payload);
  if (!allowedActions.has(action)) {
    return apiError(
      400,
      "INVALID_ADMIN_ACTION",
      "Thao tác quản trị không hợp lệ.",
    );
  }

  if (action === "REVIEW_CAMPAIGN") {
    const reviewId =
      typeof payload.reviewId === "string" ? payload.reviewId : "";
    const review = mockCampaignReviews.some((item) => item.id === reviewId)
      ? getMockCampaignReview(reviewId)
      : platformState.submittedReviews.find((item) => item.id === reviewId);
    const decision =
      typeof payload.decision === "string" ? payload.decision : "";
    const feedback =
      typeof payload.feedback === "string" ? payload.feedback.trim() : "";
    if (!review) {
      return apiError(
        404,
        "REVIEW_NOT_FOUND",
        "Không tìm thấy hồ sơ cần duyệt.",
      );
    }
    if (!new Set(["APPROVED", "CHANGES", "REJECTED"]).has(decision)) {
      return apiError(
        422,
        "REVIEW_DECISION_INVALID",
        "Kết quả xét duyệt không hợp lệ.",
      );
    }
    if (decision !== "APPROVED" && !feedback) {
      return apiError(
        422,
        "REVIEW_FEEDBACK_REQUIRED",
        "Cần ghi phản hồi khi yêu cầu sửa hoặc từ chối.",
      );
    }
  }

  if (action === "RESOLVE_FRAUD") {
    const alertId = typeof payload.alertId === "string" ? payload.alertId : "";
    const alert = mockFraudAlerts.some((item) => item.id === alertId)
      ? getMockFraudAlert(alertId)
      : null;
    const status = typeof payload.status === "string" ? payload.status : "";
    const resolution =
      typeof payload.resolution === "string" ? payload.resolution.trim() : "";
    if (!alert) {
      return apiError(
        404,
        "FRAUD_ALERT_NOT_FOUND",
        "Không tìm thấy cảnh báo gian lận.",
      );
    }
    if (!new Set(["CLEARED", "ESCALATED"]).has(status) || !resolution) {
      return apiError(
        422,
        "FRAUD_RESOLUTION_INVALID",
        "Cần chọn kết luận và ghi rõ căn cứ xử lý.",
      );
    }
  }

  if (action === "UPDATE_PLATFORM_FEE") {
    const percent = payload.percent;
    if (
      typeof percent !== "number" ||
      !Number.isFinite(percent) ||
      percent < 0 ||
      percent > 20 ||
      payload.appliesTo !== "NEW_CAMPAIGNS"
    ) {
      return apiError(
        422,
        "PLATFORM_FEE_INVALID",
        "Phí nền tảng phải nằm trong khoảng 0–20%.",
      );
    }
  }

  if (action === "SET_USER_STATUS") {
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    const reason =
      typeof payload.reason === "string" ? payload.reason.trim() : "";
    if (!mockUsers.some((user) => user.id === userId)) {
      return apiError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản.");
    }
    if (!new Set(["ACTIVE", "SUSPENDED"]).has(status) || !reason) {
      return apiError(
        422,
        "USER_STATUS_INVALID",
        "Cần chọn trạng thái và nêu lý do cập nhật tài khoản.",
      );
    }
  }

  if (action === "SET_CAMPAIGN_STATUS") {
    const campaignId =
      typeof payload.campaignId === "string" ? payload.campaignId : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    const reason =
      typeof payload.reason === "string" ? payload.reason.trim() : "";
    if (!findMockCampaign(campaignId)) {
      return apiError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy chiến dịch.");
    }
    if (!new Set(["LIVE", "SUSPENDED"]).has(status) || !reason) {
      return apiError(
        422,
        "CAMPAIGN_STATUS_INVALID",
        "Cần chọn trạng thái và nêu căn cứ xử lý chiến dịch.",
      );
    }
  }

  const previewState = getEffectivePreviewState(access.session!);

  if (action === "REVIEW_CAMPAIGN") {
    previewState.reviewDecisions = {
      ...(previewState.reviewDecisions ?? {}),
      [payload.reviewId as string]: payload.decision as
        "APPROVED" | "CHANGES" | "REJECTED",
    };
    platformState.reviewDecisions = {
      ...platformState.reviewDecisions,
      [payload.reviewId as string]: payload.decision as
        "APPROVED" | "CHANGES" | "REJECTED",
    };
    platformState.reviewFeedback = {
      ...platformState.reviewFeedback,
      [payload.reviewId as string]:
        (payload.feedback as string | undefined)?.trim() ||
        (payload.decision === "APPROVED"
          ? "Hồ sơ đã đạt checklist của vòng duyệt hiện tại."
          : "Quản trị viên chưa để lại phản hồi."),
    };
  }

  if (action === "RESOLVE_FRAUD") {
    previewState.fraudStatuses = {
      ...(previewState.fraudStatuses ?? {}),
      [payload.alertId as string]: payload.status as "CLEARED" | "ESCALATED",
    };
  }

  if (action === "UPDATE_PLATFORM_FEE") {
    previewState.platformFeePercent = payload.percent as number;
  }

  if (action === "SET_USER_STATUS") {
    previewState.userStatuses = {
      ...(previewState.userStatuses ?? {}),
      [payload.userId as string]: payload.status as "ACTIVE" | "SUSPENDED",
    };
  }

  if (action === "SET_CAMPAIGN_STATUS") {
    previewState.campaignStatuses = {
      ...(previewState.campaignStatuses ?? {}),
      [payload.campaignId as string]: payload.status as "LIVE" | "SUSPENDED",
    };
  }

  const nextSession = { ...access.session!, previewState };
  const response = NextResponse.json({
    data: {
      action,
      payload,
      adminId: access.session!.user.id,
      auditId: `audit_${crypto.randomUUID().slice(0, 8)}`,
      processedAt: new Date().toISOString(),
      persisted: true,
    },
    meta: {
      source: "mock-route-handler",
      replaceWith: "AdminApplicationService",
    },
  });
  const sessionFailure = writePreviewSessionCookie(response, nextSession);
  if (sessionFailure) return sessionFailure;
  if (action === "REVIEW_CAMPAIGN") {
    const platformFailure = writePlatformPreviewCookie(response, platformState);
    if (platformFailure) return platformFailure;
  }
  return response;
}
