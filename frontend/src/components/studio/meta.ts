/** Hằng số dùng chung cho Studio (server + client): nhãn quyền, lý do khoá, tab, vòng đời. */

/** Lý do hiển thị khi một thao tác bị khoá vì thiếu quyền dự án. */
export const LOCK_REASON: Record<string, string> = {
  "project.edit": "Chỉ Chủ dự án mới sửa được nội dung, mục tiêu và thời hạn.",
  "reward.manage": "Chỉ Chủ dự án mới quản lý được mức quà & quà kèm.",
  "project.submit": "Chỉ Chủ dự án mới gửi duyệt được dự án.",
  "project.schedule": "Chỉ Chủ dự án mới đặt lịch mở và bật trang xem trước.",
  "project.cancel": "Chỉ Chủ dự án mới huỷ / xoá được dự án.",
  "project.completion": "Chỉ Chủ dự án mới chọn nội dung hiển thị khi hoàn thành.",
  "update.publish": "Chỉ Chủ dự án mới đăng được bản cập nhật công khai — bạn có thể soạn nháp để Chủ dự án duyệt.",
  "update.draft": "Bạn không có quyền soạn bản cập nhật.",
  "faq.manage": "Bạn không có quyền quản lý hỏi đáp.",
  "comment.reply": "Bạn không có quyền trả lời bình luận.",
  "comment.moderate": "Bạn không có quyền ẩn bình luận.",
  "insight.view": "Bạn không có quyền xem phân loại góp ý.",
  "stats.view": "Bạn không có quyền xem thống kê.",
  "ai.run": "Chỉ Chủ dự án mới chạy lại đánh giá sẵn sàng — bạn đang xem bản gần nhất.",
  "backer.view": "Chỉ Chủ dự án mới xem được danh sách người ủng hộ và địa chỉ giao hàng.",
  "fulfillment.manage": "Chỉ Chủ dự án mới cập nhật giao quà.",
  "member.manage": "Chỉ Chủ dự án mới mời hoặc gỡ Cộng tác viên.",
};

export type StudioTabKey = "overview" | "content" | "rewards" | "updates" | "faq" | "comments" | "backers" | "fulfillment" | "team" | "settings";

export const STUDIO_TABS: { key: StudioTabKey; label: string; perm: string }[] = [
  { key: "overview", label: "Tổng quan", perm: "insight.view" },
  { key: "content", label: "Nội dung", perm: "project.edit" },
  { key: "rewards", label: "Phần quà", perm: "reward.manage" },
  { key: "updates", label: "Cập nhật", perm: "update.draft" },
  { key: "faq", label: "Hỏi đáp", perm: "faq.manage" },
  { key: "comments", label: "Bình luận", perm: "comment.reply" },
  { key: "backers", label: "Người ủng hộ", perm: "backer.view" },
  { key: "fulfillment", label: "Giao quà", perm: "fulfillment.manage" },
  { key: "team", label: "Nhóm", perm: "member.manage" },
  { key: "settings", label: "Cài đặt & lịch", perm: "project.schedule" },
];

/** Các bước vòng đời hiển thị trên stepper ngang. */
export const LIFECYCLE_STEPS = [
  { key: "draft", label: "Nháp", statuses: ["DRAFT", "REJECTED"] },
  { key: "review", label: "Chờ duyệt", statuses: ["PENDING_REVIEW"] },
  { key: "scheduled", label: "Sắp mở", statuses: ["SCHEDULED"] },
  { key: "live", label: "Đang gọi vốn", statuses: ["LIVE", "SUSPENDED"] },
  { key: "result", label: "Kết quả", statuses: ["SUCCESS", "FAILED"] },
  { key: "fulfilling", label: "Giao quà", statuses: ["FULFILLING"] },
  { key: "done", label: "Hoàn thành", statuses: ["COMPLETED"] },
] as const;

export const EDITABLE_FUNDING = ["DRAFT", "REJECTED"];
export const PRE_LAUNCH = ["DRAFT", "PENDING_REVIEW", "REJECTED", "SCHEDULED"];

export const GOAL_CHIPS = [10_000_000, 30_000_000, 50_000_000, 100_000_000, 200_000_000, 500_000_000];

/** Thư viện ảnh bìa có sẵn (ảnh 3D trong public/v3). */
export const COVER_GALLERY = [
  "/v3/projects/orbit-one.webp", "/v3/projects/moc-lamp.webp", "/v3/projects/loa-tre.webp", "/v3/projects/chu-cuoi.webp",
  "/v3/projects/ao-dai-sen.webp", "/v3/projects/balo-mekong.webp", "/v3/projects/bep-may.webp", "/v3/projects/gom-men-lam.webp",
  "/v3/projects/hiep-si-pho-co.webp", "/v3/projects/lac-viet.webp", "/v3/projects/meo-mun-di-hoc.webp", "/v3/projects/pulse-band.webp",
  "/v3/projects/robot-ti-hon.webp", "/v3/projects/sac-mau-ba-mien.webp", "/v3/projects/non-la-led.webp", "/v3/projects/nguoi-giu-rung.webp",
  "/v3/categories/art.webp", "/v3/categories/comics.webp", "/v3/categories/crafts.webp", "/v3/categories/design.webp",
  "/v3/categories/fashion.webp", "/v3/categories/film.webp", "/v3/categories/games.webp", "/v3/categories/tech.webp",
];

export const WIZARD_STEPS = [
  { n: 1, label: "Cơ bản", hint: "Tên, thể loại, ảnh bìa" },
  { n: 2, label: "Nội dung", hint: "Câu chuyện & rủi ro" },
  { n: 3, label: "Phần quà", hint: "Mức quà & quà kèm" },
  { n: 4, label: "Mục tiêu & lịch", hint: "Số tiền, thời lượng" },
  { n: 5, label: "Xem lại", hint: "Đánh giá & gửi duyệt" },
] as const;

export const COMMENT_FILTERS = [
  { key: "action", label: "Cần xử lý" },
  { key: "QUESTION", label: "Câu hỏi" },
  { key: "SUGGESTION", label: "Góp ý" },
  { key: "ISSUE", label: "Vấn đề" },
  { key: "PRAISE", label: "Khen ngợi" },
  { key: "SPAM", label: "Spam" },
  { key: "handled", label: "Đã xử lý" },
  { key: "all", label: "Tất cả" },
] as const;

export const SENTIMENT_META: Record<string, { label: string; emoji: string; tone: "emerald" | "slate" | "rose" }> = {
  POSITIVE: { label: "Tích cực", emoji: "😊", tone: "emerald" },
  NEUTRAL: { label: "Trung lập", emoji: "😐", tone: "slate" },
  NEGATIVE: { label: "Tiêu cực", emoji: "😟", tone: "rose" },
};

export const isLocalImage = (src: string | null | undefined) => Boolean(src && src.startsWith("/"));
