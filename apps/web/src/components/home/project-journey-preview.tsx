import { ArrowRight, CheckCheck, FilePenLine, HandHeart, PackageCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const phases = [
  { icon: FilePenLine, name: "Chuẩn bị", detail: "Viết rõ sản phẩm, số tiền cần và các gói quà." },
  { icon: CheckCheck, name: "Xét duyệt", detail: "Quản trị viên kiểm hồ sơ và yêu cầu sửa nếu thiếu." },
  { icon: HandHeart, name: "Gọi vốn", detail: "Cộng đồng xem tiến độ, hỏi nhóm và ghi cam kết." },
  { icon: PackageCheck, name: "Sau gọi vốn", detail: "Chốt kết quả, chuẩn bị quà và theo dõi bàn giao." },
] as const;

export function ProjectJourneyPreview({ campaignId, localDbAvailable }: { campaignId: string; localDbAvailable: boolean }) {
  return <section className="border-y border-[#d9e4d5] bg-[#f2f5ec] py-12 sm:py-16" aria-labelledby="journey-heading">
    <div className="container-shell">
      <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#8c4b32]">Cây tiến độ dự án</p>
          <h2 id="journey-heading" className="mt-3 max-w-lg font-display text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-4xl">
            Từ ý tưởng đến lúc giao sản phẩm
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-ink-soft">
            Mỗi chặng có người phụ trách và trạng thái riêng. Bạn có thể mở nhật ký để xem thao tác nào đã được lưu, hoặc đọc cách chiến dịch vận hành.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {localDbAvailable ? <Link href={`/campaigns/${campaignId}/timeline`} className="button-dark">
              Xem cây tiến độ thật <ArrowRight className="size-4" />
            </Link> : null}
            <Link href="/huong-dan#chu-du-an" className="button-secondary">
              Các bước dành cho chủ dự án
            </Link>
          </div>
        </div>
        <figure className="overflow-hidden rounded-[24px] border border-[#d8dfd1] bg-[#f8f6ee] shadow-[0_18px_38px_rgba(38,76,48,0.08)]">
          <Image
            src="/images/editorial/hanh-trinh-du-an-3d.png"
            alt="Minh họa 3D các chặng từ phác thảo, xét duyệt, cộng đồng ủng hộ đến đóng gói sản phẩm"
            width={1672}
            height={940}
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="h-auto w-full"
          />
          <figcaption className="border-t border-[#e4e7db] px-4 py-2 text-xs text-[#526857]">Hình minh họa quy trình, không phải ảnh từ một chiến dịch đang chạy.</figcaption>
        </figure>
      </div>
      <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          return <li key={phase.name} className="relative rounded-[18px] border border-[#d8e2d2] bg-white p-4 shadow-[0_8px_18px_rgba(26,60,40,0.04)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[#edf2e7] text-[#315a3f]"><Icon className="size-5" /></span>
              <span className="font-display text-sm font-extrabold text-[#718575]">0{index + 1}</span>
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-[#17392f]">{phase.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[#4b6456]">{phase.detail}</p>
            {index < phases.length - 1 ? <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-white text-[#67846b] lg:block" aria-hidden="true" /> : null}
          </li>;
        })}
      </ol>
    </div>
  </section>;
}
