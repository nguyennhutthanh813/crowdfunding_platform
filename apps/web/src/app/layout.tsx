import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Manrope } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ConnectivityBanner } from '@/components/ui/connectivity-banner';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getServerSession } from '@/lib/auth/server-session';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Góp Ý – Gọi vốn cộng đồng cho ý tưởng Việt',
    template: '%s | Góp Ý',
  },
  description:
    'Nơi những dự án Việt có kế hoạch rõ ràng tìm được cộng đồng cùng tin và cùng làm.',
  keywords: ['crowdfunding', 'gọi vốn cộng đồng', 'dự án Việt'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#102a22',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${manrope.variable}`}
    >
      <body>
        <AuthProvider initialSession={session}>
          <a href="#noi-dung-chinh" className="skip-link">
            Bỏ qua phần điều hướng
          </a>
          <ConnectivityBanner />
          <SiteHeader />
          <main id="noi-dung-chinh" tabIndex={-1} className="flex flex-1 flex-col">
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
