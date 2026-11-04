import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth/server-session";
import {
  getServerPlatformPreviewState,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import type { NotificationItem } from "@/components/notifications/notification-dropdown";

const READ_NOTIFICATIONS_COOKIE = "read_notification_ids";

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function getStoredCookieReadIds(): Promise<Set<string>> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(READ_NOTIFICATIONS_COOKIE)?.value;
    if (!raw) return new Set();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(decodeURIComponent(raw));
    }
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Hôm qua";
    return `${days} ngày trước`;
  } catch {
    return "Gần đây";
  }
}

export async function GET() {
  const [session, platformState, cookieReadIds] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
    getStoredCookieReadIds(),
  ]);

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const notifications: NotificationItem[] = [];

  // 1. Fetch real notifications from NestJS backend if accessToken exists
  if (session?.tokens?.accessToken) {
    try {
      const res = await fetch(`${apiUrl}/notifications?limit=20`, {
        headers: {
          Authorization: `Bearer ${session.tokens.accessToken}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const result = await res.json();
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : [];

        for (const item of list) {
          notifications.push({
            id: item.id,
            type:
              item.type === "CAMPAIGN_STATUS"
                ? "review"
                : item.type === "PLEDGE"
                  ? "pledge"
                  : item.type === "COMMENT"
                    ? "comment"
                    : "system",
            title: item.title,
            message: item.body,
            time: formatRelativeTime(item.createdAt),
            createdAt: item.createdAt,
            read: Boolean(item.readAt) || cookieReadIds.has(item.id),
            link: item.actionUrl || "/creator",
          });
        }
      }
    } catch (err) {
      console.warn("GET /api/v1/notifications: failed to fetch from backend", err);
    }
  }

  // 2. Synthesize notifications from platformState review decisions if not already in list
  let platformStateModified = false;
  if (platformState) {
    if (!platformState.reviewTimestamps) {
      platformState.reviewTimestamps = {};
    }

    for (const [id, decision] of Object.entries(platformState.reviewDecisions || {})) {
      const feedback =
        platformState.reviewFeedback?.[id] ||
        (decision === "CHANGES"
          ? "Ban quản trị yêu cầu bổ sung thông tin hồ sơ chiến dịch."
          : "Chiến dịch của bạn đã sẵn sàng để khởi chạy gọi vốn.");

      const notifId = `preview-notif-${id}`;
      // Prevent duplicates by checking id, link target, or identical review message
      const exists = notifications.some(
        (n) =>
          n.id === notifId ||
          (n.link && n.link.includes(id)) ||
          (n.type === "review" && n.message === feedback)
      );

      if (!exists && (decision === "CHANGES" || decision === "APPROVED")) {
        // Retrieve persistent timestamp from cookie or initialize with real submitted review time
        let notifCreatedAt = platformState.reviewTimestamps[id];
        if (!notifCreatedAt) {
          const matchingReview = platformState.submittedReviews?.find(
            (r) => r.id === id || r.campaignId === id
          );
          const reviewItems = matchingReview?.reviews;
          const lastReviewTime =
            Array.isArray(reviewItems) && reviewItems.length > 0
              ? reviewItems[reviewItems.length - 1]?.createdAt
              : undefined;

          // Default fallback to 10 minutes ago so it does not stay pinned at "Vừa xong"
          notifCreatedAt =
            lastReviewTime ||
            matchingReview?.submittedAt ||
            new Date(Date.now() - 10 * 60 * 1000).toISOString();

          platformState.reviewTimestamps[id] = notifCreatedAt;
          platformStateModified = true;
        }

        const title =
          decision === "CHANGES"
            ? "Chiến dịch cần bổ sung thông tin"
            : "Chiến dịch đã được phê duyệt!";

        notifications.unshift({
          id: notifId,
          type: "review",
          title,
          message: feedback,
          time: formatRelativeTime(notifCreatedAt),
          createdAt: notifCreatedAt,
          read: cookieReadIds.has(notifId),
          link: id ? `/creator/campaigns/${id}/manage` : "/creator",
        });
      }
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const response = NextResponse.json({
    notifications,
    unreadCount,
    readIds: Array.from(cookieReadIds),
  });

  if (platformStateModified) {
    writePlatformPreviewCookie(response, platformState);
  }

  return response;
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  let body: { id?: string; readAll?: boolean; allIds?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body
  }

  const { id, readAll, allIds } = body;
  const existingReadIds = await getStoredCookieReadIds();

  if (readAll) {
    if (Array.isArray(allIds)) {
      for (const item of allIds) {
        if (typeof item === "string" && item.trim()) {
          existingReadIds.add(item.trim());
        }
      }
    }
    if (session?.tokens?.accessToken) {
      try {
        await fetch(`${apiUrl}/notifications/read-all`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.tokens.accessToken}`,
          },
        });
      } catch (err) {
        console.warn("PATCH /notifications/read-all failed:", err);
      }
    }
  } else if (id && typeof id === "string") {
    existingReadIds.add(id);
    if (isUuid(id) && session?.tokens?.accessToken) {
      try {
        await fetch(`${apiUrl}/notifications/${id}/read`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.tokens.accessToken}`,
          },
        });
      } catch (err) {
        console.warn(`PATCH /notifications/${id}/read failed:`, err);
      }
    }
  }

  const response = NextResponse.json({
    success: true,
    readIds: Array.from(existingReadIds),
  });

  const cookiePayload = JSON.stringify(Array.from(existingReadIds).slice(-100));
  response.cookies.set(READ_NOTIFICATIONS_COOKIE, cookiePayload, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}

