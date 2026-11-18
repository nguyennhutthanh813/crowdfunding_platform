import type { Metadata } from "next";
import { KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const resetSuccess = sp.reset === "1";

  return (
    <AuthShell
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để quản lý khoản góp vốn, theo dõi tiến độ chiến dịch và vận hành dự án sáng tạo."
      side={
        <div className="mt-4 space-y-4">
          <h2 className="text-xl font-bold">Bảo mật tài khoản chuẩn đa lớp</h2>
          <p className="text-sm text-violet-200/85">
            FundViet bảo vệ mọi giao dịch uỷ quyền góp vốn và quyền quản trị chiến dịch bằng phiên JWT kết hợp xác thực hai lớp.
          </p>
          <div className="grid gap-3 pt-1">
            {[
              {
                icon: ShieldCheck,
                title: "Xác thực 2 lớp (2FA TOTP)",
                desc: "Hỗ trợ Google Authenticator và dán mã trực tiếp trên 2fa.live kèm 8 mã dự phòng.",
              },
              {
                icon: Lock,
                title: "Cam kết All-or-Nothing",
                desc: "Khoản ủng hộ chỉ giữ chỗ an toàn trên thẻ và chỉ thu khi chiến dịch đạt 100% mục tiêu.",
              },
              {
                icon: KeyRound,
                title: "Khôi phục qua OTP Email",
                desc: "Đặt lại mật khẩu nhanh chóng qua mã xác thực 6 chữ số gửi về hộp thư cá nhân.",
              },
              {
                icon: Sparkles,
                title: "Trợ lý AI đồng hành",
                desc: "Đánh giá xác suất thành công và phân tích phản hồi cộng đồng theo thời gian thực.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm"
              >
                <item.icon className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-white">{item.title}</div>
                  <div className="text-violet-100/80 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <LoginForm next={next} resetSuccess={resetSuccess} />
    </AuthShell>
  );
}
