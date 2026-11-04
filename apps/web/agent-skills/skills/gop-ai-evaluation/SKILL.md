---
name: gop-ai-evaluation
description: >-
  Thiết kế và kiểm chứng đánh giá cho ba module AI cốt lõi của Góp: gợi ý dự
  án, dự báo đạt mục tiêu và cảnh báo gian lận. Dùng khi có dataset, baseline,
  model hoặc thay đổi điểm dự đoán; không dùng để gắn số liệu giả lên UI mock.
---

# Đánh giá AI cho đề tài Góp

Đọc bản Word và `docs/project-control/08-chuan-prompt-va-human-review.md` để chốt mục tiêu trước. Ba module cốt lõi là recommendation cho Backer, success prediction cho Creator và fraud detection hỗ trợ Admin. Trợ lý viết nội dung/Quick Reply là phần mở rộng, không thay kết quả của ba module này.

## Trước khi đo

1. Ghi rõ dữ liệu đến từ đâu, thời điểm snapshot, nhãn do ai xác nhận, số hàng/người/chiến dịch và quyền sử dụng. Không dùng dữ liệu cá nhân thật hoặc tự bịa kết quả thực nghiệm.
2. Chỉ dùng đặc trưng có thể biết **tại thời điểm dự đoán**. Tách train/validation/test trước khi fit preprocessing; với dữ liệu có thứ tự thời gian, cân nhắc split theo thời gian để tránh nhìn trước kết quả. Xem [scikit-learn về leakage](https://scikit-learn.org/stable/common_pitfalls) và [time-series split](https://scikit-learn.org/stable/modules/cross_validation).
3. Chọn baseline đơn giản và phép đo đúng câu hỏi: recommendation xem chất lượng top-K cùng trường hợp người mới; dự báo thành công xem lỗi phân loại và độ hiệu chỉnh xác suất; fraud xem precision/recall, false positive và số trường hợp phải người duyệt. Báo kết quả theo tập test, không chọn threshold bằng chính tập test. Đối chiếu [scikit-learn metrics](https://scikit-learn.org/stable/modules/model_evaluation.html) và [Hugging Face evaluation considerations](https://huggingface.co/docs/evaluate/considerations) khi chốt thước đo.
4. Lưu phiên bản dataset, code/model, seed, cách chia tập, thời điểm chạy và lệnh tái hiện. So sánh với baseline và vài ca lỗi có ID ẩn danh; nêu giới hạn do dữ liệu nhỏ, lệch lớp hoặc cold start.

## Đưa vào web

API/UI phải giữ `model_version`, `input_snapshot_at`, trạng thái mock hay model thật và lời giải thích ngắn có căn cứ. Cảnh báo gian lận chỉ hỗ trợ Admin xem xét; không tự kết luận hoặc khóa tài khoản theo điểm mô phỏng. Nếu chưa có dataset/model chạy được, bàn giao **kế hoạch đánh giá và phần dữ liệu còn thiếu**, không ghi metric hoặc ảnh kết quả tưởng tượng.
