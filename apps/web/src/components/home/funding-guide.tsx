import { BadgeCheck, CreditCard, PackageCheck } from "lucide-react";
import Image from "next/image";

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
    text: "Bạn chọn gói quà và địa chỉ giao. Cam kết được ghi lại để bạn xem trong tài khoản; chưa giữ tiền thật.",
  },
  {
    icon: PackageCheck,
    number: "03",
    title: "Chờ chiến dịch kết thúc",
    text: "Khi có cổng thanh toán, chỉ chiến dịch đạt mục tiêu mới được thu tiền; nếu không đạt, khoản ủy quyền cần được hủy. Hiện chưa liên kết ngân hàng.",
  },
] as const;

export function FundingGuide({ localDbAvailable }: { localDbAvailable: boolean }) {
  return (
    <section id="cach-hoat-dong" className="page-section scroll-mt-24 border-y border-line bg-white">
      <div className="container-shell">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold text-coral-dark">Cách Góp hoạt động</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              Rõ trước khi góp, yên tâm khi chờ
            </h2>
            <p className="mt-4 text-sm leading-7 text-ink-soft">
              Góp mô phỏng cơ chế tất cả hoặc không. Chủ dự án phải đạt mục tiêu đã
              công bố thì khoản cam kết mới được xử lý ở phiên bản có cổng thanh toán.
              {localDbAvailable ? " Dữ liệu thao tác hiện lưu trong SQLite trên máy chạy web." : " Dữ liệu dùng thử hiện chỉ nằm trong trình duyệt của bạn."}
            </p>
          </div>
          <div className="relative min-h-[220px] overflow-hidden rounded-[18px] border border-line sm:min-h-[290px]">
            <Image src="/images/editorial/dong-goi-qua-minh-hoa-v1.webp"
              alt="Ảnh minh họa hai người chuẩn bị hộp quà thủ công trong xưởng nhỏ"
              fill sizes="(max-width: 1024px) 100vw, 52vw" className="object-cover object-center" />
            <p className="absolute bottom-3 left-3 right-3 w-fit max-w-[90%] rounded-lg bg-white/94 px-3 py-2 text-[11px] font-semibold text-forest shadow-sm backdrop-blur-sm">
              Minh họa khâu chuẩn bị quà · chưa phải đơn hàng thật
            </p>
          </div>
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
