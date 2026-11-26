"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button, buttonClass } from "./button";
import { Dialog } from "./dialog";
import { celebrate } from "@/components/fx/confetti";

export type ActionResult = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string>; redirect?: string; celebrate?: boolean } | null;

export function SubmitButton({ children, variant = "primary", size = "md", className, pendingText, disabled }: {
  children: ReactNode; variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1]; className?: string; pendingText?: string; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={buttonClass(variant, size, className)}
    >
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedRef = useRef(false);
  const ref = useRef<HTMLFormElement>(null);
  const lastSubmitted = useRef<FormData | null>(null);
  const router = useRouter();
  const submit = (fd: FormData) => {
    lastSubmitted.current = fd;
    formAction(fd);
  };
  useEffect(() => {
    if (!state) return;
    if (state.error) {
      toast.error(state.error);
      // React tự xoá form sau khi gửi; khi lỗi thì khôi phục nội dung người dùng đã nhập để họ sửa tiếp
      const form = ref.current;
      const fd = lastSubmitted.current;
      if (form && fd) {
        for (const [key, value] of fd.entries()) {
          if (typeof value !== "string") continue;
          const el = form.elements.namedItem(key);
          if ((el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type !== "hidden" && el.type !== "file")) && !el.value) {
            el.value = value;
          }
        }
      }
    } else if (state.ok) {
      if (state.message) toast.success(state.message);
      if (state.celebrate) celebrate();
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (state.redirect) {
        router.push(state.redirect);
      } else {
        router.refresh();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={ref}
      action={submit}
      className={className}
      onSubmit={
        confirm
          ? (e) => {
              if (!confirmedRef.current) {
                e.preventDefault();
                setConfirmOpen(true);
                return;
              }
              confirmedRef.current = false;
            }
          : undefined
      }
    >
      {typeof children === "function" ? children(state) : children}

      {confirm && (
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} size="sm" title="Xác nhận thao tác">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm text-fg">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="leading-relaxed">{confirm}</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
                Huỷ
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  confirmedRef.current = true;
                  setConfirmOpen(false);
                  ref.current?.requestSubmit();
                }}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </form>
  );
}
