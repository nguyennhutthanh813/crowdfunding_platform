export const siteConfig = {
  name: 'Góp Ý',
  slogan: 'Góp một phần, làm nên chuyện',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  description:
    'Nơi những dự án Việt có kế hoạch rõ ràng tìm được cộng đồng cùng tin và cùng làm.',
  navigation: [
    { href: '/discover', label: 'Khám phá' },
    { href: '/discover?status=PRE_LAUNCH', label: 'Sắp ra mắt' },
    { href: '/#cach-hoat-dong', label: 'Cách hoạt động' },
  ],
  footer: {
    discover: [
      { href: '/discover', label: 'Tất cả dự án' },
      { href: '/discover?category=Công%20nghệ', label: 'Công nghệ' },
      { href: '/discover?category=Thiết%20kế', label: 'Thiết kế' },
      { href: '/discover?category=Đời%20sống%20xanh', label: 'Đời sống xanh' },
    ],
    creators: [
      { href: '/creator/campaigns/new', label: 'Bắt đầu chiến dịch' },
      { href: '/#cach-hoat-dong', label: 'Cách gọi vốn hoạt động' },
      { href: '/login', label: 'Đăng nhập tài khoản' },
    ],
    support: [
      { href: '/account', label: 'Trung tâm tài khoản' },
      { href: '/discover', label: 'Câu hỏi thường gặp' },
      { href: '/register', label: 'Tài khoản dùng thử' },
    ],
  },
} as const;
