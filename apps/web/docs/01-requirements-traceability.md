# Truy vết yêu cầu và phạm vi đã chốt

## 1. Quy tắc ưu tiên nguồn

Các nguồn có khác biệt về phạm vi AI. Khi mâu thuẫn, dự án dùng thứ tự ưu tiên sau:

1. `ĐỀ TÀI - BẢN CẬP NHẬT.docx` là bản mô tả chính thức và mới hơn.
2. Hai transcript ngày 28/08/2026 được dùng để kiểm tra lại những yêu cầu thầy đã nói trực tiếp.
3. `tong_hop_yeu_cau_de_tai.md` dùng để bổ sung và hệ thống hóa ngữ cảnh từ các buổi trao đổi.
4. Ở giai đoạn hiện tại, nhóm tập trung vào Web responsive, UI/UX và lớp API dùng dữ liệu mẫu; chưa tích hợp tiền thật hoặc mô hình đã huấn luyện.

| Nội dung            | File tổng hợp Markdown               | Bản Word cập nhật                                             | Quyết định triển khai                               |
| ------------------- | ------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------- |
| AI cho Backer       | Không phải module chính              | Recommendation là module chính                                | Bắt buộc                                            |
| AI cho Creator      | Success Predictor và tối ưu nội dung | Success Predictor là module chính; tối ưu nội dung là mở rộng | Predictor bắt buộc; content helper đã có UI + mock  |
| AI cho Admin        | Chưa chốt Fraud Detection            | Fraud Detection là module chính                               | Bắt buộc                                            |
| Phân tích bình luận | Module chính trong bản tổng hợp      | Chỉ triển khai khi còn thời gian                              | Đã có UI + mock; NLP/model thật thuộc backlog       |
| Mobile              | Có thể cân nhắc Flutter              | Không làm app riêng; responsive, PWA cơ bản nếu kịp           | Chỉ Web responsive                                  |
| Backend             | NestJS hoặc FastAPI                  | NestJS cho nghiệp vụ, FastAPI cho AI                          | Giữ ranh giới API để thay mock bằng hai service này |

## 2. Phạm vi MVP phù hợp nhóm hai thành viên

### Bắt buộc

- Auth và RBAC cho Guest, Backer, Creator, Admin; Collaborator được gán theo từng campaign.
- Campaign Draft → In Review → Pre-launch → Live → Successful hoặc Failed.
- Reward, Add-on, shipping Việt Nam và pledge không nhận quà.
- All-or-Nothing với trạng thái authorize, capture hoặc cancel trong Stripe Sandbox.
- Trang chi tiết dự án có đủ Story, Rewards, Creator, FAQ, Updates, Comments và Community.
- Backer, Creator và Admin dashboard.
- Recommendation, Success Prediction và Fraud Detection có model version, input snapshot và metric đánh giá.
- Database Schema, Use Case Diagram, mock data, API contract và bản deploy.

### Nên có nếu luồng chính ổn định

- PWA manifest, cài đặt trên màn hình chính.
- Xuất danh sách fulfillment.
- Email notification chạy qua queue.
- Baseline recommendation và dashboard so sánh model.
- Trợ lý kiểm tra bản nháp và gom nhóm phản hồi cộng đồng bằng tiếng Việt.

### Không cam kết trong phạm vi

- Mobile Flutter, tiền thật, KYC, creator payout và logistics quốc tế.
- WebSocket chat real-time.
- Hệ thống tự khóa tài khoản dựa trên AI.
- Mô hình LLM/NLP thật cho tối ưu nội dung, intent classification và AI Quick Reply. UI, contract và dữ liệu mô phỏng đã có nhưng không tính là model hoàn chỉnh.

## 3. Ma trận truy vết chức năng

