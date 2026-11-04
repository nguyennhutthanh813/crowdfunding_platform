import type {
  CampaignDraftAddOn,
  CampaignDraftCollaborator,
  CampaignDraftFields,
  CampaignDraftReward,
} from "@/lib/api";
import { sampleCoverArt } from "@/lib/campaign/sample-cover-art";

// Chỉ điền thử form; seed SQLite vẫn nằm ở lib/api/mock/relational-store.ts.
export const sampleDraft: CampaignDraftFields = {
  title: "ORBIT Mini — bộ pha gọn cho góc làm việc",
  blurb: "Bản nháp đang hoàn thiện cho mẫu máy nhỏ hơn, ưu tiên dễ vệ sinh và vừa bàn làm việc.",
  category: "Công nghệ",
  goal: "360000000",
  duration: "30",
  location: "TP. Hồ Chí Minh",
  story:
    "ORBIT Mini bắt đầu từ mong muốn mang trải nghiệm pha ổn định vào những căn bếp có diện tích nhỏ. Bản mẫu hiện tại đã hoàn tất thử nghiệm nhiệt và chúng tôi đang chuẩn bị khuôn vỏ cho lô đầu tiên.",
  risks:
    "Tiến độ khuôn vỏ và nguồn cung cảm biến có thể ảnh hưởng lịch giao. Nhóm đã chuẩn bị nhà cung cấp dự phòng và biên độ lịch bốn tuần.",
  shippingFee: "45000",
  hasVideo: true,
  coverAssetId: "",
};

export const sampleRewards: CampaignDraftReward[] = [
  { id: 1, title: "Ưu đãi sớm", amount: "2890000", delivery: "01/2027", limit: "300" },
  { id: 2, title: "ORBIT Duo", amount: "5390000", delivery: "02/2027", limit: "100" },
];

export const sampleAddOns: CampaignDraftAddOn[] = [
  { id: 1, title: "Ca đánh sữa 450 ml", amount: "320000" },
  { id: 2, title: "Bộ lọc dự phòng", amount: "240000" },
];

export const sampleCollaborators: CampaignDraftCollaborator[] = [
  {
    id: 1,
    email: "huy.le@example.com",
    name: "Lê Gia Huy",
    canUpdate: true,
    canReply: true,
    canViewAi: true,
  },
];

export const newCampaignExample: CampaignDraftFields = {
  title: "Bếp Mây — bộ lọc nước cho căn bếp nhỏ",
  blurb: "Bộ lọc lắp tại vòi cho gia đình ở nhà thuê, dễ thay lõi và giảm số chai nhựa phải mua mỗi tuần.",
  category: "Đời sống xanh",
  goal: "120000000",
  duration: "30",
  location: "Đà Nẵng",
  story:
    "Nhóm bắt đầu từ nhu cầu của những gia đình ở nhà thuê: căn bếp nhỏ, không thể lắp máy lọc cố định nhưng vẫn muốn chủ động nguồn nước cho việc nấu ăn. Bản thử hiện tại lắp tại vòi và thay lõi bằng tay. Khoản gọi vốn dùng để hoàn thiện khuôn vỏ và làm lô đầu tiên.",
  risks:
    "Lõi lọc có thể về trễ nếu nhà cung ứng thiếu vật liệu. Nhóm sẽ cập nhật tiến độ từng lô và chuẩn bị một nguồn thay thế trước khi nhận đơn.",
  shippingFee: "30000",
  hasVideo: false,
  coverAssetId: sampleCoverArt.id,
};

export const newCampaignExampleRewards: CampaignDraftReward[] = [
  { id: 1, title: "Bộ lọc lô đầu", amount: "750000", delivery: "03/2027", limit: "100" },
];
