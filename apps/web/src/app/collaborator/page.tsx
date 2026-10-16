import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { CollaboratorTaskList } from "@/components/collaborator/task-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleConnectionPanel } from "@/components/workspace/role-connection-panel";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import { applyOperationsPreviewState } from "@/lib/preview-read-models";
import { formatVnd } from "@/lib/format";

export const metadata: Metadata = {
  title: "Không gian cộng tác viên",
  description: "Theo dõi chiến dịch được mời, công việc và quyền cộng tác.",
};

export default async function CollaboratorPage() {
  const [campaign, baseOperations, session, platformState] = await Promise.all([
    api.getCampaignBySlug("orbit-one-ca-phe-thong-minh"),
    api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  if (!campaign) notFound();
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

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-[#c8d9ec] bg-[#e8f0f8] py-9 sm:py-11">
        <div className="container-shell flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="eyebrow text-[#2869ac]">
              <Users className="size-4" /> Không gian cộng tác
            </span>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              Chào {givenName}, hôm nay nhóm đang cần bạn ở đây.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft">
              Đây là ca làm việc của bạn trong ORBIT One: đầu việc, hạn bàn
              giao và phần trao đổi đang chờ đều lấy từ cùng một dữ liệu chiến dịch.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-[9px] border border-[#b7cee5] bg-white px-4 py-2 text-xs font-semibold text-[#315b86]">
            <span className="size-1.5 rounded-full bg-blue-500" /> {openTasks.length} việc đang mở
          </span>
        </div>
      </div>

      <div className="container-shell pt-8">
        <section
          aria-label="Nhịp làm việc hôm nay"
          className="overflow-hidden rounded-[20px] border border-[#bcd4ea] bg-[#173d65] text-white shadow-[0_16px_42px_rgba(23,61,101,0.12)]"
        >
          <div className="grid lg:grid-cols-[1.1fr_1.4fr]">
            <div className="border-b border-white/10 p-6 sm:p-7 lg:border-b-0 lg:border-r">
              <p className="eyebrow text-[#b8e3fb]">
                <ListChecks className="size-4" /> Nhịp làm việc hôm nay
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/68">
                  Đang mở
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold">
                  {openTasks.length}
                </p>
                <p className="mt-1 text-[10px] text-white/68">việc cần xử lý</p>
              </div>
              <div className="border-b border-white/10 p-5 sm:border-r sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/68">
                  Ưu tiên cao
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold text-[#ffd1bf]">
                  {urgentTasks.length}
                </p>
                <p className="mt-1 text-[10px] text-white/68">việc cần để ý</p>
              </div>
              <div className="col-span-2 p-5 sm:col-span-1 sm:p-6">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/68">
                  <Clock3 className="size-3" /> Mốc gần nhất
                </p>
                {openTasks[0] ? (
                  <>
                    <p className="mt-2 line-clamp-2 text-xs font-bold leading-5">
                      {openTasks[0].title}
                    </p>
                    <p className="mt-1 text-[10px] text-[#b8e3fb]">
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
            recordCode={`TASK · ${(openTasks[0]?.id ?? assignedTasks[0]?.id ?? "ORBIT").toLocaleUpperCase("vi")}`}
            steps={[
              {
                actor: "Nguyễn Hoàng Linh · Creator",
                title: "Giao việc kèm phạm vi quyền",
                detail: `${operations.handoffs[0].title} · ${operations.handoffs[0].at}.`,
                kind: "person",
                state: "done",
              },
              {
                actor: givenName,
                title: `${openTasks.length} việc đang chờ bạn`,
                detail: urgentTasks[0]
                  ? `Ưu tiên trước: ${urgentTasks[0].title}.`
                  : "Danh sách hiện không có việc ưu tiên cao.",
                kind: "team",
                state: "current",
              },
              {
                actor: "Xưởng chiến dịch ORBIT",
                title: "Nhận lại trạng thái và nội dung",
                detail: "Creator thấy cùng task ID, người nhận, hạn bàn giao và kết quả vừa cập nhật.",
                kind: "campaign",
                state: "current",
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
                {...campaign.visual}
                compact
                priority
                className="min-h-56 sm:min-h-full"
              />
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={campaign.status} />
                  <span className="rounded-[8px] bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                    Vai trò: {specialistRole}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-[-0.035em]">
                  {campaign.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Chủ dự án: {campaign.creator.name} · Nhóm hiện có{" "}
                  {operations.team.length} thành viên
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 border-y border-line py-4 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] text-ink-muted">Cam kết hôm nay</p>
                    <p className="mt-1 font-bold">
                      {formatVnd(operations.today.pledgedAmount, true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted">Chờ phản hồi</p>
                    <p className="mt-1 font-bold">
                      {operations.today.unansweredComments} bình luận
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-ink-muted">Chốt số liệu</p>
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
                    <Sparkles className="size-4" /> Xem dự báo
                  </Link>
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
            <p className="text-[10px] font-bold tracking-wide text-blue-700">
              BÀN GIAO GẦN NHẤT
            </p>
            <p className="mt-2 text-sm font-bold">
              {operations.handoffs[0].title}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              {operations.handoffs[0].note}
            </p>
            <p className="mt-2 text-[10px] text-ink-muted">
              {operations.handoffs[0].from} → {operations.handoffs[0].to} · {operations.handoffs[0].at}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
