import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus, Rocket } from "lucide-react";
import { getViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { listCategories, listPublicProjects, type SortKey } from "@/server/queries/projects";
import { ProjectCard } from "@/components/project/project-card";
import { Reveal } from "@/components/fx/motion";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { PaginationBar } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/primitives";
import { ExploreFilters } from "@/components/public/explore-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Khám phá dự án",
  description: "Tìm kiếm và lọc các dự án gọi vốn cộng đồng đang chạy, sắp mở hoặc đã hoàn thành trên FundViet.",
};

const PAGE_SIZE = 12;

export default async function ExplorePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? sp[k].trim() : "");

  const q = str("q");
  const category = str("category");
  const rawStatus = str("status").toUpperCase();
  const status = (["ALL", "LIVE", "SCHEDULED", "ENDED"].includes(rawStatus) ? rawStatus : "ALL") as
    | "ALL"
    | "LIVE"
    | "SCHEDULED"
    | "ENDED";
  const rawSort = str("sort").toLowerCase();
  const sort = (["trending", "newest", "ending", "funded", "backers"].includes(rawSort)
    ? rawSort
    : "trending") as SortKey;
  const page = Math.max(1, Math.floor(Number(str("page")) || 1));

  const [viewer, categories, { rows, total, saved }] = await Promise.all([
    getViewer(),
    listCategories(),
    listPublicProjects({
      status,
      category: category || undefined,
      q: q || undefined,
      sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);
  const showSave = !viewer || hasSystemPerm(viewer, "project.save");
  const canCreate = !viewer || hasSystemPerm(viewer, "project.create");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (status !== "ALL") next.set("status", status);
    if (sort !== "trending") next.set("sort", sort);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="KHÁM PHÁ DỰ ÁN"
        title="Tìm ý tưởng Việt đáng ủng hộ"
        description="Lọc theo thể loại, trạng thái chiến dịch hoặc từ khoá. Chỉ thu tiền khi dự án đạt mục tiêu đề ra."
        actions={
          canCreate && (
            <ButtonLink href={viewer ? "/studio/new" : "/register?next=/studio/new"} size="sm">
              {viewer ? <Plus className="size-4" /> : <Rocket className="size-4" />}
              Bắt đầu dự án
            </ButtonLink>
          )
        }
      />

      <Suspense fallback={<Skeleton className="h-36 w-full" />}>
        <ExploreFilters
          key={`${q}|${category}|${status}|${sort}`}
          categories={categories}
          q={q}
          category={category}
          status={status}
          sort={sort}
          total={total}
        />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dự án phù hợp"
          description="Thử bỏ bớt bộ lọc, đổi trạng thái hoặc tìm với từ khoá ngắn hơn."
          action={
            <ButtonLink href="/explore" variant="outline">
              Xem tất cả dự án
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.04}>
                <ProjectCard p={p} saved={saved.has(p.id)} showSave={showSave} priority={i < 3} />
              </Reveal>
            ))}
          </div>

          <PaginationBar
            basePath="/explore"
            page={page}
            pages={totalPages}
            total={total}
            params={{}}
            hrefFor={pageHref}
            itemLabel="dự án"
          />
        </>
      )}
    </div>
  );
}
