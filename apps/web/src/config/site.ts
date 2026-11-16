export const siteConfig = {
  name: "FundViet",
  slogan: "Biến ý tưởng thành hiện thực",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description:
    "FundViet — nền tảng gọi vốn cộng đồng All-or-Nothing cho ý tưởng Việt. Chỉ thu tiền khi dự án đạt mục tiêu.",
  navigation: [
    { href: "/discover", label: "Khám phá" },
    { href: "/discover?sort=nearly_funded", label: "Sắp đạt mục tiêu" },
    { href: "/discover?status=PRE_LAUNCH", label: "Sắp ra mắt" },
    { href: "/creator/campaigns/new", label: "Tạo chiến dịch" },
  ],
  footer: {
    discover: [
      { href: "/discover", label: "Tất cả dự án" },
      { href: "/discover?category=Công%20nghệ", label: "Công nghệ" },
      { href: "/discover?category=Thiết%20kế", label: "Thiết kế" },
      { href: "/discover?category=Đời%20sống%20xanh", label: "Đời sống xanh" },
    ],
    creators: [
      { href: "/creator/campaigns/new", label: "Bắt đầu chiến dịch" },
      { href: "/#cach-hoat-dong", label: "Cách gọi vốn hoạt động" },
      { href: "/auth", label: "Đăng nhập tài khoản" },
    ],
    support: [
      { href: "/account", label: "Trung tâm tài khoản" },
      {
        href: "/projects/orbit-one-ca-phe-thong-minh?tab=faq",
        label: "Câu hỏi thường gặp",
      },
      { href: "/auth", label: "Chuyển đổi tài khoản" },
      { href: "/huong-dan", label: "Hướng dẫn từng bước" },
    ],
  },
} as const;
