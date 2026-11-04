import { NextResponse } from "next/server";
import { api, type CommentBadge } from "@/lib/api";
import {
  findMockCampaign,
  getCampaignMembership,
  mockUsers,
  mockCampaignMembers,
  mockPledges,
  mockMessages,
} from "@/lib/api/mock/relational-store";
import {
  isRecord,
  readJsonObject,
  requestError,
} from "@/lib/api/request-validation";
import { previewAccounts } from "@/lib/auth/preview-accounts";
import { isNotificationPreferences } from "@/lib/auth/notification-preferences";
import {
  getServerPlatformPreviewState,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";
import { localDbEnabled } from "@/lib/local-db/database";
import { buildUserDashboard } from "@/lib/dashboard-preview";
import { publicPreviewCampaignDetail, publicPreviewCampaigns } from "@/lib/creator/public-preview-campaigns";
import { applyCampaignDetailPreviewState } from "@/lib/preview-read-models";
import { commentLikeKey } from "@/lib/campaign/comments-preview";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";
import { previewInvitationForUser } from "@/lib/auth/preview-collaborators";
import type { LocalCampaignEventInput } from "@/lib/local-db/database";

export async function GET() {
  const access = await requireSession(["BACKER"]);
  if (access.response) return access.response;
  const [data, campaigns, platformState] = await Promise.all([
    api.getUserDashboard(),
    api.listCampaigns(),
    getServerPlatformPreviewState(),
  ]);
  return Response.json(
    buildUserDashboard(data, [...campaigns, ...publicPreviewCampaigns(platformState)], access.session, platformState),
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
  "LIKE_COMMENT",
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
  if (
    !["CHANGE_PASSWORD", "UPDATE_NOTIFICATION_PREFERENCES"].includes(
      body.action,
    ) &&
    !access.session.user.roles.includes("BACKER")
  ) {
    return requestError(
      403,
      "FORBIDDEN",
      "Thao tác này dành cho người ủng hộ.",
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
          "Đã kiểm tra thông tin hợp lệ. Bản dùng thử không đổi mật khẩu; tài khoản mẫu vẫn dùng mật khẩu cũ.",
      },
    });
  }

  let nextSession = access.session;
  const previewState = getEffectivePreviewState(access.session);
  const platformState = await getServerPlatformPreviewState();
  let platformPersisted = false;
  let platformEvent: LocalCampaignEventInput | undefined;
  let createdCommentId: string | undefined;
  let createdCommentBadge: CommentBadge | undefined;
  let likeResult: { liked: boolean; likes: number } | undefined;

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
  if (!findMockCampaign(campaignId) && !publicPreviewCampaignDetail(campaignId, platformState))
      return requestError(
        404,
        "CAMPAIGN_NOT_FOUND",
        "Không tìm thấy dự án muốn lưu.",
      );
    if (typeof campaignId === "string" && typeof saved === "boolean") {
      const ids = new Set(previewState.savedCampaignIds ?? []);
      if (saved) ids.add(campaignId);
      else ids.delete(campaignId);
      previewState.savedCampaignIds = [...ids];
    }
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
    if (
      !mockCampaignMembers.some(
        (member) => member.userId === creatorId && member.role === "OWNER",
      ) && !publicPreviewCampaigns(platformState).some((campaign) => campaign.creator.id === creatorId)
    )
      return requestError(
        404,
        "CREATOR_NOT_FOUND",
        "Không tìm thấy chủ dự án muốn theo dõi.",
      );
    if (typeof creatorId === "string" && typeof following === "boolean") {
      const ids = new Set(previewState.followedCreatorIds ?? []);
      if (following) ids.add(creatorId);
      else ids.delete(creatorId);
      previewState.followedCreatorIds = [...ids];
    }
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
    const campaign = findMockCampaign(campaignId);
    const newCampaign = isPreviewCampaignId(campaignId)
      ? publicPreviewCampaignDetail(campaignId, platformState) : null;
    if (!campaign && !newCampaign)
      return requestError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy dự án.");
    if (
      enabled &&
      (newCampaign ? previewCampaignStatus(campaignId, platformState) !== "PRE_LAUNCH"
        : platformState.campaignStatuses[campaignId] || campaign?.status !== "PRE_LAUNCH")
    )
      return requestError(
        409,
        "CAMPAIGN_NOT_PRELAUNCH",
        "Chỉ đăng ký nhắc ra mắt cho dự án sắp gọi vốn.",
      );
    if (typeof campaignId === "string" && typeof enabled === "boolean") {
      const ids = new Set(previewState.notifiedCampaignIds ?? []);
      if (enabled) ids.add(campaignId);
      else ids.delete(campaignId);
      previewState.notifiedCampaignIds = [...ids];
    }
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
    if (subject.trim().length > 80 || messageBody.trim().length > 240) {
      return Response.json(
        {
          error: {
            code: "MESSAGE_CONTENT_TOO_LONG",
            message: "Tin nhắn dài hơn giới hạn của bản mô phỏng.",
          },
        },
        { status: 422 },
      );
    }
    const campaign = findMockCampaign(campaignId);
    const newCampaign = isPreviewCampaignId(campaignId)
      ? publicPreviewCampaignDetail(campaignId, platformState) : null;
    const recipientIsMember = mockCampaignMembers.some(
      (member) =>
        member.campaignId === campaignId && member.userId === recipientUserId,
    ) || Boolean(newCampaign?.creator.id === recipientUserId);
    const senderBackedCampaign =
      mockPledges.some(
        (pledge) =>
          pledge.campaignId === campaignId &&
          pledge.backerId === access.session.user.id,
      ) ||
      previewState.authorizedPledges?.some(
        (pledge) => pledge.campaignId === campaignId,
      ) ||
      platformState.pledges.some(
        (pledge) =>
          pledge.campaignId === campaignId &&
          pledge.backerId === access.session.user.id,
      );
    if ((!campaign && !newCampaign) || !recipientIsMember || !senderBackedCampaign) {
      return Response.json(
        {
          error: {
            code: "MESSAGE_RELATION_INVALID",
            message: "Chỉ có thể nhắn cho thành viên của dự án bạn đã ủng hộ.",
          },
        },
        { status: 403 },
      );
    }
    const recipient = mockUsers.find((user) => user.id === recipientUserId);
    const registeredRecipient = platformState.registeredAccounts.find((user) => user.id === recipientUserId);
    if (!recipient && !registeredRecipient) return requestError(404, "RECIPIENT_NOT_FOUND", "Không tìm thấy người nhận.");
    const sharedMessage = {
      id: `sent_${crypto.randomUUID().slice(0, 8)}`,
      campaignId,
      senderId: access.session.user.id,
      senderName: access.session.user.name,
      senderInitials: access.session.user.initials,
      recipientId: recipient?.id ?? registeredRecipient!.id,
      recipientName: recipient?.displayName ?? registeredRecipient!.name,
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
    ].slice(0, localDbEnabled() ? undefined : 3);
    platformState.messages = [
      sharedMessage,
      ...platformState.messages.filter(
        (message) => message.id !== sharedMessage.id,
      ),
    ].slice(0, localDbEnabled() ? undefined : 12);
    platformPersisted = true;
    if (newCampaign) platformEvent = {
      campaignId, actorUserId: access.session.user.id, actorRole: "BACKER",
      eventType: "SEND_MESSAGE", stage: "FUNDING", visibility: "INVOLVED",
      title: "Người ủng hộ gửi tin cho chủ dự án", detail: subject.trim(),
      refId: sharedMessage.id,
    };
  }

  if (["CREATE_COMMENT", "ASK_QUESTION", "LIKE_COMMENT"].includes(body.action)) {
    const campaignId = body.payload.campaignId;
    if (typeof campaignId !== "string" || !campaignId.trim())
      return requestError(422, "CAMPAIGN_ID_REQUIRED", "Cần chọn chiến dịch để thảo luận.");
    const seed = findMockCampaign(campaignId);
    const seedDetail = seed ? await api.getCampaignBySlug(seed.slug) : null;
    const campaign = seedDetail
      ? applyCampaignDetailPreviewState(seedDetail, platformState)
      : publicPreviewCampaignDetail(campaignId, platformState);
    if (!campaign) return requestError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy trang chiến dịch.");
    if (campaign.status === "SUSPENDED")
      return requestError(409, "DISCUSSION_PAUSED", "Chiến dịch đang tạm dừng nên chưa nhận thêm tương tác.");

    if (body.action === "LIKE_COMMENT") {
      const commentId = body.payload.commentId;
      const liked = body.payload.liked;
      if (typeof commentId !== "string" || typeof liked !== "boolean")
        return requestError(422, "LIKE_INPUT_INVALID", "Bình luận hoặc trạng thái thích chưa hợp lệ.");
      const target = campaign.comments.flatMap((item) => [item, ...(item.replies ?? [])])
        .find((item) => item.id === commentId);
      if (!target) return requestError(404, "COMMENT_NOT_FOUND", "Bình luận không thuộc chiến dịch này.");
      const key = commentLikeKey(campaignId, commentId);
      const users = new Set(platformState.commentLikes?.[key] ?? []);
      const wasLiked = users.has(access.session.user.id);
      if (liked) users.add(access.session.user.id);
      else users.delete(access.session.user.id);
      platformState.commentLikes ??= {};
      if (users.size) platformState.commentLikes[key] = [...users];
      else delete platformState.commentLikes[key];
      platformPersisted = true;
      likeResult = { liked, likes: target.likes + Number(liked) - Number(wasLiked) };
    } else {
      const text = typeof body.payload.body === "string" ? body.payload.body.trim() : "";
      if (text.length < 3 || text.length > 1000)
        return requestError(422, "COMMENT_INVALID", "Nội dung cần từ 3 đến 1.000 ký tự.");
      if (body.payload.parentId != null && typeof body.payload.parentId !== "string")
        return requestError(422, "COMMENT_PARENT_INVALID", "Bình luận muốn trả lời chưa hợp lệ.");
      const parentId = typeof body.payload.parentId === "string" ? body.payload.parentId : null;
      if (parentId && !campaign.comments.some((item) => item.id === parentId))
        return requestError(404, "COMMENT_PARENT_NOT_FOUND", "Bình luận gốc không thuộc chiến dịch này.");

      const invitation = previewInvitationForUser(campaignId, access.session, platformState);
      const member = getCampaignMembership(campaignId, access.session.user.id);
      const isOwner = campaign.creator.id === access.session.user.id &&
        access.session.user.roles.includes("CREATOR");
      const canReplyAsTeam = access.session.user.roles.includes("COLLABORATOR") &&
        ((member?.role === "COLLABORATOR" && member.canReplyComments) ||
          Boolean(invitation?.accepted && invitation.permissions.canReply));
      const badge: CommentBadge = isOwner ? "CREATOR" : canReplyAsTeam ? "COLLABORATOR" : "BACKER";
      const comment = {
        id: `comment_${crypto.randomUUID().slice(0, 12)}`, campaignId, parentId,
        authorId: access.session.user.id, authorName: access.session.user.name,
        authorInitials: access.session.user.initials, badge, body: text,
        kind: body.action === "ASK_QUESTION" ? "QUESTION" as const : "COMMENT" as const,
        createdAt: new Date().toISOString(),
      };
      platformState.campaignComments = [comment, ...platformState.campaignComments]
        .slice(0, localDbEnabled() ? undefined : 10);
      platformPersisted = true;
      createdCommentId = comment.id;
      createdCommentBadge = badge;
      platformEvent = {
        campaignId, actorUserId: access.session.user.id,
        actorRole: badge === "CREATOR" ? "CREATOR" : badge === "COLLABORATOR" ? "COLLABORATOR" : "BACKER",
        eventType: body.action, stage: campaign.status === "LIVE" ? "FUNDING" :
          campaign.status === "SUCCESSFUL" || campaign.status === "FAILED" ? "DELIVERY" : "PREPARATION",
        visibility: "PUBLIC",
        title: parentId ? "Trả lời trong thảo luận" :
          body.action === "ASK_QUESTION" ? "Đặt câu hỏi" : "Đăng bình luận",
        detail: "Nội dung có trên tab Bình luận của chiến dịch.",
        refId: comment.id,
      };
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
      persisted: statefulActions.has(body.action) || platformPersisted,
      recordId: createdCommentId,
      badge: createdCommentBadge,
      ...likeResult,
    },
    session: statefulActions.has(body.action) ? nextSession : undefined,
  });

  if (statefulActions.has(body.action)) {
    const failure = writePreviewSessionCookie(response, nextSession);
    if (failure) return failure;
  }
  if (platformPersisted) {
    const failure = writePlatformPreviewCookie(response, platformState, platformEvent);
    if (failure) return failure;
  }

  return response;
}
