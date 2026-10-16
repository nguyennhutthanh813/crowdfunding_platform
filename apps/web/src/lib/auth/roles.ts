import type { UserRole } from "@/lib/api/contracts";

export const roleLabels: Record<UserRole, string> = {
  BACKER: "Người ủng hộ",
  CREATOR: "Chủ dự án",
  COLLABORATOR: "Cộng tác viên",
  ADMIN: "Quản trị viên",
};

export const roleDestinations: Record<UserRole, string> = {
  BACKER: "/dashboard",
  CREATOR: "/creator",
  COLLABORATOR: "/collaborator",
  ADMIN: "/admin",
};

export const roleDescriptions: Record<UserRole, string> = {
  BACKER: "Khám phá, cam kết ủng hộ và theo dõi tiến độ nhận quà.",
  CREATOR: "Tạo chiến dịch, xem dự báo và quản lý quá trình gọi vốn.",
  COLLABORATOR: "Làm việc trong chiến dịch được mời với quyền được giới hạn.",
  ADMIN: "Duyệt chiến dịch, xử lý cảnh báo và vận hành nền tảng.",
};

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase("vi") ?? "")
    .join("");
}

export function getFriendlyName(name: string) {
  return name.trim().split(/\s+/).slice(-2).join(" ");
}
