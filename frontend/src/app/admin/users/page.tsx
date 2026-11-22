import { Briefcase, Lock, Search, ShieldCheck, Users } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { adminUsersBundle, REPORT_REASON } from "@/server/queries/admin";
import { buildQueryHref } from "@/components/admin/admin-helpers";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { AdminUsersList, CreateUserButton } from "@/components/admin/user-management";
import { CountUp } from "@/components/fx/motion";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { PageHeader, StatCard } from "@/components/ui/layout-bits";

export const metadata = { title: "Quản lý người dùng" };

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireSystemPerm("admin.user.lock", "/admin/users");
  const sp = await searchParams;
  const q = firstParam(sp.q).trim();
  const status = firstParam(sp.status).trim();
  const role = firstParam(sp.role).trim();
  const page = Number(firstParam(sp.page)) || 1;
  const detailId = firstParam(sp.detail).trim();

  const data = await adminUsersBundle({ q, status, role, page, inspect: detailId || undefined });
  const detail = data.inspected;
  const currentParams = { q, status, role, page: data.page };
  const closeDetailHref = buildQueryHref("/admin/users", currentParams);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tài khoản & Phân quyền"
        title="Quản lý người dùng"
        description="Quản trị hồ sơ, phân quyền 4 vai trò (Quản trị viên, Chủ dự án, Cộng tác viên, Người ủng hộ) và kiểm soát truy cập."
        actions={<CreateUserButton assignableProjects={data.assignableProjects} />}
      />

      {/* Thống kê gọn 4 vai trò */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tone="violet" label="Tổng tài khoản" value={<CountUp value={data.stats.total} />} icon={<Users className="size-5" />} />
        <StatCard tone="rose" label="Quản trị viên" value={<CountUp value={data.stats.admins} />} icon={<ShieldCheck className="size-5" />} />
        <StatCard
          tone="sky"
          label="Chủ dự án / CTV"
          value={
            <span className="tabular-nums">
              {data.stats.creators} <span className="text-base font-semibold text-muted">/ {data.stats.collaborators} CTV</span>
            </span>
          }
          icon={<Briefcase className="size-5" />}
        />
        <StatCard tone="amber" label="Đang bị khoá" value={<CountUp value={data.stats.locked} />} icon={<Lock className="size-5" />} />
      </div>

      {/* Tìm kiếm & Lọc 4 vai trò */}
      <form method="GET" action="/admin/users" className="card grid gap-3 p-3.5 sm:grid-cols-[1fr_160px_210px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={q} placeholder="Tìm theo tên, email hoặc @username..." className="pl-10" />
        </div>
        <Select name="status" defaultValue={status}>
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khoá</option>
        </Select>
        <Select name="role" defaultValue={role}>
          <option value="">Mọi vai trò</option>
          <option value="ADMIN">Quản trị viên</option>
          <option value="CREATOR">Chủ dự án</option>
          <option value="COLLABORATOR">Cộng tác viên</option>
          <option value="BACKER">Người ủng hộ (đã góp)</option>
          <option value="MEMBER_ONLY">Thành viên thường</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md" className="flex-1 sm:flex-none">
            Lọc
          </Button>
          {(q || status || role) && (
            <ButtonLink href="/admin/users" variant="outline" size="md">
              Xoá lọc
            </ButtonLink>
          )}
        </div>
      </form>

      <AdminUsersList
        rows={data.rows}
        assignableProjects={data.assignableProjects}
        initialDetail={detail}
        closeDetailHref={closeDetailHref}
        viewerId={viewer.id}
        reportReasonLabels={REPORT_REASON}
        hasFilter={Boolean(q || status || role)}
      />

      {data.rows.length > 0 && (
        <PaginationBar
          basePath="/admin/users"
          page={data.page}
          pages={data.pages}
          total={data.total}
          params={{ q, status, role }}
          itemLabel="tài khoản"
        />
      )}
    </div>
  );
}
