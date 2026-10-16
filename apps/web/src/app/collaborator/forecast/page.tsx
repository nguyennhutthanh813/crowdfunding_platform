import type { Metadata } from "next";
import {
  ArrowLeft,
  BrainCircuit,
  ChevronDown,
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

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-[#c8d9ec] bg-[#e8f0f8] py-8 sm:py-10">
        <div className="container-shell">
          <Link
            href="/collaborator"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#315b86] hover:text-blue-700"
          >
            <ArrowLeft className="size-4" /> Trở về không gian cộng tác
          </Link>
          <div className="mt-7 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="eyebrow text-[#2869ac]">
                <BrainCircuit className="size-4" /> Dự báo được chia sẻ
              </span>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                Dữ liệu đang nói gì về ORBIT One?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                Dữ liệu mẫu để nhóm thử cách đọc dự báo. Chưa có mô hình AI được
                huấn luyện và các con số không phải kết quả kiểm thử.
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
          <div className="mt-7 flex max-w-xl items-center justify-between rounded-[12px] border border-[#c8d9ec] bg-white px-4 py-3">
            <div>
              <p className="text-[10px] font-bold text-ink-muted">
                Đang phân tích
              </p>
              <p className="mt-1 text-sm font-bold">{data.campaign.title}</p>
            </div>
            <ChevronDown className="size-4 text-ink-muted" />
          </div>
        </div>
      </div>
      <CreatorAiDashboard data={data} variant="collaborator" />
    </section>
  );
}
