import type { UserRole } from "@/lib/api/contracts";

export interface PreviewAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  initials: string;
  headline: string;
  roles: UserRole[];
  activeRole: UserRole;
  description: string;
}

export const previewAccounts: PreviewAccount[] = [
  {
    id: "usr_minh_anh",
    name: "Phạm Minh Anh",
    email: "minhanh@example.com",
    password: "gop12345",
    initials: "MA",
    headline: "Thành viên cộng đồng từ tháng 03/2025",
    roles: ["BACKER"],
    activeRole: "BACKER",
    description: "Ủng hộ dự án, lưu chiến dịch và theo dõi quà tặng.",
  },
  {
    id: "usr_hoang_linh",
    name: "Nguyễn Hoàng Linh",
    email: "linh@orbit.vn",
    password: "gop12345",
    initials: "NL",
    headline: "Chủ dự án ORBIT One",
    roles: ["BACKER", "CREATOR"],
    activeRole: "CREATOR",
    description: "Tạo, dự báo và vận hành chiến dịch gọi vốn.",
  },
  {
    id: "usr_gia_huy",
    name: "Lê Gia Huy",
    email: "giahuy@orbit.vn",
    password: "gop12345",
    initials: "GH",
    headline: "Cộng tác viên phần cứng · ORBIT One",
    roles: ["BACKER", "COLLABORATOR"],
    activeRole: "COLLABORATOR",
    description: "Đăng cập nhật và phản hồi trong chiến dịch được mời.",
  },
  {
    id: "usr_khanh_an",
    name: "Trần Khánh An",
    email: "quantri@gop.vn",
    password: "gop12345",
    initials: "KA",
    headline: "Quản trị viên vận hành nền tảng",
    roles: ["ADMIN"],
    activeRole: "ADMIN",
    description: "Duyệt dự án, xem cảnh báo và quản lý người dùng.",
  },
];
