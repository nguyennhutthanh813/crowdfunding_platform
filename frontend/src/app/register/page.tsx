import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function RegisterPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <AuthShell
      title="Tạo tài khoản FundViet"
      subtitle="Tham gia cộng đồng ủng hộ sáng tạo Việt và khởi chạy chiến dịch của riêng bạn."
      side={
        <div className="mt-4 space-y-4">
          <h2 className="text-xl font-bold">Quyền lợi thành viên FundViet</h2>
          <ul className="space-y-3 text-sm text-violet-100/85">
            {[
              "Góp vốn an toàn theo cơ chế All-or-Nothing — chỉ trừ tiền khi dự án đạt mục tiêu",
              "Lưu chiến dịch yêu thích, theo dõi nhà sáng tạo và nhận đề xuất cá nhân hoá",
              "Khởi tạo chiến dịch gọi vốn tích hợp AI phân tích & tối ưu trước khi gửi duyệt",
              "Bảo vệ tài khoản với xác thực 2 lớp (Google Authenticator / 2fa.live)",
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
      <RegisterForm next={next} />
    </AuthShell>
  );
}
