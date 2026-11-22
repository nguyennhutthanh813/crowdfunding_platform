import Link from "next/link";
import { AlertTriangle, ExternalLink, Search } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { adminProjectsBundle } from "@/server/queries/admin";
import { buildQueryHref } from "@/components/admin/admin-helpers";
import { RestoreProjectButton, TakedownProjectButton } from "@/components/admin/project-moderation-dialogs";
import { SafeImage } from "@/components/admin/safe-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { PROJECT_STATUS } from "@/lib/status";
import { cn, formatCompactVnd, formatDate, percentOf } from "@/lib/utils";

export const metadata = { title: "Quản lý dự án" };

const STATUS_PILLS = ["", "LIVE", "SUSPENDED", "SCHEDULED", "PENDING_REVIEW", "SUCCESS", "FULFILLING", "COMPLETED", "FAILED", "REJECTED", "DRAFT", "CANCELLED"];

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSystemPerm("admin.project.takedown", "/admin/projects");
  const sp = await searchParams;
  const q = firstParam(sp.q).trim();
  const status = firstParam(sp.status).trim();
  const category = firstParam(sp.category).trim();

  const { rows, counts, categories } = await adminProjectsBundle({ q, status, category });
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giám sát dự án"
        title="Quản lý dự án toàn nền tảng"
        description="Theo dõi trạng thái, số báo cáo vi phạm và tạm gỡ / khôi phục dự án. Quản trị viên không chỉnh sửa nội dung thay chủ dự án."
      />

      {/* Bộ lọc trạng thái */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {STATUS_PILLS.map((st) => {
          const count = st === "" ? totalAll : counts[st] ?? 0;
          if (st !== "" && count === 0 && status !== st) return null;
          const active = status === st;
          const label = st === "" ? "Tất cả" : PROJECT_STATUS[st]?.label ?? st;
          return (
            <Link
              key={st || "ALL"}
              href={buildQueryHref("/admin/projects", { q, status: st, category })}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "border-rose-500/40 bg-rose-600 text-white shadow-sm"
                  : "border-line bg-surface text-muted hover:border-violet-400/50 hover:text-fg",
              )}
            >
              <span>{label}</span>
              <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-white/25" : "bg-surface-2")}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Thanh tìm kiếm & thể loại */}
      <form method="GET" action="/admin/projects" className="card grid gap-3 p-4 sm:grid-cols-[1fr_200px_auto]">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={q} placeholder="Tìm theo tên dự án hoặc chủ dự án..." className="pl-10" />
        </div>
        <Select name="category" defaultValue={category}>
          <option value="">Tất cả thể loại</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md" className="flex-1 sm:flex-none">
            Lọc
          </Button>
          {(q || status || category) && (
            <ButtonLink href="/admin/projects" variant="outline" size="md">
              Xoá lọc
            </ButtonLink>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dự án phù hợp"
          description="Thử đổi từ khoá tìm kiếm hoặc xoá bộ lọc hiện tại."
          action={
            <ButtonLink href="/admin/projects" variant="outline" size="sm">
              Xem tất cả dự án
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((p) => {
              const pct = percentOf(p.pledged_amount, p.goal_amount);
              const detailHref = p.status === "PENDING_REVIEW" ? `/admin/reviews/${p.slug}` : `/p/${p.slug}`;
              return (
                <div key={p.id} className="card space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
                      <SafeImage src={p.cover_url} alt={p.title} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={detailHref} className="line-clamp-2 font-bold hover:text-violet-600">
                        {p.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span>{p.category}</span>
                        <span>· {p.creator}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ProjectStatusBadge status={p.status} />
                      {p.open_reports > 0 && (
                        <Badge tone={p.open_reports >= 3 ? "rose" : "amber"} dot>
                          {p.open_reports >= 3 && <AlertTriangle className="size-3" />}
                          {p.open_reports} báo cáo
                        </Badge>
                      )}
                    </div>
                    <div className="font-bold tabular-nums">
                      {formatCompactVnd(p.pledged_amount)} / {formatCompactVnd(p.goal_amount)} ({pct}%)
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <ButtonLink href={detailHref} variant="outline" size="xs">
                      <ExternalLink className="size-3.5" /> {p.status === "PENDING_REVIEW" ? "Duyệt" : "Xem"}
                    </ButtonLink>
                    <div className="flex gap-2">
                      <TakedownProjectButton projectId={p.id} projectTitle={p.title} status={p.status} openReports={p.open_reports} />
                      <RestoreProjectButton projectId={p.id} projectTitle={p.title} status={p.status} endAt={p.end_at} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Dự án</th>
                  <th className="px-4 py-3">Chủ dự án</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Góp vốn</th>
                  <th className="px-4 py-3">Thời hạn</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => {
                  const pct = percentOf(p.pledged_amount, p.goal_amount);
                  const detailHref = p.status === "PENDING_REVIEW" ? `/admin/reviews/${p.slug}` : `/p/${p.slug}`;
                  return (
                    <tr key={p.id} className="transition hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
                            <SafeImage src={p.cover_url} alt={p.title} fill sizes="44px" className="object-cover" />
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <Link href={detailHref} className="block truncate font-bold hover:text-violet-600">
                              {p.title}
                            </Link>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                              <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                              <span>{p.category}</span>
                              <span>· /{p.slug}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold">{p.creator}</div>
                        <div className="text-muted">@{p.creator_username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <ProjectStatusBadge status={p.status} />
                          {p.open_reports > 0 && (
                            <Badge tone={p.open_reports >= 3 ? "rose" : "amber"}>
                              {p.open_reports >= 3 && <AlertTriangle className="size-3" />}
                              {p.open_reports} báo cáo mở
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCompactVnd(p.pledged_amount)} ({pct}%)
                        </div>
                        <div className="text-muted">
                          Mục tiêu {formatCompactVnd(p.goal_amount)} · {p.backers_count} người ủng hộ
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        <div>Mở: {formatDate(p.start_at)}</div>
                        <div>Đóng: {formatDate(p.end_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <ButtonLink href={detailHref} variant="ghost" size="xs">
                            <ExternalLink className="size-3.5" /> {p.status === "PENDING_REVIEW" ? "Duyệt" : "Xem"}
                          </ButtonLink>
                          <TakedownProjectButton
                            projectId={p.id}
                            projectTitle={p.title}
                            status={p.status}
                            openReports={p.open_reports}
                          />
                          <RestoreProjectButton projectId={p.id} projectTitle={p.title} status={p.status} endAt={p.end_at} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
