"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";

export function FundingRuleButton({ localDbAvailable }: { localDbAvailable: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 text-left text-xs font-semibold text-forest underline-offset-4 hover:underline">
        <CircleHelp className="size-4" /> Cam kết ủng hộ được xử lý thế nào?
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bạn cam kết trước, chưa bị thu tiền" description="Cách hoạt động của chiến dịch gọi vốn theo mô hình Tất cả hoặc không gì cả.">
        <ol className="space-y-4 text-sm leading-6 text-ink-soft">
          <li><strong className="text-ink">1. Chọn gói và kiểm tra tổng tiền.</strong> Mức cam kết gồm gói quà, phần mua thêm, phí giao hàng và khoản góp thêm nếu có.</li>
          <li><strong className="text-ink">2. Theo dõi mốc gọi vốn.</strong> Chỉ khi chiến dịch đạt mục tiêu, nhóm mới đi tiếp sang bước thu tiền và chuẩn bị quà.</li>
          <li><strong className="text-ink">3. Nếu không đạt mục tiêu.</strong> Cam kết được hủy theo quy trình thanh toán, người ủng hộ không phải trả tiền cho dự án thất bại.</li>
        </ol>
        <p className="mt-5 rounded-xl bg-[#f3f6ec] p-4 text-xs leading-5 text-ink-muted">
          {localDbAvailable
            ? "Bản web đang chạy trên máy chỉ lưu cam kết trong SQLite để thử quy trình; chưa kết nối cổng thanh toán."
            : "Bản web dùng thử hiện lưu cam kết trong trình duyệt; chưa kết nối cổng thanh toán."}
        </p>
      </Modal>
    </>
  );
}
