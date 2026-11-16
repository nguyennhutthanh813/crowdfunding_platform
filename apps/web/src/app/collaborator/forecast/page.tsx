import type { Metadata } from "next";
import {
  ArrowLeft,
  BrainCircuit,
  Eye,
  FolderKanban,
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
  title: "Dự báo ORBIT One",
  description:
    "Dự báo chiến dịch được chia sẻ cho cộng tác viên của ORBIT One.",
};

export default async function CollaboratorForecastPage() {
  const [session, platform] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  if (
    !session ||
    !resolveCampaignAccess("cmp_orbit", session, platform).canViewAi
  ) {
    return (
      <CampaignAccessNotice message="Bạn chưa được cấp quyền xem dự báo của ORBIT One, hoặc chủ dự án đã thu hồi quyền này." />
    );
  }
  const data = await api.getCreatorAiDashboard();
  const isMock = data.model.status === "MOCK";

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-slate-200 bg-white py-8 sm:py-10">
        <div className="container-shell">
          <Link
            href="/collaborator"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#047857] hover:underline"
          >
            <ArrowLeft className="size-4" /> Trở về không gian cộng tác
          </Link>
          <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                <BrainCircuit className="size-4" /> ✦ AI Insights được chia sẻ
              </span>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] text-ink sm:text-4xl">
                {isMock ? "Kịch bản dự báo ORBIT One" : "Dữ liệu đang nói gì về ORBIT One?"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                Phân tích xác suất đạt mục tiêu bằng Gradient Boosting (LightGBM), giải thích đóng góp đặc trưng SHAP và theo dõi các yếu tố cần phối hợp cùng chủ dự án.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage"
                className="button-secondary min-h-11 px-4 text-xs"
              >
                <FolderKanban className="size-4" /> Cập nhật chiến dịch
              </Link>
              <Link
                href={`/projects/${data.campaign.slug}`}
                className="button-primary min-h-11 px-4 text-xs"
              >
                <Eye className="size-4" /> Xem trang dự án
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
      <CreatorAiDashboard data={data} variant="collaborator" />
    </section>
  );
}
