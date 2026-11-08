"use client";

import {
  Box,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  StepForward,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface StageStepItem {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  detail: string;
  metric?: string;
}

const tonePalettes = {
  forest: {
    shell:
      "border-[#bfd4c1] bg-gradient-to-br from-[#0b2018] via-[#15362a] to-[#214b3b] text-white",
    badge: "bg-[#d6e79a] text-[#143529]",
    accent: "#d6e79a",
    secondary: "#7fd4a8",
    cardActive:
      "border-[#d6e79a] bg-white/18 text-white shadow-[0_18px_36px_rgba(0,0,0,0.34)] ring-1 ring-[#d6e79a]/50",
    cardIdle: "border-white/14 bg-white/7 text-white/78 hover:bg-white/12",
  },
  amber: {
    shell:
      "border-[#e3c6aa] bg-gradient-to-br from-[#321b14] via-[#533024] to-[#6e422c] text-white",
    badge: "bg-[#ffd18a] text-[#47281d]",
    accent: "#ffd18a",
    secondary: "#f6a17a",
    cardActive:
      "border-[#ffd18a] bg-white/18 text-white shadow-[0_18px_36px_rgba(0,0,0,0.34)] ring-1 ring-[#ffd18a]/50",
    cardIdle: "border-white/14 bg-white/7 text-white/78 hover:bg-white/12",
  },
  blue: {
    shell:
      "border-[#b9d4ec] bg-gradient-to-br from-[#0c1e35] via-[#16385e] to-[#215080] text-white",
    badge: "bg-[#99dcff] text-[#112c4a]",
    accent: "#99dcff",
    secondary: "#7cc2f5",
    cardActive:
      "border-[#99dcff] bg-white/18 text-white shadow-[0_18px_36px_rgba(0,0,0,0.34)] ring-1 ring-[#99dcff]/50",
    cardIdle: "border-white/14 bg-white/7 text-white/78 hover:bg-white/12",
  },
  crimson: {
    shell:
      "border-[#e2c6ca] bg-gradient-to-br from-[#1b151e] via-[#411d27] to-[#74222d] text-white",
    badge: "bg-[#f6bd60] text-[#2b191d]",
    accent: "#f6bd60",
    secondary: "#ff9b9b",
    cardActive:
      "border-[#f6bd60] bg-white/18 text-white shadow-[0_18px_36px_rgba(0,0,0,0.34)] ring-1 ring-[#f6bd60]/50",
    cardIdle: "border-white/14 bg-white/7 text-white/78 hover:bg-white/12",
  },
} as const;

function StageParticleFieldCanvas({
  accent,
  secondary,
  activeRatio,
}: {
  accent: string;
  secondary: string;
  activeRatio: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ratioRef = useRef(activeRatio);

  useEffect(() => {
    ratioRef.current = activeRatio;
  }, [activeRatio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let visible = false;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = Array.from({ length: 34 }, (_, i) => ({
      x: ((i * 73) % 100) / 100,
      y: ((i * 41) % 100) / 100,
      z: 0.35 + ((i * 29) % 65) / 100,
      vx: ((i % 2 === 0 ? 1 : -1) * (1 + (i % 4))) / 3200,
      vy: ((i % 3 === 0 ? 1 : -1) * (1 + (i % 3))) / 3600,
    }));

    const render = (time: number) => {
      const width = canvas.clientWidth || 640;
      const height = canvas.clientHeight || 260;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const targetX = width * (0.14 + ratioRef.current * 0.72);
      const targetY = height * 0.72;
      const radial = ctx.createRadialGradient(
        targetX,
        targetY,
        8,
        targetX,
        targetY,
        Math.max(width, height) * 0.44,
      );
      radial.addColorStop(0, `${accent}33`);
      radial.addColorStop(0.5, `${secondary}14`);
      radial.addColorStop(1, "transparent");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      for (let x = 0; x <= width; x += 16) {
        const waveY =
          height * 0.42 +
          Math.sin(x * 0.014 + time * 0.0022) * 14 +
          Math.cos(x * 0.008 - time * 0.0016) * 8;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.strokeStyle = `${accent}26`;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;
        if (p.x < 0.02 || p.x > 0.98) p.vx *= -1;
        if (p.y < 0.04 || p.y > 0.96) p.vy *= -1;

        const px = p.x * width;
        const py = p.y * height;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]!;
          const qx = q.x * width;
          const qy = q.y * height;
          const dist = Math.hypot(px - qx, py - qy);
          if (dist < 88) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(qx, qy);
            ctx.strokeStyle = `${accent}${Math.round((1 - dist / 88) * 35)
              .toString(16)
              .padStart(2, "0")}`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(px, py, 1.3 + p.z * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? accent : secondary;
        ctx.fill();
      }

      if (visible && !motionPreference.matches) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      window.cancelAnimationFrame(frameId);
      if (visible) frameId = window.requestAnimationFrame(render);
    }, { threshold: 0.05 });
    const updateMotion = () => {
      window.cancelAnimationFrame(frameId);
      if (visible) frameId = window.requestAnimationFrame(render);
    };
    observer.observe(canvas);
    motionPreference.addEventListener("change", updateMotion);
    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", updateMotion);
      window.cancelAnimationFrame(frameId);
    };
  }, [accent, secondary]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
      aria-hidden="true"
    />
  );
}

