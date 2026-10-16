import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodePreviewToken, encodePreviewToken } from "./preview-signing";
import type { ReviewQueueItem, WorkspaceTaskStatus } from "@/lib/api/contracts";

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

export interface PlatformPreviewState {
  version: 1;
  taskStatuses: Record<string, WorkspaceTaskStatus>;
  collaboratorPermissions: Record<string, string[]>;
  fulfillmentStatuses: Record<
    string,
    "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED"
  >;
  publishedUpdates: Array<{
    id: string;
    campaignId: string;
    title: string;
    when: string;
  }>;
  submittedReviews: SharedCampaignReview[];
  reviewDecisions: Record<string, "APPROVED" | "CHANGES" | "REJECTED">;
  reviewFeedback: Record<string, string>;
  campaignStatuses: Record<string, "LIVE" | "SUSPENDED">;
  messages: SharedPlatformMessage[];
}

export function createEmptyPlatformPreviewState(): PlatformPreviewState {
  return {
    version: 1,
    taskStatuses: {},
    collaboratorPermissions: {},
    fulfillmentStatuses: {},
    publishedUpdates: [],
    submittedReviews: [],
    reviewDecisions: {},
    reviewFeedback: {},
    campaignStatuses: {},
    messages: [],
  };
}

export function encodePlatformPreview(state: PlatformPreviewState) {
  return encodePreviewToken(state, "platform");
}

export function decodePlatformPreview(
  token?: string | null,
): PlatformPreviewState {
  try {
    const parsed = decodePreviewToken(
      token,
      "platform",
    ) as Partial<PlatformPreviewState> | null;
    if (parsed?.version !== 1) return createEmptyPlatformPreviewState();

    return {
      version: 1,
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
      publishedUpdates: Array.isArray(parsed.publishedUpdates)
        ? parsed.publishedUpdates.slice(0, 8)
        : [],
      submittedReviews: Array.isArray(parsed.submittedReviews)
        ? parsed.submittedReviews.slice(0, 4)
        : [],
      reviewDecisions: { ...(parsed.reviewDecisions ?? {}) },
      reviewFeedback: { ...(parsed.reviewFeedback ?? {}) },
      campaignStatuses: { ...(parsed.campaignStatuses ?? {}) },
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.slice(0, 12)
        : [],
    };
  } catch {
    return createEmptyPlatformPreviewState();
  }
}

export async function getServerPlatformPreviewState() {
  const cookieStore = await cookies();
  return decodePlatformPreview(
    cookieStore.get(PLATFORM_PREVIEW_COOKIE_NAME)?.value,
  );
}

export function writePlatformPreviewCookie(
  response: NextResponse,
  state: PlatformPreviewState,
) {
  const token = encodePlatformPreview(state);
  if (token.length > 3800)
    return NextResponse.json(
      {
        error: {
          code: "PREVIEW_STORAGE_FULL",
          message:
            "Bộ nhớ demo của trình duyệt đã đầy. Thao tác này chưa được lưu; hãy giữ lại nội dung trước khi đặt lại dữ liệu demo.",
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
