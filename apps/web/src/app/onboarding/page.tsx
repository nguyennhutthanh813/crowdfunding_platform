import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { InterestPreferences } from "@/components/account/interest-preferences";

export const metadata: Metadata = {
  title: "Chọn lĩnh vực quan tâm",
  description: "Chọn sở thích để nhận gợi ý dự án phù hợp trên Góp.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const query = await searchParams;

  return (
    <section className="min-h-screen bg-[#efeee8] py-10 sm:py-16">
      <div className="container-shell grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-[20px] border border-forest/10 bg-[#e7eee4] p-7 text-ink sm:p-9 lg:sticky lg:top-24">
          <span className="grid size-12 place-items-center rounded-[12px] bg-forest text-lime">
            <Sparkles className="size-5" />
          </span>
          <p className="eyebrow mt-6 text-forest">Bước đầu tiên</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
            Để Góp hiểu bạn quan tâm điều gì.
          </h1>
          <p className="mt-4 text-sm leading-7 text-ink-soft">
            Chọn ít nhất hai lĩnh vực. Bạn có thể đổi lại bất cứ lúc nào trong
            phần cài đặt tài khoản.
          </p>
          <div className="mt-7 border-l-2 border-forest/25 pl-4 text-xs leading-6 text-ink-soft">
            Với thành viên mới chưa có lịch sử hoạt động, các lựa chọn này giúp
            hệ thống đưa ra danh sách gợi ý ban đầu hợp lý hơn.
          </div>
        </aside>

        <div className="rounded-[20px] border border-line bg-white p-6 sm:p-9">
          <p className="text-sm font-bold text-ink-soft">
            Chọn những chủ đề khiến bạn muốn dừng lại xem kỹ
          </p>
          <p className="mb-7 mt-2 text-xs leading-6 text-ink-muted">
            Không có lựa chọn đúng hay sai. Góp chỉ dùng chúng để ưu tiên dự án
            trên trang khám phá.
          </p>
          <InterestPreferences onboarding nextPath={query.next} />
        </div>
      </div>
    </section>
  );
}
