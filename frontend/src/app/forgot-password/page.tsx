import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Khôi phục mật khẩu"
      subtitle="Nhận mã xác thực OTP 6 chữ số qua hộp thư Email để đặt lại mật khẩu an toàn."
      side={
        <div className="mt-4 space-y-4">
          <h2 className="text-xl font-bold">Hướng dẫn lấy lại mật khẩu</h2>
          <ul className="space-y-3 text-sm text-violet-100/85">
            {[
              "Nhập đúng địa chỉ email bạn đã đăng ký trên FundViet",
              "Kiểm tra hộp thư đến (hoặc mục Quảng cáo / Spam) để lấy mã OTP 6 chữ số",
              "Mã xác thực có hiệu lực trong vòng 15 phút kể từ lúc yêu cầu",
              "Sau khi đổi mật khẩu, mọi phiên đăng nhập cũ trên thiết bị khác sẽ tự động được thu hồi",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
