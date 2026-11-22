import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            Nền tảng gọi vốn cộng đồng cho người Việt. Cơ chế minh bạch: người ủng hộ chỉ bị trừ tiền khi chiến dịch đạt mục tiêu.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Khám phá</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/explore" className="hover:text-fg">
                Tất cả dự án
              </Link>
            </li>
            <li>
              <Link href="/explore?status=SCHEDULED" className="hover:text-fg">
                Chiến dịch sắp mở
              </Link>
            </li>
            <li>
              <Link href="/explore?sort=ending" className="hover:text-fg">
                Sắp kết thúc
              </Link>
            </li>
            <li>
              <Link href="/studio/new" className="hover:text-fg">
                Khởi tạo dự án
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Tài khoản & Hỗ trợ</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/#how" className="hover:text-fg">
                Cách thức hoạt động
              </Link>
            </li>
            <li>
              <Link href="/me/settings?tab=account" className="hover:text-fg">
                Bảo mật 2FA & Phiên đăng nhập
              </Link>
            </li>
            <li>
              <Link href="/forgot-password" className="hover:text-fg">
                Khôi phục mật khẩu
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">
        © 2026 FundViet — Nền tảng gọi vốn cộng đồng sáng tạo Việt
      </div>
    </footer>
  );
}
