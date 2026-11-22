import { HeaderStatsSkeleton, TableRowsSkeleton } from "@/components/ui/page-skeletons";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <HeaderStatsSkeleton statCount={4} colsClass="sm:grid-cols-2 xl:grid-cols-4" />
      <TableRowsSkeleton rows={6} />
    </div>
  );
}
