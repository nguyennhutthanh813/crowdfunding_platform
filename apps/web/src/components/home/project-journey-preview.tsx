"use client";

import {
  ArrowRight,
  CheckCheck,
  FilePenLine,
  GitBranch,
  HandHeart,
  Layers,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Modal } from "@/components/ui/modal";
import { useQuickRoleSwitch } from "@/components/workspace/quick-role-switcher";
import {
  RoleStage3DScene,
  type StageStepItem,
} from "@/components/visuals/role-stage-3d-scene";

type PhaseRoleTask = {
  role: string;
  accountName: string;
  email: string;
  badgeClass: string;
  task: string;
  actionLabel: string;
  targetHref: string;
};

type JourneyPhase = {
  id: string;
  code: string;
  icon: typeof FilePenLine;
  name: string;
  stationLabel: string;
  metric: string;
  detail: string;
  recordFlow: string;
  imageSrc: string;
  imageAlt: string;
  primaryEmail: string;
  href: string;
  ctaLabel: string;
  roleTasks: PhaseRoleTask[];
};

const phases: JourneyPhase[] = [
  {
    id: "phase-01",
    code: "01",
    icon: FilePenLine,
    name: "Chuẩn bị & Khởi tạo",
    stationLabel: "Trạm 01 · Phác thảo nguyên mẫu & định mức gói quà",
    metric: "Có gói quà và nhóm làm việc",
    detail:
      "Chủ dự án thiết lập câu chuyện, bảng rủi ro, hạn mức từng gói quà tri ân và phân quyền cộng tác viên kỹ thuật.",
    recordFlow: "Khởi tạo hồ sơ → Định mức gói quà → Phân quyền cộng tác viên",
    imageSrc: "/images/editorial/nhom-lam-san-pham-v4.webp",
    imageAlt: "Nhóm dự án chuẩn bị nguyên mẫu và bảng thông số",
    primaryEmail: "linh@orbit.vn",
    href: "/creator/campaigns/new",
    ctaLabel: "Vào trình khởi tạo chiến dịch",
    roleTasks: [
      {
        role: "Chủ dự án",
        accountName: "Nguyễn Hoàng Linh",
        email: "linh@orbit.vn",
        badgeClass: "bg-amber-100 text-amber-950 border-amber-300",
        task: "Soạn câu chuyện, rủi ro, hạn mức từng gói quà và mời cộng tác viên theo email.",
        actionLabel: "Mở trình tạo dự án",
        targetHref: "/creator/campaigns/new",
      },
      {
        role: "Cộng tác viên",
        accountName: "Lê Gia Huy",
        email: "giahuy@orbit.vn",
        badgeClass: "bg-sky-100 text-sky-950 border-sky-300",
        task: "Nhận phân quyền vào hồ sơ dự án và chuẩn bị tư liệu kỹ thuật cho giai đoạn mở bán.",
        actionLabel: "Vào bàn làm việc CTV",
        targetHref: "/collaborator",
      },
      {
        role: "Quản trị viên",
        accountName: "Trần Khánh An",
        email: "quantri@gop.vn",
        badgeClass: "bg-purple-100 text-purple-950 border-purple-300",
        task: "Theo dõi hàng đợi hồ sơ chuẩn bị gửi thẩm định minh bạch.",
        actionLabel: "Xem bàn kiểm duyệt",
        targetHref: "/admin?tab=reviews",
      },
      {
        role: "Người ủng hộ",
        accountName: "Phạm Minh Anh",
        email: "minhanh@example.com",
        badgeClass: "bg-emerald-100 text-emerald-950 border-emerald-300",
        task: "Khám phá các chiến dịch sắp ra mắt và đăng ký nhận thông báo mở bán sớm.",
        actionLabel: "Khám phá dự án",
        targetHref: "/discover",
      },
    ],
  },
  {
    id: "phase-02",
    code: "02",
    icon: CheckCheck,
    name: "Thẩm định & Xét duyệt",
    stationLabel: "Trạm 02 · Xem hồ sơ và quyết định duyệt",
    metric: "Có phản hồi duyệt",
    detail:
      "Quản trị viên đối chiếu bằng chứng nguyên mẫu, kế hoạch ngân sách và phê duyệt đưa dự án lên trạng thái nhận quan tâm sớm.",
    recordFlow: "Chủ dự án gửi hồ sơ → Quản trị viên phản hồi → Công bố trang sắp mở",
    imageSrc: "/images/editorial/buoi-gioi-thieu-san-pham-v1.webp",
    imageAlt: "Đối chiếu nguyên mẫu và kiểm tra thông tin minh bạch",
    primaryEmail: "quantri@gop.vn",
    href: "/admin?tab=reviews",
    ctaLabel: "Vào bàn xét duyệt hồ sơ",
    roleTasks: [
      {
        role: "Quản trị viên",
        accountName: "Trần Khánh An",
        email: "quantri@gop.vn",
        badgeClass: "bg-purple-100 text-purple-950 border-purple-300",
        task: "Kiểm tra nguyên mẫu, bảng rủi ro, gói quà và ghi quyết định duyệt hoặc yêu cầu bổ sung.",
        actionLabel: "Duyệt hồ sơ ngay",
        targetHref: "/admin?tab=reviews",
      },
      {
        role: "Chủ dự án",
        accountName: "Nguyễn Hoàng Linh",
        email: "linh@orbit.vn",
        badgeClass: "bg-amber-100 text-amber-950 border-amber-300",
        task: "Theo dõi phản hồi thẩm định và chuẩn bị lịch kích hoạt gọi vốn chính thức.",
        actionLabel: "Xem trung tâm dự án",
        targetHref: "/creator",
      },
      {
        role: "Người ủng hộ",
        accountName: "Phạm Minh Anh",
        email: "minhanh@example.com",
        badgeClass: "bg-emerald-100 text-emerald-950 border-emerald-300",
        task: "Xem trang giới thiệu sớm, bật nhắc lịch và gửi câu hỏi đầu tiên.",
        actionLabel: "Xem dự án sắp mở",
        targetHref: "/projects/pulse-vong-tay-an-toan",
      },
      {
        role: "Cộng tác viên",
        accountName: "Lê Gia Huy",
        email: "giahuy@orbit.vn",
        badgeClass: "bg-sky-100 text-sky-950 border-sky-300",
        task: "Tổng hợp câu hỏi kỹ thuật sớm từ cộng đồng để chuẩn bị bộ FAQ.",
        actionLabel: "Xem dự báo & việc",
        targetHref: "/collaborator/forecast",
      },
    ],
  },
  {
    id: "phase-03",
    code: "03",
    icon: HandHeart,
    name: "Gọi vốn All-or-Nothing",
    stationLabel: "Trạm 03 · Cộng đồng cam kết & tương tác trực tiếp",
    metric: "Cam kết mẫu",
    detail:
      "Người ủng hộ chọn gói quà và ghi cam kết mẫu; đội dự án đăng cập nhật, trả lời câu hỏi. Bản local không thu tiền thật.",
    recordFlow: "Chọn gói quà → Ghi cam kết → Theo dõi cập nhật và hỏi đáp",
    imageSrc: "/images/editorial/cong-dong-xuong-san-pham-v3.webp",
    imageAlt: "Cộng đồng theo dõi tiến độ và trao đổi cùng đội làm sản phẩm",
    primaryEmail: "minhanh@example.com",
    href: "/projects/orbit-one-ca-phe-thong-minh",
    ctaLabel: "Trải nghiệm trang gọi vốn",
    roleTasks: [
      {
        role: "Người ủng hộ",
        accountName: "Phạm Minh Anh",
        email: "minhanh@example.com",
        badgeClass: "bg-emerald-100 text-emerald-950 border-emerald-300",
        task: "Chọn gói quà, nhập địa chỉ nhận hàng và đặt câu hỏi trực tiếp trên trang chiến dịch.",
        actionLabel: "Ủng hộ chiến dịch",
        targetHref: "/pledge/orbit-one-ca-phe-thong-minh",
      },
      {
        role: "Chủ dự án",
        accountName: "Nguyễn Hoàng Linh",
        email: "linh@orbit.vn",
        badgeClass: "bg-amber-100 text-amber-950 border-amber-300",
        task: "Theo dõi tốc độ gọi vốn, trả lời hộp thư và đăng bản tin tiến độ chế tạo.",
        actionLabel: "Vận hành chiến dịch",
        targetHref: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage",
      },
      {
        role: "Cộng tác viên",
        accountName: "Lê Gia Huy",
        email: "giahuy@orbit.vn",
        badgeClass: "bg-sky-100 text-sky-950 border-sky-300",
        task: "Xử lý các đầu việc trong ca trực, đăng cập nhật và trả lời bình luận kỹ thuật.",
        actionLabel: "Xử lý bình luận & tin",
        targetHref: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
      },
      {
        role: "Quản trị viên",
        accountName: "Trần Khánh An",
        email: "quantri@gop.vn",
        badgeClass: "bg-purple-100 text-purple-950 border-purple-300",
        task: "Giám sát tín hiệu rủi ro và bảo vệ quyền lợi cộng đồng trong suốt kỳ gọi vốn.",
        actionLabel: "Giám sát chiến dịch",
        targetHref: "/admin?tab=fraud",
      },
    ],
  },
  {
    id: "phase-04",
    code: "04",
    icon: PackageCheck,
    name: "Sản xuất & Giao quà",
    stationLabel: "Trạm 04 · Quyết toán vốn, chế tạo lô đầu & vận chuyển",
    metric: "Đối soát từng đơn",
    detail:
      "Nếu chiến dịch đạt mục tiêu, nhóm dự án mới đi tiếp sang chuẩn bị quà và giao nhận. Trạng thái thanh toán ở bản local chỉ là dữ liệu mô phỏng.",
    recordFlow: "Chốt kết quả → Chuẩn bị quà → Cập nhật giao nhận",
    imageSrc: "/images/editorial/dong-goi-qua-minh-hoa-v1.webp",
    imageAlt: "Đóng gói sản phẩm và đối chiếu danh sách người nhận",
    primaryEmail: "linh@orbit.vn",
    href: "/creator/campaigns/orbit-drip-bo-pha-cham-2025/manage?tab=fulfillment",
    ctaLabel: "Mở bảng điều phối giao quà",
    roleTasks: [
      {
        role: "Chủ dự án",
        accountName: "Nguyễn Hoàng Linh",
        email: "linh@orbit.vn",
        badgeClass: "bg-amber-100 text-amber-950 border-amber-300",
        task: "Xác nhận địa chỉ người nhận, chia lô sản xuất và cập nhật trạng thái giao quà từng đơn.",
        actionLabel: "Điều phối giao quà",
        targetHref: "/creator/campaigns/orbit-drip-bo-pha-cham-2025/manage?tab=fulfillment",
      },
      {
        role: "Người ủng hộ",
        accountName: "Phạm Minh Anh",
        email: "minhanh@example.com",
        badgeClass: "bg-emerald-100 text-emerald-950 border-emerald-300",
        task: "Kiểm tra cam kết đã ghi, cập nhật địa chỉ nhận quà và theo dõi tiến độ giao nhận.",
        actionLabel: "Mở sổ ủng hộ cá nhân",
        targetHref: "/dashboard",
      },
      {
        role: "Cộng tác viên",
        accountName: "Lê Gia Huy",
        email: "giahuy@orbit.vn",
        badgeClass: "bg-sky-100 text-sky-950 border-sky-300",
        task: "Phối hợp thông báo lịch xuất xưởng và giải đáp thắc mắc hậu mãi cho người nhận.",
        actionLabel: "Mở bảng việc CTV",
        targetHref: "/collaborator",
      },
      {
        role: "Quản trị viên",
        accountName: "Trần Khánh An",
        email: "quantri@gop.vn",
        badgeClass: "bg-purple-100 text-purple-950 border-purple-300",
        task: "Đối chiếu nhật ký chiến dịch và kiểm tra các trạng thái cam kết mẫu khi chốt kết quả.",
        actionLabel: "Kiểm tra nhật ký",
        targetHref: "/admin?tab=settings",
      },
    ],
  },
];

