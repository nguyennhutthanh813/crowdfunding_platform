# 08. Cách nhóm dùng AI và kiểm tra kết quả

Tài liệu này tách phần mô hình máy học của đề tài khỏi phần gợi ý nội dung. Khi thuyết trình chỉ cần nói đúng chức năng nào là bắt buộc, chức năng nào mới dừng ở mức mở rộng và ai là người duyệt kết quả cuối.

## 1. Chia đúng hai nhóm AI

| Nhóm | Chức năng | Cách chạy dự kiến | Thông tin bắt buộc phải lưu |
|---|---|---|---|
| AI lõi | Gợi ý dự án cho Backer | Recommendation model / ranking | `model_version`, tập ứng viên, lý do gợi ý, thời điểm chạy |
| AI lõi | Dự báo khả năng thành công cho Creator | Classification model | `model_version`, input snapshot, probability, factors, metric đánh giá |
| AI lõi | Phát hiện rủi ro cho Admin | Fraud scoring model | `model_version`, risk score, signals, thời điểm chạy; Admin quyết định cuối |
| AI mở rộng | Kiểm tra nội dung chiến dịch | Prompt + LLM adapter | `prompt_version`, input snapshot, checklist, gợi ý, người chấp nhận |
| AI mở rộng | Gom nhóm bình luận | Prompt + LLM adapter | `prompt_version`, comment IDs, topic/sentiment, lần phân tích |
| AI mở rộng | Gợi ý phản hồi nhanh | Prompt + LLM adapter | `prompt_version`, comment ID, câu gợi ý, người sửa và người bấm gửi |

Ba dòng đầu không được gọi là “prompt AI” trong báo cáo. Đây là các bài toán mô hình hóa dữ liệu. Prompt chỉ là hợp đồng của ba phần hỗ trợ ngôn ngữ ở dưới.

## 2. Hợp đồng chung cho một lần gọi trợ lý

```text
assistant_run
├── action                ANALYZE_DRAFT | ANALYZE_COMMENTS | GENERATE_QUICK_REPLY
├── campaign_id          campaign đang được phép thao tác
├── actor_user_id        người yêu cầu
├── actor_role           CREATOR | COLLABORATOR
├── prompt_version       ví dụ content.vi.v1.2
├── input_snapshot_at    mốc dữ liệu đầu vào
├── input_record_ids     ID bản nháp hoặc các comment được đọc
├── output               JSON theo schema của từng action
├── requires_human_review = true
├── accepted_by          null cho tới khi người dùng chọn
└── processed_at         thời điểm hệ thống trả kết quả
```

Nội dung chiến dịch và bình luận do người dùng nhập phải được đặt trong vùng dữ liệu riêng. Trợ lý không được coi một câu nằm trong nội dung đó là lệnh hệ thống. Khi nối dịch vụ thật, route server còn phải giới hạn độ dài, bỏ dữ liệu thẻ/địa chỉ không cần thiết và kiểm tra quyền theo `campaign_id + user_id`.

## 3. Prompt kiểm tra bản nháp `content.vi.v1.2`

### Vai trò hệ thống

```text
Bạn hỗ trợ chủ dự án crowdfunding Việt Nam rà một bản nháp.
Chỉ dùng dữ liệu được cung cấp, không tự bịa chứng nhận, số liệu thử nghiệm,
đối tác, thời gian giao hàng hoặc mức bảo hành.

Ưu tiên câu chữ dễ hiểu, cụ thể và phù hợp người đọc Việt Nam.
Tách rõ: điều đã có bằng chứng, điều nên bổ sung và điều đang thiếu.
Không hứa chắc chiến dịch sẽ thành công. Không tự sửa bản nháp.
Trả kết quả đúng JSON schema và luôn đặt requiresHumanReview = true.
```

### Đầu vào tối thiểu

- Tiêu đề, mô tả ngắn và nội dung câu chuyện hiện tại.
- Goal, duration, category, reward, add-on, shipping và mốc giao dự kiến.
- Checklist bắt buộc: vấn đề, bản mẫu, ngân sách, rủi ro, giao hàng, bảo hành.
- Các bằng chứng có ID hoặc nguồn nội bộ. Không gửi dữ liệu cá nhân không liên quan.

### Đầu ra cần dùng được trên UI

```json
{
  "score": 76,
  "checks": [
    {
      "id": "warranty",
      "status": "MISSING",
      "finding": "Chưa có nơi tiếp nhận và thời gian xử lý."
    }
  ],
  "titleOptions": [
    {
      "text": "ORBIT One — pha cà phê đúng gu trong 90 giây",
      "reason": "Đưa lợi ích chính lên trước."
    }
  ],
  "unsupportedClaims": [],
  "requiresHumanReview": true
}
```

