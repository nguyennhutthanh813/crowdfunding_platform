import { Skeleton } from "@/components/ui/primitives";

export function HeaderStatsSkeleton({
  statCount = 3,
  colsClass = "sm:grid-cols-3",
}: {
  statCount?: number;
  colsClass?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      {statCount > 0 && (
        <div className={`grid gap-4 ${colsClass}`}>
          {Array.from({ length: statCount }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card space-y-3 p-4 sm:p-5">
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, colsClass = "sm:grid-cols-2 lg:grid-cols-3" }: { count?: number; colsClass?: string }) {
  return (
    <div className={`grid gap-5 ${colsClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-72 rounded-[1.25rem]" />
      ))}
    </div>
  );
}
