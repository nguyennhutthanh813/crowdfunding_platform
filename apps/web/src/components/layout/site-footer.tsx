"use client";

import { HeartHandshake, Mail } from "lucide-react";
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
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-lime">
        {title}
      </p>
      <div className="mt-4 flex flex-col gap-3 text-sm text-white/66">
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
    "/onboarding",
    "/pledge",
  ];

  if (appAreas.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <footer className="border-t border-white/8 bg-forest text-white">
      <div className="container-shell grid gap-10 py-12 lg:grid-cols-[1.35fr_0.7fr_0.7fr_0.7fr]">
        <div>
          <Link
            href="/"
            className="group inline-flex"
          >
            <BrandLogo />
            <span className="sr-only">Trang chủ</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/66">
            {siteConfig.description}
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/62">
            <HeartHandshake className="size-3.5 text-lime" /> {siteConfig.slogan}
          </span>
        </div>
        <FooterLinks title="Khám phá" links={siteConfig.footer.discover} />
        <FooterLinks title="Dành cho chủ dự án" links={siteConfig.footer.creators} />
        <FooterLinks title="Hỗ trợ" links={siteConfig.footer.support} />
      </div>
      <div className="border-t border-white/8">
        <div className="container-shell flex flex-col gap-3 py-5 text-xs text-white/66 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Góp. Cùng đưa ý tưởng Việt đi xa hơn.</p>
          <p className="inline-flex items-center gap-2">
            <Mail className="size-3.5" /> Bản trải nghiệm, chưa thực hiện giao dịch thật.
          </p>
        </div>
      </div>
    </footer>
  );
}
