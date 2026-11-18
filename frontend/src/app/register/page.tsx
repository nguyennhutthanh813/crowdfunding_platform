import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function RegisterPage(props: PageProps<"/register">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <AuthShell
      title="Tạo tài khoản FundViet"
      subtitle="Miễn phí. Một tài khoản dùng được cả vai trò Backer lẫn Creator."
      side={
        <div className="mt-4 space-y-4">
          <h2 className="text-xl font-bold">Với một tài khoản, bạn có thể…</h2>
          <ul className="space-y-3 text-sm text-violet-100/85">
            {["Góp vốn cho dự án yêu thích, chỉ bị trừ tiền khi dự án thành công", "Lưu dự án, theo dõi creator, nhận gợi ý phù hợp", "Tạo dự án của riêng bạn với AI chấm điểm trước khi gửi duyệt", "Được mời làm Collaborator để cùng vận hành dự án"].map((t) => (
              <li key={t} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />{t}</li>
            ))}
          </ul>
        </div>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
