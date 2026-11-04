"use client";

import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck2,
  Gift,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UserRole } from "@/lib/api/contracts";

export interface NotificationItem {
  id: string;
  type: "review" | "pledge" | "comment" | "system" | "task" | "fulfillment";
  title: string;
  message: string;
  time?: string;
  createdAt?: string;
  read: boolean;
  link?: string;
}

export function formatNotificationTime(
  item: NotificationItem,
  now: number = Date.now()
): string {
  if (item.createdAt) {
    const date = new Date(item.createdAt);
    const timeMs = date.getTime();
    if (!isNaN(timeMs)) {
      const diff = Math.max(0, now - timeMs);
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 45) {
        return "Vừa xong";
      }
      if (minutes < 60) {
        return `${minutes} phút trước`;
      }
      if (hours < 24) {
        return `${hours} giờ trước`;
      }
      if (days === 1) {
        return "Hôm qua";
      }
      if (days < 7) {
        return `${days} ngày trước`;
      }

      const isCurrentYear =
        date.getFullYear() === new Date(now).getFullYear();
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: isCurrentYear ? undefined : "numeric",
      }).format(date);
    }
  }

  return item.time || "Vừa xong";
}

export function formatFullNotificationDate(item: NotificationItem): string {
  if (item.createdAt) {
    const date = new Date(item.createdAt);
    if (!isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    }
  }
  return item.time || "";
}

const STORAGE_KEY = "crowdfunding_read_notification_ids";
const TIMESTAMPS_STORAGE_KEY = "crowdfunding_notification_timestamps";

function getStoredReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function storeReadId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getStoredReadIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore
  }
}

function storeAllReadIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const set = getStoredReadIds();
    for (const id of ids) {
      if (id) set.add(id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore
  }
}

