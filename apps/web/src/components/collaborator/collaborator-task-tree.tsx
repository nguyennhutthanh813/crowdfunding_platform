"use client";

import {
  Background,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { CampaignWorkspaceTask } from "@/lib/api";

export type CollaboratorCampaignNodeItem = {
  campaignId: string;
  title: string;
  category: string;
  status: string;
  accepted: boolean;
  openQuestionCount: number;
  openTaskCount: number;
  permissions: {
    canUpdate: boolean;
    canReply: boolean;
    canViewAi: boolean;
  };
};

type HandoffSummary = {
  title: string;
  note: string;
  from: string;
  to: string;
  at: string;
};

type TreeFocusItem = {
  id: string;
  kind: "TASK" | "CAMPAIGN";
  code: string;
  campaignTitle: string;
  title: string;
  statusLabel: string;
  dueOrMeta: string;
  stageLabel: string;
  stageSummary: string;
  permissionSummary: string;
  handoffSummary: string;
  impactSummary: string;
  actionHref: string;
  actionLabel: string;
  timelineHref?: string;
};

const edgeColor = "#047857";

function nodeStyle(selected: boolean, accent = false) {
  return {
    width: 224,
    borderRadius: 16,
    border: selected
      ? "2px solid #047857"
      : accent
        ? "1px solid #A7F3D0"
        : "1px solid #E2E8F0",
    background: selected ? "#047857" : accent ? "#ECFDF5" : "#ffffff",
    color: selected ? "#ffffff" : "#0F172A",
    padding: "12px 14px",
    boxShadow: selected
      ? "0 14px 30px rgba(4, 120, 87, 0.2)"
      : "0 8px 20px rgba(15, 23, 42, 0.06)",
    cursor: "pointer",
  };
}

function NodeLabel({
  step,
  title,
  detail,
  selected,
}: {
  step: string;
  title: string;
  detail: string;
  selected: boolean;
}) {
  return (
    <div className="text-left">
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
          selected ? "text-emerald-200" : "text-[#047857]"
        }`}
      >
        {step}
      </p>
      <p className="mt-1 line-clamp-2 font-display text-sm font-extrabold leading-snug">
        {title}
      </p>
      <p
        className={`mt-1 line-clamp-2 text-[11px] leading-4 ${
          selected ? "text-white/80" : "text-slate-600"
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

export function CollaboratorTaskTree({
  collaboratorName,
  specialistRole,
  tasks,
  permissions,
  handoff,
  invitations,
  localDbAvailable,
}: {
  collaboratorName: string;
  specialistRole: string;
  tasks: CampaignWorkspaceTask[];
  permissions: string[];
  handoff?: HandoffSummary;
  invitations: CollaboratorCampaignNodeItem[];
  localDbAvailable: boolean;
}) {
  const items = useMemo<TreeFocusItem[]>(() => {
    const taskItems: TreeFocusItem[] = tasks.map((task) => {
      const done = task.status === "DONE";
      const isForecast = task.hrefByRole.collaborator.includes("forecast");
      return {
        id: task.id,
        kind: "TASK",
        code: `TASK · ${task.id.toUpperCase()}`,
        campaignTitle: "ORBIT One — Máy pha cà phê thông minh",
        title: task.title,
        statusLabel: done
          ? "Đã hoàn tất"
          : task.priority === "HIGH"
            ? "Đang mở · Ưu tiên cao"
            : "Đang mở trong ca",
        dueOrMeta: `${task.assigneeName} · ${task.dueLabel}`,
        stageLabel: isForecast
          ? "Chặng 3 · Gọi vốn & đối chiếu số liệu"
          : "Chặng 3 · Gọi vốn & chăm sóc cộng đồng",
        stageSummary: task.detail,
        permissionSummary: permissions.length
          ? `Được cấp: ${permissions.join(", ")}. Không tự đổi mục tiêu vốn hoặc danh sách thành viên.`
          : "Đang ở chế độ xem; cần chủ dự án bật quyền trước khi gửi nội dung mới.",
        handoffSummary: handoff
          ? `${handoff.title} (${handoff.from} → ${handoff.to} · ${handoff.at}). ${handoff.note}`
          : "Khi đánh dấu xong, trạng thái công việc cập nhật ngay về bàn vận hành của Chủ dự án.",
        impactSummary: done
          ? "Đầu việc đã hoàn tất; Chủ dự án nhìn thấy kết quả bàn giao và lịch sử thao tác của nhóm."
          : "Sau khi xử lý, phản hồi gắn nhãn Cộng tác viên hoặc bản tin mới sẽ hiển thị trên trang dự án.",
        actionHref: task.hrefByRole.collaborator,
        actionLabel: isForecast ? "Mở bảng dự báo" : "Mở khu vực xử lý việc này",
        timelineHref: localDbAvailable ? "/campaigns/cmp_orbit/timeline" : undefined,
      };
    });

    const campaignItems: TreeFocusItem[] = invitations.map((item) => {
      const allowed = [
        item.permissions.canUpdate && "Đăng cập nhật",
        item.permissions.canReply && "Trả lời cộng đồng",
        item.permissions.canViewAi && "Xem dự báo",
      ].filter(Boolean);
      return {
        id: `inv_${item.campaignId}`,
        kind: "CAMPAIGN",
        code: `CAMPAIGN · ${item.campaignId.toUpperCase()}`,
        campaignTitle: item.title,
        title: item.accepted
          ? item.openTaskCount > 0
            ? `${item.openTaskCount} việc đang chờ bạn ở ${item.title}`
            : item.openQuestionCount > 0
            ? `${item.openQuestionCount} câu hỏi đang chờ bạn ở ${item.title}`
            : `Phối hợp nội dung cho ${item.title}`
          : `Lời mời tham gia ${item.title}`,
        statusLabel: item.accepted
          ? item.status === "LIVE"
            ? "Đã nhận · Đang gọi vốn"
            : "Đã nhận · Đã duyệt"
          : "Chờ xác nhận lời mời",
        dueOrMeta: `${item.category} · ${
          item.openTaskCount > 0
            ? `${item.openTaskCount} việc đang mở`
            : item.openQuestionCount > 0
            ? `${item.openQuestionCount} câu hỏi được giao`
            : item.accepted
              ? "Đã mở quyền cộng tác"
              : "Cần xác nhận trước khi thao tác"
        }`,
        stageLabel:
          item.status === "LIVE"
            ? "Chặng 3 · Gọi vốn & trả lời câu hỏi được giao"
            : "Chặng 2 · Đã duyệt, chuẩn bị mở gọi vốn",
        stageSummary: item.accepted
          ? "Cộng tác viên chỉ thao tác trong phạm vi chiến dịch đã nhận lời mời; câu hỏi nào được giao sẽ hiện trong hộp thông báo."
          : "Chủ dự án đã thêm email của bạn vào hồ sơ. Quyền thao tác chỉ mở sau khi bạn bấm chấp nhận lời mời.",
        permissionSummary: allowed.length
          ? `${item.accepted ? "Quyền hiện có" : "Quyền đề nghị"}: ${allowed.join(", ")}.`
          : "Chỉ xem thông tin nội bộ của chiến dịch.",
        handoffSummary: item.accepted
          ? "Mỗi bản tin hoặc câu trả lời bạn gửi đều gắn nhãn Cộng tác viên và đồng bộ sang bàn Chủ dự án."
          : "Sau khi xác nhận lời mời tại trang này, bạn có thể mở bàn cộng tác của chiến dịch để làm việc.",
        impactSummary:
          "Quyền được lưu tách biệt theo từng chiến dịch trong campaign_members, không làm lộ dữ liệu sang dự án khác.",
        actionHref: item.accepted
          ? `/collaborator/campaigns/${item.campaignId}/manage${
              item.openTaskCount > 0 ? "#cong-viec-nhom" : item.openQuestionCount > 0 ? "#cau-hoi-cong-dong" : ""
            }`
          : "#loi-moi",
        actionLabel: item.accepted ? "Mở phần việc chiến dịch" : "Xem lời mời ở đầu trang",
        timelineHref: localDbAvailable
          ? `/campaigns/${item.campaignId}/timeline`
          : undefined,
      };
    });

    return [...taskItems, ...campaignItems];
  }, [handoff, invitations, localDbAvailable, permissions, tasks]);

  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState("task");
  const [displayMode, setDisplayMode] = useState<"flow" | "cards">("flow");
  const [openModalNodeId, setOpenModalNodeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const current = items.find((item) => item.id === selectedId) ?? items[0];
  if (!current) return null;

  const nodeDescriptions: Record<
    string,
    { step: string; title: string; summary: string; detail: string }
  > = {
    source: {
      step: "1. Nguồn giao việc",
      title: current.campaignTitle,
      summary: `Chủ dự án phân công cho ${collaboratorName}`,
      detail: `Đầu việc thuộc chiến dịch "${current.campaignTitle}". Bạn tham gia với vai trò ${specialistRole} và nhận việc theo đúng phạm vi được phân quyền.`,
    },
    task: {
      step: "2. Tác vụ đang chọn",
      title: current.title,
      summary: `${current.statusLabel} · ${current.dueOrMeta}`,
      detail: `${current.title} (${current.code}). Trạng thái hiện tại: ${current.statusLabel}. Thông tin thời hạn và phụ trách: ${current.dueOrMeta}.`,
    },
    permission: {
      step: "3. Quyền & giới hạn",
      title: permissions.length
        ? `${permissions.length} quyền trong ca`
        : "Kiểm tra quyền theo chiến dịch",
      summary: current.permissionSummary,
      detail: current.permissionSummary,
    },
    stage3d: {
      step: "4. Trạm hành trình 3D & bàn giao",
      title: current.stageLabel,
      summary: current.stageSummary,
      detail: `${current.stageSummary} ${current.handoffSummary}`,
    },
    impact: {
      step: "5. Tác động liên thông",
      title: "Xưởng chiến dịch & Cộng đồng",
      summary: current.impactSummary,
      detail: current.impactSummary,
    },
  };

  const nodes: Node[] = [
    {
      id: "source",
      position: { x: 16, y: 88 },
      sourcePosition: Position.Right,
      data: {
        label: (
          <NodeLabel
            step="1. Nguồn giao việc"
            title={current.campaignTitle}
            detail={`Vai trò: ${specialistRole}`}
            selected={selectedNodeId === "source"}
          />
        ),
      },
      style: nodeStyle(selectedNodeId === "source"),
    },
    {
      id: "task",
      position: { x: 286, y: 88 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: {
        label: (
          <NodeLabel
            step="2. Tác vụ đang chọn"
            title={current.title}
            detail={current.statusLabel}
            selected={selectedNodeId === "task"}
          />
        ),
      },
      style: nodeStyle(selectedNodeId === "task", true),
    },
    {
      id: "permission",
      position: { x: 560, y: 12 },
      targetPosition: Position.Left,
      data: {
        label: (
          <NodeLabel
            step="3. Quyền cộng tác"
            title={
              permissions.length
                ? `${permissions.length} quyền được bật`
                : "Phân quyền riêng"
            }
            detail={current.permissionSummary}
            selected={selectedNodeId === "permission"}
          />
        ),
      },
      style: nodeStyle(selectedNodeId === "permission"),
    },
    {
      id: "stage3d",
      position: { x: 560, y: 108 },
      targetPosition: Position.Left,
      data: {
        label: (
          <NodeLabel
            step="4. Trạm 3D & bàn giao"
            title={current.stageLabel}
            detail={current.stageSummary}
            selected={selectedNodeId === "stage3d"}
          />
        ),
      },
      style: nodeStyle(selectedNodeId === "stage3d"),
    },
    {
      id: "impact",
      position: { x: 560, y: 204 },
      targetPosition: Position.Left,
      data: {
        label: (
          <NodeLabel
            step="5. Liên thông dữ liệu"
            title="Xưởng dự án & Cộng đồng"
            detail={current.impactSummary}
            selected={selectedNodeId === "impact"}
          />
        ),
      },
      style: nodeStyle(selectedNodeId === "impact"),
    },
  ];

  const edges: Edge[] = [
    {
      id: "source-task",
      source: "source",
      target: "task",
      animated: true,
      style: {
        stroke:
          selectedNodeId === "source" || selectedNodeId === "task"
            ? "#173d65"
            : edgeColor,
        strokeWidth:
          selectedNodeId === "source" || selectedNodeId === "task" ? 2.8 : 2,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    },
    {
      id: "task-permission",
      source: "task",
      target: "permission",
      animated: true,
      style: {
        stroke: selectedNodeId === "permission" ? "#173d65" : edgeColor,
        strokeWidth: selectedNodeId === "permission" ? 2.8 : 1.8,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    },
    {
      id: "task-stage3d",
      source: "task",
      target: "stage3d",
      animated: true,
      style: {
        stroke: selectedNodeId === "stage3d" ? "#173d65" : edgeColor,
        strokeWidth: selectedNodeId === "stage3d" ? 2.8 : 1.8,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    },
    {
      id: "task-impact",
      source: "task",
      target: "impact",
      animated: true,
      style: {
        stroke: selectedNodeId === "impact" ? "#173d65" : edgeColor,
        strokeWidth: selectedNodeId === "impact" ? 2.8 : 1.8,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    },
  ];

  const collaboratorSteps = (
    ["source", "task", "permission", "stage3d", "impact"] as const
  ).map((nodeKey, index) => ({
    id: nodeKey,
    code: `0${index + 1}`,
    title: nodeDescriptions[nodeKey].step,
    subtitle: nodeDescriptions[nodeKey].title,
    detail: nodeDescriptions[nodeKey].summary,
    metric: nodeKey === "task" ? current.statusLabel : undefined,
  }));

  const activeNode = nodeDescriptions[selectedNodeId] ?? nodeDescriptions.task;
  const modalNode = openModalNodeId
    ? (nodeDescriptions[openModalNodeId] ?? activeNode)
    : null;

  return (
    <section
      aria-label="Cây tác vụ và phân quyền cộng tác"
      className="overflow-hidden rounded-[20px] border border-line bg-surface p-5 text-ink shadow-card sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow text-[#047857]">
            <GitBranch className="size-4" /> Cây tác vụ logic &amp; phân quyền
          </p>
          <h2 className="mt-1.5 font-display text-xl font-extrabold tracking-[-0.03em] sm:text-2xl">
            Bản đồ tác vụ cộng tác của {collaboratorName}
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-ink-soft">
            Chọn một đầu việc hoặc chiến dịch được mời để xem luồng giao việc từ Chủ dự án, phạm vi quyền và nơi nhận kết quả bàn giao.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-line bg-canvas-soft p-1" role="group" aria-label="Chế độ hiển thị tác vụ cộng tác">
            <button
              type="button"
              aria-pressed={displayMode === "flow" && expanded}
              onClick={() => { setDisplayMode("flow"); setExpanded(true); }}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "flow" && expanded ? "bg-[#047857] text-white" : "text-ink-soft hover:bg-surface hover:text-ink"
              }`}
            >
              <GitBranch className="size-3.5" /> Sơ đồ cây
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "cards" && expanded}
              onClick={() => { setDisplayMode("cards"); setExpanded(true); }}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                displayMode === "cards" && expanded ? "bg-[#047857] text-white" : "text-ink-soft hover:bg-surface hover:text-ink"
              }`}
            >
              <Layers className="size-3.5" /> Danh sách thẻ
            </button>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#047857] bg-[#047857] px-3.5 text-xs font-bold text-white hover:bg-[#065F46]"
          >
            {expanded ? "Thu gọn sơ đồ" : "Mở sơ đồ quy trình"}
          </button>
        </div>
      </div>

      {expanded ? (
      <>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Chọn tác vụ hoặc chiến dịch cộng tác">
        {items.map((item) => {
          const active = item.id === current.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setSelectedId(item.id);
                setSelectedNodeId("task");
                setExpanded(true);
              }}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-left text-xs font-bold transition ${
                active
                  ? "border-[#047857] bg-[#047857] text-white"
                  : "border-line bg-canvas-soft text-ink-soft hover:border-[#059669] hover:text-ink"
              }`}
            >
              {item.kind === "TASK" ? (
                <ClipboardList className="size-3.5 shrink-0" />
              ) : (
                <Users className="size-3.5 shrink-0" />
              )}
              <span className="line-clamp-1 max-w-[240px]">{item.title}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {displayMode === "cards" ? (
            <div className="rounded-2xl border border-line bg-canvas-soft/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#047857]">
                    Phần việc được giao · {current.statusLabel}
                  </p>
                  <h4 className="mt-0.5 text-sm font-bold text-ink">
                    {current.title}
                  </h4>
                </div>
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]">
                  {current.campaignTitle}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {collaboratorSteps.map((step) => {
                  const isActive = selectedNodeId === step.id;
                  return (
                    <div
                      key={step.id}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 transition ${
                        isActive
                          ? "border-[#047857] bg-[#ECFDF5]/60"
                          : "border-line bg-surface hover:border-[#059669]/45"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-[#047857]/10 px-2 py-0.5 text-[11px] font-extrabold text-[#047857]">
                            Chặng {step.code}
                          </span>
                          {step.metric ? (
                            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-[#047857] ring-1 ring-line">
                              {step.metric}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-[#047857]">
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
                          onClick={() => setSelectedNodeId(step.id)}
                          className={`inline-flex min-h-8 items-center rounded-lg px-2.5 text-xs font-bold transition ${
                            isActive
                              ? "bg-[#047857] text-white"
                              : "border border-line bg-surface text-ink-soft hover:bg-canvas-soft"
                          }`}
                        >
                          {isActive ? "Đang chọn" : "Chọn chặng"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNodeId(step.id);
                            setOpenModalNodeId(step.id);
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
              <div className="hidden h-[300px] overflow-hidden rounded-2xl border border-line bg-surface lg:block">
                <ReactFlow
                  key={current.id}
                  nodes={nodes}
                  edges={edges}
                  fitView
                  fitViewOptions={{ padding: 0.16 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable
                  panOnDrag={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  zoomOnDoubleClick={false}
                  preventScrolling={false}
                  proOptions={{ hideAttribution: true }}
                  onNodeClick={(_, node) => {
                    setSelectedNodeId(node.id);
                    setOpenModalNodeId(node.id);
                  }}
                >
                  <Background color="#cbd5e1" gap={18} />
                </ReactFlow>
              </div>

              <div className="grid gap-2.5 lg:hidden">
                {Object.entries(nodeDescriptions).map(([id, item]) => {
                  const selected = id === selectedNodeId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(id);
                        setOpenModalNodeId(id);
                      }}
                      className={`rounded-xl border p-3.5 text-left transition ${
                        selected
                          ? "border-[#047857] bg-[#047857] text-white"
                          : "border-line bg-surface text-ink"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                          selected ? "text-emerald-200" : "text-[#047857]"
                        }`}
                      >
                        {item.step}
                      </p>
                      <p className="mt-1 font-display text-sm font-extrabold">
                        {item.title}
                      </p>
                      <p
                        className={`mt-1 text-xs leading-5 ${
                          selected ? "text-white/80" : "text-ink-soft"
                        }`}
                      >
                        {item.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="flex flex-col justify-between rounded-2xl border border-line bg-canvas-soft/60 p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]">
                {activeNode.step}
              </span>
              <span className="text-[11px] font-semibold text-ink-muted">
                {current.code}
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-extrabold leading-snug text-ink">
              {activeNode.title}
            </h3>
            <p className="mt-2 text-xs leading-6 text-ink-soft">
              {activeNode.detail}
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas-soft">
                  <Image
                    src="/images/3d/ecosystem-launchpad-3d.jpg"
                    alt="Minh họa 3D hành trình bốn chặng của dự án"
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#047857]">
                    <Layers className="size-3" /> Giai đoạn thực hiện
                  </p>
                  <p className="mt-0.5 truncate text-xs font-extrabold text-ink">
                    {current.stageLabel}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-ink-soft">
                    {current.dueOrMeta}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setOpenModalNodeId(selectedNodeId)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-xs font-bold text-ink hover:border-[#047857]"
            >
              <Sparkles className="size-3.5 text-[#7C3AED]" /> Chi tiết nút 3D
            </button>
            <Link
              href={current.actionHref}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#047857] px-3.5 text-xs font-bold text-white hover:bg-[#065F46]"
            >
              {current.actionLabel} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </aside>
      </div>
      </>
      ) : null}

      <Modal
        open={Boolean(modalNode)}
        onClose={() => setOpenModalNodeId(null)}
        badge={modalNode?.step ?? "Chi tiết nút tác vụ"}
        title={modalNode?.title ?? current.title}
        description={`Tác vụ đang xem: ${current.title} (${current.code})`}
        footer={
          <>
            {current.timelineHref ? (
              <Link
                href={current.timelineHref}
                onClick={() => setOpenModalNodeId(null)}
                className="button-secondary"
              >
                Xem nhật ký chiến dịch
              </Link>
            ) : null}
            <Link
              href={current.actionHref}
              onClick={() => setOpenModalNodeId(null)}
              className="button-dark"
            >
              {current.actionLabel} <ArrowRight className="size-4" />
            </Link>
          </>
        }
      >
        <div className="space-y-4 text-sm leading-6 text-ink-soft">
          <div className="overflow-hidden rounded-2xl border border-[#c8d9ec] bg-[#f4f8fc] p-3.5">
            <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-surface">
                <Image
                  src="/images/3d/ecosystem-launchpad-3d.jpg"
                  alt="Mô hình 3D bốn chặng của dự án trên FundViet"
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#2869ac]">
                  Trạm tác vụ trên hành trình 3D
                </p>
                <p className="mt-1 font-display text-base font-extrabold text-[#152b40]">
                  {current.stageLabel}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#48617a]">
                  {current.stageSummary}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">
              Nội dung nút đang chọn
            </p>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">
              {modalNode?.detail}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <ShieldCheck className="size-4 text-[#2869ac]" /> Phạm vi quyền
              </p>
              <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                {current.permissionSummary}
              </p>
            </div>
            <div className="rounded-xl border border-line p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <CheckCircle2 className="size-4 text-emerald-700" /> Bàn giao &
                liên thông
              </p>
              <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                {current.handoffSummary}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}
