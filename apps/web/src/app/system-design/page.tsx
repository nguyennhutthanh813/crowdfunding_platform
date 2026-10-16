import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDownToLine,
  BookOpenCheck,
  BrainCircuit,
  ClipboardCheck,
  Database,
  ExternalLink,
  FilePenLine,
  GitBranch,
  Images,
  ShieldCheck,
  Users,
} from "lucide-react";
import { auditMockData } from "@/lib/api/mock/integrity";

export const metadata: Metadata = {
  title: "Hồ sơ hệ thống",
  description:
    "Cây chức năng, cây phi chức năng, cây UI/UX, Use Case Diagram và Database Schema của đồ án.",
};

const roleBlueprints = [
  {
    title: "Cây chức năng theo vai trò",
    label: "Role → Use Case",
    description:
      "Chia 54 Use Case cho Guest, Backer, Creator, Collaborator, Admin và System/Worker; EXT được tách khỏi phần lõi.",
    src: "/diagrams/blueprints/01-cay-chuc-nang-theo-role.png",
    svg: "/diagrams/blueprints/01-cay-chuc-nang-theo-role.svg",
    drawio: "/diagrams/blueprints/01-cay-chuc-nang-theo-role.drawio",
    width: 1413,
    height: 983,
  },
  {
    title: "Cây yêu cầu phi chức năng",
    label: "Role → Tiêu chí kiểm tra",
    description:
      "Gắn yêu cầu dễ dùng, thanh toán rõ ràng, phân quyền, AI giải thích được, audit và quality gate vào từng role.",
    src: "/diagrams/blueprints/02-cay-phi-chuc-nang-theo-role.png",
    svg: "/diagrams/blueprints/02-cay-phi-chuc-nang-theo-role.svg",
    drawio: "/diagrams/blueprints/02-cay-phi-chuc-nang-theo-role.drawio",
    width: 1573,
    height: 782,
  },
  {
    title: "Cây UI/UX và màn hình",
    label: "Role → Workspace → Route",
    description:
      "Chuyển chức năng thành cấu trúc màn hình riêng cho từng vai trò và dùng chung một câu chuyện dữ liệu ORBIT để đối chiếu.",
    src: "/diagrams/blueprints/03-cay-ui-ux-theo-role.png",
    svg: "/diagrams/blueprints/03-cay-ui-ux-theo-role.svg",
    drawio: "/diagrams/blueprints/03-cay-ui-ux-theo-role.drawio",
    width: 1908,
    height: 891,
  },
];

const controlDocuments = [
  {
    title: "Kiểm định dự án ngày 17/09",
    detail:
      "Lỗi đã tái hiện, thay đổi, kết quả kiểm thử và yêu cầu còn thiếu; không xem demo là backend hoàn chỉnh.",
    href: "/diagrams/blueprints/10-kiem-dinh-du-an-va-nguon-goc.md",
  },
  {
    title: "Kế hoạch hoàn thiện",
    detail:
      "Ba chặng còn lại, chia việc hai thành viên, Definition of Done và rủi ro.",
    href: "/diagrams/blueprints/05-ke-hoach-hoan-thien-ui-ux.md",
  },
  {
    title: "Ma trận truy vết thực thi",
    detail:
      "Nối Role → UC/NFR → record → route → bằng chứng và phần còn thiếu.",
    href: "/diagrams/blueprints/06-ma-tran-truy-vet-thuc-thi.md",
  },
  {
    title: "Tiến độ đang làm thật",
    detail:
      "Checkpoint, quality gate đã chạy và hàng việc kế tiếp theo thứ tự.",
    href: "/diagrams/blueprints/PROGRESS.md",
  },
  {
    title: "Chuẩn prompt và bước người duyệt",
    detail:
      "Tách ba AI lõi khỏi trợ lý ngôn ngữ; chốt version, input snapshot và human review.",
    href: "/diagrams/blueprints/08-chuan-prompt-va-human-review.md",
  },
];

