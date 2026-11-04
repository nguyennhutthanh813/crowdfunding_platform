import { PrismaClient, GlobalRole, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const defaultPasswordHash = await bcrypt.hash('gop12345', 12);

  // 1. Seed Categories
  const categories = [
    { name: 'Công nghệ & Sáng tạo', slug: 'cong-nghe-sang-tao', sortOrder: 1 },
    { name: 'Trò chơi', slug: 'tro-choi', sortOrder: 2 },
    { name: 'Nghệ thuật & Xuất bản', slug: 'nghe-thuat-xuat-ban', sortOrder: 3 },
    { name: 'Thủ công mỹ nghệ', slug: 'thu-cong-my-nghe', sortOrder: 4 },
    { name: 'Cộng đồng & Xã hội', slug: 'cong-dong-xa-hoi', sortOrder: 5 },
    { name: 'Ẩm thực & Nông sản', slug: 'am-thuc-nong-san', sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
  }
  console.log('✅ Categories seeded');

  // Tài khoản và chiến dịch bên dưới là dữ liệu mẫu để thử luồng, không phải hồ sơ đã xác minh.
  const usersToSeed: Array<{
    email: string;
    displayName: string;
    bio: string;
    roles: GlobalRole[];
  }> = [
    {
      email: 'minhanh@example.com',
      displayName: 'Phạm Minh Anh',
      bio: 'Thành viên cộng đồng từ tháng 03/2025',
      roles: ['BACKER'],
    },
    {
      email: 'linh@orbit.vn',
      displayName: 'Nguyễn Hoàng Linh',
      bio: 'Chủ dự án ORBIT One',
      roles: ['BACKER', 'CREATOR'],
    },
    {
      email: 'giahuy@orbit.vn',
      displayName: 'Lê Gia Huy',
      bio: 'Cộng tác viên phần cứng · ORBIT One',
      roles: ['BACKER'], // Cộng tác viên là quyền theo chiến dịch, không phải vai trò toàn hệ thống.
    },
    {
      email: 'lacstudio@example.com',
      displayName: 'Lạc Studio',
      bio: 'Nhóm làm trò chơi Lạc Việt tại Hà Nội',
      roles: ['BACKER', 'CREATOR'],
    },
    {
      email: 'quantri@gop.vn',
      displayName: 'Trần Khánh An',
      bio: 'Quản trị viên vận hành nền tảng',
      roles: ['ADMIN'],
    },
  ];

  for (const item of usersToSeed) {
    const existing = await prisma.user.findUnique({
      where: { email: item.email },
      include: { roles: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          email: item.email,
          displayName: item.displayName,
          passwordHash: defaultPasswordHash,
          bio: item.bio,
          status: AccountStatus.ACTIVE,
          roles: {
            create: item.roles.map((role) => ({ role })),
          },
        },
      });
      console.log(`✅ Created user: ${item.email}`);
    } else {
      console.log(`ℹ️ User already exists: ${item.email}`);
    }
  }

  // Dữ liệu chiến dịch mẫu
  const techCategory = await prisma.category.findUnique({ where: { slug: 'cong-nghe-sang-tao' } });
  const gameCategory = await prisma.category.findUnique({ where: { slug: 'tro-choi' } });
  const linhUser = await prisma.user.findUnique({ where: { email: 'linh@orbit.vn' } });
  const lacStudioUser = await prisma.user.findUnique({ where: { email: 'lacstudio@example.com' } });
  const giaHuyUser = await prisma.user.findUnique({ where: { email: 'giahuy@orbit.vn' } });

  if (techCategory && linhUser) {
    const existingOrbit = await prisma.campaign.findUnique({
      where: { slug: 'orbit-one-ca-phe-thong-minh' },
    });

    if (!existingOrbit) {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

      const orbitCampaign = await prisma.campaign.create({
        data: {
          creatorId: linhUser.id,
          categoryId: techCategory.id,
          title: 'ORBIT One — máy pha cà phê thông minh cho căn bếp Việt',
          slug: 'orbit-one-ca-phe-thong-minh',
          blurb: 'Pha đúng gu trong 90 giây, ghi nhớ khẩu vị và giảm một nửa lượng cà phê bỏ đi.',
          storyMarkdown: '## Câu chuyện dự án\n\nORBIT One là ý tưởng máy pha cà phê gọn cho căn bếp Việt. Nhóm muốn người dùng chọn công thức phù hợp khẩu vị và vệ sinh máy dễ hơn sau mỗi lần pha.\n\n### Hướng làm\n- Thử bộ điều khiển nhiệt và thời gian pha.\n- Thiết kế các bộ phận dễ tháo để vệ sinh.\n- Lấy phản hồi từ người dùng thử trước khi chốt sản phẩm.',
          risksMarkdown: 'Lịch sản xuất có thể đổi khi thử độ bền và an toàn điện. Giá linh kiện và thời gian giao hàng cũng có thể tăng; nhóm sẽ cập nhật khi có kết quả thử cụ thể.',
          location: 'TP. Hồ Chí Minh',
          status: 'LIVE',
          goalAmount: BigInt(800_000_000),
          durationDays: 30,
          startsAt: now,
          publishedAt: now,
          endsAt,
          members: {
            create: [
              { userId: linhUser.id, role: 'OWNER' },
              ...(giaHuyUser ? [{ userId: giaHuyUser.id, role: 'COLLABORATOR' as const }] : []),
            ],
          },
          media: {
            create: [
              {
                mediaType: 'IMAGE',
                url: '/images/campaigns/orbit-one.png',
                altText: 'Máy pha cà phê ORBIT One trên bàn bếp',
                sortOrder: 1,
              },
            ],
          },
          rewardTiers: {
            create: [
              {
                title: 'Gửi một ly động viên',
                description: 'Ủng hộ nhóm phát triển, không nhận quà giao tận nơi.',
                amount: BigInt(150_000),
                items: [],
                requiresShipping: false,
                quantityLimit: null,
                estimatedDelivery: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                isFeatured: true,
                sortOrder: 1,
              },
              {
                title: 'ORBIT One — Early Bird',
                description: 'Bộ sản phẩm đầy đủ cho gia đình hoặc văn phòng nhỏ.',
                amount: BigInt(3_890_000),
                requiresShipping: true,
                items: ['1x Máy pha cà phê ORBIT One', '1x Cốc đong', '2x Gói cà phê đặc sản 250g'],
                quantityLimit: 200,
                estimatedDelivery: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
                isFeatured: false,
                sortOrder: 2,
              },
              {
                title: 'ORBIT Duo',
                description: '2 máy ORBIT One cho bạn và người thân cùng màu sắc tùy chọn.',
                amount: BigInt(7_290_000),
                requiresShipping: true,
                items: ['2x Máy ORBIT One', '2x Bộ phụ kiện đầy đủ', '4x Gói cà phê đặc sản'],
                quantityLimit: 30,
                estimatedDelivery: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
                isFeatured: false,
                sortOrder: 3,
              },
            ],
          },
          addOns: {
            create: [
              {
                title: 'Ca đánh sữa 450 ml',
                description: 'Phần bổ sung đi cùng máy ORBIT One.',
                amount: BigInt(320_000),
                requiresShipping: true,
                quantityLimit: 150,
              },
              {
                title: 'Bộ lọc dự phòng',
                description: 'Thay thế khi cần bảo trì máy tại nhà.',
                amount: BigInt(240_000),
                requiresShipping: true,
                quantityLimit: 200,
              },
              {
                title: 'Hộp hạt trải nghiệm',
                description: 'Hộp cà phê để thử các công thức pha đầu tiên.',
                amount: BigInt(390_000),
                requiresShipping: true,
                quantityLimit: 200,
              },
            ],
          },
          shippingOptions: {
            create: [
              {
                name: 'Giao hàng tiêu chuẩn toàn quốc',
                provinceCode: 'ALL',
                feeAmount: BigInt(35_000),
                estimatedDaysMin: 2,
                estimatedDaysMax: 5,
              },
              {
                name: 'Giao hàng hỏa tốc nội thành (TP.HCM / Hà Nội)',
                provinceCode: 'EXPRESS',
                feeAmount: BigInt(60_000),
                estimatedDaysMin: 1,
                estimatedDaysMax: 2,
              },
            ],
          },
          faqs: {
            create: [
              {
                question: 'ORBIT One bảo hành bao lâu?',
                answer: 'Sản phẩm được bảo hành chính hãng 12 tháng tại các trung tâm bảo hành ở Hà Nội, Đà Nẵng và TP. Hồ Chí Minh.',
                sortOrder: 1,
              },
              {
                question: 'Máy có dùng được với các loại cà phê thông thường không?',
                answer: 'Hoàn toàn được. Máy hỗ trợ kích thước hạt xay từ thô đến mịn vừa, phù hợp cho cả hạt Robusta và Arabica.',
                sortOrder: 2,
              },
            ],
          },
          updates: {
            create: [
              {
                authorId: linhUser.id,
                title: 'Cập nhật tuần 1: Đã hoàn thiện khuôn đúc vỏ nhôm anốt hóa',
                bodyMarkdown: 'Chào các bạn ủng hộ! Chúng tôi rất vui mừng thông báo lô khuôn thử nghiệm đầu tiên đã cho ra bề mặt nhôm mịn và đạt chuẩn dung sai ±0.1mm.',
                publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              },
            ],
          },
        },
      });

      console.log(`✅ Created campaign: ${orbitCampaign.title}`);
    } else {
      console.log('ℹ️ Campaign ORBIT One already exists');
    }
  }

  // Cùng một chủ dự án có thể có nhiều chiến dịch; Mini là bản nháp để thử luồng xét duyệt.
  if (techCategory && linhUser) {
    const existingMini = await prisma.campaign.findUnique({
      where: { slug: 'orbit-mini-bo-pha-gon' },
    });
    if (!existingMini) {
      await prisma.campaign.create({
        data: {
          creatorId: linhUser.id,
          categoryId: techCategory.id,
          title: 'ORBIT Mini — bộ pha gọn cho góc làm việc',
          slug: 'orbit-mini-bo-pha-gon',
          blurb: 'Bản nháp đang hoàn thiện cho mẫu máy nhỏ hơn, ưu tiên dễ vệ sinh và vừa bàn làm việc.',
          location: 'TP. Hồ Chí Minh',
          status: 'DRAFT',
          goalAmount: BigInt(360_000_000),
          durationDays: 30,
          members: { create: { userId: linhUser.id, role: 'OWNER' } },
        },
      });
    }
  }

  if (gameCategory && lacStudioUser) {
    const existingLacViet = await prisma.campaign.findUnique({
      where: { slug: 'lac-viet-boardgame' },
    });

    if (!existingLacViet) {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

      const lacVietCampaign = await prisma.campaign.create({
        data: {
          creatorId: lacStudioUser.id,
          categoryId: gameCategory.id,
          title: 'Lạc Việt — board game phiêu lưu qua 12 vùng văn hóa',
          slug: 'lac-viet-boardgame',
          blurb: 'Một chuyến đi kể bằng chiến thuật, dân gian và minh họa thủ công của họa sĩ trẻ Việt Nam.',
          storyMarkdown: '## Giới thiệu dự án\n\nLạc Việt là ý tưởng trò chơi bàn lấy cảm hứng từ văn hóa Việt. Nhóm đang chỉnh luật chơi và minh họa để mỗi lượt có quyết định rõ ràng, dễ học với người chơi mới.',
          risksMarkdown: 'Màu bản in và chất lượng vật liệu cần được kiểm qua bản mẫu. Nếu luật chơi phải sửa sau khi thử với nhóm nhỏ, lịch in và giao quà có thể lùi.',
          location: 'Hà Nội',
          status: 'LIVE',
          goalAmount: BigInt(280_000_000),
          durationDays: 45,
          startsAt: now,
          publishedAt: now,
          endsAt,
          members: {
            create: [{ userId: lacStudioUser.id, role: 'OWNER' }],
          },
          media: {
            create: {
              mediaType: 'IMAGE',
              url: '/images/campaigns/lac-viet.png',
              altText: 'Minh họa trò chơi Lạc Việt',
              sortOrder: 1,
            },
          },
          rewardTiers: {
            create: [
              {
                title: 'Hộp Trò chơi Cơ bản',
                description: 'Bao gồm 120 thẻ bài, 1 bàn cờ vải lụa, xúc xắc gỗ và sách hướng dẫn.',
                amount: BigInt(350_000),
                requiresShipping: true,
                items: ['1x Hộp game Lạc Việt', '1x Thẻ bài độc quyền cho Backer'],
                quantityLimit: 500,
                estimatedDelivery: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                isFeatured: true,
                sortOrder: 1,
              },
              {
                title: 'Bản Sưu tầm Kỷ niệm',
                description: 'Hộp gỗ sơn mài thủ công, thẻ bài phủ mạ vàng cạnh và artbook lịch sử.',
                amount: BigInt(790_000),
                requiresShipping: true,
                items: ['1x Hộp gỗ sơn mài', '1x Bộ thẻ mạ cạnh', '1x Cuốn Artbook 80 trang'],
                quantityLimit: 100,
                estimatedDelivery: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
                isFeatured: false,
                sortOrder: 2,
              },
            ],
          },
          faqs: {
            create: [
              {
                question: 'Một ván chơi kéo dài bao lâu và cho bao nhiêu người?',
                answer: 'Trò chơi thiết kế cho từ 2 đến 5 người, mỗi ván kéo dài khoảng 30-45 phút.',
                sortOrder: 1,
              },
            ],
          },
        },
      });

      console.log(`✅ Created campaign: ${lacVietCampaign.title}`);
    } else {
      console.log('ℹ️ Campaign Lạc Việt already exists');
    }
  }

  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
