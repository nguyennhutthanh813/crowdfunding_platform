import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Eye,
  Heart,
  Lock,
  MessageSquare,
  Rocket,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { LABEL_META, type CommentLabel } from "@/server/services/ai/comments";
import { getStudioWorkspace } from "@/server/queries/studio";
import { ButtonLink } from "@/components/ui/button";
import { FundingBar } from "@/components/ui/funding-bar";
import { StatCard } from "@/components/ui/layout-bits";
import { Avatar, Badge, PledgeStatusBadge, ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { CountUp } from "@/components/fx/motion";
import { PROJECT_STATUS } from "@/lib/status";
import { cn, formatCompactVnd, formatDate, formatVnd, percentOf, timeAgo, timeLeft } from "@/lib/utils";
import { LIFECYCLE_STEPS, LOCK_REASON, STUDIO_TABS, type StudioTabKey } from "@/components/studio/meta";
import { StudioProjectShell } from "@/components/studio/studio-workspace-shell";
import { StudioOverviewCharts } from "@/components/studio/charts";
import { AiPanel } from "@/components/studio/ai-panel";
import { AiContentReview } from "@/components/studio/ai-content-review";
import { ContentTab } from "@/components/studio/content-tab";
import { RewardsEditor } from "@/components/studio/rewards-editor";
import { UpdatesPanel } from "@/components/studio/updates-panel";
import { FaqPanel } from "@/components/studio/faq-panel";
import { CommentsInbox } from "@/components/studio/comments-inbox";
import { BackersTable } from "@/components/studio/backers-table";
import { FulfillmentPanel } from "@/components/studio/fulfillment-panel";
import { TeamPanel } from "@/components/studio/team-panel";
import { SettingsPanel } from "@/components/studio/settings-panel";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const ws = await getStudioWorkspace(slug, "overview");
  return { title: ws?.project ? `${ws.project.title} · Studio` : "Studio" };
}

