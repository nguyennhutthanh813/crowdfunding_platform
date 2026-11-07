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
import { ArrowRight, GitBranch, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BackedProject, PaymentStatus } from "@/lib/api/contracts";
import { formatDate, formatVnd } from "@/lib/format";
import { backerFulfillmentText } from "@/lib/pledge/backer-fulfillment";

type TreePart = "backer" | "pledge" | "campaign" | "payment" | "reward";

const paymentText: Record<PaymentStatus, string> = {
  AUTHORIZED: "Đã ghi cam kết, chưa thu tiền",
  CAPTURED: "Mẫu: chốt đạt mục tiêu",
  CANCELED: "Mẫu: cam kết đã hủy",
  FAILED: "Mẫu: giao dịch lỗi",
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
  const [openPart, setOpenPart] = useState<TreePart | null>(null);
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
      body: "Đây là trạng thái dùng để kiểm tra quy trình tất cả hoặc không. Bản web hiện tại chưa nối thẻ, ngân hàng hoặc cổng thanh toán nên không có tiền thật được giữ hay thu.",
    },
    reward: {
      title: "Gói quà",
      value: `${selected.rewardTitle} · ${deliveryText}`,
      body: "Trạng thái giao quà là dữ liệu mẫu. Khi chưa có xử lý đơn hàng thật, trang này chỉ giúp người ủng hộ hình dung bước tiếp theo.",
    },
  };

  const nodeBase = {
    borderRadius: 15,
    padding: 14,
    boxShadow: "0 12px 24px rgba(81,49,27,.11)",
    fontFamily: "var(--font-be-vietnam-pro), sans-serif",
  };
  const nodes: Node[] = [
    {
      id: "backer",
      position: { x: 24, y: 170 },
      sourcePosition: Position.Right,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#91664a]">Người ủng hộ</span>
        <strong className="mt-1 block text-sm leading-5">{backerName}</strong>
        <span className="mt-2 block text-xs">{projects.length} khoản đang theo dõi</span>
      </div> },
      style: { ...nodeBase, width: 190, border: "1px solid #e3c8ac", background: "#fff1e2", color: "#593b2b" },
    },
    {
      id: "pledge",
      position: { x: 265, y: 155 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#f5cfaa]">Khoản cam kết</span>
        <strong className="mt-1 block text-sm leading-5">{formatVnd(selected.amount)}</strong>
        <span className="mt-2 block text-[11px] text-white/80">{selected.referenceCode}</span>
      </div> },
      style: { ...nodeBase, width: 210, border: "2px solid #e7b98b", background: "#663e31", color: "white" },
    },
    {
      id: "campaign",
      position: { x: 535, y: 20 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#497252]">Dự án</span>
        <strong className="mt-1 block line-clamp-2 text-sm leading-5">{selected.campaign.title}</strong>
        <span className="mt-2 block text-xs text-[#52735a]">{selected.campaign.id}</span>
      </div> },
      style: { ...nodeBase, width: 228, border: "1px solid #c7dcc2", background: "#eef5e9", color: "#193c2e" },
    },
    {
      id: "payment",
      position: { x: 535, y: 167 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#805a43]">Dòng tiền</span>
        <strong className="mt-1 block text-sm leading-5">{paymentText[selected.paymentStatus]}</strong>
      </div> },
      style: { ...nodeBase, width: 228, border: "1px solid #e5d0bd", background: "#fff6ec", color: "#5a382a" },
    },
    {
      id: "reward",
      position: { x: 535, y: 305 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#5e6e89]">Gói quà</span>
        <strong className="mt-1 block line-clamp-2 text-sm leading-5">{selected.rewardTitle}</strong>
        <span className="mt-2 block text-xs text-[#5e6e89]">{deliveryText}</span>
      </div> },
      style: { ...nodeBase, width: 228, border: "1px solid #cbd7e8", background: "#f0f5fb", color: "#29445f" },
    },
  ];
  const edges: Edge[] = [
    { id: "backer-pledge", source: "backer", target: "pledge", ariaLabel: "Tài khoản có khoản cam kết" },
    { id: "pledge-campaign", source: "pledge", target: "campaign", ariaLabel: "Khoản cam kết thuộc dự án" },
    { id: "pledge-payment", source: "pledge", target: "payment", ariaLabel: "Khoản cam kết có trạng thái dòng tiền" },
    { id: "pledge-reward", source: "pledge", target: "reward", ariaLabel: "Khoản cam kết chọn gói quà" },
  ].map((edge) => ({
    ...edge,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#b88b6c" },
    style: { stroke: "#b88b6c", strokeWidth: 2.5 },
  }));

  return (
    <section aria-labelledby="backer-tree-title" className="mt-6 overflow-hidden rounded-[20px] border border-[#e4c9af] bg-[#fffaf4] shadow-[0_16px_40px_rgba(93,58,31,.07)]">
      <div className="border-b border-[#ead7c3] bg-[#faead8] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-bold text-[#8b5138]"><GitBranch className="size-4" /> Sơ đồ khoản ủng hộ</p>
        <h3 id="backer-tree-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#4a2f29]">Khoản cam kết này gắn với đâu?</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#795a4d]">Chọn một khoản để xem dự án, trạng thái dòng tiền và gói quà của riêng khoản đó.</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Chọn khoản ủng hộ trên sơ đồ">
          {projects.map((item) => <button
            key={item.pledgeId}
            type="button"
            aria-pressed={item.pledgeId === selected.pledgeId}
            onClick={() => { setSelectedId(item.pledgeId); setOpenPart(null); }}
            className={`min-h-11 rounded-xl border px-3 py-2 text-left text-[13px] font-bold ${item.pledgeId === selected.pledgeId
              ? "border-[#744730] bg-[#744730] text-white"
              : "border-[#d9b99a] bg-white text-[#744730] hover:bg-[#fff6ec]"}`}
          >{item.campaign.title}</button>)}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_275px]">
        <div>
          <div className="gop-pledge-tree hidden h-[440px] overflow-hidden rounded-2xl border border-[#ebdac7] bg-white lg:block" aria-label="Cây quan hệ của khoản cam kết đang chọn">
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
              onNodeClick={(_, node) => setOpenPart(node.id as TreePart)}
            >
              <Background variant={BackgroundVariant.Dots} gap={19} size={1} color="#efdfd0" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className="lg:hidden">
            <button type="button" onClick={() => setOpenPart("backer")} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#e3c8ac] bg-[#fff1e2] px-4 text-left text-sm font-bold text-[#593b2b]">
              {backerName} <span className="text-[13px]">{projects.length} khoản</span>
            </button>
            <div className="ml-5 border-l-2 border-[#d4aa84] pb-1 pl-4 pt-3">
              <button type="button" onClick={() => setOpenPart("pledge")} className="min-h-12 w-full rounded-xl bg-[#663e31] px-4 py-3 text-left text-sm font-bold text-white">
                {formatVnd(selected.amount)} · {selected.referenceCode}
              </button>
              <div className="ml-5 grid gap-2 border-l-2 border-[#d4aa84] pb-1 pl-4 pt-3">
                {(["campaign", "payment", "reward"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-12 rounded-xl border border-[#ead9c8] bg-white px-4 py-3 text-left text-sm font-semibold text-[#563b31]">
                  {details[part].title} <span className="mt-0.5 block text-[13px] leading-5 font-normal text-[#765d50]">{details[part].value}</span>
                </button>)}
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col rounded-[16px] border border-[#ecd8c4] bg-white p-5">
          <StatusBadge status={selected.campaign.status} />
          <h4 className="mt-3 font-display text-lg font-extrabold leading-6 text-[#4a2f29]">{selected.campaign.title}</h4>
          <p className="mt-2 text-sm font-bold text-[#a04e32]">{formatVnd(selected.amount)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#795a4d]"><ReceiptText className="size-4" /> {selected.referenceCode}</p>
          <div className="mt-4 space-y-2 border-y border-[#eee0d1] py-4 text-[13px] leading-5 text-[#684d40]">
            <p><strong>Dòng tiền:</strong> {paymentText[selected.paymentStatus]}</p>
            <p><strong>Gói quà:</strong> {selected.rewardTitle}</p>
            <p><strong>Giao quà:</strong> {deliveryText}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Giải thích các nhánh của khoản ủng hộ">
            {parts.map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-10 rounded-lg border border-[#e6d4c1] px-2.5 text-xs font-semibold text-[#744730] hover:bg-[#fff2e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#744730]">{details[part].title}</button>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#795a4d]">Cam kết và trạng thái thanh toán ở đây chỉ dùng để thử luồng; chưa có tiền thật.</p>
          <div className="mt-auto pt-4">
            <Link href={`/projects/${selected.campaign.slug}`} className="button-primary w-full">Mở trang dự án <ArrowRight className="size-4" /></Link>
          </div>
        </aside>
      </div>

      <Modal open={openPart !== null} title={openPart ? details[openPart].title : ""} description={selected.campaign.title} onClose={() => setOpenPart(null)} size="sm">
        {openPart ? <div>
          <p className="text-base font-bold text-[#563b31]">{details[openPart].value}</p>
          <p className="mt-3 text-sm leading-6 text-[#795a4d]">{details[openPart].body}</p>
          <Link href={`/projects/${selected.campaign.slug}`} onClick={() => setOpenPart(null)} className="button-primary mt-5 w-full">Mở trang dự án <ArrowRight className="size-4" /></Link>
        </div> : null}
      </Modal>
    </section>
  );
}
