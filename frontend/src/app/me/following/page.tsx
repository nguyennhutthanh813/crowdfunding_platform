import Link from "next/link";
import { MessageSquare, Sparkles, Users } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { followingBundle } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { SafeAvatar } from "@/components/me/safe-media";
import { ProjectCard } from "@/components/project/project-card";
import { FollowButton } from "@/components/project/social-buttons";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/layout-bits";
import { Badge, Card, RoleBadge } from "@/components/ui/primitives";

export const metadata = { title: "Creator đang theo dõi" };

export default async function MyFollowingPage() {
  const v = await requireViewer("/me/following");
  if (!hasSystemPerm(v, "user.follow")) {
    return <AdminOnlyNotice area="Danh sách theo dõi" />;
  }

  const { creators: followed, suggestions, saved } = await followingBundle();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Khám phá"
        title="Creator đang theo dõi"
        description="Nhận thông báo mỗi khi những creator bạn yêu thích mở chiến dịch mới."
        actions={
          <ButtonLink href="/explore" variant="outline" size="sm">
            Khám phá dự án
          </ButtonLink>
        }
      />

      {followed.length === 0 ? (
        <EmptyState
          title="Bạn chưa theo dõi creator nào"
          description="Hãy nhấn Theo dõi trên trang dự án hoặc chọn một vài creator gợi ý bên dưới."
          action={<ButtonLink href="/explore">Tìm creator</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {followed.map((c) => (
            <Card key={c.id} className="p-4 sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <SafeAvatar name={c.display_name} src={c.avatar_url} size={48} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link href={`/u/${c.username}`} className="truncate text-base font-bold hover:underline">
                            {c.display_name}
                          </Link>
                          <RoleBadge role="CREATOR" />
                        </div>
                        <div className="text-xs text-muted">@{c.username}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ButtonLink href={`/me/messages/new?to=${encodeURIComponent(c.username)}`} variant="outline" size="sm">
                        <MessageSquare className="size-3.5" /> Nhắn tin
                      </ButtonLink>
                      <FollowButton userId={c.id} following />
                    </div>
                  </div>

                  {c.bio && <p className="line-clamp-2 text-sm text-muted">{c.bio}</p>}

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge tone="neutral">{c.project_count} dự án công khai</Badge>
                    {c.live_count > 0 && <Badge tone="emerald" dot>{c.live_count} đang gọi vốn</Badge>}
                    <Badge tone="slate">{c.follower_count} người theo dõi</Badge>
                  </div>
                </div>

                <div>
                  {c.latest ? (
                    <ProjectCard p={c.latest} saved={saved.has(c.latest.id)} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line bg-surface-2/40 p-6 text-center text-xs text-muted">
                      Creator chưa có dự án công khai mới.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <SectionTitle
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="size-5 text-violet-500" /> Gợi ý creator phù hợp với bạn
              </span>
            }
            description="Dựa trên thể loại dự án bạn đã góp hoặc đã lưu."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {suggestions.map((s) => (
              <Card key={s.id} className="flex flex-col justify-between gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <SafeAvatar name={s.display_name} src={s.avatar_url} size={44} />
                    <div className="min-w-0">
                      <Link href={`/u/${s.username}`} className="truncate block font-bold hover:underline">
                        {s.display_name}
                      </Link>
                      <div className="text-xs text-muted">@{s.username}</div>
                    </div>
                  </div>
                  <FollowButton userId={s.id} following={false} />
                </div>

                {s.bio && <p className="line-clamp-2 text-xs text-muted">{s.bio}</p>}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {s.affinity > 0 && <Badge tone="violet">Cùng thể loại bạn thích</Badge>}
                  {s.live_count > 0 && <Badge tone="emerald">{s.live_count} đang chạy</Badge>}
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Users className="size-3" /> {s.follower_count} fan · {s.backers} backer
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
