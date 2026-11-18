import { CalendarClock, Heart } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { savedProjects } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { ProjectCard } from "@/components/project/project-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/layout-bits";

export const metadata = { title: "Dự án đã lưu" };

export default async function MySavedPage() {
  const v = await requireViewer("/me/saved");
  if (!hasSystemPerm(v, "project.save")) {
    return <AdminOnlyNotice area="Dự án đã lưu" />;
  }

  const { upcoming, others, hidden } = await savedProjects();
  const empty = upcoming.length === 0 && others.length === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Đã lưu"
        title="Dự án đã lưu"
        description="Lưu lại những ý tưởng bạn quan tâm để nhận thông báo khi sắp mở hoặc quay lại góp vốn sau."
        actions={
          <ButtonLink href="/explore" variant="outline" size="sm">
            Tìm thêm dự án
          </ButtonLink>
        }
      />

      {empty ? (
        <EmptyState
          title="Chưa lưu dự án nào"
          description="Nhấn vào biểu tượng trái tim trên bất kỳ thẻ dự án nào để lưu lại xem sau."
          action={<ButtonLink href="/explore">Khám phá dự án</ButtonLink>}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <SectionTitle
                title={
                  <span className="flex items-center gap-2">
                    <CalendarClock className="size-5 text-sky-500" /> Sắp mở — xem trước ({upcoming.length})
                  </span>
                }
                description="Bạn sẽ nhận được thông báo ngay khi chiến dịch mở nhận góp vốn."
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((p) => (
                  <ProjectCard key={p.id} p={p} saved />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-3">
              <SectionTitle
                title={
                  <span className="flex items-center gap-2">
                    <Heart className="size-5 text-rose-500" /> Đang gọi vốn & đã kết thúc ({others.length})
                  </span>
                }
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((p) => (
                  <ProjectCard key={p.id} p={p} saved />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {hidden > 0 && (
        <p className="text-xs text-muted">
          * Có {hidden} dự án đã lưu hiện đang tạm ẩn hoặc ngừng công khai nên không hiển thị trong danh sách.
        </p>
      )}
    </div>
  );
}
