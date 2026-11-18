import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { buildQueryHref } from "./admin-helpers";

export function PaginationBar({
  basePath,
  page,
  pages,
  total,
  params,
  itemLabel = "mục",
}: {
  basePath: string;
  page: number;
  pages: number;
  total: number;
  params: Record<string, string | number | undefined | null>;
  itemLabel?: string;
}) {
  if (pages <= 1 && total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
      <div className="text-muted">
        Trang <span className="font-bold text-fg">{page}</span> / <span className="font-bold text-fg">{pages}</span> · Tổng{" "}
        <span className="font-bold text-fg">{total.toLocaleString("vi-VN")}</span> {itemLabel}
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link href={buildQueryHref(basePath, { ...params, page: page - 1 })} className={buttonClass("outline", "xs")}>
              <ChevronLeft className="size-4" /> Trước
            </Link>
          ) : (
            <span className={buttonClass("outline", "xs", "pointer-events-none opacity-40")}>
              <ChevronLeft className="size-4" /> Trước
            </span>
          )}
          {page < pages ? (
            <Link href={buildQueryHref(basePath, { ...params, page: page + 1 })} className={buttonClass("outline", "xs")}>
              Sau <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className={buttonClass("outline", "xs", "pointer-events-none opacity-40")}>
              Sau <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
