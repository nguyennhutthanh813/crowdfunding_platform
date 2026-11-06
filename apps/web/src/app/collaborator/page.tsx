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
import { CollaboratorTaskList } from "@/components/collaborator/task-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleConnectionPanel } from "@/components/workspace/role-connection-panel";
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
        return <article key={item.campaignId} className="rounded-2xl border border-[#bfd4e7] bg-white p-5">
        <p className="text-xs font-bold text-[#2869ac]">{item.category} · {item.status === "LIVE" ? "Đang gọi vốn" : "Đã duyệt"}</p>
        <h3 className="mt-2 font-display text-lg font-extrabold">{item.title}</h3>
        {item.accepted && myQuestions.length > 0 ? <p className="mt-3 rounded-lg bg-[#e7f2fb] px-3 py-2 text-sm font-bold text-[#225b86]">
          {myQuestions.length} câu hỏi đang chờ bạn trả lời
        </p> : null}
        <p className="mt-2 text-xs leading-6 text-ink-soft">{item.accepted ? "Quyền của bạn" : "Quyền được đề nghị"}: {[
          item.permissions.canUpdate && "đăng cập nhật",
          item.permissions.canReply && "trả lời cộng đồng",
          item.permissions.canViewAi && "xem dự báo (chưa nối cho hồ sơ mới)",
        ].filter(Boolean).join(", ") || "chỉ xem"}.</p>
        <div className="mt-4">{item.accepted
          ? <Link className="button-primary" href={`/collaborator/campaigns/${item.campaignId}/manage${myQuestions.length ? "#cau-hoi-cong-dong" : ""}`}>Mở phần việc của tôi <ArrowRight className="size-4" /></Link>
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
  const flowTask = openTasks[0] ?? assignedTasks[0];
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
      <div className="border-b border-[#c8d9ec] bg-[#e8f0f8] py-9 sm:py-11">
        <div className="container-shell flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="eyebrow text-[#2869ac]">
              <Users className="size-4" /> Không gian cộng tác
            </span>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              Ca làm việc ORBIT One của {givenName}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft">
              Xem việc được giao, hạn bàn giao và phần trao đổi của riêng chiến dịch này.
              {acceptedInvitations.length ? " Các chiến dịch khác nằm ở cuối trang và trong mục Các mục." : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-[9px] border border-[#b7cee5] bg-white px-4 py-2 text-xs font-semibold text-[#315b86]">
              <span className="size-1.5 rounded-full bg-blue-500" /> {openTasks.length} việc đang mở
            </span>
            {acceptedInvitations.length ? <Link href="#chien-dich-khac" className="inline-flex min-h-11 items-center rounded-[9px] border border-[#b7cee5] bg-white px-4 text-xs font-bold text-[#225b86] hover:bg-[#f0f5f9]">
              Xem {acceptedInvitations.length} chiến dịch khác <ArrowRight className="ml-2 size-4" />
            </Link> : null}
          </div>
        </div>
      </div>

      <div className="container-shell pt-8">
        <section
          aria-label="Nhịp làm việc tại mốc dữ liệu mẫu"
          className="overflow-hidden rounded-[20px] border border-[#bcd4ea] bg-[#173d65] text-white shadow-[0_16px_42px_rgba(23,61,101,0.12)]"
        >
          <div className="grid lg:grid-cols-[1.1fr_1.4fr]">
            <div className="border-b border-white/10 p-6 sm:p-7 lg:border-b-0 lg:border-r">
              <p className="eyebrow text-[#b8e3fb]">
                <ListChecks className="size-4" /> Nhịp làm việc của nhóm
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-4xl font-extrabold tracking-[-0.05em]">
                    {workProgress}%
                  </p>
                  <p className="mt-1 text-xs text-white/58">
                    {completedTasks}/{assignedTasks.length} việc của bạn đã xong
                  </p>
                </div>
                <CheckCircle2 className="size-9 text-[#b8e3fb]" />
              </div>
              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-white/12"
                role="progressbar"
                aria-label="Tiến độ công việc được giao"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={workProgress}
              >
                <span
                  className="block h-full rounded-full bg-[#b8e3fb]"
                  style={{ width: `${workProgress}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3">
              <div className="border-b border-r border-white/10 p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/68">
                  Đang mở
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold">
                  {openTasks.length}
                </p>
                <p className="mt-1 text-[11px] text-white/68">việc cần xử lý</p>
              </div>
              <div className="border-b border-white/10 p-5 sm:border-r sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/68">
                  Ưu tiên cao
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold text-[#ffd1bf]">
                  {urgentTasks.length}
                </p>
                <p className="mt-1 text-[11px] text-white/68">việc cần để ý</p>
              </div>
              <div className="col-span-2 p-5 sm:col-span-1 sm:p-6">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/68">
                  <Clock3 className="size-3" /> Mốc gần nhất
                </p>
                {openTasks[0] ? (
                  <>
                    <p className="mt-2 line-clamp-2 text-xs font-bold leading-5">
                      {openTasks[0].title}
                    </p>
                    <p className="mt-1 text-[11px] text-[#b8e3fb]">
                      {openTasks[0].dueLabel}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs font-bold">Không còn việc mở</p>
                )}
              </div>
            </div>
          </div>
        </section>
        <div className="mt-6">
          <RoleConnectionPanel
            role="COLLABORATOR"
            eyebrow="Đường đi của một đầu việc"
            title="Việc đến tay bạn từ đâu, rồi đi tiếp thế nào?"
            description={`Bạn đang tham gia với vai trò ${specialistRole}. Quyền và đầu việc đều gắn riêng với ORBIT One, nên thay đổi ở đây sẽ quay về đúng xưởng chiến dịch của chủ dự án.`}
            recordCode={flowTask ? `TASK · ${flowTask.id.toLocaleUpperCase("vi")}` : "ORBIT · VIỆC NHÓM"}
            steps={[
              {
                actor: "Nguyễn Hoàng Linh · Chủ dự án",
                title: "Giao việc kèm phạm vi quyền",
                detail: flowTask ? `${flowTask.title}. ${flowTask.dueLabel}.` : "Khi có việc mới, bạn sẽ thấy tên việc và hạn bàn giao ở đây.",
                kind: "person",
                state: flowTask ? "done" : "next",
              },
              {
                actor: givenName,
                title: openTasks.length ? `${openTasks.length} việc đang chờ bạn` : "Không còn việc đang mở",
                detail: urgentTasks[0]
                  ? `Ưu tiên trước: ${urgentTasks[0].title}.`
                  : openTasks.length ? "Danh sách hiện không có việc ưu tiên cao." : "Bạn đã xử lý xong các đầu việc đang được giao; tiếp tục theo dõi trao đổi mới.",
                kind: "team",
                state: openTasks.length ? "current" : "done",
              },
              {
                actor: "Xưởng chiến dịch ORBIT",
                title: "Nhận lại trạng thái và nội dung",
                detail: openTasks.length ? "Khi bạn báo xong, chủ dự án sẽ thấy trạng thái mới của đúng công việc này." : "Chủ dự án thấy trạng thái đã hoàn tất của công việc trong bảng việc nhóm.",
                kind: "campaign",
                state: openTasks.length ? "next" : "done",
              },
              {
                actor: "Người ủng hộ",
                title: "Chỉ nhận phần đã công khai",
                detail: "Cập nhật hoặc phản hồi đã duyệt mới xuất hiện ở trang dự án và cộng đồng.",
                kind: "person",
                state: "next",
              },
            ]}
            action={{
              label: "Mở khu vực được cấp quyền",
              href: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
            }}
          />
        </div>
      </div>

      <div className="container-shell grid gap-6 pt-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <article className="surface-card overflow-hidden rounded-[20px]">
            <div className="grid sm:grid-cols-[260px_1fr]">
              <CampaignVisual
                {...visibleCampaign.visual}
                compact
                priority
                className="min-h-56 sm:min-h-full"
              />
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={visibleCampaign.status} />
                  <span className="rounded-[8px] bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    Vai trò: {specialistRole}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-[-0.035em]">
                  {visibleCampaign.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Chủ dự án: {visibleCampaign.creator.name} · Nhóm hiện có{" "}
                  {operations.team.length} thành viên
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 border-y border-line py-4 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-ink-muted">Cam kết tại mốc mẫu</p>
                    <p className="mt-1 font-bold">
                      {formatVnd(operations.today.pledgedAmount, true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Chờ phản hồi</p>
                    <p className="mt-1 font-bold">
                      {operations.today.unansweredComments} bình luận
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-ink-muted">Chốt số liệu</p>
                    <p className="mt-1 font-bold">{operations.snapshotAt}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage"
                    className="button-dark"
                  >
                    Mở nội dung chiến dịch <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/collaborator/forecast"
                    className="button-secondary"
                  >
                    <BarChart3 className="size-4" /> Xem dự báo
                  </Link>
                  {localDbEnabled() ? <Link href="/campaigns/cmp_orbit/timeline" className="button-secondary">Xem tiến độ chung</Link> : null}
                </div>
              </div>
            </div>
          </article>

          <CollaboratorTaskList initialTasks={assignedTasks} />
        </div>

        <aside className="surface-card rounded-[20px] p-6 lg:sticky lg:top-24">
          <p className="eyebrow text-coral">
            <ShieldCheck className="size-4" /> Quyền trong chiến dịch
          </p>
          <h2 className="mt-3 font-display text-xl font-extrabold">
            Những việc bạn có thể làm
          </h2>
          <ul className="mt-5 space-y-3 text-sm text-ink-soft">
            {permissions.map((permission) => (
              <li key={permission} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="size-3" />
                </span>
                {permission}
              </li>
            ))}
          </ul>
          {!permissions.length ? (
            <p className="mt-5 rounded-xl border border-dashed border-[#b7cee5] p-4 text-xs leading-5 text-ink-muted">
              Bạn chưa được cấp quyền thao tác trong chiến dịch này.
            </p>
          ) : null}
          <div className="mt-6 rounded-[10px] border-l-2 border-blue-300 bg-blue-50 p-4 text-xs leading-5 text-ink-muted">
            Thay đổi mục tiêu, mở gọi vốn, chỉnh phí và mời thành viên mới vẫn
            cần chủ dự án thực hiện.
          </div>
          <div className="mt-7 border-t border-line pt-6">
            <p className="text-[11px] font-bold tracking-wide text-blue-700">
              BÀN GIAO GẦN NHẤT
            </p>
            <p className="mt-2 text-sm font-bold">
              {operations.handoffs[0].title}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              {operations.handoffs[0].note}
            </p>
            <p className="mt-2 text-[11px] text-ink-muted">
              {operations.handoffs[0].from} → {operations.handoffs[0].to} · {operations.handoffs[0].at}
            </p>
          </div>
        </aside>
      </div>
    </section>
    <InvitationBoard invitations={acceptedInvitations} givenName={givenName} platform={platformState} viewerId={collaboratorId} otherCampaigns />
    </>
  );
}
