import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { DemoAccounts, LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <AuthShell
      title="Chào mừng trở lại 👋"
      subtitle="Đăng nhập để góp vốn, quản lý dự án hoặc quản trị nền tảng."
      side={
        <div className="mt-4 space-y-3">
          <h2 className="text-xl font-bold">Thử nhanh bằng tài khoản demo</h2>
          <p className="text-sm text-violet-100/75">Mỗi tài khoản đại diện một vai trò — bấm để vào thẳng khu làm việc tương ứng.</p>
          <div className="text-fg"><DemoAccounts next={next} /></div>
        </div>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
