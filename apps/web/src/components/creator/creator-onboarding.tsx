import {
  ArrowRight,
  BookOpenCheck,
  Plus,
  Rocket,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

const onboardingSteps = [
  {
    number: "01",
    title: "Kể rõ ý tưởng",
    detail: "Nêu vấn đề, giải pháp và điều nhóm muốn cùng cộng đồng thực hiện.",
    icon: BookOpenCheck,
  },
  {
    number: "02",
    title: "Lập kế hoạch gọi vốn",
    detail: "Chốt mục tiêu, thời gian, gói quà và dự kiến giao hàng thực tế.",
    icon: WalletCards,
  },
  {
    number: "03",
    title: "Gửi xét duyệt",
    detail:
      "Kiểm tra lại hồ sơ rồi gửi quản trị viên phản hồi trước khi mở chiến dịch.",
    icon: ShieldCheck,
  },
];

export function CreatorOnboarding({ givenName }: { givenName: string }) {
  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-forest/10 bg-[#e5ece3] py-12 text-ink sm:py-16">
        <div className="container-shell grid gap-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <span className="eyebrow text-forest">
              <Rocket className="size-4" /> Không gian Chủ dự án
            </span>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold tracking-[-0.055em] sm:text-5xl">
              Chào {givenName}, mình bắt đầu từ một ý tưởng thật rõ nhé.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-soft">
              Bạn đã mở vai trò Chủ dự án nhưng chưa có chiến dịch nào. Góp sẽ
              chia hồ sơ thành từng bước ngắn để bạn có thể lưu nháp và quay lại
              bất cứ lúc nào.
            </p>
          </div>
          <div className="rounded-[16px] border border-forest/12 bg-white p-5">
            <p className="text-[11px] font-bold text-forest">
              Trạng thái tài khoản
            </p>
            <p className="mt-3 font-display text-xl font-extrabold">
              Sẵn sàng tạo chiến dịch đầu tiên
            </p>
            <p className="mt-2 text-xs leading-6 text-ink-muted">
              Bạn chỉ gửi xét duyệt khi đã điền đủ thông tin bắt buộc.
            </p>
          </div>
        </div>
      </div>

      <div className="container-shell py-10 sm:py-14">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-[20px] border border-line bg-white p-6 sm:p-8">
            <p className="eyebrow text-coral">Lộ trình gợi ý</p>
            <h2 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              Ba việc để có một hồ sơ thuyết phục
            </h2>
            <div className="mt-7 divide-y divide-line">
              {onboardingSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="grid gap-4 py-5 first:pt-0 sm:grid-cols-[48px_1fr]"
                  >
                    <span className="grid size-12 place-items-center rounded-[12px] bg-[#edf1e3] text-forest">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-ink-muted">
                        BƯỚC {step.number}
                      </p>
                      <h3 className="mt-1 text-sm font-extrabold">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-6 text-ink-soft">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="rounded-[20px] border border-line bg-white p-6 sm:p-7">
            <span className="grid size-12 place-items-center rounded-[12px] bg-coral text-white">
              <Plus className="size-5" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-extrabold">
              Tạo bản nháp đầu tiên
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              Bắt đầu bằng tên dự án và lĩnh vực. Mục tiêu vốn, gói quà và thành
              viên có thể bổ sung ở các bước sau.
            </p>
            <Link
              href="/creator/campaigns/new"
              className="button-primary mt-6 w-full"
            >
              Bắt đầu tạo chiến dịch <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/system-design"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-xs font-bold text-forest hover:text-coral-dark"
            >
              Xem quy trình xét duyệt
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
