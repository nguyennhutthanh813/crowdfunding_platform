"use client";

import { ShieldCheck, HeartHandshake } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#86efac]">
        {title}
      </p>
      <div className="mt-4 flex flex-col gap-3 text-sm text-white/60">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="w-fit hover:text-white">
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const appAreas = [
    "/account",
    "/admin",
    "/auth",
    "/collaborator",
    "/creator",
    "/dashboard",
    "/du-lieu-chung",
    "/onboarding",
    "/pledge",
  ];

  if (appAreas.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <footer className="border-t border-slate-800 bg-[#0F172A] text-slate-200">
      <div className="container-shell grid gap-10 py-14 lg:grid-cols-[1.35fr_0.7fr_0.7fr_0.7fr]">
        <div>
          <Link href="/" className="group inline-flex">
            <BrandLogo />
            <span className="sr-only">Trang chủ</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            {siteConfig.description}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Nền tảng Gọi vốn Cộng đồng tích hợp AI đánh giá và tối ưu hóa chiến dịch.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <HeartHandshake className="size-3.5 text-[#34D399]" /> {siteConfig.slogan}
          </span>
        </div>
        <FooterLinks title="Khám phá" links={siteConfig.footer.discover} />
        <FooterLinks title="Dành cho chủ dự án" links={siteConfig.footer.creators} />
        <FooterLinks title="Hỗ trợ" links={siteConfig.footer.support} />
      </div>
      <div className="border-t border-slate-800">
        <div className="container-shell flex flex-col gap-3 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FundViet. Cùng đưa ý tưởng Việt đi xa hơn.</p>
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-[#34D399]" /> Cơ chế All-or-Nothing · Bảo vệ người ủng hộ &amp; minh bạch dòng vốn
          </p>
        </div>
      </div>
    </footer>
  );
}
