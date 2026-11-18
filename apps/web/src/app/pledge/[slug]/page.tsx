import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PledgeFlow, ExistingPledgeData } from "@/components/pledge/pledge-flow";
import { api } from "@/lib/api";
import { getServerSession } from "@/lib/auth/server-session";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";

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
  searchParams: Promise<{ reward?: string; mode?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const campaign = await api.getCampaignBySlug(slug);
  if (!campaign) notFound();
  if (campaign.status !== "LIVE") redirect(`/projects/${campaign.slug}`);

  const session = await getServerSession();
  let existingPledge: ExistingPledgeData | null = null;

  if (session?.user?.id) {
    try {
      const myPledgesRes = await fetchBackendWithAuth(
        `/pledges/me?campaignId=${campaign.id}`,
        { method: "GET" },
        session,
      );
      if (myPledgesRes.response.ok) {
        const json = await myPledgesRes.response.json();
        const pledges = Array.isArray(json) ? json : json?.data || [];
        if (pledges.length > 0) {
          const p = pledges[0];
          existingPledge = {
            id: p.id,
            rewardTierId: p.rewardTierId || p.rewardTier?.id || null,
            shippingOptionId: p.shippingOptionId || p.shippingOption?.id || null,
            shippingAddressId: p.shippingAddressId || p.shippingAddress?.id || null,
            bonusAmount: Number(p.bonusAmount) || 0,
            totalAmount: Number(p.totalAmount) || 0,
            addOns: Array.isArray(p.addOns)
              ? p.addOns.map((a: any) => ({
                  addOnId: a.addOnId || a.addOn?.id,
                  quantity: a.quantity || 1,
                }))
              : [],
          };
        }
      }
    } catch (err) {
      console.warn("Could not fetch existing pledge for backer:", err);
    }
  }

  const isUpdate = Boolean(query.mode === "update" || existingPledge);

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
          <p className="eyebrow text-coral">
            {isUpdate ? "Cập nhật cam kết" : "Cam kết ủng hộ"}
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">
            {isUpdate
              ? `Cập nhật gói đồng hành cùng ${campaign.visual.label}`
              : `Bạn đang đồng hành cùng ${campaign.visual.label}`}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            {isUpdate
              ? "Điều chỉnh gói quà, phần bổ sung hoặc địa chỉ nhận hàng và xác nhận cập nhật."
              : "Hoàn thành bốn bước và kiểm tra toàn bộ chi phí trước khi xác nhận."}
          </p>
        </div>
        <PledgeFlow
          campaign={campaign}
          initialRewardId={query.reward}
          existingPledge={existingPledge}
          isUpdate={isUpdate}
        />
      </div>
    </section>
  );
}
