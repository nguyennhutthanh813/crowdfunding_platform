"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Lớp hạt sáng bay lên (như tia lửa / đồng xu) — nền "điện ảnh" cho hero.
 * Canvas nhẹ (~70 hạt), tự dừng khi ra khỏi màn hình hoặc khi người dùng giảm chuyển động.
 */
export function ParticleField({ className, density = 70 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: 0.5, y: 0.5 };
    const colors = ["#a78bfa", "#7c5cff", "#34d399", "#fbbf24", "#f0abfc"];
    type P = { x: number; y: number; r: number; vy: number; vx: number; c: string; a: number; tw: number; z: number };
    let ps: P[] = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(density * Math.min(1, w / 1200) + 20);
      ps = Array.from({ length: n }, () => spawn(true));
    };
    const spawn = (anywhere = false): P => {
      const z = Math.random();
      return {
        x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10, z,
        r: 0.6 + z * 2.4, vy: 0.15 + z * 0.6, vx: (Math.random() - 0.5) * 0.15,
        c: colors[Math.floor(Math.random() * colors.length)], a: 0.25 + z * 0.6, tw: Math.random() * Math.PI * 2,
      };
    };
    const tick = () => {
      if (!visible) { raf = requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, w, h);
      const ox = (mouse.x - 0.5) * 30, oy = (mouse.y - 0.5) * 20;
      for (const p of ps) {
        p.y -= p.vy; p.x += p.vx; p.tw += 0.05;
        if (p.y < -10) Object.assign(p, spawn());
        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        const x = p.x + ox * p.z, y = p.y + oy * p.z;
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4);
        g.addColorStop(0, p.c);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, p.r * 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x, y, p.r * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onMove); };
  }, [density]);
  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
