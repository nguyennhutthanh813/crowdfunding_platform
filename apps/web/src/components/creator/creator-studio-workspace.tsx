"use client";

import {
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  Radar,
  Sparkles,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { triggerParticleBurst } from "@/lib/ui/particle-burst";

type StudioView = "portfolio" | "tasks" | "ecosystem";

export function CreatorStudioWorkspace({
  portfolioCount,
  openTaskCount,
  urgentTaskCount,
  aiScore,
  urgentTaskTitle,
  urgentTaskHref,
  portfolioSlot,
  tasksSlot,
  ecosystemSlot,
}: {
  portfolioCount: number;
  openTaskCount: number;
  urgentTaskCount: number;
  aiScore: number;
  urgentTaskTitle?: string;
  urgentTaskHref: string;
  portfolioSlot: ReactNode;
  tasksSlot: ReactNode;
  ecosystemSlot: ReactNode;
}) {
  const [activeView, setActiveView] = useState<StudioView>("portfolio");
  const [aiScanning, setAiScanning] = useState(false);
  const [aiScanDone, setAiScanDone] = useState(false);

  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === "#viec-can-lam") {
        setActiveView("tasks");
      } else if (window.location.hash === "#ban-do-chien-dich") {
        setActiveView("ecosystem");
      } else if (window.location.hash === "#danh-muc-chien-dich") {
        setActiveView("portfolio");
      }
    };
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (!aiScanning) return;
    const timer = window.setTimeout(() => {
      setAiScanning(false);
      setAiScanDone(true);
      setActiveView("tasks");
      triggerParticleBurst({ colors: ["#7C3AED", "#059669", "#A7F3D0"] });
    }, 680);
    return () => window.clearTimeout(timer);
  }, [aiScanning]);

  const runPriorityScan = (clientX?: number, clientY?: number) => {
    if (aiScanning) return;
    setAiScanning(true);
    triggerParticleBurst({ x: clientX, y: clientY, count: 14, colors: ["#7C3AED", "#059669"] });
  };

  const tabs: Array<{
    id: StudioView;
    label: string;
    badge: string;
    icon: typeof FolderKanban;
  }> = [
    {
      id: "portfolio",
      label: "Danh mục chiến dịch",
      badge: `${portfolioCount} dự án`,
      icon: FolderKanban,
    },
    {
      id: "tasks",
      label: "Việc ưu tiên & nhóm",
      badge: `${openTaskCount} mở`,
      icon: CheckCircle2,
    },
    {
      id: "ecosystem",
      label: "Bản đồ cây & Dự báo AI",
      badge: `✦ ${aiScore}%`,
      icon: GitBranch,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-[#DDD6FE] bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#064E3B] p-4 text-white shadow-card sm:p-5">
        {aiScanning ? (
          <div
            aria-hidden="true"
            className="gop-scan-beam pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#7C3AED]/40 via-emerald-400/20 to-transparent"
          />
        ) : null}

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3.5">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-sm">
              <Image
                src="/images/3d/creator-studio-command-3d.jpg"
                alt="Mô hình 3D bàn điều hành Creator Studio"
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-300">
                <Sparkles className="size-3.5" /> Creator Studio Command Center
              </p>
              <h2 className="mt-1 font-display text-base font-extrabold text-white sm:text-lg">
                Điều hướng gọn 3 chế độ — không trùng lặp thẻ
              </h2>
              <p className="mt-0.5 text-xs text-slate-300">
                {urgentTaskCount > 0
                  ? `Đang có ${urgentTaskCount} đầu việc ưu tiên cao và xác suất AI ${aiScore}%.`
                  : `Các đầu việc trong ca ổn định · Xác suất AI hiện đạt ${aiScore}%.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={aiScanning}
            onClick={(event) => runPriorityScan(event.clientX, event.clientY)}
            className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#6D28D9] disabled:opacity-70"
          >
            <Radar className={`size-4 ${aiScanning ? "animate-spin" : ""}`} />
            {aiScanning
              ? "Đang quét ưu tiên ca trực…"
              : "✦ AI Quét & Sắp xếp Ưu tiên Ca trực"}
          </button>
        </div>

        {aiScanDone && urgentTaskTitle ? (
          <div
            role="status"
            className="mt-3.5 flex flex-col justify-between gap-2 rounded-xl border border-emerald-400/35 bg-white/10 px-3.5 py-2.5 text-xs backdrop-blur-sm sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Zap className="size-4 shrink-0 text-amber-300" />
              <span className="truncate font-semibold text-white">
                Khuyến nghị xử lý trước: <strong>{urgentTaskTitle}</strong>
              </span>
            </div>
            <Link
              href={urgentTaskHref}
              className="inline-flex shrink-0 items-center gap-1 font-bold text-emerald-300 hover:underline"
            >
              Mở xử lý ngay <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : null}
      </div>

      <div
        className="grid grid-cols-1 gap-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-2xs sm:grid-cols-3"
        role="tablist"
        aria-label="Chế độ xem không gian Chủ dự án"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveView(tab.id)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl px-4 text-xs font-bold transition ${
                selected
                  ? tab.id === "ecosystem"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "bg-[#047857] text-white shadow-xs"
                  : "text-ink-soft hover:bg-canvas-soft hover:text-ink"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums ${
                  selected
                    ? "bg-white/20 text-white"
                    : "bg-canvas-soft text-ink-muted"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      <div hidden={activeView !== "portfolio"}>{portfolioSlot}</div>
      <div hidden={activeView !== "tasks"}>{tasksSlot}</div>
      <div hidden={activeView !== "ecosystem"}>{ecosystemSlot}</div>
    </div>
  );
}
