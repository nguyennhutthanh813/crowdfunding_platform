import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = {
  title: "Đăng nhập và đăng ký",
  description: "Đăng nhập hoặc tạo tài khoản để ủng hộ và quản lý chiến dịch.",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const query = await searchParams;
  return (
    <section className="min-h-[calc(100vh-72px)] border-b border-line bg-canvas-soft py-10 sm:py-16">
      <div className="container-shell">
        <AuthPanel
          key={query.mode === "register" ? "register" : "sign-in"}
          initialMode={query.mode === "register" ? "REGISTER" : "SIGN_IN"}
          nextPath={query.next}
        />
      </div>
    </section>
  );
}
