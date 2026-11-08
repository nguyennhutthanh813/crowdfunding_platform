"use client";

import { Background, BackgroundVariant, Controls, MarkerType, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { ArrowRight, Check, Clock3, Eye, Layers } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { LocalCampaignTimeline } from "@/lib/local-db/database";

const stages = [
  { key: "PREPARATION", label: "Chuẩn bị", hint: "Viết hồ sơ, gói quà và phân công nhóm", color: "#e9eee3" },
  { key: "REVIEW", label: "Xét duyệt", hint: "Gửi hồ sơ, nhận phản hồi và chỉnh sửa", color: "#e8eff7" },
  { key: "FUNDING", label: "Gọi vốn", hint: "Cộng đồng theo dõi và ghi cam kết", color: "#fff0e7" },
  { key: "DELIVERY", label: "Sau gọi vốn", hint: "Chốt kết quả, đối soát và giao quà", color: "#f1eaf0" },
] as const;

type StageKey = (typeof stages)[number]["key"];
type TimelineEvent = LocalCampaignTimeline["events"][number];

const roleNames: Record<string, string> = {
  BACKER: "Người ủng hộ", CREATOR: "Chủ dự án", COLLABORATOR: "Cộng tác viên", ADMIN: "Quản trị viên", GUEST: "Khách",
};
const scopeNames: Record<string, string> = {
  PUBLIC: "Mọi người", TEAM: "Nhóm chiến dịch", INVOLVED: "Người liên quan",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function CampaignTimelineBoard({ events, currentPhase, viewer }: {
  events: TimelineEvent[];
  currentPhase: number;
  viewer: LocalCampaignTimeline["viewer"];
}) {
  const [selectedStage, setSelectedStage] = useState<StageKey | "ALL">("ALL");
  const [inspectStageKey, setInspectStageKey] = useState<StageKey | null>(null);
  const [inspectEvent, setInspectEvent] = useState<TimelineEvent | null>(null);
  const counts = useMemo(() => Object.fromEntries(stages.map((stage) => [
    stage.key, events.filter((event) => event.stage === stage.key).length,
  ])) as Record<StageKey, number>, [events]);
  const visibleEvents = selectedStage === "ALL"
    ? events
    : events.filter((event) => event.stage === selectedStage);
  const selected = stages.find((stage) => stage.key === selectedStage);
  const activeStageForModal = inspectStageKey
    ? stages.find((stage) => stage.key === inspectStageKey)
    : null;

  const nodes: Node[] = stages.map((stage, index) => {
    const current = index === currentPhase;
    const selectedNode = selectedStage === stage.key;
    const placement = [
      { x: 40, y: 36, source: Position.Right, target: Position.Left },
      { x: 390, y: 36, source: Position.Bottom, target: Position.Left },
      { x: 390, y: 260, source: Position.Left, target: Position.Top },
      { x: 40, y: 260, source: Position.Right, target: Position.Right },
    ][index];
    return {
      id: stage.key,
      position: { x: placement.x, y: placement.y },
      sourcePosition: placement.source,
      targetPosition: placement.target,
      data: {
        label: <div className="text-left">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#49634f]">Chặng {index + 1} · {counts[stage.key]} hoạt động</span>
          <strong className="mt-2 block font-display text-lg leading-6 text-[#17392f]">{stage.label}</strong>
          <span className="mt-2 block text-xs leading-5 text-[#4b6456]">{stage.hint}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#315a3f]">
            {index < currentPhase ? <Check className="size-3.5" /> : current ? <Clock3 className="size-3.5" /> : <ArrowRight className="size-3.5" />}
            {index < currentPhase ? "Đã qua" : current ? "Đang ở chặng này" : "Chặng tiếp theo"}
          </span>
        </div>,
      },
      style: {
        width: 250,
        border: selectedNode ? "2px solid #b9432d" : current ? "2px solid #315e42" : "1px solid #c9d7ca",
        borderRadius: 18,
        background: stage.color,
        padding: 16,
        boxShadow: selectedNode ? "0 16px 32px rgba(141,63,42,.18)" : "0 12px 24px rgba(22,59,43,.1)",
      },
    };
  });
  const edges: Edge[] = stages.slice(0, -1).map((stage, index) => {
    const isCurrentEdge = index === currentPhase - 1 || stage.key === selectedStage;
    return {
      id: `${stage.key}-${stages[index + 1].key}`,
      ariaLabel: `Từ ${stage.label} đến ${stages[index + 1].label}`,
      source: stage.key,
      target: stages[index + 1].key,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCurrentEdge ? "#315e42" : "#7c9c80",
      },
      style: {
        stroke: isCurrentEdge ? "#315e42" : "#7c9c80",
        strokeWidth: isCurrentEdge ? 3.5 : 2.5,
      },
    };
  });

  return <div className="space-y-5">
    <section aria-labelledby="phase-title" className="overflow-hidden rounded-[20px] border border-[#dce5dc] bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#526f59]">Cây tiến độ</p>
          <h2 id="phase-title" className="mt-1 font-display text-xl font-extrabold">Chiến dịch đi qua bốn chặng</h2>
        </div>
        <p className="text-xs text-[#526b58]">Chọn chặng trên sơ đồ hoặc trong hàng nút bên dưới.</p>
      </div>
      <div className="gop-journey-flow mx-4 mt-4 hidden h-[480px] overflow-hidden rounded-2xl border border-[#dbe6d9] md:block sm:mx-6" aria-label="Sơ đồ bốn chặng của chiến dịch">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.55}
          maxZoom={1.4}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          ariaLabelConfig={{
            "node.a11yDescription.default": "Chọn chặng bằng các nút bên dưới sơ đồ để lọc nhật ký.",
            "edge.a11yDescription.default": "Đường nối giữa hai chặng của chiến dịch.",
            "controls.ariaLabel": "Điều khiển sơ đồ",
            "controls.zoomIn.ariaLabel": "Phóng to sơ đồ",
            "controls.zoomOut.ariaLabel": "Thu nhỏ sơ đồ",
            "controls.fitView.ariaLabel": "Xem toàn bộ sơ đồ",
          }}
          onNodeClick={(_, node) => setSelectedStage(node.id as StageKey)}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ccd9cc" />
          <Controls showInteractive={false} aria-label="Phóng to, thu nhỏ sơ đồ" />
        </ReactFlow>
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" role="group" aria-label="Lọc hoạt động theo chặng">
          <button type="button" aria-pressed={selectedStage === "ALL"} onClick={() => setSelectedStage("ALL")}
            className={`min-h-11 rounded-xl border px-3 text-left text-sm font-bold transition-colors ${selectedStage === "ALL" ? "border-[#315e42] bg-[#315e42] text-white" : "border-[#d4dfd4] bg-white text-[#315a3f] hover:bg-[#f2f6ef]"}`}>
            Tất cả
          </button>
          {stages.map((stage, index) => <button key={stage.key} type="button" aria-pressed={selectedStage === stage.key} onClick={() => setSelectedStage(stage.key)}
            className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${selectedStage === stage.key ? "border-[#b9432d] bg-[#fff0e7] text-[#863b2a]" : "border-[#d4dfd4] bg-white text-[#315a3f] hover:bg-[#f2f6ef]"}`}>
            <span className="mr-1 text-xs opacity-70">{index + 1}.</span>{stage.label} <span className="text-xs opacity-70">({counts[stage.key]})</span>
          </button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f3f6ef] px-4 py-3 text-sm leading-6 text-[#3d5c47]" role="status">
          <p>
            {selected ? `${selected.label}: ${selected.hint}. ${counts[selected.key]} hoạt động bạn có quyền xem.`
              : `Đang xem toàn bộ ${events.length} hoạt động được lưu và được phép xem.`}
          </p>
          <button
            type="button"
            onClick={() => setInspectStageKey((selected?.key ?? stages[currentPhase]?.key ?? "PREPARATION") as StageKey)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#c5d6c5] bg-white px-3 text-xs font-bold text-[#28513b] hover:border-[#527759]"
          >
            <Layers className="size-3.5" /> Mô hình 3D & quy tắc chặng
          </button>
        </div>
      </div>
    </section>

    <section aria-labelledby="events-title" className="rounded-[20px] border border-[#dce5dc] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#526f59]">Theo lần thao tác</p>
          <h2 id="events-title" className="mt-1 font-display text-xl font-extrabold">Dòng hoạt động{selected ? ` · ${selected.label}` : ""}</h2>
        </div>
        <span className="rounded-lg bg-[#f1f5ee] px-3 py-1.5 text-xs font-bold">{visibleEvents.length} mục</span>
      </div>
      {visibleEvents.length ? <ol className="mt-6 border-l-2 border-[#cbdccb] pl-5 sm:pl-7">
        {visibleEvents.map((event) => <li key={event.id} className="relative pb-7 last:pb-0">
          <span className="absolute -left-[30px] top-1 size-4 rounded-full border-[3px] border-white bg-[#527759] ring-1 ring-[#b8cfbb] sm:-left-[38px]" />
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#526d5b]">
            <span className="rounded bg-[#e9f0e8] px-2 py-1 font-bold text-[#28513b]">{event.eventType === "UPDATE_TASK_STATUS" ? "Việc nhóm" : stages.find((stage) => stage.key === event.stage)?.label ?? event.stage}</span>
            <span>{formatDate(event.createdAt)}</span><span aria-hidden="true">·</span><span>{scopeNames[event.visibility] ?? event.visibility}</span>
          </div>
          <h3 className="mt-2 text-sm font-extrabold sm:text-base">{event.title}</h3>
          <p className="mt-1 text-xs text-[#526d5b]">{roleNames[event.actorRole] ?? event.actorRole} · {event.actor}</p>
          {event.detail ? <p className="mt-2 max-w-2xl rounded-xl bg-[#f7f8f3] px-3 py-2.5 text-sm leading-6 text-[#476252]">{event.eventType === "UPDATE_TASK_STATUS" && event.detail === "Trạng thái: DONE." ? "Công việc được đánh dấu đã xong." : event.detail}</p> : null}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setInspectEvent(event)}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#d4dfd4] bg-white px-2.5 text-[11px] font-bold text-[#315a3f] hover:bg-[#f2f6ef]"
            >
              <Eye className="size-3" /> Chi tiết bản ghi
            </button>
          </div>
        </li>)}
      </ol> : <div className="mt-6 rounded-xl border border-dashed border-[#cbdccb] bg-[#fafbf8] p-5">
        <p className="font-semibold">{selected ? "Chặng này chưa có thao tác được ghi" : viewer === "GUEST" ? "Chưa có cập nhật công khai mới" : "Chưa có thao tác mới để hiển thị"}</p>
        <p className="mt-2 text-sm leading-6 text-[#5e7366]">Nhật ký chỉ bắt đầu từ thao tác đã lưu vào SQLite và nằm trong quyền xem của bạn. Chọn chặng khác hoặc xem tất cả để đối chiếu.</p>
      </div>}
    </section>

    <Modal
      open={Boolean(activeStageForModal)}
      onClose={() => setInspectStageKey(null)}
      badge="Mô hình 3D & chặng tiến độ"
      title={activeStageForModal ? `Chặng: ${activeStageForModal.label}` : "Chi tiết chặng"}
      description={activeStageForModal?.hint}
    >
      {activeStageForModal ? (
        <div className="space-y-4 text-sm leading-6 text-ink-soft">
          <div className="overflow-hidden rounded-2xl border border-[#d4dfd4] bg-[#f4f7f1] p-3.5">
            <div className="grid gap-4 sm:grid-cols-[190px_1fr] sm:items-center">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[#d4dfd4] bg-white">
                <Image
                  src="/images/editorial/hanh-trinh-du-an-3d.png"
                  alt="Minh họa 3D bốn chặng vận hành chiến dịch"
                  fill
                  sizes="190px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#315a3f]">
                  Trạng thái ghi nhận trong SQLite
                </p>
                <p className="mt-1 font-display text-base font-extrabold text-[#17392f]">
                  {counts[activeStageForModal.key]} hoạt động thuộc quyền xem của bạn
                </p>
                <p className="mt-1 text-xs leading-5 text-[#4b6456]">
                  Quyền xem hiện tại: {viewer === "OWNER" ? "Chủ dự án" : (roleNames[viewer] ?? viewer)}. Chỉ các thao tác thật đã lưu vào cơ sở dữ liệu trên máy mới xuất hiện trong chặng này.
                </p>
              </div>
            </div>
          </div>
          <div className=" flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedStage(activeStageForModal.key);
                setInspectStageKey(null);
              }}
              className="button-dark"
            >
              Lọc dòng hoạt động theo chặng này
            </button>
          </div>
        </div>
      ) : null}
    </Modal>

    <Modal
      open={Boolean(inspectEvent)}
      onClose={() => setInspectEvent(null)}
      badge={inspectEvent ? `EVENT · ${inspectEvent.eventType}` : "Chi tiết sự kiện"}
      title={inspectEvent?.title ?? "Chi tiết bản ghi"}
      description={inspectEvent ? `${formatDate(inspectEvent.createdAt)} · Phạm vi: ${scopeNames[inspectEvent.visibility] ?? inspectEvent.visibility}` : undefined}
    >
      {inspectEvent ? (
        <div className="space-y-4 text-sm leading-6 text-ink-soft">
          <div className="rounded-xl border border-line bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Nội dung bản ghi</p>
            <p className="mt-1.5">
              {inspectEvent.detail
                ? inspectEvent.eventType === "UPDATE_TASK_STATUS" && inspectEvent.detail === "Trạng thái: DONE."
                  ? "Công việc được đánh dấu đã xong."
                  : inspectEvent.detail
                : "Thao tác đã được ghi nhận vào nhật ký chiến dịch."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3.5">
              <p className="text-xs font-bold text-ink">Người thực hiện</p>
              <p className="mt-1 text-xs text-ink-soft">
                {roleNames[inspectEvent.actorRole] ?? inspectEvent.actorRole} · {inspectEvent.actor}
              </p>
            </div>
            <div className="rounded-xl border border-line p-3.5">
              <p className="text-xs font-bold text-ink">Chặng & phạm vi hiển thị</p>
              <p className="mt-1 text-xs text-ink-soft">
                {stages.find((stage) => stage.key === inspectEvent.stage)?.label ?? inspectEvent.stage} · {scopeNames[inspectEvent.visibility] ?? inspectEvent.visibility}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  </div>;
}
