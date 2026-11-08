import { type NextRequest, NextResponse } from "next/server";
import {
  api,
  type CampaignCommentReply,
  type CampaignDraftSnapshot,
  type WorkspaceTaskStatus,
} from "@/lib/api";
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
import { getServerPlatformPreviewState, writePlatformPreviewCookie } from "@/lib/auth/platform-preview-cookie";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { requireSession } from "@/lib/auth/require-session";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";
import { applyOperationsPreviewState } from "@/lib/preview-read-models";
import { buildCampaignDraftSnapshot } from "@/lib/creator/draft-preview";
import { localDbEnabled, type LocalCampaignEventInput } from "@/lib/local-db/database";

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
  const access = await requireSession();
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

  const platformState = await getServerPlatformPreviewState();
  const campaignAccess = resolveCampaignAccess(
    campaign.id,
    access.session!,
    platformState,
  );
  if (!campaignAccess.canOpenWorkspace) {
    return apiError(
      403,
      "CAMPAIGN_MEMBERSHIP_REQUIRED",
      "Bạn không thuộc nhóm vận hành của chiến dịch này.",
    );
  }
  if (campaignAccess.isSuspended) {
    return apiError(
      423,
      "CAMPAIGN_SUSPENDED",
      "Chiến dịch đang tạm dừng nên khu vận hành chỉ hiển thị thông báo trạng thái.",
    );
  }

  try {
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
  const access = await requireSession();
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

  const platformState = await getServerPlatformPreviewState();
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
  if (campaignAccess.isSuspended) {
    return apiError(
      423,
      "CAMPAIGN_SUSPENDED",
      "Chiến dịch đang tạm dừng. Các thao tác vận hành đã được khóa trong bản demo.",
    );
  }

  if (ownerOnlyActions.has(action) && !campaignAccess.isOwner) {
    return apiError(
      403,
      "CAMPAIGN_OWNER_REQUIRED",
      "Thao tác này chỉ dành cho chủ dự án.",
    );
  }

  let savedDraft: CampaignDraftSnapshot | null = null;
  if (action === "SAVE_DRAFT") {
    const result = buildCampaignDraftSnapshot(
      payload,
      platformState.campaignDrafts[campaignId],
      campaignId,
      access.session!.user.id,
    );
    if (result.error) {
      return apiError(422, "CAMPAIGN_DRAFT_INVALID", result.error);
    }
    savedDraft = result.value;
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
  let commentReply: CampaignCommentReply | null = null;

  if (action === "REPLY_COMMENT") {
    const commentId =
      typeof payload.commentId === "string" ? payload.commentId : "";
    const replyBody =
      typeof payload.body === "string" ? payload.body.trim() : "";
    const assistant = await api.getCreatorAssistantData();
    const comment = assistant.comments.priorities.find(
      (item) => item.id === commentId,
    );
    if (campaignId !== "cmp_orbit" || !comment) {
      return apiError(
        404,
        "CAMPAIGN_COMMENT_NOT_FOUND",
        "Không tìm thấy bình luận trong chiến dịch đang mở.",
      );
    }
    if (!replyBody || replyBody.length > 500) {
      return apiError(
        422,
        "COMMENT_REPLY_INVALID",
        "Phản hồi cần có nội dung và không dài quá 500 ký tự.",
      );
    }
    if (
      campaignAccess.campaign.status !== "LIVE" &&
      campaignAccess.campaign.status !== "SUCCESSFUL"
    ) {
      return apiError(
        409,
        "CAMPAIGN_REPLY_NOT_ALLOWED",
        "Chiến dịch chưa ở giai đoạn nhận phản hồi cộng đồng.",
      );
    }
    const existingReply = platformState.commentReplies.find(
      (item) =>
        item.campaignId === campaignId && item.commentId === commentId,
    );
    commentReply = {
      id: existingReply?.id ?? `comment_reply_${crypto.randomUUID().slice(0, 8)}`,
      campaignId,
      commentId,
      body: replyBody,
      authorId: access.session!.user.id,
      authorName: access.session!.user.name,
      authorRole: campaignAccess.isOwner ? "CREATOR" : "COLLABORATOR",
      createdAt: "Vừa xong",
    };
  }

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
    action === "SAVE_DRAFT" &&
    existingSharedReview &&
    (!platformState.reviewDecisions[existingSharedReview.id] ||
      platformState.reviewDecisions[existingSharedReview.id] === "APPROVED")
  ) {
    return apiError(
      409,
      "CAMPAIGN_DRAFT_LOCKED",
      "Hồ sơ đang xét duyệt hoặc đã duyệt. Hãy chờ phản hồi trước khi chỉnh.",
    );
  }
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
      (task.assigneeUserId !== access.session!.user.id ||
        (status !== "TODO" && status !== "IN_PROGRESS" && status !== "DONE"))
    ) {
      return apiError(
        403,
        "TASK_ASSIGNEE_REQUIRED",
        "Cộng tác viên chỉ có thể đổi trạng thái việc được giao cho mình.",
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

  if (action === "SAVE_DRAFT" && savedDraft) {
    platformState.campaignDrafts = {
      ...platformState.campaignDrafts,
      [campaignId]: savedDraft,
    };
    platformPersisted = true;
  }

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
    const content = (payload.body as string).trim();
    const updateId = `update_${crypto.randomUUID().slice(0, 8)}`;
    const publishedAt = new Date().toISOString();
    const publishedUpdate = {
      id: updateId,
      campaignId,
      title,
      body: content,
      author: access.session!.user.name,
      publishedAt,
      when: "Vừa cập nhật",
    };
    previewState.publishedUpdates = [
      publishedUpdate,
      ...(previewState.publishedUpdates ?? []).filter(
        (update) => update.campaignId !== campaignId || update.title !== title,
      ),
    ].slice(0, localDbEnabled() ? undefined : 5);
    platformState.publishedUpdates = [
      publishedUpdate,
      ...platformState.publishedUpdates.filter(
        (update) => update.campaignId !== campaignId || update.title !== title,
      ),
    ].slice(0, localDbEnabled() ? undefined : 8);
    persisted = true;
    platformPersisted = true;
  }

  if (action === "REPLY_COMMENT" && commentReply) {
    platformState.commentReplies = [
      commentReply,
      ...platformState.commentReplies.filter(
        (item) =>
          item.campaignId !== campaignId ||
          item.commentId !== commentReply.commentId,
      ),
    ].slice(0, localDbEnabled() ? undefined : 12);
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
    ].slice(0, localDbEnabled() ? undefined : 12);
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
      submittedAt: "Vừa gửi trong bản dùng thử",
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
    ].slice(0, localDbEnabled() ? undefined : 4);
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
    meta: { source: "preview" },
  });
  if (persisted) {
    const failure = writePreviewSessionCookie(response, nextSession);
    if (failure) return failure;
  }
  if (platformPersisted) {
    const actorRole = campaignAccess.isCollaborator ? "COLLABORATOR" : "CREATOR";
    const eventBase = {
      campaignId,
      actorUserId: access.session!.user.id,
      actorRole,
    } as const;
    const descriptions: Record<string, Omit<LocalCampaignEventInput, keyof typeof eventBase>> = {
      SAVE_DRAFT: { eventType: action, stage: "PREPARATION", visibility: "TEAM",
        title: "Lưu bản nháp chiến dịch", detail: "Thông tin hồ sơ hoặc gói quà đã được cập nhật." },
      SUBMIT_REVIEW: { eventType: action, stage: "REVIEW", visibility: "TEAM",
        title: "Gửi hồ sơ xét duyệt", detail: "Quản trị viên sẽ đọc và phản hồi hồ sơ." },
      LAUNCH: { eventType: action, stage: "FUNDING", visibility: "PUBLIC",
        title: "Mở chiến dịch gọi vốn", detail: "Chiến dịch bắt đầu nhận cam kết mẫu." },
      PUBLISH_UPDATE: { eventType: action, stage: "FUNDING", visibility: "PUBLIC",
        title: "Đăng cập nhật chiến dịch", detail: String(payload.title ?? "") },
      REPLY_COMMENT: { eventType: action, stage: "FUNDING", visibility: "PUBLIC",
        title: "Phản hồi bình luận", detail: "Nhóm chiến dịch đã trả lời một bình luận." },
      REPLY_MESSAGE: { eventType: action, stage: "FUNDING", visibility: "TEAM",
        title: "Trả lời tin nhắn người ủng hộ", detail: "Nội dung tin nhắn chỉ người liên quan được xem." },
      UPDATE_COLLABORATOR_PERMISSIONS: { eventType: action, stage: "PREPARATION", visibility: "TEAM",
        title: "Điều chỉnh quyền cộng tác", detail: "Quyền của thành viên trong chiến dịch đã thay đổi." },
      UPDATE_FULFILLMENT: { eventType: action, stage: "DELIVERY", visibility: "TEAM",
        title: "Cập nhật giao quà", detail: `Đơn hàng chuyển sang ${{
          PENDING: "chờ xử lý", PREPARING: "đang chuẩn bị", SHIPPED: "đã gửi đi", DELIVERED: "đã giao",
        }[String(payload.status ?? "")] ?? "trạng thái mới"}.` },
      UPDATE_TASK_STATUS: { eventType: action,
        stage: campaignAccess.campaign.status === "LIVE" ? "FUNDING" : "PREPARATION",
        visibility: "TEAM", title: "Cập nhật công việc nhóm",
        detail: `${findMockCampaignTask(String(payload.taskId ?? ""))?.title ?? "Công việc"} → ${{
          TODO: "chưa làm", IN_PROGRESS: "đang làm", IN_REVIEW: "cần xem lại", DONE: "đã xong",
        }[String(payload.status ?? "")] ?? "đã đổi trạng thái"}.` },
    };
    const failure = writePlatformPreviewCookie(response, platformState, {
      ...eventBase, ...descriptions[action],
    });
    if (failure) return failure;
  }
  return response;
}
