import {
  BookOpen,
  Cpu,
  Gamepad2,
  Leaf,
  Music4,
  Palette,
} from "lucide-react";
import Link from "next/link";

const categories = [
  { name: "Tất cả", note: "Toàn bộ dự án đang gọi vốn", Icon: Leaf, href: "/discover" },
  { name: "Công nghệ", note: "Thiết bị và sản phẩm số", Icon: Cpu },
  { name: "Thiết kế", note: "Đồ dùng và không gian sống", Icon: Palette },
  { name: "Trò chơi", note: "Board game và trò chơi Việt", Icon: Gamepad2 },
  { name: "Âm nhạc", note: "Album và dự án biểu diễn", Icon: Music4 },
  { name: "Đời sống xanh", note: "Giải pháp bền vững và ít rác", Icon: BookOpen },
] as const;

export function CategoryLinks() {
  return (
    <section className="border-b border-slate-200/80 bg-white">
      <div className="container-shell py-6">
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
          Lọc nhanh theo lĩnh vực
        </p>
        <div className="scrollbar-none mt-3.5 flex gap-3 overflow-x-auto px-0.5 pb-1 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-6">
          {categories.map((category) => {
            const { name, note, Icon } = category;
            const href =
              "href" in category
                ? category.href
                : `/discover?category=${encodeURIComponent(name)}`;
            return (
              <Link
                key={name}
                href={href}
                className="group flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-canvas-soft/60 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/70 hover:shadow-[0_6px_16px_rgba(22,163,74,0.1)]"
              >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-forest shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors group-hover:bg-coral group-hover:text-white">
                <Icon className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-ink group-hover:text-coral-dark">
                  {name}
                </span>
                <span className="mt-0.5 hidden truncate text-[11px] leading-4 text-ink-muted xl:block">
                  {note}
                </span>
              </span>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
