"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { buttonClass } from "./button";
import { celebrate } from "@/components/fx/confetti";

export type ActionResult = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string>; redirect?: string; celebrate?: boolean } | null;

export function SubmitButton({ children, variant = "primary", size = "md", className, pendingText, disabled }: {
  children: ReactNode; variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1]; className?: string; pendingText?: string; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={buttonClass(variant, size, className)}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/**
 * Form gọi Server Action và tự hiện toast kết quả (+ pháo giấy khi celebrate).
 * Server Action có chữ ký (prev, formData) => ActionResult.
 */
export function ActionForm({ action, children, className, resetOnSuccess, onSuccess, confirm }: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children: ReactNode | ((state: ActionResult) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (state: ActionResult) => void;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      if (state.message) toast.success(state.message);
      if (state.celebrate) celebrate();
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (state.redirect) router.push(state.redirect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      {typeof children === "function" ? children(state) : children}
    </form>
  );
}
