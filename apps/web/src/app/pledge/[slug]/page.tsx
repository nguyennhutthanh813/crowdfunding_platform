import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PledgeFlow } from "@/components/pledge/pledge-flow";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { applyCampaignDetailPreviewState } from "@/lib/preview-read-models";
import { publicPreviewCampaignDetail } from "@/lib/creator/public-preview-campaigns";
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";

export const metadata: Metadata = {
  title: "Ủng hộ dự án",
  description:
    "Chọn gói ủng hộ, phần bổ sung, địa chỉ giao hàng và xác nhận cam kết.",
};

export default async function PledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reward?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const platformState = await getServerPlatformPreviewState();
  const baseCampaign = isPreviewCampaignId(slug)
    ? publicPreviewCampaignDetail(slug, platformState)
    : await api.getCampaignBySlug(slug);
  if (!baseCampaign) notFound();
  const campaign = isPreviewCampaignId(slug)
    ? baseCampaign
    : applyCampaignDetailPreviewState(baseCampaign, platformState);
  if (campaign.status !== "LIVE") redirect(`/projects/${campaign.slug}`);
  return (
    <section className="min-h-[calc(100vh-68px)] bg-[var(--canvas)] py-5 sm:py-12">
      <div className="container-shell">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href={`/projects/${campaign.slug}`}
            className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-xs font-bold text-ink-soft transition hover:bg-white/70 hover:text-coral-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <ArrowLeft className="size-4" /> Trở lại dự án
          </Link>
          <div className="hidden flex-wrap gap-3 text-[11px] text-ink-muted sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Bản demo · không nhập thẻ, không thu tiền
            </span>
          </div>
        </div>
        <div className="mt-7">
          <p className="eyebrow text-coral">Cam kết ủng hộ</p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">
            Bạn đang đồng hành cùng {campaign.visual.label}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            Chọn gói, kiểm tra chi phí rồi xác nhận. Nếu nhận quà vật lý, bạn sẽ thêm địa chỉ giao hàng.
          </p>
        </div>
        <PledgeFlow campaign={campaign} initialRewardId={query.reward} />
      </div>
    </section>
  );
}
