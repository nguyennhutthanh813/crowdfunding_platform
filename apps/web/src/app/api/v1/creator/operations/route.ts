import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { api, type WorkspaceTaskStatus } from "@/lib/api";
import {
  findMockCampaignBySlug,
  findMockCampaignTask,
  getCampaignMembership,
  getMockUser,
  mockMessages,
  mockPledges,
} from "@/lib/api/mock/relational-store";
import { hasCampaignFulfillmentOrder } from "@/lib/api/mock/operations";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { campaignMemberKey } from "@/lib/auth/campaign-permissions";
import {
  decodePlatformPreview,
  PLATFORM_PREVIEW_COOKIE_NAME,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { requireSession } from "@/lib/auth/require-session";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";
import { applyOperationsPreviewState } from "@/lib/preview-read-models";

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
  const campaign = findMockCampaignBySlug(slug);
  if (!campaign) {
    return apiError(
      404,
      "CAMPAIGN_OPERATIONS_NOT_FOUND",
      "Không tìm thấy dữ liệu vận hành của chiến dịch.",
    );
  }

  const campaignAccess = resolveCampaignAccess(campaign.id, access.session!);
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

  const campaignId =
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
      "Không tìm thấy chiến dịch trong dữ liệu mô phỏng.",
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

  if (
    action === "SUBMIT_REVIEW" &&
    campaignAccess.campaign.status !== "DRAFT"
  ) {
    return apiError(
      409,
      "CAMPAIGN_NOT_DRAFT",
      "Chỉ bản nháp mới có thể gửi sang hàng chờ duyệt.",
    );
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
  }

  let repliedMessage:
    | {
        id: string;
        campaignId: string;
        senderId: string;
        recipientId: string;
        subject: string;
      }
    | undefined;

  if (action === "REPLY_MESSAGE") {
    const messageId =
      typeof payload.messageId === "string" ? payload.messageId : "";
    const replyBody =
      typeof payload.body === "string" ? payload.body.trim() : "";
    repliedMessage =
      platformState.messages.find((message) => message.id === messageId) ??
      mockMessages.find((message) => message.id === messageId);
    const recipientBelongsToTeam = repliedMessage
      ? Boolean(getCampaignMembership(campaignId, repliedMessage.recipientId))
      : false;
    const senderBackedCampaign = repliedMessage
      ? mockPledges.some(
          (pledge) =>
            pledge.campaignId === campaignId &&
            pledge.backerId === repliedMessage?.senderId,
        )
      : false;

    if (
      !repliedMessage ||
      repliedMessage.campaignId !== campaignId ||
      !recipientBelongsToTeam ||
      !senderBackedCampaign
    ) {
      return apiError(
        404,
        "CAMPAIGN_MESSAGE_NOT_FOUND",
        "Tin nhắn không thuộc hộp thư của chiến dịch đang mở.",
      );
    }
    if (!replyBody || replyBody.length > 500) {
      return apiError(
        422,
        "MESSAGE_REPLY_INVALID",
        "Phản hồi cần có nội dung và không dài quá 500 ký tự.",
      );
    }
  }
  const existingSharedReview = platformState.submittedReviews.find(
    (review) => review.campaignId === campaignId,
  );
  if (
    action === "SUBMIT_REVIEW" &&
    existingSharedReview &&
    !platformState.reviewDecisions[existingSharedReview.id]
  ) {
    return apiError(
      409,
      "CAMPAIGN_ALREADY_IN_REVIEW",
      "Bản nháp này đang nằm trong hàng chờ xét duyệt.",
    );
  }

  if (
    action === "LAUNCH" &&
    campaignAccess.campaign.status !== "PRE_LAUNCH" &&
    platformState.reviewDecisions[existingSharedReview?.id ?? ""] !== "APPROVED"
  ) {
    return apiError(
      409,
      "CAMPAIGN_NOT_READY",
      "Chiến dịch chưa ở trạng thái đã duyệt để mở gọi vốn.",
    );
  }

  if (action === "PUBLISH_UPDATE") {
    if (!campaignAccess.canPostUpdates) {
      return apiError(
        403,
        "POST_UPDATE_PERMISSION_REQUIRED",
        "Bạn chưa được chủ dự án cấp quyền đăng cập nhật.",
      );
    }
    if (
      campaignAccess.campaign.status !== "LIVE" &&
      campaignAccess.campaign.status !== "SUCCESSFUL"
    ) {
      return apiError(
        409,
        "CAMPAIGN_UPDATE_NOT_ALLOWED",
        "Trạng thái hiện tại chưa cho phép đăng cập nhật.",
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
  }

  if (
    (action === "REPLY_COMMENT" || action === "REPLY_MESSAGE") &&
    !campaignAccess.canReplyComments
  ) {
    return apiError(
      403,
      "REPLY_PERMISSION_REQUIRED",
      "Bạn chưa được chủ dự án cấp quyền trả lời bình luận.",
    );
  }

  if (action === "UPDATE_TASK_STATUS") {
    const taskId = typeof payload.taskId === "string" ? payload.taskId : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    const task = taskId ? findMockCampaignTask(taskId) : null;
    if (!task || task.campaignId !== campaignId) {
      return apiError(
        404,
        "CAMPAIGN_TASK_NOT_FOUND",
        "Không tìm thấy công việc trong chiến dịch này.",
      );
    }
    if (!new Set(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).has(status)) {
      return apiError(
        422,
        "TASK_STATUS_INVALID",
        "Trạng thái công việc không hợp lệ.",
      );
    }
    if (
      campaignAccess.isCollaborator &&
      (task.assigneeUserId !== access.session!.user.id || status !== "DONE")
    ) {
      return apiError(
        403,
        "TASK_ASSIGNEE_REQUIRED",
        "Cộng tác viên chỉ có thể hoàn tất công việc được giao cho mình.",
      );
    }
  }

  if (action === "UPDATE_COLLABORATOR_PERMISSIONS") {
    const memberId =
      typeof payload.memberId === "string" ? payload.memberId : "";
    const member = memberId
      ? getCampaignMembership(campaignId, memberId)
      : null;
    if (!member || member.role !== "COLLABORATOR") {
      return apiError(
        404,
        "COLLABORATOR_NOT_FOUND",
        "Không tìm thấy cộng tác viên trong chiến dịch này.",
      );
    }
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions
      : [];
    const knownPermissions = new Set([
      "Đăng cập nhật",
      "Trả lời bình luận",
      "Xem dự báo",
    ]);
    if (
      !Array.isArray(payload.permissions) ||
      permissions.length > 3 ||
      permissions.some(
        (permission) =>
          typeof permission !== "string" || !knownPermissions.has(permission),
      )
    ) {
      return apiError(
        422,
        "COLLABORATOR_PERMISSIONS_INVALID",
        "Danh sách quyền cộng tác viên chưa hợp lệ.",
      );
    }
  }

  if (action === "UPDATE_FULFILLMENT") {
    const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    if (
      !orderId ||
      !new Set(["PENDING", "PREPARING", "SHIPPED", "DELIVERED"]).has(status)
    ) {
      return apiError(
        422,
        "FULFILLMENT_INPUT_INVALID",
        "Mã đơn hoặc trạng thái giao quà chưa hợp lệ.",
      );
    }
    if (!hasCampaignFulfillmentOrder(campaignId, orderId)) {
      return apiError(
        404,
        "FULFILLMENT_ORDER_NOT_FOUND",
        "Đơn giao quà không thuộc chiến dịch đang mở.",
      );
    }
    if (campaignAccess.campaign.status !== "SUCCESSFUL") {
      return apiError(
        409,
        "FULFILLMENT_LOCKED",
        "Chỉ chiến dịch thành công và đã thu tiền mới được xử lý giao quà.",
      );
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
        "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED",
    };
    platformState.fulfillmentStatuses = {
      ...platformState.fulfillmentStatuses,
      [orderId]: payload.status as
        "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED",
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

  if (action === "REPLY_MESSAGE" && repliedMessage) {
    const recipient = getMockUser(repliedMessage.senderId);
    const subject = repliedMessage.subject.startsWith("Trả lời:")
      ? repliedMessage.subject
      : `Trả lời: ${repliedMessage.subject}`;
    platformState.messages = [
      {
        id: `reply_${crypto.randomUUID().slice(0, 8)}`,
        campaignId,
        senderId: access.session!.user.id,
        senderName: access.session!.user.name,
        senderInitials: access.session!.user.initials,
        recipientId: recipient.id,
        recipientName: recipient.displayName,
        subject,
        body: (payload.body as string).trim(),
        sentAt: "Vừa xong",
      },
      ...platformState.messages,
    ].slice(0, 12);
    platformPersisted = true;
  }

  if (action === "SUBMIT_REVIEW") {
    const campaign = campaignAccess.campaign;
    const creator = getMockUser(campaign.creatorId);
    const submittedTitle = (payload.title as string).trim();
    const submittedCategory = (payload.category as string).trim();
    const readiness = Math.max(
      0,
      Math.min(100, Number(payload.readiness) || 0),
    );
    const reviewId =
      existingSharedReview?.id ?? `preview_review_${campaign.id}`;
    const submissionVersion =
      (existingSharedReview?.submissionVersion ?? 0) + 1;
    const rewardCount = Math.max(0, Number(payload.rewardCount) || 0);
    const addOnCount = Math.max(0, Number(payload.addOnCount) || 0);
    const review = {
      id: reviewId,
      campaignId: campaign.id,
      title: submittedTitle,
      creator: creator.displayName,
      submittedAt: "Vừa gửi trong bản demo",
      category: submittedCategory,
      completeness: readiness,
      status: "PENDING" as const,
      submissionVersion,
      assignedTo: "Chưa phân công",
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
      source: "mock-route-handler",
      replaceWith: "CreatorOperationsService",
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
