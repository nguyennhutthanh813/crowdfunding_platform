import { Skeleton } from "@/components/ui/primitives";

export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-5 w-[32rem] max-w-full" />
      </div>
      <Skeleton className="h-36 w-full rounded-[1.25rem]" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-96 rounded-[1.25rem]" />
        ))}
      </div>
    </div>
  );
}
