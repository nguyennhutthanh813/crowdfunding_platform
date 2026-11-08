import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, FilePenLine, PackageCheck } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CreatorCampaignStageWorkspace } from "@/components/creator/creator-campaign-stage-workspace";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import {
  PreviewCampaignPledgeList,
  PreviewCampaignUpdateHistory,
  PublishPreviewUpdate,
} from "@/components/collaborator/preview-campaign-actions";
import { LaunchPreviewCampaign } from "@/components/creator/launch-preview-campaign";
import { DeletePreviewDraftButton } from "@/components/creator/delete-preview-draft-button";
import { ReplyPreviewMessage } from "@/components/creator/reply-preview-message";
import { CampaignDiscussionDesk } from "@/components/campaign/campaign-discussion-desk";
import { PreviewTaskBoard } from "@/components/campaign/preview-task-board";
import { CampaignTeamManager } from "@/components/creator/campaign-team-manager";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { buildMockCreatorPortfolio } from "@/lib/api/mock/creator-portfolio";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";
import { publicPreviewCampaignDetail } from "@/lib/creator/public-preview-campaigns";
import { previewQuestionResponders } from "@/lib/campaign/question-assignments";
import { formatVnd } from "@/lib/format";
import { localDbEnabled } from "@/lib/local-db/database";
import { mockUsers } from "@/lib/api/mock/relational-store";
import {
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";

export const metadata: Metadata = {
  title: "Quản lý chiến dịch",
  description:
    "Theo dõi hồ sơ, xét duyệt và giao quà của từng chiến dịch riêng biệt.",
};

const stageCopy = {
  DRAFT: {
    eyebrow: "Bản nháp đang làm",
    title: "Hoàn thiện hồ sơ trước khi gửi duyệt.",
    detail:
      "Thông tin, câu chuyện, gói quà và nhóm cộng tác được lưu riêng cho chiến dịch này.",
  },
  IN_REVIEW: {
    eyebrow: "Đang xét duyệt",
    title: "Hồ sơ đang được quản trị viên kiểm tra.",
    detail:
      "Theo dõi đúng phiên bản đã gửi và chờ phản hồi; chưa mở nhận cam kết ở giai đoạn này.",
  },
  PRE_LAUNCH: {
    eyebrow: "Đã duyệt · chờ mở",
    title: "Kiểm tra lần cuối trước khi gọi vốn.",
    detail:
      "Hồ sơ đã qua kiểm duyệt. Chủ dự án là người quyết định thời điểm công bố chiến dịch.",
  },
  LIVE: {
    eyebrow: "Đang gọi vốn",
    title: "Chiến dịch vừa được mở trong lần dùng thử này.",
    detail:
      "Dữ liệu cam kết sẽ bắt đầu xuất hiện khi cộng đồng thực hiện ủng hộ.",
  },
  SUCCESSFUL: {
    eyebrow: "Sau gọi vốn",
    title: "Đối soát tiền và giao quà theo từng cam kết.",
    detail:
      "Chiến dịch đã đạt mục tiêu và thu tiền. Trạng thái giao nhận được tách riêng cho từng người ủng hộ.",
  },
  FAILED: {
    eyebrow: "Đã đóng chiến dịch",
    title: "Kiểm tra trạng thái hủy cam kết mẫu.",
    detail:
      "Chiến dịch không đạt mục tiêu nên không thu tiền và không tạo hồ sơ giao quà.",
  },
  SUSPENDED: {
    eyebrow: "Đang tạm dừng",
    title: "Đọc lý do trước khi chỉnh hồ sơ.",
    detail:
      "Các thao tác gọi vốn được khóa cho đến khi yêu cầu của quản trị viên được xử lý.",
  },
} as const;

const previewStageCopy = {
  DRAFT: {
    intro: "Hoàn thiện câu chuyện, gói quà và phí giao trước khi gửi duyệt.",
    nextTitle: "Hoàn thiện bản nháp",
    nextDetail: "Bạn có thể lưu tiếp, rồi gửi hồ sơ khi các nội dung bắt buộc đã đủ.",
  },
  IN_REVIEW: {
    intro: "Quản trị viên đang đọc hồ sơ. Bạn chưa thể sửa hoặc nhận cam kết.",
    nextTitle: "Chờ phản hồi",
    nextDetail: "Phản hồi của quản trị viên sẽ hiện ngay trong hồ sơ này. Trong lúc chờ, bạn có thể đọc lại bản đã gửi.",
  },
  PRE_LAUNCH: {
    intro: "Hồ sơ đã duyệt. Xem trang cộng đồng, rồi chủ động mở gọi vốn khi sẵn sàng.",
    nextTitle: "Kiểm tra rồi công bố",
    nextDetail: "Kiểm tra trang cộng đồng trước khi bấm mở gọi vốn mẫu.",
  },
  LIVE: {
    intro: "Trang dự án đang công khai. Theo dõi cam kết mẫu của cộng đồng ngay bên dưới.",
    nextTitle: "Theo dõi trang công khai",
    nextDetail: "Cam kết ở đây là dữ liệu dùng thử, chưa có thanh toán hay giao quà thật.",
  },
  SUSPENDED: {
    intro: "Chiến dịch đang tạm dừng; xem phản hồi quản trị trước khi tiếp tục.",
    nextTitle: "Xem lý do tạm dừng",
    nextDetail: "Xem phản hồi và lịch sử trước khi đề nghị mở lại.",
  },
  SUCCESSFUL: {
    intro: "Chiến dịch đã khép lại với mục tiêu đạt được trong bản mô phỏng.",
    nextTitle: "Xem lại chiến dịch",
    nextDetail: "Xem lại các mốc và cam kết đã ghi cho chiến dịch này.",
  },
  FAILED: {
    intro: "Chiến dịch đã khép lại mà chưa đạt mục tiêu trong bản mô phỏng.",
    nextTitle: "Xem lại chiến dịch",
    nextDetail: "Xem lại các mốc và cam kết đã ghi cho chiến dịch này.",
  },
} as const;

export default async function CreatorCampaignStagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, platformState] = await Promise.all([
    getServerSession(), getServerPlatformPreviewState(),
  ]);
  if (isPreviewCampaignId(slug)) {
    const snapshot = platformState.campaignDrafts[slug];
    if (!snapshot) notFound();
    if (!session?.user.roles.includes("CREATOR") || snapshot.ownerId !== session.user.id) {
      return <CampaignAccessNotice message="Hồ sơ này thuộc một Chủ dự án khác. Bạn chỉ được theo dõi chiến dịch của mình." />;
    }
    const status = previewCampaignStatus(slug, platformState);
    const publicCampaign = publicPreviewCampaignDetail(slug, platformState);
    const review = platformState.submittedReviews.find((item) => item.campaignId === slug);
    const feedback = review ? platformState.reviewFeedback[review.id] : null;
    const needsRevision = status === "DRAFT" && Boolean(feedback);
    const pledges = platformState.pledges.filter((item) => item.campaignId === slug);
    const publishedUpdates = platformState.publishedUpdates.filter(
      (item) => item.campaignId === slug,
    );
    const acceptedUserIds = platformState.acceptedCollaborators[slug] ?? [];
    const acceptedEmails = new Set(acceptedUserIds.flatMap((id) => {
      const member = mockUsers.find((item) => item.id === id) ??
        platformState.registeredAccounts.find((item) => item.id === id);
      return member?.email ? [member.email.toLowerCase()] : [];
    }));
    const taskPeople = [
      { id: session.user.id, name: session.user.name },
      ...acceptedUserIds.flatMap((id) => {
        const member = mockUsers.find((item) => item.id === id) ??
          platformState.registeredAccounts.find((item) => item.id === id);
        return member ? [{ id, name: "displayName" in member ? member.displayName : member.name }] : [];
      }),
    ];
    const formerPeople = [...new Set([
      ...platformState.campaignTasks.filter((task) => task.campaignId === slug)
        .flatMap((task) => [task.assigneeUserId, task.createdByUserId]),
      ...platformState.campaignTaskHandoffs.filter((handoff) => handoff.campaignId === slug)
        .flatMap((handoff) => [handoff.fromUserId, handoff.toUserId]),
    ])].filter((id) => !taskPeople.some((person) => person.id === id)).flatMap((id) => {
      const member = mockUsers.find((item) => item.id === id) ??
        platformState.registeredAccounts.find((item) => item.id === id);
      return member ? [{ id, name: "displayName" in member ? member.displayName : member.name }] : [];
    });
    const inbox = platformState.messages.filter((item) =>
      item.campaignId === slug && item.recipientId === session.user.id);
    const amount = pledges.reduce((sum, item) => sum + item.totalAmount, 0);
    const reviewDone = status !== "DRAFT" && status !== "IN_REVIEW";
    const launched = ["LIVE", "SUCCESSFUL", "FAILED", "SUSPENDED"].includes(status);
    const steps = [
      { label: "Soạn hồ sơ", state: status === "DRAFT" ? "current" : "done", note: needsRevision ? "Đang sửa theo góp ý" : status === "DRAFT" ? "Đang hoàn thiện" : "Đã gửi" },
      { label: "Xét duyệt", state: status === "IN_REVIEW" ? "current" : reviewDone ? "done" : "waiting", note: needsRevision ? "Chờ bạn gửi lại" : status === "DRAFT" ? "Chưa gửi" : status === "IN_REVIEW" ? "Đang chờ phản hồi" : "Đã phản hồi" },
      { label: "Mở gọi vốn", state: status === "PRE_LAUNCH" || status === "SUSPENDED" ? "current" : launched ? "done" : "waiting", note: status === "PRE_LAUNCH" ? "Chờ bạn mở" : status === "SUSPENDED" ? "Đang tạm dừng" : launched ? "Đã mở" : "Chưa mở" },
      { label: "Theo dõi cam kết", state: pledges.length ? "done" : launched ? "current" : "waiting", note: pledges.length ? `${pledges.length} cam kết` : launched ? "Chưa có cam kết" : "Chưa đến bước này" },
    ];
    return <section className="min-h-screen bg-[var(--canvas)] pb-16">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8 sm:py-10">
        <div className="container-shell">
          <Link href="/creator" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-ink-soft hover:text-forest"><ArrowLeft className="size-4" /> Danh mục chiến dịch</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3"><StatusBadge status={status} />{needsRevision ? <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">Cần chỉnh theo phản hồi</span> : null}<span className="text-xs text-ink-muted">Mã hồ sơ {slug.slice(-6).toUpperCase()}</span></div>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{snapshot.draft.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft">{needsRevision ? "Quản trị viên đã phản hồi bản gửi trước. Đọc góp ý bên dưới, chỉnh đúng phần cần bổ sung rồi gửi lại." : previewStageCopy[status].intro}</p>
        </div>
      </div>
      <div className="container-shell grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="space-y-6">
          <section id="tien-do-xet-duyet" className="scroll-mt-28 rounded-[20px] border border-line bg-white p-5 sm:p-7">
            <p className="eyebrow text-coral-dark">Đường đi của hồ sơ</p>
            <h2 className="mt-2 font-display text-lg font-extrabold">Tiến độ xét duyệt và mở chiến dịch</h2>
            <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{steps.map((step, index) => <li key={step.label} className={`rounded-xl border p-3 ${step.state === "done" ? "border-[#bad4be] bg-[#f3f8f1]" : step.state === "current" ? "border-amber-300 bg-amber-50" : "border-line bg-[#faf9f5]"}`}>
              <span className="text-[11px] font-bold text-ink-muted">BƯỚC {index + 1}</span><p className="mt-1 text-sm font-bold">{step.label}</p><p className="mt-1 text-xs text-ink-muted">{step.note}</p>
            </li>)}</ol>
            {needsRevision ? <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
              <div><h3 className="text-sm font-bold text-amber-950">Phản hồi từ quản trị viên</h3><p className="mt-2 text-sm leading-6 text-amber-950">{feedback}</p></div>
              <Link className="button-secondary mt-4 shrink-0 sm:mt-0" href={`/creator/campaigns/new?draft=${slug}`}>Chỉnh hồ sơ</Link>
            </div> : null}
          </section>
          <section className="rounded-[20px] border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow text-coral-dark">Nội dung đã lưu</p><h2 className="mt-2 font-display text-xl font-extrabold">{status === "DRAFT" || status === "IN_REVIEW" ? "Thông tin trong hồ sơ" : "Thông tin trên trang cộng đồng"}</h2></div><span className="text-xs text-ink-muted">{snapshot.draft.category} · {snapshot.draft.location}</span></div>
            <p className="mt-4 text-sm leading-7 text-ink-soft">{snapshot.draft.blurb}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#f6f7f1] p-4"><p className="text-xs text-ink-muted">Mục tiêu</p><p className="mt-1 font-bold">{formatVnd(Number(snapshot.draft.goal) || 0)}</p></div><div className="rounded-xl bg-[#f6f7f1] p-4"><p className="text-xs text-ink-muted">Đã cam kết mẫu</p><p className="mt-1 font-bold">{formatVnd(amount)}</p></div><div className="rounded-xl bg-[#f6f7f1] p-4"><p className="text-xs text-ink-muted">Người ủng hộ</p><p className="mt-1 font-bold">{new Set(pledges.map((item) => item.backerId)).size}</p></div></div>
            <h3 className="mt-7 text-sm font-bold">Gói ủng hộ</h3><ul className="mt-3 divide-y divide-line border-y border-line">{(snapshot.rewards ?? []).map((reward) => <li key={reward.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{reward.title}</span><b>{formatVnd(Number(reward.amount))}</b></li>)}</ul>
            {(status === "PRE_LAUNCH" || status === "LIVE") ? <CampaignTeamManager
              campaignId={slug} members={snapshot.collaborators ?? []}
              acceptedEmails={[...acceptedEmails]}
            /> : null}
            {feedback && !needsRevision ? <p className="mt-5 rounded-xl border border-[#d9e2d4] bg-[#f5f8f0] p-4 text-sm leading-6">Phản hồi xét duyệt: {feedback}</p> : null}
          </section>
          {status === "LIVE" ? (
            <section className="rounded-[20px] border border-line bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="eyebrow text-coral-dark">Bản tin công khai</p>
                  <h2 className="mt-2 font-display text-xl font-extrabold">
                    Đăng cập nhật tiến độ chiến dịch
                  </h2>
                </div>
                <span className="text-xs text-ink-muted">
                  {publishedUpdates.length} bản tin đã đăng
                </span>
              </div>
              <div className="mt-5">
                <PublishPreviewUpdate
                  campaignId={slug}
                  endpoint="/api/v1/creator/campaigns"
                />
              </div>
              {publishedUpdates.length ? (
                <div className="mt-6 border-t border-line pt-5">
                  <h3 className="text-sm font-bold">Lịch sử cập nhật của chiến dịch</h3>
                  <PreviewCampaignUpdateHistory
                    campaignId={slug}
                    updates={publishedUpdates}
                    manager={{ role: "creator", userId: session.user.id }}
                  />
                </div>
              ) : null}
            </section>
          ) : null}
          {(status === "PRE_LAUNCH" || status === "LIVE") ? <PreviewTaskBoard
            campaignId={slug} role="creator" viewerId={session.user.id}
            tasks={(platformState.campaignTasks ?? []).filter((item) => item.campaignId === slug)}
            handoffs={(platformState.campaignTaskHandoffs ?? []).filter((item) => item.campaignId === slug)}
            people={taskPeople} formerPeople={formerPeople} /> : null}
          {status === "LIVE" ? (
            <section className="rounded-[20px] border border-line bg-white p-5 sm:p-7">
              <h2 className="font-display text-xl font-extrabold">Cam kết vừa ghi</h2>
              {pledges.length ? (
                <PreviewCampaignPledgeList campaignId={slug} pledges={pledges} />
              ) : (
                <p className="mt-3 text-sm text-ink-muted">
                  Chưa có cam kết. Bạn có thể mở trang dự án để xem trải nghiệm của người ủng hộ.
                </p>
              )}
            </section>
          ) : null}
          {status === "LIVE" ? <section className="rounded-[20px] border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow text-coral-dark">Kết nối với Backer</p><h2 className="mt-2 font-display text-xl font-extrabold">Tin nhắn cần trả lời</h2></div><span className="text-xs text-ink-muted">{inbox.length} tin trong chiến dịch</span></div>
            {inbox.length ? <ul className="mt-5 space-y-3">{inbox.map((message) => <li key={message.id} className="rounded-xl border border-line bg-[#fdfcf8] p-4">
              <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-bold">{message.senderName} · {message.subject}</p><span className="text-xs text-ink-muted">{message.sentAt}</span></div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{message.body}</p>
              <div className="mt-4"><ReplyPreviewMessage campaignId={slug} messageId={message.id} senderName={message.senderName} /></div>
            </li>)}</ul> : <p className="mt-4 rounded-xl border border-dashed border-line bg-[#faf9f5] p-5 text-sm text-ink-muted">Chưa có tin nhắn từ người đã ủng hộ chiến dịch này.</p>}
          </section> : null}
          {publicCampaign ?
            <CampaignDiscussionDesk campaignId={slug} comments={publicCampaign.comments}
              role="CREATOR" canReply={status !== "SUSPENDED"} paused={status === "SUSPENDED"}
              viewerId={session.user.id}
              assignments={(platformState.questionAssignments ?? []).filter((item) => item.campaignId === slug)}
              responders={previewQuestionResponders(slug, platformState)} /> : null}
        </div>
        <aside className="rounded-[20px] border border-line bg-white p-5 sm:sticky sm:top-24 sm:p-6"><p className="eyebrow text-coral-dark">Bước tiếp theo</p><h2 className="mt-2 font-display text-lg font-extrabold">{needsRevision ? "Chỉnh và gửi lại" : previewStageCopy[status].nextTitle}</h2>
          <p className="mt-3 text-xs leading-6 text-ink-soft">{needsRevision ? "Góp ý nằm ngay dưới cây tiến độ. Chỉnh hồ sơ theo phản hồi rồi gửi xét duyệt lần nữa." : previewStageCopy[status].nextDetail}</p>
          <div className="mt-5 flex flex-col gap-2">{status === "DRAFT" || status === "IN_REVIEW" ? <Link className="button-secondary" href={`/creator/campaigns/new?draft=${slug}`}>{status === "DRAFT" ? "Tiếp tục chỉnh hồ sơ" : "Xem bản đã gửi"}</Link> : null}
            {status === "PRE_LAUNCH" || status === "LIVE" ? <Link className="button-secondary" href={`/projects/${slug}`}>Xem trang cộng đồng</Link> : null}
            {status === "PRE_LAUNCH" ? <LaunchPreviewCampaign campaignId={slug} /> : null}
            {status === "DRAFT" && !review ? <DeletePreviewDraftButton campaignId={slug} title={snapshot.draft.title || "Bản nháp chưa đặt tên"} /> : null}
            {localDbEnabled() ? <Link className="button-secondary" href={`/campaigns/${slug}/timeline`}>Xem lịch sử thao tác</Link> : null}
          </div>
        </aside>
      </div>
    </section>;
  }
  const baseOperations = await api.getCampaignOperations(slug).catch(() => null);
  const basePortfolio = session
    ? buildMockCreatorPortfolio(session.user.id, { name: session.user.name, initials: session.user.initials })
    : await api.getCreatorPortfolio();
  const portfolio = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
  );
  const campaign = portfolio.campaigns.find((item) => item.slug === slug);
  if (!campaign || !baseOperations) notFound();
  const campaignAccess = session ? resolveCampaignAccess(baseOperations.campaignId, session, platformState) : null;
  if (!campaignAccess?.isOwner) {
    return <CampaignAccessNotice message="Chiến dịch này không thuộc tài khoản Chủ dự án đang đăng nhập." />;
  }

  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );
  const copy = stageCopy[campaign.status];
  const isSuccessful = campaign.status === "SUCCESSFUL";
  const isSuspended = campaign.status === "SUSPENDED";
  const editHref = `/creator/campaigns/new?campaign=${campaign.slug}`;

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-16">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8 sm:py-10">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="eyebrow text-[#526827]">
                {isSuccessful ? (
                  <PackageCheck className="size-4" />
                ) : (
                  <BadgeCheck className="size-4" />
                )}
                {copy.eyebrow}
              </span>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                {campaign.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                {copy.title} {copy.detail}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/creator" className="button-secondary min-h-11 px-4 text-xs">
                <ArrowLeft className="size-4" /> Danh mục chiến dịch
              </Link>
              {isSuccessful ? (
                <Link
                  href={`/creator/campaigns/${campaign.slug}/manage?tab=fulfillment`}
                  className="button-primary min-h-11 px-4 text-xs"
                >
                  <PackageCheck className="size-4" /> Mở giao quà
                </Link>
              ) : !isSuspended && campaign.slug === "orbit-mini-bo-pha-gon" ? (
                <Link href={editHref} className="button-primary min-h-11 px-4 text-xs">
                  <FilePenLine className="size-4" /> Chỉnh sửa hồ sơ
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isSuspended ? (
        <CampaignAccessNotice
          title="Chiến dịch đang tạm dừng"
          message="Khu vận hành và nhận cam kết đã được khóa trong bản demo. Hãy xem phản hồi quản trị, chỉnh đúng nội dung được yêu cầu rồi mới đề nghị mở lại chiến dịch."
          actionLabel="Về danh sách chiến dịch"
          actionHref="/creator"
        />
      ) : (
        <CreatorCampaignStageWorkspace
          campaign={campaign}
          operations={operations}
        />
      )}
    </section>
  );
}
