import type { Metadata } from "next";
import {
  BrainCircuit,
  Eye,
  FolderKanban,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { CreatorAiDashboard } from "@/components/creator/creator-ai-dashboard";
import { api } from "@/lib/api";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "AI Insights & What-if",
  description:
    "Phân tích xác suất thành công, giải thích yếu tố SHAP và mô phỏng What-if trước khi mở gọi vốn.",
};

export default async function CreatorAiPage() {
  const [session, platform] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  if (
    !session ||
    !resolveCampaignAccess("cmp_orbit", session, platform).canViewAi
  ) {
    return (
      <CampaignAccessNotice message="Chỉ chủ dự án và cộng tác viên được cấp quyền xem AI Insights mới mở được trang này." />
    );
  }
  const data = await api.getCreatorAiDashboard();
  const isMock = data.model.status === "MOCK";
  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-slate-200 bg-white py-8 sm:py-10">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                <BrainCircuit className="size-4" /> ✦ AI Insights &amp; Đánh giá chiến dịch
              </span>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em] text-ink sm:text-4xl">
                {isMock ? "Mô phỏng dự báo ORBIT One" : "Dự báo tiến độ ORBIT One"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                Phân tích xác suất đạt mục tiêu bằng Gradient Boosting (LightGBM), giải thích đóng góp đặc trưng SHAP và mô phỏng độ nhạy What-if theo thời gian thực.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/projects/${data.campaign.slug}`}
                className="button-secondary min-h-11 px-4 text-xs"
              >
                <Eye className="size-4" /> Xem trang dự án
              </Link>
              <Link
                href="/creator/campaigns/orbit-one-ca-phe-thong-minh/manage"
                className="button-secondary min-h-11 px-4 text-xs"
              >
                <FolderKanban className="size-4" /> Vận hành
              </Link>
              <Link
                href="/creator/campaigns/new"
                className="button-primary min-h-11 px-4 text-xs"
              >
                <Plus className="size-4" /> Tạo bản nháp
              </Link>
            </div>
          </div>
          <div className="mt-6 flex max-w-xl items-center justify-between rounded-xl border border-[#DDD6FE] bg-[#F5F3FF]/60 px-4 py-3">
            <div>
              <p className="text-[11px] font-bold text-[#7C3AED]">Chiến dịch đang phân tích</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{data.campaign.title}</p>
              <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
                Dữ liệu đầu vào cập nhật {formatDate(data.model.inputSnapshotAt, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" })}
              </p>
            </div>
          </div>
        </div>
      </div>
      <CreatorAiDashboard data={data} />
    </section>
  );
}
