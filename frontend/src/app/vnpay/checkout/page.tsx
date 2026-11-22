import type { Metadata } from "next";
import { apiFetch } from "@/server/api";
import { VnpayCheckoutClient, type VnpayOrderViewData } from "@/components/vnpay/vnpay-checkout-client";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout-bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cổng thanh toán VNPAY" };

export default async function VnpayCheckoutPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const txnRef = qs.get("vnp_TxnRef") ?? "";
  const token = qs.get("token") ?? undefined;

  if (!txnRef) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <EmptyState
          title="Thiếu mã giao dịch VNPAY"
          description="Phiên thanh toán không hợp lệ hoặc đã bị đóng."
          action={<ButtonLink href="/explore">Khám phá dự án</ButtonLink>}
        />
      </div>
    );
  }

  const { status, data } = await apiFetch<({ ok?: boolean; error?: string } & Partial<VnpayOrderViewData>)>(
    `/vnpay/orders/${encodeURIComponent(txnRef)}?${qs.toString()}`,
  );

  if (status >= 400 || !data.ok || !data.order || !data.project || !data.qrDataUrl || !data.banks) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <EmptyState
          title="Không thể mở cổng thanh toán VNPAY"
          description={data.error ?? "Đơn thanh toán đã hết hạn hoặc chữ ký số không hợp lệ."}
          action={<ButtonLink href="/me/backed">Quay về Của tôi</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <VnpayCheckoutClient
      data={{
        order: data.order,
        project: data.project,
        qrDataUrl: data.qrDataUrl,
        banks: data.banks,
      }}
      orderToken={token}
    />
  );
}
