"use client";

import { useEffect } from "react";

export function ProjectViewTracker({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    // Log view event once per page visit
    try {
      fetch("/api/v1/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          eventType: "VIEW",
          source: typeof document !== "undefined" && document.referrer ? "referrer" : "direct",
        }),
      }).catch(() => null);
    } catch {}
  }, [campaignId]);

  return null;
}
