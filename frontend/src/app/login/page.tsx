import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, KeyRound, Lock, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { getViewer } from "@/server/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  const resetSuccess = sp.reset === "1";
  const switchAccount = sp.switch === "1";

  const viewer = await getViewer();
  if (viewer && next && !switchAccount) {
    redirect(next);
  }

  const dashboardHref = viewer?.systemRoles.includes("ADMIN") ? "/admin" : "/me";

  return (
    <AuthShell
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để quản lý khoản góp vốn, theo dõi tiến độ chiến dịch và vận hành dự án sáng tạo."
      side={
        <div className="mt-4 space-y-4">
          <h2 className="text-xl font-bold">Bảo mật tài khoản & Thanh toán Ký quỹ</h2>
          <p className="text-sm text-violet-200/85">
            FundViet bảo vệ mọi giao dịch góp vốn qua VNPAY Escrow và quyền quản trị chiến dịch bằng phiên JWT kết hợp xác thực hai lớp.
          </p>
          <div className="grid gap-3 pt-1">
            {[
              {
                icon: ShieldCheck,
                title: "Xác thực 2 lớp (2FA TOTP)",
                desc: "Tương thích Google Authenticator và 2fa.live kèm 8 mã dự phòng khôi phục.",
              },
              {
                icon: Lock,
                title: "VNPAY Escrow · All-or-Nothing",
                desc: "Khoản ủng hộ được ký quỹ an toàn qua VNPAY (HMAC-SHA512), chỉ giải ngân khi chiến dịch đạt 100% mục tiêu.",
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
                  <div className="leading-relaxed text-violet-100/80">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      {viewer && !switchAccount && (
        <div className="mb-5 space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4 text-sm">
          <div>
            Bạn đang đăng nhập với tài khoản <b>{viewer.displayName}</b> (<span className="font-mono text-xs">@{viewer.username}</span>).
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={dashboardHref} size="sm">
              Vào bảng điều khiển <ArrowRight className="size-3.5" />
            </ButtonLink>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="size-3.5" /> Đăng xuất để đổi tài khoản
              </Button>
            </form>
          </div>
        </div>
      )}
      <LoginForm next={next} resetSuccess={resetSuccess} />
    </AuthShell>
  );
}
