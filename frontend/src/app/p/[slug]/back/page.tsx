import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getProjectCheckout, getProjectDetail, getVnpayBanks } from "@/server/queries/public";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/layout-bits";
import { PledgeStepper } from "@/components/public/pledge-stepper";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getProjectDetail(slug);
  if (!detail) return { title: "Góp vốn" };
  return { title: `Góp vốn — ${detail.project.title}` };
}

export default async function BackProjectPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const tierParam = typeof sp.tier === "string" ? sp.tier.trim() : undefined;
  const changeParam = sp.change === "1" ? "?change=1" : "";
  const nextUrl = `/p/${slug}/back${tierParam ? `?tier=${encodeURIComponent(tierParam)}` : changeParam}`;

  const viewer = await requireViewer(nextUrl);
  const [data, vnpayBanks] = await Promise.all([getProjectCheckout(slug), getVnpayBanks()]);
  if (!data) notFound();

  const { project, blocker, tiers, addOns, cards, addresses, existing, existingAddOns } = data;
  if (blocker) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="card space-y-4 p-6 text-center sm:p-8">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="text-2xl font-black">Chưa thể góp vốn cho dự án này</h1>
          <p className="text-sm text-muted">{blocker}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <ButtonLink href={`/p/${project.slug}`}>
              <ArrowLeft className="size-4" /> Quay lại dự án
            </ButtonLink>
            <ButtonLink href="/explore" variant="outline">
              Khám phá dự án khác
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  let initialTierId: string | null = null;
  if (tierParam === "none") {
    initialTierId = null;
  } else if (tierParam) {
    const matched = tiers.find((t) => t.id === tierParam && t.remaining !== 0);
    initialTierId = matched ? matched.id : tiers.find((t) => t.remaining !== 0)?.id ?? null;
  } else if (existing) {
    initialTierId = existing.tier_id;
  } else {
    initialTierId = tiers.find((t) => t.remaining !== 0)?.id ?? null;
  }

  const initialAddOns: Record<string, number> = {};
  if (existing && initialTierId === existing.tier_id) {
    for (const r of existingAddOns) initialAddOns[r.add_on_id] = r.quantity;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-28 pt-8 sm:px-6 sm:pt-10 md:pb-10">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href={`/p/${project.slug}`} className="inline-flex items-center gap-1.5 font-semibold hover:text-fg">
          <ArrowLeft className="size-4" /> Quay lại {project.title}
        </Link>
      </div>

      <PageHeader
        eyebrow="ỦNG HỘ DỰ ÁN · ĐẠT MỤC TIÊU MỚI THU TIỀN"
        title={existing ? "Đổi mức góp vốn" : `Ủng hộ ${project.title}`}
        description="Chọn mức quà, quà kèm, địa chỉ nhận hàng tại Việt Nam và phương thức thanh toán. Chỉ thu tiền khi dự án đạt 100% mục tiêu."
      />

      <PledgeStepper
        project={{
          id: project.id,
          slug: project.slug,
          title: project.title,
          cover_url: project.cover_url,
          goal_amount: project.goal_amount,
          end_at: project.end_at,
        }}
        tiers={tiers}
        addOns={addOns}
        cards={cards}
        addresses={addresses}
        vnpayBanks={vnpayBanks}
        viewerName={viewer.displayName}
        initialTierId={initialTierId}
        initialBonus={existing ? existing.bonus_amount : 0}
        initialAddOns={initialAddOns}
        initialAddressId={existing?.address_id ?? addresses[0]?.id ?? null}
        initialCardId={existing?.payment_method_id ?? cards[0]?.id ?? null}
        initialAnonymous={Boolean(existing?.is_anonymous)}
        initialNote={existing?.note ?? ""}
        existingPledge={
          existing
            ? {
                code: existing.code,
                total_amount: existing.total_amount,
                tier_title: existing.tier_title,
              }
            : null
        }
      />
    </div>
  );
}
