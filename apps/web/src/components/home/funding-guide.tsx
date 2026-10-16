import { BadgeCheck, CreditCard, PackageCheck } from "lucide-react";

const steps = [
  {
    icon: BadgeCheck,
    number: "01",
    title: "Xem kỹ dự án",
    text: "Đọc câu chuyện, kế hoạch dùng vốn, rủi ro và thông tin của nhóm thực hiện.",
  },
  {
    icon: CreditCard,
    number: "02",
    title: "Chọn mức muốn góp",
    text: "Bạn chọn gói quà và địa chỉ giao. Khoản tiền mới được giữ ở trạng thái cam kết.",
  },
  {
    icon: PackageCheck,
    number: "03",
    title: "Chờ chiến dịch kết thúc",
    text: "Đủ mục tiêu thì khoản góp được thu. Nếu không đủ, cam kết tự hủy và không mất tiền.",
  },
] as const;

export function FundingGuide() {
  return (
    <section id="cach-hoat-dong" className="page-section scroll-mt-24 border-y border-line bg-white">
      <div className="container-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-bold text-coral-dark">Cách Góp hoạt động</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            Rõ trước khi góp, yên tâm khi chờ
          </h2>
          <p className="mt-4 text-sm leading-7 text-ink-soft">
            Góp dùng cơ chế tất cả hoặc không. Chủ dự án phải đạt mục tiêu đã
            công bố thì khoản cam kết mới được xử lý.
          </p>
        </div>

        <div className="mt-10 grid border-y border-line md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className={`py-7 md:px-7 ${index > 0 ? "border-t border-line md:border-l md:border-t-0" : "md:pl-0"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#eef2e3] text-forest">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-sm font-extrabold text-ink-muted">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-extrabold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
