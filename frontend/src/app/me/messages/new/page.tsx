import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { conversationComposeMeta } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { NewMessageForm } from "@/components/me/messages-ui";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/layout-bits";

export const metadata = { title: "Tin nhắn mới" };

export default async function NewMessagePage(props: {
  searchParams: Promise<{ to?: string; project?: string }>;
}) {
  const v = await requireViewer("/me/messages/new");
  if (!hasSystemPerm(v, "message.send")) {
    return <AdminOnlyNotice area="Tin nhắn nội bộ" />;
  }

  const sp = await props.searchParams;
  const toParam = (sp.to ?? "").trim().replace(/^@/, "");
  const projectParam = (sp.project ?? "").trim();

  const meta = await conversationComposeMeta(toParam, projectParam);
  const rawUser = meta.targetUser;
  const toValid = rawUser && rawUser.id !== v.id && rawUser.status === "ACTIVE" ? rawUser : null;
  const toWarning =
    toParam && !toValid
      ? rawUser?.id === v.id
        ? "Bạn không thể tự nhắn tin cho chính mình."
        : `Không tìm thấy người dùng hoạt động @${toParam}.`
      : null;

  const rawProj = meta.targetProject;
  const projValid = rawProj ? { slug: rawProj.slug, title: rawProj.title, status: rawProj.status } : null;

  // Build deduplicated quick contacts from followed creators, backed project creators, and suggestions
  const seen = new Set<string>([v.username]);
  const quickContacts: { username: string; display_name: string; avatar_url: string | null; hint: string }[] = [];

  for (const c of meta.followed) {
    if (seen.has(c.username)) continue;
    seen.add(c.username);
    quickContacts.push({ username: c.username, display_name: c.display_name, avatar_url: c.avatar_url, hint: "Đang theo dõi" });
  }
  for (const p of meta.pledges) {
    if (seen.has(p.creator_username)) continue;
    seen.add(p.creator_username);
    quickContacts.push({ username: p.creator_username, display_name: p.creator_name, avatar_url: null, hint: p.title });
  }
  for (const s of meta.suggestions) {
    if (seen.has(s.username)) continue;
    seen.add(s.username);
    quickContacts.push({ username: s.username, display_name: s.display_name, avatar_url: s.avatar_url, hint: "Creator" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hộp thư"
        title="Soạn tin nhắn mới"
        description="Bắt đầu cuộc trò chuyện riêng hoặc tiếp tục hội thoại sẵn có cùng ngữ cảnh dự án."
        actions={
          <ButtonLink href="/me/messages" variant="outline" size="sm">
            <ArrowLeft className="size-4" /> Quay lại hộp thư
          </ButtonLink>
        }
      />

      {toWarning && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" /> {toWarning}
          </span>
          <Link href="/me/messages/new" className="text-xs font-bold underline">
            Xoá bộ lọc
          </Link>
        </div>
      )}

      <NewMessageForm
        prefillTo={toValid ? toValid.username : toParam && !toWarning ? toParam : ""}
        prefillToDisplay={
          toValid
            ? { username: toValid.username, display_name: toValid.display_name, avatar_url: toValid.avatar_url }
            : null
        }
        prefillProject={projValid}
        quickContacts={quickContacts.slice(0, 8)}
      />
    </div>
  );
}
