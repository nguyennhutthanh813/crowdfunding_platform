"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./footer";

const WORKSPACE_PREFIXES = ["/me", "/studio", "/admin"];

export function ConditionalFooter() {
  const pathname = usePathname();
  const isWorkspace = WORKSPACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isWorkspace) return null;
  return <SiteFooter />;
}
