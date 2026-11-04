import { Compass } from "lucide-react";

export default function DiscoverLoading() {
  return (
    <div aria-label="Đang tải danh sách dự án">
      <section className="border-b border-line bg-canvas-soft py-11 sm:py-14">
        <div className="container-shell">
          <p className="eyebrow text-coral-dark">
            <Compass className="size-4" /> Khám phá dự án
          </p>
          <div className="mt-5 h-12 max-w-3xl rounded-2xl shimmer-line" />
          <div className="mt-4 h-5 max-w-xl rounded-full shimmer-line" />
        </div>
      </section>
      <section className="container-shell py-10">
        <div className="h-40 rounded-[18px] shimmer-line" />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-[430px] rounded-[18px] shimmer-line" />
          ))}
        </div>
      </section>
    </div>
  );
}
