import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildQueryHref } from "./admin-helpers";

function buildPageWindow(page: number, pages: number): (number | "dots-l" | "dots-r")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const start = Math.max(2, page - 2);
  const end = Math.min(pages - 1, page + 2);
  const items: (number | "dots-l" | "dots-r")[] = [1];
  if (start > 2) items.push("dots-l");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pages - 1) items.push("dots-r");
  items.push(pages);
  return items;
}

function StepButton({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={buttonClass("outline", "xs", "pointer-events-none opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={true} aria-label={label} className={buttonClass("outline", "xs")}>
      {children}
    </Link>
  );
}

export function PaginationBar({
  basePath,
  page,
  pages,
  total,
  params,
  itemLabel = "mục",
  hrefFor,
}: {
  basePath: string;
  page: number;
  pages: number;
  total: number;
  params: Record<string, string | number | undefined | null>;
  itemLabel?: string;
  hrefFor?: (p: number) => string;
}) {
  if (pages <= 1 && total === 0) return null;

  const makeHref = (target: number) => {
    if (hrefFor) return hrefFor(target);
    return buildQueryHref(basePath, { ...params, page: target > 1 ? target : undefined });
  };
  const items = buildPageWindow(page, pages);

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm"
    >
      <div className="text-muted">
        Trang <span className="font-bold text-fg tabular-nums">{page}</span>/
        <span className="font-bold text-fg tabular-nums">{pages}</span> · Tổng{" "}
        <span className="font-bold text-fg tabular-nums">{total.toLocaleString("vi-VN")}</span> {itemLabel}
      </div>

      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <StepButton href={makeHref(1)} disabled={page <= 1} label="Trang đầu">
            <ChevronsLeft className="size-3.5" />
          </StepButton>
          <StepButton href={makeHref(Math.max(1, page - 1))} disabled={page <= 1} label="Trang trước">
            <ChevronLeft className="size-3.5" /> Trước
          </StepButton>

          {items.map((item) =>
            typeof item !== "number" ? (
              <span key={item} className="hidden px-1.5 text-xs text-muted sm:inline-flex">
                …
              </span>
            ) : (
              <Link
                key={item}
                href={makeHref(item)}
                scroll={true}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums transition",
                  item === page
                    ? "inline-flex bg-brand-gradient text-white shadow-sm"
                    : "hidden border border-line bg-surface text-muted hover:border-violet-400/50 hover:text-fg sm:inline-flex",
                )}
              >
                {item}
              </Link>
            ),
          )}

          <StepButton href={makeHref(Math.min(pages, page + 1))} disabled={page >= pages} label="Trang sau">
            Sau <ChevronRight className="size-3.5" />
          </StepButton>
          <StepButton href={makeHref(pages)} disabled={page >= pages} label="Trang cuối">
            <ChevronsRight className="size-3.5" />
          </StepButton>
        </div>
      )}
    </nav>
  );
}
