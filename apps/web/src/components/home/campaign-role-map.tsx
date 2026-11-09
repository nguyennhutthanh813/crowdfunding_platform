"use client";

import { ArrowRight, ClipboardCheck, HandHeart, ListTodo, PenLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CampaignCardData, UserRole } from "@/lib/api";
import { formatNumber, formatVnd } from "@/lib/format";

type RoleId = "BACKER" | "CREATOR" | "COLLABORATOR" | "ADMIN";

const roleOptions = [
  {
    id: "BACKER", name: "Người ủng hộ", icon: HandHeart,
    short: "Chọn gói và theo dõi", color: "bg-[#e7f0de] text-[#1c553f]",
  },
  {
    id: "CREATOR", name: "Chủ dự án", icon: PenLine,
    short: "Tạo và vận hành", color: "bg-[#f8ead7] text-[#754623]",
  },
  {
    id: "COLLABORATOR", name: "Cộng tác viên", icon: ListTodo,
    short: "Nhận việc theo lời mời", color: "bg-[#e1eff9] text-[#235876]",
  },
  {
    id: "ADMIN", name: "Quản trị viên", icon: ClipboardCheck,
    short: "Duyệt và giám sát", color: "bg-[#f5e6ea] text-[#793b52]",
  },
] as const;

export function CampaignRoleMap({ campaign, userRoles = [] }: { campaign: CampaignCardData; userRoles?: UserRole[] }) {
  const [activeRole, setActiveRole] = useState<RoleId>("BACKER");
  const details: Record<RoleId, { title: string; body: string; relation: string; href: string; action: string }> = {
    BACKER: {
      title: `${formatNumber(campaign.backerCount)} người đã cùng ủng hộ ${campaign.title}`,
      body: "Xem nội dung, chọn gói phù hợp rồi kiểm tra cam kết trong tài khoản. Một người có thể ủng hộ nhiều chiến dịch.",
      relation: "Tài khoản ↔ chiến dịch qua cam kết",
      href: `/projects/${campaign.slug}`,
      action: "Xem chiến dịch này",
    },
    CREATOR: {
      title: `${campaign.creator.name} là chủ chiến dịch này`,
      body: "Chủ dự án chuẩn bị hồ sơ, gói quà và mời nhóm cùng làm. Một tài khoản có thể sở hữu nhiều chiến dịch riêng.",
      relation: "Một chủ dự án → nhiều chiến dịch",
      href: "/creator/campaigns/new",
      action: "Bắt đầu dự án của bạn",
    },
    COLLABORATOR: {
      title: "Cộng tác viên chỉ thấy việc trong nhóm đã tham gia",
      body: "Người được mời cần chấp nhận bằng đúng tài khoản, rồi mới nhận việc, trả lời câu hỏi hoặc đăng tiến độ theo quyền được cấp.",
      relation: "Tài khoản ↔ chiến dịch qua thành viên",
      href: userRoles.includes("COLLABORATOR") ? "/collaborator" : "/huong-dan#cong-tac-vien",
      action: userRoles.includes("COLLABORATOR") ? "Mở việc nhóm" : "Xem cách tham gia nhóm",
    },
    ADMIN: {
      title: "Quản trị viên giữ vai trò kiểm tra độc lập",
      body: "Hồ sơ đi qua hàng chờ duyệt trước khi mở gọi vốn. Cảnh báo rủi ro được xem xét cùng lý do, không tự kết luận thay người quản trị.",
      relation: "Một chiến dịch → nhiều lần xét duyệt",
      href: userRoles.includes("ADMIN") ? "/admin" : "/huong-dan#quan-tri",
      action: userRoles.includes("ADMIN") ? "Mở khu quản trị" : "Xem cách xét duyệt",
    },
  };
  const selected = details[activeRole];

  return (
    <section className="border-b border-line bg-white py-12 sm:py-16" aria-labelledby="role-map-heading">
      <div className="container-shell grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-12">
        <div>
          <p className="text-sm font-bold text-coral-dark">Cùng một chiến dịch, mỗi người một việc</p>
          <h2 id="role-map-heading" className="mt-3 max-w-xl font-display text-3xl font-extrabold leading-tight tracking-[-0.04em] sm:text-4xl">
            Chọn vai trò để xem mình sẽ làm gì.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-ink-soft">
            Dự án, lời mời nhóm, cam kết và lần xét duyệt đều gắn với cùng một mã chiến dịch. Bạn không cần học sơ đồ dữ liệu để biết bước tiếp theo.
          </p>
          <Link href="/huong-dan#hanh-trinh-chien-dich" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest underline-offset-4 hover:underline">
            Xem hành trình 4 chặng dạng tương tác <ArrowRight className="size-4" />
          </Link>
          <div key={activeRole} className="role-map-detail mt-7 rounded-2xl border border-[#d5dfd2] bg-[#f5f8f1] p-5 sm:p-6" aria-live="polite">
            <p className="text-xs font-bold text-forest">{selected.relation}</p>
            <h3 className="mt-2 font-display text-lg font-extrabold leading-snug">{selected.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{selected.body}</p>
            <Link href={selected.href} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-forest underline-offset-4 hover:underline">
              {selected.action} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="role-map-canvas relative rounded-[28px] border border-[#d4e1d5] bg-[#eff5ec] p-5 sm:p-7">
          <div className="role-map-hub relative mx-auto flex min-h-28 max-w-md flex-col items-center justify-center rounded-2xl border border-[#acc8b2] bg-white p-5 text-center shadow-[0_18px_40px_rgba(19,57,47,0.12)]">
            <span className="text-xs font-bold text-forest">Chiến dịch đang gọi vốn</span>
            <strong className="mt-1 line-clamp-2 font-display text-base leading-snug text-ink">{campaign.title}</strong>
            <span className="mt-2 text-xs text-ink-muted">Mục tiêu {formatVnd(campaign.goalAmount, true)}</span>
          </div>
          <div className="role-map-stem mx-auto h-8 w-px bg-[#9fbea6]" aria-hidden="true" />
          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Chọn vai trò xem công việc">
            {roleOptions.map((role) => {
              const Icon = role.icon;
              const active = activeRole === role.id;
              return (
                <button key={role.id} type="button" aria-pressed={active} onClick={() => setActiveRole(role.id)}
                  className={`role-map-node min-h-32 rounded-2xl border p-3 text-left transition-[transform,box-shadow,border-color,background-color] focus-visible:outline-offset-2 ${active ? "border-[#46745b] bg-white shadow-[0_12px_30px_rgba(20,57,47,0.14)]" : "border-[#d1dfd1] bg-white/75 hover:border-[#8fb59b] hover:bg-white"}`}>
                  <span className={`grid size-9 place-items-center rounded-xl ${role.color}`}><Icon className="size-4" /></span>
                  <strong className="mt-3 block text-xs leading-5 text-ink">{role.name}</strong>
                  <span className="mt-1 block text-[11px] leading-4 text-ink-muted">{role.short}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-ink-muted">Chọn một ô để xem nhiệm vụ và mở đúng khu vực.</p>
        </div>
      </div>
    </section>
  );
}
