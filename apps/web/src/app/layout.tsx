import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConnectivityBanner } from "@/components/ui/connectivity-banner";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { FloatingRoleCommandDock } from "@/components/workspace/quick-role-switcher";
import { siteConfig } from "@/config/site";
import { getServerSession } from "@/lib/auth/server-session";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-manrope",
  subsets: ["vietnamese", "latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "FundViet — Gọi vốn cộng đồng cho ý tưởng Việt",
    template: "%s | FundViet",
  },
  description: siteConfig.description,
  keywords: ["crowdfunding", "gọi vốn cộng đồng", "dự án Việt", "FundViet"],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: siteConfig.name,
    title: "FundViet — Gọi vốn cộng đồng cho ý tưởng Việt",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "FundViet — Gọi vốn cộng đồng cho ý tưởng Việt",
    description: siteConfig.description,
  },
  icons: {
    icon: [{ url: "/brand/fundviet-mark.svg", type: "image/svg+xml" }],
    shortcut: "/brand/fundviet-mark.svg",
    apple: "/brand/fundviet-mark.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16A34A",
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
      className={`${inter.variable} ${beVietnamPro.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="pb-16 md:pb-0">
        <AuthProvider
          key={initialSession
            ? `${initialSession.user.id}:${initialSession.user.activeRole}:${initialSession.user.roles.join(",")}`
            : "guest"}
          initialSession={initialSession}
        >
          <a href="#noi-dung-chinh" className="skip-link">
            Bỏ qua phần điều hướng
          </a>
          <ConnectivityBanner />
          <SiteHeader />
          <main id="noi-dung-chinh" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          <MobileBottomNav />
          <FloatingRoleCommandDock />
        </AuthProvider>
      </body>
    </html>
  );
}
