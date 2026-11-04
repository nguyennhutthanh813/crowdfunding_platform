import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3, GitBranch, LockKeyhole } from "lucide-react";
import { getServerSession } from "@/lib/auth/server-session";
import { getLocalCampaignTimeline, localDbEnabled } from "@/lib/local-db/database";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dòng hoạt động chiến dịch" };

const phases = [
  { key: "PREPARATION", label: "Chuẩn bị", hint: "Hồ sơ, gói quà và việc nhóm" },
  { key: "REVIEW", label: "Xét duyệt", hint: "Gửi hồ sơ và phản hồi" },
  { key: "FUNDING", label: "Gọi vốn", hint: "Cập nhật, cộng đồng, cam kết" },
  { key: "DELIVERY", label: "Sau gọi vốn", hint: "Đối soát và giao quà" },
] as const;

const statusNames: Record<string, string> = {
  DRAFT: "Bản nháp", IN_REVIEW: "Đang xét duyệt", PRE_LAUNCH: "Đã duyệt · chưa mở",
  LIVE: "Đang gọi vốn", SUSPENDED: "Tạm dừng", SUCCESSFUL: "Đã đạt mục tiêu",
  FAILED: "Không đạt mục tiêu",
};
const roleNames: Record<string, string> = {
  BACKER: "Người ủng hộ", CREATOR: "Chủ dự án",
  COLLABORATOR: "Cộng tác viên", ADMIN: "Quản trị viên", GUEST: "Khách",
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

export default async function CampaignTimelinePage({
  params,
}: { params: Promise<{ id: string }> }) {
  if (!localDbEnabled()) notFound();
  const { id } = await params;
  const session = await getServerSession();
  const timeline = getLocalCampaignTimeline(id, session?.user);
  if (!timeline) notFound();

  const returnHref = timeline.viewer === "ADMIN" ? "/local-data"
    : timeline.viewer === "OWNER" ? "/creator"
      : timeline.viewer === "COLLABORATOR" ? "/collaborator"
        : timeline.viewer === "GUEST" ? `/projects/${timeline.campaign.slug}` : "/dashboard";
  const currentPhase = ["DRAFT"].includes(timeline.campaign.status) ? 0
    : ["IN_REVIEW", "PRE_LAUNCH"].includes(timeline.campaign.status) ? 1
      : ["SUCCESSFUL", "FAILED"].includes(timeline.campaign.status) ? 3 : 2;
  const visibleLabel = timeline.viewer === "GUEST"
    ? "Bạn chỉ thấy những cập nhật đã được nhóm công khai."
    : timeline.viewer === "BACKER"
    ? "Chỉ hiện cập nhật công khai và cam kết của chính bạn."
    : timeline.viewer === "COLLABORATOR"
      ? "Hiện việc nhóm và cập nhật công khai; không mở cam kết riêng của người ủng hộ."
      : "Hiện nhật ký nhóm và các sự kiện liên quan đến chiến dịch.";

  return (
    <div className="min-h-screen bg-[#f5f5ef] pb-20 text-[#16392e]">
      <div className="border-b border-[#dce5dc] bg-[#e8eee4]">
        <div className="container-shell py-5 sm:py-10">
          <Link href={returnHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#416854] hover:text-[#9e4935]">
            <ArrowLeft className="size-4" /> {timeline.viewer === "GUEST" ? "Về trang dự án" : "Quay về khu vực của bạn"}
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3 sm:mt-6 sm:gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#456f52]">
                <GitBranch className="size-4" /> Nhật ký trên máy của nhóm
              </p>
              <h1 className="mt-2 max-w-3xl font-display text-2xl font-extrabold tracking-tight sm:mt-3 sm:text-4xl">{timeline.campaign.title}</h1>
              <p className="mt-2 text-xs text-[#536a5d] sm:mt-3 sm:text-sm">Chủ dự án: {timeline.campaign.owner} · Mã {timeline.campaign.id}</p>
            </div>
            <span className="rounded-full border border-[#c6d8bd] bg-white px-4 py-2 text-xs font-bold text-[#315640]">
              {statusNames[timeline.campaign.status] ?? timeline.campaign.status}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#50695b] sm:mt-5">
            Xem chiến dịch đang ở đâu và những thao tác nào thực sự đã được lưu. Dữ liệu mẫu có sẵn
            không được coi là lịch sử thao tác. {visibleLabel}
          </p>
        </div>
      </div>

      <div className="container-shell grid gap-6 pt-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="phase-title" className="rounded-[20px] border border-[#dce5dc] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6a806f]">Lộ trình</p>
                <h2 id="phase-title" className="mt-1 font-display text-xl font-extrabold">Bốn chặng của chiến dịch</h2>
              </div>
              <span className="text-xs text-[#667c6c]">Mốc hiện tại dựa trên trạng thái chiến dịch</span>
            </div>
            <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {phases.map((phase, index) => (
                <li key={phase.key} className={`rounded-xl border p-3.5 ${index === currentPhase ? "border-[#537759] bg-[#ecf3e5]" : "border-[#e2e8df] bg-[#fafbf8]"}`}>
                  <span className={`grid size-7 place-items-center rounded-full text-xs font-extrabold ${index <= currentPhase ? "bg-[#244e39] text-white" : "bg-[#e9eee7] text-[#5e6e63]"}`}>{index + 1}</span>
                  <p className="mt-3 text-sm font-bold">{phase.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#62756a]">{phase.hint}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="events-title" className="rounded-[20px] border border-[#dce5dc] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6a806f]">Theo lần thao tác</p>
                <h2 id="events-title" className="mt-1 font-display text-xl font-extrabold">Dòng hoạt động</h2>
              </div>
              <span className="rounded-lg bg-[#f1f5ee] px-3 py-1.5 text-xs font-bold">{timeline.events.length} mục bạn có quyền xem</span>
            </div>
            {timeline.events.length ? (
              <ol className="mt-6 border-l-2 border-[#cbdccb] pl-5 sm:pl-7">
                {timeline.events.map((event) => (
                  <li key={event.id} className="relative pb-7 last:pb-0">
                    <span className="absolute -left-[30px] top-1 size-4 rounded-full border-[3px] border-white bg-[#527759] ring-1 ring-[#b8cfbb] sm:-left-[38px]" />
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#62776a]">
                      <span className="rounded bg-[#e9f0e8] px-2 py-1 font-bold text-[#28513b]">{event.eventType === "UPDATE_TASK_STATUS" ? "Việc nhóm" : phases.find((phase) => phase.key === event.stage)?.label ?? event.stage}</span>
                      <span>{formatDate(event.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{scopeNames[event.visibility] ?? event.visibility}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-extrabold sm:text-base">{event.title}</h3>
                    <p className="mt-1 text-xs text-[#597064]">{roleNames[event.actorRole] ?? event.actorRole} · {event.actor}</p>
                    {event.detail ? <p className="mt-2 max-w-2xl rounded-xl bg-[#f7f8f3] px-3 py-2.5 text-sm leading-6 text-[#476252]">{event.eventType === "UPDATE_TASK_STATUS" && event.detail === "Trạng thái: DONE." ? "Công việc được đánh dấu đã xong." : event.detail}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[#cbdccb] bg-[#fafbf8] p-5">
                <p className="font-semibold">{timeline.viewer === "GUEST" ? "Chưa có cập nhật công khai mới" : "Chưa có thao tác mới để hiển thị"}</p>
                <p className="mt-2 text-sm leading-6 text-[#5e7366]">Nhật ký chỉ bắt đầu từ các thao tác thực hiện sau khi tính năng này được bật. Trạng thái của bộ dữ liệu mẫu vẫn xem được ở phía trên.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[20px] border border-[#dce5dc] bg-[#173b2e] p-6 text-white">
            <Clock3 className="size-6 text-[#d7eb73]" />
            <h2 className="mt-4 font-display text-lg font-extrabold">Ai nhìn thấy mục nào?</h2>
            <p className="mt-2 text-xs leading-6 text-white/75">Cập nhật công khai cho mọi người; việc nhóm chỉ cho chủ dự án, cộng tác viên và quản trị; cam kết cá nhân không hiện cho cộng tác viên.</p>
            <p className="mt-4 flex items-center gap-2 border-t border-white/15 pt-4 text-xs font-semibold"><LockKeyhole className="size-4" /> Bạn đang xem với quyền {timeline.viewer === "OWNER" ? "Chủ dự án" : roleNames[timeline.viewer]}</p>
            {timeline.hiddenCount ? <p className="mt-2 text-xs text-white/60">{timeline.hiddenCount} mục khác nằm ngoài phạm vi quyền của bạn.</p> : null}
          </div>
          <Link href={returnHref} className="flex min-h-11 items-center justify-between rounded-xl border border-[#cbdccb] bg-white px-4 text-sm font-bold hover:border-[#648468]">
            {timeline.viewer === "GUEST" ? "Về trang dự án" : "Về không gian của bạn"} <ArrowUpRight className="size-4" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
