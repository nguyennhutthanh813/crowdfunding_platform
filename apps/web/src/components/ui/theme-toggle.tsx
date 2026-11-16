"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "fundviet-theme";
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(callback);
    };
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      const next = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const current = document.documentElement.dataset.theme;
  if (current === "dark") return true;
  if (current === "light") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        document.documentElement.dataset.theme = saved;
        notifyListeners();
      }
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  function handleToggle() {
    const nextDark = !isDark;
    const nextTheme = nextDark ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Ignore private-browsing storage limits.
    }
    notifyListeners();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={isDark ? "Giao diện sáng" : "Giao diện tối"}
      suppressHydrationWarning
      className={
        className ??
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-forest/12 bg-surface text-ink-soft transition hover:border-[#059669]/40 hover:text-[#047857]"
      }
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
