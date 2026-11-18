"use client";

import confetti from "canvas-confetti";

const COLORS = ["#7C5CFF", "#4F46E5", "#10B981", "#34D399", "#F59E0B", "#F472B6"];

/** Pháo giấy bùng nổ 2 phía — dùng khi góp vốn / duyệt / mở chiến dịch thành công. */
export function celebrate() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const end = Date.now() + 900;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors: COLORS, scalar: 1.1 });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors: COLORS, scalar: 1.1 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors: COLORS, shapes: ["circle", "square"] });
  frame();
}

/** Bung hạt nhỏ tại vị trí con trỏ (nút lưu / thích). */
export function burstAt(x: number, y: number, color = "#F43F5E") {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: 24, spread: 60, startVelocity: 18, gravity: 0.8, ticks: 80, scalar: 0.7,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight }, colors: [color, "#F59E0B", "#7C5CFF"],
  });
}
