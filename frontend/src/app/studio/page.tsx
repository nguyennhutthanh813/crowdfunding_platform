import { redirect } from "next/navigation";
import { FolderKanban, HandCoins, Plus, Rocket, Users } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getStudioIndexBundle } from "@/server/queries/studio";
import { StudioHubShell } from "@/components/studio/studio-workspace-shell";
import { StudioInvitationsPanel } from "@/components/studio/studio-invitations";
import { StudioProjectsGrid } from "@/components/studio/studio-projects-grid";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout-bits";
import { CountUp } from "@/components/fx/motion";

export const metadata = { title: "Studio dự án" };

export default async function StudioDashboardPage() {
  const viewer = await requireViewer("/studio");
  if (viewer.systemRoles.includes("ADMIN")) redirect("/admin");

  const { mine, collab, invitations } = await getStudioIndexBundle();
  const allProjects = [...mine, ...collab];
  const totalRaised = mine.reduce((s, p) => s + p.pledged_amount, 0);
  const totalBackers = mine.reduce((s, p) => s + p.backers_count, 0);
  const liveCount = allProjects.filter((p) => p.status === "LIVE").length;

  return (
    <StudioHubShell
      mine={mine.map((p) => ({ slug: p.slug, title: p.title, status: p.status }))}
      collab={collab.map((p) => ({ slug: p.slug, title: p.title, status: p.status }))}
      pendingInvites={invitations.length}
    >
      <PageHeader
        eyebrow="Studio quản lý dự án"
        title="Không gian quản lý dự án"
        description="Theo dõi tiến độ chiến dịch, phân tích AI, trả lời cộng đồng và điều phối giao quà ở cùng một nơi."
        actions={
          <ButtonLink href="/studio/new" size="md">
            <Plus className="size-4" /> Tạo dự án mới
          </ButtonLink>
        }
      />

      {/* Lời mời Cộng tác viên trực tiếp ngay trong Studio */}
      <StudioInvitationsPanel invitations={invitations} />

      {allProjects.length === 0 ? (
        <EmptyState
          image="/v3/roles/creator.webp"
          title="Bạn chưa có dự án nào trong Studio"
          description="Bắt đầu với hướng dẫn 5 bước, chọn ảnh bìa 3D, tạo mức quà và chạy AI dự đoán thành công trước khi gửi duyệt."
          action={
            <ButtonLink href="/studio/new" size="lg">
              <Rocket className="size-5" /> Tạo dự án đầu tiên
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Chỉ số tổng quan */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <StatCard
              label="Dự án tham gia"
              value={<CountUp value={allProjects.length} />}
              sub={`${mine.length} dự án của tôi · ${collab.length} cộng tác · ${liveCount} đang chạy`}
              icon={<FolderKanban className="size-5" />}
              tone="violet"
            />
            <StatCard
              label="Tổng vốn dự án của tôi"
              value={<CountUp value={totalRaised} format="compact" />}
              sub="Tính cả khoản đang giữ chỗ"
              icon={<HandCoins className="size-5" />}
              tone="emerald"
            />
            <StatCard
              label="Tổng lượt ủng hộ"
              value={<CountUp value={totalBackers} />}
              sub="Trên các dự án bạn là chủ dự án"
              icon={<Users className="size-5" />}
              tone="amber"
            />
          </div>

          <StudioProjectsGrid mine={mine} collab={collab} />
        </>
      )}
    </StudioHubShell>
  );
}
