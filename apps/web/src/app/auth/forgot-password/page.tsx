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
            Khôi phục quyền truy cập tài khoản.
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/70">
            Nhập email của bạn để nhận mã xác nhận OTP 6 chữ số và tạo mật khẩu mới an toàn. Hệ thống sẽ cập nhật mật khẩu trực tiếp cho tài khoản của bạn.
          </p>
        </aside>
        <div className="p-7 sm:p-10 md:p-12">
          <RecoveryForm />
        </div>
      </div>
    </section>
  );
}
