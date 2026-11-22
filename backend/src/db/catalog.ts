/**
 * Danh mục vai trò & quyền — nguồn sự thật duy nhất cho ma trận phân quyền.
 * Bám đúng "Ma trận phân quyền chi tiết" trong biên bản họp 18/11/2026.
 * Seed ghi các hằng số này vào bảng roles / permissions / role_permissions.
 */
export type Scope = "SYSTEM" | "PROJECT";
export type RoleCode = "MEMBER" | "ADMIN" | "CREATOR" | "COLLABORATOR";

export const ROLES: {
  code: RoleCode;
  scope: Scope;
  name: string;
  description: string;
  badgeColor: string;
}[] = [
  {
    code: "MEMBER",
    scope: "SYSTEM",
    name: "Thành viên (Người ủng hộ)",
    description:
      "Mọi tài khoản đã đăng nhập. Có toàn bộ quyền Người ủng hộ và có thể tạo dự án để trở thành Chủ dự án.",
    badgeColor: "#10B981",
  },
  {
    code: "ADMIN",
    scope: "SYSTEM",
    name: "Quản trị viên",
    description:
      "Giám sát nền tảng: duyệt / gỡ dự án, khoá tài khoản, quản lý thể loại, xem giao dịch. Không góp vốn và không đăng nội dung thay Chủ dự án.",
    badgeColor: "#F43F5E",
  },
  {
    code: "CREATOR",
    scope: "PROJECT",
    name: "Chủ dự án",
    description: "Chủ dự án. Toàn quyền cấu hình, tài chính, nhóm và nội dung của dự án mình tạo.",
    badgeColor: "#F59E0B",
  },
  {
    code: "COLLABORATOR",
    scope: "PROJECT",
    name: "Cộng tác viên",
    description:
      "Được Chủ dự án gán để hỗ trợ vận hành hằng ngày: hỏi đáp, soạn nháp bản tin, trả lời bình luận, xem thống kê. Không đụng tới tiền, địa chỉ người ủng hộ, cấu hình dự án.",
    badgeColor: "#0EA5E9",
  },
];

