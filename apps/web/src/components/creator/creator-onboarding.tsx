import {
  ArrowRight,
  BookOpenCheck,
  Plus,
  Rocket,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { CreatorPortfolioData } from "@/lib/api/contracts";
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreatorCampaignTree } from "@/components/creator/creator-campaign-tree";

const onboardingSteps = [
  {
    number: "01",
    title: "Kể rõ ý tưởng",
    detail: "Nêu vấn đề, giải pháp và điều nhóm muốn cùng cộng đồng thực hiện.",
    icon: BookOpenCheck,
  },
  {
    number: "02",
    title: "Lập kế hoạch gọi vốn",
    detail: "Chốt mục tiêu, thời gian, gói quà và dự kiến giao hàng thực tế.",
    icon: WalletCards,
  },
  {
    number: "03",
    title: "Gửi xét duyệt",
    detail:
      "Kiểm tra lại hồ sơ rồi gửi quản trị viên phản hồi trước khi mở chiến dịch.",
    icon: ShieldCheck,
  },
];

export function CreatorOnboarding({
  givenName,
  portfolio,
  localDbAvailable,
}: {
  givenName: string;
  portfolio: CreatorPortfolioData;
  localDbAvailable: boolean;
}) {
  const campaigns = portfolio.campaigns;
  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className={`border-b border-forest/10 bg-[#e5ece3] text-ink ${campaigns.length ? "py-7 sm:py-10" : "py-12 sm:py-16"}`}>
        <div className={campaigns.length ? "container-shell" : "container-shell grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center"}>
          <div>
            <span className="eyebrow text-forest">
              <Rocket className="size-4" /> Không gian Chủ dự án
            </span>
            <h1 className={`mt-3 max-w-3xl font-display font-extrabold tracking-[-0.055em] ${campaigns.length ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}>
              {campaigns.length
                ? `Chào ${givenName}, bạn có ${campaigns.length} chiến dịch.`
                : `Chào ${givenName}, vai trò Chủ dự án đã sẵn sàng.`}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
              {campaigns.length
                ? `Mỗi chiến dịch có hồ sơ, nhóm và tiến độ riêng. Dữ liệu đang lưu ${localDbAvailable ? "trong SQLite trên máy chạy web" : "trong trình duyệt đang dùng"}.`
                : "Bạn chưa có chiến dịch. Hãy bắt đầu bằng một hồ sơ ngắn; có thể lưu nháp trước khi gửi xét duyệt."}
            </p>
            {campaigns.length ? <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="#ban-do-chien-dich" className="button-dark min-h-11">Xem bản đồ chiến dịch <ArrowRight className="size-4" /></Link>
              <Link href="/creator/campaigns/new" className="button-secondary min-h-11">Tạo chiến dịch mới <Plus className="size-4" /></Link>
            </div> : null}
          </div>
          {!campaigns.length ? <div className="rounded-[16px] border border-forest/12 bg-white p-5">
            <p className="text-[11px] font-bold text-forest">
              Trạng thái tài khoản
            </p>
            <p className="mt-3 font-display text-xl font-extrabold">
              Chưa có chiến dịch của bạn
            </p>
            <p className="mt-2 text-xs leading-6 text-ink-muted">
              {localDbAvailable
                ? "Hồ sơ và thao tác mới được lưu vào SQLite trên máy chạy web."
                : "Hồ sơ dùng thử được lưu trong trình duyệt đang dùng."} Chưa nhận tiền thật.
            </p>
          </div> : null}
        </div>
      </div>

      <div className="container-shell py-10 sm:py-14">
        {campaigns.length ? <CreatorCampaignTree portfolio={portfolio} localDbAvailable={localDbAvailable} /> : null}
        {campaigns.length ? (
          <section className="mb-8" aria-labelledby="my-preview-campaigns">
            <h2 id="my-preview-campaigns" className="font-display text-2xl font-extrabold">Hồ sơ đang làm</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {campaigns.filter((item) => isPreviewCampaignId(item.id)).map((campaign) => (
                <div key={campaign.id} className="rounded-[18px] border border-line bg-white p-5">
                  <StatusBadge status={campaign.status} />
                  <h3 className="mt-3 text-base font-extrabold">{campaign.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-ink-soft">{campaign.nextActionDetail}</p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                    <Link href={`/creator/campaigns/new?draft=${campaign.id}`} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-forest hover:underline">{campaign.nextActionLabel} <ArrowRight className="size-4" /></Link>
                    {localDbAvailable ? <Link href={`/campaigns/${campaign.id}/timeline`} className="inline-flex min-h-11 items-center text-xs font-bold text-[#426450] hover:underline">Xem tiến độ và lịch sử</Link> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-[20px] border border-line bg-white p-6 sm:p-8">
            <p className="eyebrow text-coral">Lộ trình gợi ý</p>
            <h2 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              Ba việc để có một hồ sơ thuyết phục
            </h2>
            <div className="mt-7 divide-y divide-line">
              {onboardingSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="grid gap-4 py-5 first:pt-0 sm:grid-cols-[48px_1fr]"
                  >
                    <span className="grid size-12 place-items-center rounded-[12px] bg-[#edf1e3] text-forest">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-ink-muted">
                        BƯỚC {step.number}
                      </p>
                      <h3 className="mt-1 text-sm font-extrabold">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-6 text-ink-soft">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="rounded-[20px] border border-line bg-white p-6 sm:p-7">
            <span className="grid size-12 place-items-center rounded-[12px] bg-coral text-white">
              <Plus className="size-5" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-extrabold">
              Bắt đầu hồ sơ của bạn
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              Điền ý tưởng của bạn, lưu nháp rồi quay lại bổ sung. Khi đủ thông
              tin, hồ sơ sẽ xuất hiện trong hàng chờ của quản trị viên.
            </p>
            <Link
              href="/creator/campaigns/new"
              className="button-primary mt-6 w-full"
            >
              Tạo chiến dịch mới <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/system-design"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-xs font-bold text-forest hover:text-coral-dark"
            >
              Xem quy trình xét duyệt
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