export default async function StudioProjectPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;

  const viewer = await requireViewer(`/studio/${slug}`);
  if (viewer.systemRoles.includes("ADMIN")) redirect(`/admin/reviews/${slug}`);

  const rawTab = typeof sp.tab === "string" ? sp.tab : "overview";
  const requestedMeta = STUDIO_TABS.find((t) => t.key === rawTab);
  const tabQuery = requestedMeta ? requestedMeta.key : "overview";

  const ws = await getStudioWorkspace(slug, tabQuery);
  if (!ws || !ws.project || !ws.access?.role) notFound();

  const { project, access } = ws;
  const counts = ws.counts ?? { pendingComments: 0, draftUpdates: 0, faqs: 0, backers: 0 };
  const reviews = ws.reviews ?? [];
  const timeline = ws.timeline ?? [];

  const permSet = new Set(access.perms);
  const allowedTabs = STUDIO_TABS.filter((t) => permSet.has(t.perm));
  const activeTab: StudioTabKey = requestedMeta ? requestedMeta.key : (allowedTabs[0]?.key ?? "overview");
  const isAllowed = requestedMeta ? permSet.has(requestedMeta.perm) : true;

  const pct = percentOf(project.pledged_amount, project.goal_amount);
  const left = timeLeft(project.end_at);
  const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => (s.statuses as readonly string[]).includes(project.status));

  const latestReview = project.status === "REJECTED" ? reviews[0] : undefined;
  const latestSuspend = project.status === "SUSPENDED" ? timeline[0] : undefined;
  const canOpenWizard = permSet.has("project.edit") && ["DRAFT", "REJECTED"].includes(project.status);

  let contentEl: React.ReactNode = null;
  if (!isAllowed && requestedMeta) {
    contentEl = (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Lock className="size-7" />
        </span>
        <h2 className="text-xl font-bold">Mục “{requestedMeta.label}” được giới hạn cho Chủ dự án</h2>
        <p className="max-w-md text-sm text-muted">
          {LOCK_REASON[requestedMeta.perm] ?? "Bạn không có quyền truy cập mục này."}
        </p>
        <ButtonLink href={`/studio/${project.slug}`} variant="primary" size="sm" className="mt-2">
          Về Tổng quan Studio
        </ButtonLink>
      </div>
    );
  } else if (activeTab === "overview") {
    const canSeeBackerNames = permSet.has("backer.view");
    const ov = ws.overview ?? {
      daily: [],
      views7: 0,
      saves: 0,
      latest: null,
      history: [],
      pledges: [],
      comments: [],
    };
    const activeMembers = (ws.team ?? []).filter((m) => m.status === "ACTIVE");
    const fallbackPred = !ov.latest ? (ws.draftPrediction ?? null) : null;
    const aiDisplay = ov.latest
      ? {
          probability: ov.latest.probability,
          band: ov.latest.band,
          projectedAmount: ov.latest.projected_amount,
          factors: ov.latest.factors,
          suggestions: ov.latest.suggestions,
          mode: ov.latest.mode,
          createdAt: ov.latest.created_at,
          requestedByName: ov.latest.requested_by_name,
        }
      : fallbackPred
        ? {
            probability: fallbackPred.probability,
            band: fallbackPred.band,
            projectedAmount: fallbackPred.projectedAmount,
            factors: fallbackPred.factors,
            suggestions: fallbackPred.suggestions,
          }
        : null;

    const maskedPledges = canSeeBackerNames
      ? ov.pledges
      : ov.pledges.map((pl) => ({ ...pl, name: "Một người ủng hộ" }));

    contentEl = (
      <div className="space-y-6">
        {/* Compact 1-line Lifecycle bar on Overview */}
        <div className="card no-scrollbar overflow-x-auto px-4 py-2.5">
          {project.status === "CANCELLED" ? (
            <Badge tone="neutral">Chiến dịch đã bị huỷ</Badge>
          ) : (
            <ol className="flex min-w-max items-center gap-2">
              {LIFECYCLE_STEPS.map((st, idx) => {
                const isCurrent = idx === currentStepIdx;
                const isDone = currentStepIdx > idx;
                return (
                  <li key={st.key} className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition",
                        isCurrent
                          ? "bg-brand-gradient text-white shadow"
                          : isDone
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-surface-2 text-muted",
                      )}
                    >
                      {isDone ? <Check className="size-3" /> : <span>{idx + 1}.</span>}
                      {st.label}
                    </span>
                    {idx < LIFECYCLE_STEPS.length - 1 && <span className="h-px w-3 bg-line" />}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Số tiền đã góp"
            value={<CountUp value={project.pledged_amount} format="compact" />}
            sub={`${pct}% mục tiêu ${formatCompactVnd(project.goal_amount)}`}
            icon={<Wallet className="size-5" />}
            tone="emerald"
          />
          <StatCard
            label="Số người ủng hộ"
            value={<CountUp value={project.backers_count} />}
            sub={project.status === "LIVE" ? left.label : `Thời lượng ${project.duration_days} ngày`}
            icon={<Users className="size-5" />}
            tone="violet"
          />
          <StatCard
            label="Lượt xem (7 ngày)"
            value={<CountUp value={ov.views7} />}
            sub="Theo dõi lưu lượng truy cập gần đây"
            icon={<Eye className="size-5" />}
            tone="sky"
          />
          <StatCard
            label="Lượt lưu dự án"
            value={<CountUp value={ov.saves} />}
            sub={`${counts.pendingComments} góp ý AI chờ xử lý`}
            icon={<Heart className="size-5" />}
            tone="amber"
          />
        </div>

        <StudioOverviewCharts daily={ov.daily} goalAmount={project.goal_amount} />

        <AiPanel
          projectId={project.id}
          projectSlug={project.slug}
          prediction={aiDisplay}
          predictionInput={ws.predictionInput ?? null}
          history={ov.history}
          canRunAi={permSet.has("ai.run")}
        />

        <AiContentReview projectId={project.id} projectSlug={project.slug} canEdit={permSet.has("project.edit")} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Team summary */}
          <div className="card min-w-0 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-bold">
                <Users className="size-4 text-violet-500" /> Nhóm dự án ({activeMembers.length})
              </h3>
              {permSet.has("member.manage") && (
                <Link href={`/studio/${project.slug}?tab=team`} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                  Quản lý nhóm →
                </Link>
              )}
            </div>
            <div className="mt-4 space-y-2.5">
              {activeMembers.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/50 p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={m.display_name} src={m.avatar_url} size={34} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold">{m.display_name}</span>
                        <RoleBadge role={m.role_code} />
                      </div>
                      <div className="truncate text-xs text-muted">@{m.username}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted">{formatDate(m.joined_at)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card min-w-0 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-bold">
                <TrendingUp className="size-4 text-emerald-500" /> Hoạt động gần đây
              </h3>
              {canSeeBackerNames ? (
                <Link href={`/studio/${project.slug}?tab=backers`} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                  Danh sách người ủng hộ →
                </Link>
              ) : (
                <Link href={`/studio/${project.slug}?tab=comments`} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                  Hộp thư bình luận →
                </Link>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {maskedPledges.slice(0, 4).map((pl) => (
                <div key={pl.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/50 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{pl.name}</div>
                    <div className="truncate text-muted">
                      {pl.tier || "Góp không nhận quà"} · {timeAgo(pl.created_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatVnd(pl.amount)}</span>
                    <PledgeStatusBadge status={pl.status} />
                  </div>
                </div>
              ))}

              {ov.comments.slice(0, 3).map((cm) => {
                const l = cm.label as CommentLabel | null;
                return (
                  <div key={cm.id} className="rounded-xl border border-line bg-surface-2/30 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <MessageSquare className="size-3.5 text-sky-500" /> {cm.name}
                      </span>
                      {l && LABEL_META[l] && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: LABEL_META[l].color }}>
                          {LABEL_META[l].name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-muted">{cm.body}</p>
                  </div>
                );
              })}

              {maskedPledges.length === 0 && ov.comments.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">Chưa có hoạt động gần đây.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (activeTab === "content") {
    contentEl = (
      <ContentTab
        project={project}
        categories={ws.categories ?? []}
        sections={ws.sections ?? []}
      />
    );
  } else if (activeTab === "rewards") {
    const rw = ws.rewards ?? { tiers: [], addOns: [] };
    contentEl = <RewardsEditor projectId={project.id} tiers={rw.tiers} addOns={rw.addOns} />;
  } else if (activeTab === "updates") {
    contentEl = (
      <UpdatesPanel
        projectId={project.id}
        updates={ws.updates ?? []}
        canPublish={permSet.has("update.publish")}
      />
    );
  } else if (activeTab === "faq") {
    contentEl = <FaqPanel projectId={project.id} faqs={ws.faqs ?? []} />;
  } else if (activeTab === "comments") {
    contentEl = (
      <CommentsInbox
        projectId={project.id}
        projectSlug={project.slug}
        comments={ws.inbox ?? []}
        canReply={permSet.has("comment.reply")}
        canModerate={permSet.has("comment.moderate")}
        canFaq={permSet.has("faq.manage")}
      />
    );
  } else if (activeTab === "backers") {
    contentEl = <BackersTable slug={project.slug} backers={ws.backers ?? []} />;
  } else if (activeTab === "fulfillment") {
    contentEl = (
      <FulfillmentPanel
        projectId={project.id}
        status={project.status}
        shipments={ws.shipments ?? []}
        digitalCount={ws.digitalCaptured ?? 0}
      />
    );
  } else if (activeTab === "team") {
    const allPerms = ws.allPerms ?? [];
    contentEl = (
      <TeamPanel
        projectId={project.id}
        projectSlug={project.slug}
        members={ws.team ?? []}
        invitations={ws.invitations ?? []}
        allPerms={allPerms}
        collabPerms={(ws.collabPerms ?? []).map((p) => p.code)}
        creatorPerms={access.role === "CREATOR" ? access.perms : allPerms.map((p) => p.code)}
      />
    );
  } else if (activeTab === "settings") {
    contentEl = (
      <SettingsPanel
        project={project}
        checklist={ws.checklist ?? []}
        reviews={reviews}
        timeline={timeline}
        hasPledges={Boolean(ws.anyPledge)}
      />
    );
  }

  const currentTabLabel = STUDIO_TABS.find((t) => t.key === activeTab)?.label ?? "Tổng quan";
  const statusLabel = PROJECT_STATUS[project.status]?.label ?? project.status;

  return (
    <StudioProjectShell
      project={{
        id: project.id,
        slug: project.slug,
        title: project.title,
        cover_url: project.cover_url,
        status: project.status,
      }}
      role={access.role!}
      perms={access.perms}
      activeTab={activeTab}
      counts={counts}
    >
      {/* Compact Workspace Summary Bar (~64px) */}
      <div className="card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{project.title}</h1>
            <Badge tone="violet" className="shrink-0">{currentTabLabel}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted">
            <span>
              Đã góp <b className="text-emerald-600 dark:text-emerald-400">{formatVnd(project.pledged_amount)}</b> /{" "}
              {formatCompactVnd(project.goal_amount)} ({pct}%)
            </span>
            <span>
              <b className="text-fg">{project.backers_count}</b> người ủng hộ
            </span>
            {project.status === "LIVE" && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{left.label}</span>
            )}
            {project.status === "SCHEDULED" && (
              <span className="font-semibold text-sky-600 dark:text-sky-400">Mở lúc {formatDate(project.start_at, true)}</span>
            )}
          </div>
          <FundingBar percent={pct} size="sm" />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {project.status === "CANCELLED" ? (
            <Badge tone="neutral">Đã huỷ</Badge>
          ) : (
            <ProjectStatusBadge status={project.status} />
          )}
          <span className="hidden text-xs font-semibold text-muted xl:inline">
            {currentStepIdx >= 0 ? `Bước ${currentStepIdx + 1}/${LIFECYCLE_STEPS.length} · ${statusLabel}` : statusLabel}
          </span>
          {canOpenWizard ? (
            <ButtonLink href={`/studio/${project.slug}/setup`} size="xs">
              <Rocket className="size-3.5" /> Mở Wizard 5 bước
            </ButtonLink>
          ) : (
            <ButtonLink href={`/p/${project.slug}`} variant="outline" size="xs">
              <ExternalLink className="size-3.5" /> Xem trang dự án
            </ButtonLink>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {project.status === "REJECTED" && latestReview && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" />
          <div>
            <div className="font-bold text-rose-700 dark:text-rose-300">
              Dự án bị từ chối bởi {latestReview.reviewer} ({formatDate(latestReview.created_at)})
            </div>
            <p className="mt-0.5">“{latestReview.note}”</p>
          </div>
        </div>
      )}

      {project.status === "SUSPENDED" && latestSuspend && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-500" />
          <div>
            <div className="font-bold text-rose-700 dark:text-rose-300">Dự án đang bị tạm gỡ để xác minh</div>
            {latestSuspend.reason && <p className="mt-0.5">Lý do: “{latestSuspend.reason}”</p>}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div>{contentEl}</div>
    </StudioProjectShell>
  );
}
