import Image from "next/image";
import type { ReactNode } from "react";
import { Aurora } from "@/components/fx/motion";

export function AuthShell({ title, subtitle, children, side }: { title: string; subtitle: string; children: ReactNode; side?: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="relative isolate overflow-hidden rounded-[1.5rem] bg-[#0f0c22] p-6 text-white sm:p-8">
        <Aurora className="opacity-80" />
        <div className="relative">
          <Image src="/v3/brand/success.webp" alt="" width={120} height={120} className="animate-float rounded-3xl" />
          {side}
        </div>
      </div>
    </div>
  );
}
