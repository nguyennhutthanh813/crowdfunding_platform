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
import { ArrowRight, GitBranch, LayoutGrid, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BackedProject, PaymentStatus } from "@/lib/api/contracts";
import { formatDate, formatVnd } from "@/lib/format";
import { backerFulfillmentText } from "@/lib/pledge/backer-fulfillment";

type TreePart = "backer" | "pledge" | "campaign" | "payment" | "reward";

const paymentText: Record<PaymentStatus, string> = {
  AUTHORIZED: "Đã ủy quyền cam kết, chưa thu tiền",
  CAPTURED: "Đã chốt thu tiền (Đạt mục tiêu)",
  CANCELED: "Cam kết đã hủy (Không thu tiền)",
  FAILED: "Giao dịch không thành công",
};

const parts: TreePart[] = ["backer", "pledge", "campaign", "payment", "reward"];

export function BackerPledgeTree({
  projects,
  backerName,
}: {
  projects: BackedProject[];
  backerName: string;
}) {
  const [selectedId, setSelectedId] = useState(projects[0]?.pledgeId ?? "");
  const [focusedPart, setFocusedPart] = useState<TreePart>("pledge");
  const [displayMode, setDisplayMode] = useState<"flow" | "cards">("flow");
  const [openPart, setOpenPart] = useState<TreePart | null>(null);
  const [expanded, setExpanded] = useState(false);
  const selected = projects.find((item) => item.pledgeId === selectedId) ?? projects[0];

  if (!selected) return null;
  const deliveryText = backerFulfillmentText(selected);

  const details: Record<TreePart, { title: string; value: string; body: string }> = {
    backer: {
      title: "Tài khoản ủng hộ",
      value: backerName,
      body: "Danh sách này chỉ gồm các cam kết của tài khoản đang đăng nhập. Mỗi lần đổi dự án, toàn bộ nhánh bên dưới sẽ đổi theo khoản được chọn.",
    },
    pledge: {
      title: "Khoản cam kết",
      value: `${selected.referenceCode} · ${formatVnd(selected.amount)}`,
      body: `${selected.rewardTitle}. Ghi nhận ngày ${formatDate(selected.pledgedAt)}. Mã cam kết giúp đối chiếu lại với trang dự án và danh sách của bạn.`,
    },
    campaign: {
      title: "Dự án nhận cam kết",
      value: selected.campaign.title,
      body: `Khoản ${selected.referenceCode} thuộc riêng mã dự án ${selected.campaign.id}. Chủ dự án nhìn thấy số này trong tiến độ của đúng chiến dịch.`,
    },
    payment: {
      title: "Tình trạng dòng tiền",
      value: paymentText[selected.paymentStatus],
      body: "Khoản cam kết được quản lý theo quy tắc Tất cả hoặc không gì cả; số tiền chỉ được chốt thu khi chiến dịch đạt 100% mục tiêu đã công bố.",
    },
    reward: {
      title: "Gói quà",
      value: `${selected.rewardTitle} · ${deliveryText}`,
      body: "Tiến độ chuẩn bị và bàn giao gói quà được cập nhật trực tiếp theo từng mốc hoàn thiện của chủ dự án.",
    },
  };

  const nodeBase = {
    borderRadius: 15,
    padding: 14,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    fontFamily: "var(--font-be-vietnam-pro), sans-serif",
  };
  const nodes: Node[] = [
    {
      id: "backer",
      position: { x: 24, y: 170 },
      sourcePosition: Position.Right,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#047857]">Người ủng hộ</span>
        <strong className="mt-1 block text-sm leading-5">{backerName}</strong>
        <span className="mt-2 block text-xs text-slate-600">{projects.length} khoản đang theo dõi</span>
      </div> },
      style: { ...nodeBase, width: 190, border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#064E3B" },
    },
    {
      id: "pledge",
      position: { x: 265, y: 155 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-emerald-200">Khoản cam kết</span>
        <strong className="mt-1 block text-sm leading-5">{formatVnd(selected.amount)}</strong>
        <span className="mt-2 block text-[11px] text-white/80">{selected.referenceCode}</span>
      </div> },
      style: { ...nodeBase, width: 210, border: "2px solid #34D399", background: "#047857", color: "white" },
    },
    {
      id: "campaign",
      position: { x: 535, y: 20 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#047857]">Dự án</span>
        <strong className="mt-1 block line-clamp-2 text-sm leading-5">{selected.campaign.title}</strong>
        <span className="mt-2 block text-xs text-slate-500">{selected.campaign.id}</span>
      </div> },
      style: { ...nodeBase, width: 228, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#0F172A" },
    },
    {
      id: "payment",
      position: { x: 535, y: 167 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#6D28D9]">Dòng tiền</span>
        <strong className="mt-1 block text-sm leading-5">{paymentText[selected.paymentStatus]}</strong>
      </div> },
      style: { ...nodeBase, width: 228, border: "1px solid #DDD6FE", background: "#F5F3FF", color: "#4C1D95" },
    },
    {
      id: "reward",
      position: { x: 535, y: 305 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-sky-700">Gói quà</span>
        <strong className="mt-1 block line-clamp-2 text-sm leading-5">{selected.rewardTitle}</strong>
        <span className="mt-2 block text-xs text-sky-700">{deliveryText}</span>
      </div> },
      style: { ...nodeBase, width: 228, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1E3A8A" },
    },
  ];
  const edges: Edge[] = [
    { id: "backer-pledge", source: "backer", target: "pledge", ariaLabel: "Tài khoản có khoản cam kết" },
    { id: "pledge-campaign", source: "pledge", target: "campaign", ariaLabel: "Khoản cam kết thuộc dự án" },
    { id: "pledge-payment", source: "pledge", target: "payment", ariaLabel: "Khoản cam kết có trạng thái dòng tiền" },
    { id: "pledge-reward", source: "pledge", target: "reward", ariaLabel: "Khoản cam kết chọn gói quà" },
  ].map((edge) => {
    const activeEdge = edge.target === focusedPart || edge.source === focusedPart;
    return {
      ...edge,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: activeEdge ? "#047857" : "#94A3B8",
      },
      style: {
        stroke: activeEdge ? "#047857" : "#94A3B8",
        strokeWidth: activeEdge ? 3.2 : 2.2,
      },
    };
  });

  const stageSteps = parts.map((part, idx) => ({
    id: part,
    code: `0${idx + 1}`,
    title: details[part].title,
    subtitle: details[part].value,
    detail: details[part].body,
  }));

  return (
    <section aria-labelledby="backer-tree-title" className="mt-6 overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
      <div className="border-b border-line bg-canvas-soft/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#047857]">
              <GitBranch className="size-4" /> Sơ đồ khoản ủng hộ
            </p>
            <h3 id="backer-tree-title" className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
              Khoản cam kết này gắn với đâu?
            </h3>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-ink-soft">
              Chọn một khoản để xem dự án, trạng thái ủy quyền dòng tiền và gói quà của riêng khoản đó.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Chế độ hiển thị sơ đồ">
              <button
                type="button"
                aria-pressed={displayMode === "flow" && expanded}
                onClick={() => { setDisplayMode("flow"); setExpanded(true); }}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                  displayMode === "flow" && expanded ? "bg-[#047857] text-white" : "text-ink-soft hover:bg-[#ECFDF5] hover:text-[#047857]"
                }`}
              >
                <GitBranch className="size-3.5" /> Sơ đồ luồng (2D)
              </button>
              <button
                type="button"
                aria-pressed={displayMode === "cards" && expanded}
                onClick={() => { setDisplayMode("cards"); setExpanded(true); }}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                  displayMode === "cards" && expanded ? "bg-[#047857] text-white" : "text-ink-soft hover:bg-[#ECFDF5] hover:text-[#047857]"
                }`}
              >
                <LayoutGrid className="size-3.5" /> Danh sách thẻ
              </button>
            </div>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#047857] bg-[#047857] px-3.5 text-xs font-bold text-white hover:bg-[#065F46]"
            >
              {expanded ? "Thu gọn sơ đồ" : "Xem sơ đồ khoản ủng hộ"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Chọn khoản ủng hộ trên sơ đồ">
          {projects.map((item) => <button
            key={item.pledgeId}
            type="button"
            aria-pressed={item.pledgeId === selected.pledgeId}
            onClick={() => { setSelectedId(item.pledgeId); setOpenPart(null); setExpanded(true); }}
            className={`min-h-10 rounded-xl border px-3 py-1.5 text-left text-xs font-bold transition ${item.pledgeId === selected.pledgeId
              ? "border-[#047857] bg-[#047857] text-white shadow-2xs"
              : "border-line bg-surface text-ink-soft hover:border-[#059669]/40 hover:text-ink"}`}
          >{item.campaign.title}</button>)}
        </div>
      </div>

      {expanded ? (
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_275px]">
        <div>
          {displayMode === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {stageSteps.map((stepItem) => {
                const isSelected = focusedPart === stepItem.id;
                return (
                  <button
                    key={stepItem.id}
                    type="button"
                    onClick={() => {
                      setFocusedPart(stepItem.id as TreePart);
                      setOpenPart(stepItem.id as TreePart);
                    }}
                    className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-[#047857] bg-[#ECFDF5] shadow-sm"
                        : "border-line bg-surface hover:border-[#059669]/45"
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
              <div className="gop-pledge-tree hidden h-[420px] overflow-hidden rounded-2xl border border-line bg-surface lg:block" aria-label="Cây quan hệ của khoản cam kết đang chọn">
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
                    "controls.ariaLabel": "Điều khiển sơ đồ khoản ủng hộ",
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
                  <Background variant={BackgroundVariant.Dots} gap={19} size={1} color="#cbd5e1" />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>
              <div className="lg:hidden">
                <button type="button" onClick={() => setOpenPart("backer")} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-[#ECFDF5] px-4 text-left text-sm font-bold text-[#064E3B]">
                  {backerName} <span className="text-[13px]">{projects.length} khoản</span>
                </button>
                <div className="ml-5 border-l-2 border-emerald-300 pb-1 pl-4 pt-3">
                  <button type="button" onClick={() => setOpenPart("pledge")} className="min-h-12 w-full rounded-xl bg-[#047857] px-4 py-3 text-left text-sm font-bold text-white">
                    {formatVnd(selected.amount)} · {selected.referenceCode}
                  </button>
                  <div className="ml-5 grid gap-2 border-l-2 border-emerald-300 pb-1 pl-4 pt-3">
                    {(["campaign", "payment", "reward"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-12 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-semibold text-ink">
                      {details[part].title} <span className="mt-0.5 block text-[13px] leading-5 font-normal text-ink-soft">{details[part].value}</span>
                    </button>)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <aside className="flex flex-col rounded-[16px] border border-line bg-canvas-soft/60 p-5">
          <StatusBadge status={selected.campaign.status} />
          <h4 className="mt-3 font-display text-lg font-extrabold leading-6 text-ink">{selected.campaign.title}</h4>
          <p className="mt-2 text-sm font-bold text-[#047857]">{formatVnd(selected.amount)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted"><ReceiptText className="size-4" /> {selected.referenceCode}</p>
          <div className="mt-4 space-y-2 border-y border-line py-4 text-[13px] leading-5 text-ink-soft">
            <p><strong>Dòng tiền:</strong> {paymentText[selected.paymentStatus]}</p>
            <p><strong>Gói quà:</strong> {selected.rewardTitle}</p>
            <p><strong>Giao quà:</strong> {deliveryText}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Giải thích các nhánh của khoản ủng hộ">
            {parts.map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink-soft hover:border-[#047857] hover:text-[#047857]">{details[part].title}</button>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-muted">Cam kết được quản lý theo quy tắc Tất cả hoặc không gì cả; số tiền chỉ được chuyển giao khi dự án đạt 100% mục tiêu.</p>
          <div className="mt-auto pt-4">
            <Link href={`/projects/${selected.campaign.slug}`} className="button-primary w-full">Mở trang dự án <ArrowRight className="size-4" /></Link>
          </div>
        </aside>
      </div>
      ) : null}

      <Modal open={openPart !== null} title={openPart ? details[openPart].title : ""} description={selected.campaign.title} onClose={() => setOpenPart(null)} size="sm">
        {openPart ? <div>
          <p className="text-base font-bold text-ink">{details[openPart].value}</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{details[openPart].body}</p>
          <Link href={`/projects/${selected.campaign.slug}`} onClick={() => setOpenPart(null)} className="button-primary mt-5 w-full">Mở trang dự án <ArrowRight className="size-4" /></Link>
        </div> : null}
      </Modal>
    </section>
  );
}
