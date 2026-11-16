"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { ArrowRight, GitBranch, LayoutGrid, Pause, Play, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import type { CreatorPortfolioData } from "@/lib/api/contracts";
import { creatorCampaignHref } from "@/lib/creator/campaign-href";
import { formatVnd, fundingPercent } from "@/lib/format";
import { triggerParticleBurst } from "@/lib/ui/particle-burst";

type TreePart = "owner" | "campaign" | "review" | "team" | "community";
const TREE_TOUR_PARTS: TreePart[] = ["owner", "campaign", "review", "team", "community"];

const statusText = {
  DRAFT: "Bản nháp",
  IN_REVIEW: "Đang xét duyệt",
  PRE_LAUNCH: "Đã duyệt, chờ mở",
  LIVE: "Đang gọi vốn",
  SUCCESSFUL: "Đạt mục tiêu",
  FAILED: "Không đạt mục tiêu",
  SUSPENDED: "Đang tạm dừng",
} as const;

function reviewText(status: keyof typeof statusText) {
  if (status === "DRAFT") return "Chưa gửi xét duyệt";
  if (status === "IN_REVIEW") return "Quản trị viên đang kiểm";
  if (status === "SUSPENDED") return "Cần xử lý yêu cầu";
  return "Đã qua xét duyệt";
}

