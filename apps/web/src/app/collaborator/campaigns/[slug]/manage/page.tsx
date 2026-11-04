import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye, NotebookPen } from "lucide-react";
import { notFound } from "next/navigation";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { PublishPreviewUpdate } from "@/components/collaborator/preview-campaign-actions";
import { CampaignDiscussionDesk } from "@/components/campaign/campaign-discussion-desk";
import { StatusBadge } from "@/components/ui/status-badge";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { previewInvitationForUser } from "@/lib/auth/preview-collaborators";
import { publicPreviewCampaignDetail } from "@/lib/creator/public-preview-campaigns";
import { previewQuestionResponders } from "@/lib/campaign/question-assignments";
import { localDbEnabled } from "@/lib/local-db/database";

export const metadata: Metadata = {
  title: "Phần việc trong chiến dịch",
  description: "Quyền cộng tác và cập nhật của chiến dịch được mời.",
};

export default async function PreviewCollaboratorPage({ params }: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, platform] = await Promise.all([getServerSession(), getServerPlatformPreviewState()]);
  if (!session?.user.roles.includes("COLLABORATOR")) {
    return <CampaignAccessNotice message="Hãy đăng nhập bằng tài khoản Cộng tác viên được mời." />;
  }
  const invitation = previewInvitationForUser(slug, session, platform);
  if (!invitation) notFound();
  if (!invitation.accepted) {
    return <CampaignAccessNotice message="Bạn cần chấp nhận lời mời trong bảng việc trước khi mở chiến dịch này."
      actionLabel="Xem lời mời" actionHref="/collaborator" />;
  }
  const campaign = publicPreviewCampaignDetail(slug, platform);
  if (!campaign) notFound();
  const updates = campaign.updates.filter((item) =>
    platform.publishedUpdates.some((row) => row.id === item.id && row.authorId === session.user.id));

  return <section className="min-h-screen bg-[var(--canvas)] pb-16">
    <div className="border-b border-[#c8d9ec] bg-[#e8f0f8] py-8 sm:py-10"><div className="container-shell">
      <Link href="/collaborator" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#315b86]"><ArrowLeft className="size-4" /> Về bảng việc</Link>
      <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={campaign.status} /><span className="text-xs text-[#315b86]">Cộng tác viên · đã nhận lời mời</span></div>
      <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{campaign.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft">Bạn chỉ làm phần Chủ dự án đã giao. Mở gọi vốn, đổi gói quà và duyệt hồ sơ vẫn thuộc Chủ dự án hoặc Quản trị viên.</p>
    </div></div>
    <div className="container-shell grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="space-y-6">
        <section className="rounded-[20px] border border-[#c8d9ec] bg-white p-5 sm:p-7"><p className="eyebrow text-[#2869ac]">Phạm vi của bạn</p>
          <h2 className="mt-2 font-display text-xl font-extrabold">Quyền trong chiến dịch này</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">{[
            ["Đăng cập nhật", invitation.permissions.canUpdate],
            ["Trả lời cộng đồng", invitation.permissions.canReply],
            ["Xem dự báo", invitation.permissions.canViewAi],
          ].map(([label, allowed]) => <li key={String(label)} className={`rounded-xl border p-3 text-sm ${allowed ? "border-[#b9d5e8] bg-[#eff7fc] text-[#225b86]" : "border-line bg-[#f8f8f5] text-ink-muted"}`}>
            <b>{label}</b><span className="mt-1 block text-xs">{allowed ? label === "Xem dự báo" ? "Có trong hồ sơ; màn AI riêng chưa nối" : "Được cấp" : "Chưa cấp"}</span>
          </li>)}</ul>
        </section>
        {invitation.permissions.canUpdate && campaign.status === "LIVE" ? <section className="rounded-[20px] border border-[#c8d9ec] bg-white p-5 sm:p-7">
          <p className="eyebrow text-[#2869ac]">Thông tin cho cộng đồng</p><h2 className="mt-2 font-display text-xl font-extrabold">Đăng một cập nhật tiến độ</h2>
          <p className="mb-5 mt-2 text-sm leading-6 text-ink-soft">Nêu việc đã làm, điều còn vướng và mốc tiếp theo. Bài đăng hiển thị ngay ở tab Cập nhật của dự án.</p>
          <PublishPreviewUpdate campaignId={slug} />
        </section> : <section className="rounded-[20px] border border-dashed border-[#c8d9ec] bg-white p-5 text-sm text-ink-soft">
          {campaign.status !== "LIVE" ? "Chiến dịch chưa mở hoặc đang tạm dừng, nên chưa đăng cập nhật." : "Chủ dự án chưa cấp quyền đăng cập nhật cho bạn."}
        </section>}
        <section className="rounded-[20px] border border-[#c8d9ec] bg-white p-5 sm:p-7"><h2 className="font-display text-xl font-extrabold">Bài bạn đã đăng</h2>
          {updates.length ? <ul className="mt-4 divide-y divide-line">{updates.map((update) => <li key={update.id} className="py-3"><b className="text-sm">{update.title}</b><p className="mt-1 text-xs leading-6 text-ink-soft">{update.excerpt}</p></li>)}</ul>
            : <p className="mt-3 text-sm text-ink-muted">Chưa có bài cập nhật nào do bạn đăng trong hồ sơ này.</p>}
        </section>
        <CampaignDiscussionDesk campaignId={slug} comments={campaign.comments} role="COLLABORATOR"
          canReply={invitation.permissions.canReply && campaign.status !== "SUSPENDED"} paused={campaign.status === "SUSPENDED"}
          viewerId={session.user.id}
          assignments={(platform.questionAssignments ?? []).filter((item) => item.campaignId === slug)}
          responders={previewQuestionResponders(slug, platform)} />
      </div>
      <aside className="rounded-[20px] border border-[#c8d9ec] bg-white p-5 sm:sticky sm:top-24 sm:p-6"><p className="eyebrow text-[#2869ac]">Đi đúng nơi cần làm</p><h2 className="mt-2 font-display text-lg font-extrabold">Liên kết với cộng đồng</h2>
        <div className="mt-5 flex flex-col gap-2"><Link href={`/projects/${slug}`} className="button-secondary"><Eye className="size-4" /> Xem trang dự án</Link>
          <Link href={`/projects/${slug}?tab=updates#noi-dung-du-an`} className="button-secondary"><NotebookPen className="size-4" /> Xem bài cập nhật</Link>
          {localDbEnabled() ? <Link href={`/campaigns/${slug}/timeline`} className="button-secondary">Xem lịch sử được chia sẻ</Link> : null}
        </div>
      </aside>
    </div>
  </section>;
}
