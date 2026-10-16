"use client";

import { Bell, Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { SessionResult } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";

export function NotifyButton({
  campaignId,
  fullWidth = false,
}: {
  campaignId: string;
  fullWidth?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, establishSession } = useAuth();
  const [subscribed, setSubscribed] = useState(() =>
    session
      ? (getEffectivePreviewState(session).notifiedCampaignIds ?? []).includes(
          campaignId,
        )
      : false,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const toggleSubscription = async () => {
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
          action: "SET_PRELAUNCH_NOTIFICATION",
          payload: { campaignId, enabled: !subscribed },
        }),
        },
      );
      if (result.session) establishSession(result.session);
      setSubscribed((value) => !value);
      setNotice(
        subscribed
          ? "Đã tắt nhắc nhở cho dự án này."
          : "Góp sẽ nhắc bạn khi dự án bắt đầu nhận ủng hộ.",
      );
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể lưu thay đổi. Bạn thử lại sau nhé."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex flex-col items-start gap-2 ${fullWidth ? "w-full" : ""}`}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggleSubscription()}
        className={`${subscribed ? "button-dark" : "button-primary"} ${fullWidth ? "w-full" : ""}`}
        aria-pressed={subscribed}
      >
        {subscribed ? (
          <Check className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {busy
          ? "Đang lưu…"
          : subscribed
            ? "Đã đăng ký nhắc"
            : "Nhắc tôi khi mở"}
      </button>
      {notice ? (
        <p
          role={notice.startsWith("Chưa") ? "alert" : "status"}
          className={`max-w-xs text-[11px] leading-5 ${notice.startsWith("Chưa") ? "text-red-700" : "text-ink-muted"}`}
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
