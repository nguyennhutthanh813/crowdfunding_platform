import { MessageSquare, MessageSquarePlus } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { myConversations } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { ConversationList } from "@/components/me/messages-ui";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Tin nhắn" };

export default async function MessagesInboxPage() {
  const v = await requireViewer("/me/messages");
  if (!hasSystemPerm(v, "message.send")) {
    return <AdminOnlyNotice area="Tin nhắn nội bộ" />;
  }

  const conversations = await myConversations();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hộp thư"
        title="Tin nhắn nội bộ"
        description="Trao đổi trực tiếp với Creator, Collaborator hoặc Backer về dự án và phần quà."
        actions={
          <ButtonLink href="/me/messages/new" size="sm">
            <MessageSquarePlus className="size-4" /> Tin nhắn mới
          </ButtonLink>
        }
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="Hộp thư trống"
          description="Bạn chưa có cuộc trò chuyện nào. Hãy nhắn tin trực tiếp tới Creator trên trang dự án hoặc bắt đầu hội thoại mới."
          action={
            <ButtonLink href="/me/messages/new">
              <MessageSquarePlus className="size-4" /> Gửi tin nhắn mới
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
          <ConversationList conversations={conversations} viewerId={v.id} />

          <Card className="hidden flex-col items-center justify-center gap-3 p-12 text-center lg:flex">
            <span className="grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <MessageSquare className="size-7" />
            </span>
            <h3 className="text-lg font-bold">Chọn một cuộc trò chuyện</h3>
            <p className="max-w-sm text-sm text-muted">
              Chọn hội thoại ở danh sách bên trái để xem lịch sử trao đổi và gửi tin nhắn, hoặc tạo cuộc trò chuyện mới.
            </p>
            <ButtonLink href="/me/messages/new" variant="outline" size="sm" className="mt-1">
              <MessageSquarePlus className="size-4" /> Soạn tin nhắn mới
            </ButtonLink>
          </Card>
        </div>
      )}
    </div>
  );
}
