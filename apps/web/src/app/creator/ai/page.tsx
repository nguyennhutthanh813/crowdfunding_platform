import type { Metadata } from "next";
import {
  BrainCircuit,
  Eye,
  FileText,
  FolderKanban,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { CampaignContentAssistant } from "@/components/creator/campaign-content-assistant";
import { CreatorAiDashboard } from "@/components/creator/creator-ai-dashboard";
import { api } from "@/lib/api";
import { CampaignAccessNotice } from "@/components/auth/campaign-access-notice";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dự báo chiến dịch",
  description:
    "Dự báo khả năng đạt mục tiêu, yếu tố ảnh hưởng và mức quan tâm trước khi mở gọi vốn.",
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
      <CampaignAccessNotice message="Dự báo mẫu hiện thuộc ORBIT One. Chỉ chủ dự án và thành viên được cấp quyền xem mới mở được." />
    );
  }
  const [data, assistant] = await Promise.all([
    api.getCreatorAiDashboard(),
    api.getCreatorAssistantData(),
  ]);
  const isMock = data.model.status === "MOCK";
  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8 sm:py-10">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="eyebrow text-[#526827]">
                <BrainCircuit className="size-4" /> Dữ liệu chiến dịch
              </span>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                {isMock ? "Mô phỏng dự báo ORBIT One" : "Dự báo tiến độ ORBIT One"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                {isMock
                  ? "Đây là kịch bản minh họa cho ORBIT One. Nhóm chưa chạy mô hình dự báo hoặc đánh giá xác suất trên dữ liệu kiểm thử."
                  : "Dự báo giúp nhóm xem các yếu tố ảnh hưởng tới mục tiêu gọi vốn. Cần đối chiếu kết quả với dữ liệu và đánh giá của mô hình."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="#content-assistant"
                className="button-dark min-h-11 px-4 text-xs"
              >
                <FileText className="size-4" /> Rà lại bản nháp
              </Link>
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
          <div className="mt-7 flex max-w-xl items-center justify-between rounded-[12px] border border-line bg-white px-4 py-3">
            <div>
              <p className="text-[11px] font-bold text-ink-muted">Kịch bản đang xem</p>
              <p className="mt-1 text-sm font-bold">{data.campaign.title}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {isMock ? "Dữ liệu mẫu" : "Dữ liệu đầu vào"} chốt ngày {formatDate(data.model.inputSnapshotAt, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" })}
              </p>
            </div>
          </div>
        </div>
      </div>
      <CreatorAiDashboard data={data} />
      <CampaignContentAssistant data={assistant.content} />
    </section>
  );
}
