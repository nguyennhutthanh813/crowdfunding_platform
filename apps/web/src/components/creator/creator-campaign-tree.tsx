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
import { ArrowRight, GitBranch, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import type { CreatorPortfolioData } from "@/lib/api/contracts";
import { creatorCampaignHref } from "@/lib/creator/campaign-href";
import { formatVnd, fundingPercent } from "@/lib/format";

type TreePart = "owner" | "campaign" | "review" | "team" | "community";

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
  const [openPart, setOpenPart] = useState<TreePart | null>(null);
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
      body: "Số người ủng hộ và tiền cam kết thuộc riêng chiến dịch này. Cam kết trong bản đang chạy chưa giữ thẻ hay thu tiền thật.",
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
        <span className="text-[11px] font-bold text-[#5b705c]">Chủ dự án</span>
        <strong className="mt-1 block text-sm leading-5">{portfolio.owner.name}</strong>
        <span className="mt-2 block text-xs text-[#536c55]">{portfolio.campaigns.length} chiến dịch</span>
      </div> },
      style: { ...nodeBase, width: 194, border: "1px solid #c3d7bf", background: "#edf3e7", color: "#173b2e" },
    },
    {
      id: "campaign",
      position: { x: 274, y: 147 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#d8eaa9]">{statusText[selected.status]}</span>
        <strong className="mt-2 block line-clamp-2 text-sm leading-5">{selected.title}</strong>
        <span className="mt-2 block text-[11px] text-white/75">{selected.category} · {selected.id}</span>
      </div> },
      style: { ...nodeBase, width: 235, border: "2px solid #d5e9a0", background: "#173b2e", color: "#fff" },
    },
    {
      id: "review",
      position: { x: 573, y: 25 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#536b88]">Quản trị viên</span>
        <strong className="mt-1 block text-sm">Xét duyệt</strong>
        <span className="mt-2 block text-xs text-[#536b88]">{reviewText(selected.status)}</span>
      </div> },
      style: { ...nodeBase, width: 190, border: "1px solid #c5d6ea", background: "#eaf2fa", color: "#183b5e" },
    },
    {
      id: "team",
      position: { x: 573, y: 170 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#536b88]">Nhóm được mời</span>
        <strong className="mt-1 block text-sm">{selected.teamSize} thành viên</strong>
        <span className="mt-2 block text-xs text-[#536b88]">{selected.openTaskCount} việc đang mở</span>
      </div> },
      style: { ...nodeBase, width: 190, border: "1px solid #c5d6ea", background: "#eaf2fa", color: "#183b5e" },
    },
    {
      id: "community",
      position: { x: 573, y: 315 },
      targetPosition: Position.Left,
      data: { label: <div className="text-left">
        <span className="text-[11px] font-bold text-[#91533d]">Cộng đồng</span>
        <strong className="mt-1 block text-sm">{selected.backerCount} người ủng hộ</strong>
        <span className="mt-2 block text-xs text-[#835746]">{formatVnd(selected.pledgedAmount, true)} cam kết</span>
      </div> },
      style: { ...nodeBase, width: 190, border: "1px solid #e8cbb4", background: "#fff0e4", color: "#653826" },
    },
  ];
  const edges: Edge[] = [
    { id: "owner-campaign", source: "owner", target: "campaign", ariaLabel: "Chủ dự án sở hữu chiến dịch" },
    { id: "campaign-review", source: "campaign", target: "review", ariaLabel: "Chiến dịch được quản trị viên xét duyệt" },
    { id: "campaign-team", source: "campaign", target: "team", ariaLabel: "Chiến dịch có nhóm cộng tác" },
    { id: "campaign-community", source: "campaign", target: "community", ariaLabel: "Chiến dịch nhận cam kết từ cộng đồng" },
  ].map((edge) => ({
    ...edge,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#82a387" },
    style: { stroke: "#82a387", strokeWidth: 2.5 },
  }));

  return <section id="ban-do-chien-dich" aria-labelledby="creator-tree-title" className="mb-6 overflow-hidden rounded-[22px] border border-[#cbd9c6] bg-[#fbfcf8] shadow-[0_18px_45px_rgba(30,56,41,.06)]">
    <div className="border-b border-[#dbe5d7] bg-[#ecf2e7] px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#3e6948]"><GitBranch className="size-4" /> Bản đồ chiến dịch</p>
          <h2 id="creator-tree-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#173b2e]">Một chủ dự án, nhiều hành trình riêng</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#536858]">Chọn một chiến dịch để xem ai đang tham gia, hồ sơ ở bước nào và tiền cam kết thuộc về đâu.</p>
        </div>
        <span className="rounded-full border border-[#bfd2ba] bg-white px-3 py-2 text-xs font-bold text-[#3a6345]">
          {localDbAvailable ? "SQLite trên máy" : "Lưu trong trình duyệt"}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Chọn chiến dịch trên bản đồ">
        {portfolio.campaigns.map((campaign) => <button
          key={campaign.id}
          type="button"
          aria-pressed={campaign.id === selected.id}
          onClick={() => { setSelectedId(campaign.id); setOpenPart(null); }}
          className={"min-h-11 max-w-full rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors " + (campaign.id === selected.id
            ? "border-[#315b40] bg-[#315b40] text-white"
            : "border-[#c8d9c4] bg-white text-[#315b40] hover:bg-[#f6f9f2]")}
        >{campaign.title}</button>)}
      </div>
    </div>

    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div>
        <div className="gop-campaign-tree hidden h-[465px] overflow-hidden rounded-2xl border border-[#dbe5d7] bg-white lg:block" aria-label="Cây quan hệ của chiến dịch đang chọn">
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
            onNodeClick={(_, node) => setOpenPart(node.id as TreePart)}
          >
            <Background variant={BackgroundVariant.Dots} gap={19} size={1} color="#d6e2d2" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <div className="lg:hidden">
          <button type="button" onClick={() => setOpenPart("owner")} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[#c3d7bf] bg-[#edf3e7] px-4 text-left text-sm font-bold text-[#173b2e]">
            {portfolio.owner.name} <span className="text-[13px]">{portfolio.campaigns.length} chiến dịch</span>
          </button>
          <div className="ml-5 border-l-2 border-[#a8c1a8] pb-1 pl-4 pt-3">
            <button type="button" onClick={() => setOpenPart("campaign")} className="min-h-12 w-full rounded-xl bg-[#173b2e] px-4 py-3 text-left text-sm font-bold text-white">{selected.title}</button>
            <div className="ml-5 grid gap-2 border-l-2 border-[#a8c1a8] pb-1 pl-4 pt-3">
              {(["review", "team", "community"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-12 rounded-xl border border-[#d6e0d2] bg-white px-4 py-3 text-left text-sm font-semibold text-[#284b36]">
                {details[part].title} <span className="mt-0.5 block text-[13px] leading-5 font-normal text-[#617465]">{details[part].value}</span>
              </button>)}
            </div>
          </div>
        </div>
      </div>

      <aside className="flex flex-col rounded-[18px] border border-[#d4e0d0] bg-white p-5">
        <StatusBadge status={selected.status} />
        <h3 className="mt-4 font-display text-lg font-extrabold leading-6 text-[#173b2e]">{selected.title}</h3>
        <p className="mt-2 text-[13px] leading-5 text-[#566d5c]">{selected.nextActionDetail}</p>
        <div className="mt-5 border-y border-[#e2eae0] py-4">
          <div className="flex items-center justify-between gap-3 text-xs"><span>Mục tiêu</span><strong>{selected.goalAmount ? formatVnd(selected.goalAmount, true) : "Chưa đặt"}</strong></div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span>Đã cam kết</span><strong>{formatVnd(selected.pledgedAmount, true)}</strong></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8eee5]" role="progressbar" aria-label={"Tiến độ gọi vốn " + selected.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, percent)} aria-valuetext={`${percent}% mục tiêu`}>
            <span className="block h-full rounded-full bg-[#658c65]" style={{ width: Math.min(100, percent) + "%" }} />
          </div>
          {selected.goalAmount > 0 ? <p className="mt-2 text-right text-xs font-semibold text-[#4d6853]">{percent}% mục tiêu</p> : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#46614d]">
          <span className="flex items-center gap-1"><UsersRound className="size-4" /> {selected.teamSize} thành viên</span>
          <span>{selected.backerCount} người ủng hộ</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Giải thích các nhánh của chiến dịch">
          {(["owner", "campaign", "review", "team", "community"] as const).map((part) => <button key={part} type="button" onClick={() => setOpenPart(part)} className="min-h-10 rounded-lg border border-[#d2dfcf] px-2.5 text-xs font-semibold text-[#315b40] hover:bg-[#f0f5eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315b40]">{details[part].title}</button>)}
        </div>
        <div className="mt-auto pt-5">
          <Link href={manageHref} className="button-primary w-full">{selected.nextActionLabel} <ArrowRight className="size-4" /></Link>
          {localDbAvailable ? <Link href={"/campaigns/" + selected.id + "/timeline"} className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-xs font-bold text-[#315b40] hover:underline">Xem lịch sử thao tác</Link> : null}
        </div>
      </aside>
    </div>

    <Modal open={openPart !== null} title={openPart ? details[openPart].title : ""} description={selected.title} onClose={() => setOpenPart(null)} size="sm">
      {openPart ? <div>
        <p className="text-base font-bold text-[#173b2e]">{details[openPart].value}</p>
        <p className="mt-3 text-sm leading-6 text-[#536858]">{details[openPart].body}</p>
        <Link href={manageHref} onClick={() => setOpenPart(null)} className="button-primary mt-5 w-full">Mở hồ sơ chiến dịch <ArrowRight className="size-4" /></Link>
      </div> : null}
    </Modal>
  </section>;
}
