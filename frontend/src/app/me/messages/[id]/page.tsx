import { notFound } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { conversationThread, myConversations } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { ConversationList, MarkReadOnMount, ThreadView } from "@/components/me/messages-ui";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/layout-bits";

export const metadata = { title: "Cuộc trò chuyện" };

export default async function MessageThreadPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const v = await requireViewer(`/me/messages/${id}`);
  if (!hasSystemPerm(v, "message.send")) {
    return <AdminOnlyNotice area="Tin nhắn nội bộ" />;
  }

  const thread = conversationThread(id, v.id);
  if (!thread) notFound();

  const conversations = myConversations(v.id);
  const hasUnread = thread.messages.some(
    (m) => m.sender_id !== v.id && (!thread.myLastReadAt || m.created_at > thread.myLastReadAt),
  );

  return (
    <div className="space-y-6">
      <MarkReadOnMount conversationId={id} hasUnread={hasUnread} />

      <PageHeader
        eyebrow="Tương tác · FR26"
        title="Tin nhắn nội bộ"
        actions={
          <ButtonLink href="/me/messages/new" size="sm">
            <MessageSquarePlus className="size-4" /> Tin nhắn mới
          </ButtonLink>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        <div className="hidden lg:block">
          <ConversationList conversations={conversations} viewerId={v.id} activeId={id} />
        </div>
        <ThreadView
          conv={thread.conv}
          participants={thread.participants}
          messages={thread.messages}
          viewerId={v.id}
        />
      </div>
    </div>
  );
}
