import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PledgeFlow } from "@/components/pledge/pledge-flow";
import { api } from "@/lib/api";

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
  const campaign = await api.getCampaignBySlug(slug);
  if (!campaign) notFound();
  if (campaign.status !== "LIVE") redirect(`/projects/${campaign.slug}`);
  return (
    <section className="min-h-[calc(100vh-68px)] bg-[var(--canvas)] py-8 sm:py-12">
      <div className="container-shell">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href={`/projects/${campaign.slug}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-soft hover:text-coral-dark"
          >
            <ArrowLeft className="size-4" /> Trở lại dự án
          </Link>
          <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="size-3.5" /> Kết nối được mã hóa
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Sandbox · không thu tiền thật
            </span>
          </div>
        </div>
        <div className="mt-7">
          <p className="eyebrow text-coral">Cam kết ủng hộ</p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">
            Bạn đang đồng hành cùng {campaign.visual.label}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            Hoàn thành bốn bước và kiểm tra toàn bộ chi phí trước khi xác nhận.
          </p>
        </div>
        <PledgeFlow campaign={campaign} initialRewardId={query.reward} />
      </div>
    </section>
  );
}
