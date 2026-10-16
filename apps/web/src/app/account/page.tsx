import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { AccountWorkspace } from "@/components/account/account-workspace";
import { RoleGate } from "@/components/auth/role-gate";

export const metadata: Metadata = {
  title: "Tài khoản của tôi",
  description: "Quản lý hồ sơ, vai trò, thông báo và bảo mật tài khoản Góp.",
};

export default function AccountPage() {
  return (
    <RoleGate allowedRoles={["BACKER", "CREATOR", "COLLABORATOR", "ADMIN"]}>
      <section className="min-h-screen bg-[#efeee8] pb-16">
        <div className="border-b border-line bg-canvas-soft py-8 sm:py-10">
          <div className="container-shell">
            <span className="eyebrow text-coral-dark">
              <Settings2 className="size-4" /> Tài khoản
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              Thông tin của bạn, ở một chỗ.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
              Cập nhật hồ sơ, kiểm tra quyền truy cập và chọn những thông báo
              thực sự cần thiết.
            </p>
          </div>
        </div>
        <AccountWorkspace />
      </section>
    </RoleGate>
  );
}
