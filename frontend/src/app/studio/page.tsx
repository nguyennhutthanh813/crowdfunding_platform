import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, Clock, FolderKanban, HandCoins, Plus, Rocket, Sparkles, Users } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getStudioIndexBundle, type StudioCard } from "@/server/queries/studio";
import { ButtonLink } from "@/components/ui/button";
import { FundingBar } from "@/components/ui/funding-bar";
import { EmptyState, PageHeader, SectionTitle, StatCard } from "@/components/ui/layout-bits";
import { ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { CountUp, Reveal, TiltCard } from "@/components/fx/motion";
import { cn, formatCompactVnd, formatDate, percentOf, timeLeft } from "@/lib/utils";
import { StudioImage } from "@/components/studio/media";

export const metadata = { title: "Studio dự án" };

const TONE_BOX: Record<StudioCard["next"]["tone"], string> = {
  violet: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  slate: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

export default async function StudioDashboardPage() {
  const viewer = await requireViewer("/studio");
  if (viewer.systemRoles.includes("ADMIN")) redirect("/admin");

  const { mine, collab, invitations } = await getStudioIndexBundle();
  const allProjects = [...mine, ...collab];
  const totalRaised = mine.reduce((s, p) => s + p.pledged_amount, 0);
  const totalBackers = mine.reduce((s, p) => s + p.backers_count, 0);
  const liveCount = allProjects.filter((p) => p.status === "LIVE").length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Studio quản lý dự án"
        title="Không gian quản lý dự án"
        description="Theo dõi tiến độ chiến dịch, phân tích AI, trả lời cộng đồng và điều phối giao quà ở cùng một nơi."
        actions={
          <ButtonLink href="/studio/new" size="md">
            <Plus className="size-4" /> Tạo dự án mới
          </ButtonLink>
        }
      />

      {/* Pending Invitations Banner */}
      {invitations.length > 0 && (
        <div className="card relative overflow-hidden border-violet-500/30 bg-gradient-to-r from-violet-500/12 via-sky-500/8 to-emerald-500/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow">
                <BellRing className="size-5" />
              </span>
              <div>
                <h2 className="font-bold">Bạn có {invitations.length} lời mời làm cộng tác viên</h2>
                <ul className="mt-1 space-y-1 text-sm text-muted">
                  {invitations.map((inv) => (
                    <li key={inv.id}>
                      <b className="text-fg">{inv.inviter}</b> mời bạn tham gia <b className="text-fg">{inv.title}</b>
                      {inv.message ? ` — “${inv.message}”` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ButtonLink href="/me#invitations" variant="primary" size="sm" className="shrink-0">
              Xem &amp; phản hồi lời mời <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>
      )}

      {allProjects.length === 0 ? (
        <EmptyState
          image="/v3/roles/creator.webp"
          title="Bạn chưa có dự án nào trong Studio"
          description="Bắt đầu với hướng dẫn 5 bước, chọn ảnh bìa 3D, tạo mức quà và chạy AI dự đoán thành công trước khi gửi duyệt."
          action={
            <ButtonLink href="/studio/new" size="lg">
              <Rocket className="size-5" /> Tạo dự án đầu tiên
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Dự án tham gia"
              value={<CountUp value={allProjects.length} />}
              sub={`${mine.length} dự án của tôi · ${collab.length} cộng tác · ${liveCount} đang chạy`}
              icon={<FolderKanban className="size-5" />}
              tone="violet"
            />
            <StatCard
              label="Tổng vốn dự án của tôi"
              value={<CountUp value={totalRaised} format="compact" />}
              sub="Tính cả khoản đang giữ chỗ"
              icon={<HandCoins className="size-5" />}
              tone="emerald"
            />
            <StatCard
              label="Tổng lượt ủng hộ"
              value={<CountUp value={totalBackers} />}
              sub="Trên các dự án bạn là chủ dự án"
              icon={<Users className="size-5" />}
              tone="amber"
            />
          </div>

          {/* Creator Projects */}
          <section>
            <SectionTitle
              title={
                <span className="flex items-center gap-2">
                  Dự án của tôi <RoleBadge role="CREATOR" />
                </span>
              }
              description="Các dự án do bạn tạo và toàn quyền cấu hình."
              action={
                <ButtonLink href="/studio/new" variant="ghost" size="sm">
                  <Plus className="size-4" /> Tạo mới
                </ButtonLink>
              }
            />
            {mine.length === 0 ? (
              <EmptyState
                compact
                image="/v3/roles/creator.webp"
                title="Bạn chưa tạo dự án nào"
                description="Hiện bạn đang cộng tác ở dự án bên dưới, hoặc bắt đầu chiến dịch riêng của bạn ngay."
                action={
                  <ButtonLink href="/studio/new" size="sm">
                    <Rocket className="size-4" /> Tạo dự án mới
                  </ButtonLink>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {mine.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 0.05}>
                    <StudioProjectCard card={p} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          {/* Collaborator Projects */}
          {collab.length > 0 && (
            <section>
              <SectionTitle
                title={
                  <span className="flex items-center gap-2">
                    Dự án tham gia cộng tác <RoleBadge role="COLLABORATOR" />
                  </span>
                }
                description="Bạn hỗ trợ soạn câu hỏi thường gặp, nháp bản tin, phản hồi bình luận AI và theo dõi thống kê."
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {collab.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 0.05}>
                    <StudioProjectCard card={p} />
                  </Reveal>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StudioProjectCard({ card: p }: { card: StudioCard }) {
  const pct = percentOf(p.pledged_amount, p.goal_amount);
  const left = timeLeft(p.end_at);
  const isDraft = p.role_code === "CREATOR" && ["DRAFT", "REJECTED"].includes(p.status);

  return (
    <TiltCard max={4} className="h-full rounded-[1.25rem]">
      <div className="card flex h-full flex-col overflow-hidden">
        <div className="relative aspect-[16/10] overflow-hidden">
          <StudioImage src={p.cover_url} alt={p.title} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow" style={{ background: p.category_color }}>
              {p.category_name}
            </span>
            <RoleBadge role={p.role_code} />
          </div>
          <div className="absolute bottom-3 left-3">
            <ProjectStatusBadge status={p.status} className="glass" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <Link href={isDraft ? `/studio/${p.slug}/setup` : `/studio/${p.slug}`} className="font-bold leading-snug hover:text-violet-600 dark:hover:text-violet-400">
              <h3 className="line-clamp-2">{p.title}</h3>
            </Link>
            <p className="mt-1 line-clamp-1 text-xs text-muted">{p.blurb || "Chưa có mô tả ngắn"}</p>
          </div>

          <div className="space-y-1.5">
            <FundingBar percent={pct} size="sm" />
            <div className="flex items-center justify-between text-xs">
              <span>
                <b className="text-emerald-600 dark:text-emerald-400">{formatCompactVnd(p.pledged_amount)}</b>{" "}
                <span className="text-muted">/ {formatCompactVnd(p.goal_amount)} ({pct}%)</span>
              </span>
              <span className="flex items-center gap-2 text-muted">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {p.backers_count}
                </span>
                {p.status === "LIVE" && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {left.label.replace("Còn ", "")}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Computed Next Step Pill */}
          <Link
            href={p.next.href}
            className={cn(
              "mt-auto block rounded-xl border p-3 transition hover:brightness-95 dark:hover:brightness-110",
              TONE_BOX[p.next.tone],
            )}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 shrink-0" /> {p.next.title}
              </span>
              <ArrowRight className="size-3.5 shrink-0" />
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] opacity-90">{p.next.detail}</p>
            {p.next.countdownTo && (
              <div className="mt-1 text-[11px] font-semibold">Mở lúc: {formatDate(p.next.countdownTo, true)}</div>
            )}
            {p.next.progress !== undefined && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                <div className="h-full rounded-full bg-current" style={{ width: `${Math.min(100, Math.max(4, p.next.progress))}%` }} />
              </div>
            )}
          </Link>

          <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs">
            <div className="flex items-center gap-2">
              {isDraft ? (
                <ButtonLink href={`/studio/${p.slug}/setup`} size="xs">
                  Tiếp tục Wizard
                </ButtonLink>
              ) : (
                <ButtonLink href={`/studio/${p.slug}`} size="xs" variant="secondary">
                  Mở Studio
                </ButtonLink>
              )}
              {isDraft && (
                <Link href={`/studio/${p.slug}`} className="font-semibold text-muted hover:text-fg">
                  Không gian quản lý
                </Link>
              )}
            </div>
            <Link href={`/p/${p.slug}`} className="font-semibold text-muted hover:text-violet-600 dark:hover:text-violet-400">
              Xem trang →
            </Link>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
