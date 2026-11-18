import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { auditList } from "@/server/queries/admin";
import { AUDIT_PREFIX_META, auditTone, buildQueryHref, serverNow } from "@/components/admin/admin-helpers";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/primitives";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export const metadata = { title: "Nhật ký hệ thống" };

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSystemPerm("admin.audit.view", "/admin/audit");
  const sp = await searchParams;
  const prefix = firstParam(sp.prefix).trim();
  const page = Number(firstParam(sp.page)) || 1;

  const data = await auditList({ prefix, page, limit: 30 });
  const now = serverNow();
  const totalPrefixes = data.prefixes.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Truy vết quản trị · Audit Logs"
        title="Nhật ký hệ thống"
        description="Ghi nhận đầy đủ mọi thao tác duyệt/gỡ dự án, khoá người dùng, xử lý báo cáo, thay đổi thể loại và chạy bộ lập lịch."
      />

      {/* Filter chips theo nhóm action */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Link
          href="/admin/audit"
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
            !prefix
              ? "border-rose-500/40 bg-rose-600 text-white shadow-sm"
              : "border-line bg-surface text-muted hover:border-violet-400/50 hover:text-fg",
          )}
        >
          <span>Tất cả</span>
          <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", !prefix ? "bg-white/25" : "bg-surface-2")}>
            {totalPrefixes}
          </span>
        </Link>

        {data.prefixes.map((item) => {
          const active = prefix === item.prefix;
          const meta = AUDIT_PREFIX_META[item.prefix];
          return (
            <Link
              key={item.prefix}
              href={buildQueryHref("/admin/audit", { prefix: item.prefix })}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "border-rose-500/40 bg-rose-600 text-white shadow-sm"
                  : "border-line bg-surface text-muted hover:border-violet-400/50 hover:text-fg",
              )}
            >
              <span>{meta ? `${meta.label} (${item.prefix}*)` : item.prefix}</span>
              <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-white/25" : "bg-surface-2")}>
                {item.count}
              </span>
            </Link>
          );
        })}
      </div>

      {data.rows.length === 0 ? (
        <EmptyState title="Chưa có nhật ký nào ở nhóm này" description="Các thao tác quản trị mới sẽ xuất hiện tại đây." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.rows.map((r) => (
              <div key={r.id} className="card space-y-2 p-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={auditTone(r.action)}>{r.action}</Badge>
                  <span className="text-muted">{timeAgo(r.created_at, now)}</span>
                </div>
                <div className="font-semibold">
                  {r.actor ? `${r.actor} (@${r.actor_username})` : "Hệ thống"} ·{" "}
                  <span className="text-muted">
                    {r.project_title || r.user_name || r.category_name || r.entity_type}
                  </span>
                </div>
                {r.detail && <p className="text-muted">{r.detail}</p>}
                <div className="text-[11px] text-muted">{formatDate(r.created_at, true)}</div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {data.rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-surface-2/40">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      <div className="font-semibold text-fg">{formatDate(r.created_at, true)}</div>
                      <div>{timeAgo(r.created_at, now)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={auditTone(r.action)}>
                        <ScrollText className="size-3" /> {r.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.actor ? (
                        <div>
                          <div className="font-semibold">{r.actor}</div>
                          <div className="text-muted">@{r.actor_username}</div>
                        </div>
                      ) : (
                        <span className="text-muted">Hệ thống</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.project_slug ? (
                        <Link href={`/p/${r.project_slug}`} className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
                          {r.project_title}
                        </Link>
                      ) : r.user_username ? (
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(r.user_username)}`}
                          className="font-semibold text-violet-600 hover:underline dark:text-violet-400"
                        >
                          {r.user_name} (@{r.user_username})
                        </Link>
                      ) : r.category_name ? (
                        <Link href="/admin/categories" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
                          Thể loại: {r.category_name}
                        </Link>
                      ) : (
                        <span className="text-muted">
                          {r.entity_type}
                          {r.entity_id ? ` (${r.entity_id.slice(0, 8)}…)` : ""}
                        </span>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3 text-muted">{r.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            basePath="/admin/audit"
            page={data.page}
            pages={data.pages}
            total={data.total}
            params={{ prefix }}
            itemLabel="bản ghi"
          />
        </>
      )}
    </div>
  );
}
