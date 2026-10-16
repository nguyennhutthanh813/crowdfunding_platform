"use client";

import {
  BookOpen,
  Check,
  ChevronRight,
  Cpu,
  Gamepad2,
  Headphones,
  Leaf,
  LoaderCircle,
  Palette,
  Soup,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { SessionResult } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

const interests = [
  {
    id: "technology",
    label: "Công nghệ",
    detail: "Thiết bị, phần mềm và sản phẩm thông minh",
    icon: Cpu,
  },
  {
    id: "design",
    label: "Thiết kế",
    detail: "Sản phẩm, nội thất và thủ công",
    icon: Palette,
  },
  {
    id: "green-living",
    label: "Đời sống xanh",
    detail: "Giải pháp bền vững cho sinh hoạt hằng ngày",
    icon: Leaf,
  },
  {
    id: "games",
    label: "Trò chơi",
    detail: "Board game và trải nghiệm tương tác",
    icon: Gamepad2,
  },
  {
    id: "music",
    label: "Âm nhạc",
    detail: "Album, biểu diễn và dự án độc lập",
    icon: Headphones,
  },
  {
    id: "publishing",
    label: "Xuất bản",
    detail: "Sách, truyện tranh và nội dung giáo dục",
    icon: BookOpen,
  },
  {
    id: "food",
    label: "Ẩm thực",
    detail: "Sản phẩm địa phương và trải nghiệm ăn uống",
    icon: Soup,
  },
] as const;

function safeDestination(nextPath?: string) {
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) return nextPath;
  return "/dashboard";
}

export function InterestPreferences({
  onboarding = false,
  nextPath,
}: {
  onboarding?: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const { session, establishSession } = useAuth();
  const [selected, setSelected] = useState<string[]>(
    onboarding
      ? []
      : (session?.previewState?.interests ?? [
          "technology",
          "design",
          "green-living",
        ]),
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const canSave = selected.length >= 2;

  const toggle = (id: string) => {
    setNotice("");
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await clientRequest<{ session?: SessionResult }>(
        "/api/v1/me/dashboard",
        {
        method: "POST",
        body: JSON.stringify({
          action: "UPDATE_INTERESTS",
          payload: {
            interests: selected,
            labels: interests
              .filter((item) => selected.includes(item.id))
              .map((item) => item.label),
          },
        }),
        },
      );
      if (result.session) establishSession(result.session);
      setNotice("Đã lưu lĩnh vực bạn quan tâm.");
      if (onboarding) router.replace(safeDestination(nextPath));
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể lưu sở thích. Bạn thử lại sau nhé."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {!onboarding ? (
        <>
          <p className="eyebrow text-coral">Gợi ý dành cho bạn</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold">
            Lĩnh vực bạn muốn theo dõi
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            Góp kết hợp lựa chọn này với những dự án bạn đã xem, lưu và ủng hộ
            để sắp xếp danh sách phù hợp hơn.
          </p>
        </>
      ) : null}

      <div
        className={`grid gap-3 ${onboarding ? "sm:grid-cols-2" : "mt-7 sm:grid-cols-2"}`}
      >
        {interests.map((interest) => {
          const Icon = interest.icon;
          const active = selected.includes(interest.id);
          return (
            <button
              key={interest.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(interest.id)}
              className={`group flex min-h-24 cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 ${active ? "border-forest/30 bg-[#f1f5e6]" : "border-line bg-white hover:border-forest/20"}`}
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl ${active ? "bg-forest text-lime" : "bg-[#f0f1eb] text-ink-soft"}`}
              >
                {active ? (
                  <Check className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold">
                  {interest.label}
                </span>
                <span className="mt-1 block text-[11px] leading-5 text-ink-muted">
                  {interest.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={() => void save()}
          className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : onboarding ? (
            <ChevronRight className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
          {saving
            ? "Đang lưu…"
            : onboarding
              ? "Lưu và vào Góp"
              : "Lưu sở thích"}
        </button>
        <p
          className={`text-xs ${notice.startsWith("Chưa") ? "text-red-600" : "text-ink-muted"}`}
          role={notice.startsWith("Chưa") ? "alert" : "status"}
        >
          {notice || `Đã chọn ${selected.length} · cần ít nhất 2 lĩnh vực`}
        </p>
      </div>
    </div>
  );
}
