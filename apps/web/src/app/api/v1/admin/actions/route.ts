import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import {
  decodePlatformPreview,
  PLATFORM_PREVIEW_COOKIE_NAME,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";
import { forwardUserActionToBackend } from "@/lib/api/real-admin-users";
import { forwardAdminCampaignReview } from "@/lib/api/real-admin-reviews";

const allowedActions = new Set([
  "REVIEW_CAMPAIGN",
  "RESOLVE_FRAUD",
  "UPDATE_PLATFORM_FEE",
  "SET_USER_STATUS",
  "SET_CAMPAIGN_STATUS",
  "ASSIGN_USER_ROLE",
  "REMOVE_USER_ROLE",
  "CREATE_USER",
  "RESET_USER_PASSWORD",
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
  const previewState = getEffectivePreviewState(access.session!);

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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reviewId,
      );
    const review = platformState.submittedReviews.find(
      (item) => item.id === reviewId,
    );
    const decision =
      typeof payload.decision === "string" ? payload.decision : "";
    const feedback =
      typeof payload.feedback === "string" ? payload.feedback.trim() : "";
    if (!review && !isUuid) {
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
    const status = typeof payload.status === "string" ? payload.status : "";
    const resolution =
      typeof payload.resolution === "string" ? payload.resolution.trim() : "";
    if (!alertId) {
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
    try {
      await fetchBackendWithAuth(
        `/admin/fraud-alerts/${encodeURIComponent(alertId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, resolutionNote: resolution }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend fraud alert update failed:", e);
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
    if (!userId) {
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

  if (action === "ASSIGN_USER_ROLE") {
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    if (!userId || !role) {
      return apiError(
        422,
        "USER_ROLE_INVALID",
        "Cần chọn tài khoản và vai trò hợp lệ.",
      );
    }
  }

  if (action === "REMOVE_USER_ROLE") {
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    if (!userId || !role) {
      return apiError(
        422,
        "USER_ROLE_INVALID",
        "Cần chọn tài khoản và vai trò cần thu hồi.",
      );
    }
  }

  if (action === "CREATE_USER") {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";
    const password =
      typeof payload.password === "string" ? payload.password : "";
    if (!name || !email || !email.includes("@")) {
      return apiError(
        422,
        "USER_DATA_INVALID",
        "Vui lòng nhập họ tên và email hợp lệ.",
      );
    }
    if (password.length < 8) {
      return apiError(
        422,
        "PASSWORD_TOO_SHORT",
        "Mật khẩu tối thiểu 8 ký tự.",
      );
    }
  }

  if (action === "RESET_USER_PASSWORD") {
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const newPassword =
      typeof payload.newPassword === "string" ? payload.newPassword : "";
    const reason =
      typeof payload.reason === "string" ? payload.reason.trim() : "";
    if (!userId || newPassword.length < 8 || !reason) {
      return apiError(
        422,
        "RESET_PASSWORD_INVALID",
        "Mật khẩu mới tối thiểu 8 ký tự và bắt buộc nhập lý do đặt lại.",
      );
    }
  }

  if (action === "SET_CAMPAIGN_STATUS") {
    const campaignId =
      typeof payload.campaignId === "string" ? payload.campaignId : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    const reason =
      typeof payload.reason === "string" ? payload.reason.trim() : "";
    if (!campaignId) {
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

    const targetReviewId = payload.reviewId as string;
    platformState.submittedReviews = platformState.submittedReviews.filter(
      (item) => item.id !== targetReviewId && item.campaignId !== targetReviewId,
    );

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.reviewId as string,
      );
    if (isUuid) {
      try {
        await forwardAdminCampaignReview(
          payload.reviewId as string,
          payload.decision as "APPROVED" | "CHANGES" | "REJECTED",
          (payload.feedback as string | undefined)?.trim(),
          access.session?.tokens?.accessToken,
        );
      } catch (err) {
        console.warn("Failed to forward campaign review to backend API:", err);
      }
    }
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

  if (
    action === "SET_USER_STATUS" ||
    action === "ASSIGN_USER_ROLE" ||
    action === "REMOVE_USER_ROLE" ||
    action === "CREATE_USER" ||
    action === "RESET_USER_PASSWORD"
  ) {
    try {
      await forwardUserActionToBackend(
        action,
        payload,
        access.session?.tokens?.accessToken,
      );
    } catch (err) {
      console.warn("Failed to forward admin user action to backend API:", err);
    }
  }

  if (action === "SET_USER_STATUS") {
    const userId = payload.userId as string;
    const status = payload.status as "ACTIVE" | "SUSPENDED";
    const reason = (payload.reason as string) || "Cập nhật từ quản trị viên";
    previewState.userStatuses = {
      ...(previewState.userStatuses ?? {}),
      [userId]: status,
    };
    const userMods = previewState.userModerations?.[userId] ?? [];
    previewState.userModerations = {
      ...(previewState.userModerations ?? {}),
      [userId]: [
        {
          id: `mod_${crypto.randomUUID().slice(0, 8)}`,
          action:
            status === "ACTIVE"
              ? "MỞ KHÓA TÀI KHOẢN"
              : "TẠM KHÓA TÀI KHOẢN",
          reason,
          createdAt: "Vừa xong",
          adminName: access.session?.user.name ?? "Quản trị viên",
        },
        ...userMods,
      ],
    };
  }

  if (action === "ASSIGN_USER_ROLE") {
    const userId = payload.userId as string;
    const role = payload.role as string;
    const reason = (payload.reason as string) || "Cấp quyền từ quản trị viên";
    const existingRoles = previewState.userRoles?.[userId] ?? [];
    const updatedRoles = Array.from(new Set([...existingRoles, role]));
    previewState.userRoles = {
      ...(previewState.userRoles ?? {}),
      [userId]: updatedRoles,
    };
    const userMods = previewState.userModerations?.[userId] ?? [];
    previewState.userModerations = {
      ...(previewState.userModerations ?? {}),
      [userId]: [
        {
          id: `mod_${crypto.randomUUID().slice(0, 8)}`,
          action: `CẤP QUYỀN ${role.toUpperCase()}`,
          reason,
          createdAt: "Vừa xong",
          adminName: access.session?.user.name ?? "Quản trị viên",
        },
        ...userMods,
      ],
    };
  }

  if (action === "REMOVE_USER_ROLE") {
    const userId = payload.userId as string;
    const role = payload.role as string;
    const reason =
      (payload.reason as string) || "Thu hồi quyền từ quản trị viên";
    const existingRoles = previewState.userRoles?.[userId] ?? [];
    const updatedRoles = existingRoles.filter((r) => r !== role);
    previewState.userRoles = {
      ...(previewState.userRoles ?? {}),
      [userId]: updatedRoles,
    };
    const userMods = previewState.userModerations?.[userId] ?? [];
    previewState.userModerations = {
      ...(previewState.userModerations ?? {}),
      [userId]: [
        {
          id: `mod_${crypto.randomUUID().slice(0, 8)}`,
          action: `THU HỒI QUYỀN ${role.toUpperCase()}`,
          reason,
          createdAt: "Vừa xong",
          adminName: access.session?.user.name ?? "Quản trị viên",
        },
        ...userMods,
      ],
    };
  }

  if (action === "CREATE_USER") {
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const name = (payload.name as string).trim();
    const email = (payload.email as string).trim().toLowerCase();
    const role = (payload.role as string) || "Người ủng hộ";
    const location = (payload.location as string)?.trim() || "Việt Nam";
    const phone = (payload.phone as string)?.trim() || "0900 000 000";

    const parts = name.split(/\s+/);
    const initials =
      parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

    const newUser = {
      id,
      name,
      initials,
      email,
      location,
      phone,
      roles: [role],
      status: "ACTIVE" as const,
      lastSeen: "Vừa tạo",
      createdAt: "Hôm nay",
      emailVerified: true,
      campaignCount: 0,
      pledgeCount: 0,
      totalPledgedAmount: 0,
      fraudAlertCount: 0,
      campaigns: [],
      pledges: [],
      moderationActions: [
        {
          id: `mod_${crypto.randomUUID().slice(0, 8)}`,
          action: "TẠO TÀI KHOẢN MỚI",
          reason: "Tạo trực tiếp từ trung tâm quản trị viên",
          createdAt: "Vừa xong",
          adminName: access.session?.user.name ?? "Quản trị viên",
        },
      ],
    };

    previewState.createdUsers = [
      newUser,
      ...(previewState.createdUsers ?? []),
    ];
  }

  if (action === "RESET_USER_PASSWORD") {
    const userId = payload.userId as string;
    const reason =
      (payload.reason as string) ||
      "Đặt lại mật khẩu tạm thời từ quản trị viên";
    const userMods = previewState.userModerations?.[userId] ?? [];
    previewState.userModerations = {
      ...(previewState.userModerations ?? {}),
      [userId]: [
        {
          id: `mod_${crypto.randomUUID().slice(0, 8)}`,
          action: "ĐẶT LẠI MẬT KHẨU TẠM THỜI",
          reason,
          createdAt: "Vừa xong",
          adminName: access.session?.user.name ?? "Quản trị viên",
        },
        ...userMods,
      ],
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
      source: "admin-handler",
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
