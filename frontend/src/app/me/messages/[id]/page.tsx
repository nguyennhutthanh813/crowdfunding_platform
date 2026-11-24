import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { buildQuickContacts, conversationComposeMeta, conversationThread, myConversations } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { MarkReadOnMount, MessengerWorkspace } from "@/components/me/messages-ui";

export const metadata = { title: "Cuộc trò chuyện" };

export default async function MessageThreadPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const v = await requireViewer(`/me/messages/${id}`);
  if (!hasSystemPerm(v, "message.send")) {
    return (
      <div className="p-4 sm:p-6">
        <AdminOnlyNotice area="Tin nhắn nội bộ" />
      </div>
    );
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
    <>
      <MarkReadOnMount conversationId={id} hasUnread={hasUnread} />
      <MessengerWorkspace
        key={id}
        initialConversations={conversations}
        viewerId={v.id}
        initialActiveId={id}
        initialThread={thread}
        mobileMode="thread"
        quickContacts={quickContacts}
        relatedProjects={composeMeta.relatedProjects}
      />
    </>
  );
}