const useCaseDiagrams = [
  {
    title: "Tổng quan hệ thống",
    count: "54 Use Case",
    description:
      "Toàn bộ actor, biên hệ thống, ba module AI và hai hệ thống ngoài.",
    src: "/diagrams/roles/UC-00-Tong-quan.png",
    drawio: "/diagrams/roles/UC-00-Tong-quan.drawio",
    width: 1182,
    height: 1922,
  },
  {
    title: "Khách chưa đăng nhập",
    count: "05 Use Case",
    description:
      "G01–G05: xem, tìm kiếm, mở chi tiết dự án, đăng ký và đăng nhập.",
    src: "/diagrams/roles/UC-01-Guest.png",
    drawio: "/diagrams/roles/UC-01-Guest.drawio",
    width: 889,
    height: 898,
  },
  {
    title: "Người ủng hộ",
    count: "16 Use Case",
    description:
      "B01–B16: gợi ý, lưu, theo dõi, cam kết, thanh toán, trao đổi và nhận quà.",
    src: "/diagrams/roles/UC-02-Backer.png",
    drawio: "/diagrams/roles/UC-02-Backer.drawio",
    width: 1184,
    height: 2593,
  },
  {
    title: "Chủ dự án",
    count: "15 Use Case",
    description:
      "C01–C15: bản nháp, quà, nhóm, dự báo, xét duyệt, vận hành và giao quà.",
    src: "/diagrams/roles/UC-03-Creator.png",
    drawio: "/diagrams/roles/UC-03-Creator.drawio",
    width: 1193,
    height: 2390,
  },
  {
    title: "Cộng tác viên",
    count: "03 Use Case dùng chung",
    description:
      "C12–C14: xem dự báo, đăng cập nhật và trả lời bình luận trong đúng campaign.",
    src: "/diagrams/roles/UC-04-Collaborator.png",
    drawio: "/diagrams/roles/UC-04-Collaborator.drawio",
    width: 1452,
    height: 812,
  },
  {
    title: "Quản trị viên",
    count: "10 Use Case",
    description:
      "A01–A10: xét duyệt, người dùng, phí nền tảng và cảnh báo gian lận.",
    src: "/diagrams/roles/UC-05-Admin.png",
    drawio: "/diagrams/roles/UC-05-Admin.drawio",
    width: 1115,
    height: 1800,
  },
  {
    title: "Hệ thống & Worker",
    count: "08 Use Case",
    description:
      "S01–S08: metric, AI scoring, chốt campaign, capture/cancel và notification.",
    src: "/diagrams/roles/UC-06-System-Worker.png",
    drawio: "/diagrams/roles/UC-06-System-Worker.drawio",
    width: 1238,
    height: 1461,
  },
];

const erdDiagrams = [
  {
    label: "ERD tổng quan",
    src: "/diagrams/erd-overview.png",
    drawio: "/diagrams/erd/ERD-00-Tong-quan.drawio",
  },
  {
    label: "ERD nghiệp vụ lõi",
    src: "/diagrams/erd-core.png",
    drawio: "/diagrams/erd/ERD-01-Nghiep-vu-loi.drawio",
  },
  {
    label: "ERD AI & cộng đồng",
    src: "/diagrams/erd-ai-community.png",
    drawio: "/diagrams/erd/ERD-02-AI-Cong-dong.drawio",
  },
];

const summary = [
  {
    title: "Cây tham chiếu theo role",
    count: "03",
    detail: "Chức năng, phi chức năng và UI/UX đi cùng một cấu trúc vai trò",
    tone: "bg-[#fff4d8] text-[#7a6520]",
  },
  {
    title: "Danh mục Use Case",
    count: "54",
    detail: "5 actor nghiệp vụ + Worker, Stripe Sandbox và AI Service",
    tone: "bg-[#fff0e9] text-coral-dark",
  },
  {
    title: "Bảng dữ liệu",
    count: "37",
    detail: "PostgreSQL DDL, constraint, index, trigger và funding view",
    tone: "bg-[#eef4df] text-[#566c27]",
  },
];

