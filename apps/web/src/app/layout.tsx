import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Manrope } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConnectivityBanner } from "@/components/ui/connectivity-banner";
import { DemoContextNotice } from "@/components/ui/demo-context-notice";
import { siteConfig } from "@/config/site";
import { getServerSession } from "@/lib/auth/server-session";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Góp — Gọi vốn cộng đồng cho ý tưởng Việt",
    template: "%s | Góp",
  },
  description: siteConfig.description,
  keywords: ["crowdfunding", "gọi vốn cộng đồng", "dự án Việt"],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: siteConfig.name,
    title: "Góp — Gọi vốn cộng đồng cho ý tưởng Việt",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Góp — Gọi vốn cộng đồng cho ý tưởng Việt",
    description: siteConfig.description,
  },
  icons: {
    icon: [{ url: "/brand/gop-mark.svg", type: "image/svg+xml" }],
    shortcut: "/brand/gop-mark.svg",
    apple: "/brand/gop-mark.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17392f",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialSession = await getServerSession();

  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <AuthProvider initialSession={initialSession}>
          <a href="#noi-dung-chinh" className="skip-link">
            Bỏ qua phần điều hướng
          </a>
          <ConnectivityBanner />
          <SiteHeader />
          <DemoContextNotice />
          <main id="noi-dung-chinh" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
