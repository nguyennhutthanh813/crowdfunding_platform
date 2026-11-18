import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Calendar, EyeOff, FolderKanban, HeartHandshake, MapPin, MessageSquare, Settings, UserCheck, Users } from "lucide-react";
import { getViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { getPublicProfile, isFollowing, profileBackedProjects, profileCreatedProjects } from "@/server/queries/public";
import { savedProjectIds } from "@/server/queries/projects";
import { ProjectCard } from "@/components/project/project-card";
import { FollowButton } from "@/components/project/social-buttons";
import { Reveal } from "@/components/fx/motion";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, StatCard } from "@/components/ui/layout-bits";
import { Avatar, Badge, RoleBadge, Skeleton } from "@/components/ui/primitives";
import { LinkTabs, type TabItem } from "@/components/ui/tabs";
import { ReportDialog } from "@/components/public/project-hero-actions";
import { COUNTRY_NAMES, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await props.params;
  const profile = getPublicProfile(username);
  if (!profile) return { title: "Không tìm thấy người dùng" };
  return {
    title: `${profile.display_name} (@${profile.username})`,
    description: profile.bio || `Hồ sơ cộng đồng của ${profile.display_name} trên FundViet.`,
  };
}

export default async function PublicProfilePage(props: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await props.params;
  const sp = await props.searchParams;
  const profile = getPublicProfile(username);
  if (!profile) notFound();

  const viewer = await getViewer();
  const isSelf = viewer?.id === profile.id;
  const showBackedTab = profile.hide_backed !== 1 || isSelf;
  const following = isFollowing(viewer?.id, profile.id);
  const saved = savedProjectIds(viewer?.id);
  const showSave = !viewer || hasSystemPerm(viewer, "project.save");
  const showFollow = !isSelf && (!viewer || hasSystemPerm(viewer, "user.follow"));
  const showMessage = !isSelf && (!viewer || hasSystemPerm(viewer, "message.send"));
  const canReport = !isSelf && Boolean(viewer && hasSystemPerm(viewer, "report.create"));

  const rawTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const defaultTab = profile.created > 0 || !showBackedTab ? "created" : "backed";
  const activeTab: "created" | "backed" =
    rawTab === "backed" && showBackedTab ? "backed" : rawTab === "created" ? "created" : defaultTab;

  const projects =
    activeTab === "created"
      ? profileCreatedProjects(profile.id)
      : profileBackedProjects(profile.id, isSelf);

  const tabs: TabItem[] = [
    { key: "created", label: "Dự án đã tạo", icon: <FolderKanban className="size-4" />, count: profile.created },
    ...(showBackedTab
      ? [{ key: "backed", label: "Dự án đã góp", icon: <HeartHandshake className="size-4" />, count: profile.backed }]
      : []),
  ];

  const locationText = [profile.province, COUNTRY_NAMES[profile.country_code] ?? profile.country_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      {/* Đầu trang hồ sơ */}
      <section className="card relative overflow-hidden p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/12 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar name={profile.display_name} src={profile.avatar_url} size={84} className="ring-4 ring-surface-2" />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{profile.display_name}</h1>
                {profile.is_admin === 1 ? (
                  <RoleBadge role="ADMIN" />
                ) : (
                  <RoleBadge role="BACKER" />
                )}
                {profile.created > 0 && <RoleBadge role="CREATOR" />}
                {profile.collab > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <RoleBadge role="COLLABORATOR" />
                    <span className="text-xs text-muted">×{profile.collab}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span>@{profile.username}</span>
                {locationText && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" /> {locationText}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" /> Tham gia từ {formatDate(profile.created_at)}
                </span>
              </div>

              {profile.bio && (
                <p className="max-w-2xl text-sm leading-relaxed text-fg/90 sm:text-base">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isSelf ? (
              <ButtonLink href="/me/settings" variant="outline" size="sm">
                <Settings className="size-4" /> Chỉnh sửa hồ sơ
              </ButtonLink>
            ) : (
              <>
                {showFollow && <FollowButton userId={profile.id} following={following} size="md" />}
                {showMessage && (
                  <ButtonLink
                    href={
                      viewer
                        ? `/me/messages/new?to=${encodeURIComponent(profile.username)}`
                        : `/login?next=${encodeURIComponent(`/me/messages/new?to=${profile.username}`)}`
                    }
                    variant="outline"
                    size="md"
                  >
                    <MessageSquare className="size-4" /> Nhắn tin
                  </ButtonLink>
                )}
                {(canReport || !viewer) && (
                  <ReportDialog
                    targetType="USER"
                    userId={profile.id}
                    targetLabel={profile.display_name}
                    canReport={canReport}
                    isGuest={!viewer}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Thống kê nhanh */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Dự án đã tạo"
          value={profile.created}
          icon={<FolderKanban className="size-5" />}
          tone="amber"
        />
        <StatCard
          label="Dự án đã góp"
          value={showBackedTab ? profile.backed : "Riêng tư"}
          icon={<HeartHandshake className="size-5" />}
          tone="emerald"
        />
        <StatCard
          label="Người theo dõi"
          value={profile.followers}
          icon={<Users className="size-5" />}
          tone="violet"
        />
        <StatCard
          label="Đang theo dõi"
          value={profile.following}
          icon={<UserCheck className="size-5" />}
          tone="sky"
        />
      </section>

      {/* Tabs Dự án đã tạo / Dự án đã góp */}
      <section className="space-y-5">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-2">
          <Suspense fallback={<Skeleton className="h-10 w-64" />}>
            <LinkTabs items={tabs} active={activeTab} id="profile-tabs" />
          </Suspense>
          {isSelf && profile.hide_backed === 1 && (
            <Badge tone="slate" className="mr-2">
              <EyeOff className="size-3" /> Chỉ bạn thấy tab Dự án đã góp
            </Badge>
          )}
        </div>

        {projects.length === 0 ? (
          <EmptyState
            compact
            title={
              activeTab === "created"
                ? `${profile.display_name} chưa mở dự án công khai nào`
                : `${profile.display_name} chưa có dự án góp vốn công khai`
            }
            description={
              activeTab === "created" && isSelf
                ? "Khởi tạo ý tưởng đầu tiên của bạn trong Studio."
                : "Khám phá thêm các dự án thú vị khác trên FundViet."
            }
            action={
              activeTab === "created" && isSelf ? (
                <ButtonLink href="/studio/new" size="sm">
                  Tạo dự án mới
                </ButtonLink>
              ) : (
                <ButtonLink href="/explore" variant="outline" size="sm">
                  Khám phá dự án
                </ButtonLink>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.04}>
                <ProjectCard p={p} saved={saved.has(p.id)} showSave={showSave} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
