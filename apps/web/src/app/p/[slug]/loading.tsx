import { Skeleton } from "@/components/ui/primitives";

export default function ProjectLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Skeleton className="aspect-[16/10] w-full rounded-[1.5rem]" />
          <Skeleton className="h-14 w-full rounded-[1.25rem]" />
          <Skeleton className="h-64 w-full rounded-[1.25rem]" />
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-[28rem] w-full rounded-[1.25rem]" />
        </div>
      </div>
    </div>
  );
}
