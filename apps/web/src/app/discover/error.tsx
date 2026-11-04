"use client";

import { RotateCcw, SearchX } from "lucide-react";

export default function DiscoverError({ reset }: { reset: () => void }) {
  return (
    <section className="container-shell grid min-h-[68vh] place-items-center py-16">
      <div className="max-w-xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <SearchX className="size-7" />
        </span>
        <p className="eyebrow mt-6 text-amber-700">Danh sách chưa tải được</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
          Bạn chưa cần nhập lại bộ lọc.
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          Hãy thử tải lại danh sách. Từ khóa và bộ lọc trên đường dẫn vẫn được giữ nguyên.
        </p>
        <button type="button" onClick={reset} className="button-dark mt-7">
          <RotateCcw className="size-4" /> Thử tải lại
        </button>
      </div>
    </section>
  );
}
