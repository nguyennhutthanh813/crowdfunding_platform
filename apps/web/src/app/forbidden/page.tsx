import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Không có quyền truy cập" };

export default function Forbidden() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <div className="grid size-20 place-items-center rounded-3xl bg-rose-500/10 text-rose-500"><ShieldAlert className="size-10" /></div>
      <h1 className="mt-6 text-3xl font-black">Bạn chưa có quyền vào khu vực này</h1>
      <p className="mt-2 text-muted">Khu vực này dành cho vai trò khác (ví dụ Quản trị viên, Creator hoặc Collaborator của dự án). Hãy đổi sang tài khoản phù hợp.</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/">Về trang chủ</ButtonLink>
        <ButtonLink href="/login?switch=1" variant="outline">Đổi tài khoản</ButtonLink>
      </div>
    </div>
  );
}
