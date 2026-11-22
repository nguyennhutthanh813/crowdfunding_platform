import { CardGridSkeleton, HeaderStatsSkeleton } from "@/components/ui/page-skeletons";

export default function StudioLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <HeaderStatsSkeleton statCount={3} />
      <CardGridSkeleton count={6} />
    </div>
  );
}