| Mã    | Yêu cầu                                              | Bảng dữ liệu chính                                                                           | API hiện tại                                                    | Màn hình                                              |
| ----- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| FR-00 | Đăng ký, đăng nhập và một tài khoản có nhiều vai trò | `users`, `user_roles`, `campaign_members`                                                    | `POST /api/v1/auth/session`                                     | `/auth`, thanh chuyển vai trò                         |
| FR-01 | Khám phá, tìm, lọc campaign                          | `campaigns`, `categories`                                                                    | `GET /api/v1/campaigns`                                         | `/`, `/discover`                                      |
| FR-02 | Trang dự án 7 tab                                    | `campaigns`, `reward_tiers`, `campaign_faqs`, `campaign_updates`, `comments`                 | `GET /api/v1/campaigns/:slug`                                   | `/projects/:slug`                                     |
| FR-03 | Save, Follow, Notify                                 | `saved_campaigns`, `creator_follows`, `prelaunch_subscriptions`                              | `POST /api/v1/me/dashboard`; Save/Follow được giữ trong phiên   | Home, Project Detail, Dashboard                       |
| FR-04 | Pledge 4 bước                                        | `pledges`, `pledge_add_ons`, `addresses`                                                     | `POST /api/v1/pledges/authorize`                                | `/pledge/:slug`                                       |
| FR-05 | All-or-Nothing                                       | `payment_authorizations`, `payment_events`, `campaign_status_history`                        | Response `AUTHORIZED`; capture/cancel thuộc worker tương lai    | Pledge success, Backed Projects                       |
| FR-06 | Collaborator theo campaign                           | `campaign_members`                                                                           | `POST /api/v1/creator/operations`                               | Creator Wizard, Campaign Operations và Comments badge |
| FR-07 | Campaign lifecycle và moderation                     | `campaigns`, `campaign_reviews`, `campaign_status_history`                                   | `POST /api/v1/creator/operations`, `POST /api/v1/admin/actions` | Creator Wizard, Campaign Operations, Admin Console    |
| FR-08 | Recommendation Top-N                                 | `interaction_events`, `recommendation_results`, `ai_model_versions`                          | Campaign list kèm `recommendationReason`                        | Home, Discover                                        |
| FR-09 | Success Prediction                                   | `daily_campaign_metrics`, `campaign_predictions`, `prediction_factors`                       | `GET /api/v1/creator/ai`                                        | `/creator/ai`                                         |
| FR-10 | Fraud Detection                                      | `fraud_alerts`, `fraud_signals`, `moderation_actions`                                        | `GET /api/v1/admin/overview`, `POST /api/v1/admin/actions`      | `/admin`                                              |
| FR-11 | Backed, Saved, Following, Message, Activity          | `pledges`, `fulfillments`, `saved_campaigns`, `creator_follows`, `messages`, `notifications` | `GET, POST /api/v1/me/dashboard`                                | `/dashboard`                                          |
| FR-12 | Responsive Web và PWA cơ bản                         | Không áp dụng                                                                                | `GET /manifest.webmanifest`                                     | Toàn bộ giao diện                                     |
| FR-13 | Hỗ trợ kiểm tra nội dung bản nháp                    | Mở rộng sau: content analysis snapshot                                                       | `GET, POST /api/v1/creator/assistant`                           | `/creator/ai#content-assistant`                       |
| FR-14 | Gom nhóm bình luận và gợi ý phản hồi có người duyệt  | Mở rộng sau: comment insight và generated reply                                              | `GET, POST /api/v1/creator/assistant`                           | Màn cộng đồng của Creator/Collaborator                |

## 4. Chia việc cho hai thành viên

| Thành viên   | Trách nhiệm chính                                                   | Phần giao nhau cần review chéo                         |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------------ |
| Thành viên A | Next.js UI, Auth/RBAC phía Web, campaign, reward, pledge, dashboard | API contract, trạng thái payment, test E2E             |
| Thành viên B | NestJS/PostgreSQL, Stripe Sandbox, FastAPI và ba pipeline AI        | API contract, feature schema, logging và model metrics |

Hai người cùng chịu trách nhiệm cho Use Case, ERD, seed data, kịch bản demo đạt Goal/không đạt Goal và báo cáo đánh giá model.

## 5. Kịch bản bảo vệ tối thiểu

1. Creator tạo draft, cấu hình hai reward và chạy Success Prediction.
2. Creator gửi duyệt; Admin yêu cầu sửa hoặc duyệt sang Pre-launch.
3. Backer nhận recommendation, xem trang 7 tab và tạo pledge.
4. Hệ thống ghi `AUTHORIZED`, thể hiện rõ chưa thu tiền.
5. Chạy hai fixture: campaign đạt Goal → capture; campaign không đạt → cancel.
6. Admin mở fraud alert, xem signals và chọn Clear hoặc Escalate; action được ghi audit.
