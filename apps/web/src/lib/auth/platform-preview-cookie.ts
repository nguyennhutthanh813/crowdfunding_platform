import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodePreviewToken, encodePreviewToken } from "./preview-signing";
import type {
  CampaignCommentReply,
  CommentBadge,
  CampaignDraftSnapshot,
  ReviewQueueItem,
  WorkspaceTaskStatus,
} from "@/lib/api/contracts";
import type { StoredPreviewAccount } from "./preview-registered-accounts";
import {
  LocalStateConflictError,
  localDbEnabled,
  readLocalPlatformState,
  saveLocalPlatformState,
} from "@/lib/local-db/database";
import type { LocalCampaignEventInput } from "@/lib/local-db/database";

export const PLATFORM_PREVIEW_COOKIE_NAME = "gop_platform_preview";

export interface SharedCampaignReview extends ReviewQueueItem {
  campaignId: string;
}

export interface SharedPlatformMessage {
  id: string;
  campaignId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface SharedPreviewPledge {
  authorizationId: string;
  campaignId: string;
  backerId: string;
  backerName: string;
  rewardId: string | null;
  rewardTitle: string;
  totalAmount: number;
  city: string;
  authorizedAt: string;
  addOnIds?: string[];
  shippingOptionId?: string | null;
  address?: { fullName: string; city: string; phone?: string; line1?: string } | null;
}

export interface SharedCampaignComment {
  id: string;
  campaignId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorInitials: string;
  badge: CommentBadge;
  body: string;
  kind: "COMMENT" | "QUESTION";
  createdAt: string;
}

export interface SharedQuestionAssignment {
  campaignId: string;
  commentId: string;
  assigneeUserId: string;
  assignedByUserId: string;
  assignedAt: string;
  readAt?: string | null;
}

export interface PlatformPreviewState {
  version: 1;
  userStatuses: Record<string, "ACTIVE" | "SUSPENDED">;
  registeredAccounts: StoredPreviewAccount[];
  taskStatuses: Record<string, WorkspaceTaskStatus>;
  collaboratorPermissions: Record<string, string[]>;
  fulfillmentStatuses: Record<
    string,
    "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED"
  >;
  campaignDrafts: Record<string, CampaignDraftSnapshot>;
  publishedUpdates: Array<{
    id: string;
    campaignId: string;
    title: string;
    body?: string;
    author?: string;
    authorId?: string;
    publishedAt?: string;
    when: string;
  }>;
  commentReplies: CampaignCommentReply[];
  submittedReviews: SharedCampaignReview[];
  reviewDecisions: Record<string, "APPROVED" | "CHANGES" | "REJECTED">;
  reviewFeedback: Record<string, string>;
  campaignStatuses: Record<string, "LIVE" | "SUSPENDED">;
  campaignLaunchAt?: Record<string, string>;
  messages: SharedPlatformMessage[];
  pledges: SharedPreviewPledge[];
  campaignComments: SharedCampaignComment[];
  questionAssignments: SharedQuestionAssignment[];
  commentLikes: Record<string, string[]>;
  acceptedCollaborators: Record<string, string[]>;
}

export function createEmptyPlatformPreviewState(): PlatformPreviewState {
  return {
    version: 1,
    userStatuses: {},
    registeredAccounts: [],
    taskStatuses: {},
    collaboratorPermissions: {},
    fulfillmentStatuses: {},
    campaignDrafts: {},
    publishedUpdates: [],
    commentReplies: [],
    submittedReviews: [],
    reviewDecisions: {},
    reviewFeedback: {},
    campaignStatuses: {},
    campaignLaunchAt: {},
    messages: [],
    pledges: [],
    campaignComments: [],
    questionAssignments: [],
    commentLikes: {},
    acceptedCollaborators: {},
  };
}

export function encodePlatformPreview(state: PlatformPreviewState) {
  return encodePreviewToken(state, "platform");
}

export function decodePlatformPreview(
  token?: string | null,
): PlatformPreviewState {
  if (localDbEnabled()) {
    return readLocalPlatformState(createEmptyPlatformPreviewState());
  }
  try {
    const parsed = decodePreviewToken(
      token,
      "platform",
    ) as Partial<PlatformPreviewState> | null;
    if (parsed?.version !== 1) return createEmptyPlatformPreviewState();

    return {
      version: 1,
      userStatuses: { ...(parsed.userStatuses ?? {}) },
      registeredAccounts: Array.isArray(parsed.registeredAccounts)
        ? parsed.registeredAccounts.slice(0, 3)
        : [],
      taskStatuses: { ...(parsed.taskStatuses ?? {}) },
      collaboratorPermissions: Object.fromEntries(
        Object.entries(parsed.collaboratorPermissions ?? {}).map(
          ([memberId, permissions]) => [
            memberId,
            Array.isArray(permissions) ? permissions.slice(0, 6) : [],
          ],
        ),
      ),
      fulfillmentStatuses: { ...(parsed.fulfillmentStatuses ?? {}) },
      campaignDrafts: Object.fromEntries(
        Object.entries(parsed.campaignDrafts ?? {}).slice(0, 4),
      ),
      publishedUpdates: Array.isArray(parsed.publishedUpdates)
        ? parsed.publishedUpdates.slice(0, 8)
        : [],
      commentReplies: Array.isArray(parsed.commentReplies)
        ? parsed.commentReplies.slice(0, 12)
        : [],
      submittedReviews: Array.isArray(parsed.submittedReviews)
        ? parsed.submittedReviews.slice(0, 4)
        : [],
      reviewDecisions: { ...(parsed.reviewDecisions ?? {}) },
      reviewFeedback: { ...(parsed.reviewFeedback ?? {}) },
      campaignStatuses: { ...(parsed.campaignStatuses ?? {}) },
      campaignLaunchAt: { ...(parsed.campaignLaunchAt ?? {}) },
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.slice(0, 12)
        : [],
      pledges: Array.isArray(parsed.pledges)
        ? parsed.pledges.slice(0, 5)
        : [],
      campaignComments: Array.isArray(parsed.campaignComments)
        ? parsed.campaignComments.slice(0, 10)
        : [],
      questionAssignments: Array.isArray(parsed.questionAssignments)
        ? parsed.questionAssignments.slice(0, 10)
        : [],
      commentLikes: Object.fromEntries(
        Object.entries(parsed.commentLikes ?? {}).slice(0, 24).map(([key, users]) => [
          key,
          Array.isArray(users) ? users.filter((id): id is string => typeof id === "string").slice(0, 12) : [],
        ]),
      ),
      acceptedCollaborators: { ...(parsed.acceptedCollaborators ?? {}) },
    };
  } catch {
    return createEmptyPlatformPreviewState();
  }
}

export async function getServerPlatformPreviewState() {
  if (localDbEnabled()) {
    return readLocalPlatformState(createEmptyPlatformPreviewState());
  }
  const cookieStore = await cookies();
  return decodePlatformPreview(
    cookieStore.get(PLATFORM_PREVIEW_COOKIE_NAME)?.value,
  );
}

export function writePlatformPreviewCookie(
  response: NextResponse,
  state: PlatformPreviewState,
  event?: LocalCampaignEventInput,
) {
  if (localDbEnabled()) {
    try {
      saveLocalPlatformState(state, event);
      return null;
    } catch (error) {
      if (error instanceof LocalStateConflictError) {
        return NextResponse.json(
          { error: { code: "LOCAL_DB_STALE", message: "Chưa thể lưu vì dữ liệu vừa thay đổi ở một phiên khác. Bạn hãy gửi lại; nếu vẫn lỗi, tải lại trang rồi kiểm tra dữ liệu." } },
          { status: 409 },
        );
      }
      console.error("Không lưu được dữ liệu SQLite local:", error);
      return NextResponse.json(
        { error: { code: "LOCAL_DB_WRITE_FAILED", message: "Chưa lưu được dữ liệu trên máy. Hãy kiểm tra cửa sổ chạy web." } },
        { status: 500 },
      );
    }
  }
  const token = encodePlatformPreview(state);
  if (token.length > 3800)
    return NextResponse.json(
      {
        error: {
          code: "PREVIEW_STORAGE_FULL",
          message:
            "Bộ nhớ dùng thử của trình duyệt đã đầy. Thao tác này chưa được lưu; hãy giữ lại nội dung trước khi đặt lại dữ liệu.",
        },
      },
      { status: 409 },
    );
  response.cookies.set(PLATFORM_PREVIEW_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return null;
}
