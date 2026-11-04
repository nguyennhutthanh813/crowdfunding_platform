"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="grid min-h-[70vh] place-items-center bg-[#efeee8] px-4 py-16">
      <div className="max-w-xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="size-7" />
        </span>
        <p className="eyebrow mt-6 text-red-600">Có lỗi xảy ra</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.05em]">
          Trang chưa tải đúng như mong đợi.
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          Bạn thử tải lại trang. Nếu lỗi vẫn còn, hãy quay về trang chủ rồi thao
          tác lại sau một chút.
        </p>
        <button type="button" onClick={reset} className="button-dark mt-7">
          <RotateCcw className="size-4" /> Thử lại
        </button>
      </div>
    </section>
  );
}