function getStoredTimestamps(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TIMESTAMPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function storeNotificationTimestamp(id: string, timestamp: string) {
  if (typeof window === "undefined" || !id || !timestamp) return;
  try {
    const map = getStoredTimestamps();
    if (!map[id]) {
      map[id] = timestamp;
      localStorage.setItem(TIMESTAMPS_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore
  }
}

export function getDefaultNotifications(role: UserRole = "CREATOR"): NotificationItem[] {
  const now = Date.now();
  const storedTimestamps = typeof window !== "undefined" ? getStoredTimestamps() : {};
  const templates: Record<
    UserRole,
    Array<{
      id: string;
      type: NotificationItem["type"];
      title: string;
      message: string;
      minutesAgo: number;
      read: boolean;
      link?: string;
    }>
  > = {
    CREATOR: [
      {
        id: "n-c1",
        type: "review",
        title: "Hồ sơ chiến dịch đang thẩm định",
        message:
          "Hồ sơ chiến dịch của bạn đang được ban quản trị xét duyệt tính minh bạch trong vòng 24h làm việc.",
        minutesAgo: 10,
        read: true,
        link: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=overview",
      },
      {
        id: "n-c2",
        type: "comment",
        title: "Bình luận mới từ cộng đồng",
        message:
          "Thành viên Hoàng Nam vừa gửi câu hỏi về thời gian giao hàng dự kiến.",
        minutesAgo: 45,
        read: true,
        link: "/projects/orbit-one-ca-phe-thong-minh?tab=comments",
      },
      {
        id: "n-c3",
        type: "pledge",
        title: "Cam kết mới được ghi nhận",
        message:
          "Một người ủng hộ vừa đăng ký gói quà tặng trị giá 500.000 đ.",
        minutesAgo: 120,
        read: true,
        link: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=fulfillment",
      },
      {
        id: "n-c4",
        type: "system",
        title: "Tín hiệu dự báo AI",
        message:
          "Mô hình AI ghi nhận tương tác của chiến dịch đang tăng trưởng tích cực (+15% tuần này).",
        minutesAgo: 1440,
        read: true,
        link: "/creator/ai",
      },
    ],
    BACKER: [
      {
        id: "n-b1",
        type: "pledge",
        title: "Cam kết được bảo vệ an toàn",
        message:
          "Khoản cam kết của bạn được hệ thống giữ an toàn theo cơ chế All-or-Nothing.",
        minutesAgo: 60,
        read: true,
        link: "/dashboard?tab=backed",
      },
      {
        id: "n-b2",
        type: "fulfillment",
        title: "Tin cập nhật mới từ chủ dự án",
        message:
          "Dự án bạn theo dõi vừa đăng bài viết cập nhật quy trình chế tác thử nghiệm.",
        minutesAgo: 180,
        read: true,
        link: "/projects/orbit-one-ca-phe-thong-minh?tab=updates",
      },
      {
        id: "n-b3",
        type: "system",
        title: "Gợi ý chiến dịch mới",
        message:
          "Chiến dịch thủ công mỹ nghệ phù hợp với sở thích của bạn vừa ra mắt.",
        minutesAgo: 1440,
        read: true,
        link: "/discover",
      },
    ],
    COLLABORATOR: [
      {
        id: "n-cl1",
        type: "task",
        title: "Việc mới được phân công",
        message:
          "Chủ dự án vừa phân công cho bạn xử lý phản hồi bình luận của cộng đồng.",
        minutesAgo: 30,
        read: true,
        link: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage",
      },
      {
        id: "n-cl2",
        type: "comment",
        title: "Cộng đồng hỏi về tiến độ",
        message:
          "Có 3 bình luận mới trên trang thảo luận chiến dịch đang chờ phản hồi.",
        minutesAgo: 120,
        read: true,
        link: "/projects/orbit-one-ca-phe-thong-minh?tab=comments",
      },
    ],
    ADMIN: [
      {
        id: "n-a1",
        type: "review",
        title: "Hồ sơ chiến dịch mới cần duyệt",
        message:
          "Có 1 hồ sơ chiến dịch mới gửi yêu cầu thẩm định mục tiêu gọi vốn.",
        minutesAgo: 15,
        read: true,
        link: "/admin?tab=reviews",
      },
      {
        id: "n-a2",
        type: "system",
        title: "Kiểm soát an toàn thanh toán",
        message:
          "Hệ thống tự động đã đối soát thành công 100% giao dịch trong phiên làm việc.",
        minutesAgo: 120,
        read: true,
        link: "/admin?tab=fraud",
      },
    ],
  };

  const list = templates[role] || templates.CREATOR;
  return list.map((item) => {
    let createdAt = storedTimestamps[item.id];
    if (!createdAt) {
      createdAt = new Date(now - item.minutesAgo * 60 * 1000).toISOString();
      storeNotificationTimestamp(item.id, createdAt);
    }
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      createdAt,
      time: formatNotificationTime({ createdAt } as NotificationItem, now),
      read: item.read,
      link: item.link,
    };
  });
}

export const defaultNotificationsByRole: Record<UserRole, NotificationItem[]> = {
  get CREATOR() {
    return getDefaultNotifications("CREATOR");
  },
  get BACKER() {
    return getDefaultNotifications("BACKER");
  },
  get COLLABORATOR() {
    return getDefaultNotifications("COLLABORATOR");
  },
  get ADMIN() {
    return getDefaultNotifications("ADMIN");
  },
};

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "review":
      return <FileCheck2 className="size-4 text-amber-700" />;
    case "pledge":
      return <DollarSign className="size-4 text-emerald-700" />;
    case "comment":
      return <MessageSquare className="size-4 text-blue-700" />;
    case "fulfillment":
      return <Gift className="size-4 text-purple-700" />;
    case "task":
      return <Clock className="size-4 text-coral-dark" />;
    case "system":
    default:
      return <Sparkles className="size-4 text-forest" />;
  }
}

function getNotificationTypeBadge(type: NotificationItem["type"]) {
  switch (type) {
    case "review":
      return {
        label: "Thẩm định",
        className: "bg-amber-100 text-amber-900 border-amber-200",
      };
    case "pledge":
      return {
        label: "Ủng hộ",
        className: "bg-emerald-100 text-emerald-900 border-emerald-200",
      };
    case "comment":
      return {
        label: "Bình luận",
        className: "bg-blue-100 text-blue-900 border-blue-200",
      };
    case "fulfillment":
      return {
        label: "Cập nhật",
        className: "bg-purple-100 text-purple-900 border-purple-200",
      };
    case "task":
      return {
        label: "Nhiệm vụ",
        className: "bg-orange-100 text-orange-900 border-orange-200",
      };
    case "system":
    default:
      return {
        label: "Hệ thống",
        className: "bg-stone-100 text-stone-800 border-stone-200",
      };
  }
}

