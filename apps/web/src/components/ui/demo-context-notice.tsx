"use client";

import { Type } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { DEMO_SNAPSHOT_LABEL } from "@/lib/api/mock/relational-store";

const readingSizeKey = "gop_reading_size";
const readingSizeEvent = "gop-reading-size";
let memoryLargeText = false;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(readingSizeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(readingSizeEvent, callback);
  };
}

function currentReadingSize() {
  try {
    return window.localStorage.getItem(readingSizeKey) === "large";
  } catch {
    return memoryLargeText;
  }
}

export function DemoContextNotice() {
  const pathname = usePathname();
  const largeText = useSyncExternalStore(subscribe, currentReadingSize, () => false);

  useEffect(() => {
    document.documentElement.dataset.readingSize = largeText ? "large" : "standard";
  }, [largeText]);

  const changeReadingSize = () => {
    const next = !largeText;
    memoryLargeText = next;
    try {
      window.localStorage.setItem(readingSizeKey, next ? "large" : "standard");
    } catch {
      // Trang vẫn đổi cỡ chữ trong phiên hiện tại nếu trình duyệt chặn lưu lựa chọn.
    }
    window.dispatchEvent(new Event(readingSizeEvent));
  };

  if (pathname.startsWith("/du-lieu-chung")) return null;

  return (
    <div className="border-b border-[#d9e2cf] bg-[#f3f7ea] text-[#385447]">
      <div className="container-shell flex items-center justify-between gap-2 py-2 sm:gap-4">
        <details className="min-w-0 text-[13px] leading-5">
          <summary className="min-h-11 cursor-pointer content-center font-bold">Dữ liệu mẫu 13/09/2026 · không thu tiền</summary>
          <p className="pb-2 text-sm font-normal">Chiến dịch mẫu chốt lúc {DEMO_SNAPSHOT_LABEL}. “Còn ngày” và “sắp mở” tính từ mốc này. Hồ sơ mới dùng thời gian trên máy.</p>
        </details>
        <button
          type="button"
          aria-pressed={largeText}
          onClick={changeReadingSize}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[#a9c7a8] bg-white px-3 text-[13px] font-bold text-[#27533a] hover:bg-[#e9f1df]"
        >
          <Type className="size-4" aria-hidden="true" /> Chữ dễ đọc
        </button>
      </div>
    </div>
  );
}
