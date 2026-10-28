import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { api, type WorkspaceTaskStatus } from "@/lib/api";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { campaignMemberKey } from "@/lib/auth/campaign-permissions";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";
import {
  decodePlatformPreview,
  PLATFORM_PREVIEW_COOKIE_NAME,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { requireSession } from "@/lib/auth/require-session";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";
import { applyOperationsPreviewState } from "@/lib/preview-read-models";
import { syncCampaignToPostgres } from "@/lib/api/real-campaign-sync";

const allowedActions = new Set([
  "SAVE_DRAFT",
  "SUBMIT_REVIEW",
  "LAUNCH",
  "PUBLISH_UPDATE",
  "REPLY_COMMENT",
  "REPLY_MESSAGE",
  "UPDATE_COLLABORATOR_PERMISSIONS",
  "UPDATE_FULFILLMENT",
  "UPDATE_TASK_STATUS",
]);

const ownerOnlyActions = new Set([
  "SAVE_DRAFT",
  "SUBMIT_REVIEW",
  "LAUNCH",
  "UPDATE_COLLABORATOR_PERMISSIONS",
  "UPDATE_FULFILLMENT",
]);

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function asPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(request: NextRequest) {
  const access = await requireSession(["CREATOR", "COLLABORATOR"]);
  if (access.response) return access.response;

  const slug =
    request.nextUrl.searchParams.get("slug") ?? "orbit-one-ca-phe-thong-minh";
  const campaign = await api.getCampaignBySlug(slug);
  if (!campaign) {
    return apiError(
      404,
      "CAMPAIGN_OPERATIONS_NOT_FOUND",
      "Không tìm thấy dữ liệu vận hành của chiến dịch.",
    );
  }

  const campaignAccess = resolveCampaignAccess(
    campaign.id,
    access.session!,
    undefined,
    campaign,
  );
  if (!campaignAccess.canOpenWorkspace) {
    return apiError(
      403,
      "CAMPAIGN_MEMBERSHIP_REQUIRED",
      "Bạn không thuộc nhóm vận hành của chiến dịch này.",
    );
  }

  try {
    const cookieStore = await cookies();
    const platformState = decodePlatformPreview(
      cookieStore.get(PLATFORM_PREVIEW_COOKIE_NAME)?.value,
    );
    const data = await api.getCampaignOperations(slug);
    return NextResponse.json({
      data: applyOperationsPreviewState(data, access.session!, platformState),
    });
  } catch {
    return apiError(
      404,
      "CAMPAIGN_OPERATIONS_NOT_FOUND",
      "Không tìm thấy dữ liệu vận hành của chiến dịch.",
    );
  }
}

export async function POST(request: Request) {
  const access = await requireSession(["CREATOR", "COLLABORATOR"]);
  if (access.response) return access.response;

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
    return apiError(400, "INVALID_ACTION", "Thao tác không hợp lệ.");
  }

  let campaignId =
    typeof payload.campaignId === "string" ? payload.campaignId : "";
  if (!campaignId) {
    return apiError(
      422,
      "CAMPAIGN_ID_REQUIRED",
      "Cần xác định chiến dịch trước khi thao tác.",
    );
  }

  const cookieStore = await cookies();
  const platformState = decodePlatformPreview(
    cookieStore.get(PLATFORM_PREVIEW_COOKIE_NAME)?.value,
  );
  const campaignAccess = resolveCampaignAccess(
    campaignId,
    access.session!,
    platformState,
  );
  if (!campaignAccess.campaign) {
    return apiError(
      404,
      "CAMPAIGN_NOT_FOUND",
      "Không tìm thấy chiến dịch trong hệ thống.",
    );
  }
  if (!campaignAccess.canOpenWorkspace) {
    return apiError(
      403,
      "CAMPAIGN_MEMBERSHIP_REQUIRED",
      "Bạn không thuộc nhóm được giao vận hành chiến dịch này.",
    );
  }

  if (ownerOnlyActions.has(action) && !campaignAccess.isOwner) {
    return apiError(
      403,
      "CAMPAIGN_OWNER_REQUIRED",
      "Thao tác này chỉ dành cho chủ dự án.",
    );
  }

  let reviewSyncedToDb = false;

  if (action === "SAVE_DRAFT") {
    // Lưu bản nháp trực tiếp vào cơ sở dữ liệu PostgreSQL
    const draftSync = await syncCampaignToPostgres(payload as any, access.session, false);
    if (draftSync.campaignId) {
      campaignId = draftSync.campaignId;
    }
  }

  if (action === "SUBMIT_REVIEW") {
    const submittedTitle =
      typeof payload.title === "string" ? payload.title.trim() : "";
    const submittedCategory =
      typeof payload.category === "string" ? payload.category.trim() : "";
    if (submittedTitle.length < 10 || submittedTitle.length > 90) {
      return apiError(
        422,
        "CAMPAIGN_TITLE_INVALID",
        "Tên chiến dịch cần từ 10 đến 90 ký tự trước khi gửi duyệt.",
      );
    }
    if (!submittedCategory || submittedCategory.length > 60) {
      return apiError(
        422,
        "CAMPAIGN_CATEGORY_INVALID",
        "Danh mục chiến dịch chưa hợp lệ.",
      );
    }

    // Lưu chiến dịch và gửi yêu cầu duyệt trực tiếp vào cơ sở dữ liệu PostgreSQL
    const syncRes = await syncCampaignToPostgres(payload as any, access.session, true);
    if (syncRes.campaignId) {
      campaignId = syncRes.campaignId;
      reviewSyncedToDb = true;
    }
  }

  if (action === "PUBLISH_UPDATE") {
    if (!campaignAccess.canPostUpdates) {
      return apiError(
        403,
        "UPDATE_PERMISSION_REQUIRED",
        "Bạn chưa được chủ dự án cấp quyền đăng cập nhật.",
      );
    }
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const content = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!title || !content) {
      return apiError(
        422,
        "CAMPAIGN_UPDATE_CONTENT_REQUIRED",
        "Bản cập nhật cần có tiêu đề và nội dung trước khi đăng.",
      );
    }
    if (title.length > 100 || content.length > 2000) {
      return apiError(
        422,
        "CAMPAIGN_UPDATE_CONTENT_TOO_LONG",
        "Tiêu đề hoặc nội dung cập nhật dài hơn giới hạn cho phép.",
      );
    }

    // Đăng cập nhật lên máy chủ backend PostgreSQL
    try {
      await fetchBackendWithAuth(
        `/campaigns/${encodeURIComponent(campaignId)}/updates`,
        {
          method: "POST",
          body: JSON.stringify({
            title,
            bodyMarkdown: content,
          }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend publish update failed:", e);
    }
  }

  if (action === "REPLY_COMMENT") {
    const commentBody =
      typeof payload.body === "string" ? payload.body.trim() : "";
    const parentCommentId = payload.parentCommentId || payload.commentId;

    if (!commentBody) {
      return apiError(
        422,
        "COMMENT_CONTENT_REQUIRED",
        "Nội dung phản hồi không được để trống.",
      );
    }

    try {
      await fetchBackendWithAuth(
        "/social/comments",
        {
          method: "POST",
          body: JSON.stringify({
            campaignId,
            parentCommentId: parentCommentId
              ? String(parentCommentId)
              : undefined,
            body: commentBody,
          }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend reply comment failed:", e);
    }
  }

  const previewState = getEffectivePreviewState(access.session!);
  let persisted = false;
  let platformPersisted = false;

  if (action === "UPDATE_TASK_STATUS") {
    const taskId = payload.taskId as string;
    previewState.taskStatuses = {
      ...(previewState.taskStatuses ?? {}),
      [taskId]: payload.status as WorkspaceTaskStatus,
    };
    platformState.taskStatuses = {
      ...platformState.taskStatuses,
      [taskId]: payload.status as WorkspaceTaskStatus,
    };
    persisted = true;
    platformPersisted = true;
  }

  if (action === "PUBLISH_UPDATE") {
    const title = (payload.title as string).trim();
    previewState.publishedUpdates = [
      {
        id: `update_${crypto.randomUUID().slice(0, 8)}`,
        campaignId,
        title,
        when: "Trong phiên này",
      },
      ...(previewState.publishedUpdates ?? []).filter(
        (update) => update.campaignId !== campaignId || update.title !== title,
      ),
    ].slice(0, 5);
    platformState.publishedUpdates = [
      {
        id: `shared_update_${crypto.randomUUID().slice(0, 8)}`,
        campaignId,
        title,
        when: "Vừa cập nhật",
      },
      ...platformState.publishedUpdates.filter(
        (update) => update.campaignId !== campaignId || update.title !== title,
      ),
    ].slice(0, 8);
    persisted = true;
    platformPersisted = true;
  }

  if (action === "UPDATE_FULFILLMENT") {
    const orderId = payload.orderId as string;
    previewState.fulfillmentStatuses = {
      ...(previewState.fulfillmentStatuses ?? {}),
      [orderId]: payload.status as
        | "PENDING"
        | "PREPARING"
        | "SHIPPED"
        | "DELIVERED",
    };
    platformState.fulfillmentStatuses = {
      ...platformState.fulfillmentStatuses,
      [orderId]: payload.status as
        | "PENDING"
        | "PREPARING"
        | "SHIPPED"
        | "DELIVERED",
    };
    persisted = true;
    platformPersisted = true;
  }

  if (action === "LAUNCH") {
    platformState.campaignStatuses = {
      ...platformState.campaignStatuses,
      [campaignId]: "LIVE",
    };
    platformPersisted = true;
  }

  if (action === "UPDATE_COLLABORATOR_PERMISSIONS") {
    const memberId = payload.memberId as string;
    const permissionKey = campaignMemberKey(campaignId, memberId);
    previewState.collaboratorPermissions = {
      ...(previewState.collaboratorPermissions ?? {}),
      [permissionKey]: (payload.permissions as unknown[]).filter(
        (permission): permission is string => typeof permission === "string",
      ),
    };
    platformState.collaboratorPermissions = {
      ...platformState.collaboratorPermissions,
      [permissionKey]: (payload.permissions as unknown[]).filter(
        (permission): permission is string => typeof permission === "string",
      ),
    };
    persisted = true;
    platformPersisted = true;
  }

  if (action === "SUBMIT_REVIEW") {
    const campaign = campaignAccess.campaign!;
    const submittedTitle = (payload.title as string).trim();

    if (reviewSyncedToDb) {
      // Đã lưu và gửi duyệt trực tiếp vào PostgreSQL thật:
      // Xóa các bản nháp giả lập cũ trong cookie để không bị trùng lặp trên trang admin
      platformState.submittedReviews = platformState.submittedReviews.filter(
        (item) =>
          item.campaignId !== campaignId &&
          item.campaignId !== campaign.id &&
          item.title.trim().toLowerCase() !== submittedTitle.toLowerCase(),
      );
      platformPersisted = true;
    } else {
      // Fallback chỉ khi cơ sở dữ liệu PostgreSQL không khả dụng
      const creatorDisplayName =
        access.session?.user.name || "Chủ dự án";
      const submittedCategory = (payload.category as string).trim();
      const readiness = Math.max(
        0,
        Math.min(100, Number(payload.readiness) || 0),
      );
      const existingSharedReview = platformState.submittedReviews.find(
        (review) => review.campaignId === campaignId,
      );
      const reviewId =
        existingSharedReview?.id ?? `review_${campaign.id}`;
      const submissionVersion =
        (existingSharedReview?.submissionVersion ?? 0) + 1;
      const rewardCount = Math.max(0, Number(payload.rewardCount) || 0);
      const addOnCount = Math.max(0, Number(payload.addOnCount) || 0);
      const review = {
        id: reviewId,
        campaignId: campaign.id,
        title: submittedTitle,
        creator: creatorDisplayName,
        submittedAt: "Vừa gửi",
        category: submittedCategory,
        completeness: readiness,
        status: "PENDING" as const,
        submissionVersion,
        assignedTo: "Ban quản trị",
        reviewDueAt: "Trong 24 giờ",
        documentCount: 3 + rewardCount + addOnCount,
        checks: [
          {
            label: "Thông tin chiến dịch",
            status: readiness >= 70 ? ("PASS" as const) : ("WARN" as const),
            detail: `Bản nháp đạt ${readiness}/100 điểm kiểm tra độ đầy đủ.`,
          },
          {
            label: "Gói ủng hộ",
            status: rewardCount > 0 ? ("PASS" as const) : ("MISSING" as const),
            detail: `${rewardCount} gói ủng hộ và ${addOnCount} phần bổ sung đã khai báo.`,
          },
          {
            label: "Kiểm tra thủ công",
            status: "WARN" as const,
            detail:
              "Quản trị viên cần đọc câu chuyện, rủi ro và lịch giao trước khi duyệt.",
          },
        ],
      };
      platformState.submittedReviews = [
        review,
        ...platformState.submittedReviews.filter(
          (item) => item.campaignId !== campaign.id,
        ),
      ].slice(0, 4);
      delete platformState.reviewDecisions[reviewId];
      delete platformState.reviewFeedback[reviewId];
      platformPersisted = true;
    }
  }

  const nextSession = persisted
    ? { ...access.session!, previewState }
    : access.session!;
  const response = NextResponse.json({
    data: {
      action,
      payload,
      actorId: access.session!.user.id,
      campaignId,
      auditId: `audit_${crypto.randomUUID().slice(0, 8)}`,
      processedAt: new Date().toISOString(),
      persisted: persisted || platformPersisted,
    },
    meta: {
      source: "backend-operations",
    },
  });
  if (persisted) {
    const failure = writePreviewSessionCookie(response, nextSession);
    if (failure) return failure;
  }
  if (platformPersisted) {
    const failure = writePlatformPreviewCookie(response, platformState);
    if (failure) return failure;
  }
  return response;
}
