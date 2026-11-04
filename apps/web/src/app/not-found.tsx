import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="grid min-h-[70vh] place-items-center bg-[#efeee8] px-4 py-16">
      <div className="max-w-xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-forest text-lime">
          <SearchX className="size-7" />
        </span>
        <p className="eyebrow mt-6 text-coral">404 · Không tìm thấy</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.05em]">
          Dự án này chưa có ở đây.
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          Có thể đường dẫn đã thay đổi hoặc chiến dịch chưa được công khai.
        </p>
        <Link href="/discover" className="button-dark mt-7">
          <ArrowLeft className="size-4" /> Về trang khám phá
        </Link>
      </div>
    </section>
  );
}
