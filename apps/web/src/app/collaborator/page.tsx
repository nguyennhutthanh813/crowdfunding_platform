import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import {
  CollaboratorTaskTree,
  type CollaboratorCampaignNodeItem,
} from "@/components/collaborator/collaborator-task-tree";
import { CollaboratorTaskList } from "@/components/collaborator/task-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState, type PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import { applyCampaignCardPreviewState, applyOperationsPreviewState } from "@/lib/preview-read-models";
import { formatVnd } from "@/lib/format";
import { localDbEnabled } from "@/lib/local-db/database";
import { previewInvitationsForUser } from "@/lib/auth/preview-collaborators";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { AcceptPreviewInvitation } from "@/components/collaborator/preview-campaign-actions";

export const metadata: Metadata = {
  title: "Không gian cộng tác viên",
  description: "Theo dõi chiến dịch được mời, công việc và quyền cộng tác.",
};

function InvitationBoard({ invitations, givenName, platform, viewerId, empty = false, otherCampaigns = false }: {
  invitations: ReturnType<typeof previewInvitationsForUser>;
  givenName: string;
  platform: PlatformPreviewState;
  viewerId?: string;
  empty?: boolean;
  otherCampaigns?: boolean;
}) {
  if (!invitations.length && !empty) return null;
  const pendingCount = invitations.filter((item) => !item.accepted).length;
  return <section id={otherCampaigns ? "chien-dich-khac" : "loi-moi"} className="scroll-mt-36 border-b border-[#c8d9ec] bg-[#f0f5f9] py-8">
    <div className="container-shell">
      <p className="eyebrow text-[#2869ac]">{otherCampaigns ? "Chiến dịch khác" : "Lời mời gửi tới tài khoản"}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">{otherCampaigns ? "Những chiến dịch bạn cũng đang tham gia" : !invitations.length
        ? `Chào ${givenName}, bạn chưa có việc nhóm.`
        : pendingCount ? `Bạn có ${pendingCount} lời mời cần xác nhận` : "Chiến dịch bạn đang cộng tác"}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{otherCampaigns
        ? "Mỗi chiến dịch có quyền riêng. Mở đúng phần việc trước khi đăng cập nhật hoặc trả lời cộng đồng."
        : empty && !invitations.length
        ? "Khi Chủ dự án ghi email của bạn trong hồ sơ được duyệt, lời mời sẽ xuất hiện tại đây. Bạn tự xác nhận trước khi có quyền thao tác."
        : pendingCount ? "Email có trong hồ sơ chỉ là lời mời; quyền làm việc bắt đầu sau khi bạn chấp nhận." : "Mỗi chiến dịch có quyền riêng. Mở phần việc để xem chính xác bạn được làm gì."}</p>
      {invitations.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{invitations.map((item) => {
        const myQuestions = (platform.questionAssignments ?? []).filter((assignment) =>
          item.accepted && item.permissions.canReply &&
          assignment.campaignId === item.campaignId && assignment.assigneeUserId === viewerId &&
          platform.campaignComments.some((comment) =>
            comment.campaignId === item.campaignId && comment.id === assignment.commentId &&
            comment.kind === "QUESTION" && !comment.parentId) &&
          !platform.campaignComments.some((comment) =>
            comment.campaignId === item.campaignId && comment.parentId === assignment.commentId &&
            (comment.badge === "CREATOR" || comment.badge === "COLLABORATOR")));
        const myTasks = (platform.campaignTasks ?? []).filter((task) =>
          item.accepted && task.campaignId === item.campaignId &&
          task.assigneeUserId === viewerId && task.status !== "DONE");
        return <article key={item.campaignId} className="rounded-2xl border border-[#bfd4e7] bg-white p-5">
        <p className="text-xs font-bold text-[#2869ac]">{item.category} · {item.status === "LIVE" ? "Đang gọi vốn" : "Đã duyệt"}</p>
        <h3 className="mt-2 font-display text-lg font-extrabold">{item.title}</h3>
        {item.accepted && myQuestions.length > 0 ? <p className="mt-3 rounded-lg bg-[#e7f2fb] px-3 py-2 text-sm font-bold text-[#225b86]">
          {myQuestions.length} câu hỏi đang chờ bạn trả lời
        </p> : null}
        {item.accepted && myTasks.length > 0 ? <p className="mt-2 rounded-lg bg-[#eef6fb] px-3 py-2 text-sm font-bold text-[#225b86]">
          {myTasks.length} việc nhóm đang chờ bạn làm
        </p> : null}
        <p className="mt-2 text-xs leading-6 text-ink-soft">{item.accepted ? "Quyền của bạn" : "Quyền được đề nghị"}: {[
          item.permissions.canUpdate && "đăng cập nhật",
          item.permissions.canReply && "trả lời cộng đồng",
          item.permissions.canViewAi && "xem dự báo (chưa nối cho hồ sơ mới)",
        ].filter(Boolean).join(", ") || "chỉ xem"}.</p>
        <div className="mt-4">{item.accepted
          ? <Link className="button-primary" href={`/collaborator/campaigns/${item.campaignId}/manage${myTasks.length ? "#cong-viec-nhom" : myQuestions.length ? "#cau-hoi-cong-dong" : ""}`}>Mở phần việc của tôi <ArrowRight className="size-4" /></Link>
          : <AcceptPreviewInvitation campaignId={item.campaignId} />}</div>
      </article>; })}</div> : null}
    </div>
  </section>;
}

