"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Compass, Settings, Sparkles, X } from "lucide-react";
import { celebrate } from "@/components/fx/confetti";
import { Aurora } from "@/components/fx/motion";
import { ButtonLink } from "@/components/ui/button";

export function WelcomeBanner({ name }: { name: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    celebrate();
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] bg-[#120e29] p-5 text-white shadow-[0_20px_60px_-24px_rgba(109,74,255,0.65)] sm:p-6">
      <Aurora className="opacity-70" />
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Ẩn thông báo chào mừng"
        className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
      >
        <X className="size-4" />
      </button>
      <div className="relative flex flex-col items-center gap-5 sm:flex-row">
        <Image
          src="/v3/brand/launch.webp"
          alt="Chào mừng gia nhập FundViet"
          width={96}
          height={96}
          className="animate-float shrink-0 rounded-2xl border border-white/15"
        />
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
            <Sparkles className="size-3.5" /> Tài khoản mới sẵn sàng
          </span>
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">
            Chào mừng {name} đến với FundViet!
          </h2>
          <p className="text-sm text-violet-100/80">
            Bạn có thể khám phá dự án sáng tạo, lưu dự án yêu thích, góp vốn an toàn với cơ chế All-or-Nothing hoặc tạo dự án đầu tiên.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
            <ButtonLink href="/explore" size="sm">
              <Compass className="size-4" /> Khám phá dự án ngay
            </ButtonLink>
            <ButtonLink href="/me/settings" size="sm" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20">
              <Settings className="size-4" /> Hoàn thiện hồ sơ
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
