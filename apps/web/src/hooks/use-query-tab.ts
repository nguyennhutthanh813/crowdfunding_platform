"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useQueryTab<T extends string>(
  validTabs: readonly T[],
  fallback: T,
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as T | null;
  const initialTab =
    requestedTab && validTabs.includes(requestedTab) ? requestedTab : fallback;
  const tab = initialTab;

  const setTab = useCallback(
    (nextTab: T) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.push(`${pathname}?${params.toString()}`, { scroll: true });
    },
    [pathname, router, searchParams],
  );

  return [tab, setTab] as const;
}
