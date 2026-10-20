import { PrismaClient, GlobalRole, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const defaultPasswordHash = await bcrypt.hash('gop12345', 12);

  // 1. Seed Categories
  const categories = [
    { name: 'Công nghệ & Sáng tạo', slug: 'cong-nghe-sang-tao', sortOrder: 1 },
    { name: 'Nghệ thuật & Xuất bản', slug: 'nghe-thuat-xuat-ban', sortOrder: 2 },
    { name: 'Thủ công mỹ nghệ', slug: 'thu-cong-my-nghe', sortOrder: 3 },
    { name: 'Cộng đồng & Xã hội', slug: 'cong-dong-xa-hoi', sortOrder: 4 },
    { name: 'Ẩm thực & Nông sản', slug: 'am-thuc-nong-san', sortOrder: 5 },
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

  // 2. Seed Users & Roles matching preview accounts
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
      roles: ['BACKER', 'COLLABORATOR' as unknown as GlobalRole], // GlobalRole enum has BACKER, CREATOR, ADMIN
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
      const validRoles = item.roles.filter((r) => ['BACKER', 'CREATOR', 'ADMIN'].includes(r));
      await prisma.user.create({
        data: {
          email: item.email,
          displayName: item.displayName,
          passwordHash: defaultPasswordHash,
          bio: item.bio,
          status: AccountStatus.ACTIVE,
          roles: {
            create: validRoles.map((role) => ({ role })),
          },
        },
      });
      console.log(`✅ Created user: ${item.email}`);
    } else {
      console.log(`ℹ️ User already exists: ${item.email}`);
    }
  }

  // 3. Seed Campaigns
  const techCategory = await prisma.category.findUnique({ where: { slug: 'cong-nghe-sang-tao' } });
  const artCategory = await prisma.category.findUnique({ where: { slug: 'nghe-thuat-xuat-ban' } });
  const linhUser = await prisma.user.findUnique({ where: { email: 'linh@orbit.vn' } });
  const minhAnhUser = await prisma.user.findUnique({ where: { email: 'minhanh@example.com' } });
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
          title: 'ORBIT One — Máy pha cà phê thông minh cho gia đình',
          slug: 'orbit-one-ca-phe-thong-minh',
          blurb: 'Kiểm soát nhiệt độ, áp suất và tỷ lệ chiết xuất chính xác qua vi điều khiển kép. Thiết kế tối giản, dễ bảo trì và sản xuất tại Việt Nam.',
          storyMarkdown: `## Câu chuyện dự án\n\nORBIT One bắt đầu từ trăn trở: làm sao để người yêu cà phê tại gia có được ly pour-over hoàn hảo mỗi sáng mà không cần đầu tư những cỗ máy công nghiệp đắt đỏ.\n\n### Điểm nổi bật\n- Cảm biến nhiệt độ PID kép với độ lệch dưới 0.5°C.\n- Bơm áp lực biến thiên mô phỏng tay nghề barista chuyên nghiệp.\n- Mọi linh kiện cơ khí đều có thể mở nắp vệ sinh và thay thế sau 5-10 năm sử dụng.\n- Kết nối ứng dụng di động để chia sẻ công thức chiết xuất.`,
          risksMarkdown: `Chúng tôi đã hoàn thành 4 phiên bản mẫu thử nghiệm (working prototype) và chốt nhà cung ứng linh kiện tại Bình Dương. Rủi ro chính là thời gian kiểm định an toàn điện gia dụng có thể kéo dài thêm 2-3 tuần. Chúng tôi cam kết cập nhật tiến độ minh bạch mỗi 2 tuần cho người ủng hộ.`,
          location: 'TP. Hồ Chí Minh',
          status: 'LIVE',
          goalAmount: BigInt(200_000_000),
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
                title: 'Gói Tiên phong (Early Bird)',
                description: 'Dành cho 50 người ủng hộ đầu tiên với mức giá ưu đãi nhất.',
                amount: BigInt(1_290_000),
                items: ['1x Máy pha cà phê ORBIT One', '1x Cốc đong định lượng 60ml', '1x Gói cà phê Cầu Đất Arabica 250g'],
                quantityLimit: 50,
                estimatedDelivery: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                isFeatured: true,
                sortOrder: 1,
              },
              {
                title: 'Gói Tiêu chuẩn ORBIT One',
                description: 'Bộ sản phẩm đầy đủ cho gia đình hoặc văn phòng nhỏ.',
                amount: BigInt(1_690_000),
                items: ['1x Máy pha cà phê ORBIT One', '1x Cốc đong', '2x Gói cà phê đặc sản 250g'],
                quantityLimit: 200,
                estimatedDelivery: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
                isFeatured: false,
                sortOrder: 2,
              },
              {
                title: 'Bộ Đôi Sáng tạo (Duo Pack)',
                description: '2 máy ORBIT One cho bạn và người thân cùng màu sắc tùy chọn.',
                amount: BigInt(3_190_000),
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
                title: 'Phễu lọc gốm sứ Bát Tràng tráng men thủ công',
                description: 'Phễu lọc thiết kế độc quyền tối ưu dòng chảy cà phê.',
                amount: BigInt(250_000),
                quantityLimit: 150,
              },
              {
                title: 'Bình giữ nhiệt cách nhiệt chân không 500ml',
                description: 'Bình inox 316 giữ nóng 8 tiếng, lạnh 14 tiếng khắc logo dự án.',
                amount: BigInt(180_000),
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

  if (artCategory && minhAnhUser) {
    const existingLacViet = await prisma.campaign.findUnique({
      where: { slug: 'lac-viet-su-thi-the-bai' },
    });

    if (!existingLacViet) {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

      const lacVietCampaign = await prisma.campaign.create({
        data: {
          creatorId: minhAnhUser.id,
          categoryId: artCategory.id,
          title: 'Lạc Việt: Bản Hùng Ca — Board Game Dã Sử Việt Nam',
          slug: 'lac-viet-su-thi-the-bai',
          blurb: 'Trò chơi thẻ bài chiến thuật tái hiện các triều đại lịch sử Việt Nam với hơn 120 thẻ vẽ tay minh họa kỳ công.',
          storyMarkdown: `## Giới thiệu dự án\n\nLạc Việt là dự án boardgame dã sử được nghiên cứu tư liệu qua hơn 2 năm, kết hợp giữa yếu tố giải trí trí tuệ và tình yêu lịch sử dân tộc.`,
          risksMarkdown: `Chúng tôi đã liên kết cùng xưởng in chuyên nghiệp đạt chuẩn bài quốc tế tại Hà Nội. Khả năng chậm trễ rất thấp.`,
          location: 'Hà Nội',
          status: 'LIVE',
          goalAmount: BigInt(80_000_000),
          durationDays: 45,
          startsAt: now,
          publishedAt: now,
          endsAt,
          members: {
            create: [{ userId: minhAnhUser.id, role: 'OWNER' }],
          },
          rewardTiers: {
            create: [
              {
                title: 'Hộp Trò chơi Cơ bản',
                description: 'Bao gồm 120 thẻ bài, 1 bàn cờ vải lụa, xúc xắc gỗ và sách hướng dẫn.',
                amount: BigInt(350_000),
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
