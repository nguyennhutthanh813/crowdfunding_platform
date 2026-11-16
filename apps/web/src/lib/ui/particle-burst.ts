"use client";

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  alpha: number;
  shape: number;
}

const DEFAULT_COLORS = [
  "#059669",
  "#10B981",
  "#7C3AED",
  "#2563EB",
  "#F59E0B",
  "#A7F3D0",
];

export function triggerParticleBurst(options?: {
  x?: number;
  y?: number;
  colors?: string[];
  count?: number;
}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "120";
  document.body.appendChild(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const originX = options?.x ?? width * 0.5;
  const originY = options?.y ?? height * 0.35;
  const palette = options?.colors ?? DEFAULT_COLORS;
  const count = options?.count ?? 52;

  const particles: BurstParticle[] = Array.from({ length: count }, (_, idx) => {
    const angle = (Math.PI * 2 * idx) / count + (Math.random() - 0.5) * 0.35;
    const speed = 3.6 + Math.random() * 6.8;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.4,
      size: 4 + Math.random() * 4.5,
      color: palette[idx % palette.length] ?? "#059669",
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.24,
      alpha: 1,
      shape: idx % 3,
    };
  });

  const start = performance.now();
  const duration = 1300;
  let frameId = 0;

  const step = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.vx *= 0.975;
      p.vy = p.vy * 0.975 + 0.19;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      p.alpha = Math.max(0, 1 - elapsed / duration);

      if (p.alpha <= 0.02) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.52, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 1) {
        ctx.fillRect(-p.size * 0.65, -p.size * 0.32, p.size * 1.3, p.size * 0.64);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 0.65);
        ctx.lineTo(p.size * 0.55, 0);
        ctx.lineTo(0, p.size * 0.65);
        ctx.lineTo(-p.size * 0.55, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (elapsed < duration) {
      frameId = window.requestAnimationFrame(step);
    } else {
      window.cancelAnimationFrame(frameId);
      canvas.remove();
    }
  };

  frameId = window.requestAnimationFrame(step);
}

