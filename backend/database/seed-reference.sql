-- =============================================================================
-- FundViet v3 — Dữ liệu tham chiếu (RBAC & Danh mục) cho PostgreSQL 18
-- Đồng bộ 1-1 với apps/web/src/server/db/catalog.ts và seed.ts.
-- An toàn khi chạy lặp lại (idempotent via ON CONFLICT).
-- =============================================================================

BEGIN;

-- 1. Phiên bản lược đồ
INSERT INTO meta (key, value)
VALUES ('schema_version', '3')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Vai trò (2 tầng: SYSTEM & PROJECT)
INSERT INTO roles (code, scope, name, description, badge_color) VALUES
  ('MEMBER',       'SYSTEM',  'Thành viên (Backer)', 'Mọi tài khoản đã đăng nhập. Có toàn bộ quyền Backer và có thể tạo dự án để trở thành Creator của dự án đó.', '#10B981'),
  ('ADMIN',        'SYSTEM',  'Quản trị viên',       'Giám sát nền tảng: duyệt / gỡ dự án, khoá tài khoản, quản lý thể loại, xem giao dịch. Không góp vốn và không đăng nội dung thay Creator.', '#F43F5E'),
  ('CREATOR',      'PROJECT', 'Creator',             'Chủ dự án. Toàn quyền cấu hình, tài chính, nhóm và nội dung của dự án mình tạo.', '#F59E0B'),
  ('COLLABORATOR', 'PROJECT', 'Collaborator',        'Được Creator gán để hỗ trợ vận hành hằng ngày: FAQ, soạn nháp Update, trả lời bình luận, xem thống kê. Không đụng tới tiền, địa chỉ backer, cấu hình dự án.', '#0EA5E9')
ON CONFLICT (code) DO UPDATE SET
  scope = EXCLUDED.scope,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge_color = EXCLUDED.badge_color;

