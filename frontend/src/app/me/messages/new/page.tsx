import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { buildQuickContacts, conversationComposeMeta } from "@/server/queries/me";
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

  const quickContacts = buildQuickContacts(v.username, meta, 8);

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
        quickContacts={quickContacts}
        relatedProjects={meta.relatedProjects}
      />
    </div>
  );
}
