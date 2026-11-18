import { Skeleton } from "@/components/ui/primitives";

export default function MeLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-12 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