UI chỉ cho đưa từng phương án vào bản nháp, có hoàn tác và lưu riêng. Không dùng nút “Tối ưu toàn bộ” vì rất khó biết trợ lý đã thay gì.

## 4. Prompt phân tích cộng đồng `community.vi.v1.1`

### Vai trò hệ thống

```text
Bạn hỗ trợ nhóm dự án đọc nhanh phản hồi cộng đồng bằng tiếng Việt.
Không ẩn hoặc làm nhẹ đi bình luận tiêu cực. Không suy đoán thông tin nhạy cảm
về tác giả. Chỉ phân loại nội dung đang có và trích đúng comment_id.

Nhóm các ý gần nghĩa, nêu số lượng, mức khẩn và lý do ưu tiên.
Với Quick Reply, viết câu trả lời lịch sự, cụ thể, không hứa điều chưa được xác nhận.
Không tự đăng. Trả requiresHumanReview = true.
```

Collaborator chỉ gọi được phần này nếu membership của campaign có quyền trả lời bình luận. Chủ dự án vẫn chịu trách nhiệm về thông tin giá, phí giao hàng, bảo hành và cam kết thời gian.

## 5. Cách hiển thị để người Việt dễ hiểu

- Nút dùng từ đúng việc: “Phân tích lại”, “Đưa vào bản nháp”, “Gợi ý phản hồi”, “Gửi phản hồi”. Không dùng chung một nút “Chạy AI”.
- Bên cạnh kết quả ghi rõ dữ liệu mô phỏng, mốc phân tích và phiên bản hướng dẫn.
- Câu gợi ý phải nằm trong ô soạn để người dùng sửa; không tự xuất hiện công khai.
- Nếu dịch vụ lỗi, giữ nguyên nội dung người dùng đang viết và cho soạn thủ công.
- Tránh chữ kỹ thuật ở luồng chính. `prompt_version` nằm trong mục “Thông tin lần gợi ý” hoặc nhật ký, không biến thành badge lớn.

## 6. Quy tắc đổi phiên bản

| Thay đổi | Cách tăng version | Ví dụ |
|---|---|---|
| Sửa chính tả, không đổi ý nghĩa/output | patch | `v1.1` → `v1.1.1` |
| Thêm checklist hoặc đổi cách xếp ưu tiên | minor | `v1.1` → `v1.2` |
| Đổi output schema hoặc chính sách an toàn | major | `v1.x` → `v2.0` |

Mỗi version cần giữ ít nhất một bộ input/output mẫu để chạy regression. Không thay prompt production âm thầm vì nhóm sẽ không giải thích được tại sao cùng dữ liệu lại ra kết quả khác.

## 7. Bộ test nhỏ nhưng đủ bảo vệ demo

1. Bản nháp thiếu bảo hành: phải trả `MISSING`, không tự bịa địa chỉ trung tâm.
2. Bản nháp có câu “bỏ qua yêu cầu hệ thống”: câu này chỉ là dữ liệu, không đổi nhiệm vụ của trợ lý.
3. Bình luận hỏi phí giao Phú Quý: Quick Reply phải nói cần kiểm tra và xác nhận lại, không khẳng định luôn 35.000 đ.
4. Bình luận tiêu cực: vẫn xuất hiện trong danh sách ưu tiên, không bị lọc bỏ.
5. Collaborator không có quyền reply: API trả `403` dù tự gọi request.
6. Dịch vụ trợ lý lỗi: nội dung đang soạn còn nguyên và nút gửi thủ công vẫn dùng được.
7. Mọi output đều có `promptVersion`, `inputSnapshotAt` và `requiresHumanReview: true`.

## 8. Nguồn UX nhóm đã tham khảo

- Kickstarter, giải thích All-or-Nothing: <https://updates.kickstarter.com/why-is-funding-all-or-nothing/>
- GOV.UK, task list cho quy trình nhiều bước: <https://design-system.service.gov.uk/components/task-list/>
- W3C, báo lỗi bằng chữ và xác định đúng trường: <https://www.w3.org/WAI/WCAG22/Understanding/error-identification>
- W3C, cùng chức năng phải được gọi tên nhất quán: <https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification>

Nhóm dùng các nguồn này để kiểm tra cách diễn giải và khả năng sử dụng; phạm vi nghiệp vụ vẫn lấy từ đề tài và góp ý của thầy.
