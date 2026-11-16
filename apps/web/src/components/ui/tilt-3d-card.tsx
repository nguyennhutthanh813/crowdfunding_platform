"use client";

import type { PointerEvent, ReactNode } from "react";
import { useState } from "react";

export function Tilt3DCard({
  children,
  className = "",
  maxTilt = 6,
  glowColor = "rgba(5, 150, 105, 0.18)",
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * maxTilt * 2;
    const rx = (0.5 - py) * maxTilt * 2;
    setTilt({
      rx: Number(rx.toFixed(2)),
      ry: Number(ry.toFixed(2)),
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      active: true,
    });
  }

  function handlePointerLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative will-change-transform ${className}`}
      style={{
        transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(${tilt.active ? "1.01,1.01,1.01" : "1,1,1"})`,
        transition: tilt.active
          ? "transform 90ms ease-out"
          : "transform 420ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: tilt.active ? 1 : 0,
          background: `radial-gradient(circle 340px at ${tilt.gx}% ${tilt.gy}%, ${glowColor}, transparent 72%)`,
        }}
      />
      {children}
    </div>
  );
}