export default function SystemDesignPage() {
  const mockIntegrity = auditMockData();

  return (
    <>
      <section className="paper-grid bg-forest py-14 text-white sm:py-18">
        <div className="container-shell">
          <span className="eyebrow text-lime">
            <GitBranch className="size-4" /> Hồ sơ phân tích thiết kế
          </span>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-extrabold tracking-[-0.055em] sm:text-6xl">
            Từ yêu cầu, vai trò đến từng màn hình demo.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/62 sm:text-base">
            Ba cây tham chiếu giúp nhóm không làm giao diện theo cảm tính. Bên
            dưới là 54 Use Case, ERD và Database Schema; mỗi ảnh quan trọng đều
            có file Draw.io tương ứng để sửa lại khi giảng viên góp ý.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/diagrams/gop-use-cases.drawio"
              download
              className="button-primary min-h-12 px-5"
            >
              <FilePenLine className="size-4" /> Tải file Draw.io (4 trang)
            </a>
            <a
              href="/diagrams/use-case-overview.png"
              download
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/14 bg-white/7 px-5 text-xs font-bold text-white transition-colors hover:bg-white/12"
            >
              <Images className="size-4" /> Tải PNG tổng quan
            </a>
            <a
              href="/diagrams/blueprints/05-ke-hoach-hoan-thien-ui-ux.md"
              download
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/14 bg-white/7 px-5 text-xs font-bold text-white transition-colors hover:bg-white/12"
            >
              <ClipboardCheck className="size-4" /> Tải kế hoạch thực thi
            </a>
          </div>
          <p className="mt-4 text-xs text-white/45">
            Mở file{" "}
            <strong className="text-white/70">gop-use-cases.drawio</strong> tại
            draw.io / diagrams.net; mọi actor, ellipse và đường nối đều là đối
            tượng có thể sửa.
          </p>
        </div>
      </section>

      <section className="page-section">
        <div className="container-shell">
          <div className="grid gap-4 md:grid-cols-3">
            {summary.map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] border border-line bg-white p-5 shadow-[var(--shadow-card)]"
              >
                <span
                  className={`inline-flex rounded-xl px-3 py-2 font-display text-2xl font-extrabold ${item.tone}`}
                >
                  {item.count}
                </span>
                <h2 className="mt-4 font-display text-lg font-extrabold">
                  {item.title}
                </h2>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-14">
            <p className="eyebrow text-coral">
              <GitBranch className="size-4" /> Ba cây dẫn đường
            </p>
            <h2 className="mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em]">
              Chức năng nào cũng phải đi được tới dữ liệu và màn hình.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">
              Nhóm dùng ba cây này để rà phạm vi trước khi thêm giao diện. Bản
              PNG/SVG xếp nhánh về hai phía để chữ đọc được khi chèn báo cáo;
              bản Draw.io dùng lưới 3 × 2 và giữ từng khối riêng để chỉnh tiếp.
            </p>

            <div className="mt-7 grid gap-6">
              {roleBlueprints.map((diagram) => (
                <article
                  key={diagram.src}
                  className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[var(--shadow-card)]"
                >
                  <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-start sm:p-6">
                    <div>
                      <span className="rounded-full bg-[#fff4d8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a6520]">
                        {diagram.label}
                      </span>
                      <h3 className="mt-3 font-display text-xl font-extrabold">
                        {diagram.title}
                      </h3>
                      <p className="mt-2 max-w-3xl text-xs leading-5 text-ink-muted">
                        {diagram.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={diagram.drawio}
                        download
                        className="button-ghost min-h-9 px-3 text-xs"
                      >
                        <FilePenLine className="size-3.5" /> Draw.io
                      </a>
                      <a
                        href={diagram.svg}
                        download
                        className="button-secondary min-h-9 px-3 text-xs"
                      >
                        <ArrowDownToLine className="size-3.5" /> SVG
                      </a>
                    </div>
                  </div>

                  <a
                    href={diagram.src}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-x-auto bg-[#f5f4ee] p-3 sm:p-4"
                    aria-label={`Mở ảnh đầy đủ: ${diagram.title}`}
                  >
                    <Image
                      src={diagram.src}
                      alt={diagram.title}
                      width={diagram.width}
                      height={diagram.height}
                      loading="eager"
                      unoptimized
                      className="h-auto w-full min-w-[760px] rounded-2xl border border-line bg-white transition-opacity group-hover:opacity-90 lg:min-w-0"
                    />
                  </a>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-col justify-between gap-4 rounded-[24px] border border-[#b9ccb8] bg-[#f2f7ee] p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-lime">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-forest">
                    Mock relational đang qua kiểm tra liên kết
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    {mockIntegrity.checkedTables} nhóm dữ liệu ·{" "}
                    {mockIntegrity.checkedReadModels} read model · đủ{" "}
                    {mockIntegrity.roleCoverage.length} role ·{" "}
                    {mockIntegrity.counts.pledges} pledge mẫu. Snapshot
                    13/09/2026 10:30.
                  </p>
                </div>
              </div>
              <a
                href="/api/v1/health/data-integrity"
                target="_blank"
                rel="noreferrer"
                className="button-secondary shrink-0"
              >
                <ExternalLink className="size-4" /> Xem kết quả JSON
              </a>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {controlDocuments.map((document) => (
                <a
                  key={document.href}
                  href={document.href}
                  download
                  className="group flex min-h-32 flex-col rounded-[22px] border border-line bg-white p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-forest/35"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-[#fff4d8] text-[#7a6520]">
                    <ClipboardCheck className="size-4" />
                  </span>
                  <strong className="mt-4 text-sm text-ink group-hover:text-forest">
                    {document.title}
                  </strong>
                  <span className="mt-1 text-xs leading-5 text-ink-muted">
                    {document.detail}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow text-coral">
                <Users className="size-4" /> Sơ đồ Use Case
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.045em]">
                Một bản tổng quan, từng vai trò có bản riêng
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                Ảnh tổng quan phục vụ thuyết trình; các ảnh chi tiết giữ đủ mã
                và quan hệ include/extend mà không để đường nối chồng kín nội
                dung.
              </p>
            </div>
            <a
              href="/diagrams/gop-use-cases.drawio"
              download
              className="button-secondary shrink-0"
            >
              <ArrowDownToLine className="size-4" /> Tải bản nguồn
            </a>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {useCaseDiagrams.map((diagram) => (
              <article
                key={diagram.src}
                className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
                  <div>
                    <span className="rounded-full bg-[#f2f6e8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#566c27]">
                      {diagram.count}
                    </span>
                    <h3 className="mt-3 font-display text-xl font-extrabold">
                      {diagram.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-ink-muted">
                      {diagram.description}
                    </p>
                  </div>
                  <Users className="mt-1 size-5 shrink-0 text-coral" />
                </div>
                <a
                  href={diagram.src}
                  target="_blank"
                  rel="noreferrer"
                  className="group block bg-[#f5f4ee] p-3"
                  aria-label={`Mở ảnh đầy đủ: ${diagram.title}`}
                >
                  <div className="relative h-[430px] overflow-hidden rounded-2xl border border-line bg-white sm:h-[520px]">
                    <Image
                      src={diagram.src}
                      alt={`Use Case Diagram ${diagram.title}`}
                      width={diagram.width}
                      height={diagram.height}
                      loading="eager"
                      unoptimized
                      className="h-full w-full object-contain object-top transition-transform duration-500 group-hover:scale-[1.015]"
                    />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-forest/92 px-3 py-2 text-[10px] font-bold text-white shadow-lg backdrop-blur">
                      <ExternalLink className="size-3.5" /> Mở PNG đầy đủ
                    </span>
                  </div>
                </a>
                <div className="flex flex-wrap gap-2 p-4 sm:px-6">
                  <a
                    href={diagram.drawio}
                    download
                    className="button-ghost min-h-9 px-3 text-xs"
                  >
                    <FilePenLine className="size-3.5" /> Tải Draw.io riêng
                  </a>
                  <a
                    href={diagram.src}
                    download
                    className="button-secondary min-h-9 px-3 text-xs"
                  >
                    <ArrowDownToLine className="size-3.5" /> Tải PNG
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section bg-[#e8eadf]">
        <div className="container-shell">
          <p className="eyebrow text-coral">
            <Database className="size-4" /> PostgreSQL schema
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.045em]">
            ERD được chia theo nhóm nghiệp vụ để dễ theo dõi.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-soft">
            Cộng tác viên chỉ có quyền trong từng chiến dịch; giao dịch giữ lại
            số tiền tại thời điểm cam kết; dự báo gắn với phiên bản mô hình; các
            quyết định xử lý rủi ro đều có nhật ký.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {erdDiagrams.map((diagram) => (
              <div
                key={diagram.src}
                className="flex overflow-hidden rounded-full border border-line bg-white"
              >
                <a
                  href={diagram.src}
                  download
                  className="inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-bold text-ink-soft hover:text-coral-dark"
                >
                  <ArrowDownToLine className="size-3.5" /> {diagram.label} PNG
                </a>
                <a
                  href={diagram.drawio}
                  download
                  className="inline-flex min-h-9 items-center gap-1.5 border-l border-line px-3 text-xs font-bold text-ink-soft hover:text-coral-dark"
                >
                  <FilePenLine className="size-3.5" /> Draw.io
                </a>
              </div>
            ))}
            <a
              href="/diagrams/erd/database-schema.sql"
              download
              className="button-dark min-h-9 px-3 text-xs"
            >
              <Database className="size-3.5" /> Tải Database Schema SQL
            </a>
          </div>
          <div className="mt-7 overflow-auto rounded-[26px] border border-line bg-white p-3 shadow-[var(--shadow-card)]">
            <Image
              src="/diagrams/erd-overview.png"
              alt="Entity Relationship Diagram tổng quan"
              width={1428}
              height={1832}
              loading="eager"
              unoptimized
              className="h-auto min-w-[900px] w-full rounded-2xl"
            />
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container-shell grid gap-5 lg:grid-cols-3">
          {[
            {
              icon: BookOpenCheck,
              title: "Nguồn yêu cầu",
              text: "Bản Word cập nhật được ưu tiên; Markdown dùng để đối chiếu và truy vết lịch sử yêu cầu.",
            },
            {
              icon: BrainCircuit,
              title: "Phạm vi AI",
              text: "Ba module chính đều có hướng dữ liệu, baseline và metric riêng. Phần hỗ trợ viết nội dung chỉ để ở hướng mở rộng.",
            },
            {
              icon: ShieldCheck,
              title: "Giới hạn an toàn",
              text: "Không tiền thật, không tự khóa vì AI, không hiển thị IP hoặc dấu vân tay thiết bị thô trên UI.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[24px] border border-line bg-white p-6"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-forest text-lime">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-extrabold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
