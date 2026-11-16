"use client";

import {
  ArrowRight,
  Compass,
  FolderKanban,
  Home,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { CampaignCardData, UserRole } from "@/lib/api/contracts";
import { roleLabels } from "@/lib/auth/roles";
import { formatVnd, fundingPercent } from "@/lib/format";

type CommandAction = {
  id: string;
  group: "CAMPAIGN" | "NAVIGATION" | "ROLE";
  title: string;
  subtitle: string;
  href?: string;
  role?: UserRole;
  badge?: string;
  isAi?: boolean;
};

function normalizeVi(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi");
}

export function CommandPaletteTrigger({
  className = "",
  compact = false,
  label = "Tìm nhanh",
}: {
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const { session, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ensureLoaded = () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    fetch("/api/v1/campaigns", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((items: unknown) => {
        if (Array.isArray(items)) {
          setCampaigns(items as CampaignCardData[]);
        }
      })
      .catch(() => {
        loadedRef.current = false;
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => {
          const next = !current;
          if (next) ensureLoaded();
          return next;
        });
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const allItems = useMemo<CommandAction[]>(() => {
    const navItems: CommandAction[] = [
      {
        id: "nav-home",
        group: "NAVIGATION",
        title: "Trang chủ FundViet",
        subtitle: "Dự án tiêu điểm, danh mục và gợi ý dành cho bạn",
        href: "/",
        badge: "S01",
      },
      {
        id: "nav-discover",
        group: "NAVIGATION",
        title: "Khám phá & lọc dự án",
        subtitle: "Tìm theo danh mục, tiến độ đạt mục tiêu và trạng thái",
        href: "/discover",
        badge: "S02",
      },
      {
        id: "nav-wizard",
        group: "NAVIGATION",
        title: "Tạo chiến dịch mới (Wizard)",
        subtitle: "Soạn câu chuyện, gói quà và kiểm tra dự báo trước khi gửi duyệt",
        href: "/creator/campaigns/new",
        badge: "S07",
      },
      {
        id: "nav-ai-insights",
        group: "NAVIGATION",
        title: "AI Insights & What-if Simulator",
        subtitle: "Xem xác suất thành công, yếu tố SHAP và mô phỏng thay đổi mục tiêu",
        href: "/creator/ai",
        badge: "S09",
        isAi: true,
      },
      {
        id: "nav-backed",
        group: "NAVIGATION",
        title: "Sổ ủng hộ (Backed Projects)",
        subtitle: "Theo dõi khoản cam kết, trạng thái dòng tiền và giao quà",
        href: "/dashboard?tab=backed",
        badge: "S05",
      },
    ];

    if (session?.user.roles.includes("ADMIN")) {
      navItems.push(
        {
          id: "nav-admin-reviews",
          group: "NAVIGATION",
          title: "Hàng chờ xét duyệt chiến dịch",
          subtitle: "Đọc hồ sơ chi tiết và phê duyệt chiến dịch mới",
          href: "/admin?tab=reviews",
          badge: "S12",
        },
        {
          id: "nav-admin-fraud",
          group: "NAVIGATION",
          title: "Fraud Queue — Hàng chờ cảnh báo gian lận",
          subtitle: "Kiểm tra điểm rủi ro, luật kích hoạt R1–R5 và xử lý cảnh báo",
          href: "/admin?tab=fraud",
          badge: "S13",
        },
      );
    }

    const roleItems: CommandAction[] =
      session && session.user.roles.length > 1
        ? session.user.roles
            .filter((role) => role !== session.user.activeRole)
            .map((role) => ({
              id: `role-${role}`,
              group: "ROLE",
              title: `Chuyển sang vai trò ${roleLabels[role]}`,
              subtitle: `Mở không gian làm việc của ${roleLabels[role]}`,
              role,
              badge: "Vai trò",
            }))
        : [];

    const campaignItems: CommandAction[] = campaigns.slice(0, 12).map((campaign) => ({
      id: `cmp-${campaign.id}`,
      group: "CAMPAIGN",
      title: campaign.title,
      subtitle: `${campaign.category} · ${formatVnd(campaign.pledgedAmount, true)} (${fundingPercent(campaign.pledgedAmount, campaign.goalAmount)}%)`,
      href: `/projects/${campaign.slug}`,
      badge: campaign.status === "LIVE" ? "Đang gọi vốn" : campaign.status === "PRE_LAUNCH" ? "Sắp mở" : "Dự án",
    }));

    return [...campaignItems, ...navItems, ...roleItems];
  }, [campaigns, session]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeVi(query.trim());
    if (!normalizedQuery) return allItems.slice(0, 9);
    return allItems
      .filter((item) =>
        normalizeVi(`${item.title} ${item.subtitle} ${item.badge ?? ""}`).includes(normalizedQuery),
      )
      .slice(0, 10);
  }, [allItems, query]);

  const executeItem = (item: CommandAction) => {
    setOpen(false);
    setQuery("");
    if (item.role) {
      void switchRole(item.role);
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredItems.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % filteredItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + filteredItems.length) % filteredItems.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = filteredItems[selectedIndex] ?? filteredItems[0];
      if (target) executeItem(target);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedIndex(0);
          ensureLoaded();
          setOpen(true);
        }}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border text-xs font-semibold transition-colors ${
          compact
            ? "min-h-10 px-3"
            : "h-10 border-slate-200 bg-canvas-soft px-3.5 text-ink-soft hover:border-slate-300 hover:bg-white hover:text-ink"
        } ${className}`}
        aria-label="Mở bảng tìm nhanh dự án và điều hướng (Ctrl+K)"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="hidden lg:inline">{label}</span>
        <kbd className="hidden rounded border border-current/20 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 xl:inline">
          Ctrl K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/60 p-4 pt-16 backdrop-blur-[2px] sm:pt-24"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tìm nhanh dự án và điều hướng"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-ink shadow-[0_24px_64px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5">
              <Search className="size-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                id="command-palette-search"
                name="commandQuery"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Tìm dự án, danh mục, AI Insights hoặc màn hình (không dấu vẫn khớp)…"
                aria-label="Nhập từ khóa tìm dự án hoặc lệnh"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng tìm nhanh"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto p-2">
              {loading && campaigns.length === 0 ? (
                <div className="space-y-2 p-3">
                  <div className="shimmer-line h-11 rounded-xl" />
                  <div className="shimmer-line h-11 rounded-xl" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-bold text-ink">
                    Không tìm thấy kết quả phù hợp cho “{query}”
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Thử tìm theo tên dự án như ORBIT One, Công nghệ hoặc mở trang Khám phá.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => {
                    const active = idx === selectedIndex;
                    const Icon =
                      item.isAi
                        ? Sparkles
                        : item.group === "ROLE"
                          ? UserCheck
                          : item.id === "nav-home"
                            ? Home
                            : item.id === "nav-wizard"
                              ? Plus
                              : item.id.includes("fraud")
                                ? ShieldAlert
                                : item.group === "CAMPAIGN"
                                  ? Compass
                                  : FolderKanban;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => executeItem(item)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors ${
                          active
                            ? item.isAi
                              ? "bg-[#F5F3FF] text-[#6D28D9]"
                              : "bg-emerald-50 text-emerald-950"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                              item.isAi
                                ? "bg-[#EDE9FE] text-[#7C3AED]"
                                : active
                                  ? "bg-emerald-100 text-[#047857]"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">
                              {item.isAi ? "✦ " : ""}
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-ink-muted">{item.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.badge ? (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                item.isAi
                                  ? "bg-[#F5F3FF] text-[#7C3AED]"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                          <ArrowRight className="size-3.5 text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
              <span>Dùng phím ↑ ↓ để chọn · Enter để mở · Esc để đóng</span>
              <span className="font-semibold text-[#7C3AED]">✦ Hỗ trợ tìm tiếng Việt không dấu</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
