"use client";

import { useEffect, useRef } from "react";
import { celebrate } from "@/components/fx/confetti";

/** Bắn pháo giấy 1 lần khi mở trang xác nhận góp vốn thành công. */
export function SuccessCelebration() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    celebrate();
  }, []);
  return null;
}
