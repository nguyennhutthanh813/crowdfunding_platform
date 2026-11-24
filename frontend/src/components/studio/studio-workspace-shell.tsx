"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FolderKanban,
  Gift,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Package,
  PenLine,
  Plus,
  Rocket,
  Settings,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { WorkspaceShell, type WorkspaceNavGroup } from "@/components/layout/workspace-shell";
import { ButtonLink } from "@/components/ui/button";
import { ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { LeaveProjectButton } from "./studio-invitations";
import { StudioImage } from "./media";
import type { StudioTabKey } from "./meta";

const STATUS_DOT_COLOR: Record<string, string> = {
  LIVE: "#10b981",
  PENDING_REVIEW: "#f59e0b",
  SCHEDULED: "#0ea5e9",
  DRAFT: "#94a3b8",
  REJECTED: "#f43f5e",
  SUSPENDED: "#f43f5e",
  SUCCESS: "#7c3aed",
  FULFILLING: "#7c3aed",
  COMPLETED: "#10b981",
  FAILED: "#71717a",
  CANCELLED: "#71717a",
};

function renderStudioIcon(iconKey: string, className?: string) {
  switch (iconKey) {
    case "folder":
      return <FolderKanban className={className} />;
    case "plus":
      return <Plus className={className} />;
    case "overview":
      return <LayoutDashboard className={className} />;
    case "content":
      return <PenLine className={className} />;
    case "rewards":
      return <Gift className={className} />;
    case "updates":
      return <Newspaper className={className} />;
    case "faq":
      return <HelpCircle className={className} />;
    case "comments":
      return <MessageSquare className={className} />;
    case "backers":
      return <Users className={className} />;
    case "fulfillment":
      return <Package className={className} />;
    case "team":
      return <UsersRound className={className} />;
    case "settings":
      return <Settings className={className} />;
    case "dot":
      return <FolderKanban className={className} />;
    default:
      return <FolderKanban className={className} />;
  }
}

export function StudioHubShell({
  mine,
  collab,
  pendingInvites = 0,
  children,
}: {
  mine: { slug: string; title: string; status: string }[];
  collab: { slug: string; title: string; status: string }[];
  pendingInvites?: number;
  children: ReactNode;
}) {
  const groups: WorkspaceNavGroup[] = [
    {
      title: "Không gian Studio",
      items: [
        {
          href: "/studio",
          label: "Tất cả dự án",
          iconKey: "folder",
          exact: true,
          badge: pendingInvites > 0 ? pendingInvites : undefined,
          badgeTone: "amber",
        },
        {
          href: "/studio/new",
          label: "Tạo dự án mới",
          iconKey: "plus",
          exact: true,
        },
      ],
    },
    ...(mine.length > 0
      ? [
          {
            title: "Dự án của tôi",
            items: mine.slice(0, 6).map((p) => ({
              href: `/studio/${p.slug}`,
              label: p.title,
              iconKey: "dot",
              statusColor: STATUS_DOT_COLOR[p.status] ?? "#94a3b8",
            })),
          },
        ]
      : []),
    ...(collab.length > 0
      ? [
          {
            title: "Dự án cộng tác",
            items: collab.slice(0, 6).map((p) => ({
              href: `/studio/${p.slug}`,
              label: p.title,
              iconKey: "dot",
              statusColor: STATUS_DOT_COLOR[p.status] ?? "#0ea5e9",
            })),
          },
        ]
      : []),
  ];

  return (
    <WorkspaceShell
      accent="violet"
      groups={groups}
      renderIcon={renderStudioIcon}
      maxContentWidth="max-w-[1360px]"
      mobileTitle="Studio Dự án"
      mobileAction={
        <ButtonLink href="/studio/new" size="xs">
          <Plus className="size-3.5" /> Tạo mới
        </ButtonLink>
      }
      header={(collapsed) =>
        collapsed ? (
          <div className="flex justify-center">
            <span className="grid size-8 place-items-center rounded-xl bg-brand-gradient text-white shadow">
              <Rocket className="size-4" />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow">
              <Rocket className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-fg">Studio Dự án</div>
              <div className="truncate text-[11px] text-muted">Quản lý &amp; Sáng tạo</div>
            </div>
          </div>
        )
      }
      footer={(collapsed) =>
        collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Link
              href="/me/messages"
              title="Tin nhắn nội bộ"
              aria-label="Tin nhắn nội bộ"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <MessageSquare className="size-4" />
            </Link>
            <Link
              href="/me"
              title="Khu vực Của tôi"
              aria-label="Khu vực Của tôi"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <UserRound className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            <Link
              href="/me/messages"
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <MessageSquare className="size-4" /> Tin nhắn nội bộ
            </Link>
            <Link
              href="/me"
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <UserRound className="size-4" /> Khu vực Của tôi
            </Link>
          </div>
        )
      }
    >
      {children}
    </WorkspaceShell>
  );
}

