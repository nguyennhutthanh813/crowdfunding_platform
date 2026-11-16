"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  HandHeart,
  LoaderCircle,
  Pause,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { SessionResult, UserRole } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { previewAccounts } from "@/lib/auth/preview-accounts";
import { roleDestinations } from "@/lib/auth/roles";
import { triggerParticleBurst } from "@/lib/ui/particle-burst";

export interface RolePreset {
  role: UserRole;
  shortLabel: string;
  fullLabel: string;
  personLabel: string;
  email: string;
  password: string;
  summary: string;
  icon: LucideIcon;
  toneClass: string;
  activeClass: string;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    role: "BACKER",
    shortLabel: "Ủng hộ",
    fullLabel: "Người ủng hộ",
    personLabel: "Minh Anh",
    email: "minhanh@example.com",
    password: previewAccounts.find((a) => a.activeRole === "BACKER")?.password ?? "gop12345",
    summary: "Khám phá dự án, góp vốn All-or-Nothing và theo dõi giao quà 4 chặng.",
    icon: HandHeart,
    toneClass: "text-emerald-700 bg-emerald-50",
    activeClass: "bg-[#047857] text-white shadow-xs",
  },
  {
    role: "CREATOR",
    shortLabel: "Chủ dự án",
    fullLabel: "Chủ dự án",
    personLabel: "Hoàng Linh",
    email: "linh@orbit.vn",
    password: previewAccounts.find((a) => a.activeRole === "CREATOR")?.password ?? "gop12345",
    summary: "Khởi tạo chiến dịch 6 bước, chạy AI Tối ưu tham số và giao việc nhóm.",
    icon: Rocket,
    toneClass: "text-amber-700 bg-amber-50",
    activeClass: "bg-[#047857] text-white shadow-xs",
  },
  {
    role: "COLLABORATOR",
    shortLabel: "Cộng tác",
    fullLabel: "Cộng tác viên",
    personLabel: "Gia Huy",
    email: "giahuy@orbit.vn",
    password: previewAccounts.find((a) => a.activeRole === "COLLABORATOR")?.password ?? "gop12345",
    summary: "Cập nhật bảng việc Kanban 3 cột, đăng tiến độ và trả lời bình luận.",
    icon: ClipboardCheck,
    toneClass: "text-sky-700 bg-sky-50",
    activeClass: "bg-[#047857] text-white shadow-xs",
  },
  {
    role: "ADMIN",
    shortLabel: "Quản trị",
    fullLabel: "Quản trị viên",
    personLabel: "Khánh An",
    email: "quantri@gop.vn",
    password: previewAccounts.find((a) => a.activeRole === "ADMIN")?.password ?? "gop12345",
    summary: "Duyệt hồ sơ chờ, quét cảnh báo Isolation Forest & chạy Time Travel chốt sổ.",
    icon: ShieldCheck,
    toneClass: "text-rose-700 bg-rose-50",
    activeClass: "bg-[#E11D48] text-white shadow-xs",
  },
];

export function useQuickRoleSwitch() {
  const { session, establishSession } = useAuth();
  const [busyRole, setBusyRole] = useState<UserRole | null>(null);
  const [error, setError] = useState("");

  const switchToRole = useCallback(
    async (
      targetRole: UserRole,
      coords?: { x?: number; y?: number },
      destinationOverride?: string,
      onAfterSwitch?: () => void,
    ) => {
      if (busyRole) return;
      const preset = ROLE_PRESETS.find((item) => item.role === targetRole);
      if (!preset) return;
      setBusyRole(preset.role);
      setError("");
      try {
        const nextSession = await clientRequest<SessionResult>("/api/v1/auth/session", {
          method: "POST",
          body: JSON.stringify({
            mode: "SIGN_IN",
            email: preset.email,
            password: preset.password,
            remember: true,
          }),
        });
        establishSession(nextSession);
        triggerParticleBurst(coords);
        onAfterSwitch?.();
        const targetUrl = destinationOverride ?? roleDestinations[preset.role];
        window.setTimeout(() => {
          window.location.assign(targetUrl);
        }, 200);
      } catch (err) {
        setError(clientRequestMessage(err, "Chưa thể chuyển vai trò lúc này."));
        setBusyRole(null);
      }
    },
    [busyRole, establishSession],
  );

  const resolvedRole: UserRole | undefined =
    session?.user.id === "usr_gia_huy"
      ? "COLLABORATOR"
      : session?.user.activeRole;

  return { resolvedRole, busyRole, error, switchToRole };
}

