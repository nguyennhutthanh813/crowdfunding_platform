"use client";

import { Check, Heart, Share2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { SessionResult } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";

export function ProjectActions({ campaignId }: { campaignId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, establishSession } = useAuth();
  const [saved, setSaved] = useState(() =>
    session
      ? (getEffectivePreviewState(session).savedCampaignIds ?? []).includes(
          campaignId,
        )
      : false,
  );
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const share = async () => {
    try {
      fetch("/api/v1/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          eventType: "VIEW",
          source: "share_action",
          metadata: { shared: true },
        }),
      }).catch(() => null);

      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Chưa thể chia sẻ liên kết trên thiết bị này.");
    }
  };


  const toggleSaved = async () => {
    if (!session) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await clientRequest<{ session?: SessionResult }>(
        "/api/v1/me/dashboard",
        {
        method: "POST",
        body: JSON.stringify({
          action: "SAVE_PROJECT",
          payload: { campaignId, saved: !saved },
        }),
        },
      );
      if (result.session) establishSession(result.session);
      setSaved((value) => !value);
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể lưu dự án. Bạn thử lại sau nhé."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleSaved()}
          aria-pressed={saved}
          className={`button-secondary ${saved ? "border-coral/35 bg-[#fff1eb] text-coral-dark" : ""}`}
        >
          {saved ? <Check className="size-4" /> : <Heart className="size-4" />}{" "}
          {busy ? "Đang lưu…" : saved ? "Đã lưu" : "Lưu dự án"}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="button-secondary"
        >
          <Share2 className="size-4" /> {copied ? "Đã chép link" : "Chia sẻ"}
        </button>
      </div>
      <p className="mt-2 text-right text-[10px] text-red-600" role="status">
        {notice}
      </p>
    </div>
  );
}
