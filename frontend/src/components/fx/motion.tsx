"use client";

import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Hiện dần khi cuộn tới. SSR luôn hiển thị nội dung (không phụ thuộc JS);
 * chỉ phần tử nằm dưới màn hình lúc tải mới chạy hiệu ứng khi cuộn tới.
 */
export function Reveal({ children, delay = 0, y = 24, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) return;
    el.style.opacity = "0";
    el.style.transform = `translateY(${y}px)`;
    el.style.filter = "blur(6px)";
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        animate(el, { opacity: 1, y: 0, filter: "blur(0px)" }, { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] });
      },
      { rootMargin: "-60px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, y]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Số đếm chạy khi vào màn hình (SSR hiển thị sẵn giá trị thật). */
export function CountUp({ value, format = "number", className, duration = 0.65 }: { value: number; format?: "number" | "vnd" | "compact" | "percent"; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(value);
  const started = useRef(false);
  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = animate(value * 0.8, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => setDisplay(value),
    });
    const timer = setTimeout(() => setDisplay(value), 800);
    return () => {
      c.stop();
      clearTimeout(timer);
    };
  }, [inView, value, duration]);
  const fmt = (n: number) => {
    if (format === "vnd") return `${Math.round(n).toLocaleString("vi-VN")}đ`;
    if (format === "percent") return `${Math.round(n)}%`;
    if (format === "compact") {
      if (value >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
      if (value >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
      return `${Math.round(n).toLocaleString("vi-VN")}đ`;
    }
    return Math.round(n).toLocaleString("vi-VN");
  };
  return <span ref={ref} className={cn("tabular-nums", className)}>{fmt(display)}</span>;
}

/** Thẻ nghiêng 3D theo chuột + ánh sáng spotlight. */
export function TiltCard({ children, className, max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 200, damping: 18 });
  const glow = useTransform([x, y], ([a, b]) => `radial-gradient(420px circle at ${(a as number) * 100}% ${(b as number) * 100}%, rgba(124,92,255,0.18), transparent 45%)`);
  const onMove = (e: MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width);
    y.set((e.clientY - r.top) / r.height);
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0.5); y.set(0.5); }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={cn("relative will-change-transform", className)}
    >
      {children}
      <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glow }} />
    </motion.div>
  );
}

/** Nút "hút" theo con trỏ. */
export function Magnetic({ children, strength = 0.3, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 250, damping: 15 });
  const y = useSpring(0, { stiffness: 250, damping: 15 });
  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/** Nền cực quang chuyển động cho hero / khối nổi bật. */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="animate-aurora absolute -left-1/4 -top-1/3 h-[70%] w-[70%] rounded-full bg-violet-600/40 blur-[100px]" />
      <div className="animate-aurora absolute -right-1/4 top-1/4 h-[60%] w-[60%] rounded-full bg-emerald-500/30 blur-[110px] [animation-delay:-6s]" />
      <div className="animate-aurora absolute bottom-[-30%] left-1/4 h-[60%] w-[60%] rounded-full bg-indigo-500/35 blur-[120px] [animation-delay:-12s]" />
    </div>
  );
}
