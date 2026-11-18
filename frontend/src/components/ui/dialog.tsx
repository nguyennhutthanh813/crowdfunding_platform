"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hộp thoại: modal giữa màn hình trên desktop, bottom sheet trên mobile. */
export function Dialog({ open, onClose, title, description, children, className, wide }: {
  open: boolean; onClose: () => void; title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal>
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={cn("card relative max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-b-[1.25rem] sm:p-6", wide ? "sm:max-w-3xl" : "sm:max-w-lg", className)}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <button onClick={onClose} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Đóng">
              <X className="size-5" />
            </button>
            {title && <h2 className="pr-10 text-lg font-bold">{title}</h2>}
            {description && <p className="mt-1 pr-6 text-sm text-muted">{description}</p>}
            <div className={cn(title || description ? "mt-4" : "")}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