export function NotificationDropdown({
  role = "CREATOR",
  buttonClassName = "",
}: {
  role?: UserRole;
  buttonClassName?: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number>(() => Date.now());
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [sessionReadIds, setSessionReadIds] = useState<Set<string>>(() => new Set());

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const list = getDefaultNotifications(role);
    const stored = getStoredReadIds();
    return list.map((n) => (stored.has(n.id) ? { ...n, read: true } : n));
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsOpen(false);
    setSessionReadIds(new Set());
  };

  const handleOpen = () => {
    setNow(Date.now());
    setIsOpen(true);
    // When opening the dropdown, clear the unread indicator and mark unread items as seen
    const unreadItems = notifications.filter((n) => !n.read);
    if (unreadItems.length > 0) {
      const unreadIds = unreadItems.map((n) => n.id);
      storeAllReadIds(unreadIds);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setSessionReadIds(new Set(unreadIds));
      fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true, allIds: unreadIds }),
      }).catch(() => {});
    }
  };

  // Periodic ticker to recalculate relative timestamps live every 10 seconds while dropdown is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Close on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Fetch notifications from API on mount, role/open change, and periodic 60s background sync
  useEffect(() => {
    let ignore = false;
    async function loadNotifications() {
      try {
        const res = await fetch("/api/v1/notifications");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            const stored = getStoredReadIds();
            if (Array.isArray(data.readIds)) {
              for (const rId of data.readIds) {
                stored.add(rId);
                storeReadId(rId);
              }
            }

            const incomingNotifications: NotificationItem[] = Array.isArray(data.notifications)
              ? (data.notifications as NotificationItem[]).map((n: NotificationItem) => {
                  const storedTime =
                    typeof window !== "undefined"
                      ? getStoredTimestamps()[n.id]
                      : undefined;
                  const finalCreatedAt =
                    storedTime || n.createdAt || new Date().toISOString();
                  storeNotificationTimestamp(n.id, finalCreatedAt);
                  return {
                    ...n,
                    createdAt: finalCreatedAt,
                  };
                })
              : [];

            const realIds = new Set(incomingNotifications.map((n) => n.id));
            const fallbacks = getDefaultNotifications(role).filter((f) => !realIds.has(f.id));

            // Deduplicate items with identical type, title, and message
            const combined = [...incomingNotifications, ...fallbacks];
            const seenKeys = new Set<string>();
            const uniqueList: NotificationItem[] = [];

            for (const item of combined) {
              const dedupKey = `${item.type}:${item.title}:${item.message}`;
              if (!seenKeys.has(dedupKey) && !seenKeys.has(item.id)) {
                seenKeys.add(dedupKey);
                seenKeys.add(item.id);
                uniqueList.push(item);
              }
            }

            const merged = uniqueList.map((n) =>
              n.read || stored.has(n.id) ? { ...n, read: true } : n
            );
            setNotifications(merged);
          }
        }
      } catch {
        // Silently keep current notifications if offline
      }
    }
    loadNotifications();

    const syncInterval = setInterval(loadNotifications, 60000);
    return () => {
      ignore = true;
      clearInterval(syncInterval);
    };
  }, [role, isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    const allIds = notifications.map((n) => n.id);
    storeAllReadIds(allIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setSessionReadIds((prev) => new Set([...prev, ...allIds]));
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true, allIds }),
      });
    } catch {
      // Ignore
    }
  };

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    storeReadId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setSessionReadIds((prev) => new Set([...prev, id]));
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Ignore
    }
  };

  // Direct 1-click action: Mark as read and navigate immediately to the destination
  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    handleClose();
    if (item.link) {
      router.push(item.link);
    }
  };

  // In unread tab, keep items that were read during the active session visible with subtle "Vừa đọc" badge
  const displayedList =
    filter === "unread"
      ? notifications.filter((n) => !n.read || sessionReadIds.has(n.id))
      : notifications;

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            handleOpen();
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Thông báo"
        className={`relative grid size-11 place-items-center rounded-[10px] border transition-colors ${buttonClassName}`}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
            <span className="relative inline-flex size-2 rounded-full border border-white bg-coral" />
          </span>
        ) : null}
      </button>

      {/* Dropdown Popover */}
      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 sm:w-96 overflow-hidden rounded-[20px] border border-line bg-white text-ink shadow-[0_20px_50px_rgba(0,0,0,0.18)] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-[#f8faf6] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-extrabold text-forest">
                Thông báo
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-extrabold text-coral-dark">
                  {unreadCount} mới
                </span>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-forest transition-colors"
              >
                <CheckCheck className="size-3.5" /> Đánh dấu đã đọc
              </button>
            ) : null}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-line bg-white px-3 pt-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSessionReadIds(new Set());
              }}
              className={`border-b-2 px-3 py-2 transition-colors ${
                filter === "all"
                  ? "border-forest font-bold text-forest"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("unread");
                setSessionReadIds(new Set());
              }}
              className={`border-b-2 px-3 py-2 transition-colors ${
                filter === "unread"
                  ? "border-forest font-bold text-forest"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-88 overflow-y-auto divide-y divide-line/60">
            {displayedList.length > 0 ? (
              displayedList.map((item) => {
                const isUnread = !item.read;
                const isJustRead = sessionReadIds.has(item.id);
                const badge = getNotificationTypeBadge(item.type);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleItemClick(item);
                      }
                    }}
                    className={`group relative flex cursor-pointer items-start gap-3 p-3.5 text-left transition-all hover:bg-[#f5f8f2] ${
                      isUnread
                        ? "bg-[#fafcf7]"
                        : isJustRead
                          ? "bg-emerald-50/20"
                          : "bg-white opacity-85 hover:opacity-100"
                    }`}
                  >
                    {/* Icon container */}
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-black/5">
                      {getNotificationIcon(item.type)}
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-1.5 py-0.2 text-[9px] font-bold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <p
                            className={`text-xs leading-snug line-clamp-1 ${
                              isUnread
                                ? "font-bold text-ink"
                                : "font-semibold text-ink-soft"
                            }`}
                          >
                            {item.title}
                          </p>
                        </div>

                        {/* Unread dot or Just read badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isJustRead ? (
                            <span className="rounded-full bg-emerald-100/90 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
                              ✓ Vừa đọc
                            </span>
                          ) : isUnread ? (
                            <span
                              className="size-2 rounded-full bg-forest mt-0.5"
                              title="Chưa đọc"
                            />
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-1 text-[11px] leading-4 text-ink-muted line-clamp-2">
                        {item.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-muted/80">
                        <span
                          className="flex items-center gap-1 font-medium transition-colors hover:text-ink cursor-default"
                          title={formatFullNotificationDate(item)}
                        >
                          <Clock className="size-2.5" />
                          {formatNotificationTime(item, now)}
                        </span>

                        {/* Quick action: Mark as read without navigating */}
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={(e) => markAsRead(item.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold text-forest hover:text-forest-dark hover:underline"
                            title="Đánh dấu đã đọc"
                          >
                            <Check className="size-3" />
                            Đánh dấu đã đọc
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-ink-muted">
                <CheckCircle2 className="mx-auto size-7 text-emerald-600 mb-2 opacity-80" />
                <p className="font-semibold text-ink">Không có thông báo nào</p>
                <p className="mt-0.5 text-[11px]">
                  {filter === "unread"
                    ? "Bạn đã đọc hết tất cả thông báo."
                    : "Hiện chưa có thông báo mới."}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line bg-[#f8faf6] px-4 py-2.5 text-[11px]">
            <Link
              href="/account?tab=notifications"
              onClick={handleClose}
              className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-forest transition-colors"
            >
              <Settings className="size-3.5" /> Cài đặt thông báo
            </Link>
            <Link
              href="/account?tab=notifications"
              onClick={handleClose}
              className="font-bold text-forest hover:text-coral-dark transition-colors"
            >
              Quản lý tất cả →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
