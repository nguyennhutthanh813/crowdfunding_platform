import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { activityFeed } from "@/server/queries/me";
import { ActivityFeedList } from "@/components/me/activity-feed";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";

export const metadata = { title: "Hoạt động" };

export default async function MyActivityPage() {
  const v = await requireViewer("/me/activity");
  if (!hasSystemPerm(v, "pledge.history.view")) {
    return <AdminOnlyNotice area="Bảng tin hoạt động" />;
  }

  const items = activityFeed(v.id, 80);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tương tác · FR27"
        title="Bảng tin hoạt động"
        description="Theo dõi các bản tin Update mới, thay đổi trạng thái dự án đã góp/lưu và lịch sử tương tác của bạn."
      />

      {items.length === 0 ? (
        <EmptyState
          title="Chưa có hoạt động nào"
          description="Khi bạn góp vốn hoặc lưu dự án, mọi bản tin cập nhật tiến độ và bình luận sẽ xuất hiện tại đây."
          action={<ButtonLink href="/explore">Khám phá dự án</ButtonLink>}
        />
      ) : (
        <ActivityFeedList items={items} />
      )}
    </div>
  );
}
