"use client";

import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isProdOmitted = error?.message?.includes("Server Components render") || error?.message?.includes("Minified React error");
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <h1 className="text-3xl font-black">Không thể tải trang lúc này</h1>
      <p className="mt-2 text-sm text-muted">
        {isProdOmitted || !error?.message
          ? "Kết nối tạm thời gián đoạn hoặc phiên làm việc cần làm mới. Vui lòng thử tải lại trang."
          : error.message}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw className="size-4" /> Thử lại
        </Button>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
        >
          <Home className="size-4" /> Về trang chủ
        </Link>
      </div>
    </div>
  );
}
