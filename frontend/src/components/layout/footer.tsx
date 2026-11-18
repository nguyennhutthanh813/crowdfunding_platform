import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            Nền tảng gọi vốn cộng đồng tích hợp AI cho người Việt. Cơ chế All-or-Nothing: backer chỉ bị trừ tiền khi dự án đạt mục tiêu.
          </p>
          <p className="text-xs text-muted">Đồ án môn học · Thanh toán mô phỏng (MockPay), không xử lý tiền thật.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Khám phá</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/explore" className="hover:text-fg">Tất cả dự án</Link></li>
            <li><Link href="/explore?status=SCHEDULED" className="hover:text-fg">Sắp mở</Link></li>
            <li><Link href="/explore?sort=ending" className="hover:text-fg">Sắp kết thúc</Link></li>
            <li><Link href="/studio/new" className="hover:text-fg">Tạo dự án</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Hệ thống</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/#how" className="hover:text-fg">Cách hoạt động</Link></li>
            <li><Link href="/system" className="hover:text-fg">Thiết kế CSDL & phân quyền</Link></li>
            <li><Link href="/login" className="hover:text-fg">Tài khoản demo</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">© 2026 FundViet</div>
    </footer>
  );
}
