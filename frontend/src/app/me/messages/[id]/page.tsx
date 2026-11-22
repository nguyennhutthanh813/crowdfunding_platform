import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { buildQuickContacts, conversationComposeMeta, conversationThread, myConversations } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { ConversationList, MarkReadOnMount, NewMessageModalButton, ThreadView } from "@/components/me/messages-ui";
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

  const [thread, conversations, composeMeta] = await Promise.all([
    conversationThread(id),
    myConversations(),
    conversationComposeMeta("", ""),
  ]);
  if (!thread) notFound();
  const quickContacts = buildQuickContacts(v.username, composeMeta);

  const hasUnread = thread.messages.some(
    (m) => m.sender_id !== v.id && (!thread.myLastReadAt || m.created_at > thread.myLastReadAt),
  );

  return (
    <div className="space-y-5">
      <MarkReadOnMount conversationId={id} hasUnread={hasUnread} />

      <PageHeader
        eyebrow="Hộp thư"
        title="Tin nhắn nội bộ"
        actions={<NewMessageModalButton quickContacts={quickContacts} size="sm" />}
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        <div className="hidden lg:block">
          <ConversationList
            conversations={conversations}
            viewerId={v.id}
            activeId={id}
            quickContacts={quickContacts}
          />
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
