import { requireSystemPerm } from "@/server/auth/session";
import { meSummary, myNotifications } from "@/server/queries/me";
import { MarkAllNotificationsButton, NotificationsList } from "@/components/me/notifications-ui";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { PaginationBar } from "@/components/ui/pagination";
import { LinkTabs } from "@/components/ui/tabs";

export const metadata = { title: "Thông báo" };

const NOTIF_PAGE_SIZE = 20;

export default async function MyNotificationsPage(props: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  await requireSystemPerm("account.manage", "/me/notifications");
  const sp = await props.searchParams;
  const filter = sp.filter === "unread" ? "unread" : "all";

  const [summary, items] = await Promise.all([meSummary(), myNotifications(filter === "unread", 150)]);
  const unreadCount = summary?.unread_notifications ?? 0;
  const pages = Math.max(1, Math.ceil(items.length / NOTIF_PAGE_SIZE));
  const curPage = Math.max(1, Math.min(Math.floor(Number(sp.page) || 1), pages));
  const paged = items.slice((curPage - 1) * NOTIF_PAGE_SIZE, curPage * NOTIF_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cập nhật"
        title="Thông báo"
        description="Cập nhật tiến độ dự án, phản hồi bình luận, tin nhắn và trạng thái kiểm duyệt."
        actions={<MarkAllNotificationsButton unreadCount={unreadCount} />}
      />

      <LinkTabs
        id="notif-filter"
        param="filter"
        active={filter}
        items={[
          { key: "all", label: "Tất cả" },
          { key: "unread", label: "Chưa đọc", count: unreadCount },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "Không còn thông báo chưa đọc" : "Chưa có thông báo nào"}
          description={
            filter === "unread"
              ? "Tuyệt vời! Bạn đã xem hết mọi thông báo mới."
              : "Thông báo mới về dự án và tài khoản sẽ hiển thị tại đây."
          }
          action={
            filter === "unread" ? (
              <ButtonLink href="/me/notifications?filter=all" variant="outline">
                Xem tất cả thông báo
              </ButtonLink>
            ) : (
              <ButtonLink href="/explore">Khám phá dự án</ButtonLink>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <NotificationsList items={paged} />
          <PaginationBar
            basePath="/me/notifications"
            page={curPage}
            pages={pages}
            total={items.length}
            params={filter === "unread" ? { filter: "unread" } : {}}
            itemLabel="thông báo"
          />
        </div>
      )}
    </div>
  );
}
