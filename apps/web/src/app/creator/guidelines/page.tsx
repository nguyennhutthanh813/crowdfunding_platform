import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  HelpCircle,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Link from "next/link";

export const metadata: Metadata = {
  title: "Quy trình xét duyệt chiến dịch · Góp",
  description:
    "Hướng dẫn các bước kiểm duyệt hồ sơ gọi vốn, tiêu chí đánh giá chất lượng và quy chuẩn an toàn trên nền tảng Góp.",
};

const stages = [
  {
    step: "01",
    name: "Soạn thảo bản nháp",
    status: "DRAFT",
    badgeTone: "bg-slate-100 text-slate-700 border-slate-200",
    timeframe: "Tùy ý Creator",
    description:
      "Chủ dự án nhập thông tin cơ bản: Tiêu đề, Mục tiêu vốn, Thời hạn gọi vốn (15–60 ngày), Câu chuyện dự án (Markdown), Rủi ro & Thách thức, Media và tối thiểu 1 gói phần thưởng (Reward Tier).",
    checklist: [
      "Mục tiêu gọi vốn hợp lý, có tính khả thi",
      "Có ít nhất 1 hình ảnh hoặc video giới thiệu rõ nét",
      "Có ít nhất 1 gói phần thưởng hợp lệ kèm ngày giao dự kiến",
      "Nội dung mô tả rõ kế hoạch sử dụng ngân sách",
    ],
  },
  {
    step: "02",
    name: "Gửi duyệt & Thẩm định",
    status: "IN_REVIEW",
    badgeTone: "bg-amber-50 text-amber-800 border-amber-200",
    timeframe: "1 – 3 ngày làm việc",
    description:
      "Khi Creator bấm 'Gửi duyệt', hồ sơ được chuyển vào hàng chờ xét duyệt của Admin. Hệ thống khóa chức năng chỉnh sửa các trường nhạy cảm để đảm bảo tính toàn vẹn thông tin.",
    checklist: [
      "Kiểm tra danh tính Chủ dự án và tài khoản nhận tiền",
      "Rà soát quyền sở hữu trí tuệ, bản quyền hình ảnh",
      "Đánh giá rủi ro sản xuất và khả năng giao hàng",
      "Phản hồi chỉnh sửa nếu hồ sơ chưa đạt chuẩn",
    ],
  },
  {
    step: "03",
    name: "Phê duyệt & Sẵn sàng",
    status: "APPROVED / PRE_LAUNCH",
    badgeTone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    timeframe: "Creator chủ động",
    description:
      "Admin chấp thuận hồ sơ. Creator có thể đưa dự án vào trạng thái 'Sắp ra mắt' (PRE_LAUNCH) để thu thập người theo dõi và người đăng ký nhận thông báo trước ngày mở chính thức.",
    checklist: [
      "Kích hoạt trang đón đầu Pre-launch để gom người quan tâm",
      "Xem trước giao diện trang chiến dịch trên mọi thiết bị",
      "Kiểm tra lại cấu hình các mức phí vận chuyển",
      "Bấm nút 'Khởi chạy dự án' khi sẵn sàng",
    ],
  },
  {
    step: "04",
    name: "Khởi chạy nhận ủng hộ",
    status: "LIVE",
    badgeTone: "bg-lime/25 text-forest border-forest/20",
    timeframe: "15 – 60 ngày",
    description:
      "Chiến dịch chính thức mở công khai trên sàn theo cơ chế All-or-Nothing. Backer có thể chọn gói quà thưởng, add-on và ủy quyền thanh toán giữ hạn mức.",
    checklist: [
      "Đăng bài cập nhật tiến độ (Updates) định kỳ cho cộng đồng",
      "Tương tác và giải đáp thắc mắc qua tab Hỏi đáp & Bình luận",
      "Theo dõi nhịp gọi vốn và tỷ lệ hoàn thành mục tiêu",
      "Chuẩn bị kế hoạch thực hiện phần thưởng ngay khi cán đích",
    ],
  },
];

const criteria = [
  {
    title: "1. Tính khả thi của sản phẩm",
    detail:
      "Dự án phải có sản phẩm thực tế, bản vẽ kỹ thuật, nguyên mẫu (prototype) hoặc kế hoạch sản xuất rõ ràng. Góp không chấp nhận những ý tưởng trừu tượng chưa có phương án gia công khả thi.",
  },
  {
    title: "2. Minh bạch ngân sách & chi phí",
    detail:
      "Chủ dự án cần phân bổ ngân sách cụ thể cho từng hạng mục: chi phí nguyên vật liệu, khuôn mẫu, gia công, bao bì, phí nền tảng (5%), thuế và quỹ dự phòng rủi ro.",
  },
  {
    title: "3. Phần thưởng thực tế & hợp pháp",
    detail:
      "Gói quà thưởng phải phản ánh đúng kết quả của chiến dịch (sản phẩm hoàn thiện, bản in, quà lưu niệm...). Ngày giao hàng dự kiến cần tính toán có độ dôi để hạn chế tình trạng trễ hẹn.",
  },
  {
    title: "4. Cơ chế cam kết All-or-Nothing",
    detail:
      "Nếu chiến dịch đạt hoặc vượt 100% mục tiêu lúc kết thúc, tiền mới được thu để chuyển cho Creator thực hiện. Nếu không đạt mục tiêu, toàn bộ ủy quyền thanh toán được hoàn trả cho Backer.",
  },
];