-- 3. Quyền chi tiết (20 quyền SYSTEM + 18 quyền PROJECT = 38 quyền)
INSERT INTO permissions (code, scope, module, name) VALUES
  -- Hệ thống (SYSTEM)
  ('account.manage',         'SYSTEM',  'Tài khoản', 'Quản lý tài khoản cá nhân (username, mật khẩu, email)'),
  ('pledge.create',          'SYSTEM',  'Góp vốn',   'Góp vốn: chọn pledge, add-on, thanh toán'),
  ('pledge.history.view',    'SYSTEM',  'Góp vốn',   'Xem lịch sử góp vốn của chính mình'),
  ('project.save',           'SYSTEM',  'Khám phá',  'Lưu dự án (Save Project)'),
  ('user.follow',            'SYSTEM',  'Khám phá',  'Theo dõi creator'),
  ('recommendation.view',    'SYSTEM',  'Khám phá',  'Xem dự án được đề xuất'),
  ('comment.create',         'SYSTEM',  'Tương tác', 'Bình luận và trả lời trên dự án'),
  ('message.send',           'SYSTEM',  'Tương tác', 'Nhắn tin nội bộ'),
  ('report.create',          'SYSTEM',  'Tương tác', 'Báo cáo vi phạm'),
  ('project.create',         'SYSTEM',  'Dự án',     'Tạo dự án mới (trở thành Creator của dự án đó)'),
  ('admin.dashboard.view',   'SYSTEM',  'Quản trị',  'Xem thống kê toàn hệ thống'),
  ('admin.project.review',   'SYSTEM',  'Quản trị',  'Duyệt dự án trước khi công khai'),
  ('admin.project.takedown', 'SYSTEM',  'Quản trị',  'Gỡ / khôi phục dự án vi phạm'),
  ('admin.user.lock',        'SYSTEM',  'Quản trị',  'Khoá hoặc mở khoá tài khoản'),
  ('admin.category.manage',  'SYSTEM',  'Quản trị',  'Quản lý thể loại'),
  ('admin.transaction.view', 'SYSTEM',  'Quản trị',  'Xem toàn bộ giao dịch'),
  ('admin.comment.moderate', 'SYSTEM',  'Quản trị',  'Xoá bình luận vi phạm trên mọi dự án'),
  ('admin.report.handle',    'SYSTEM',  'Quản trị',  'Xử lý báo cáo vi phạm'),
  ('admin.scheduler.run',    'SYSTEM',  'Quản trị',  'Chạy bộ lập lịch chốt chiến dịch'),
  ('admin.audit.view',       'SYSTEM',  'Quản trị',  'Xem nhật ký hệ thống'),
  -- Dự án (PROJECT)
  ('project.view_private',   'PROJECT', 'Dự án',     'Xem dự án khi chưa công khai (nháp, chờ duyệt)'),
  ('project.edit',           'PROJECT', 'Dự án',     'Sửa campaign, mục tiêu, thời hạn'),
  ('reward.manage',          'PROJECT', 'Dự án',     'Tạo / sửa pledge, reward, add-on'),
  ('project.submit',         'PROJECT', 'Dự án',     'Gửi duyệt dự án'),
  ('project.schedule',       'PROJECT', 'Dự án',     'Đặt ngày bắt đầu và bật trang preview'),
  ('project.cancel',         'PROJECT', 'Dự án',     'Huỷ dự án của mình (trước khi khởi chạy)'),
  ('project.completion',     'PROJECT', 'Dự án',     'Chọn nội dung hiển thị khi dự án hoàn thành'),
  ('faq.manage',             'PROJECT', 'Nội dung',  'Soạn và quản lý FAQ'),
  ('update.draft',           'PROJECT', 'Nội dung',  'Soạn nháp Update'),
  ('update.publish',         'PROJECT', 'Nội dung',  'Đăng (publish) Update công khai'),
  ('comment.reply',          'PROJECT', 'Tương tác', 'Trả lời bình luận với nhãn vai trò'),
  ('comment.moderate',       'PROJECT', 'Tương tác', 'Ẩn / xoá bình luận vi phạm trong dự án'),
  ('insight.view',           'PROJECT', 'AI',        'Xem bình luận AI đã lọc'),
  ('stats.view',             'PROJECT', 'AI',        'Xem thống kê, biểu đồ, dự đoán AI'),
  ('ai.run',                 'PROJECT', 'AI',        'Chạy dự đoán AI & nhận gợi ý điều chỉnh'),
  ('backer.view',            'PROJECT', 'Tài chính', 'Xem danh sách backer và địa chỉ giao hàng'),
  ('fulfillment.manage',     'PROJECT', 'Tài chính', 'Cập nhật giao quà'),
  ('member.manage',          'PROJECT', 'Nhóm',      'Gán hoặc gỡ Collaborator')
ON CONFLICT (code) DO UPDATE SET
  scope = EXCLUDED.scope,
  module = EXCLUDED.module,
  name = EXCLUDED.name;

