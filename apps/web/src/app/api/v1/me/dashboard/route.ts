import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import {
  findMockCampaign,
  findMockCampaignBySlug,
  getMockUser,
  mockCampaignMembers,
  mockPledges,
  mockMessages,
} from "@/lib/api/mock/relational-store";
import {
  isRecord,
  readJsonObject,
  requestError,
} from "@/lib/api/request-validation";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";

import { previewAccounts } from "@/lib/auth/preview-accounts";
import { isNotificationPreferences } from "@/lib/auth/notification-preferences";
import {
  getServerPlatformPreviewState,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";
import { buildUserDashboard } from "@/lib/dashboard-preview";

export async function GET() {
  const access = await requireSession(["BACKER"]);
  if (access.response) return access.response;
  const [data, campaigns, platformState] = await Promise.all([
    api.getUserDashboard(),
    api.listCampaigns(),
    getServerPlatformPreviewState(),
  ]);
  return Response.json(
    buildUserDashboard(data, campaigns, access.session, platformState),
  );
}

const allowedActions = new Set([
  "MARK_MESSAGE_READ",
  "SET_CREATOR_FOLLOW",
  "UPDATE_PROFILE",
  "UPDATE_NOTIFICATION_PREFERENCES",
  "CHANGE_PASSWORD",
  "SAVE_PROJECT",
  "SET_PRELAUNCH_NOTIFICATION",
  "UPDATE_INTERESTS",
  "SEND_MESSAGE",
  "CREATE_COMMENT",
  "UPDATE_COMMENT",
  "DELETE_COMMENT",
  "LIKE_COMMENT",
  "HIDE_COMMENT",
  "ASK_QUESTION",
]);

export async function POST(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;

  const parsed = await readJsonObject(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;

  if (typeof body.action !== "string" || !allowedActions.has(body.action)) {
    return Response.json(
      { error: { code: "INVALID_ACTION", message: "Thao tác không hợp lệ." } },
      { status: 400 },
    );
  }
  if (!isRecord(body.payload))
    return requestError(
      422,
      "INVALID_PAYLOAD",
      "Thông tin thao tác chưa hợp lệ.",
    );

  const validRoles = ["BACKER", "CREATOR", "COLLABORATOR", "ADMIN"];
  if (
    !["CHANGE_PASSWORD", "UPDATE_NOTIFICATION_PREFERENCES"].includes(
      body.action,
    ) &&
    !access.session.user.roles.some((r) => validRoles.includes(r))
  ) {
    return requestError(
      403,
      "FORBIDDEN",
      "Bạn cần có tài khoản người dùng hợp lệ để thực hiện thao tác này.",
    );
  }

  if (body.action === "CHANGE_PASSWORD") {
    const { currentPassword, newPassword } = body.payload;
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return requestError(
        422,
        "PASSWORD_INPUT_INVALID",
        "Nhập mật khẩu hiện tại và mật khẩu mới từ 8–128 ký tự.",
      );
    }
    const account = previewAccounts.find(
      (item) => item.id === access.session.user.id,
    );
    if (!account)
      return requestError(
        409,
        "PREVIEW_ACCOUNT_ONLY",
        "Tài khoản tạo tạm chưa có mật khẩu lưu trữ để kiểm tra.",
      );
    if (account.password !== currentPassword)
      return requestError(
        422,
        "CURRENT_PASSWORD_INCORRECT",
        "Mật khẩu hiện tại chưa đúng.",
      );
    return NextResponse.json({
      data: {
        action: body.action,
        persisted: false,
        simulation: true,
        message:
          "Đã kiểm tra thông tin hợp lệ. Bản demo không đổi mật khẩu; tài khoản mẫu vẫn dùng mật khẩu cũ.",
      },
    });
  }

  let nextSession = access.session;
  const previewState = getEffectivePreviewState(access.session);
  const platformState = await getServerPlatformPreviewState();
  let platformPersisted = false;

  if (body.action === "UPDATE_NOTIFICATION_PREFERENCES") {
    const preferences = body.payload;
    if (!isNotificationPreferences(preferences))
      return requestError(
        422,
        "INVALID_PREFERENCES",
        "Lựa chọn thông báo chưa hợp lệ.",
      );
    previewState.notificationPreferences = preferences;
  }

  if (body.action === "UPDATE_INTERESTS") {
    const interests = Array.isArray(body.payload?.interests)
      ? body.payload.interests.filter(
          (interest): interest is string => typeof interest === "string",
        )
      : [];
    const knownInterests = new Set([
      "technology",
      "design",
      "green-living",
      "games",
      "music",
      "publishing",
      "food",
    ]);
    if (
      !Array.isArray(body.payload.interests) ||
      interests.length !== body.payload.interests.length ||
      new Set(interests).size < 2 ||
      interests.length > knownInterests.size ||
      interests.some((interest) => !knownInterests.has(interest))
    ) {
      return Response.json(
        {
          error: {
            code: "INTERESTS_REQUIRED",
            message: "Vui lòng chọn ít nhất hai lĩnh vực.",
          },
        },
        { status: 422 },
      );
    }
    previewState.interests = [...new Set(interests)];
  }

  if (body.action === "SAVE_PROJECT") {
    const campaignId = body.payload?.campaignId;
    const saved = body.payload?.saved;
    if (typeof campaignId !== "string" || typeof saved !== "boolean")
      return requestError(
        422,
        "INVALID_SAVE_INPUT",
        "Dự án hoặc trạng thái lưu chưa hợp lệ.",
      );
    const campaign = findMockCampaign(campaignId) ?? findMockCampaignBySlug(campaignId);
    
    // Persist to real NestJS PostgreSQL backend if session has token
    try {
      const backendId = campaign?.slug ?? campaignId;
      if (saved) {
        await fetchBackendWithAuth(
          "/social/saved-campaigns",
          {
            method: "POST",
            body: JSON.stringify({ campaignId: backendId }),
          },
          access.session,
        );
      } else {
        await fetchBackendWithAuth(
          `/social/saved-campaigns/${encodeURIComponent(backendId)}`,
          { method: "DELETE" },
          access.session,
        );
      }
    } catch (e) {
      console.warn("Backend save-campaign call failed, falling back to local state:", e);
    }

    const targetId = campaign?.id ?? campaignId;
    const ids = new Set(previewState.savedCampaignIds ?? []);
    if (saved) ids.add(targetId);
    else ids.delete(targetId);
    previewState.savedCampaignIds = [...ids];
  }

  if (body.action === "SET_CREATOR_FOLLOW") {
    const creatorId = body.payload?.creatorId;
    const following = body.payload?.following;
    if (typeof creatorId !== "string" || typeof following !== "boolean")
      return requestError(
        422,
        "INVALID_FOLLOW_INPUT",
        "Người được theo dõi hoặc trạng thái chưa hợp lệ.",
      );

    // Persist to real NestJS PostgreSQL backend if session has token
    try {
      if (following) {
        await fetchBackendWithAuth(
          "/social/follows",
          {
            method: "POST",
            body: JSON.stringify({ creatorId }),
          },
          access.session,
        );
      } else {
        await fetchBackendWithAuth(
          `/social/follows/${encodeURIComponent(creatorId)}`,
          { method: "DELETE" },
          access.session,
        );
      }
    } catch (e) {
      console.warn("Backend follow call failed, falling back to local state:", e);
    }

    const ids = new Set(previewState.followedCreatorIds ?? []);
    if (following) ids.add(creatorId);
    else ids.delete(creatorId);
    previewState.followedCreatorIds = [...ids];
  }

  if (body.action === "SET_PRELAUNCH_NOTIFICATION") {
    const campaignId = body.payload?.campaignId;
    const enabled = body.payload?.enabled;
    if (typeof campaignId !== "string" || typeof enabled !== "boolean")
      return requestError(
        422,
        "INVALID_NOTIFICATION_INPUT",
        "Dự án hoặc lựa chọn nhắc chưa hợp lệ.",
      );
    const campaign = findMockCampaign(campaignId) ?? findMockCampaignBySlug(campaignId);

    // Persist to real NestJS PostgreSQL backend if session has token
    try {
      const backendId = campaign?.slug ?? campaignId;
      if (enabled) {
        await fetchBackendWithAuth(
          "/social/prelaunch-subscriptions",
          {
            method: "POST",
            body: JSON.stringify({ campaignId: backendId, notifyEmail: true }),
          },
          access.session,
        );
      } else {
        await fetchBackendWithAuth(
          `/social/prelaunch-subscriptions/${encodeURIComponent(backendId)}`,
          { method: "DELETE" },
          access.session,
        );
      }
    } catch (e) {
      console.warn("Backend prelaunch-subscription call failed, falling back to local state:", e);
    }

    const targetId = campaign?.id ?? campaignId;
    const ids = new Set(previewState.notifiedCampaignIds ?? []);
    if (enabled) ids.add(targetId);
    else ids.delete(targetId);
    previewState.notifiedCampaignIds = [...ids];
  }


  if (body.action === "MARK_MESSAGE_READ") {
    const messageId = body.payload?.messageId;
    if (typeof messageId !== "string" || !messageId.trim()) {
      return Response.json(
        {
          error: {
            code: "MESSAGE_ID_REQUIRED",
            message: "Cần xác định tin nhắn muốn đánh dấu đã đọc.",
          },
        },
        { status: 422 },
      );
    }
    if (
      ![...mockMessages, ...platformState.messages].some(
        (message) =>
          message.id === messageId &&
          message.recipientId === access.session.user.id,
      )
    ) {
      return requestError(
        404,
        "MESSAGE_NOT_FOUND",
        "Không tìm thấy tin nhắn trong hộp thư của bạn.",
      );
    }
    previewState.readMessageIds = [
      ...new Set([...(previewState.readMessageIds ?? []), messageId.trim()]),
    ];
  }

  if (body.action === "SEND_MESSAGE") {
    const campaignId = body.payload?.campaignId;
    const recipientUserId = body.payload?.recipientUserId;
    const subject = body.payload?.subject;
    const messageBody = body.payload?.body;
    if (
      typeof campaignId !== "string" ||
      typeof recipientUserId !== "string" ||
      typeof subject !== "string" ||
      typeof messageBody !== "string" ||
      !subject.trim() ||
      !messageBody.trim()
    ) {
      return Response.json(
        {
          error: {
            code: "MESSAGE_CONTENT_REQUIRED",
            message: "Vui lòng chọn người nhận và nhập đủ chủ đề, nội dung.",
          },
        },
        { status: 422 },
      );
    }
    if (recipientUserId === access.session.user.id) {
      return requestError(
        400,
        "SELF_MESSAGE_INVALID",
        "Bạn không thể gửi tin nhắn cho chính mình.",
      );
    }
    if (subject.trim().length > 180 || messageBody.trim().length > 4000) {
      return Response.json(
        {
          error: {
            code: "MESSAGE_CONTENT_TOO_LONG",
            message: "Tin nhắn vượt quá giới hạn ký tự cho phép.",
          },
        },
        { status: 422 },
      );
    }

    try {
      await fetchBackendWithAuth(
        "/messages",
        {
          method: "POST",
          body: JSON.stringify({
            campaignId,
            recipientId: recipientUserId,
            subject: subject.trim(),
            body: messageBody.trim(),
          }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend send message call failed, falling back to local state:", e);
    }

    const recipient = getMockUser(recipientUserId);
    const sharedMessage = {
      id: `sent_${crypto.randomUUID().slice(0, 8)}`,
      campaignId,
      senderId: access.session.user.id,
      senderName: access.session.user.name,
      senderInitials: access.session.user.initials,
      recipientId: recipient.id,
      recipientName: recipient.displayName,
      subject: subject.trim(),
      body: messageBody.trim(),
      sentAt: "Vừa xong",
    };
    previewState.sentMessages = [
      {
        id: sharedMessage.id,
        campaignId,
        senderId: sharedMessage.senderId,
        recipientId: sharedMessage.recipientId,
        recipient: sharedMessage.recipientName,
        subject: sharedMessage.subject,
        body: sharedMessage.body,
        sentAt: sharedMessage.sentAt,
      },
      ...(previewState.sentMessages ?? []),
    ].slice(0, 5);
    platformState.messages = [
      sharedMessage,
      ...platformState.messages.filter(
        (message) => message.id !== sharedMessage.id,
      ),
    ].slice(0, 20);
    platformPersisted = true;
  }

  if (body.action === "CREATE_COMMENT" || body.action === "ASK_QUESTION") {
    const campaignId = body.payload?.campaignId;
    const parentCommentId = body.payload?.parentCommentId || body.payload?.parentId;
    const commentBody = body.payload?.body;

    if (
      typeof campaignId !== "string" ||
      typeof commentBody !== "string" ||
      !commentBody.trim()
    ) {
      return requestError(
        422,
        "COMMENT_CONTENT_REQUIRED",
        "Vui lòng nhập nội dung bình luận (1 - 4000 ký tự).",
      );
    }

    try {
      await fetchBackendWithAuth(
        "/social/comments",
        {
          method: "POST",
          body: JSON.stringify({
            campaignId,
            parentCommentId: parentCommentId ? String(parentCommentId) : undefined,
            body: commentBody.trim(),
          }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend create comment call failed, falling back to local state:", e);
    }
  }

  if (body.action === "UPDATE_COMMENT") {
    const commentId = body.payload?.commentId;
    const commentBody = body.payload?.body;
    if (
      typeof commentId !== "string" ||
      typeof commentBody !== "string" ||
      !commentBody.trim()
    ) {
      return requestError(
        422,
        "COMMENT_UPDATE_REQUIRED",
        "Vui lòng nhập nội dung chỉnh sửa bình luận.",
      );
    }

    try {
      await fetchBackendWithAuth(
        `/social/comments/${encodeURIComponent(commentId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ body: commentBody.trim() }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend update comment call failed:", e);
    }
  }

  if (body.action === "DELETE_COMMENT") {
    const commentId = body.payload?.commentId;
    if (typeof commentId !== "string" || !commentId.trim()) {
      return requestError(
        422,
        "COMMENT_ID_REQUIRED",
        "Mã bình luận cần xóa không hợp lệ.",
      );
    }

    try {
      await fetchBackendWithAuth(
        `/social/comments/${encodeURIComponent(commentId)}`,
        { method: "DELETE" },
        access.session,
      );
    } catch (e) {
      console.warn("Backend delete comment call failed:", e);
    }
  }

  if (body.action === "LIKE_COMMENT") {
    const commentId = body.payload?.commentId;
    if (typeof commentId !== "string" || !commentId.trim()) {
      return requestError(
        422,
        "COMMENT_ID_REQUIRED",
        "Mã bình luận không hợp lệ.",
      );
    }

    try {
      await fetchBackendWithAuth(
        `/social/comments/${encodeURIComponent(commentId)}/like`,
        { method: "POST" },
        access.session,
      );
    } catch (e) {
      console.warn("Backend like comment call failed:", e);
    }
  }

  if (body.action === "HIDE_COMMENT") {
    const commentId = body.payload?.commentId;
    const isHidden = body.payload?.isHidden !== undefined ? Boolean(body.payload.isHidden) : true;
    const reason = typeof body.payload?.reason === "string" ? body.payload.reason : undefined;

    if (typeof commentId !== "string" || !commentId.trim()) {
      return requestError(
        422,
        "COMMENT_ID_REQUIRED",
        "Mã bình luận không hợp lệ.",
      );
    }

    try {
      await fetchBackendWithAuth(
        `/social/comments/${encodeURIComponent(commentId)}/hide`,
        {
          method: "PATCH",
          body: JSON.stringify({ isHidden, reason }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend hide comment call failed:", e);
    }
  }

  const statefulActions = new Set([
    "UPDATE_NOTIFICATION_PREFERENCES",
    "UPDATE_INTERESTS",
    "SAVE_PROJECT",
    "SET_CREATOR_FOLLOW",
    "SET_PRELAUNCH_NOTIFICATION",
    "MARK_MESSAGE_READ",
    "SEND_MESSAGE",
  ]);
  if (statefulActions.has(body.action)) {
    nextSession = { ...access.session, previewState };
  }

  const response = NextResponse.json({
    data: {
      action: body.action,
      payload: body.payload ?? {},
      actorId: access.session.user.id,
      processedAt: new Date().toISOString(),
      persisted: statefulActions.has(body.action),
    },
    session: statefulActions.has(body.action) ? nextSession : undefined,
  });

  if (statefulActions.has(body.action)) {
    const failure = writePreviewSessionCookie(response, nextSession);
    if (failure) return failure;
  }
  if (platformPersisted) {
    const failure = writePlatformPreviewCookie(response, platformState);
    if (failure) return failure;
  }

  return response;
}
