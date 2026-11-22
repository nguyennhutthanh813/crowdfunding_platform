import { MessageSquare } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { buildQuickContacts, conversationComposeMeta, myConversations } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { ConversationList, NewMessageModalButton } from "@/components/me/messages-ui";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Tin nhắn" };

export default async function MessagesInboxPage() {
  const v = await requireViewer("/me/messages");
  if (!hasSystemPerm(v, "message.send")) {
    return <AdminOnlyNotice area="Tin nhắn nội bộ" />;
  }

  const [conversations, composeMeta] = await Promise.all([
    myConversations(),
    conversationComposeMeta("", ""),
  ]);
  const quickContacts = buildQuickContacts(v.username, composeMeta);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Hộp thư"
        title="Tin nhắn nội bộ"
        description="Trao đổi trực tiếp với Chủ dự án, Cộng tác viên hoặc Người ủng hộ về dự án và phần quà."
        actions={<NewMessageModalButton quickContacts={quickContacts} size="sm" />}
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="Hộp thư trống"
          description="Bạn chưa có cuộc trò chuyện nào. Hãy nhắn tin trực tiếp tới Chủ dự án trên trang dự án hoặc bắt đầu hội thoại mới."
          action={<NewMessageModalButton quickContacts={quickContacts} size="md" label="Gửi tin nhắn mới" />}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
          <ConversationList conversations={conversations} viewerId={v.id} quickContacts={quickContacts} />

          <Card className="hidden flex-col items-center justify-center gap-3 p-10 text-center lg:flex">
            <span className="grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <MessageSquare className="size-7" />
            </span>
            <h3 className="text-lg font-bold">Chọn một cuộc trò chuyện</h3>
            <p className="max-w-sm text-sm text-muted">
              Chọn hội thoại ở danh sách bên trái để xem lịch sử trao đổi và gửi tin nhắn, hoặc soạn hội thoại mới ngay tại đây.
            </p>
            <NewMessageModalButton quickContacts={quickContacts} variant="outline" size="sm" label="Soạn tin nhắn mới" />
          </Card>
        </div>
      )}
    </div>
  );
}
