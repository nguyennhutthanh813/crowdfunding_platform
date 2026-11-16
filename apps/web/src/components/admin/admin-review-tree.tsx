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
import { ArrowRight, FileCheck2, GitBranch, Layers, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
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
  const [displayMode, setDisplayMode] = useState<"flow" | "cards">("flow");
  const [openPart, setOpenPart] = useState<ReviewPart | null>(null);
  const [expanded, setExpanded] = useState(false);
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
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    fontFamily: "var(--font-be-vietnam-pro), sans-serif",
  };
  const nodes: Node[] = [
    {
      id: "creator", position: { x: 18, y: 142 }, sourcePosition: Position.Right,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-slate-600">Chủ dự án</span><strong className="mt-1 block text-sm leading-5">{selected.creator}</strong></div> },
      style: { ...nodeBase, width: 170, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#0F172A" },
    },
    {
      id: "campaign", position: { x: 230, y: 132 }, targetPosition: Position.Left, sourcePosition: Position.Right,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-emerald-200">Chiến dịch</span><strong className="mt-1 block line-clamp-2 text-sm leading-5">{selected.title}</strong><span className="mt-2 block text-[11px] text-white/75">{selected.campaignId}</span></div> },
      style: { ...nodeBase, width: 215, border: "2px solid #34D399", background: "#0F172A", color: "#fff" },
    },
    {
      id: "submission", position: { x: 490, y: 132 }, targetPosition: Position.Left, sourcePosition: Position.Right,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-rose-100">Hồ sơ xét duyệt</span><strong className="mt-1 block text-sm">Gửi lần {selected.submissionVersion}</strong><span className="mt-2 block text-[11px] text-white/80">{reviewState}</span></div> },
      style: { ...nodeBase, width: 205, border: "2px solid #FDA4AF", background: "#E11D48", color: "#fff" },
    },
    {
      id: "checks", position: { x: 735, y: 35 }, targetPosition: Position.Left,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-amber-800">Nội dung cần đọc</span><strong className="mt-1 block text-sm">{passed}/{selected.checks.length} mục đạt</strong><span className="mt-2 block text-[11px] text-amber-700">{selected.completeness}% đầy đủ</span></div> },
      style: { ...nodeBase, width: 175, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#78350F" },
    },
    {
      id: "reviewer", position: { x: 735, y: 215 }, targetPosition: Position.Left,
      data: { label: <div className="text-left"><span className="text-[11px] font-bold text-[#047857]">Phụ trách xử lý</span><strong className="mt-1 block text-sm leading-5">{selected.assignedTo}</strong><span className="mt-2 block text-[11px] text-[#065F46]">{selected.reviewDueAt}</span></div> },
      style: { ...nodeBase, width: 175, border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#064E3B" },
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
        color: isActiveEdge ? "#E11D48" : "#94A3B8",
      },
      style: {
        stroke: isActiveEdge ? "#E11D48" : "#94A3B8",
        strokeWidth: isActiveEdge ? 3.2 : 2.2,
      },
    };
  });

  const stageSteps = REVIEW_PARTS.map((part, index) => ({
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

  return <section aria-labelledby="admin-review-tree-title" className="mt-6 overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
    <div className="border-b border-line bg-canvas-soft/80 px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#E11D48]">
            <GitBranch className="size-4" /> Bản đồ xét duyệt
          </p>
          <h2 id="admin-review-tree-title" className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
            Một hồ sơ, một chiến dịch rõ ràng
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-ink-soft">
            Chọn hồ sơ để thấy ai gửi, thuộc dự án nào, cần kiểm những gì và ai đang phụ trách.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Chế độ hiển thị bản đồ xét duyệt">
            <button
              type="button"
              aria-pressed={displayMode === "flow" && expanded}
              onClick={() => { setDisplayMode("flow"); setExpanded(true); }}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "flow" && expanded ? "bg-[#E11D48] text-white" : "text-ink-soft hover:bg-rose-50 hover:text-[#E11D48]"
              }`}
            >
              <GitBranch className="size-3.5" /> Sơ đồ cây
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "cards" && expanded}
              onClick={() => { setDisplayMode("cards"); setExpanded(true); }}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "cards" && expanded ? "bg-[#E11D48] text-white" : "text-ink-soft hover:bg-rose-50 hover:text-[#E11D48]"
              }`}
            >
              <Layers className="size-3.5" /> Danh sách thẻ
            </button>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#E11D48] bg-[#E11D48] px-3.5 text-xs font-bold text-white hover:bg-[#BE123C]"
          >
            {expanded ? "Thu gọn sơ đồ" : "Mở sơ đồ kiểm định"}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Chọn hồ sơ xét duyệt trên bản đồ">
        {reviews.map((review) => <button key={review.id} type="button" aria-pressed={review.id === selected.id} onClick={() => { setSelectedId(review.id); setFocusedPart("submission"); setOpenPart(null); setExpanded(true); }} className={`min-h-10 max-w-full rounded-xl border px-3 py-1.5 text-left text-xs font-bold transition-colors ${review.id === selected.id ? "border-[#E11D48] bg-[#E11D48] text-white" : "border-line bg-surface text-ink-soft hover:border-rose-300 hover:text-ink"}`}>{review.title} · lần {review.submissionVersion}</button>)}
      </div>
    </div>

    {expanded ? (
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        {displayMode === "cards" ? (
          <div className="rounded-2xl border border-line bg-canvas-soft/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#E11D48]">
                  Hồ sơ đang xét · {selected.id}
                </p>
                <h4 className="mt-0.5 text-sm font-bold text-ink">
                  {selected.title}
                </h4>
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#E11D48] ring-1 ring-rose-200">
                Gửi lần {selected.submissionVersion} · {passed}/{selected.checks.length} mục đạt
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stageSteps.map((step) => {
                const isActive = focusedPart === step.id;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 transition ${
                      isActive
                        ? "border-[#E11D48] bg-rose-50/40"
                        : "border-line bg-surface hover:border-rose-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-[#E11D48]">
                          Bước {step.code}
                        </span>
                        {step.metric ? (
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-soft ring-1 ring-line">
                            {step.metric}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-[#E11D48]">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {step.subtitle}
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                        {step.detail}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setFocusedPart(step.id)}
                        className={`inline-flex min-h-8 items-center rounded-lg px-2.5 text-xs font-bold transition ${
                          isActive
                            ? "bg-[#E11D48] text-white"
                            : "border border-line bg-surface text-ink-soft hover:bg-canvas-soft"
                        }`}
                      >
                        {isActive ? "Đang chọn" : "Chọn bước"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusedPart(step.id);
                          setOpenPart(step.id);
                        }}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-bold text-ink-soft hover:bg-canvas-soft"
                      >
                        Chi tiết <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden h-[390px] overflow-hidden rounded-2xl border border-line bg-surface lg:block" aria-label="Cây quan hệ của hồ sơ đang chọn">
              <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.08 }} minZoom={0.65} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} zoomOnScroll={false} zoomOnDoubleClick={false} panOnScroll={false} onNodeClick={(_, node) => { setFocusedPart(node.id as ReviewPart); setOpenPart(node.id as ReviewPart); }} ariaLabelConfig={{ "controls.ariaLabel": "Điều khiển sơ đồ xét duyệt", "controls.zoomIn.ariaLabel": "Phóng to sơ đồ", "controls.zoomOut.ariaLabel": "Thu nhỏ sơ đồ", "controls.fitView.ariaLabel": "Xem toàn bộ sơ đồ" }}>
                <Background variant={BackgroundVariant.Dots} gap={19} size={1} color="#cbd5e1" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
            <div className="lg:hidden">
              <button type="button" onClick={() => setOpenPart("creator")} className="min-h-12 w-full rounded-xl border border-line bg-canvas-soft px-4 py-3 text-left text-sm font-bold text-ink">{selected.creator}</button>
              <div className="ml-5 border-l-2 border-line-strong pb-1 pl-4 pt-3">
                <button type="button" onClick={() => setOpenPart("campaign")} className="min-h-12 w-full rounded-xl bg-[#0F172A] px-4 py-3 text-left text-sm font-bold text-white">{selected.title}</button>
                <div className="ml-5 border-l-2 border-line-strong pb-1 pl-4 pt-3">
                  <button type="button" onClick={() => setOpenPart("submission")} className="min-h-12 w-full rounded-xl bg-[#E11D48] px-4 py-3 text-left text-sm font-bold text-white">Hồ sơ gửi lần {selected.submissionVersion}</button>
                  <div className="ml-5 grid gap-2 border-l-2 border-line-strong pb-1 pl-4 pt-3">
                    {(["checks", "reviewer"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-12 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-semibold text-ink">{details[part].title}<span className="mt-1 block text-[13px] font-normal text-ink-soft">{details[part].value}</span></button>)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <aside className="flex flex-col rounded-[17px] border border-line bg-canvas-soft/60 p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#E11D48]"><FileCheck2 className="size-4" /> Hồ sơ đang chọn</p>
        <h3 className="mt-3 font-display text-lg font-extrabold leading-6 text-ink">{selected.title}</h3>
        <p className="mt-1 break-all text-xs text-ink-muted">{selected.campaignId} · {selected.id}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#E11D48]"><ShieldCheck className="size-4" /> {reviewState}</p>
        <div className="mt-4 space-y-2 border-y border-line py-4 text-[13px] leading-5 text-ink-soft">
          <p><strong>Người gửi:</strong> {selected.creator}</p>
          <p><strong>Phụ trách:</strong> {selected.assignedTo}</p>
          <p><strong>Kiểm tra:</strong> {passed} đạt · {needsAttention} cần xem</p>
          <p><strong>Hạn xử lý:</strong> {selected.reviewDueAt}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Giải thích các nhánh của hồ sơ">
          {(["creator", "campaign", "submission", "checks", "reviewer"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink-soft hover:border-[#E11D48] hover:text-[#E11D48]">{details[part].title}</button>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-ink-muted">Các mục kiểm tra hỗ trợ đọc hồ sơ; quyết định vẫn do quản trị viên xác nhận.</p>
        <button type="button" onClick={openReview} className="button-dark mt-auto w-full">Mở đúng hồ sơ này <ArrowRight className="size-4" /></button>
      </aside>
    </div>
    ) : null}

    <Modal open={openPart !== null} title={openPart ? details[openPart].title : ""} description={selected.title} onClose={() => setOpenPart(null)} size="sm">
      {openPart ? <div>
        <p className="break-words text-base font-bold text-ink">{details[openPart].value}</p>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-soft">{details[openPart].body}</p>
        <button type="button" onClick={openReview} className="button-dark mt-5 w-full">Mở hồ sơ xét duyệt <ArrowRight className="size-4" /></button>
      </div> : null}
    </Modal>
  </section>;
}
