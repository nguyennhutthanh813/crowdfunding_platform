"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <h1 className="text-3xl font-black">Có lỗi xảy ra</h1>
      <p className="mt-2 text-muted">{error.message || "Vui lòng thử lại."}</p>
      <Button className="mt-6" onClick={reset}><RotateCcw className="size-4" /> Thử lại</Button>
    </div>
  );
}