const stageSteps: StageStepItem[] = phases.map((phase) => ({
  id: phase.id,
  code: `TRẠM ${phase.code}`,
  title: phase.name,
  subtitle: phase.recordFlow,
  detail: phase.detail,
  metric: phase.metric,
}));

const phase3dImages: Record<string, { src: string; alt: string }> = {
  "phase-01": {
    src: "/images/3d/ecosystem-launchpad-3d.jpg",
    alt: "Mô hình 3D khởi tạo chiến dịch FundViet",
  },
  "phase-02": {
    src: "/images/3d/fraud-shield-radar-3d.jpg",
    alt: "Mô hình 3D radar thẩm định và chống gian lận AI",
  },
  "phase-03": {
    src: "/images/3d/ai-optimizer-core-3d.jpg",
    alt: "Mô hình 3D lõi AI tối ưu hóa gọi vốn",
  },
  "phase-04": {
    src: "/images/3d/fulfillment-pipeline-3d.jpg",
    alt: "Mô hình 3D két sắt ủy quyền và dây chuyền giao quà 4 chặng",
  },
};

export function ProjectJourneyPreview({
  campaignId,
  localDbAvailable,
}: {
  campaignId: string;
  localDbAvailable: boolean;
}) {
  const { session } = useAuth();
  const { switchToRole, busyRole } = useQuickRoleSwitch();
  const user = session?.user;
  const [activeStepId, setActiveStepId] = useState<string>(phases[0].id);
  const [modalPhaseId, setModalPhaseId] = useState<string | null>(null);

  const activePhase =
    phases.find((phase) => phase.id === activeStepId) ?? phases[0];
  const primaryRole =
    activePhase.id === "phase-01"
      ? "CREATOR"
      : activePhase.id === "phase-02"
        ? "ADMIN"
        : activePhase.id === "phase-03"
          ? "BACKER"
          : "COLLABORATOR";
  const modalPhase =
    modalPhaseId !== null
      ? (phases.find((phase) => phase.id === modalPhaseId) ?? null)
      : null;

  function canOpen(targetHref: string) {
    if (targetHref.startsWith("/admin")) return Boolean(user?.roles.includes("ADMIN"));
    if (targetHref.startsWith("/collaborator")) return Boolean(user?.roles.includes("COLLABORATOR"));
    if (targetHref.startsWith("/creator")) return Boolean(user?.roles.includes("CREATOR") || user?.roles.includes("BACKER"));
    if (targetHref.startsWith("/dashboard") || targetHref.startsWith("/pledge")) return Boolean(user?.roles.includes("BACKER"));
    return true;
  }

  function actionHref(targetHref: string) {
    return canOpen(targetHref)
      ? targetHref
      : `/auth?next=${encodeURIComponent(targetHref)}`;
  }

  return (
    <section
      id="hanh-trinh-chien-dich"
      className="scroll-mt-24 border-y border-line bg-canvas-soft py-12 sm:py-16"
      aria-labelledby="journey-heading"
    >
      <div className="container-shell">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-surface px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-[#047857] shadow-xs">
              <Sparkles className="size-3.5 text-[#7C3AED]" />
              Cách một chiến dịch đi qua 4 chặng
            </div>
            <h2
              id="journey-heading"
              className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-[-0.045em] text-ink sm:text-4xl"
            >
              Từ ý tưởng nguyên mẫu đến giao quà tận tay
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              Chọn 1 trong 4 trạm vận hành bên cạnh hoặc bật Tự động dẫn đường trên mô hình 3D để xem đúng vai trò phụ trách.
            </p>
          </div>

          <div
            className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-2xs"
            role="tablist"
            aria-label="Chọn 4 chặng chiến dịch"
          >
            {phases.map((phase) => {
              const selected = phase.id === activePhase.id;
              return (
                <button
                  key={phase.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveStepId(phase.id)}
                  className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                    selected
                      ? "bg-[#047857] text-white shadow-xs"
                      : "text-ink-soft hover:bg-canvas-soft hover:text-ink"
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-80">{phase.code}</span>
                  <span>{phase.name.split("&")[0]?.trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-line bg-slate-900">
              <Image
                src={
                  (phase3dImages[activePhase.id] ?? phase3dImages["phase-01"])
                    .src
                }
                alt={
                  (phase3dImages[activePhase.id] ?? phase3dImages["phase-01"])
                    .alt
                }
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover transition-transform duration-500"
              />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-slate-950/75 px-3 py-1 font-mono text-[11px] font-bold text-emerald-300 backdrop-blur-md">
                CHẶNG {activePhase.code}/04 · {activePhase.metric}
              </span>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#047857]">
                  <Layers className="size-3.5 text-[#059669]" />
                  {activePhase.stationLabel}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] font-semibold text-ink-muted">
                {activePhase.recordFlow}
              </p>

              <details className="group/tasks mt-4 rounded-xl border border-line bg-canvas-soft/60 p-3">
                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-ink [&::-webkit-details-marker]:hidden">
                  <span>Ai làm gì ở chặng {activePhase.code}? (4 vai trò)</span>
                  <span className="text-[11px] font-semibold text-[#047857] group-open/tasks:hidden">
                    Mở chi tiết ↓
                  </span>
                  <span className="hidden text-[11px] font-semibold text-[#047857] group-open/tasks:inline">
                    Thu gọn ↑
                  </span>
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activePhase.roleTasks.map((rt) => (
                    <div
                      key={rt.role}
                      className="flex flex-col justify-between rounded-xl border border-line bg-surface p-2.5 transition hover:border-[#059669]/45"
                    >
                      <div>
                        <span
                          className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${rt.badgeClass}`}
                        >
                          {rt.role}
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-ink-soft">
                          {rt.task}
                        </p>
                      </div>
                      <Link
                        href={actionHref(rt.targetHref)}
                        className="mt-2 inline-flex min-h-9 items-center justify-between rounded-lg bg-[#047857] px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#065F46]"
                      >
                        <span>{canOpen(rt.targetHref) ? rt.actionLabel : "Đăng nhập để mở"}</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </details>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5">
                <button
                  type="button"
                  disabled={Boolean(busyRole)}
                  onClick={(event) =>
                    void switchToRole(
                      primaryRole,
                      { x: event.clientX, y: event.clientY },
                      activePhase.href,
                    )
                  }
                  className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#047857] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#065F46] disabled:opacity-60"
                >
                  <Sparkles className="size-3.5" />
                  Vào vai trò chính chặng {activePhase.code}
                  <ArrowRight className="size-3.5" />
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalPhaseId(activePhase.id)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-canvas-soft px-3 text-xs font-bold text-ink hover:border-[#047857]/40"
                  >
                    <GitBranch className="size-3.5" /> Việc ở chặng {activePhase.code}
                  </button>
                  {localDbAvailable ? (
                    <Link
                      href={`/campaigns/${campaignId}/timeline`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-[#047857] hover:bg-[#ECFDF5]"
                    >
                      Cây tiến độ <ArrowRight className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div>
            <RoleStage3DScene
              eyebrow="SƠ ĐỒ 3D TỰ ĐỘNG · 4 CHẶNG"
              title="Mô hình vận hành 4 chặng FundViet"
              centerLabel={`CHẶNG ${activePhase.code}: ${activePhase.name.toUpperCase()}`}
              centerSubtext={activePhase.stationLabel}
              tone="forest"
              steps={stageSteps}
              activeStepId={activePhase.id}
              onSelectStep={(stepId) => setActiveStepId(stepId)}
              onInspectStep={(stepId) => setModalPhaseId(stepId)}
              autoPlayDefault
            />
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(modalPhase)}
        onClose={() => setModalPhaseId(null)}
        badge={
          modalPhase ? `Chặng ${modalPhase.code} · Quy trình chiến dịch` : "Chi tiết chặng"
        }
        title={
          modalPhase
            ? `${modalPhase.name} — ${modalPhase.stationLabel}`
            : "Chi tiết chặng"
        }
        description={modalPhase?.detail}
        footer={
          modalPhase ? (
            <>
              {localDbAvailable ? (
                <Link
                  href={`/campaigns/${campaignId}/timeline`}
                  onClick={() => setModalPhaseId(null)}
                  className="button-secondary"
                >
                  Mở cây tiến độ thật
                </Link>
              ) : null}
              <Link
                href={actionHref(modalPhase.href)}
                onClick={() => setModalPhaseId(null)}
                className="button-dark"
              >
                {canOpen(modalPhase.href) ? modalPhase.ctaLabel : "Đăng nhập để mở"} <ArrowRight className="size-4" />
              </Link>
            </>
          ) : undefined
        }
      >
        {modalPhase ? (
          <div className="space-y-4 text-sm leading-6 text-ink-soft">
            <div className="grid gap-4 rounded-2xl border border-[#d8e2d2] bg-[#f5f8f2] p-3.5 sm:grid-cols-[200px_1fr] sm:items-center">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[#d8e2d2] bg-white">
                <Image
                  src={modalPhase.imageSrc}
                  alt={modalPhase.imageAlt}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#315a3f]">
                  Luồng dữ liệu tại chặng {modalPhase.code}
                </p>
                <p className="mt-1 font-mono text-xs font-bold text-[#14532d]">
                  {modalPhase.recordFlow}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#4b6456]">
                  Mỗi tác vụ dẫn tới đúng khu vực. Nếu tài khoản chưa có quyền,
                  bạn sẽ được đưa tới trang đăng nhập.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink">
                Công việc của từng vai trò trong chặng {modalPhase.code}
              </p>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {modalPhase.roleTasks.map((item) => (
                  <div
                    key={item.role}
                    className="flex flex-col justify-between rounded-xl border border-line bg-white p-3.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${item.badgeClass}`}
                        >
                          {item.role}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-ink-soft">
                        {item.task}
                      </p>
                    </div>
                    <Link
                      href={actionHref(item.targetHref)}
                      onClick={() => setModalPhaseId(null)}
                      className="mt-3 inline-flex min-h-10 items-center justify-between rounded-lg bg-[#14532d] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#166534]"
                    >
                      <span>{canOpen(item.targetHref) ? item.actionLabel : "Đăng nhập để mở"}</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
