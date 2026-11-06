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
  "CLOSE_CAMPAIGN",
  "PUBLISH_UPDATE",
  "REPLY_COMMENT",
  "REPLY_MESSAGE",
  "UPDATE_COLLABORATOR_PERMISSIONS",
  "UPDATE_FULFILLMENT",
  "UPDATE_TASK_STATUS",
  "INVITE_MEMBER",
  "REMOVE_MEMBER",
  "RESPOND_INVITATION",
]);

const ownerOnlyActions = new Set([
  "SAVE_DRAFT",
  "SUBMIT_REVIEW",
  "LAUNCH",
  "CLOSE_CAMPAIGN",
  "UPDATE_COLLABORATOR_PERMISSIONS",
  "UPDATE_FULFILLMENT",
  "INVITE_MEMBER",
  "REMOVE_MEMBER",
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

  const access = await requireSession(
    action === "RESPOND_INVITATION"
      ? ["CREATOR", "COLLABORATOR", "BACKER", "ADMIN"]
      : ["CREATOR", "COLLABORATOR", "ADMIN"],
  );
  if (access.response) return access.response;

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
  if (action !== "RESPOND_INVITATION" && !campaignAccess.canOpenWorkspace) {
    return apiError(
      403,
      "FORBIDDEN_WORKSPACE",
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

  if (action === "REPLY_MESSAGE") {
    const parentMessageId = payload.parentMessageId as string;
    const recipientUserId = payload.recipientUserId as string;
    const messageCampaignId = (payload.campaignId as string) || campaignId;
    const messageBody = typeof payload.body === "string" ? payload.body.trim() : "";
    const subject = (payload.subject as string) || "Re: Phản hồi từ chủ dự án";

    if (!messageBody) {
      return apiError(422, "MESSAGE_BODY_REQUIRED", "Nội dung phản hồi không được để trống.");
    }

    try {
      await fetchBackendWithAuth(
        "/messages",
        {
          method: "POST",
          body: JSON.stringify({
            parentMessageId,
            recipientId: recipientUserId,
            campaignId: messageCampaignId,
            subject,
            body: messageBody,
          }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend reply message failed:", e);
    }
  }

  const previewState = getEffectivePreviewState(access.session!);
  let persisted = false;
  let platformPersisted = false;
  let operationResultData: any = null;

  if (action === "RESPOND_INVITATION") {
    const inviteAction =
      typeof payload.action === "string" ? payload.action.toUpperCase() : "";
    if (inviteAction !== "ACCEPT" && inviteAction !== "DECLINE") {
      return apiError(
        422,
        "INVALID_INVITATION_ACTION",
        "Hành động phản hồi lời mời không hợp lệ (phải là ACCEPT hoặc DECLINE).",
      );
    }

    try {
      const backendRes = await fetchBackendWithAuth(
        `/campaigns/${encodeURIComponent(campaignId)}/members/respond`,
        {
          method: "POST",
          body: JSON.stringify({ action: inviteAction }),
        },
        access.session,
      );

      if (!backendRes.response.ok) {
        const errJson = await backendRes.response.json().catch(() => ({}));
        return apiError(
          backendRes.response.status,
          "RESPOND_INVITATION_FAILED",
          errJson.message || "Không thể phản hồi lời mời tham gia dự án.",
        );
      }
    } catch (e: any) {
      console.warn("Backend respond invitation failed:", e);
    }

    const userEmail = access.session?.user?.email?.toLowerCase();
    const userId = access.session?.user?.id;
    if (inviteAction === "ACCEPT") {
      platformState.invitedMembers = (platformState.invitedMembers || []).map((m: any) => {
        if (m.campaignId === campaignId && (m.email?.toLowerCase() === userEmail || m.userId === userId)) {
          return { ...m, status: "ACCEPTED" };
        }
        return m;
      });
    } else {
      platformState.invitedMembers = (platformState.invitedMembers || []).filter((m: any) => {
        return !(m.campaignId === campaignId && (m.email?.toLowerCase() === userEmail || m.userId === userId));
      });
    }
    platformPersisted = true;
    persisted = true;
  }

  if (action === "INVITE_MEMBER") {
    const email =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return apiError(
        422,
        "INVALID_EMAIL",
        "Vui lòng nhập địa chỉ email hợp lệ của cộng tác viên.",
      );
    }

    let createdMemberData: any = null;
    try {
      const backendRes = await fetchBackendWithAuth(
        `/campaigns/${encodeURIComponent(campaignId)}/members`,
        {
          method: "POST",
          body: JSON.stringify({
            email,
            role: "COLLABORATOR",
            canPostUpdates: Boolean(payload.canPostUpdates ?? true),
            canReplyComments: Boolean(payload.canReplyComments ?? true),
            canViewAiDashboard: Boolean(payload.canViewAiDashboard ?? true),
          }),
        },
        access.session,
      );

      if (backendRes.response.ok) {
        createdMemberData = await backendRes.response.json().catch(() => null);
      } else {
        const errJson = await backendRes.response.json().catch(() => ({}));
        return apiError(
          backendRes.response.status,
          "INVITE_MEMBER_FAILED",
          errJson.message || "Không thể mời cộng tác viên. Vui lòng kiểm tra lại email.",
        );
      }
    } catch (e: any) {
      console.warn("Backend invite member failed, saving to platform preview:", e);
    }

    const memberName =
      createdMemberData?.user?.displayName || email.split("@")[0];
    const newMemberId =
      createdMemberData?.id || `collab_${crypto.randomUUID().slice(0, 8)}`;
    const newMemberUserId =
      createdMemberData?.userId || createdMemberData?.user?.id || newMemberId;

    const newInvitedMember = {
      id: newMemberId,
      campaignId,
      userId: newMemberUserId,
      name: memberName,
      email,
      role: "Cộng tác viên",
      status: "PENDING" as const,
      permissions: [
        [
          payload.canPostUpdates ?? true ? "Đăng bài cập nhật" : null,
          payload.canReplyComments ?? true ? "Trả lời bình luận" : null,
          payload.canViewAiDashboard ?? true ? "Xem phân tích AI" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Cộng tác viên",
      ],
      canPostUpdates: Boolean(payload.canPostUpdates ?? true),
      canReplyComments: Boolean(payload.canReplyComments ?? true),
      canViewAiDashboard: Boolean(payload.canViewAiDashboard ?? true),
    };

    operationResultData = {
      ...newInvitedMember,
      ...(createdMemberData || {}),
      userId: newMemberUserId,
      id: newMemberUserId,
      status: "PENDING",
    };

    platformState.invitedMembers = [
      ...(platformState.invitedMembers || []).filter(
        (m) => m.campaignId !== campaignId || m.email !== email,
      ),
      newInvitedMember,
    ];
    platformState.removedMemberIds = (
      platformState.removedMemberIds || []
    ).filter((id) => id !== newMemberId && id !== newMemberUserId);
    platformPersisted = true;
    persisted = true;
  }

  if (action === "REMOVE_MEMBER") {
    const memberId = String(payload.memberId || payload.userId || "");
    const memberEmail =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!memberId && !memberEmail) {
      return apiError(422, "MEMBER_ID_REQUIRED", "Mã thành viên không hợp lệ.");
    }

    const queryParam = memberEmail ? `?email=${encodeURIComponent(memberEmail)}` : "";
    const memberIdentifier = memberId || memberEmail;

    try {
      const backendRes = await fetchBackendWithAuth(
        `/campaigns/${encodeURIComponent(campaignId)}/members/${encodeURIComponent(memberIdentifier)}${queryParam}`,
        {
          method: "DELETE",
        },
        access.session,
      );
      if (!backendRes.response.ok && backendRes.response.status !== 404) {
        const errJson = await backendRes.response.json().catch(() => ({}));
        // If the member is in preview state or mock ID, do not block preview deletion
        const isPreviewOrMock =
          memberId.startsWith("collab_") ||
          (platformState.invitedMembers || []).some(
            (m) =>
              (m.id === memberId ||
                m.userId === memberId ||
                (memberEmail && m.email?.toLowerCase() === memberEmail)) &&
              m.campaignId === campaignId,
          );
        if (!isPreviewOrMock) {
          return apiError(
            backendRes.response.status,
            "REMOVE_MEMBER_FAILED",
            errJson.message || "Không thể xóa cộng tác viên.",
          );
        }
      }
    } catch (e: any) {
      console.warn("Backend remove member failed, recording in preview state:", e);
    }

    platformState.removedMemberIds = Array.from(
      new Set([
        ...(platformState.removedMemberIds || []),
        memberId,
        ...(payload.userId ? [String(payload.userId)] : []),
      ]),
    );
    platformState.invitedMembers = (platformState.invitedMembers || []).filter(
      (m) =>
        m.id !== memberId &&
        m.userId !== memberId &&
        (!memberEmail || m.email?.toLowerCase() !== memberEmail),
    );
    platformPersisted = true;
    persisted = true;
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
    const status = payload.status as string;

    try {
      const backendRes = await fetchBackendWithAuth(
        `/fulfillments/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        access.session,
      );

      if (!backendRes.response.ok) {
        const errJson = await backendRes.response.json().catch(() => ({}));
        console.warn(
          "UPDATE_FULFILLMENT backend update failed:",
          backendRes.response.status,
          errJson,
        );
        return apiError(
          backendRes.response.status,
          "INVALID_FULFILLMENT_TRANSITION",
          errJson.message || "Không thể cập nhật trạng thái đơn hàng.",
        );
      }
    } catch (err) {
      console.warn("UPDATE_FULFILLMENT backend update failed:", err);
    }

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
    let backendOk = true;
    try {
      const backendRes = await fetchBackendWithAuth(
        `/campaigns/${encodeURIComponent(campaignId)}/launch`,
        { method: "POST" },
        access.session,
      );
      if (!backendRes.response.ok) {
        const errJson = await backendRes.response.json().catch(() => ({}));
        console.warn("Backend launch returned non-OK:", backendRes.response.status, errJson);
        if (backendRes.response.status === 403) {
          return apiError(403, "FORBIDDEN", errJson.message || "Chỉ chủ dự án mới có quyền mở gọi vốn.");
        }
        if (backendRes.response.status === 400) {
          return apiError(400, "BAD_REQUEST", errJson.message || "Chiến dịch chưa sẵn sàng để mở gọi vốn.");
        }
        backendOk = false;
      }
    } catch (e) {
      console.warn("Failed to call backend launch:", e);
    }

    if (backendOk) {
      platformState.campaignStatuses = {
        ...platformState.campaignStatuses,
        [campaignId]: "LIVE",
      };
      platformPersisted = true;
    }
  }

  if (action === "CLOSE_CAMPAIGN") {
    const finalStatus =
      (payload.finalStatus as "SUCCESSFUL" | "FAILED") || "SUCCESSFUL";
    const reason =
      (payload.reason as string) || "Chủ dự án kết thúc sớm chiến dịch.";

    try {
      await fetchBackendWithAuth(
        `/campaigns/${encodeURIComponent(campaignId)}/close`,
        {
          method: "POST",
          body: JSON.stringify({ finalStatus, reason }),
        },
        access.session,
      );
    } catch (e) {
      console.warn("Backend close campaign failed:", e);
    }

    platformState.campaignStatuses = {
      ...platformState.campaignStatuses,
      [campaignId]: finalStatus,
    };

    persisted = true;
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
      member: operationResultData,
      result: operationResultData,
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
