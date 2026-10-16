import type { Metadata } from 'next';
import { RecoveryForm } from '@/components/auth/recovery-form';
import { BrandLogo } from '@/components/brand-logo';

export const metadata: Metadata = {
  title: 'Khôi phục tài khoản',
  description: 'Đặt lại mật khẩu tài khoản Góp Ý.',
};

export default function ForgotPasswordPage() {
  return (
    <section className="min-h-[70vh] bg-[#f3f1ea] px-3 py-10 sm:py-16">
      <div className="mx-auto mb-7 w-fit sm:hidden">
        <BrandLogo light={false} />
      </div>
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[22px] border border-line bg-white md:grid-cols-[0.82fr_1.18fr]">
        <aside className="hidden bg-forest p-10 text-white md:block">
          <BrandLogo />
          <p className="eyebrow mt-16 text-lime">An toàn tài khoản</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.05em]">
            Thử các bước khôi phục tài khoản.
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/55">
            Nhập email, kiểm tra mã mẫu và thử biểu mẫu mật khẩu mới. Mật khẩu thực sự
            chưa được thay đổi; tài khoản vẫn dùng thông tin đăng nhập ban đầu.
          </p>
        </aside>
        <div className="p-7 sm:p-10 md:p-12">
          <RecoveryForm />
        </div>
      </div>
    </section>
  );
}
