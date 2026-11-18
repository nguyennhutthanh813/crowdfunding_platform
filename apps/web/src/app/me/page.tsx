import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  Bookmark,
  Clock,
  Compass,
  HandCoins,
  MessageSquare,
  Rocket,
  Sparkles,
} from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import {
  meSummary,
  pendingInvitations,
  recentNotifications,
  recommendations,
  savedIds,
  waitingPledges,
} from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { InvitationCards } from "@/components/me/invitation-cards";
import { SafeImage } from "@/components/me/safe-media";
import { WelcomeBanner } from "@/components/me/welcome-banner";
import { ProjectCard } from "@/components/project/project-card";
import { ButtonLink } from "@/components/ui/button";
import { FundingBar } from "@/components/ui/funding-bar";
import { SectionTitle } from "@/components/ui/layout-bits";
import { Badge, Card } from "@/components/ui/primitives";
import { cn, formatVnd, percentOf, timeAgo, timeLeft } from "@/lib/utils";

export const metadata = { title: "Của tôi" };

export default async function MeOverviewPage(props: {
  searchParams: Promise<{ welcome?: string; tab?: string }>;
}) {
  const v = await requireViewer("/me");
  if (!hasSystemPerm(v, "pledge.history.view")) {
    return <AdminOnlyNotice area="Tổng quan cá nhân" />;
  }

  const sp = await props.searchParams;
  const isWelcome = sp.welcome === "1";

  const summary = meSummary(v.id);
  const invitations = pendingInvitations(v.id, v.email);
  const waiting = waitingPledges(v.id);
  const notifs = recentNotifications(v.id, 5);
  const recos = recommendations(v.id, 3);
  const saved = savedIds(v.id);

  return (
    <div className="space-y-8">
      {isWelcome && <WelcomeBanner name={summary.display_name} />}

      <InvitationCards invitations={invitations} />

      {/* Waiting AUTHORIZED pledges strip */}
      <section className="space-y-3">
        <SectionTitle
          title={
            <span className="flex items-center gap-2">
              <Clock className="size-5 text-sky-500" /> Đang chờ kết quả gọi vốn
            </span>
          }
          description="Các khoản giữ chỗ trên dự án đang chạy — tiền chỉ bị trừ khi đạt mục tiêu."
          action={
            <ButtonLink href="/me/backed" variant="ghost" size="xs">
              Lịch sử góp vốn <ArrowRight className="size-3.5" />
            </ButtonLink>
          }
        />

        {waiting.length === 0 ? (
          <Card className="flex flex-col items-center justify-between gap-4 p-5 text-center sm:flex-row sm:text-left">
            <div className="space-y-1">
              <div className="font-bold">Chưa có khoản góp vốn nào đang chờ kết quả</div>
              <p className="text-sm text-muted">Khám phá các chiến dịch đang gọi vốn để ủng hộ ý tưởng bạn thích.</p>
            </div>
            <ButtonLink href="/explore" size="sm">
              <Compass className="size-4" /> Khám phá dự án
            </ButtonLink>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {waiting.map((w) => {
              const pct = percentOf(w.pledged_amount, w.goal_amount);
              const left = timeLeft(w.end_at);
              return (
                <Card key={w.id} className="p-4 transition hover:border-violet-400/50">
                  <div className="flex gap-3">
                    <Link
                      href={`/p/${w.slug}`}
                      className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2"
                    >
                      {w.cover_url && <SafeImage src={w.cover_url} alt={w.title} fill sizes="96px" className="object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="sky" dot>
                          Đang giữ chỗ
                        </Badge>
                        <span className="text-[11px] font-medium text-muted">{left.label}</span>
                      </div>
                      <Link href={`/p/${w.slug}`} className="line-clamp-1 block text-sm font-bold hover:text-violet-600 dark:hover:text-violet-400">
                        {w.title}
                      </Link>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted">{w.tier_title ?? "Góp không nhận quà"}</span>
                        <span className="shrink-0 font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatVnd(w.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <FundingBar percent={pct} size="sm" className="flex-1" />
                    <span className="text-xs font-bold tabular-nums text-muted">{pct}%</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/me/backed", label: "Đã góp vốn", sub: `${summary.backed_projects} dự án`, icon: HandCoins, tone: "text-emerald-500" },
          { href: "/me/saved", label: "Đã lưu", sub: `${summary.saved_count} dự án`, icon: Bookmark, tone: "text-rose-500" },
          {
            href: "/me/messages",
            label: "Tin nhắn",
            sub: summary.unread_messages > 0 ? `${summary.unread_messages} chưa đọc` : "Hộp thư",
            icon: MessageSquare,
            tone: "text-violet-500",
          },
          {
            href: summary.creator_count + summary.collab_count > 0 ? "/studio" : "/studio/new",
            label: summary.creator_count + summary.collab_count > 0 ? "Mở Studio" : "Tạo dự án",
            sub: summary.creator_count + summary.collab_count > 0 ? "Quản lý chiến dịch" : "Trở thành Creator",
            icon: Rocket,
            tone: "text-amber-500",
          },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="card flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-violet-400/50"
          >
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2", q.tone)}>
              <q.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{q.label}</div>
              <div className="truncate text-xs text-muted">{q.sub}</div>
            </div>
          </Link>
        ))}
      </section>

      {/* Recent notifications */}
      <section className="space-y-3">
        <SectionTitle
          title={
            <span className="flex items-center gap-2">
              <Bell className="size-5 text-violet-500" /> Thông báo gần đây
            </span>
          }
          action={
            <ButtonLink href="/me/notifications" variant="ghost" size="xs">
              Xem tất cả <ArrowRight className="size-3.5" />
            </ButtonLink>
          }
        />

        {notifs.length === 0 ? (
          <Card className="p-5 text-center text-sm text-muted">Chưa có thông báo mới.</Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {notifs.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "/me/notifications"}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-2/60"
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-violet-600")} />
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm", n.read_at ? "font-medium" : "font-bold")}>{n.title}</div>
                  {n.body && <div className="line-clamp-1 text-xs text-muted">{n.body}</div>}
                </div>
                <span className="shrink-0 text-[11px] text-muted">{timeAgo(n.created_at)}</span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {/* Top 3 recommendations */}
      {recos.items.length > 0 && (
        <section className="space-y-3">
          <SectionTitle
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" /> Gợi ý dành riêng cho bạn
              </span>
            }
            description={recos.coldStart ? "Các dự án đang thịnh hành trên FundViet." : "Dựa trên thể loại bạn thích và creator bạn theo dõi."}
            action={
              <div className="flex gap-1">
                <ButtonLink href="/me/activity" variant="ghost" size="xs">
                  <Activity className="size-3.5" /> Hoạt động
                </ButtonLink>
                <ButtonLink href="/me/recommended" variant="ghost" size="xs">
                  Xem tất cả <ArrowRight className="size-3.5" />
                </ButtonLink>
              </div>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recos.items.map((item) => (
              <div key={item.project.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1 px-1">
                  {item.reasons.slice(0, 2).map((r) => (
                    <Badge key={r} tone="violet">
                      {r}
                    </Badge>
                  ))}
                </div>
                <ProjectCard p={item.project} saved={saved.has(item.project.id)} className="flex-1" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