export function CreatorCampaignTree({
  portfolio,
  localDbAvailable,
}: {
  portfolio: CreatorPortfolioData;
  localDbAvailable: boolean;
}) {
  const [selectedId, setSelectedId] = useState(portfolio.activeCampaignId);
  const [focusedPart, setFocusedPart] = useState<TreePart>("campaign");
  const [displayMode, setDisplayMode] = useState<"flow" | "cards">("flow");
  const [openPart, setOpenPart] = useState<TreePart | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [autoTour, setAutoTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    if (!autoTour) return;
    const timer = window.setInterval(() => {
      setTourStep((prev) => {
        const next = prev + 1;
        if (next >= TREE_TOUR_PARTS.length) {
          setAutoTour(false);
          triggerParticleBurst();
          return 0;
        }
        return next;
      });
    }, 1600);
    return () => window.clearInterval(timer);
  }, [autoTour]);

  const effectiveFocusedPart = autoTour ? (TREE_TOUR_PARTS[tourStep] ?? focusedPart) : focusedPart;
  const selected = portfolio.campaigns.find((item) => item.id === selectedId)
    ?? portfolio.campaigns[0];

  if (!selected) return null;

  const manageHref = creatorCampaignHref(selected);
  const percent = selected.goalAmount > 0
    ? fundingPercent(selected.pledgedAmount, selected.goalAmount)
    : 0;
  const details: Record<TreePart, { title: string; body: string; value: string }> = {
    owner: {
      title: "Chủ dự án",
      body: "Một tài khoản chủ dự án có thể tạo nhiều chiến dịch. Mỗi chiến dịch có mã riêng, tiến độ riêng và nhóm được mời riêng.",
      value: portfolio.owner.name + " · " + portfolio.campaigns.length + " chiến dịch",
    },
    campaign: {
      title: "Hồ sơ chiến dịch",
      body: "Hồ sơ này thuộc tài khoản đang đăng nhập. Các số liệu và thao tác bên dưới đều gắn với đúng mã chiến dịch này.",
      value: selected.title + " · " + selected.id,
    },
    review: {
      title: "Xét duyệt",
      body: "Chủ dự án gửi hồ sơ; quản trị viên đọc và phản hồi. Chỉ hồ sơ đã duyệt mới được chủ dự án mở gọi vốn.",
      value: reviewText(selected.status),
    },
    team: {
      title: "Nhóm chiến dịch",
      body: "Số thành viên gồm cả chủ dự án. Cộng tác viên chỉ được làm việc trong chiến dịch đã nhận lời mời và theo quyền được cấp.",
      value: selected.teamSize + " người · " + selected.openTaskCount + " việc đang mở",
    },
    community: {
      title: "Người ủng hộ",
      body: "Số người ủng hộ và tiền cam kết thuộc riêng chiến dịch này. Cam kết được quản lý theo quy tắc Tất cả hoặc không gì cả và chỉ chốt thu khi chiến dịch đạt 100% mục tiêu.",
      value: selected.backerCount + " người · " + formatVnd(selected.pledgedAmount),
    },
  };

  const nodeBase = {
    borderRadius: 16,
    padding: 15,
    boxShadow: "0 12px 24px rgba(30,56,41,.11)",
    fontFamily: "var(--font-be-vietnam-pro), sans-serif",
  };
  const nodes: Node[] = [
    {
      id: "owner",
      position: { x: 24, y: 175 },
      sourcePosition: Position.Right,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#047857]">Chủ dự án</span>
        <strong className="mt-1 block text-sm leading-5">{portfolio.owner.name}</strong>
        <span className="mt-2 block text-xs text-ink-soft">{portfolio.campaigns.length} chiến dịch</span>
      </div> },
      style: {
        ...nodeBase,
        width: 194,
        border: effectiveFocusedPart === "owner" ? "2px solid #7C3AED" : "1px solid #A7F3D0",
        background: "#ECFDF5",
        color: "#064E3B",
      },
    },
    {
      id: "campaign",
      position: { x: 274, y: 147 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-emerald-200">{statusText[selected.status]}</span>
        <strong className="mt-2 block line-clamp-2 text-sm leading-5">{selected.title}</strong>
        <span className="mt-2 block text-[11px] text-white/80">{selected.category} · {selected.id}</span>
      </div> },
      style: {
        ...nodeBase,
        width: 235,
        border: effectiveFocusedPart === "campaign" ? "2px solid #DDD6FE" : "2px solid #34D399",
        background: "#047857",
        color: "#fff",
      },
    },
    {
      id: "review",
      position: { x: 573, y: 25 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-sky-700">Quản trị viên</span>
        <strong className="mt-1 block text-sm">Xét duyệt</strong>
        <span className="mt-2 block text-xs text-sky-700/80">{reviewText(selected.status)}</span>
      </div> },
      style: {
        ...nodeBase,
        width: 190,
        border: effectiveFocusedPart === "review" ? "2px solid #7C3AED" : "1px solid #BFDBFE",
        background: "#EFF6FF",
        color: "#1E3A8A",
      },
    },
    {
      id: "team",
      position: { x: 573, y: 170 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#6D28D9]">Nhóm được mời</span>
        <strong className="mt-1 block text-sm">{selected.teamSize} thành viên</strong>
        <span className="mt-2 block text-xs text-[#6D28D9]/80">{selected.openTaskCount} việc đang mở</span>
      </div> },
      style: {
        ...nodeBase,
        width: 190,
        border: effectiveFocusedPart === "team" ? "2px solid #7C3AED" : "1px solid #DDD6FE",
        background: "#F5F3FF",
        color: "#4C1D95",
      },
    },
    {
      id: "community",
      position: { x: 573, y: 315 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#047857]">Cộng đồng</span>
        <strong className="mt-1 block text-sm">{selected.backerCount} người ủng hộ</strong>
        <span className="mt-2 block text-xs text-[#065F46]/80">{formatVnd(selected.pledgedAmount, true)} cam kết</span>
      </div> },
      style: {
        ...nodeBase,
        width: 190,
        border: effectiveFocusedPart === "community" ? "2px solid #7C3AED" : "1px solid #A7F3D0",
        background: "#ECFDF5",
        color: "#065F46",
      },
    },
  ];
  const edges: Edge[] = [
    { id: "owner-campaign", source: "owner", target: "campaign", ariaLabel: "Chủ dự án sở hữu chiến dịch" },
    { id: "campaign-review", source: "campaign", target: "review", ariaLabel: "Chiến dịch được quản trị viên xét duyệt" },
    { id: "campaign-team", source: "campaign", target: "team", ariaLabel: "Chiến dịch có nhóm cộng tác" },
    { id: "campaign-community", source: "campaign", target: "community", ariaLabel: "Chiến dịch nhận cam kết từ cộng đồng" },
  ].map((edge) => {
    const activeEdge = edge.target === effectiveFocusedPart || edge.source === effectiveFocusedPart;
    const strokeColor = activeEdge ? (autoTour ? "#7C3AED" : "#059669") : "#94A3B8";
    return {
      ...edge,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
      },
      style: {
        stroke: strokeColor,
        strokeWidth: activeEdge ? 3.2 : 2,
      },
    };
  });

  const stageSteps = (
    ["owner", "campaign", "review", "team", "community"] as const
  ).map((part, idx) => ({
    id: part,
    code: `0${idx + 1}`,
    title: details[part].title,
    subtitle: details[part].value,
    detail: details[part].body,
  }));

  return <section id="ban-do-chien-dich" aria-labelledby="creator-tree-title" className="mb-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-card">
    <div className="border-b border-slate-200 bg-gradient-to-r from-[#ECFDF5] via-white to-[#F5F3FF] px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#047857]"><GitBranch className="size-4" /> Bản đồ chiến dịch</p>
          <h2 id="creator-tree-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">Một chủ dự án, nhiều hành trình riêng</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">Chọn một chiến dịch để xem ai đang tham gia, hồ sơ ở bước nào và tiền cam kết thuộc về đâu.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Chế độ hiển thị cây chiến dịch">
            <button
              type="button"
              aria-pressed={displayMode === "flow" && expanded}
              onClick={() => { setDisplayMode("flow"); setExpanded(true); }}
              className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "flow" && expanded ? "bg-[#047857] text-white" : "text-[#047857] hover:bg-[#ECFDF5]"
              }`}
            >
              <GitBranch className="size-3.5" /> Sơ đồ luồng (2D)
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "cards" && expanded}
              onClick={() => { setDisplayMode("cards"); setExpanded(true); }}
              className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "cards" && expanded ? "bg-[#047857] text-white" : "text-[#047857] hover:bg-[#ECFDF5]"
              }`}
            >
              <LayoutGrid className="size-3.5" /> Danh sách thẻ
            </button>
          </div>
          <button
            type="button"
            onClick={(event) => {
              if (!autoTour) {
                setExpanded(true);
                setTourStep(0);
                triggerParticleBurst({ x: event.clientX, y: event.clientY });
              }
              setAutoTour((current) => !current);
            }}
            className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              autoTour
                ? "border-[#7C3AED] bg-[#7C3AED] text-white shadow-xs"
                : "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9] hover:border-[#7C3AED]"
            }`}
          >
            {autoTour ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            <span>{autoTour ? "Dừng duyệt cây" : "Tự động duyệt cây"}</span>
          </button>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#047857] bg-[#047857] px-3.5 text-xs font-bold text-white hover:bg-[#065F46]"
          >
            {expanded ? "Thu gọn sơ đồ" : "Xem sơ đồ quan hệ"}
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Chọn chiến dịch trên bản đồ">
        {portfolio.campaigns.map((campaign) => <button
          key={campaign.id}
          type="button"
          aria-pressed={campaign.id === selected.id}
          onClick={() => { setSelectedId(campaign.id); setOpenPart(null); setExpanded(true); }}
          className={"min-h-11 max-w-full cursor-pointer rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors " + (campaign.id === selected.id
            ? "border-[#047857] bg-[#047857] text-white"
            : "border-line bg-surface text-[#047857] hover:bg-[#ECFDF5]")}
        >{campaign.title}</button>)}
      </div>
    </div>

    {expanded ? (
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div>
        {displayMode === "cards" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {stageSteps.map((stepItem) => {
              const isSelected = effectiveFocusedPart === stepItem.id;
              return (
                <button
                  key={stepItem.id}
                  type="button"
                  onClick={() => {
                    setAutoTour(false);
                    setFocusedPart(stepItem.id as TreePart);
                    setOpenPart(stepItem.id as TreePart);
                  }}
                  className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-[#047857] bg-[#ECFDF5] shadow-sm"
                      : "border-slate-200 bg-white hover:border-[#059669]/45"
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#047857]">
                      {stepItem.code} · {stepItem.title}
                    </span>
                    <p className="mt-1.5 font-display text-sm font-extrabold text-ink">
                      {stepItem.subtitle}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-ink-soft">
                      {stepItem.detail}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="gop-campaign-tree hidden h-[465px] overflow-hidden rounded-2xl border border-line bg-surface lg:block" aria-label="Cây quan hệ của chiến dịch đang chọn">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{ padding: 0.08 }}
                minZoom={0.65}
                maxZoom={1.4}
                nodesDraggable={false}
                nodesConnectable={false}
                nodesFocusable={false}
                edgesFocusable={false}
                zoomOnScroll={false}
                zoomOnDoubleClick={false}
                panOnScroll={false}
                ariaLabelConfig={{
                  "controls.ariaLabel": "Điều khiển cây chiến dịch",
                  "controls.zoomIn.ariaLabel": "Phóng to sơ đồ",
                  "controls.zoomOut.ariaLabel": "Thu nhỏ sơ đồ",
                  "controls.fitView.ariaLabel": "Xem toàn bộ sơ đồ",
                }}
                onNodeClick={(_, node) => {
                  const part = node.id as TreePart;
                  setFocusedPart(part);
                  setOpenPart(part);
                }}
              >
                <Background variant={BackgroundVariant.Dots} gap={19} size={1} color="#CBD5E1" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
            <div className="lg:hidden">
              <button type="button" onClick={() => setOpenPart("owner")} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-emerald-200 bg-[#ECFDF5] px-4 text-left text-sm font-bold text-[#064E3B]">
                {portfolio.owner.name} <span className="text-[13px]">{portfolio.campaigns.length} chiến dịch</span>
              </button>
              <div className="ml-5 border-l-2 border-emerald-300 pb-1 pl-4 pt-3">
                <button type="button" onClick={() => setOpenPart("campaign")} className="min-h-12 w-full rounded-xl bg-[#047857] px-4 py-3 text-left text-sm font-bold text-white">{selected.title}</button>
                <div className="ml-5 grid gap-2 border-l-2 border-emerald-300 pb-1 pl-4 pt-3">
                  {(["review", "team", "community"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-12 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-semibold text-ink">
                    {details[part].title} <span className="mt-0.5 block text-[13px] leading-5 font-normal text-ink-soft">{details[part].value}</span>
                  </button>)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <aside className="flex flex-col rounded-[18px] border border-slate-200 bg-white p-5">
        <StatusBadge status={selected.status} />
        <h3 className="mt-4 font-display text-lg font-extrabold leading-6 text-ink">{selected.title}</h3>
        <p className="mt-2 text-[13px] leading-5 text-ink-soft">{selected.nextActionDetail}</p>
        <div className="mt-5 border-y border-slate-200 py-4">
          <div className="flex items-center justify-between gap-3 text-xs"><span>Mục tiêu</span><strong>{selected.goalAmount ? formatVnd(selected.goalAmount, true) : "Chưa đặt"}</strong></div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span>Đã cam kết</span><strong>{formatVnd(selected.pledgedAmount, true)}</strong></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={"Tiến độ gọi vốn " + selected.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, percent)} aria-valuetext={`${percent}% mục tiêu`}>
            <span className="block h-full rounded-full bg-[#047857]" style={{ width: Math.min(100, percent) + "%" }} />
          </div>
          {selected.goalAmount > 0 ? <p className="mt-2 text-right text-xs font-semibold text-[#047857]">{percent}% mục tiêu</p> : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-soft">
          <span className="flex items-center gap-1"><UsersRound className="size-4" /> {selected.teamSize} thành viên</span>
          <span>{selected.backerCount} người ủng hộ</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Giải thích các nhánh của chiến dịch">
          {(["owner", "campaign", "review", "team", "community"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-10 cursor-pointer rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-[#047857] hover:bg-[#ECFDF5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#047857]">{details[part].title}</button>)}
        </div>
        <div className="mt-auto pt-5">
          <Link href={manageHref} className="button-primary w-full">{selected.nextActionLabel} <ArrowRight className="size-4" /></Link>
          {localDbAvailable ? <Link href={"/campaigns/" + selected.id + "/timeline"} className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-xs font-bold text-[#047857] hover:underline">Xem lịch sử thao tác</Link> : null}
        </div>
      </aside>
    </div>
    ) : null}

    <Modal open={openPart !== null} title={openPart ? details[openPart].title : ""} description={selected.title} onClose={() => setOpenPart(null)} size="sm">
      {openPart ? <div>
        <p className="text-base font-bold text-ink">{details[openPart].value}</p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{details[openPart].body}</p>
        <Link href={manageHref} onClick={() => setOpenPart(null)} className="button-primary mt-5 w-full">Mở hồ sơ chiến dịch <ArrowRight className="size-4" /></Link>
      </div> : null}
    </Modal>
  </section>;
}
