"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, LogIn, UserPlus } from "lucide-react";
import { loginAction, quickLoginAction, registerAction, type FormState } from "@/server/actions/auth";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/action-form";
import { RoleBadge } from "@/components/ui/primitives";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email hoặc tên đăng nhập">
        <Input name="identifier" autoComplete="username" placeholder="minhanh@fundviet.vn" required />
      </Field>
      <Field label="Mật khẩu">
        <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </Field>
      {state?.error && <ErrorNote text={state.error} />}
      <SubmitButton className="w-full" pendingText="Đang đăng nhập…"><LogIn className="size-4" /> Đăng nhập</SubmitButton>
      <p className="text-center text-sm text-muted">Chưa có tài khoản? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-violet-600 hover:underline dark:text-violet-400">Đăng ký miễn phí</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Tên hiển thị" error={fe.displayName}><Input name="displayName" placeholder="Nguyễn Văn A" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên đăng nhập" error={fe.username} hint="Dùng cho /u/ten-dang-nhap"><Input name="username" placeholder="nguyenvana" required /></Field>
        <Field label="Email" error={fe.email}><Input name="email" type="email" placeholder="ban@email.com" required /></Field>
      </div>
      <Field label="Mật khẩu" error={fe.password} hint="Tối thiểu 8 ký tự. Mật khẩu được mã hoá scrypt."><Input name="password" type="password" autoComplete="new-password" required /></Field>
      {state?.error && <ErrorNote text={state.error} />}
      <SubmitButton className="w-full" pendingText="Đang tạo tài khoản…"><UserPlus className="size-4" /> Tạo tài khoản</SubmitButton>
      <p className="text-center text-xs text-muted">Mọi tài khoản đều có quyền Backer. Bạn có thể tạo dự án để trở thành Creator bất cứ lúc nào.</p>
      <p className="text-center text-sm text-muted">Đã có tài khoản? <Link href="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">Đăng nhập</Link></p>
    </form>
  );
}

function ErrorNote({ text }: { text: string }) {
  return <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300"><AlertCircle className="mt-0.5 size-4 shrink-0" />{text}</div>;
}

const DEMO = [
  { username: "minhanh", name: "Nguyễn Minh Anh", role: "BACKER", desc: "Đã góp vốn 8 dự án, có lời mời cộng tác đang chờ", color: "from-emerald-500/20" },
  { username: "hoanglinh", name: "Hoàng Linh", role: "CREATOR", desc: "Chủ ORBIT One, Mộc Lamp, Loa Tre…", color: "from-amber-500/20" },
  { username: "giahuy", name: "Trần Gia Huy", role: "COLLABORATOR", desc: "Collaborator của 3 dự án ORBIT Lab", color: "from-sky-500/20" },
  { username: "quantri", name: "Quản trị viên An", role: "ADMIN", desc: "Duyệt dự án, xử lý vi phạm, bộ lập lịch", color: "from-rose-500/20" },
];

export function DemoAccounts({ next }: { next?: string }) {
  return (
    <div className="grid gap-2.5">
      {DEMO.map((d) => (
        <form key={d.username} action={quickLoginAction}>
          <input type="hidden" name="username" value={d.username} />
          <input type="hidden" name="next" value={next ?? ""} />
          <button className={`group flex w-full items-center gap-3 rounded-2xl border border-line bg-gradient-to-r ${d.color} to-transparent p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-400/50 hover:shadow-lg`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="font-bold">{d.name}</span><RoleBadge role={d.role} /></div>
              <div className="truncate text-xs text-muted">{d.desc}</div>
            </div>
            <span className="text-xs font-semibold text-violet-600 opacity-0 transition group-hover:opacity-100 dark:text-violet-400">Vào ngay →</span>
          </button>
        </form>
      ))}
      <p className="text-center text-xs text-muted">Mật khẩu chung cho mọi tài khoản demo: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">fundviet123</code></p>
    </div>
  );
}