export default async function CollaboratorPage() {
  const [campaign, baseOperations, session, platformState] = await Promise.all([
    api.getCampaignBySlug("orbit-one-ca-phe-thong-minh"),
    api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  if (!campaign) notFound();
  const visibleCampaign = applyCampaignCardPreviewState(campaign, platformState);
  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );
  const givenName = session ? getFriendlyName(session.user.name) : "bạn";
  const collaboratorId = session?.user.id ?? "usr_gia_huy";
  const collaboratorProfile = operations.team.find(
    (member) => member.id === collaboratorId,
  );
  const assignedTasks = operations.tasks.filter(
    (task) => task.assigneeId === collaboratorId,
  );
  const openTasks = assignedTasks.filter((task) => task.status !== "DONE");
  const completedTasks = assignedTasks.length - openTasks.length;
  const urgentTasks = openTasks.filter((task) => task.priority === "HIGH");
  const workProgress = assignedTasks.length
    ? Math.round((completedTasks / assignedTasks.length) * 100)
    : 0;
  const permissions = collaboratorProfile?.permissions ?? [];
  const specialistRole =
    collaboratorProfile?.role.replace("Cộng tác viên · ", "") ?? "Thành viên";
  const invitations = session ? previewInvitationsForUser(session, platformState) : [];
  const pendingInvitations = invitations.filter((item) => !item.accepted);
  const acceptedInvitations = invitations.filter((item) => item.accepted);
  const treeInvitations: CollaboratorCampaignNodeItem[] = invitations.map((item) => {
    const openTaskCount = (platformState.campaignTasks ?? []).filter((task) =>
      item.accepted && task.campaignId === item.campaignId &&
      task.assigneeUserId === collaboratorId && task.status !== "DONE").length;
    const openQuestionCount = (platformState.questionAssignments ?? []).filter(
      (assignment) =>
        item.accepted &&
        item.permissions.canReply &&
        assignment.campaignId === item.campaignId &&
        assignment.assigneeUserId === collaboratorId &&
        platformState.campaignComments.some(
          (comment) =>
            comment.campaignId === item.campaignId &&
            comment.id === assignment.commentId &&
            comment.kind === "QUESTION" &&
            !comment.parentId,
        ) &&
        !platformState.campaignComments.some(
          (comment) =>
            comment.campaignId === item.campaignId &&
            comment.parentId === assignment.commentId &&
            (comment.badge === "CREATOR" || comment.badge === "COLLABORATOR"),
        ),
    ).length;
    return {
      campaignId: item.campaignId,
      title: item.title,
      category: item.category,
      status: item.status,
      accepted: item.accepted,
      openQuestionCount,
      openTaskCount,
      permissions: item.permissions,
    };
  });
  const canOpenOrbit = session
    ? resolveCampaignAccess("cmp_orbit", session, platformState).isCollaborator
    : false;
  if (!collaboratorProfile || !canOpenOrbit) return <InvitationBoard invitations={invitations} givenName={givenName} platform={platformState} viewerId={collaboratorId} empty />;

  return (
    <>
    <InvitationBoard invitations={pendingInvitations} givenName={givenName} platform={platformState} viewerId={collaboratorId} />
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-[#c8d9ec] bg-gradient-to-b from-[#e4eef8] to-[#eef4fa] py-7 sm:py-8">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow text-[#2869ac]">
                  <Users className="size-4" /> Không gian cộng tác
                </span>
                <span className="rounded-full border border-[#b7cee5] bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-[#225b86]">
                  Vai trò: {specialistRole}
                </span>
              </div>
              <h1 className="mt-2.5 max-w-3xl font-display text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
                Ca làm việc ORBIT One của {givenName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                Thực hiện các đầu việc được phân công, đăng bản tin tiến độ và phản hồi câu hỏi cộng đồng.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community"
                className="button-primary min-h-10 px-4 text-xs"
              >
                Bàn nội dung & phản hồi <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/collaborator/forecast"
                className="button-secondary min-h-10 bg-white px-3.5 text-xs"
              >
                <BarChart3 className="size-3.5" /> Xem dự báo
              </Link>
              {acceptedInvitations.length ? (
                <Link
                  href="#chien-dich-khac"
                  className="inline-flex min-h-10 items-center rounded-xl border border-[#b7cee5] bg-white px-3.5 text-xs font-bold text-[#225b86] transition hover:bg-[#f0f5f9]"
                >
                  +{acceptedInvitations.length} chiến dịch khác
                </Link>
              ) : null}
            </div>
          </div>

          <section
            aria-label="Nhịp làm việc trong ca trực"
            className="mt-6 overflow-hidden rounded-[18px] border border-[#bcd4ea] bg-[#173d65] text-white shadow-[0_14px_34px_rgba(23,61,101,0.12)]"
          >
            <div className="grid lg:grid-cols-[1.05fr_1.45fr]">
              <div className="border-b border-white/10 p-5 sm:px-6 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow text-[#b8e3fb]">
                      <ListChecks className="size-4" /> Tiến độ ca trực
                    </p>
                    <div className="mt-2 flex items-baseline gap-2.5">
                      <p className="font-display text-3xl font-extrabold tracking-[-0.05em]">
                        {workProgress}%
                      </p>
                      <p className="text-xs text-white/68">
                        ({completedTasks}/{assignedTasks.length} đầu việc hoàn tất)
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="size-8 text-[#b8e3fb]" />
                </div>
                <div
                  className="mt-3.5 h-2 overflow-hidden rounded-full bg-white/12"
                  role="progressbar"
                  aria-label="Tiến độ công việc được giao"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={workProgress}
                >
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-[#7dd3fc] to-[#b8e3fb] transition-all duration-500"
                    style={{ width: `${workProgress}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3">
                <a
                  href="#viec-hom-nay"
                  className="border-b border-r border-white/10 p-4 transition hover:bg-white/5 sm:p-5"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/68">
                    Đang mở
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-extrabold">
                    {openTasks.length}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/68">việc cần xử lý</p>
                </a>
                <a
                  href="#viec-hom-nay"
                  className="border-b border-white/10 p-4 transition hover:bg-white/5 sm:border-r sm:p-5"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/68">
                    Ưu tiên cao
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-extrabold text-[#ffd1bf]">
                    {urgentTasks.length}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/68">cần xử lý sớm</p>
                </a>
                <div className="col-span-2 p-4 sm:col-span-1 sm:p-5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/68">
                    <Clock3 className="size-3" /> Mốc gần nhất
                  </p>
                  {openTasks[0] ? (
                    <>
                      <p className="mt-1.5 line-clamp-1 text-xs font-bold leading-5">
                        {openTasks[0].title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#b8e3fb]">
                        {openTasks[0].dueLabel}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs font-bold text-emerald-300">
                      Đã xử lý hết việc trong ca
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="container-shell grid gap-6 pt-6 lg:grid-cols-[1fr_330px] lg:items-start">
        <div className="space-y-6">
          <CollaboratorTaskList initialTasks={assignedTasks} campaignId={operations.campaignId} />

          <article className="surface-card card-lift overflow-hidden rounded-[20px]">
            <div className="grid sm:grid-cols-[230px_1fr]">
              <CampaignVisual
                {...visibleCampaign.visual}
                compact
                priority
                className="min-h-48 sm:min-h-full"
              />
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={visibleCampaign.status} />
                    <span className="rounded-[8px] bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      Chủ dự án: {visibleCampaign.creator.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-muted">
                    Cập nhật {operations.snapshotAt}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-xl font-extrabold leading-tight tracking-[-0.03em] sm:text-2xl">
                  {visibleCampaign.title}
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-line bg-[#f8fafc] p-3.5 text-xs">
                  <div>
                    <p className="text-[11px] text-ink-muted">Cam kết trong ca</p>
                    <p className="mt-1 font-display text-sm font-extrabold text-ink">
                      {formatVnd(operations.today.pledgedAmount, true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-muted">Chờ phản hồi</p>
                    <p className="mt-1 font-display text-sm font-extrabold text-blue-700">
                      {operations.today.unansweredComments} bình luận
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-muted">Nhóm vận hành</p>
                    <p className="mt-1 font-display text-sm font-extrabold text-ink">
                      {operations.team.length} thành viên
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage"
                    className="button-dark min-h-10 px-4 text-xs"
                  >
                    Mở nội dung chiến dịch <ArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    href="/projects/orbit-one-ca-phe-thong-minh"
                    className="button-secondary min-h-10 px-3.5 text-xs"
                  >
                    Xem trang công khai
                  </Link>
                  {localDbEnabled() ? (
                    <Link
                      href="/campaigns/cmp_orbit/timeline"
                      className="button-secondary min-h-10 px-3.5 text-xs"
                    >
                      Nhật ký liên thông
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="surface-card rounded-[20px] p-5 sm:p-6 lg:sticky lg:top-24">
          <p className="eyebrow text-[#2869ac]">
            <ShieldCheck className="size-4" /> Quyền & lối tắt thao tác
          </p>
          <h2 className="mt-2 font-display text-lg font-extrabold">
            Phạm vi được cấp trong ca
          </h2>
          <ul className="mt-4 space-y-2 text-xs">
            {permissions.map((permission) => {
              const targetHref =
                permission === "Xem dự báo"
                  ? "/collaborator/forecast"
                  : "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community";
              return (
                <li key={permission}>
                  <Link
                    href={targetHref}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-[#d6e4f2] bg-[#f7fafd] px-3.5 py-2.5 font-semibold text-ink transition hover:border-blue-400 hover:bg-white"
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="size-3" />
                      </span>
                      {permission}
                    </span>
                    <ArrowRight className="size-3.5 text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {!permissions.length ? (
            <p className="mt-4 rounded-xl border border-dashed border-[#b7cee5] p-4 text-xs leading-5 text-ink-muted">
              Bạn chưa được cấp quyền thao tác trong chiến dịch này.
            </p>
          ) : null}
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold tracking-wide text-blue-700">
                BÀN GIAO GẦN NHẤT
              </p>
              <span className="text-[11px] font-semibold text-ink-muted">
                {operations.handoffs[0].at}
              </span>
            </div>
            <div className="mt-2.5 rounded-xl border border-[#d6e4f2] bg-[#f7fafd] p-3.5">
              <p className="text-xs font-bold text-ink">
                {operations.handoffs[0].title}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                {operations.handoffs[0].note}
              </p>
              <p className="mt-2 text-[11px] font-bold text-[#2869ac]">
                {operations.handoffs[0].from} → {operations.handoffs[0].to}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="container-shell pt-8">
        <CollaboratorTaskTree
          collaboratorName={givenName}
          specialistRole={specialistRole}
          tasks={assignedTasks}
          permissions={permissions}
          handoff={operations.handoffs[0]}
          invitations={treeInvitations}
          localDbAvailable={localDbEnabled()}
        />
      </div>
    </section>
    <InvitationBoard invitations={acceptedInvitations} givenName={givenName} platform={platformState} viewerId={collaboratorId} otherCampaigns />
    </>
  );
}