export function RoleStage3DScene({
  eyebrow = "Mô hình 2D/3D & dẫn đường tự động",
  title,
  centerLabel,
  centerSubtext,
  steps,
  activeStepId,
  onSelectStep,
  onInspectStep,
  tone = "forest",
  autoPlayDefault = false,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  centerLabel: string;
  centerSubtext: string;
  steps: StageStepItem[];
  activeStepId?: string;
  onSelectStep?: (id: string) => void;
  onInspectStep?: (id: string) => void;
  tone?: keyof typeof tonePalettes;
  autoPlayDefault?: boolean;
  compact?: boolean;
}) {
  const [internalStepId, setInternalStepId] = useState(steps[0]?.id ?? "");
  const [viewMode, setViewMode] = useState<"3D" | "2D">("2D");
  const [cameraPreset, setCameraPreset] = useState<"iso" | "front" | "orbit">(
    "iso",
  );
  const [autoPlay, setAutoPlay] = useState(autoPlayDefault);

  const currentId = activeStepId ?? internalStepId;
  const activeIndex = Math.max(
    0,
    steps.findIndex((item) => item.id === currentId),
  );
  const activeStep = steps[activeIndex] ?? steps[0];
  const palette = tonePalettes[tone];

  const selectStep = (id: string) => {
    setInternalStepId(id);
    onSelectStep?.(id);
  };

  useEffect(() => {
    if (!autoPlay || steps.length <= 1) return;
    const timer = window.setInterval(() => {
      const nextIndex = (activeIndex + 1) % steps.length;
      const nextStep = steps[nextIndex];
      if (nextStep) {
        setInternalStepId(nextStep.id);
        onSelectStep?.(nextStep.id);
      }
    }, 2600);
    return () => window.clearInterval(timer);
  }, [autoPlay, activeIndex, onSelectStep, steps]);

  if (!activeStep) return null;

  const baseRotateX =
    cameraPreset === "iso" ? 16 : cameraPreset === "orbit" ? 22 : 5;
  const baseRotateY =
    cameraPreset === "iso" ? -12 : cameraPreset === "orbit" ? 14 : 0;
  const activeRatio =
    steps.length > 1 ? activeIndex / (steps.length - 1) : 0.5;

  return (
    <div className={`overflow-hidden rounded-[20px] border p-4 sm:p-5 ${palette.shell}`}>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/12 pb-3.5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/75">
            <Sparkles className="size-3.5" style={{ color: palette.accent }} />
            {eyebrow}
          </p>
          <h4 className="mt-1 truncate font-display text-base font-extrabold sm:text-lg">
            {title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div
            className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5"
            role="group"
            aria-label="Chọn chế độ hiển thị 2D hoặc 3D"
          >
            <button
              type="button"
              aria-pressed={viewMode === "3D"}
              onClick={() => setViewMode("3D")}
              className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold transition ${
                viewMode === "3D"
                  ? palette.badge
                  : "text-white/75 hover:text-white"
              }`}
            >
              <Box className="size-3.5" /> 3D
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "2D"}
              onClick={() => setViewMode("2D")}
              className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold transition ${
                viewMode === "2D"
                  ? palette.badge
                  : "text-white/75 hover:text-white"
              }`}
            >
              <Layers className="size-3.5" /> 2D
            </button>
          </div>

          <button
            type="button"
            aria-pressed={autoPlay}
            onClick={() => setAutoPlay((current) => !current)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              autoPlay
                ? "border-transparent bg-white text-[#143529]"
                : "border-white/20 bg-white/10 text-white hover:bg-white/16"
            }`}
          >
            {autoPlay ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {autoPlay ? "Đang chạy tự động" : "Tự động dẫn đường"}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = steps[(activeIndex + 1) % steps.length];
              if (next) selectStep(next.id);
            }}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-white/16 bg-white/8 px-2.5 text-xs font-bold text-white hover:bg-white/15"
            aria-label="Chuyển sang bước kế tiếp"
          >
            <StepForward className="size-3.5" /> Bước kế
          </button>
        </div>
      </div>

      {viewMode === "3D" ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/72">
            <span>
              Chọn góc quan sát hoặc bấm một chặng để xem chi tiết · Đang ở{" "}
              <strong className="text-white">
                {activeStep.code}: {activeStep.title}
              </strong>
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  ["iso", "Góc nghiêng 3D"],
                  ["front", "Trực diện"],
                  ["orbit", "Xoay 45°"],
                ] as const
              ).map(([preset, label]) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCameraPreset(preset)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                    cameraPreset === preset
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCameraPreset("iso");
                }}
                className="rounded-lg p-1 text-white/65 hover:text-white"
                aria-label="Đặt lại góc nhìn 3D"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="gop-scene-perspective relative overflow-hidden rounded-2xl border border-white/12 bg-black/28 p-4 sm:p-6">
            <StageParticleFieldCanvas
              accent={palette.accent}
              secondary={palette.secondary}
              activeRatio={activeRatio}
            />
            <div
              className="paper-grid pointer-events-none absolute inset-0 opacity-45"
              aria-hidden="true"
            />
            <div
              className="gop-preserve-3d relative mx-auto transition-transform duration-300 ease-out"
              style={{
                transform: `rotateX(${baseRotateX}deg) rotateY(${baseRotateY}deg)`,
              }}
            >
              {/* Vòng quỹ đạo 3D và lõi trung tâm */}
              <div
                className={`relative mx-auto flex flex-col items-center justify-center ${
                  compact ? "py-3" : "py-5"
                }`}
              >
                <div
                  className="gop-orbit-ring pointer-events-none absolute h-40 w-40 rounded-full border border-dashed sm:h-52 sm:w-52"
                  style={{ borderColor: `${palette.accent}55` }}
                  aria-hidden="true"
                />
                <div
                  className="gop-float-3d relative z-10 rounded-2xl border px-4 py-3 text-center shadow-[0_20px_40px_rgba(0,0,0,0.38)] backdrop-blur-md"
                  style={{
                    borderColor: palette.accent,
                    background: "rgba(12, 24, 20, 0.78)",
                  }}
                >
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#12261e]"
                    style={{ backgroundColor: palette.accent }}
                  >
                    ĐANG XEM
                  </span>
                  <p className="mt-1.5 font-display text-sm font-extrabold text-white sm:text-base">
                    {centerLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/72">
                    {centerSubtext}
                  </p>
                </div>
              </div>

              {/* Đường nối xung dữ liệu SVG động */}
              <svg
                viewBox="0 0 600 54"
                className="mx-auto my-1 h-10 w-full max-w-2xl overflow-visible"
                aria-hidden="true"
              >
                {steps.map((step, index) => {
                  const x =
                    steps.length === 1
                      ? 300
                      : 60 + (index * 480) / (steps.length - 1);
                  const isActive = step.id === activeStep.id;
                  return (
                    <g key={step.id}>
                      <path
                        d={`M 300 4 C 300 28, ${x} 24, ${x} 50`}
                        fill="none"
                        stroke={isActive ? palette.accent : "rgba(255,255,255,0.2)"}
                        strokeWidth={isActive ? 3 : 1.5}
                        className={isActive ? "gop-flow-dash" : ""}
                      />
                      {isActive ? (
                        <circle
                          cx={x}
                          cy={48}
                          r={5}
                          fill={palette.accent}
                          className="gop-pulse-beacon"
                        />
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              <div className={`grid gap-2.5 sm:grid-cols-2 ${steps.length >= 5 ? "xl:grid-cols-3" : ""}`}>
                {steps.map((step, index) => {
                  const isActive = step.id === activeStep.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (isActive && onInspectStep) {
                          onInspectStep(step.id);
                          return;
                        }
                        selectStep(step.id);
                      }}
                      style={{
                        transform: isActive
                          ? "translate3d(0, -6px, 18px)"
                          : "translate3d(0, 0, 0)",
                      }}
                      className={`group relative rounded-xl border p-3 text-left transition-all duration-200 ${
                        isActive ? palette.cardActive : palette.cardIdle
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                            isActive
                              ? palette.badge
                              : "bg-white/12 text-white/75"
                          }`}
                        >
                          {step.code || `0${index + 1}`}
                        </span>
                        {step.metric ? (
                          <span className="truncate text-[10px] font-bold text-white/80">
                            {step.metric}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-extrabold leading-5">
                        {step.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/72">
                        {step.subtitle}
                      </p>
                      {isActive && onInspectStep ? (
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-200 underline decoration-amber-200/60 underline-offset-2">
                          Bấm lần nữa để mở tác vụ →
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Sơ đồ mặt cắt 2D trực quan */
        <div className="mt-4 rounded-2xl border border-white/12 bg-black/22 p-4">
          <p className="text-[11px] font-bold text-white/75">
            Sơ đồ {steps.length} chặng · Chọn một chặng để xem công việc tiếp theo
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {steps.map((step, index) => {
              const isActive = step.id === activeStep.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (isActive && onInspectStep) {
                      onInspectStep(step.id);
                      return;
                    }
                    selectStep(step.id);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    isActive ? palette.cardActive : palette.cardIdle
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-extrabold">
                    <span>BƯỚC {index + 1}</span>
                    <span>{isActive ? "ĐANG CHỌN" : "→"}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-extrabold leading-5">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/75">
                    {step.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Thanh giải thích bước đang chọn */}
      <div className="mt-3.5 flex flex-col justify-between gap-3 rounded-xl border border-white/14 bg-white/8 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${palette.badge}`}
            >
              {activeStep.code || `BƯỚC ${activeIndex + 1}/${steps.length}`}
            </span>
            <p className="text-xs font-extrabold text-white sm:text-sm">
              {activeStep.title}
            </p>
          </div>
          <p className="mt-1 text-xs leading-5 text-white/80">
            {activeStep.detail}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onInspectStep ? (
            <button
              type="button"
              onClick={() => onInspectStep(activeStep.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold shadow-sm transition hover:brightness-105 ${palette.badge}`}
            >
              Xem việc của từng vai trò →
            </button>
          ) : null}
          <div className="flex items-center gap-1.5">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                aria-label={`Chọn bước ${idx + 1}: ${step.title}`}
                onClick={() => selectStep(step.id)}
                className={`h-2 rounded-full transition-all ${
                  step.id === activeStep.id
                    ? "w-6 bg-white"
                    : "w-2 bg-white/35 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
