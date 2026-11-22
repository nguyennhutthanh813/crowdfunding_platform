"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-5xl",
};

let openDialogCount = 0;
let prevBodyOverflow = "";
const escStack: (() => void)[] = [];
const emptySubscribe = () => () => {};

/** Hộp thoại: render qua Portal gắn vào document.body để không kế thừa text-align/whitespace từ bảng cha, hỗ trợ modal lồng nhau. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: DialogSize;
  wide?: boolean;
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const handler = () => onCloseRef.current();
    escStack.push(handler);
    if (openDialogCount === 0) {
      prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDialogCount++;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escStack[escStack.length - 1] === handler) {
        e.stopPropagation();
        handler();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const idx = escStack.lastIndexOf(handler);
      if (idx >= 0) escStack.splice(idx, 1);
      openDialogCount = Math.max(0, openDialogCount - 1);
      if (openDialogCount === 0) {
        document.body.style.overflow = prevBodyOverflow;
      }
    };
  }, [open]);

  if (!mounted) return null;

  const resolvedSize: DialogSize = size ?? (wide ? "xl" : "lg");
  const hasHeader = Boolean(title || description);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 text-left whitespace-normal sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onCloseRef.current()}
          />
          <motion.div
            className={cn(
              "card relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl rounded-b-none border border-line bg-surface p-0 text-left whitespace-normal shadow-2xl sm:rounded-3xl",
              SIZE_CLASSES[resolvedSize],
              className,
            )}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {hasHeader ? (
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="text-lg font-bold leading-snug text-fg">{title}</h2>}
                  {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onCloseRef.current()}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
                  aria-label="Đóng"
                >
                  <X className="size-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-line/70 bg-surface-2/40 px-5 py-3.5 sm:px-6">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
