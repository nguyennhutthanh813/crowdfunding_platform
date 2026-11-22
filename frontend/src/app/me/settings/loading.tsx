import { Skeleton } from "@/components/ui/primitives";

export default function MeSettingsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-11 w-full rounded-2xl" />
      <div className="card space-y-4 p-5 sm:p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}
