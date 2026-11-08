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
import { ArrowRight, Box, FileCheck2, GitBranch, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  RoleStage3DScene,
  type StageStepItem,
} from "@/components/visuals/role-stage-3d-scene";
import type { ReviewQueueItem } from "@/lib/api/contracts";

type ReviewPart = "creator" | "campaign" | "submission" | "checks" | "reviewer";
const REVIEW_PARTS: ReviewPart[] = [
  "creator",
  "campaign",
  "submission",
  "checks",
  "reviewer",
];

export function AdminReviewTree({
  reviews,
  onOpenReview,
}: {
  reviews: ReviewQueueItem[];
  onOpenReview: (reviewId?: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(reviews[0]?.id ?? "");
  const [focusedPart, setFocusedPart] = useState<ReviewPart>("submission");
  const [displayMode, setDisplayMode] = useState<"flow" | "stage3d">("stage3d");
  const [openPart, setOpenPart] = useState<ReviewPart | null>(null);
  const [expanded, setExpanded] = useState(true);
  const selected = reviews.find((item) => item.id === selectedId) ?? reviews[0];

  if (!selected) return (
    <section className="rounded-[20px] border border-[#dfd6d5] bg-white p-6">
      <p className="flex items-center gap-2 text-sm font-bold text-[#9f2630]"><GitBranch className="size-4" /> Đường đi của một hồ sơ</p>
      <h2 className="mt-2 font-display text-xl font-extrabold">Hiện chưa có hồ sơ chờ duyệt</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">Khi chủ dự án gửi hồ sơ, bản đồ sẽ hiện chiến dịch, lần gửi và người phụ trách của chính hồ sơ đó.</p>
      <button type="button" onClick={() => onOpenReview()} className="button-secondary mt-4">Mở hàng chờ xét duyệt <ArrowRight className="size-4" /></button>
    </section>
  );

  const passed = selected.checks.filter((item) => item.status === "PASS").length;
  const needsAttention = selected.checks.length - passed;
  const reviewState = selected.status === "PENDING" ? "Chờ quản trị viên xem" : "Đang chờ chủ dự án bổ sung";
  const details: Record<ReviewPart, { title: string; value: string; body: string }> = {
    creator: {
      title: "Chủ dự án",
      value: selected.creator,
      body: "Người gửi hồ sơ của chiến dịch đang chọn. Phản hồi duyệt cần quay lại đúng chủ dự án này.",
    },
    campaign: {
      title: "Chiến dịch",
      value: `${selected.title} · ${selected.campaignId}`,
      body: "Mã chiến dịch nối hồ sơ xét duyệt với dự án; hai hồ sơ có tên gần giống nhau vẫn được phân biệt bằng mã này.",
    },
    submission: {
      title: "Lần gửi duyệt",
      value: `${selected.id} · lần ${selected.submissionVersion}`,
      body: `${selected.documentCount} mục nội dung, gửi ${selected.submittedAt.toLowerCase()}. ${reviewState}.`,
    },
    checks: {
      title: "Danh sách kiểm tra",
      value: `${passed} mục đạt · ${needsAttention} mục cần xem`,
      body: selected.checks.map((item) => `${item.label}: ${item.detail}`).join("\n"),
    },
    reviewer: {
      title: "Người phụ trách",
      value: selected.assignedTo,
      body: `Hạn xử lý: ${selected.reviewDueAt}. Quản trị viên phải đọc nội dung và ghi lý do khi yêu cầu sửa hoặc từ chối.`,
    },
  };

  const nodeBase = {
    borderRadius: 15,
    padding: 14,
    boxShadow: "0 10px 24px rgba(35,34,43,.10)",
    fontFamily: "var(--font-be-vietnam-pro), sans-serif",
  };
  const nodes: Node[] = [
    {
      id: "creator", position: { x: 18, y: 142 }, sourcePosition: Position.Right,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-[#6e6172]">Chủ dự án</span><strong className="mt-1 block text-sm leading-5">{selected.creator}</strong></div> },
      style: { ...nodeBase, width: 170, border: "1px solid #dbd5e2", background: "#f4f1f7", color: "#312c42" },
    },
    {
      id: "campaign", position: { x: 230, y: 132 }, targetPosition: Position.Left, sourcePosition: Position.Right,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-[#b1cbe0]">Chiến dịch</span><strong className="mt-1 block line-clamp-2 text-sm leading-5">{selected.title}</strong><span className="mt-2 block text-[11px] text-white/75">{selected.campaignId}</span></div> },
      style: { ...nodeBase, width: 215, border: "2px solid #a8cadf", background: "#263c55", color: "#fff" },
    },
    {
      id: "submission", position: { x: 490, y: 132 }, targetPosition: Position.Left, sourcePosition: Position.Right,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-[#ffd6d4]">Hồ sơ xét duyệt</span><strong className="mt-1 block text-sm">Gửi lần {selected.submissionVersion}</strong><span className="mt-2 block text-[11px] text-white/80">{reviewState}</span></div> },
      style: { ...nodeBase, width: 205, border: "2px solid #fac2bc", background: "#9f2630", color: "#fff" },
    },
    {
      id: "checks", position: { x: 735, y: 35 }, targetPosition: Position.Left,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-[#795939]">Nội dung cần đọc</span><strong className="mt-1 block text-sm">{passed}/{selected.checks.length} mục đạt</strong><span className="mt-2 block text-[11px] text-[#795939]">{selected.completeness}% đầy đủ</span></div> },
      style: { ...nodeBase, width: 175, border: "1px solid #ead9b6", background: "#fff5df", color: "#634c31" },
    },
    {
      id: "reviewer", position: { x: 735, y: 215 }, targetPosition: Position.Left,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-[#7b5255]">Phụ trách xử lý</span><strong className="mt-1 block text-sm leading-5">{selected.assignedTo}</strong><span className="mt-2 block text-[11px] text-[#7b5255]">{selected.reviewDueAt}</span></div> },
      style: { ...nodeBase, width: 175, border: "1px solid #edcdd0", background: "#fff0ef", color: "#60343a" },
    },
  ];
  const edges: Edge[] = [
    { id: "creator-campaign", source: "creator", target: "campaign", ariaLabel: "Chủ dự án sở hữu chiến dịch" },
    { id: "campaign-submission", source: "campaign", target: "submission", ariaLabel: "Chiến dịch có hồ sơ gửi duyệt" },
    { id: "submission-checks", source: "submission", target: "checks", ariaLabel: "Hồ sơ có danh sách kiểm tra" },
    { id: "submission-reviewer", source: "submission", target: "reviewer", ariaLabel: "Hồ sơ có người phụ trách" },
  ].map((edge) => {
    const isActiveEdge =
      edge.target === focusedPart || edge.source === focusedPart;
    return {
      ...edge,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isActiveEdge ? "#9f2630" : "#a38289",
      },
      style: {
        stroke: isActiveEdge ? "#9f2630" : "#a38289",
        strokeWidth: isActiveEdge ? 3.2 : 2.5,
      },
    };
  });

  const stageSteps: StageStepItem[] = REVIEW_PARTS.map((part, index) => ({
    id: part,
    code: `0${index + 1}`,
    title: details[part].title,
    subtitle: details[part].value,
    detail: details[part].body,
    metric:
      part === "submission"
        ? reviewState
        : part === "checks"
          ? `${selected.completeness}% đầy đủ`
          : undefined,
  }));

  const openReview = () => {
    setOpenPart(null);
    onOpenReview(selected.id);
  };

  return <section aria-labelledby="admin-review-tree-title" className="overflow-hidden rounded-[22px] border border-[#ded2d5] bg-[#fdfafa] shadow-[0_18px_45px_rgba(50,31,38,.06)]">
    <div className="border-b border-[#eadfe2] bg-[#f6eef0] px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#9f2630]"><GitBranch className="size-4" /> Bản đồ xét duyệt</p>
          <h2 id="admin-review-tree-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#352d37]">Một hồ sơ, một chiến dịch rõ ràng</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#665762]">Chọn hồ sơ để thấy ai gửi, thuộc dự án nào, cần kiểm những gì và ai đang phụ trách. Cảnh báo gian lận là hàng chờ riêng.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#e3ccd0] bg-white p-1" role="group" aria-label="Chế độ hiển thị bản đồ xét duyệt">
            <button
              type="button"
              aria-pressed={displayMode === "flow" && expanded}
              onClick={() => { setDisplayMode("flow"); setExpanded(true); }}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "flow" && expanded ? "bg-[#9f2630] text-white" : "text-[#783e45] hover:bg-[#fff5f5]"
              }`}
            >
              <GitBranch className="size-3.5" /> Sơ đồ cây
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "stage3d" && expanded}
              onClick={() => { setDisplayMode("stage3d"); setExpanded(true); }}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "stage3d" && expanded ? "bg-[#9f2630] text-white" : "text-[#783e45] hover:bg-[#fff5f5]"
              }`}
            >
              <Box className="size-3.5" /> Sa bàn 3D
            </button>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#9f2630] bg-[#9f2630] px-3.5 text-xs font-bold text-white hover:bg-[#7d1d25]"
          >
            {expanded ? "Thu gọn sơ đồ" : "Mở sơ đồ cây & Sa bàn 3D"}
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Chọn hồ sơ xét duyệt trên bản đồ">
        {reviews.map((review) => <button key={review.id} type="button" aria-pressed={review.id === selected.id} onClick={() => { setSelectedId(review.id); setFocusedPart("submission"); setOpenPart(null); setExpanded(true); }} className={"min-h-11 max-w-full rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors " + (review.id === selected.id ? "border-[#9f2630] bg-[#9f2630] text-white" : "border-[#e3ccd0] bg-white text-[#783e45] hover:bg-[#fff8f8]")}>{review.title} · lần {review.submissionVersion}</button>)}
      </div>
    </div>

    {expanded ? (
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        {displayMode === "stage3d" ? (
          <RoleStage3DScene
            tone="crimson"
            eyebrow="Hồ sơ đang xét"
            title="Trạm kiểm định 5 bước của hồ sơ đang chọn"
            centerLabel={selected.title}
            centerSubtext={`${selected.id} · Gửi lần ${selected.submissionVersion} · ${passed}/${selected.checks.length} mục đạt`}
            steps={stageSteps}
            activeStepId={focusedPart}
            onSelectStep={(stepId) => setFocusedPart(stepId as ReviewPart)}
            onInspectStep={(stepId) => {
              setFocusedPart(stepId as ReviewPart);
              setOpenPart(stepId as ReviewPart);
            }}
            compact
          />
        ) : (
          <>
            <div className="hidden h-[390px] overflow-hidden rounded-2xl border border-[#eadfe2] bg-white lg:block" aria-label="Cây quan hệ của hồ sơ đang chọn">
              <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.08 }} minZoom={0.65} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} zoomOnScroll={false} zoomOnDoubleClick={false} panOnScroll={false} onNodeClick={(_, node) => { setFocusedPart(node.id as ReviewPart); setOpenPart(node.id as ReviewPart); }} ariaLabelConfig={{ "controls.ariaLabel": "Điều khiển sơ đồ xét duyệt", "controls.zoomIn.ariaLabel": "Phóng to sơ đồ", "controls.zoomOut.ariaLabel": "Thu nhỏ sơ đồ", "controls.fitView.ariaLabel": "Xem toàn bộ sơ đồ" }}>
                <Background variant={BackgroundVariant.Dots} gap={19} size={1} color="#ecdfe3" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
            <div className="lg:hidden">
              <button type="button" onClick={() => setOpenPart("creator")} className="min-h-12 w-full rounded-xl border border-[#dbd5e2] bg-[#f4f1f7] px-4 py-3 text-left text-sm font-bold text-[#312c42]">{selected.creator}</button>
              <div className="ml-5 border-l-2 border-[#cdbac0] pb-1 pl-4 pt-3">
                <button type="button" onClick={() => setOpenPart("campaign")} className="min-h-12 w-full rounded-xl bg-[#263c55] px-4 py-3 text-left text-sm font-bold text-white">{selected.title}</button>
                <div className="ml-5 border-l-2 border-[#cdbac0] pb-1 pl-4 pt-3">
                  <button type="button" onClick={() => setOpenPart("submission")} className="min-h-12 w-full rounded-xl bg-[#9f2630] px-4 py-3 text-left text-sm font-bold text-white">Hồ sơ gửi lần {selected.submissionVersion}</button>
                  <div className="ml-5 grid gap-2 border-l-2 border-[#cdbac0] pb-1 pl-4 pt-3">
                    {(["checks", "reviewer"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-12 rounded-xl border border-[#eadfe2] bg-white px-4 py-3 text-left text-sm font-semibold text-[#60343a]">{details[part].title}<span className="mt-1 block text-[13px] font-normal text-[#765f65]">{details[part].value}</span></button>)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <aside className="flex flex-col rounded-[17px] border border-[#e5d7da] bg-white p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#a03a43]"><FileCheck2 className="size-4" /> Hồ sơ đang chọn</p>
        <h3 className="mt-3 font-display text-lg font-extrabold leading-6 text-[#352d37]">{selected.title}</h3>
        <p className="mt-1 break-all text-xs text-[#705d64]">{selected.campaignId} · {selected.id}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9f2630]"><ShieldCheck className="size-4" /> {reviewState}</p>
        <div className="mt-4 space-y-2 border-y border-[#eee4e5] py-4 text-[13px] leading-5 text-[#65565b]">
          <p><strong>Người gửi:</strong> {selected.creator}</p>
          <p><strong>Phụ trách:</strong> {selected.assignedTo}</p>
          <p><strong>Kiểm tra:</strong> {passed} đạt · {needsAttention} cần xem</p>
          <p><strong>Hạn xử lý:</strong> {selected.reviewDueAt}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Giải thích các nhánh của hồ sơ">
          {(["creator", "campaign", "submission", "checks", "reviewer"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-10 rounded-lg border border-[#e6d7d9] px-2.5 text-xs font-semibold text-[#783e45] hover:bg-[#fff5f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f2630]">{details[part].title}</button>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#75636a]">Các mục kiểm tra hỗ trợ đọc hồ sơ; quyết định vẫn do quản trị viên xác nhận.</p>
        <button type="button" onClick={openReview} className="button-dark mt-auto w-full">Mở đúng hồ sơ này <ArrowRight className="size-4" /></button>
      </aside>
    </div>
    ) : null}

    <Modal open={openPart !== null} title={openPart ? details[openPart].title : ""} description={selected.title} onClose={() => setOpenPart(null)} size="sm">
      {openPart ? <div>
        <p className="break-words text-base font-bold text-[#352d37]">{details[openPart].value}</p>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#695962]">{details[openPart].body}</p>
        <button type="button" onClick={openReview} className="button-dark mt-5 w-full">Mở hồ sơ xét duyệt <ArrowRight className="size-4" /></button>
      </div> : null}
    </Modal>
  </section>;
}
