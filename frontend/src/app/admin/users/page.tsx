import Link from "next/link";
import { Eye, Lock, Search, ShieldCheck, Users } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { adminUsersBundle, REPORT_REASON } from "@/server/queries/admin";
import { buildQueryHref } from "@/components/admin/admin-helpers";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { SafeAvatar } from "@/components/admin/safe-image";
import { UserDetailDialog, UserLockButton } from "@/components/admin/user-management";
import { CountUp } from "@/components/fx/motion";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout-bits";
import { Badge, RoleBadge } from "@/components/ui/primitives";
import { formatCompactVnd, formatDate } from "@/lib/utils";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tài khoản & An toàn"
        title="Quản lý người dùng"
        description="Tra cứu hồ sơ hoạt động, khoá tài khoản vi phạm (tự động huỷ phiên đăng nhập) và mở khoá khi cần."
      />

      {/* Thống kê nhanh */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="violet" label="Tổng tài khoản" value={<CountUp value={data.stats.total} />} icon={<Users className="size-5" />} />
        <StatCard tone="rose" label="Đang bị khoá" value={<CountUp value={data.stats.locked} />} icon={<Lock className="size-5" />} />
        <StatCard tone="sky" label="Quản trị viên" value={<CountUp value={data.stats.admins} />} icon={<ShieldCheck className="size-5" />} />
      </div>

      {/* Tìm kiếm & Lọc */}
      <form method="GET" action="/admin/users" className="card grid gap-3 p-4 sm:grid-cols-[1fr_160px_180px_auto]">
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
          <option value="CREATOR">Creator</option>
          <option value="COLLABORATOR">Collaborator</option>
          <option value="BACKER">Backer đã góp</option>
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

      {data.rows.length === 0 ? (
        <EmptyState
          title="Không có tài khoản khớp bộ lọc"
          description="Thử đổi từ khoá hoặc xoá bộ lọc."
          action={
            <ButtonLink href="/admin/users" variant="outline" size="sm">
              Xem tất cả
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {data.rows.map((u) => {
              const detailHref = buildQueryHref("/admin/users", { ...currentParams, detail: u.id });
              return (
                <div key={u.id} className="card space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <SafeAvatar name={u.display_name} src={u.avatar_url} size={40} />
                      <div className="min-w-0">
                        <div className="truncate font-bold">{u.display_name}</div>
                        <div className="truncate text-xs text-muted">
                          @{u.username} · {u.email}
                        </div>
                      </div>
                    </div>
                    <Badge tone={u.status === "LOCKED" ? "rose" : "emerald"} dot>
                      {u.status === "LOCKED" ? "Khoá" : "Active"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {u.roles.map((r) => (
                      <RoleBadge key={r} role={r} />
                    ))}
                    {u.creator_count > 0 && <RoleBadge role="CREATOR" />}
                    {u.collab_count > 0 && <RoleBadge role="COLLABORATOR" />}
                    {u.reports_against > 0 && <Badge tone="rose">{u.reports_against} báo cáo mở</Badge>}
                  </div>

                  {u.locked_reason && (
                    <p className="rounded-xl bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                      <b>Lý do khoá:</b> {u.locked_reason}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      Góp: <b className="text-fg">{u.pledge_count}</b> lượt ({formatCompactVnd(u.pledge_total)})
                    </span>
                    <span>Đăng nhập: {formatDate(u.last_login_at)}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <Link
                      href={detailHref}
                      scroll={false}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold hover:border-violet-400/60"
                    >
                      <Eye className="size-3.5" /> Chi tiết
                    </Link>
                    <UserLockButton
                      userId={u.id}
                      displayName={u.display_name}
                      username={u.username}
                      status={u.status}
                      roles={u.roles}
                      viewerId={viewer.id}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hoạt động</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((u) => {
                  const detailHref = buildQueryHref("/admin/users", { ...currentParams, detail: u.id });
                  return (
                    <tr key={u.id} className="transition hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <SafeAvatar name={u.display_name} src={u.avatar_url} size={36} />
                          <div className="min-w-0">
                            <div className="truncate font-bold">{u.display_name}</div>
                            <div className="truncate text-xs text-muted">
                              @{u.username} · {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {u.roles.map((r) => (
                            <RoleBadge key={r} role={r} />
                          ))}
                          {u.creator_count > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
                              <RoleBadge role="CREATOR" />×{u.creator_count}
                            </span>
                          )}
                          {u.collab_count > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
                              <RoleBadge role="COLLABORATOR" />×{u.collab_count}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-col items-start gap-1">
                          <Badge tone={u.status === "LOCKED" ? "rose" : "emerald"} dot>
                            {u.status === "LOCKED" ? "Đã khoá" : "Hoạt động"}
                          </Badge>
                          {u.locked_reason && <span className="max-w-52 truncate text-rose-600 dark:text-rose-300">{u.locked_reason}</span>}
                          {u.reports_against > 0 && <Badge tone="amber">{u.reports_against} báo cáo mở</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        <div>
                          Góp: <b className="text-fg">{u.pledge_count}</b> lượt · {formatCompactVnd(u.pledge_total)}
                        </div>
                        <div>Đăng nhập: {formatDate(u.last_login_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            href={detailHref}
                            scroll={false}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold transition hover:border-violet-400/60"
                          >
                            <Eye className="size-3.5" /> Chi tiết
                          </Link>
                          <UserLockButton
                            userId={u.id}
                            displayName={u.display_name}
                            username={u.username}
                            status={u.status}
                            roles={u.roles}
                            viewerId={viewer.id}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            basePath="/admin/users"
            page={data.page}
            pages={data.pages}
            total={data.total}
            params={{ q, status, role }}
            itemLabel="tài khoản"
          />
        </>
      )}

      <UserDetailDialog
        detail={detail}
        closeHref={closeDetailHref}
        viewerId={viewer.id}
        reportReasonLabels={REPORT_REASON}
      />
    </div>
  );
}
