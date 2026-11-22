import { CardGridSkeleton, HeaderStatsSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/primitives";

export default function MeBackedLoading() {
  return (
    <div className="space-y-5">
      <HeaderStatsSkeleton statCount={0} />
      <Skeleton className="h-10 w-96 max-w-full rounded-xl" />
      <CardGridSkeleton count={4} colsClass="md:grid-cols-2" />
    </div>
  );
}
