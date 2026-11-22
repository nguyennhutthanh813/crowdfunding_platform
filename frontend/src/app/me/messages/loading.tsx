import { HeaderStatsSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/primitives";

export default function MeMessagesLoading() {
  return (
    <div className="space-y-5">
      <HeaderStatsSkeleton statCount={0} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="card space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-[1.25rem]" />
      </div>
    </div>
  );
}
