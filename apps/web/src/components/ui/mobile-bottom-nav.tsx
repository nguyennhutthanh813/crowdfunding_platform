"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, PlusCircle, Sparkles, User } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { roleDestinations } from "@/lib/auth/roles";

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { session } = useAuth();

  if (
    pathname.startsWith("/projects/") ||
    pathname.startsWith("/pledge/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  const activityHref = session ? roleDestinations[session.user.activeRole] : "/dashboard";

  const items = [
    {
      id: "discover",
      label: "Khám phá",
      href: "/discover",
      active: pathname === "/" || pathname.startsWith("/discover"),
      icon: Compass,
    },
    {
      id: "recommended",
      label: "Gợi ý ✦",
      href: "/#danh-cho-ban",
      active: false,
      icon: Sparkles,
      isAi: true,
    },
    {
      id: "create",
      label: "Tạo",
      href: "/creator/campaigns/new",
      active: pathname.startsWith("/creator/campaigns/new"),
      icon: PlusCircle,
      isPrimary: true,
    },
    {
      id: "activity",
      label: "Hoạt động",
      href: activityHref,
      active:
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/backer") ||
        (pathname.startsWith("/creator") && !pathname.startsWith("/creator/campaigns/new")) ||
        pathname.startsWith("/collaborator") ||
        pathname.startsWith("/admin"),
      icon: Heart,
    },
    {
      id: "account",
      label: "Tôi",
      href: "/account",
      active: pathname.startsWith("/account"),
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition ${
                item.isPrimary
                  ? "text-[#047857]"
                  : item.active
                    ? "text-[#047857]"
                    : item.isAi
                      ? "text-[#7C3AED]"
                      : "text-ink-soft hover:text-ink"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  item.isPrimary
                    ? "text-[#059669]"
                    : item.active
                      ? "text-[#059669]"
                      : item.isAi
                        ? "text-[#7C3AED]"
                        : ""
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