export function HeaderRoleSwitchPopover({
  currentRole,
  className = "",
}: {
  currentRole?: UserRole;
  className?: string;
}) {
  const { resolvedRole, busyRole, error, switchToRole } = useQuickRoleSwitch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRole = currentRole ?? resolvedRole;
  const activePreset = ROLE_PRESETS.find((item) => item.role === activeRole);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-line-strong bg-surface px-3 text-xs font-bold text-ink transition hover:border-[#059669]/50 hover:bg-canvas-soft"
      >
        <Sparkles className="size-3.5 text-[#7C3AED]" />
        <span>
          {activePreset ? `Vai: ${activePreset.shortLabel}` : "Đổi vai trò"}
        </span>
        <ChevronDown
          className={`size-3.5 text-ink-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Chọn nhanh vai trò trải nghiệm"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-line bg-surface p-2 text-ink shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
        >
          <div className="border-b border-line px-2.5 pb-2 pt-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C3AED]">
              ✦ Chuyển vai trò 1 chạm
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Mở ngay đúng không gian làm việc &amp; dữ liệu riêng
            </p>
          </div>
          <div className="mt-1.5 space-y-1">
            {ROLE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isCurrent = activeRole === preset.role;
              const isLoading = busyRole === preset.role;
              return (
                <button
                  key={preset.role}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  disabled={Boolean(busyRole)}
                  onClick={(event) =>
                    void switchToRole(
                      preset.role,
                      { x: event.clientX, y: event.clientY },
                      undefined,
                      () => setOpen(false),
                    )
                  }
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    isCurrent
                      ? "bg-[#ECFDF5] text-[#047857] ring-1 ring-[#047857]/25"
                      : "hover:bg-canvas-soft"
                  } disabled:cursor-wait disabled:opacity-60`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${preset.toneClass}`}
                  >
                    {isLoading ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-extrabold text-ink">
                        {preset.fullLabel}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-md bg-[#047857] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Đang xem
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[11px] text-ink-muted">
                      {preset.personLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {error ? (
            <p role="alert" className="px-2.5 pt-2 text-[11px] font-semibold text-rose-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function QuickRoleDock({
  compact = false,
  currentRole,
  className = "",
  onAfterSwitch,
}: {
  compact?: boolean;
  currentRole?: UserRole;
  className?: string;
  onAfterSwitch?: () => void;
}) {
  const { resolvedRole, busyRole, error, switchToRole } = useQuickRoleSwitch();
  const activeRole = currentRole ?? resolvedRole;

  function onClickPreset(preset: RolePreset, event: MouseEvent<HTMLButtonElement>) {
    void switchToRole(
      preset.role,
      { x: event.clientX, y: event.clientY },
      undefined,
      onAfterSwitch,
    );
  }

  if (compact) {
    return (
      <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
        <div
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1"
          role="group"
          aria-label="Chuyển nhanh vai trò trải nghiệm"
        >
          {ROLE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isCurrent = activeRole === preset.role;
            const isLoading = busyRole === preset.role;
            return (
              <button
                key={preset.role}
                type="button"
                disabled={Boolean(busyRole)}
                aria-pressed={isCurrent}
                onClick={(event) => onClickPreset(preset, event)}
                title={`Vào vai ${preset.fullLabel} (${preset.personLabel})`}
                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[11px] font-bold transition ${
                  isCurrent
                    ? preset.activeClass
                    : "text-slate-600 hover:bg-white hover:text-ink"
                } disabled:cursor-wait disabled:opacity-70`}
              >
                {isLoading ? (
                  <LoaderCircle className="size-3 animate-spin" />
                ) : (
                  <Icon className="size-3" />
                )}
                <span>{preset.shortLabel}</span>
              </button>
            );
          })}
        </div>
        {error ? (
          <p role="alert" className="text-[11px] font-semibold text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        role="group"
        aria-label="Chọn vai trò trải nghiệm 1 chạm"
      >
        {ROLE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isCurrent = activeRole === preset.role;
          const isLoading = busyRole === preset.role;
          return (
            <button
              key={preset.role}
              type="button"
              disabled={Boolean(busyRole)}
              aria-pressed={isCurrent}
              onClick={(event) => onClickPreset(preset, event)}
              className={`group flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 ${
                isCurrent
                  ? "border-[#047857] bg-[#ECFDF5] shadow-sm ring-2 ring-[#047857]/15"
                  : "border-slate-200 bg-white hover:border-[#059669]/45 hover:shadow-sm"
              } disabled:cursor-wait disabled:opacity-70`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${preset.toneClass}`}
              >
                {isLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold text-ink">
                  {preset.fullLabel}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                  {preset.personLabel} · Bấm vào ngay
                </span>
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-[#047857]" />
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface MissionStep {
  title: string;
  detail: string;
  href: string;
  cta: string;
}

const ROLE_MISSIONS: Record<
  UserRole,
  {
    badge: string;
    summary: string;
    primaryHref: string;
    primaryLabel: string;
    steps: MissionStep[];
  }
> = {
  BACKER: {
    badge: "Lộ trình Người ủng hộ",
    summary: "Chọn dự án → Góp theo cơ chế All-or-Nothing → Theo dõi tiến độ giao quà 4 bước.",
    primaryHref: "/discover",
    primaryLabel: "Khám phá dự án",
    steps: [
      {
        title: "1. Khám phá & Lưu dự án",
        detail: "Xem các dự án được gợi ý theo sở thích hoặc lọc theo mức tiến độ.",
        href: "/discover",
        cta: "Mở trang Khám phá",
      },
      {
        title: "2. Ủng hộ an toàn",
        detail: "Chỉ ủy quyền thẻ; không trừ tiền thật nếu chiến dịch không đạt 100% mục tiêu.",
        href: "/pledge/orbit-one-ca-phe-thong-minh",
        cta: "Thử luồng Ủng hộ",
      },
      {
        title: "3. Theo dõi giao quà",
        detail: "Xem biên nhận, trạng thái trừ tiền và hành trình 4 chặng giao quà tại đây.",
        href: "/dashboard?tab=backed",
        cta: "Xem cam kết",
      },
    ],
  },
  CREATOR: {
    badge: "Lộ trình Chủ dự án",
    summary: "Soạn 6 bước Studio → Chạy AI Tối ưu điểm → Vận hành cộng đồng & giao quà.",
    primaryHref: "/creator/campaigns/new",
    primaryLabel: "+ Tạo chiến dịch",
    steps: [
      {
        title: "1. Khởi tạo chiến dịch 6 bước",
        detail: "Có sẵn nút Điền mẫu Bếp Mây, tự động lưu sau 3s và gợi ý AI cho phần Rủi ro.",
        href: "/creator/campaigns/new",
        cta: "Mở Studio 6 bước",
      },
      {
        title: "2. ✦ AI Insights & Tối ưu",
        detail: "Chạy thuật toán tự động quét tham số tối đa hóa xác suất gọi vốn thành công.",
        href: "/creator/ai",
        cta: "Mở AI Studio",
      },
      {
        title: "3. Vận hành & Phối hợp CTV",
        detail: "Giao đầu việc cho Cộng tác viên, cập nhật tiến độ và chốt đơn giao quà.",
        href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage",
        cta: "Quản lý ORBIT One",
      },
    ],
  },
  COLLABORATOR: {
    badge: "Lộ trình Cộng tác viên",
    summary: "Xem bảng Kanban việc được giao → Đăng cập nhật tiến độ → Trả lời câu hỏi cộng đồng.",
    primaryHref: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
    primaryLabel: "Mở bàn Cộng đồng",
    steps: [
      {
        title: "1. Kéo thả trạng thái Kanban",
        detail: "Chuyển đầu việc từ Cần làm sang Đang xử lý và Đã xong để Chủ dự án thấy ngay.",
        href: "/collaborator#viec-hom-nay",
        cta: "Xem Bảng tiến độ",
      },
      {
        title: "2. Phản hồi cộng đồng",
        detail: "Đăng bản tin tiến độ kỹ thuật và giải đáp thắc mắc cho người ủng hộ.",
        href: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
        cta: "Vào mục Cộng đồng",
      },
      {
        title: "3. Xem dự báo được chia sẻ",
        detail: "Theo dõi các chỉ số AI của chiến dịch trong phạm vi quyền được cấp.",
        href: "/collaborator/forecast",
        cta: "Xem dự báo AI",
      },
    ],
  },
  ADMIN: {
    badge: "Lộ trình Quản trị sàn",
    summary: "Duyệt hồ sơ chờ → Kiểm tra cảnh báo rủi ro bằng Drawer → Giả lập chốt sổ Settlement.",
    primaryHref: "/admin?tab=reviews",
    primaryLabel: "Mở Hàng chờ duyệt",
    steps: [
      {
        title: "1. Xét duyệt chiến dịch",
        detail: "Mở hồ sơ, kiểm tra minh bạch câu chuyện & rủi ro trước khi phê duyệt mở bán.",
        href: "/admin?tab=reviews",
        cta: "Xem hồ sơ chờ",
      },
      {
        title: "2. Quét tín hiệu gian lận",
        detail: "Bấm từng dòng cảnh báo để mở Drawer phân tích Isolation Forest & quy tắc R1–R5.",
        href: "/admin?tab=fraud",
        cta: "Mở Rủi ro giao dịch",
      },
      {
        title: "3. Cấu hình & Settlement",
        detail: "Kiểm tra nhật ký quyết định và chạy thử chốt sổ tự động All-or-Nothing.",
        href: "/admin?tab=settings",
        cta: "Mở Phí & Nhật ký",
      },
    ],
  },
};

const ROLE_FLOW_SEQUENCE: Array<{
  role: UserRole;
  step: string;
  actionTag: string;
}> = [
  { role: "CREATOR", step: "①", actionTag: "Tạo & gọi vốn" },
  { role: "ADMIN", step: "②", actionTag: "Duyệt & chống rủi ro" },
  { role: "COLLABORATOR", step: "③", actionTag: "Kanban & cộng đồng" },
  { role: "BACKER", step: "④", actionTag: "Ủng hộ & nhận quà" },
];

export function RoleMissionBar({ role }: { role: UserRole }) {
  const { busyRole, switchToRole } = useQuickRoleSwitch();
  const [expanded, setExpanded] = useState(false);
  const [flowPlaying, setFlowPlaying] = useState(false);
  const [flowIndex, setFlowIndex] = useState(() =>
    Math.max(0, ROLE_FLOW_SEQUENCE.findIndex((item) => item.role === role)),
  );
  const config = ROLE_MISSIONS[role];

  useEffect(() => {
    if (!flowPlaying) return;
    const timer = window.setInterval(() => {
      setFlowIndex((prev) => {
        const next = prev + 1;
        if (next >= ROLE_FLOW_SEQUENCE.length) {
          setFlowPlaying(false);
          triggerParticleBurst();
          return 0;
        }
        return next;
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, [flowPlaying]);

  const highlightedFlow = flowPlaying
    ? ROLE_FLOW_SEQUENCE[flowIndex] ?? ROLE_FLOW_SEQUENCE[0]
    : ROLE_FLOW_SEQUENCE.find((item) => item.role === role) ?? ROLE_FLOW_SEQUENCE[0];
  const highlightedPreset =
    ROLE_PRESETS.find((preset) => preset.role === highlightedFlow.role) ?? ROLE_PRESETS[0];

  return (
    <section
      aria-label={config.badge}
      className="mb-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-1 font-bold text-[#7C3AED]">
            <Sparkles className="size-3.5" /> {config.badge}
          </span>
          <p className="hidden min-w-0 flex-1 truncate font-medium text-ink-soft md:block">
            {config.summary}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              if (!flowPlaying) {
                setFlowIndex(0);
                triggerParticleBurst({ x: event.clientX, y: event.clientY });
              }
              setFlowPlaying((current) => !current);
            }}
            className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              flowPlaying
                ? "border-[#7C3AED] bg-[#7C3AED] text-white shadow-xs"
                : "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9] hover:border-[#7C3AED]"
            }`}
          >
            {flowPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            <span>{flowPlaying ? "Dừng dẫn luồng" : "Chạy Tự Động 4 Vai Trò"}</span>
          </button>
          <Link
            href={config.primaryHref}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#047857] px-3 text-xs font-bold text-white transition hover:bg-[#065F46]"
          >
            {config.primaryLabel} <ArrowRight className="size-3.5" />
          </Link>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl border border-line bg-canvas-soft px-3 text-xs font-bold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <span>{expanded ? "Thu gọn" : "3 bước nhanh"}</span>
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {flowPlaying || expanded ? (
        <div className="border-t border-line bg-canvas-soft/65 px-4 py-2.5 sm:px-5">
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
            role="group"
            aria-label="Sơ đồ cây 4 vai trò liên kết"
          >
            {ROLE_FLOW_SEQUENCE.map((flowNode, idx) => {
              const preset =
                ROLE_PRESETS.find((item) => item.role === flowNode.role) ?? ROLE_PRESETS[0];
              const Icon = preset.icon;
              const isCurrent = role === flowNode.role;
              const isTourHighlight = flowPlaying && highlightedFlow.role === flowNode.role;
              const isLoading = busyRole === flowNode.role;
              return (
                <div key={flowNode.role} className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={Boolean(busyRole)}
                    onClick={(event) => {
                      void switchToRole(flowNode.role, {
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                    title={`Chuyển sang vai ${preset.fullLabel} (${preset.personLabel})`}
                    className={`group flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                      isTourHighlight
                        ? "scale-[1.03] border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6] ring-2 ring-[#7C3AED]/25 shadow-xs"
                        : isCurrent
                          ? "border-[#047857] bg-[#ECFDF5] text-[#064E3B] ring-1 ring-[#047857]/25 shadow-2xs"
                          : "border-line bg-surface text-ink-soft hover:border-[#059669]/50 hover:text-ink"
                    } disabled:cursor-wait disabled:opacity-70`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-extrabold ${
                        isTourHighlight
                          ? "bg-[#7C3AED] text-white"
                          : isCurrent
                            ? "bg-[#047857] text-white"
                            : preset.toneClass
                      }`}
                    >
                      {isLoading ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : (
                        <Icon className="size-3" />
                      )}
                    </span>
                    <span className="leading-tight">
                      <span className="block whitespace-nowrap text-[11px] font-extrabold">
                        {flowNode.step} {preset.shortLabel}
                      </span>
                      <span className="block whitespace-nowrap text-[10px] text-ink-muted">
                        {flowNode.actionTag}
                      </span>
                    </span>
                  </button>
                  {idx < ROLE_FLOW_SEQUENCE.length - 1 ? (
                    <ArrowRight
                      className={`size-3.5 shrink-0 ${
                        flowPlaying && idx === flowIndex
                          ? "animate-pulse text-[#7C3AED]"
                          : "text-ink-muted"
                      }`}
                    />
                  ) : null}
                </div>
              );
            })}
            <span className="ml-auto hidden pl-2 text-[11px] font-semibold text-ink-soft xl:inline-flex xl:items-center xl:gap-1.5">
              <span
                className={`size-2 rounded-full ${
                  flowPlaying ? "animate-ping bg-[#7C3AED]" : "bg-[#059669]"
                }`}
              />
              {highlightedPreset.personLabel}: {highlightedPreset.summary}
            </span>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="grid gap-3 border-t border-line bg-canvas-soft/45 p-4 sm:grid-cols-3">
          {config.steps.map((step) => (
            <Link
              key={step.title}
              href={step.href}
              className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-3.5 transition hover:border-[#059669]/50 hover:shadow-xs"
            >
              <div>
                <p className="text-xs font-extrabold text-ink">{step.title}</p>
                <p className="mt-1.5 text-[11px] leading-5 text-ink-soft">
                  {step.detail}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#047857]">
                {step.cta}
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function FloatingRoleCommandDock() {
  const { resolvedRole, busyRole, error, switchToRole } = useQuickRoleSwitch();
  const [open, setOpen] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  useEffect(() => {
    if (!tourRunning) return;
    const timer = window.setInterval(() => {
      setTourIndex((prev) => {
        const next = prev + 1;
        if (next >= ROLE_PRESETS.length) {
          setTourRunning(false);
          triggerParticleBurst();
          return 0;
        }
        return next;
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [tourRunning]);

  const activePreset =
    ROLE_PRESETS.find((p) => p.role === resolvedRole) ?? ROLE_PRESETS[0];
  const showcasedPreset = tourRunning
    ? ROLE_PRESETS[tourIndex] ?? ROLE_PRESETS[0]
    : activePreset;
  const mission = ROLE_MISSIONS[activePreset.role];

  return (
    <div className="fixed bottom-16 right-4 z-50 flex flex-col items-end gap-2 md:bottom-5 md:right-5">
      {open ? (
        <div
          role="dialog"
          aria-label="Bảng điều khiển chuyển vai trò nhanh"
          className="w-[min(calc(100vw-2rem),390px)] rounded-2xl border border-slate-200 bg-surface p-4 shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#7C3AED]">
                <Sparkles className="size-3.5" /> Trung tâm điều hướng 4 vai trò
              </p>
              <p className="mt-1 text-xs font-bold text-ink">
                Đang xem: {resolvedRole ? `${activePreset.fullLabel} (${activePreset.personLabel})` : "Khách tham quan"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTourRunning(false);
                setOpen(false);
              }}
              aria-label="Đóng bảng chuyển vai trò"
              className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-ink-muted hover:bg-slate-100 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {ROLE_PRESETS.map((preset, idx) => {
              const Icon = preset.icon;
              const isCurrent = resolvedRole === preset.role;
              const isSpotlight = tourRunning && tourIndex === idx;
              const isLoading = busyRole === preset.role;
              return (
                <button
                  key={preset.role}
                  type="button"
                  disabled={Boolean(busyRole)}
                  onClick={(event) => {
                    setTourRunning(false);
                    void switchToRole(
                      preset.role,
                      { x: event.clientX, y: event.clientY },
                      undefined,
                      () => setOpen(false),
                    );
                  }}
                  className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                    isCurrent
                      ? "border-[#047857] bg-[#ECFDF5] ring-2 ring-[#047857]/15"
                      : isSpotlight
                        ? "border-[#7C3AED] bg-[#F5F3FF] ring-2 ring-[#7C3AED]/20"
                        : "border-slate-200 bg-canvas-soft/50 hover:border-[#059669]/45 hover:bg-white"
                  }`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${preset.toneClass}`}>
                    {isLoading ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-ink">
                      {preset.shortLabel}
                    </span>
                    <span className="block truncate text-[10px] text-ink-muted">
                      {preset.personLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-canvas-soft p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-ink">
                {tourRunning ? `✦ Đang giới thiệu: ${showcasedPreset.fullLabel}` : mission.badge}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  const nextState = !tourRunning;
                  setTourRunning(nextState);
                  setTourIndex(0);
                  if (nextState) {
                    triggerParticleBurst({ x: event.clientX, y: event.clientY, count: 24 });
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#7C3AED] px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-[#6D28D9]"
              >
                {tourRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
                {tourRunning ? "Dừng tour" : "Tour tự động"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-ink-soft">
              {showcasedPreset.summary}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {mission.steps.map((step) => (
                <Link
                  key={step.href}
                  href={step.href}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-surface px-2.5 py-1 text-[10px] font-bold text-[#047857] hover:border-[#047857]"
                >
                  {step.cta} <ArrowRight className="size-2.5" />
                </Link>
              ))}
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#059669]/35 bg-[#0F172A] px-4 text-xs font-extrabold text-white shadow-[0_12px_32px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1E293B]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-[#059669] text-white">
          <Sparkles className="size-3.5 animate-pulse" />
        </span>
        <span>
          {resolvedRole ? `${activePreset.shortLabel} · Đổi vai trò` : "Chọn vai trò 1 chạm"}
        </span>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
      </button>
    </div>
  );
}
