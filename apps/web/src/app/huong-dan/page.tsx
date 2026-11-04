import type { Metadata } from "next";
import { ArrowRight, CircleHelp, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { localDbEnabled } from "@/lib/local-db/database";

export const metadata: Metadata = {
  title: "Hướng dẫn dùng Góp",
  description: "Các bước xem dự án, ủng hộ mẫu, tạo chiến dịch, cộng tác và quản trị trên Góp.",
};

type GuideStep = { title: string; detail: string; href: string; action: string };

function GuideSection({
  id, number, title, intro, steps, tone,
}: {
  id: string;
  number: string;
  title: string;
  intro: string;
  steps: GuideStep[];
  tone: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t border-line py-10 sm:py-12">
      <div className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <div>
          <p className={`text-sm font-bold ${tone}`}>Cách dùng {number}</p>
          <h2 id={`${id}-title`} className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h2>
          <p className="mt-3 text-base leading-7 text-ink-soft">{intro}</p>
        </div>
        <ol className="border-l-2 border-[#d7dfd1] pl-5 sm:pl-8">
          {steps.map((step, index) => (
            <li key={step.title} className="relative pb-7 last:pb-0">
              <span aria-hidden="true" className="absolute -left-[31px] top-0 grid size-6 place-items-center rounded-full border border-[#a7b9a5] bg-white text-xs font-bold text-forest sm:-left-[45px]">
                {index + 1}
              </span>
              <h3 className="font-display text-lg font-extrabold">{step.title}</h3>
              <p className="mt-1 max-w-2xl text-base leading-7 text-ink-soft">{step.detail}</p>
              <Link href={step.href} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-coral-dark underline-offset-4 hover:underline">
                {step.action} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default async function GuidePage() {
  const campaigns = await api.listCampaigns();
  const hasLocalDb = localDbEnabled();
  const example = campaigns.find((item) => item.status === "LIVE") ?? campaigns[0];
  const examplePage = example ? `/projects/${example.slug}` : "/discover";
  const examplePledge = example ? `/pledge/${example.slug}` : "/discover";

  return (
    <div className="bg-canvas-soft">
      <div className="container-shell pb-16 pt-10 sm:pt-14">
        <nav aria-label="Đường dẫn trang" className="text-sm text-ink-muted">
          <Link href="/" className="underline-offset-4 hover:underline">Trang chủ</Link> / Hướng dẫn
        </nav>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-coral-dark"><CircleHelp className="size-5" /> Bắt đầu từ đây</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.12] tracking-[-0.04em] sm:text-5xl">Dùng Góp theo từng bước</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-ink-soft sm:text-lg">
              Chọn việc bạn muốn làm, rồi mở đúng màn hình ở mỗi bước. Một chiến dịch đi từ bản nháp của chủ dự án, qua bước duyệt, mở gọi vốn, đến lúc người ủng hộ theo dõi kết quả.
            </p>
          </div>
          <aside className="rounded-2xl border border-[#c9dac3] bg-[#eef5e7] p-5 text-sm leading-6 text-[#31533a]">
            <ShieldCheck className="size-6" aria-hidden="true" />
            <p className="mt-3 font-bold">Đây là website dùng thử</p>
            <p className="mt-1">Bạn có thể chọn tài khoản mẫu ở trang đăng nhập. Các nút ủng hộ chỉ ghi dữ liệu mẫu, không yêu cầu thẻ và không thu tiền.</p>
            <Link href="/auth" className="mt-3 inline-flex min-h-11 items-center gap-2 font-bold underline-offset-4 hover:underline">Chọn tài khoản mẫu <ArrowRight className="size-4" /></Link>
          </aside>
        </div>

        <nav aria-label="Chọn phần hướng dẫn" className="mt-10 flex flex-wrap gap-2 border-y border-line py-4">
          {[
            ["khach", "Khách xem"], ["nguoi-ung-ho", "Người ủng hộ"],
            ["chu-du-an", "Chủ dự án"], ["cong-tac-vien", "Cộng tác viên"],
            ["quan-tri", "Quản trị viên"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-[#a1baa3] hover:bg-[#f4f8ee]">{label}</a>
          ))}
        </nav>

        <GuideSection id="khach" number="01" title="Khách xem dự án" tone="text-forest" intro="Chưa có tài khoản vẫn xem được dự án đã công khai. Khi muốn lưu, hỏi hoặc ủng hộ, hãy đăng nhập."
          steps={[
            { title: "Tìm dự án", detail: "Dùng ô tìm kiếm hoặc chọn lĩnh vực. Mỗi thẻ có mục tiêu vốn, tiến độ và tên chủ dự án.", href: "/discover", action: "Mở danh sách dự án" },
            { title: "Đọc kỹ trước khi quyết định", detail: "Xem câu chuyện, gói quà, câu hỏi thường gặp và phần cập nhật. Với dữ liệu mẫu, số ngày còn lại tính từ mốc ghi ở đầu trang.", href: examplePage, action: example ? `Xem ${example.title}` : "Xem dự án" },
          ]} />
        <GuideSection id="nguoi-ung-ho" number="02" title="Người ủng hộ" tone="text-[#985233]" intro="Đăng nhập nhanh bằng tài khoản Phạm Minh Anh để thấy cùng một cam kết trên trang dự án và trong sổ cá nhân."
          steps={[
            { title: "Chọn gói", detail: "Chọn một gói quà hoặc ủng hộ không nhận quà. Bạn có thể quay lại sửa trước khi xác nhận.", href: examplePledge, action: "Thử chọn gói ủng hộ" },
            { title: "Kiểm tra tổng tiền mẫu", detail: "Nếu có quà vật lý, nhập địa chỉ tại Việt Nam. Màn xác nhận cộng gói quà, phụ kiện, phí giao và khoản góp thêm.", href: examplePledge, action: "Mở các bước cam kết" },
            { title: "Xem kết quả và hỏi nhóm dự án", detail: "Sau khi ghi cam kết mẫu, vào Sổ ủng hộ để xem trạng thái, tin nhắn và cập nhật. Không có khoản tiền nào bị giữ hoặc trừ.", href: "/dashboard", action: "Mở sổ ủng hộ" },
          ]} />
        <GuideSection id="chu-du-an" number="03" title="Chủ dự án" tone="text-[#386343]" intro="Chủ dự án có thể quản lý nhiều chiến dịch; mỗi hồ sơ có nội dung, nhóm làm việc và tiến độ riêng."
          steps={[
            { title: "Mở vai trò Chủ dự án", detail: "Bấm Tạo chiến dịch để bắt đầu. Nếu chưa có tài khoản, đăng ký trước; nếu đang là Người ủng hộ, xác nhận mở thêm vai trò Chủ dự án. Form tạo mới sẽ mở sau bước này.", href: "/creator/campaigns/new", action: "Bắt đầu tạo chiến dịch" },
            { title: "Tạo và lưu bản nháp", detail: "Điền mục tiêu, câu chuyện, rủi ro, gói quà và phí giao. Có thể lưu rồi quay lại sửa.", href: "/creator/campaigns/new", action: "Tạo chiến dịch" },
            { title: "Gửi duyệt và xem phản hồi", detail: "Khi hồ sơ đủ thông tin, gửi quản trị viên. Nếu được yêu cầu sửa, mở lại đúng hồ sơ để bổ sung rồi gửi tiếp.", href: "/creator", action: "Xem các chiến dịch của tôi" },
            { title: "Mở gọi vốn và theo dõi", detail: "Hồ sơ được duyệt mới có nút mở. Sau đó chủ dự án xem cam kết, đăng cập nhật, trả lời câu hỏi và giao việc cho người đã nhận lời mời.", href: "/creator", action: "Mở nơi quản lý chiến dịch" },
          ]} />
        <GuideSection id="cong-tac-vien" number="04" title="Cộng tác viên" tone="text-[#235a91]" intro="Cộng tác viên chỉ thao tác trong chiến dịch đã được mời và với những quyền chủ dự án cấp."
          steps={[
            { title: "Nhận lời mời", detail: "Đăng nhập bằng tài khoản được mời, xem tên chiến dịch và chấp nhận trước khi làm việc.", href: "/collaborator", action: "Xem lời mời và việc của tôi" },
            { title: "Làm việc trong chiến dịch", detail: "Mở phần việc được giao. Nếu có quyền, bạn đăng tiến độ và trả lời câu hỏi; phản hồi sẽ hiện nhãn Cộng tác viên ở trang công khai.", href: "/collaborator", action: "Mở bảng việc nhóm" },
          ]} />
        <GuideSection id="quan-tri" number="05" title="Quản trị viên" tone="text-[#a12c35]" intro="Quản trị viên đọc hồ sơ, ghi lý do cho quyết định và theo dõi rủi ro. Các tài khoản khác không vào được khu vực này."
          steps={[
            { title: "Duyệt hồ sơ mới", detail: "Đọc mục tiêu, câu chuyện, gói quà và rủi ro trước khi duyệt hoặc yêu cầu sửa. Phản hồi quay về đúng chiến dịch của chủ dự án.", href: "/admin?tab=reviews", action: "Mở hàng chờ duyệt" },
            { title: "Kiểm tra cảnh báo", detail: "Điểm rủi ro chỉ giúp xếp thứ tự. Người quản trị đọc tín hiệu và tự đưa ra kết luận có lý do.", href: "/admin?tab=fraud", action: "Mở cảnh báo" },
            hasLocalDb
              ? { title: "Đối chiếu dữ liệu trên máy", detail: "Khi chạy local, xem bảng quan hệ và lịch sử phát sinh. Dữ liệu này phục vụ demo, chưa phải hệ thống thanh toán thật.", href: "/local-data", action: "Xem dữ liệu SQLite" }
              : { title: "Xem sơ đồ dữ liệu", detail: "Bản web triển khai không lưu SQLite. Sơ đồ cho biết các bảng và quan hệ dự kiến; dữ liệu đang thử chỉ nằm trong phiên trình duyệt.", href: "/system-design", action: "Xem sơ đồ dữ liệu" },
          ]} />
      </div>
    </div>
  );
}
