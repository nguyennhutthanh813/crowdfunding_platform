import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import {
  findMockCampaign,
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
    if (!findMockCampaign(campaignId))
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
      )
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
    if (!campaign)
      return requestError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy dự án.");
    if (
      enabled &&
      (platformState.campaignStatuses[campaignId] ||
        campaign.status !== "PRE_LAUNCH")
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
    const recipientIsMember = mockCampaignMembers.some(
      (member) =>
        member.campaignId === campaignId && member.userId === recipientUserId,
    );
    const senderBackedCampaign =
      mockPledges.some(
        (pledge) =>
          pledge.campaignId === campaignId &&
          pledge.backerId === access.session.user.id,
      ) ||
      previewState.authorizedPledges?.some(
        (pledge) => pledge.campaignId === campaignId,
      );
    if (!campaign || !recipientIsMember || !senderBackedCampaign) {
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
    ].slice(0, 3);
    platformState.messages = [
      sharedMessage,
      ...platformState.messages.filter(
        (message) => message.id !== sharedMessage.id,
      ),
    ].slice(0, 12);
    platformPersisted = true;
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
