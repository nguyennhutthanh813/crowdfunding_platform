import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { CollaboratorTaskList } from "@/components/collaborator/task-list";
import { CollaboratorTaskTree } from "@/components/collaborator/collaborator-task-tree";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState, type PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import { applyCampaignCardPreviewState, applyOperationsPreviewState } from "@/lib/preview-read-models";
import { formatVnd } from "@/lib/format";
import { previewInvitationsForUser } from "@/lib/auth/preview-collaborators";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { AcceptPreviewInvitation } from "@/components/collaborator/preview-campaign-actions";
import { QuickRoleDock, RoleMissionBar } from "@/components/workspace/quick-role-switcher";
import { localDbEnabled } from "@/lib/local-db/database";

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
  return <section id={otherCampaigns ? "chien-dich-khac" : "loi-moi"} className="scroll-mt-36 border-b border-line bg-canvas-soft py-8">
    <div className="container-shell">
      <p className="eyebrow text-[#0284C7]">{otherCampaigns ? "Chiến dịch khác" : "Lời mời gửi tới tài khoản"}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">{otherCampaigns ? "Những chiến dịch bạn cũng đang tham gia" : !invitations.length
        ? `Chào ${givenName}, bạn chưa có việc nhóm.`
        : pendingCount ? `Bạn có ${pendingCount} lời mời cần xác nhận` : "Chiến dịch bạn đang cộng tác"}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{otherCampaigns
        ? "Mỗi chiến dịch có quyền riêng. Mở đúng phần việc trước khi đăng cập nhật hoặc trả lời cộng đồng."
        : empty && !invitations.length
        ? "Khi Chủ dự án ghi email của bạn trong hồ sơ được duyệt, lời mời sẽ xuất hiện tại đây. Hoặc bấm chọn ngay hồ sơ Cộng tác viên mẫu bên dưới để xem bảng việc Kanban:"
        : pendingCount ? "Email có trong hồ sơ chỉ là lời mời; quyền làm việc bắt đầu sau khi bạn chấp nhận." : "Mỗi chiến dịch có quyền riêng. Mở phần việc để xem chính xác bạn được làm gì."}</p>
      {empty && !invitations.length ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-surface p-5 shadow-card">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-[#047857]">
            Chuyển nhanh sang Cộng tác viên (Gia Huy) chỉ với 1 chạm:
          </p>
          <QuickRoleDock />
        </div>
      ) : null}
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
        return <article key={item.campaignId} className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-bold text-[#0284C7]">{item.category} · {item.status === "LIVE" ? "Đang gọi vốn" : "Đã duyệt"}</p>
        <h3 className="mt-2 font-display text-lg font-extrabold">{item.title}</h3>
        {item.accepted && myQuestions.length > 0 ? <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-[#0284C7]">
          {myQuestions.length} câu hỏi đang chờ bạn trả lời
        </p> : null}
        {item.accepted && myTasks.length > 0 ? <p className="mt-2 rounded-lg bg-[#ECFDF5] px-3 py-2 text-sm font-bold text-[#047857]">
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
  const canOpenOrbit = session
    ? resolveCampaignAccess("cmp_orbit", session, platformState).isCollaborator
    : false;
  if (!collaboratorProfile || !canOpenOrbit) return <InvitationBoard invitations={invitations} givenName={givenName} platform={platformState} viewerId={collaboratorId} empty />;

  return (
    <>
    <InvitationBoard invitations={pendingInvitations} givenName={givenName} platform={platformState} viewerId={collaboratorId} />
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-line bg-surface py-5 sm:py-6">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#047857]">
                  <Users className="size-4" /> Không gian cộng tác
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
                  Vai trò: {specialistRole}
                </span>
              </div>
              <h1 className="mt-2.5 max-w-3xl font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
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
                Bàn nội dung &amp; phản hồi <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/collaborator/forecast"
                className="button-secondary min-h-10 border-[#DDD6FE] bg-[#F5F3FF] px-3.5 text-xs text-[#7C3AED] hover:bg-[#EDE9FE]"
              >
                <BarChart3 className="size-3.5" /> ✦ AI Insights
              </Link>
              {acceptedInvitations.length ? (
                <Link
                  href="#chien-dich-khac"
                  className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-ink-soft transition hover:bg-slate-50"
                >
                  +{acceptedInvitations.length} chiến dịch khác
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-[#047857]">
                <ListChecks className="size-4" /> Tiến độ ca trực:
              </span>
              <span className="font-display text-base font-extrabold text-ink tabular-nums">
                {workProgress}%
              </span>
              <div
                className="h-2 w-28 overflow-hidden rounded-full bg-slate-200 sm:w-40"
                role="progressbar"
                aria-label="Tiến độ công việc được giao"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={workProgress}
              >
                <span
                  className="block h-full rounded-full bg-[#059669] transition-all duration-500"
                  style={{ width: `${workProgress}%` }}
                />
              </div>
              <span className="text-ink-muted tabular-nums">
                ({completedTasks}/{assignedTasks.length} đã xong)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <a
                href="#viec-hom-nay"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-ink hover:border-[#047857]"
              >
                {openTasks.length} việc mở · <span className="text-amber-700">{urgentTasks.length} ưu tiên cao</span>
              </a>
              <span className="hidden items-center gap-1.5 text-ink-soft sm:inline-flex">
                {openTasks[0] ? (
                  <>
                    <Clock3 className="size-3.5 text-[#047857]" />
                    <span className="max-w-52 truncate font-semibold">{openTasks[0].title}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">Đã xong hết việc trong ca</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-shell pt-5">
        <RoleMissionBar role="COLLABORATOR" />

        <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-line bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#064E3B] p-4 text-white shadow-card sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3.5">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-sm">
              <Image
                src="/images/3d/collaborator-kanban-3d.jpg"
                alt="Mô hình 3D quy trình điều phối Kanban 3 cột"
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-300">
                <Sparkles className="size-3.5" /> Collaborator Kanban Command
              </p>
              <h2 className="mt-1 font-display text-base font-extrabold text-white sm:text-lg">
                Bảng Kanban toàn chiều rộng — thao tác 1 chạm
              </h2>
              <p className="mt-0.5 text-xs text-slate-300">
                Hiện có {openTasks.length} đầu việc cần xử lý ({urgentTasks.length} ưu tiên cao) và {permissions.length} quyền được cấp.
              </p>
            </div>
          </div>
          <a
            href="#viec-hom-nay"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857]"
          >
            Xem bảng việc Kanban <ArrowRight className="size-3.5" />
          </a>
        </div>

        <div className="space-y-5">
          <CollaboratorTaskList initialTasks={assignedTasks} campaignId={operations.campaignId} />

          <div className="grid gap-4 lg:grid-cols-3">
            <details className="surface-card group/camp overflow-hidden rounded-[20px]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-xs transition hover:bg-canvas-soft/60 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusBadge status={visibleCampaign.status} />
                  <span className="truncate font-display text-xs font-extrabold text-ink sm:text-sm">
                    {visibleCampaign.title}
                  </span>
                </div>
                <span className="shrink-0 font-bold text-[#047857]">
                  <span className="group-open/camp:hidden">Chi tiết ↓</span>
                  <span className="hidden group-open/camp:inline">Thu gọn ↑</span>
                </span>
              </summary>
              <div className="border-t border-line p-4 sm:p-5">
                <CampaignVisual
                  {...visibleCampaign.visual}
                  compact
                  priority
                  className="mb-4 aspect-[16/9] overflow-hidden rounded-xl"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="rounded-lg bg-canvas-soft px-2.5 py-1 font-bold text-ink-soft">
                    Chủ dự án: {visibleCampaign.creator.name}
                  </span>
                  <span className="font-semibold text-ink-muted tabular-nums">
                    {operations.snapshotAt}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-line bg-canvas-soft p-3 text-xs tabular-nums">
                  <div>
                    <p className="text-[10px] text-ink-muted">Cam kết</p>
                    <p className="mt-0.5 font-display text-xs font-extrabold text-ink">
                      {formatVnd(operations.today.pledgedAmount, true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted">Chờ đáp</p>
                    <p className="mt-0.5 font-display text-xs font-extrabold text-[#047857]">
                      {operations.today.unansweredComments}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted">Nhóm</p>
                    <p className="mt-0.5 font-display text-xs font-extrabold text-ink">
                      {operations.team.length} người
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage"
                    className="button-dark min-h-9 px-3 text-xs"
                  >
                    Nội dung <ArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    href="/projects/orbit-one-ca-phe-thong-minh"
                    className="button-secondary min-h-9 px-3 text-xs"
                  >
                    Trang công khai
                  </Link>
                </div>
              </div>
            </details>

            <details className="surface-card group/rbac rounded-[20px] p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <span className="eyebrow text-[#047857]">
                  <ShieldCheck className="size-4" /> Quyền được cấp ({permissions.length})
                </span>
                <span className="text-[11px] font-bold text-[#047857]">
                  <span className="group-open/rbac:hidden">Xem quyền ↓</span>
                  <span className="hidden group-open/rbac:inline">Thu gọn ↑</span>
                </span>
              </summary>
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                <strong>Phạm vi Cộng tác viên:</strong> Đăng Update &amp; phản hồi cộng đồng. Sửa Goal, Reward &amp; Ngân sách chỉ dành cho Chủ dự án.
              </p>
              <ul className="mt-3 space-y-2 text-xs">
                {permissions.map((permission) => {
                  const targetHref =
                    permission === "Xem dự báo"
                      ? "/collaborator/forecast"
                      : "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community";
                  return (
                    <li key={permission}>
                      <Link
                        href={targetHref}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-canvas-soft px-3.5 py-2 font-semibold text-ink transition hover:border-[#059669] hover:bg-surface"
                      >
                        <span className="flex items-center gap-2">
                          <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="size-3" />
                          </span>
                          {permission}
                        </span>
                        <ArrowRight className="size-3.5 text-[#047857] transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {!permissions.length ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-xs leading-5 text-ink-muted">
                  Bạn chưa được cấp quyền thao tác trong chiến dịch này.
                </p>
              ) : null}
            </details>

            <details className="surface-card group/log rounded-[20px] p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wide text-[#047857]">
                    BÀN GIAO GẦN NHẤT · {operations.handoffs[0].at}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-ink">
                    {operations.handoffs[0].title}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-[#047857]">
                  <span className="group-open/log:hidden">Xem ↓</span>
                  <span className="hidden group-open/log:inline">Thu gọn ↑</span>
                </span>
              </summary>
              <div className="mt-3 rounded-xl border border-line bg-canvas-soft p-3.5">
                <p className="text-xs leading-5 text-ink-soft">
                  {operations.handoffs[0].note}
                </p>
                <p className="mt-2 text-[11px] font-bold text-[#047857]">
                  {operations.handoffs[0].from} → {operations.handoffs[0].to}
                </p>
              </div>
            </details>
          </div>

          <CollaboratorTaskTree
            collaboratorName={givenName}
            specialistRole={specialistRole}
            tasks={assignedTasks}
            permissions={permissions}
            handoff={operations.handoffs[0]}
            invitations={invitations.map((inv) => ({
              campaignId: inv.campaignId,
              title: inv.title,
              category: inv.category,
              status: inv.status,
              accepted: inv.accepted,
              openQuestionCount: (platformState.questionAssignments ?? []).filter(
                (a) => a.campaignId === inv.campaignId && a.assigneeUserId === collaboratorId,
              ).length,
              openTaskCount: (platformState.campaignTasks ?? []).filter(
                (t) => t.campaignId === inv.campaignId && t.assigneeUserId === collaboratorId && t.status !== "DONE",
              ).length,
              permissions: inv.permissions,
            }))}
            localDbAvailable={localDbEnabled()}
          />
        </div>
      </div>
    </section>
    {acceptedInvitations.length ? (
      <div className="container-shell pb-10">
        <details className="surface-card group/other overflow-hidden rounded-[20px]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-xs font-bold text-ink transition hover:bg-canvas-soft/60 sm:px-6 [&::-webkit-details-marker]:hidden">
            <span>Chiến dịch khác cũng đang tham gia ({acceptedInvitations.length})</span>
            <span className="text-[#047857]">
              <span className="group-open/other:hidden">Mở danh sách ↓</span>
              <span className="hidden group-open/other:inline">Thu gọn ↑</span>
            </span>
          </summary>
          <InvitationBoard invitations={acceptedInvitations} givenName={givenName} platform={platformState} viewerId={collaboratorId} otherCampaigns />
        </details>
      </div>
    ) : null}
    </>
  );
}
