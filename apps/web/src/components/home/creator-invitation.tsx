import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const checkpoints = [
  "Mục tiêu vốn và thời hạn rõ ràng",
  "Gói quà, chi phí giao hàng tại Việt Nam",
  "Kế hoạch thực hiện và rủi ro có thể gặp",
];

export function CreatorInvitation() {
  return (
    <section className="page-section">
      <div className="container-shell grid overflow-hidden rounded-[22px] border border-line bg-[#e9ede5] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-11">
          <p className="text-xs font-bold text-coral-dark">Bạn đang có một ý tưởng?</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.04em] sm:text-4xl">
            Bắt đầu bằng một kế hoạch đủ rõ để mọi người cùng tin
          </h2>
          <p className="mt-5 text-sm leading-7 text-ink-soft">
            Tạo bản nháp, hoàn thiện từng phần rồi gửi duyệt. Bạn vẫn có thể
            xem trước trang chiến dịch trước khi công khai.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-soft">
            {checkpoints.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white text-emerald-700">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/creator/campaigns/new" className="button-dark mt-8 w-fit">
            Tạo bản nháp chiến dịch <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="relative min-h-[330px] lg:min-h-[470px]">
          <Image
            src="/images/editorial/cong-dong-xuong-san-pham-v3.webp"
            alt="Nhóm phát triển sản phẩm cùng kiểm tra bản mẫu và kế hoạch tại xưởng"
            fill
            sizes="(max-width: 1024px) 100vw, 54vw"
            className="object-cover object-[64%_center]"
          />
          <div className="absolute inset-x-5 bottom-5 rounded-xl bg-white/92 p-4 shadow-sm backdrop-blur-sm sm:inset-x-auto sm:bottom-7 sm:left-7 sm:max-w-sm">
            <p className="text-xs font-bold text-forest">Từ bản mẫu đến lô sản xuất đầu tiên</p>
            <p className="mt-1 text-[11px] leading-5 text-ink-soft">
              Cộng đồng không chỉ góp tiền, họ còn góp phản hồi để sản phẩm tốt
              hơn trước ngày giao.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
