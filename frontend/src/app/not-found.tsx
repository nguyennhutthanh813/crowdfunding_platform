import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <Image src="/v3/brand/empty.webp" alt="" width={180} height={180} className="animate-float rounded-3xl" />
      <h1 className="mt-6 text-3xl font-black">Không tìm thấy trang</h1>
      <p className="mt-2 text-muted">Trang bạn tìm có thể đã bị gỡ, chưa công khai hoặc đường dẫn chưa đúng.</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/">Về trang chủ</ButtonLink>
        <ButtonLink href="/explore" variant="outline">Khám phá dự án</ButtonLink>
      </div>
    </div>
  );
}