const prohibited = [
  "Huy động vốn để chia sẻ lợi nhuận tài chính, cổ phần công ty, trái phiếu hoặc tiền mã hóa (crypto/tokens).",
  "Kêu gọi từ thiện không gắn liền với việc phân phối hoặc báo cáo kết quả cụ thể.",
  "Sản phẩm giả mạo, vi phạm nhãn hiệu, nội dung sao chép không có bản quyền sử dụng.",
  "Chất kích thích, vũ khí, hàng cấm hoặc các sản phẩm vi phạm quy định pháp luật Việt Nam.",
];

export default function CreatorGuidelinesPage() {
  return (
    <div className="min-h-screen bg-canvas pb-20 pt-8 sm:pt-12">
      <div className="container-shell max-w-5xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/creator"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-forest"
          >
            <ArrowLeft className="size-4" /> Quay lại Không gian Creator
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-coral-dark">
            <BookOpenCheck className="size-3.5" /> Hướng dẫn tiêu chuẩn
          </span>
        </div>

        {/* Header Hero */}
        <div className="mt-6 rounded-[24px] border border-line bg-white p-7 sm:p-10 lg:p-12">
          <span className="eyebrow text-forest">
            <ShieldCheck className="size-4" /> Tiêu chuẩn vận hành nền tảng
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            Quy trình xét duyệt & Hướng dẫn khởi tạo chiến dịch
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base sm:leading-8">
            Nền tảng <strong>Góp</strong> áp dụng quy trình kiểm duyệt công bằng,
            chặt chẽ theo cơ chế <em>All-or-Nothing</em> nhằm bảo vệ quyền lợi
            của người ủng hộ, đồng thời giúp các Chủ dự án xây dựng niềm tin vững
            chắc với cộng đồng ngay từ ngày đầu ra mắt.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/creator/campaigns/new" className="button-primary">
              <Rocket className="size-4" /> Bắt đầu tạo chiến dịch mới
            </Link>
          </div>
        </div>


        {/* 4 Stages of Review */}
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
                4 giai đoạn trong vòng đời xét duyệt
              </h2>
              <p className="mt-1.5 text-xs text-ink-muted sm:text-sm">
                Từ ý tưởng ban đầu đến khi chính thức mở cổng nhận ủng hộ từ cộng
                đồng.
              </p>
            </div>
            <span className="hidden rounded-[10px] border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft sm:inline-flex sm:items-center sm:gap-2">
              <Clock className="size-4 text-forest" /> Xét duyệt: 24–48h
            </span>
          </div>

          <div className="mt-6 grid gap-5">
            {stages.map((stage) => (
              <div
                key={stage.step}
                className="overflow-hidden rounded-[20px] border border-line bg-white p-6 sm:p-8 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-forest font-display text-base font-extrabold text-lime">
                      {stage.step}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xl font-extrabold sm:text-2xl">
                          {stage.name}
                        </h3>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${stage.badgeTone}`}
                        >
                          {stage.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg bg-canvas-soft px-3 py-1.5 text-right sm:min-w-36">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      Thời gian
                    </span>
                    <span className="text-xs font-extrabold text-ink">
                      {stage.timeframe}
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t border-line/70 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Yêu cầu cần đạt ở bước này:
                  </p>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {stage.checklist.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-xs font-medium text-ink-soft"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quality Criteria */}
        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            Tiêu chí đánh giá chất lượng hồ sơ
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Đội ngũ quản trị viên sẽ dựa vào 4 tiêu chuẩn cốt lõi sau đây để phê
            duyệt hồ sơ của bạn:
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {criteria.map((c) => (
              <div
                key={c.title}
                className="rounded-[18px] border border-line bg-white p-6"
              >
                <h3 className="font-display text-base font-extrabold text-forest">
                  {c.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-ink-soft sm:text-sm">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Prohibited items */}
        <section className="mt-14 rounded-[22px] border border-red-200 bg-red-50/50 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-700">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-red-950">
                Những nội dung bị nghiêm cấm
              </h2>
              <p className="text-xs text-red-800">
                Hồ sơ chứa các yếu tố sau sẽ bị từ chối xét duyệt hoặc khóa tài
                khoản ngay lập tức:
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5">
            {prohibited.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs leading-5 text-red-900 sm:text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA Bottom */}
        <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-[22px] border border-forest/15 bg-forest p-8 text-center text-white sm:flex-row sm:text-left">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-lime">
              Sẵn sàng đưa ý tưởng ra ánh sáng?
            </h2>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">
              Tạo bản nháp ngay hôm nay. Bạn có thể lưu lại và tiếp tục hoàn
              thiện bất cứ lúc nào.
            </p>
          </div>
          <Link
            href="/creator/campaigns/new"
            className="button-primary shrink-0 bg-lime text-forest hover:bg-white"
          >
            Tạo chiến dịch mới <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
