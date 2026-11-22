"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Thanh tiến trình mảnh ở đỉnh trang khi chuyển route trong ứng dụng. */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [phase, setPhase] = useState<"idle" | "start" | "active" | "done">("idle");
  const prevKeyRef = useRef(routeKey);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  };

  useEffect(() => {
    const startBar = () => {
      clearTimers();
      setPhase("start");
      const t1 = window.setTimeout(() => setPhase("active"), 16);
      const t2 = window.setTimeout(() => setPhase("done"), 12_000);
      const t3 = window.setTimeout(() => setPhase("idle"), 12_300);
      timersRef.current.push(t1, t2, t3);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      const tgt = anchor.getAttribute("target");
      if (tgt && tgt !== "_self") return;

      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref || rawHref.startsWith("#")) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname.toLowerCase().endsWith(".csv")) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
        startBar();
      } catch {
        // Bỏ qua URL không hợp lệ
      }
    };

    const onPopState = () => startBar();

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      clearTimers();
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (prevKeyRef.current === routeKey) return;
    prevKeyRef.current = routeKey;
    clearTimers();
    const t0 = window.setTimeout(() => setPhase("done"), 0);
    const t1 = window.setTimeout(() => setPhase("idle"), 260);
    timersRef.current.push(t0, t1);
  }, [routeKey]);

  if (phase === "idle") return null;

  const width = phase === "start" ? "10%" : phase === "active" ? "82%" : "100%";
  const opacity = phase === "done" ? "opacity-0" : "opacity-100";

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-200 ${opacity}`}>
      <div
        className="bg-brand-gradient h-full shadow-[0_0_10px_rgba(124,58,237,0.65)] transition-[width] duration-300 ease-out"
        style={{ width }}
      />
    </div>
  );
}