-- 4. Ma trận phân quyền roles × permissions
INSERT INTO role_permissions (role_code, permission_code, scope) VALUES
  -- MEMBER (10 quyền hệ thống)
  ('MEMBER', 'account.manage',      'SYSTEM'),
  ('MEMBER', 'pledge.create',       'SYSTEM'),
  ('MEMBER', 'pledge.history.view', 'SYSTEM'),
  ('MEMBER', 'project.save',        'SYSTEM'),
  ('MEMBER', 'user.follow',         'SYSTEM'),
  ('MEMBER', 'recommendation.view', 'SYSTEM'),
  ('MEMBER', 'comment.create',      'SYSTEM'),
  ('MEMBER', 'message.send',        'SYSTEM'),
  ('MEMBER', 'report.create',       'SYSTEM'),
  ('MEMBER', 'project.create',      'SYSTEM'),
  -- ADMIN (11 quyền hệ thống)
  ('ADMIN', 'account.manage',         'SYSTEM'),
  ('ADMIN', 'admin.dashboard.view',   'SYSTEM'),
  ('ADMIN', 'admin.project.review',   'SYSTEM'),
  ('ADMIN', 'admin.project.takedown', 'SYSTEM'),
  ('ADMIN', 'admin.user.lock',        'SYSTEM'),
  ('ADMIN', 'admin.category.manage',  'SYSTEM'),
  ('ADMIN', 'admin.transaction.view', 'SYSTEM'),
  ('ADMIN', 'admin.comment.moderate', 'SYSTEM'),
  ('ADMIN', 'admin.report.handle',    'SYSTEM'),
  ('ADMIN', 'admin.scheduler.run',    'SYSTEM'),
  ('ADMIN', 'admin.audit.view',       'SYSTEM'),
  -- COLLABORATOR (7 quyền dự án)
  ('COLLABORATOR', 'project.view_private', 'PROJECT'),
  ('COLLABORATOR', 'faq.manage',           'PROJECT'),
  ('COLLABORATOR', 'update.draft',         'PROJECT'),
  ('COLLABORATOR', 'comment.reply',        'PROJECT'),
  ('COLLABORATOR', 'comment.moderate',     'PROJECT'),
  ('COLLABORATOR', 'insight.view',         'PROJECT'),
  ('COLLABORATOR', 'stats.view',           'PROJECT'),
  -- CREATOR (18 quyền dự án = 7 quyền Collaborator + 11 quyền chủ dự án)
  ('CREATOR', 'project.view_private', 'PROJECT'),
  ('CREATOR', 'faq.manage',           'PROJECT'),
  ('CREATOR', 'update.draft',         'PROJECT'),
  ('CREATOR', 'comment.reply',        'PROJECT'),
  ('CREATOR', 'comment.moderate',     'PROJECT'),
  ('CREATOR', 'insight.view',         'PROJECT'),
  ('CREATOR', 'stats.view',           'PROJECT'),
  ('CREATOR', 'project.edit',         'PROJECT'),
  ('CREATOR', 'reward.manage',        'PROJECT'),
  ('CREATOR', 'project.submit',       'PROJECT'),
  ('CREATOR', 'project.schedule',     'PROJECT'),
  ('CREATOR', 'project.cancel',       'PROJECT'),
  ('CREATOR', 'project.completion',   'PROJECT'),
  ('CREATOR', 'update.publish',       'PROJECT'),
  ('CREATOR', 'ai.run',               'PROJECT'),
  ('CREATOR', 'backer.view',          'PROJECT'),
  ('CREATOR', 'fulfillment.manage',   'PROJECT'),
  ('CREATOR', 'member.manage',        'PROJECT')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 5. Danh mục 8 thể loại (theo biên bản họp 18/11/2026)
INSERT INTO categories (id, name, slug, description, image_url, color, sort_order, is_active) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Nghệ thuật',        'art',     'Hội hoạ, artbook, điêu khắc, nghệ thuật số',       '/v3/categories/art.webp',     '#EC4899', 0, true),
  ('10000000-0000-4000-8000-000000000002', 'Truyện tranh',      'comics',  'Truyện tranh, webtoon, minh hoạ',                  '/v3/categories/comics.webp',  '#F97316', 1, true),
  ('10000000-0000-4000-8000-000000000003', 'Thủ công mỹ nghệ',  'crafts',  'Gốm, mây tre, sơn mài và làng nghề',               '/v3/categories/crafts.webp',  '#D97706', 2, true),
  ('10000000-0000-4000-8000-000000000004', 'Thiết kế',          'design',  'Thiết kế sản phẩm, nội thất, đồ dùng',             '/v3/categories/design.webp',  '#8B5CF6', 3, true),
  ('10000000-0000-4000-8000-000000000005', 'Thời trang',        'fashion', 'Trang phục, giày dép, phụ kiện',                   '/v3/categories/fashion.webp', '#F43F5E', 4, true),
  ('10000000-0000-4000-8000-000000000006', 'Phim ảnh',          'film',    'Phim ngắn, tài liệu, hoạt hình',                   '/v3/categories/film.webp',    '#0EA5E9', 5, true),
  ('10000000-0000-4000-8000-000000000007', 'Game',              'games',   'Board game, video game, thẻ bài',                  '/v3/categories/games.webp',   '#10B981', 6, true),
  ('10000000-0000-4000-8000-000000000008', 'Công nghệ',         'tech',    'Thiết bị thông minh, phần cứng, AI',               '/v3/categories/tech.webp',    '#6366F1', 7, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

COMMIT;