const STUDIO_NAV_GROUPS: {
  title: string;
  items: { key: StudioTabKey; label: string; perm: string; iconKey: string }[];
}[] = [
  {
    title: "Chiến dịch",
    items: [
      { key: "overview", label: "Tổng quan & AI", perm: "insight.view", iconKey: "overview" },
      { key: "content", label: "Nội dung", perm: "project.edit", iconKey: "content" },
      { key: "rewards", label: "Phần quà", perm: "reward.manage", iconKey: "rewards" },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      { key: "updates", label: "Bản tin cập nhật", perm: "update.draft", iconKey: "updates" },
      { key: "faq", label: "Hỏi đáp", perm: "faq.manage", iconKey: "faq" },
      { key: "comments", label: "Bình luận & AI", perm: "comment.reply", iconKey: "comments" },
    ],
  },
  {
    title: "Vận hành",
    items: [
      { key: "backers", label: "Người ủng hộ", perm: "backer.view", iconKey: "backers" },
      { key: "fulfillment", label: "Giao quà", perm: "fulfillment.manage", iconKey: "fulfillment" },
      { key: "team", label: "Nhóm & CTV", perm: "member.manage", iconKey: "team" },
      { key: "settings", label: "Cài đặt & Lịch", perm: "project.schedule", iconKey: "settings" },
    ],
  },
];

export function StudioProjectShell({
  project,
  role,
  perms,
  activeTab,
  counts,
  children,
}: {
  project: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    status: string;
  };
  role: "CREATOR" | "COLLABORATOR";
  perms: string[];
  activeTab: StudioTabKey;
  counts: { pendingComments: number; draftUpdates: number; faqs: number; backers: number };
  children: ReactNode;
}) {
  const permSet = new Set(perms);

  const groups: WorkspaceNavGroup[] = STUDIO_NAV_GROUPS.map((g) => ({
    title: g.title,
    items: g.items
      .filter((it) => permSet.has(it.perm))
      .map((it) => ({
        href: it.key === "overview" ? `/studio/${project.slug}` : `/studio/${project.slug}?tab=${it.key}`,
        label: it.label,
        iconKey: it.iconKey,
        activeMatch: activeTab === it.key,
        badge:
          it.key === "comments" && counts.pendingComments > 0
            ? counts.pendingComments
            : it.key === "updates" && counts.draftUpdates > 0
              ? counts.draftUpdates
              : undefined,
        badgeTone: (it.key === "updates" ? "amber" : "violet") as "amber" | "violet",
        count:
          it.key === "faq" && counts.faqs > 0
            ? counts.faqs
            : it.key === "backers" && counts.backers > 0
              ? counts.backers
              : undefined,
      })),
  })).filter((g) => g.items.length > 0);

  const currentItem = groups.flatMap((g) => g.items).find((it) => it.activeMatch);
  const canOpenWizard = permSet.has("project.edit") && ["DRAFT", "REJECTED"].includes(project.status);

  return (
    <WorkspaceShell
      accent="violet"
      groups={groups}
      renderIcon={renderStudioIcon}
      maxContentWidth="max-w-[1360px]"
      mobileTitle={currentItem?.label ?? project.title}
      mobileAction={
        <Link
          href="/studio"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" /> Studio
        </Link>
      }
      header={(collapsed) =>
        collapsed ? (
          <div className="flex justify-center">
            <div className="relative size-8 overflow-hidden rounded-lg border border-line">
              <StudioImage src={project.cover_url} alt={project.title} sizes="32px" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition hover:text-fg"
            >
              <ArrowLeft className="size-3" /> Danh sách Studio
            </Link>
            <div className="flex items-start gap-2.5">
              <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                <StudioImage src={project.cover_url} alt={project.title} sizes="48px" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-xs font-extrabold leading-snug text-fg">{project.title}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <ProjectStatusBadge status={project.status} />
              <RoleBadge role={role} />
            </div>
          </div>
        )
      }
      footer={(collapsed) =>
        collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {canOpenWizard && (
              <Link
                href={`/studio/${project.slug}/setup`}
                title="Mở Wizard 5 bước"
                aria-label="Mở Wizard 5 bước"
                className="grid size-9 place-items-center rounded-xl text-violet-600 transition hover:bg-violet-500/10 dark:text-violet-400"
              >
                <Rocket className="size-4" />
              </Link>
            )}
            <Link
              href={`/p/${project.slug}`}
              title="Xem trang công khai"
              aria-label="Xem trang công khai"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <ExternalLink className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {canOpenWizard && (
              <ButtonLink href={`/studio/${project.slug}/setup`} size="xs" className="w-full justify-center">
                <Rocket className="size-3.5" /> Mở Wizard 5 bước
              </ButtonLink>
            )}
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/p/${project.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <ExternalLink className="size-3.5" /> Xem trang công khai
              </Link>
            </div>
            {role === "COLLABORATOR" && (
              <LeaveProjectButton projectId={project.id} projectTitle={project.title} size="xs" />
            )}
          </div>
        )
      }
    >
      {children}
    </WorkspaceShell>
  );
}
