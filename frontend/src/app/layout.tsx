import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "sonner";
import { getNavContext } from "@/server/queries/nav";
import { NavBar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteFooter } from "@/components/layout/footer";
import "./globals.css";

const font = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-be-vietnam", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "FundViet — Gọi vốn cộng đồng cho ý tưởng Việt", template: "%s · FundViet" },
  description: "Nền tảng gọi vốn cộng đồng cho người Việt: bảo vệ người ủng hộ an toàn, chỉ thu tiền khi chiến dịch đạt mục tiêu.",
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f6fb" }, { media: "(prefers-color-scheme: dark)", color: "#0b0918" }],
};

const themeScript = `try{var t=localStorage.getItem('fv-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getNavContext();
  return (
    <html lang="vi" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <NavBar ctx={ctx} />
        <main className="min-h-[70vh]">{children}</main>
        <SiteFooter />
        <MobileNav ctx={ctx} />
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: "!rounded-2xl !font-sans" }} />
      </body>
    </html>
  );
}
