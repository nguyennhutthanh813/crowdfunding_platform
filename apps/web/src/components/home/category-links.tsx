import Link from "next/link";

const categories = [
  { name: "Công nghệ", note: "Thiết bị và sản phẩm số" },
  { name: "Thiết kế", note: "Đồ dùng và không gian sống" },
  { name: "Trò chơi", note: "Board game và trò chơi Việt" },
  { name: "Âm nhạc", note: "Album và dự án biểu diễn" },
  { name: "Xuất bản", note: "Sách, truyện và nội dung độc lập" },
  { name: "Đời sống xanh", note: "Giải pháp dùng bền và ít rác" },
] as const;

export function CategoryLinks() {
  return (
    <section className="border-b border-line bg-white">
      <div className="container-shell py-7">
        <p className="text-xs font-bold text-ink-muted">Tìm theo lĩnh vực</p>
        <div className="mt-4 grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              href={`/discover?category=${encodeURIComponent(category.name)}`}
              className="group flex items-start gap-3 rounded-xl px-1 py-2"
            >
              <span
                className={`mt-1 size-2.5 shrink-0 rounded-full ${[
                  "bg-[#e8794f]",
                  "bg-[#b88b58]",
                  "bg-[#6574b9]",
                  "bg-[#4886a6]",
                  "bg-[#8a6a9b]",
                  "bg-[#5b9169]",
                ][index]}`}
              />
              <span>
                <span className="block text-sm font-bold text-ink group-hover:text-coral-dark">
                  {category.name}
                </span>
                <span className="mt-0.5 hidden text-[10px] leading-4 text-ink-muted xl:block">
                  {category.note}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
