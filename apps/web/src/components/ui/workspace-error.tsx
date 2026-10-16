"use client";

import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";

const variants = {
  backer: {
    label: "Người ủng hộ",
    title: "Chưa lấy được sổ cam kết của bạn.",
    copy: "Các khoản cam kết không bị thay đổi. Bạn có thể thử tải lại hoặc quay về trang khám phá.",
    home: "/discover",
    homeLabel: "Về trang khám phá",
    shell: "bg-[#fbf4e8]",
  },
  creator: {
    label: "Chủ dự án",
    title: "Chưa tổng hợp được dữ liệu chiến dịch.",
    copy: "Bản nháp và số liệu hiện có vẫn được giữ nguyên. Hãy thử lại trước khi thực hiện thao tác tiếp theo.",
    home: "/creator",
    homeLabel: "Về tổng quan Creator",
    shell: "bg-[#edf1e4]",
  },
  collaborator: {
    label: "Cộng tác viên",
    title: "Danh sách việc được giao chưa tải được.",
    copy: "Hệ thống chưa ghi nhận thay đổi nào. Bạn có thể thử lại hoặc quay về hàng công việc của mình.",
    home: "/collaborator",
    homeLabel: "Về danh sách công việc",
    shell: "bg-[#edf6fb]",
  },
  admin: {
    label: "Quản trị viên",
    title: "Ca vận hành chưa lấy đủ dữ liệu.",
    copy: "Không có quyết định duyệt hay xử lý cảnh báo nào được gửi trong lần tải lỗi này.",
    home: "/admin",
    homeLabel: "Về tổng quan Admin",
    shell: "bg-[#20232c] text-white",
  },
} as const;

export function WorkspaceError({
  role,
  reset,
}: {
  role: keyof typeof variants;
  reset: () => void;
}) {
  const config = variants[role];
  const dark = role === "admin";

  return (
    <section
      className={`grid min-h-[75vh] place-items-center px-4 py-14 ${config.shell}`}
    >
      <div
        className={`w-full max-w-xl rounded-[22px] border p-7 sm:p-10 ${
          dark
            ? "border-white/10 bg-white/6"
            : "border-line bg-white shadow-[var(--shadow-soft)]"
        }`}
      >
        <span
          className={`grid size-12 place-items-center rounded-xl ${dark ? "bg-red-400/12 text-red-300" : "bg-red-50 text-red-600"}`}
        >
          <AlertTriangle className="size-5" />
        </span>
        <p
          className={`mt-6 text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-lime" : "text-coral-dark"}`}
        >
          Không gian {config.label}
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
          {config.title}
        </h1>
        <p
          className={`mt-4 text-sm leading-7 ${dark ? "text-white/62" : "text-ink-soft"}`}
        >
          {config.copy}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="button-primary">
            <RotateCcw className="size-4" /> Thử tải lại
          </button>
          <Link
            href={config.home}
            className={dark ? "button-ghost border-white/12 text-white" : "button-secondary"}
          >
            <ArrowLeft className="size-4" /> {config.homeLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
