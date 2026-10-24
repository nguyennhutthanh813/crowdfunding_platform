import type { CampaignDetail } from "../contracts";
import { campaigns, orbitDetail } from "./fixtures";

type DetailSeed = Pick<
  CampaignDetail,
  | "story"
  | "rewards"
  | "addOns"
  | "faqs"
  | "updates"
  | "comments"
  | "team"
  | "community"
  | "dailyFunding"
>;

function campaign(id: string) {
  const item = campaigns.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Không tìm thấy dữ liệu mẫu cho ${id}`);
  return item;
}

function detail(id: string, seed: DetailSeed): CampaignDetail {
  return { ...campaign(id), ...seed };
}

const lacViet = detail("cmp_lacviet", {
  story: {
    lead: "Lạc Việt là một board game chiến thuật dành cho 2–5 người, lấy cảm hứng từ hành trình qua 12 vùng văn hóa và những câu chuyện dân gian Việt Nam.",
    paragraphs: [
      "Nhóm bắt đầu từ những buổi chơi thử với sinh viên ở Hà Nội. Bản đầu có quá nhiều chữ và một ván kéo dài gần ba giờ; sau sáu vòng sửa, thời lượng còn khoảng 75 phút và phần luật đã dễ tiếp cận hơn với người mới.",
      "Toàn bộ nhân vật và bản đồ được họa sĩ trong nước vẽ mới. Nhóm có tham khảo tư liệu địa phương và nhờ hai cố vấn nội dung đọc lại để tránh ghép trang phục, kiến trúc hoặc phong tục sai vùng.",
      "Khoản gọi vốn dùng để in tối thiểu 700 hộp, làm khuôn quân cờ và hoàn thiện sách luật song ngữ Việt–Anh. Bản thương mại chỉ được gửi in khi mẫu màu cuối đã được cộng đồng chơi thử xác nhận.",
    ],
    highlights: [
      {
        title: "2–5 người",
        description: "Chơi theo nhóm nhỏ, có chế độ đi đôi cho hai người.",
      },
      {
        title: "75 phút",
        description: "Thời lượng trung bình sau sáu vòng playtest.",
      },
      {
        title: "100%",
        description: "Minh họa mới do nhóm họa sĩ Việt Nam thực hiện.",
      },
    ],
    fundingPlan: [
      {
        label: "In 700 hộp và khuôn quân cờ",
        percent: 45,
        amount: 126_000_000,
        detail: "In tại xưởng ở Bắc Ninh, gồm hộp, bàn chơi, thẻ và quân cờ.",
      },
      {
        label: "Minh họa và biên tập",
        percent: 20,
        amount: 56_000_000,
        detail:
          "Hoàn thiện 96 lá bài, sách luật và kiểm tra tư liệu vùng miền.",
      },
      {
        label: "Đóng gói và giao hàng",
        percent: 20,
        amount: 56_000_000,
        detail: "Thùng chống móp và phí gom đơn trong nước.",
      },
      {
        label: "Thuế, phí và vận hành",
        percent: 10,
        amount: 28_000_000,
        detail: "Phí nền tảng thử nghiệm, kế toán và chăm sóc người ủng hộ.",
      },
      {
        label: "Dự phòng",
        percent: 5,
        amount: 14_000_000,
        detail: "Bù hao hụt in và thay thế linh kiện trò chơi bị lỗi.",
      },
    ],
    evidence: [
      {
        label: "Bản chơi thử",
        status: "VERIFIED",
        detail: "Đã thử 34 buổi với 126 người chơi.",
      },
      {
        label: "Báo giá xưởng in",
        status: "VERIFIED",
        detail: "Báo giá cho mốc 700 và 1.000 hộp còn hiệu lực.",
      },
      {
        label: "Sách luật song ngữ",
        status: "IN_PROGRESS",
        detail: "Bản tiếng Việt đã khóa; tiếng Anh đang hiệu đính.",
      },
      {
        label: "Mẫu màu cuối",
        status: "PLANNED",
        detail: "In sau khi chiến dịch kết thúc và chốt số lượng.",
      },
    ],
    roadmap: [
      {
        period: "03–07/2026",
        title: "Làm bản mẫu và sáu vòng chơi thử",
        status: "done",
      },
      {
        period: "08–09/2026",
        title: "Khóa minh họa và sách luật",
        status: "now",
      },
      {
        period: "10–12/2026",
        title: "In, kiểm hàng và giao trong nước",
        status: "next",
      },
    ],
    risks:
      "Màu in có thể lệch giữa các lô và khuôn quân cờ cần sửa nếu chi tiết quá nhỏ. Nhóm đã dành hai tuần cho mẫu màu, giữ quân dự phòng 3% và sẽ công khai ảnh kiểm hàng trước khi đóng gói.",
  },
  rewards: [
    {
      id: "lv_support",
      title: "Góp một chuyến đi",
      description: "Nhận bộ hình nền và tên trong trang cảm ơn.",
      amount: 120_000,
      estimatedDelivery: "Tháng 10/2026",
      items: ["06 hình nền", "Tên trong trang cảm ơn"],
      claimed: 91,
    },
    {
      id: "lv_standard",
      title: "Lạc Việt — bản tiêu chuẩn",
      description: "Một hộp hoàn chỉnh dành cho 2–5 người.",
      amount: 690_000,
      estimatedDelivery: "Tháng 12/2026",
      items: ["01 hộp Lạc Việt", "Sách luật Việt–Anh", "Gói thẻ địa danh"],
      limit: 700,
      claimed: 516,
      featured: true,
    },
    {
      id: "lv_collector",
      title: "Lạc Việt — bản sưu tầm",
      description: "Bản tiêu chuẩn kèm quân kim loại và artbook đánh số.",
      amount: 1_290_000,
      estimatedDelivery: "Tháng 01/2027",
      items: ["01 hộp Lạc Việt", "Bộ quân kim loại", "Artbook có số thứ tự"],
      limit: 180,
      claimed: 142,
    },
  ],
  addOns: [
    {
      id: "lv_sleeve",
      title: "Bộ bọc thẻ",
      description: "Đủ cho toàn bộ thẻ trong hộp.",
      amount: 120_000,
    },
    {
      id: "lv_coin",
      title: "Bộ 24 đồng kim loại",
      description: "Thay cho token giấy trong bản tiêu chuẩn.",
      amount: 250_000,
    },
  ],
  faqs: [
    {
      question: "Trò chơi có phù hợp với người mới không?",
      answer:
        "Có. Sách luật có ván hướng dẫn 30 phút và mã QR dẫn tới video tiếng Việt.",
    },
    {
      question: "Nội dung văn hóa được kiểm tra như thế nào?",
      answer:
        "Nhóm ghi nguồn tư liệu và nhờ hai cố vấn nội dung đọc lại trước khi khóa bản in.",
    },
    {
      question: "Nếu không đạt mục tiêu thì sao?",
      answer: "Cam kết sẽ được hủy và người ủng hộ không bị thu tiền.",
    },
  ],
  updates: [
    {
      id: "lv_up_2",
      title: "Mẫu quân cờ lần hai đã dễ phân biệt hơn",
      excerpt: "Nhóm tăng kích thước ký hiệu và thử lại với người chơi mới.",
      publishedAt: "2026-09-08T20:00:00+07:00",
      commentCount: 22,
    },
    {
      id: "lv_up_1",
      title: "Công bố bản sách luật tiếng Việt",
      excerpt:
        "Bản PDF được mở để cộng đồng góp ý lỗi diễn đạt trong bảy ngày.",
      publishedAt: "2026-08-28T19:30:00+07:00",
      commentCount: 41,
    },
  ],
  comments: [
    {
      id: "lv_cm_1",
      author: "Đặng Quốc Bảo",
      initials: "QB",
      badge: "SUPERBACKER",
      body: "Nhóm có dự định làm video một ván mẫu trước khi chiến dịch kết thúc không?",
      createdAt: "3 giờ trước",
      likes: 14,
    },
    {
      id: "lv_cm_2",
      author: "Lạc Studio",
      initials: "LS",
      badge: "CREATOR",
      body: "Có bạn nhé, video đang dựng và dự kiến đăng trong update cuối tuần này.",
      createdAt: "2 giờ trước",
      likes: 11,
    },
  ],
  team: [
    {
      name: "Trần Đức Minh",
      role: "Chủ dự án · Thiết kế game",
      initials: "ĐM",
    },
    { name: "Hoàng Yến Chi", role: "Cộng tác viên · Minh họa", initials: "YC" },
    { name: "Phạm Gia Hân", role: "Cộng tác viên · Nội dung", initials: "GH" },
  ],
  community: {
    newBackerPercent: 58,
    returningBackerPercent: 42,
    topCities: [
      { name: "Hà Nội", backers: 318 },
      { name: "TP. Hồ Chí Minh", backers: 244 },
      { name: "Đà Nẵng", backers: 81 },
      { name: "Huế", backers: 66 },
    ],
  },
  dailyFunding: [
    { date: "12/08", amount: 42_000_000 },
    { date: "17/08", amount: 91_000_000 },
    { date: "22/08", amount: 148_000_000 },
    { date: "27/08", amount: 203_000_000 },
    { date: "01/09", amount: 257_000_000 },
    { date: "08/09", amount: 301_400_000 },
  ],
});

const moc = detail("cmp_moc", {
  story: {
    lead: "Mộc 02 là chiếc đèn bàn có thể tháo từng cụm để sửa, dùng gỗ tái sinh từ xưởng nội thất và ánh sáng dịu cho góc học tập nhỏ.",
    paragraphs: [
      "Mỗi tháng các xưởng nội thất bỏ lại khá nhiều miếng gỗ chưa đủ lớn để làm bàn ghế. Mộc Lab thu gom, ghép lại thành thân đèn và giữ nguyên những vết màu nhỏ thay vì phủ kín như gỗ mới.",
      "Bản mẫu dùng khớp cơ khí, không dán keo ở cụm cần sửa. Dải LED, bộ nguồn và công tắc đều có mã linh kiện để người dùng đặt thay riêng khi hết bảo hành.",
      "Chiến dịch khép lại ở 172 triệu đồng, chưa đủ mốc 450 triệu để sản xuất an toàn. Toàn bộ cam kết đã được hủy; nhóm giữ trang này để công khai số liệu và những phần cần làm lại trước lần thử tiếp theo.",
    ],
    highlights: [
      { title: "72%", description: "Khối lượng gỗ lấy từ phần dư của xưởng." },
      {
        title: "3 cụm",
        description: "Nguồn, LED và công tắc có thể thay độc lập.",
      },
      {
        title: "8 W",
        description: "Công suất đủ cho bàn học và góc làm việc nhỏ.",
      },
    ],
    fundingPlan: [
      {
        label: "Gỗ và gia công lô 400 đèn",
        percent: 46,
        amount: 207_000_000,
        detail: "Thu gom, sấy lại, gia công thân và chân đèn.",
      },
      {
        label: "LED, nguồn và dây điện",
        percent: 27,
        amount: 121_500_000,
        detail: "Mua theo lô và kiểm tra an toàn từng bộ nguồn.",
      },
      {
        label: "Đóng gói và giao hàng",
        percent: 14,
        amount: 63_000_000,
        detail: "Khay giấy tổ ong và phí vận chuyển trong Việt Nam.",
      },
      {
        label: "Vận hành và thuế",
        percent: 8,
        amount: 36_000_000,
        detail: "Chi phí xưởng, kế toán và hỗ trợ sau giao.",
      },
      {
        label: "Dự phòng",
        percent: 5,
        amount: 22_500_000,
        detail: "Thay gỗ nứt và linh kiện lỗi khi kiểm hàng.",
      },
    ],
    evidence: [
      {
        label: "Bản mẫu chiếu sáng",
        status: "VERIFIED",
        detail: "Đã dùng thử liên tục 500 giờ.",
      },
      {
        label: "Nguồn gỗ tái sinh",
        status: "VERIFIED",
        detail: "Có thỏa thuận thu gom với hai xưởng ở Đà Nẵng.",
      },
      {
        label: "Kiểm tra bộ nguồn",
        status: "IN_PROGRESS",
        detail: "Đang thử mẫu từ hai nhà cung cấp.",
      },
      {
        label: "Khay đóng gói",
        status: "PLANNED",
        detail: "Chốt sau khi khóa kích thước thân đèn.",
      },
    ],
    roadmap: [
      {
        period: "01–03/2026",
        title: "Thử ba loại khớp và hai dải LED",
        status: "done",
      },
      {
        period: "04–05/2026",
        title: "Mở gọi vốn và kết thúc ở 38% mục tiêu",
        status: "now",
      },
      {
        period: "Sau chiến dịch",
        title: "Giảm quy mô lô đầu và tìm thêm đối tác xưởng",
        status: "next",
      },
    ],
    risks:
      "Gỗ tái sinh không đồng đều màu và có thể cong sau khi gia công. Nhóm đo độ ẩm trước khi cắt, dự trữ thêm 8% vật liệu và cho phép đổi thân đèn nếu nứt trong lúc vận chuyển.",
  },
  rewards: [
    {
      id: "moc_support",
      title: "Một mẩu gỗ được dùng lại",
      description: "Nhận postcard số và tên trong trang cảm ơn.",
      amount: 100_000,
      estimatedDelivery: "Tháng 10/2026",
      items: ["Postcard số", "Tên trong trang cảm ơn"],
      claimed: 39,
    },
    {
      id: "moc_standard",
      title: "Mộc 02 — bản tiêu chuẩn",
      description: "Một đèn màu gỗ tự nhiên, ánh sáng vàng trung tính.",
      amount: 890_000,
      estimatedDelivery: "Tháng 12/2026",
      items: ["01 đèn Mộc 02", "Bộ nguồn", "Bảo hành 12 tháng"],
      limit: 400,
      claimed: 163,
      featured: true,
    },
    {
      id: "moc_duo",
      title: "Mộc 02 — bộ đôi",
      description: "Hai đèn, phù hợp cho bàn làm việc chung.",
      amount: 1_650_000,
      estimatedDelivery: "Tháng 01/2027",
      items: ["02 đèn Mộc 02", "02 bộ nguồn", "Bảo hành 18 tháng"],
      limit: 120,
      claimed: 28,
    },
  ],
  addOns: [
    {
      id: "moc_arm",
      title: "Cần đèn dài",
      description: "Tăng thêm 12 cm cho màn hình lớn.",
      amount: 140_000,
    },
    {
      id: "moc_source",
      title: "Bộ nguồn dự phòng",
      description: "Đúng thông số của đèn Mộc 02.",
      amount: 180_000,
    },
  ],
  faqs: [
    {
      question: "Mỗi đèn có giống hệt nhau không?",
      answer:
        "Không. Vân và sắc gỗ có chênh nhẹ; nhóm chỉ loại các miếng nứt hoặc cong vượt chuẩn.",
    },
    {
      question: "Có tự thay dải LED được không?",
      answer:
        "Có. Sách hướng dẫn chỉ rõ ba vít cần mở và mã linh kiện thay thế.",
    },
    {
      question: "Cam kết của tôi được xử lý ra sao?",
      answer:
        "Chiến dịch không đạt mục tiêu nên toàn bộ authorization đã được hủy. Người ủng hộ không bị thu tiền.",
    },
  ],
  updates: [
    {
      id: "moc_up_2",
      title: "Báo cáo sau khi chiến dịch chưa đạt mục tiêu",
      excerpt:
        "Nhóm công khai số cam kết đã hủy, chi phí lô tối thiểu và ba thay đổi nếu quay lại.",
      publishedAt: "2026-05-20T18:00:00+07:00",
      commentCount: 18,
    },
    {
      id: "moc_up_1",
      title: "Tuần cuối: chưa đủ mốc đặt lô an toàn",
      excerpt:
        "Nhóm giải thích vì sao không hạ mục tiêu giữa chiến dịch và nhắc lại cơ chế không thu tiền.",
      publishedAt: "2026-05-14T10:30:00+07:00",
      commentCount: 29,
    },
  ],
  comments: [
    {
      id: "moc_cm_1",
      author: "Nguyễn Quỳnh Như",
      initials: "QN",
      badge: "BACKER",
      body: "Ánh sáng có bị nhấp nháy khi quay video bằng điện thoại không?",
      createdAt: "16/05/2026",
      likes: 8,
    },
    {
      id: "moc_cm_2",
      author: "Mộc Lab",
      initials: "ML",
      badge: "CREATOR",
      body: "Bản nguồn mới đã qua thử quay 30 và 60 fps. Nhóm sẽ giữ kết quả này cho bản thiết kế tiếp theo.",
      createdAt: "16/05/2026",
      likes: 9,
    },
  ],
  team: [
    { name: "Lê Thanh Mộc", role: "Chủ dự án · Thiết kế", initials: "TM" },
    { name: "Nguyễn Hải An", role: "Cộng tác viên · Xưởng", initials: "HA" },
  ],
  community: {
    newBackerPercent: 71,
    returningBackerPercent: 29,
    topCities: [
      { name: "Đà Nẵng", backers: 86 },
      { name: "TP. Hồ Chí Minh", backers: 71 },
      { name: "Hà Nội", backers: 42 },
      { name: "Hội An", backers: 23 },
    ],
  },
  dailyFunding: [
    { date: "01/04", amount: 18_000_000 },
    { date: "08/04", amount: 47_000_000 },
    { date: "17/04", amount: 83_000_000 },
    { date: "27/04", amount: 119_000_000 },
    { date: "08/05", amount: 151_000_000 },
    { date: "17/05", amount: 172_000_000 },
  ],
});

const pulse = detail("cmp_pulse", {
  story: {
    lead: "Pulse giúp người lớn tuổi gọi hỗ trợ bằng một nút lớn, đồng thời phát hiện té ngã và nhắc giờ uống thuốc mà không bắt họ phải dùng điện thoại thông minh.",
    paragraphs: [
      "Ý tưởng xuất phát từ việc người thân của nhóm sống một mình và thường bỏ quên điện thoại ở phòng khác. Vòng tay ưu tiên thao tác đơn giản: một nút SOS, rung đủ rõ và chữ lớn trên đế sạc.",
      "Bản mẫu hiện gửi cảnh báo qua trạm kết nối trong nhà. Dữ liệu vị trí chỉ được gửi khi có sự kiện SOS; người dùng có thể tắt chia sẻ trong phần cài đặt của người thân.",
      "Giai đoạn Pre-launch dùng để đo nhu cầu thật và mời 30 gia đình thử đeo trong ba tuần. Nhóm chỉ mở gọi vốn sau khi hoàn tất báo cáo thử nghiệm pin và tỷ lệ cảnh báo nhầm.",
    ],
    highlights: [
      { title: "1 nút", description: "Gọi hỗ trợ mà không cần mở ứng dụng." },
      {
        title: "5 ngày",
        description: "Mục tiêu pin trong điều kiện sử dụng thông thường.",
      },
      {
        title: "30 nhà",
        description: "Quy mô thử nghiệm trước khi mở gọi vốn.",
      },
    ],
    fundingPlan: [
      {
        label: "Bo mạch và lô thử",
        percent: 40,
        amount: 240_000_000,
        detail: "Sản xuất 350 bộ đầu và kiểm tra từng cảm biến.",
      },
      {
        label: "Chứng nhận và kiểm thử",
        percent: 24,
        amount: 144_000_000,
        detail: "An toàn pin, độ bền dây đeo và đo cảnh báo nhầm.",
      },
      {
        label: "Trạm kết nối và ứng dụng",
        percent: 18,
        amount: 108_000_000,
        detail: "Hoàn thiện firmware và ứng dụng cho người thân.",
      },
      {
        label: "Hỗ trợ, giao hàng",
        percent: 13,
        amount: 78_000_000,
        detail: "Tài liệu chữ lớn, tổng đài thử nghiệm và vận chuyển.",
      },
      {
        label: "Dự phòng",
        percent: 5,
        amount: 30_000_000,
        detail: "Linh kiện thay thế cho lô đầu.",
      },
    ],
    evidence: [
      {
        label: "Bản mẫu đeo tay",
        status: "VERIFIED",
        detail: "Đã thử nút SOS và rung nhắc thuốc.",
      },
      {
        label: "Phát hiện té ngã",
        status: "IN_PROGRESS",
        detail: "Đang giảm cảnh báo nhầm khi ngồi xuống nhanh.",
      },
      {
        label: "Thử nghiệm 30 gia đình",
        status: "PLANNED",
        detail: "Mở đăng ký trong giai đoạn Pre-launch.",
      },
      {
        label: "An toàn pin",
        status: "PLANNED",
        detail: "Thực hiện trước khi nhận pledge.",
      },
    ],
    roadmap: [
      {
        period: "05–08/2026",
        title: "Bản mẫu nút SOS và trạm kết nối",
        status: "done",
      },
      { period: "09/2026", title: "Thử cùng 30 gia đình", status: "now" },
      {
        period: "10/2026–01/2027",
        title: "Kiểm định, sản xuất và giao lô đầu",
        status: "next",
      },
    ],
    risks:
      "Pulse không phải thiết bị y tế và không thay thế dịch vụ cấp cứu. Thuật toán có thể bỏ sót hoặc cảnh báo nhầm; vì vậy nhóm hiển thị rõ giới hạn, cho phép gọi SOS thủ công và công bố kết quả thử trước khi Launch.",
  },
  rewards: [
    {
      id: "pulse_support",
      title: "Đăng ký nhóm thử",
      description: "Giữ một suất nhận thông tin thử nghiệm, chưa thu tiền.",
      amount: 50_000,
      estimatedDelivery: "Tháng 09/2026",
      items: ["Bản tin thử nghiệm", "Ưu tiên đăng ký dùng thử"],
      claimed: 0,
    },
    {
      id: "pulse_single",
      title: "Pulse — một bộ",
      description: "Vòng tay, trạm kết nối và dây sạc.",
      amount: 1_490_000,
      estimatedDelivery: "Tháng 01/2027",
      items: ["01 vòng Pulse", "01 trạm kết nối", "Bảo hành 12 tháng"],
      limit: 350,
      claimed: 0,
      featured: true,
    },
    {
      id: "pulse_family",
      title: "Pulse — gói gia đình",
      description: "Hai vòng dùng chung một tài khoản người thân.",
      amount: 2_790_000,
      estimatedDelivery: "Tháng 02/2027",
      items: ["02 vòng Pulse", "02 trạm kết nối", "Bảo hành 18 tháng"],
      limit: 120,
      claimed: 0,
    },
  ],
  addOns: [
    {
      id: "pulse_band",
      title: "Dây đeo dự phòng",
      description: "Chất liệu mềm, hai cỡ.",
      amount: 160_000,
    },
    {
      id: "pulse_dock",
      title: "Đế sạc thứ hai",
      description: "Đặt ở phòng ngủ hoặc phòng khách.",
      amount: 290_000,
    },
  ],
  faqs: [
    {
      question: "Pulse có phải thiết bị y tế không?",
      answer:
        "Không. Đây là thiết bị hỗ trợ liên lạc và nhắc sinh hoạt; không chẩn đoán bệnh.",
    },
    {
      question: "Nhà không có Wi-Fi thì dùng được không?",
      answer:
        "Nút SOS tại chỗ vẫn hoạt động; gửi cảnh báo ra ngoài cần trạm có kết nối mạng.",
    },
    {
      question: "Pre-launch có bị thu tiền không?",
      answer: "Không. Giai đoạn này chỉ nhận lưu dự án và đăng ký nhắc khi mở.",
    },
  ],
  updates: [
    {
      id: "pulse_up_1",
      title: "Mở đơn đăng ký thử cùng gia đình",
      excerpt: "Nhóm cần 30 gia đình tại Cần Thơ tham gia ba tuần dùng thử.",
      publishedAt: "2026-09-09T08:00:00+07:00",
      commentCount: 14,
    },
  ],
  comments: [
    {
      id: "pulse_cm_1",
      author: "Võ Thanh Hà",
      initials: "TH",
      badge: "BACKER",
      body: "Nhóm có hướng dẫn bằng giấy chữ lớn cho người không dùng smartphone không?",
      createdAt: "6 giờ trước",
      likes: 17,
    },
    {
      id: "pulse_cm_2",
      author: "AnCare",
      initials: "AC",
      badge: "CREATOR",
      body: "Có cô/chú nhé. Bộ sản phẩm sẽ kèm hướng dẫn chữ lớn và số điện thoại hỗ trợ.",
      createdAt: "5 giờ trước",
      likes: 15,
    },
  ],
  team: [
    { name: "Đặng Minh An", role: "Chủ dự án · Sản phẩm", initials: "MA" },
    {
      name: "Trần Thu Cúc",
      role: "Cộng tác viên · Chăm sóc người cao tuổi",
      initials: "TC",
    },
  ],
  community: {
    newBackerPercent: 82,
    returningBackerPercent: 18,
    topCities: [
      { name: "Cần Thơ", backers: 0 },
      { name: "TP. Hồ Chí Minh", backers: 0 },
      { name: "Vĩnh Long", backers: 0 },
      { name: "An Giang", backers: 0 },
    ],
  },
  dailyFunding: [],
});

const afterRain = detail("cmp_afterrain", {
  story: {
    lead: "Thành phố sau mưa là album tám ca khúc được thu trực tiếp cùng ban nhạc, giữ lại tiếng phòng và những nhịp thở thay vì chỉnh mọi thứ thành hoàn hảo.",
    paragraphs: [
      "Tám bài hát được viết trong ba năm, kể về người trẻ làm việc, chuyển trọ và tìm chỗ đứng ở TP. Hồ Chí Minh. Nhóm đã tự thu hai bản demo nhưng chưa đủ chi phí thuê phòng thu cho cả ban nhạc.",
      "Kinh phí gọi vốn dành cho sáu ngày thu, mix/master, trả công nhạc công và ép 200 đĩa vinyl. Mỗi tuần nhóm công khai một đoạn nhật ký phòng thu để người ủng hộ theo dõi.",
      "Bản số được giao trước. Vinyl chỉ đi ép sau khi bản master được tất cả thành viên nghe lại trên ba hệ loa, tránh phải làm lại khuôn.",
    ],
    highlights: [
      { title: "8 bài", description: "Toàn bộ sáng tác mới bằng tiếng Việt." },
      {
        title: "6 ngày",
        description: "Thu trực tiếp cùng ban nhạc tại phòng thu.",
      },
      { title: "200 đĩa", description: "Lô vinyl giới hạn có đánh số." },
    ],
    fundingPlan: [
      {
        label: "Phòng thu và kỹ thuật",
        percent: 38,
        amount: 68_400_000,
        detail: "Sáu ngày thu, dựng phiên và kỹ thuật âm thanh.",
      },
      {
        label: "Mix, master và nhạc công",
        percent: 27,
        amount: 48_600_000,
        detail: "Hoàn thiện tám bài và trả công theo buổi.",
      },
      {
        label: "Ép vinyl và in bìa",
        percent: 23,
        amount: 41_400_000,
        detail: "Lô 200 đĩa, bìa gập và booklet lời bài hát.",
      },
      {
        label: "Giao hàng, phí",
        percent: 7,
        amount: 12_600_000,
        detail: "Đóng gói chống cong và gửi trong nước.",
      },
      {
        label: "Dự phòng",
        percent: 5,
        amount: 9_000_000,
        detail: "Bù thêm ca thu hoặc đĩa lỗi.",
      },
    ],
    evidence: [
      {
        label: "Hai bản demo",
        status: "VERIFIED",
        detail: "Đã phát hành bản nghe thử riêng cho người đăng ký.",
      },
      {
        label: "Lịch phòng thu",
        status: "VERIFIED",
        detail: "Đã giữ sáu ngày trong tháng 10/2026.",
      },
      {
        label: "Master album",
        status: "IN_PROGRESS",
        detail: "Hoàn thành sau giai đoạn thu trực tiếp.",
      },
      {
        label: "Mẫu vinyl",
        status: "PLANNED",
        detail: "Duyệt test pressing trước khi ép cả lô.",
      },
    ],
    roadmap: [
      {
        period: "2024–08/2026",
        title: "Viết bài, tập ban nhạc và thu demo",
        status: "done",
      },
      {
        period: "09–10/2026",
        title: "Chuẩn bị và thu trực tiếp",
        status: "now",
      },
      {
        period: "11/2026–02/2027",
        title: "Mix, ép đĩa và giao quà",
        status: "next",
      },
    ],
    risks:
      "Lịch của sáu nhạc công có thể thay đổi và test pressing vinyl có thể phải làm lại. Nhóm đã giữ hai ngày dự phòng, giao bản số trước và cập nhật ngay nếu lịch vinyl bị lùi.",
  },
  rewards: [
    {
      id: "rain_digital",
      title: "Album số",
      description: "Tải album lossless và booklet điện tử.",
      amount: 180_000,
      estimatedDelivery: "Tháng 12/2026",
      items: ["Album WAV/FLAC", "Booklet điện tử"],
      claimed: 121,
    },
    {
      id: "rain_cd",
      title: "CD có chữ ký",
      description: "CD digipak kèm album số.",
      amount: 420_000,
      estimatedDelivery: "Tháng 01/2027",
      items: ["01 CD", "Chữ ký ban nhạc", "Album số"],
      limit: 300,
      claimed: 147,
      featured: true,
    },
    {
      id: "rain_vinyl",
      title: "Vinyl đánh số",
      description: "Đĩa 12 inch, bìa gập và số thứ tự viết tay.",
      amount: 890_000,
      estimatedDelivery: "Tháng 02/2027",
      items: ["01 vinyl", "Booklet lời bài hát", "Album số"],
      limit: 200,
      claimed: 68,
    },
  ],
  addOns: [
    {
      id: "rain_poster",
      title: "Poster A2",
      description: "In hai màu trên giấy mỹ thuật.",
      amount: 150_000,
    },
    {
      id: "rain_ticket",
      title: "Vé nghe album",
      description: "Buổi nghe và giao lưu tại TP. Hồ Chí Minh.",
      amount: 250_000,
    },
  ],
  faqs: [
    {
      question: "Album số được gửi ở định dạng nào?",
      answer:
        "Người ủng hộ nhận WAV, FLAC và MP3 320 kbps qua email tài khoản.",
    },
    {
      question: "Vinyl có giao toàn quốc không?",
      answer:
        "Có. Đĩa được đóng trong hộp chuyên dụng; phụ phí vùng xa được xác nhận trước khi thu tiền.",
    },
    {
      question: "Nếu dự án không đạt mục tiêu thì sao?",
      answer: "Authorization bị hủy và không có khoản tiền nào được thu.",
    },
  ],
  updates: [
    {
      id: "rain_up_2",
      title: "Nghe thử đoạn điệp khúc Mưa ngang qua",
      excerpt: "Đây là take thu tại phòng tập, chưa qua mix.",
      publishedAt: "2026-09-10T21:00:00+07:00",
      commentCount: 37,
    },
    {
      id: "rain_up_1",
      title: "Chốt sáu ngày phòng thu",
      excerpt: "Ban nhạc bắt đầu thu từ ngày 12/10.",
      publishedAt: "2026-09-02T19:00:00+07:00",
      commentCount: 19,
    },
  ],
  comments: [
    {
      id: "rain_cm_1",
      author: "Đỗ Hải Yến",
      initials: "HY",
      badge: "SUPERBACKER",
      body: "Mình muốn xem danh sách bài và thời lượng dự kiến trước khi chọn vinyl.",
      createdAt: "1 giờ trước",
      likes: 22,
    },
    {
      id: "rain_cm_2",
      author: "Vỹ & The Rain",
      initials: "VR",
      badge: "CREATOR",
      body: "Nhóm sẽ đăng tracklist kèm thời lượng demo trong update tối Chủ nhật.",
      createdAt: "45 phút trước",
      likes: 18,
    },
  ],
  team: [
    { name: "Nguyễn Gia Vỹ", role: "Chủ dự án · Sáng tác", initials: "GV" },
    { name: "Lâm Hoài Thu", role: "Cộng tác viên · Sản xuất", initials: "HT" },
    {
      name: "Trần Minh Long",
      role: "Cộng tác viên · Âm thanh",
      initials: "ML",
    },
  ],
  community: {
    newBackerPercent: 49,
    returningBackerPercent: 51,
    topCities: [
      { name: "TP. Hồ Chí Minh", backers: 176 },
      { name: "Hà Nội", backers: 71 },
      { name: "Đà Lạt", backers: 33 },
      { name: "Đà Nẵng", backers: 25 },
    ],
  },
  dailyFunding: [
    { date: "31/08", amount: 18_000_000 },
    { date: "02/09", amount: 31_000_000 },
    { date: "04/09", amount: 44_000_000 },
    { date: "06/09", amount: 58_000_000 },
    { date: "08/09", amount: 73_000_000 },
    { date: "10/09", amount: 92_700_000 },
  ],
});

const bepXanh = detail("cmp_bepxanh", {
  story: {
    lead: "Bếp nhỏ không rác là bộ ủ kín cho căn hộ, giúp xử lý rau củ và bã cà phê mỗi ngày mà không cần một khu vườn lớn.",
    paragraphs: [
      "Nhóm thử nhiều loại thùng trên ban công chung cư và nhận ra vấn đề khó nhất không phải tốc độ phân hủy mà là mùi, nước rỉ và chỗ vệ sinh sau mỗi mẻ.",
      "Bộ sản phẩm có lõi lọc than thay được, vòi xả thấp và bảng hướng dẫn theo nhóm rác bếp phổ biến. Người dùng nhận men khởi đầu từ nguyên liệu có nguồn gốc rõ ràng trong nước.",
      "Chiến dịch đã vượt mục tiêu. Nhóm đang dùng phần vốn tăng thêm để đặt khuôn nắp bền hơn và mở một điểm thu hồi lõi lọc tại Bình Dương.",
    ],
    highlights: [
      {
        title: "12 L",
        description: "Kích thước vừa ban công hoặc gầm bồn rửa.",
      },
      {
        title: "21 ngày",
        description: "Thời gian trung bình cho một mẻ rác bếp đã cắt nhỏ.",
      },
      { title: "1,6×", description: "Mức vốn đã vượt mục tiêu ban đầu." },
    ],
    fundingPlan: [
      {
        label: "Khuôn và lô 600 bộ",
        percent: 48,
        amount: 105_600_000,
        detail: "Thân thùng, nắp kín và vòi xả.",
      },
      {
        label: "Lõi lọc và men khởi đầu",
        percent: 22,
        amount: 48_400_000,
        detail: "Chuẩn bị cho sáu tháng sử dụng đầu.",
      },
      {
        label: "Đóng gói, giao hàng",
        percent: 15,
        amount: 33_000_000,
        detail: "Thùng giấy tái chế và giao trong nước.",
      },
      {
        label: "Hướng dẫn, hỗ trợ",
        percent: 10,
        amount: 22_000_000,
        detail: "Video, tài liệu và xử lý câu hỏi sau giao.",
      },
      {
        label: "Dự phòng",
        percent: 5,
        amount: 11_000_000,
        detail: "Thay sản phẩm lỗi và bù giá nguyên liệu.",
      },
    ],
    evidence: [
      {
        label: "Thử nghiệm căn hộ",
        status: "VERIFIED",
        detail: "46 hộ dùng thử trong tám tuần.",
      },
      {
        label: "Khuôn thân thùng",
        status: "VERIFIED",
        detail: "Đã hoàn tất và kiểm tra kín nước.",
      },
      {
        label: "Khuôn nắp mới",
        status: "IN_PROGRESS",
        detail: "Nâng độ bền nhờ phần vốn vượt mục tiêu.",
      },
      {
        label: "Điểm thu hồi lõi",
        status: "PLANNED",
        detail: "Dự kiến mở thử tại Bình Dương.",
      },
    ],
    roadmap: [
      {
        period: "02–05/2026",
        title: "Thử 46 hộ và sửa thiết kế",
        status: "done",
      },
      {
        period: "06–09/2026",
        title: "Khóa khuôn và sản xuất lô đầu",
        status: "now",
      },
      {
        period: "10–12/2026",
        title: "Giao hàng và thu hồi lõi thử nghiệm",
        status: "next",
      },
    ],
    risks:
      "Hiệu quả ủ phụ thuộc cách cắt rác và lượng nước trong từng hộ. Nhóm không quảng cáo là hoàn toàn không mùi; hướng dẫn có bảng xử lý mùi, số hỗ trợ và chính sách đổi nắp nếu gioăng không kín.",
  },
  rewards: [
    {
      id: "bep_support",
      title: "Góp một căn bếp xanh",
      description: "Nhận sổ tay điện tử giảm rác bếp.",
      amount: 80_000,
      estimatedDelivery: "Tháng 08/2026",
      items: ["Sổ tay PDF", "Tên trong trang cảm ơn"],
      claimed: 126,
    },
    {
      id: "bep_standard",
      title: "Bộ ủ tiêu chuẩn",
      description: "Một thùng 12 L, lõi lọc và men dùng hai tháng.",
      amount: 690_000,
      estimatedDelivery: "Tháng 10/2026",
      items: ["01 thùng ủ", "02 lõi lọc", "02 gói men"],
      limit: 600,
      claimed: 438,
      featured: true,
    },
    {
      id: "bep_duo",
      title: "Bộ đôi hàng xóm",
      description: "Hai bộ giao cùng địa chỉ để giảm phí vận chuyển.",
      amount: 1_250_000,
      estimatedDelivery: "Tháng 10/2026",
      items: ["02 thùng ủ", "04 lõi lọc", "04 gói men"],
      limit: 180,
      claimed: 112,
    },
  ],
  addOns: [
    {
      id: "bep_filter",
      title: "Bốn lõi lọc",
      description: "Dùng thay trong khoảng tám tháng.",
      amount: 180_000,
    },
    {
      id: "bep_yeast",
      title: "Sáu gói men",
      description: "Định lượng cho sáu mẻ ủ.",
      amount: 150_000,
    },
  ],
  faqs: [
    {
      question: "Bộ ủ có hoàn toàn không mùi không?",
      answer:
        "Không thể cam kết trong mọi điều kiện. Nếu trộn đúng tỷ lệ và đóng nắp kín, mùi giảm rõ; hướng dẫn có phần xử lý khi quá ẩm.",
    },
    {
      question: "Có cho thịt cá vào được không?",
      answer:
        "Bản hiện tại khuyến nghị rau củ, vỏ trái cây, cơm và bã cà phê; không nên cho xương hoặc nhiều dầu mỡ.",
    },
    {
      question: "Khi nào tiền được thu?",
      answer:
        "Chiến dịch đã đạt mục tiêu; khoản authorization hợp lệ được capture khi chiến dịch đóng theo lịch.",
    },
  ],
  updates: [
    {
      id: "bep_up_2",
      title: "Bắt đầu giao 120 bộ đầu",
      excerpt: "Các đơn tại TP. Hồ Chí Minh và Bình Dương được bàn giao trước.",
      publishedAt: "2026-09-09T16:00:00+07:00",
      commentCount: 52,
    },
    {
      id: "bep_up_1",
      title: "Khuôn thân thùng đã vượt kiểm tra kín nước",
      excerpt: "20 mẫu đầu không rò sau 72 giờ thử liên tục.",
      publishedAt: "2026-08-22T14:00:00+07:00",
      commentCount: 34,
    },
  ],
  comments: [
    {
      id: "bep_cm_1",
      author: "Mai Ngọc Hân",
      initials: "NH",
      badge: "BACKER",
      body: "Nhóm có nhận lại lõi lọc cũ để xử lý không?",
      createdAt: "2 giờ trước",
      likes: 13,
    },
    {
      id: "bep_cm_2",
      author: "Lá Xanh",
      initials: "LX",
      badge: "CREATOR",
      body: "Tụi mình đang thử điểm thu hồi ở Bình Dương và sẽ thông báo cách gửi chung với update giao hàng.",
      createdAt: "1 giờ trước",
      likes: 16,
    },
  ],
  team: [
    {
      name: "Phan Hương Giang",
      role: "Chủ dự án · Thiết kế sản phẩm",
      initials: "HG",
    },
    { name: "Đỗ Thanh Bình", role: "Cộng tác viên · Vận hành", initials: "TB" },
  ],
  community: {
    newBackerPercent: 67,
    returningBackerPercent: 33,
    topCities: [
      { name: "TP. Hồ Chí Minh", backers: 392 },
      { name: "Bình Dương", backers: 221 },
      { name: "Hà Nội", backers: 177 },
      { name: "Cần Thơ", backers: 88 },
    ],
  },
  dailyFunding: [
    { date: "10/06", amount: 39_000_000 },
    { date: "15/06", amount: 91_000_000 },
    { date: "20/06", amount: 157_000_000 },
    { date: "25/06", amount: 226_000_000 },
    { date: "30/06", amount: 301_000_000 },
    { date: "05/07", amount: 356_500_000 },
  ],
});

export const campaignDetailsBySlug: Record<string, CampaignDetail> = {
  [orbitDetail.slug]: orbitDetail,
  "orbit-one-ca-phe-thong-minh": orbitDetail,
  [lacViet.slug]: lacViet,
  "lac-viet-su-thi-the-bai": lacViet,
  "lac-viet-boardgame": lacViet,
  [moc.slug]: moc,
  "moc-lamp-chieu-sang-thong-minh": moc,
  "moc-den-ban-tuan-hoan": moc,
  [pulse.slug]: pulse,
  "pulse-band-vong-deo-suc-khoe": pulse,
  "pulse-vong-tay-an-toan": pulse,
  [afterRain.slug]: afterRain,
  "thanh-pho-sau-mua-dia-nhac-indie": afterRain,
  "thanh-pho-sau-mua-album": afterRain,
  [bepXanh.slug]: bepXanh,
  "bep-nho-khong-rac-so-tay-thuc-hanh": bepXanh,
  "bep-nho-khong-rac": bepXanh,
};