export const PERMISSIONS: { code: string; scope: Scope; module: string; name: string }[] = [
  // ── Hệ thống ──
  { code: "account.manage", scope: "SYSTEM", module: "Tài khoản", name: "Quản lý tài khoản cá nhân (tên đăng nhập, mật khẩu, email)" },
  { code: "pledge.create", scope: "SYSTEM", module: "Góp vốn", name: "Góp vốn: chọn gói quà, quà kèm, thanh toán" },
  { code: "pledge.history.view", scope: "SYSTEM", module: "Góp vốn", name: "Xem lịch sử góp vốn của chính mình" },
  { code: "project.save", scope: "SYSTEM", module: "Khám phá", name: "Lưu dự án quan tâm" },
  { code: "user.follow", scope: "SYSTEM", module: "Khám phá", name: "Theo dõi chủ dự án" },
  { code: "recommendation.view", scope: "SYSTEM", module: "Khám phá", name: "Xem dự án được đề xuất" },
  { code: "comment.create", scope: "SYSTEM", module: "Tương tác", name: "Bình luận và trả lời trên dự án" },
  { code: "message.send", scope: "SYSTEM", module: "Tương tác", name: "Nhắn tin nội bộ" },
  { code: "report.create", scope: "SYSTEM", module: "Tương tác", name: "Báo cáo vi phạm" },
  { code: "project.create", scope: "SYSTEM", module: "Dự án", name: "Tạo dự án mới (trở thành Chủ dự án của dự án đó)" },
  { code: "admin.dashboard.view", scope: "SYSTEM", module: "Quản trị", name: "Xem thống kê toàn hệ thống" },
  { code: "admin.project.review", scope: "SYSTEM", module: "Quản trị", name: "Duyệt dự án trước khi công khai" },
  { code: "admin.project.takedown", scope: "SYSTEM", module: "Quản trị", name: "Gỡ / khôi phục dự án vi phạm" },
  { code: "admin.user.lock", scope: "SYSTEM", module: "Quản trị", name: "Quản lý, phân quyền và khoá/mở khoá tài khoản" },
  { code: "admin.category.manage", scope: "SYSTEM", module: "Quản trị", name: "Quản lý thể loại" },
  { code: "admin.transaction.view", scope: "SYSTEM", module: "Quản trị", name: "Xem và đối soát toàn bộ giao dịch" },
  { code: "admin.comment.moderate", scope: "SYSTEM", module: "Quản trị", name: "Xoá bình luận vi phạm trên mọi dự án" },
  { code: "admin.report.handle", scope: "SYSTEM", module: "Quản trị", name: "Xử lý báo cáo vi phạm" },
  { code: "admin.scheduler.run", scope: "SYSTEM", module: "Quản trị", name: "Chạy bộ lập lịch chốt chiến dịch" },
  { code: "admin.audit.view", scope: "SYSTEM", module: "Quản trị", name: "Xem nhật ký hệ thống" },
  // ── Dự án ──
  { code: "project.view_private", scope: "PROJECT", module: "Dự án", name: "Xem dự án khi chưa công khai (bản nháp, chờ duyệt)" },
  { code: "project.edit", scope: "PROJECT", module: "Dự án", name: "Sửa nội dung chiến dịch, mục tiêu, thời hạn" },
  { code: "reward.manage", scope: "PROJECT", module: "Dự án", name: "Tạo và chỉnh sửa gói phần quà, quà kèm" },
  { code: "project.submit", scope: "PROJECT", module: "Dự án", name: "Gửi duyệt dự án" },
  { code: "project.schedule", scope: "PROJECT", module: "Dự án", name: "Đặt ngày bắt đầu và bật trang xem trước" },
  { code: "project.cancel", scope: "PROJECT", module: "Dự án", name: "Huỷ dự án của mình (trước khi khởi chạy)" },
  { code: "project.completion", scope: "PROJECT", module: "Dự án", name: "Chọn nội dung hiển thị khi dự án hoàn thành" },
  { code: "faq.manage", scope: "PROJECT", module: "Nội dung", name: "Soạn và quản lý câu hỏi thường gặp" },
  { code: "update.draft", scope: "PROJECT", module: "Nội dung", name: "Soạn bản nháp cập nhật tiến độ" },
  { code: "update.publish", scope: "PROJECT", module: "Nội dung", name: "Đăng công khai bản tin cập nhật" },
  { code: "comment.reply", scope: "PROJECT", module: "Tương tác", name: "Trả lời bình luận với nhãn vai trò" },
  { code: "comment.moderate", scope: "PROJECT", module: "Tương tác", name: "Ẩn / xoá bình luận vi phạm trong dự án" },
  { code: "insight.view", scope: "PROJECT", module: "Thống kê AI", name: "Xem bình luận đã được AI phân loại" },
  { code: "stats.view", scope: "PROJECT", module: "Thống kê AI", name: "Xem thống kê, biểu đồ và đánh giá AI" },
  { code: "ai.run", scope: "PROJECT", module: "Thống kê AI", name: "Chạy đánh giá AI & nhận gợi ý điều chỉnh" },
  { code: "backer.view", scope: "PROJECT", module: "Tài chính", name: "Xem danh sách người ủng hộ và địa chỉ giao hàng" },
  { code: "fulfillment.manage", scope: "PROJECT", module: "Tài chính", name: "Cập nhật tiến độ giao quà" },
  { code: "member.manage", scope: "PROJECT", module: "Nhóm", name: "Mời hoặc gỡ Cộng tác viên" },
];

const MEMBER_PERMS = [
  "account.manage", "pledge.create", "pledge.history.view", "project.save", "user.follow",
  "recommendation.view", "comment.create", "message.send", "report.create", "project.create",
];
const ADMIN_PERMS = [
  "account.manage", "admin.dashboard.view", "admin.project.review", "admin.project.takedown",
  "admin.user.lock", "admin.category.manage", "admin.transaction.view", "admin.comment.moderate",
  "admin.report.handle", "admin.scheduler.run", "admin.audit.view",
];
const COLLABORATOR_PERMS = [
  "project.view_private", "faq.manage", "update.draft", "comment.reply", "comment.moderate",
  "insight.view", "stats.view",
];
const CREATOR_PERMS = [
  ...COLLABORATOR_PERMS, "project.edit", "reward.manage", "project.submit", "project.schedule",
  "project.cancel", "project.completion", "update.publish", "ai.run", "backer.view",
  "fulfillment.manage", "member.manage",
];

export const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  MEMBER: MEMBER_PERMS,
  ADMIN: ADMIN_PERMS,
  CREATOR: CREATOR_PERMS,
  COLLABORATOR: COLLABORATOR_PERMS,
};

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];
