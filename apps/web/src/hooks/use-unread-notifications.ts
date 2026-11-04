"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clientRequest } from "@/lib/api/client-request";

export const notificationsUpdatedEvent = "gop:notifications-updated";

export function useUnreadNotifications(userId?: string, enabled = false) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId || !enabled) return;
    let active = true;
    const load = async () => {
      try {
        const result = await clientRequest<{ data: { unreadCount: number } }>("/api/v1/notifications");
        if (active) setCount(Math.max(0, result.data.unreadCount));
      } catch {
        if (active) setCount(0);
      }
    };
    void load();
    window.addEventListener(notificationsUpdatedEvent, load);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener(notificationsUpdatedEvent, load);
      window.removeEventListener("focus", load);
    };
  }, [userId, enabled, pathname]);

  return enabled ? count : 0;
}
