import { HeaderStatsSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/primitives";

export default function StudioWorkspaceLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-52 w-full rounded-[1.25rem]" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <HeaderStatsSkeleton statCount={4} colsClass="sm:grid-cols-2 lg:grid-cols-4" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-[1.25rem]" />
        <Skeleton className="h-72 rounded-[1.25rem]" />
      </div>
    </div>
  );
}
