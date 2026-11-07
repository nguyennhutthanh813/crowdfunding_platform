import type { BackedProject } from "@/lib/api/contracts";

export function backerFulfillmentText(
  pledge: Pick<BackedProject, "paymentStatus" | "fulfillmentStatus">,
) {
  if (pledge.paymentStatus === "CANCELED") return "Không giao vì cam kết đã hủy";
  if (pledge.paymentStatus === "FAILED") return "Chưa phát sinh giao hàng";

  switch (pledge.fulfillmentStatus) {
    case "PENDING": return "Chưa đến bước giao";
    case "PREPARING": return "Mẫu: đang chuẩn bị";
    case "SHIPPED": return "Mẫu: đã gửi vận chuyển";
    case "DELIVERED": return "Mẫu: đã giao";
    case "NOT_APPLICABLE": return "Không phát sinh giao hàng";
  }
}
