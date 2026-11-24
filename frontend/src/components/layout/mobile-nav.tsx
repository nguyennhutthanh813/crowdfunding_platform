"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, LogIn } from "lucide-react";
import type { NavContext } from "@/server/queries/nav";
import { navItems } from "./navbar";
import { cn } from "@/lib/utils";

/** Thanh điều hướng đáy cho mobile (mobile-first, NFR02). */
export function MobileNav({ ctx }: { ctx: NavContext }) {
  const pathname = usePathname();
  if (pathname.startsWith("/me/messages/") && pathname !== "/me/messages/new") {
    return null;
  }

  const items = [{ href: "/", label: "Trang chủ", icon: Home, match: ["/"] }, ...navItems(ctx)];
  if (!ctx.viewer) items.push({ href: "/login", label: "Đăng nhập", icon: LogIn, match: ["/login"] });
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-50 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md justify-around px-2">
        {items.slice(0, 5).map((it) => {
          const on = it.href === "/" ? pathname === "/" : it.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <Link key={it.href} href={it.href} className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-violet-600 dark:text-violet-400" : "text-muted")}>
              {on && <motion.span layoutId="mnav" className="absolute top-0 h-0.5 w-10 rounded-full bg-violet-500" />}
              <it.icon className="size-5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
