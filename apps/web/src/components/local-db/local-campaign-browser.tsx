"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface CampaignIndexRow {
  id: string;
  title: string;
  owner: string;
  status: string;
  source: string;
  eventCount: number;
  lastEventAt: string | null;
  memberCount: number;
  rewardCount: number;
  reviewCount: number;
  pledgeCount: number;
}

const statusNames: Record<string, string> = {
  DRAFT: "Bản nháp", IN_REVIEW: "Đang xét duyệt", PRE_LAUNCH: "Đã duyệt, chưa mở",
  LIVE: "Đang gọi vốn", SUCCESSFUL: "Đã đạt mục tiêu", FAILED: "Không đạt mục tiêu",
  SUSPENDED: "Tạm dừng",
};

function lastChanged(value: string | null) {
  if (!value) return "Chưa có thao tác mới";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function LocalCampaignBrowser({ campaigns }: { campaigns: CampaignIndexRow[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"ALL" | "LOCAL" | "SEED">("ALL");
  const normalized = query.trim().toLocaleLowerCase("vi-VN");
  const visible = campaigns.filter((campaign) =>
    (source === "ALL" || campaign.source === source) &&
    (!normalized || `${campaign.title} ${campaign.owner} ${campaign.id}`
      .toLocaleLowerCase("vi-VN").includes(normalized)));

  return (
    <>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-[#607469]" />
          <input id="local-campaign-search" name="local-campaign-search" aria-label="Tìm chiến dịch theo tên, chủ dự án hoặc mã" value={query}
            onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, chủ dự án hoặc mã..."
            className="min-h-11 w-full rounded-xl border border-[#cfddcf] bg-white py-2 pl-10 pr-10 text-sm outline-none placeholder:text-[#7b8d7e] focus:border-[#497557]" />
          {query ? <button type="button" aria-label="Xóa từ khóa" onClick={() => setQuery("")}
            className="absolute right-1 top-1 grid size-9 place-items-center rounded-lg hover:bg-[#edf2e9]"><X className="size-4" /></button> : null}
        </div>
        <div role="group" aria-label="Lọc nguồn chiến dịch" className="flex flex-wrap gap-1 rounded-xl border border-[#dce5db] bg-[#f6f8f4] p-1">
          {([ ["ALL", "Tất cả"], ["LOCAL", "Mới tạo"], ["SEED", "Dữ liệu mẫu"] ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={source === value} onClick={() => setSource(value)}
              className={`min-h-10 rounded-lg px-3 text-xs font-bold transition-colors ${source === value ? "bg-[#244d38] text-white" : "text-[#56705c] hover:bg-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <p role="status" className="mt-3 text-xs text-[#617567]">Đang xem {visible.length}/{campaigns.length} chiến dịch. Số bản ghi trong bộ mẫu chỉ là các ví dụ đại diện.</p>
      {visible.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visible.map((campaign) => (
          <Link key={campaign.id} href={`/campaigns/${encodeURIComponent(campaign.id)}/timeline`}
            className="group flex min-w-0 flex-col justify-between rounded-[15px] border border-[#dee8dd] bg-[#fbfcf9] p-4 transition-colors hover:border-[#8eac90] hover:bg-[#f1f6ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38764b]">
            <div className="flex items-start justify-between gap-2"><span className="rounded-md bg-[#e9f1e7] px-2 py-1 text-[11px] font-bold text-[#376347]">{campaign.source === "LOCAL" ? "Hồ sơ tạo trên máy" : "Dữ liệu mẫu"}</span><ArrowUpRight className="size-4 shrink-0 text-[#577561] group-hover:text-[#204f34]" /></div>
            <h3 className="mt-3 text-sm font-bold leading-5">{campaign.title}</h3>
            <p className="mt-1 text-xs text-[#617567]">{campaign.owner} · {statusNames[campaign.status] ?? campaign.status}</p>
            <dl className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-white/80 p-2 text-center text-[11px] text-[#65786a]">
              {([ ["Thành viên", campaign.memberCount], ["Gói quà", campaign.rewardCount], ["Lượt duyệt", campaign.reviewCount], ["Cam kết*", campaign.pledgeCount] ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mt-0.5 font-bold text-[#264d39]">{value}</dd></div>)}
            </dl>
            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[#e4ebe1] pt-3 text-xs text-[#5b7160]"><span>{campaign.eventCount} thao tác mới</span><span>{lastChanged(campaign.lastEventAt)}</span></div>
          </Link>
        ))}
      </div> : <div className="mt-4 rounded-xl border border-dashed border-[#c9dacb] bg-[#f8faf7] p-5 text-sm text-[#526e59]">
        Không thấy chiến dịch phù hợp. <button type="button" onClick={() => { setQuery(""); setSource("ALL"); }} className="font-bold underline">Xem lại tất cả</button>
      </div>}
      <p className="mt-3 text-[11px] text-[#687d70]">* Số cam kết là số dòng để thử quan hệ khóa ngoại, không phải tổng số người ủng hộ đang hiển thị trên trang chiến dịch mẫu.</p>
    </>
  );
}
