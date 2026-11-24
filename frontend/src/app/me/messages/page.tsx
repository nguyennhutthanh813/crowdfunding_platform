import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { buildQuickContacts, conversationComposeMeta, conversationThread, myConversations } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { MessengerWorkspace } from "@/components/me/messages-ui";

export const metadata = { title: "Tin nhắn" };

export default async function MessagesInboxPage() {
  const v = await requireViewer("/me/messages");
  if (!hasSystemPerm(v, "message.send")) {
    return (
      <div className="p-4 sm:p-6">
        <AdminOnlyNotice area="Tin nhắn nội bộ" />
      </div>
    );
  }

  const [conversations, composeMeta] = await Promise.all([
    myConversations(),
    conversationComposeMeta("", ""),
  ]);
  const quickContacts = buildQuickContacts(v.username, composeMeta);
  const firstId = conversations[0]?.id ?? null;
  const initialThread = firstId ? await conversationThread(firstId) : null;

  return (
    <MessengerWorkspace
      initialConversations={conversations}
      viewerId={v.id}
      initialActiveId={initialThread ? firstId : null}
      initialThread={initialThread}
      mobileMode="inbox"
      quickContacts={quickContacts}
      relatedProjects={composeMeta.relatedProjects}
    />
  );
}
