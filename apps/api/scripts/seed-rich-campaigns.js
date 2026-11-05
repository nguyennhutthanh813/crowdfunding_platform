const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding 2 rich showcase campaigns...');

  // 1. Fetch Categories
  const techCategory = await prisma.category.findUnique({ where: { slug: 'cong-nghe-sang-tao' } });
  const craftCategory = await prisma.category.findUnique({ where: { slug: 'thu-cong-my-nghe' } });

  if (!techCategory || !craftCategory) {
    throw new Error('Required categories not found!');
  }

  // 2. Fetch Users
  const thanhUser = await prisma.user.findUnique({ where: { email: 'nguyennhucthanh2239@gmail.com' } });
  const linhUser = await prisma.user.findUnique({ where: { email: 'linh@orbit.vn' } });
  const minhAnhUser = await prisma.user.findUnique({ where: { email: 'minhanh@example.com' } });
  const giaHuyUser = await prisma.user.findUnique({ where: { email: 'giahuy@orbit.vn' } });
  const userA = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
  const adminUser = await prisma.user.findUnique({ where: { email: 'quantri@gop.vn' } });

  const creator1 = thanhUser || linhUser;
  const creator2 = linhUser || minhAnhUser;

  const now = new Date();
  const startsAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  const endsAt1 = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000); // 20 days left
  const endsAt2 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days left

  // =========================================================================
  // CAMPAIGN 1: AURA Glass (Công nghệ âm thanh & Đèn khí khổng)
  // =========================================================================
  const slug1 = 'aura-glass-loa-den-khong-day';
  console.log(`Processing Campaign 1: ${slug1}...`);

  // Delete old if exists
  const existing1 = await prisma.campaign.findUnique({ where: { slug: slug1 } });
  if (existing1) {
    console.log(`Removing existing ${slug1} to re-seed clean...`);
    await prisma.comment.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.campaignUpdate.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.campaignFaq.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.pledge.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.rewardTier.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.addOn.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.shippingOption.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.campaignMedia.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.campaignMember.deleteMany({ where: { campaignId: existing1.id } });
    await prisma.campaign.delete({ where: { id: existing1.id } });
  }

  const campaign1 = await prisma.campaign.create({
    data: {
      creatorId: creator1.id,
      categoryId: techCategory.id,
      title: 'AURA Glass — Loa Bluetooth Đèn Khí Khổng Tán Sắc Tự Nhiên',
      slug: slug1,
      blurb: 'Ống thủy tinh cộng hưởng âm học 360° kết hợp ánh sáng đèn khí ấm áp nhịp nhàng theo giai điệu. Thân nhôm nguyên khối gia công CNC chính xác, pin 16 giờ và chuẩn giải mã Hi-Res LDAC.',
      storyMarkdown: `AURA Glass khởi nguồn từ khao khát dung hòa giữa công nghệ âm thanh độ phân giải cao và thẩm mỹ tối giản cho không gian sống hiện đại. Không chỉ là một chiếc loa, AURA Glass là một tác phẩm điêu khắc ánh sáng đem lại sự an tĩnh cho tâm hồn sau một ngày làm việc bận rộn.

> "Âm nhạc đích thực không chỉ để nghe bằng tai, mà là cảm giác ngập tràn trong không gian với ánh sáng êm dịu dẫn lối cho xúc cảm."

![Thiết kế ống thủy tinh hữu cơ cộng hưởng âm thanh 360 độ và ánh nến lung linh](https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1600&q=80)

### 1. Công nghệ cộng hưởng ống thủy tinh hữu cơ (Organic Glass Acoustic Resonance)
Khác biệt hoàn toàn với các dòng loa hộp truyền thống, AURA Glass ứng dụng ống thủy tinh borosilicate cao cấp làm màng rung phát âm. Ba bộ kích rung độc lập (piezoelectric actuators) gõ trực tiếp vào đáy ống thủy tinh, biến toàn bộ bề mặt hình trụ thành nguồn phát sóng âm đồng đều 360 độ. Kết quả là âm cao trong vắt như pha lê, giọng hát ca sĩ nổi khối tự nhiên giữa căn phòng mà không có bất kỳ điểm mù âm học nào.

- Âm thanh 360 độ không điểm mù: Ngồi ở bất kỳ vị trí nào trong phòng, bạn đều tận hưởng trọn vẹn dải âm chi tiết.
- Độ méo hài tổng (THD) cực thấp dưới 0.1% ở dải trung cao.
- Màng kính borosilicate chống trầy xước, truyền sóng âm với vận tốc cao gấp 3 lần màng loa giấy truyền thống.

![Chân đế nhôm nguyên khối gia công CNC chính xác và buồng âm dải trầm](https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80)

### 2. Dải trầm uy lực với màng rung thụ động đối xứng
Ở phần đế nhôm nguyên khối gia công CNC, một củ loa woofer 50mm hướng đáy kết hợp cùng màng cộng hưởng kép tạo nên những nốt bass sâu lắng, chắc gọn và tròn trịa. Dù nghe nhạc Jazz mộc mạc, Acoustic êm dịu hay tiết tấu Lofi chill ban đêm, âm trầm vẫn lan tỏa mượt mà không gây ù rền.

### 3. Ánh sáng ngọn nến dịu êm theo nhịp nhạc
Trung tâm ống thủy tinh là hệ thống dải LED dây tóc mô phỏng ngọn nến với nhiệt độ màu 2.200K cực kỳ ấm cúng. Bộ vi xử lý tín hiệu DSP phân tích biên độ âm thanh theo thời gian thực để tạo hiệu ứng thở nhẹ nhàng, đưa bạn vào trạng thái thiền định và thư thái tuyệt đối.

![Không gian thưởng thức âm nhạc và ánh sáng thư giãn tại gia](https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80)

### 4. Kết nối hiện đại và Thời lượng pin bền bỉ
- Chuẩn Bluetooth 5.3 hỗ trợ codec giải mã cao cấp LDAC / AAC / SBC, truyền tải âm thanh gấp 3 lần chuẩn nén thông thường.
- Cổng sạc USB-C hỗ trợ sạc nhanh Power Delivery, chỉ 2 giờ sạc cho 16 giờ thưởng thức liên tục.
- Chế độ Stereo Pair: Ghép đôi 2 loa AURA Glass chỉ với một nút chạm để tạo hệ thống âm thanh nổi stereo tách bạch trái - phải ấn tượng.`,
      risksMarkdown: `Chúng tôi đã hoàn thiện 5 vòng mẫu thử nghiệm cơ khí và đo kiểm âm học trong phòng câm tiêu chuẩn tại TP.HCM. 

Các rủi ro dự kiến và phương án kiểm soát:
1. Độ bền ống thủy tinh: Chúng tôi sử dụng kính cường lực borosilicate chịu lực và chống trầy xước gấp 4 lần kính thông thường, đồng thời thiết kế ngàm cao su chống sốc bên trong chân đế nhôm.
2. Kiểm định pin an toàn: Toàn bộ cell pin dung lượng 5.200mAh đã đạt chứng nhận an toàn UN38.3 và CE.
3. Vận chuyển: Hộp sản phẩm được đúc mút xốp EPE 6 lớp dày dặn, cam kết 1 đổi 1 ngay lập tức nếu có hư hại khi giao nhận.`,
      location: 'TP. Hồ Chí Minh',
      status: 'LIVE',
      goalAmount: BigInt(250_000_000),
      durationDays: 30,
      startsAt,
      publishedAt: startsAt,
      endsAt: endsAt1,
      members: {
        create: [
          { userId: creator1.id, role: 'OWNER' },
          ...(giaHuyUser ? [{ userId: giaHuyUser.id, role: 'COLLABORATOR' }] : []),
        ],
      },
      media: {
        create: [
          {
            mediaType: 'VIDEO',
            url: 'https://www.youtube.com/watch?v=k4V3Ui6PCrY',
            altText: 'Video giới thiệu âm học và ánh sáng AURA Glass',
            sortOrder: 1,
          },
          {
            mediaType: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1600&q=80',
            altText: 'AURA Glass đặt trên bàn gỗ làm việc buổi tối',
            sortOrder: 2,
          },
          {
            mediaType: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
            altText: 'Ánh sáng ngọn nến ấm cúng của AURA Glass',
            sortOrder: 3,
          },
        ],
      },
      rewardTiers: {
        create: [
          {
            title: 'Early Bird — AURA Glass Silver Edition',
            description: 'Mức giá ưu đãi đặc biệt nhất dành cho 60 người ủng hộ đầu tiên đồng hành cùng dự án. Thân nhôm màu bạc phay xước tinh tế.',
            amount: BigInt(2_490_000),
            items: [
              '1x Loa đèn AURA Glass (Màu Bạc Ánh Trăng)',
              '1x Cáp sạc USB-C bọc dù cao cấp 1.5m',
              '1x Khăn lau ống kính vi sợi chống tĩnh điện',
              'Thư cảm ơn khắc laser tên người ủng hộ',
            ],
            quantityLimit: 60,
            estimatedDelivery: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            isFeatured: true,
            sortOrder: 1,
          },
          {
            title: 'Gói Tiêu Chuẩn — AURA Glass Walnut Edition',
            description: 'Phiên bản chân đế bọc gỗ óc chó Bắc Mỹ xử lý dầu lau tự nhiên, hòa hợp hoàn hảo với phong cách nội thất mộc mạc và sang trọng.',
            amount: BigInt(2_990_000),
            items: [
              '1x Loa đèn AURA Glass (Phiên bản Gỗ Óc Chó)',
              '1x Củ sạc nhanh GaN 30W nhỏ gọn',
              '1x Cáp sạc USB-C dù 1.5m',
              'Hộp quà tặng cứng cao cấp ép kim',
            ],
            quantityLimit: 120,
            estimatedDelivery: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
            isFeatured: false,
            sortOrder: 2,
          },
          {
            title: 'Bộ Đôi Âm Thanh Nổi Stereo Pair (2x Loa)',
            description: 'Trải nghiệm không gian âm nhạc stereo đỉnh cao với 2 loa kết nối không dây đồng bộ ánh sáng ngọn nến.',
            amount: BigInt(4_690_000),
            items: [
              '2x Loa AURA Glass (Tùy chọn màu Bạc hoặc Gỗ)',
              '2x Bộ cáp sạc và củ sạc GaN 30W',
              'Tặng kèm 2 đế sạc không dây nam châm bọc da',
            ],
            quantityLimit: 40,
            estimatedDelivery: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
            isFeatured: false,
            sortOrder: 3,
          },
          {
            title: 'Bộ Sưu Tập Giới Hạn Studio Collector',
            description: 'Phiên bản đặc biệt đánh số Serial 01-15, kèm chữ ký nghệ nhân cơ khí và hộp gỗ khắc laser thủ công độc bản.',
            amount: BigInt(6_490_000),
            items: [
              '1x Loa AURA Glass phiên bản giới hạn mạ anode màu Than Chì (Graphite)',
              'Chân đế sạc da bò sáp Ý khâu tay thủ công',
              'Bao da du lịch cao cấp dập chìm tên backer',
              'Chứng nhận sở hữu độc bản & Bảo hành trọn đời 1 đổi 1',
            ],
            quantityLimit: 15,
            estimatedDelivery: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            isFeatured: false,
            sortOrder: 4,
          },
        ],
      },
      addOns: {
        create: [
          {
            title: 'Đế sạc không dây nam châm bọc da bò thảo mộc',
            description: 'Đặt loa lên là sạc, tích hợp nam châm định vị chắc chắn chống trượt trên mặt bàn.',
            amount: BigInt(350_000),
            quantityLimit: 200,
          },
          {
            title: 'Bao da du lịch bảo vệ chống sốc may thủ công',
            description: 'Lớp nệm nhung mềm mại bảo vệ tối đa ống thủy tinh khi mang đi dã ngoại hoặc cà phê.',
            amount: BigInt(240_000),
            quantityLimit: 150,
          },
        ],
      },
      shippingOptions: {
        create: [
          {
            name: 'Giao hàng tiêu chuẩn toàn quốc (Bọc chống sốc 6 lớp)',
            provinceCode: 'ALL',
            feeAmount: BigInt(40_000),
            estimatedDaysMin: 2,
            estimatedDaysMax: 4,
          },
          {
            name: 'Hỏa tốc nội thành Hà Nội & TP. Hồ Chí Minh',
            provinceCode: 'METRO',
            feeAmount: BigInt(60_000),
            estimatedDaysMin: 1,
            estimatedDaysMax: 1,
          },
        ],
      },
      faqs: {
        create: [
          {
            question: 'Ống thủy tinh của loa có dễ bị nứt vỡ khi va chạm không?',
            answer: 'Ống phát âm được làm từ thủy tinh borosilicate cường lực cao cấp, có khả năng chịu lực va đập và chịu nhiệt rất cao tương tự dụng cụ thí nghiệm. Phần chân đế còn được trang bị ngàm đệm cao su giảm chấn, bảo vệ an toàn ngay cả khi bị nghiêng đổ trên mặt bàn thông thường.',
            sortOrder: 1,
          },
          {
            question: 'Thời lượng pin thực tế khi vừa phát nhạc vừa bật đèn sáng tối đa là bao lâu?',
            answer: 'Với viên pin dung lượng 5.200mAh, ở mức âm lượng 60% và ánh sáng đèn nến ở mức trung bình, loa có thể hoạt động liên tục từ 14 đến 16 giờ. Khi bật ánh sáng đèn ở mức sáng tối đa cùng âm lượng lớn nhất, thời lượng sử dụng đạt khoảng 9 - 10 giờ liên tục.',
            sortOrder: 2,
          },
          {
            question: 'Tôi có thể kết nối 2 chiếc AURA Glass để tạo dàn âm thanh nổi Stereo không?',
            answer: 'Hoàn toàn được! Loa hỗ trợ công nghệ Wireless Stereo Pairing. Bạn chỉ cần nhấn đúp nút ghép nối trên cả hai loa, hệ thống sẽ tự động bắt cặp và phân kênh âm thanh Trái (Left) và Phải (Right) mang lại trường âm nổi sống động.',
            sortOrder: 3,
          },
          {
            question: 'Sản phẩm có ứng dụng điều khiển trên điện thoại không?',
            answer: 'Có! Ứng dụng AURA Sound (hỗ trợ cả iOS và Android) cho phép bạn tùy chỉnh 5 cấp độ ánh sáng nến, hẹn giờ ngủ tắt dần, điều chỉnh Equalizer (EQ) chuyên sâu và cập nhật phần mềm OTA miễn phí.',
            sortOrder: 4,
          },
          {
            question: 'Chính sách bảo hành và đổi trả như thế nào?',
            answer: 'Sản phẩm được bảo hành chính hãng 12 tháng tại Việt Nam với chính sách 1 đổi 1 trong vòng 30 ngày đầu nếu phát sinh lỗi từ nhà sản xuất.',
            sortOrder: 5,
          },
        ],
      },
      updates: {
        create: [
          {
            authorId: creator1.id,
            title: 'Cập nhật #1: Hoàn thành thử nghiệm buồng câm âm học & Tinh chỉnh dải trầm',
            bodyMarkdown: `Chào mọi người, đội ngũ kỹ sư AURA vừa kết thúc 3 ngày làm việc liên tục tại phòng thử nghiệm âm học chuẩn ISO tại Quận 9. 

Chúng tôi đã tối ưu lại biên độ dao động của củ loa sub 50mm, giúp dải trầm xuống sâu đến 48Hz mà không làm rung lắc thân đèn. Biểu đồ tần số đáp ứng phẳng đều từ 120Hz đến 20kHz, mang lại chất âm cân bằng và truyền cảm tuyệt vời. 

Cảm ơn hơn 100 người ủng hộ đầu tiên đã tiếp thêm động lực to lớn cho đội ngũ!`,
            publishedAt: new Date(startsAt.getTime() + 4 * 24 * 60 * 60 * 1000),
          },
          {
            authorId: creator1.id,
            title: 'Cập nhật #2: Chốt khuôn nhôm CNC Anodized và kiểm tra độ bền nhiệt',
            bodyMarkdown: `Hôm nay chúng tôi đã nghiệm thu lô phôi nhôm 6063 đầu tiên được gia công từ máy phay CNC 5 trục. Độ hoàn thiện bề mặt phay cát mịn màng, lớp mạ Anodized kháng oxy hóa đạt tiêu chuẩn khắt khe. 

Đồng thời, bài test nhiệt độ đèn LED liên tục 72 giờ cho thấy nhiệt lượng chỉ ở mức 36°C quanh chân đế, hoàn toàn an toàn và êm ái khi chạm vào.`,
            publishedAt: new Date(startsAt.getTime() + 8 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  console.log(`✅ Created Campaign 1: ${campaign1.title}`);

  // Add Comments for Campaign 1
  const c1_comment1 = await prisma.comment.create({
    data: {
      campaignId: campaign1.id,
      authorId: minhAnhUser ? minhAnhUser.id : creator1.id,
      body: 'Thiết kế đẹp và tinh tế quá! Mình rất thích tính năng ghép đôi 2 loa stereo. Cho mình hỏi nếu dùng cổng sạc USB-C cắm cố định trên bàn làm việc thì pin có cơ chế tự ngắt bảo vệ không ạ?',
      badge: 'BACKER',
      likeCount: 5,
      createdAt: new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.comment.create({
    data: {
      campaignId: campaign1.id,
      authorId: creator1.id,
      parentCommentId: c1_comment1.id,
      body: 'Chào bạn Minh Anh! Mạch sạc của AURA Glass được tích hợp chip quản lý nguồn thông minh (Power Management IC). Khi pin đầy 100%, mạch sẽ tự động chuyển sang chế độ Pass-Through lấy nguồn trực tiếp từ củ sạc, hoàn toàn không bị chai pin hay phồng rộp khi cắm liên tục bạn nhé!',
      badge: 'CREATOR',
      likeCount: 4,
      createdAt: new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000),
    },
  });

  await prisma.comment.create({
    data: {
      campaignId: campaign1.id,
      authorId: userA ? userA.id : creator1.id,
      body: 'Đã ủng hộ gói Early Bird! Rất mong chờ được trải nghiệm âm thanh 360 độ từ ống thủy tinh. Chúc dự án thành công rực rỡ!',
      badge: 'BACKER',
      likeCount: 3,
      createdAt: new Date(startsAt.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Add sample Pledges for Campaign 1 to make backer count & pledged amount realistic
  const rewards1 = await prisma.rewardTier.findMany({ where: { campaignId: campaign1.id } });
  if (rewards1.length > 0 && minhAnhUser) {
    await prisma.pledge.create({
      data: {
        campaignId: campaign1.id,
        backerId: minhAnhUser.id,
        rewardTierId: rewards1[0].id,
        rewardAmount: rewards1[0].amount,
        shippingAmount: BigInt(40_000),
        totalAmount: rewards1[0].amount + BigInt(40_000),
        status: 'AUTHORIZED',
      },
    });
  }
  if (rewards1.length > 1 && userA) {
    await prisma.pledge.create({
      data: {
        campaignId: campaign1.id,
        backerId: userA.id,
        rewardTierId: rewards1[1].id,
        rewardAmount: rewards1[1].amount,
        shippingAmount: BigInt(40_000),
        totalAmount: rewards1[1].amount + BigInt(40_000),
        status: 'AUTHORIZED',
      },
    });
  }
  if (rewards1.length > 2 && giaHuyUser) {
    await prisma.pledge.create({
      data: {
        campaignId: campaign1.id,
        backerId: giaHuyUser.id,
        rewardTierId: rewards1[2].id,
        rewardAmount: rewards1[2].amount,
        bonusAmount: BigInt(500_000),
        totalAmount: rewards1[2].amount + BigInt(500_000),
        status: 'CAPTURED',
      },
    });
  }


  // =========================================================================
  // CAMPAIGN 2: Gốm Lam Sa (Thủ công mỹ nghệ & Văn hóa trà Việt)
  // =========================================================================
  const slug2 = 'gom-lam-sa-bo-tra-dao-men-tro';
  console.log(`Processing Campaign 2: ${slug2}...`);

  const existing2 = await prisma.campaign.findUnique({ where: { slug: slug2 } });
  if (existing2) {
    console.log(`Removing existing ${slug2} to re-seed clean...`);
    await prisma.comment.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.campaignUpdate.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.campaignFaq.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.pledge.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.rewardTier.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.addOn.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.shippingOption.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.campaignMedia.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.campaignMember.deleteMany({ where: { campaignId: existing2.id } });
    await prisma.campaign.delete({ where: { id: existing2.id } });
  }

  const campaign2 = await prisma.campaign.create({
    data: {
      creatorId: creator2.id,
      categoryId: craftCategory.id,
      title: 'Gốm Lam Sa — Bộ Trà Đạo Men Tro Rơm & Đất Sét Núi Phước Tích',
      slug: slug2,
      blurb: 'Tái sinh dòng men tro rơm cổ truyền trên phôi gốm nung củi nhiệt độ cao 1.280°C. Mỗi ấm trà là một tác phẩm hỏa biến độc bản không trùng lặp, tối ưu công thái học rót nước ngắt dòng dứt khoát.',
      storyMarkdown: `Nằm bên dòng sông Ô Lâu hiền hòa, làng cổ Phước Tích (Thừa Thiên Huế) từng nức tiếng với nghề gốm tiến vua có lịch sử hơn 500 năm. Trải qua bao thăng trầm, những lò nung củi truyền thống dần nguội lửa. Dự án "Gốm Lam Sa" ra đời nhằm bảo tồn và thổi hồn đương đại vào di sản gốm Việt, mang tinh hoa trà đạo dân tộc đến gần hơn với không gian sống hiện đại.

> "Trà ngon phải có bạn hiền, chén đẹp nung củi vẹn nguyên nghĩa tình. Mỗi chiếc ấm Lam Sa mang theo giọt phù sa sông Ô Lâu và tâm huyết của những nghệ nhân giữ lửa cuối cùng xứ Huế."

![Bộ ấm chén gốm Lam Sa men tro rơm hỏa biến độc bản](https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=80)

### 1. Đất sét phù sa trầm tích và Kỹ thuật luyện đất thủ công
Phôi gốm Lam Sa được phối trộn từ đất sét vàng trầm tích núi Phước Tích và phù sa sông Ô Lâu, qua 3 công đoạn ngâm ủ, lắng lọc và dùng chân giẫm luyện dẻo không dùng máy ép công nghiệp. Đất có hàm lượng khoáng tự nhiên cao, giúp làm mềm nước và lưu giữ trọn vẹn hương vị thanh tao của từng búp trà Shan Tuyết cổ thụ.

- Đất sét giàu oxit sắt và khoáng chất tự nhiên giúp nước pha trà ngọt hậu hơn.
- Lọc kỹ 4 tầng qua lụa tơ tằm, loại bỏ hoàn toàn sạn sỏi thô.
- Chuốt tay từng phôi ấm trên bàn xoay truyền thống, độ dày chuẩn xác 3.5mm giữ nhiệt cực tốt.

![Nghệ nhân chuốt phôi ấm trà trên bàn xoay thủ công tại làng Phước Tích](https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80)

### 2. Men tro rơm nếp hỏa biến tự nhiên
Men phủ không dùng bất kỳ oxit kim loại nhân tạo nào. Nghệ nhân đốt tro từ thân rơm nếp đồng chiêm, nghiền mịn cùng bột đá thạch anh và phù sa lỏng. Khi đưa vào lò bầu nung củi ở nhiệt độ 1.280°C suốt 48 giờ liên tục, tàn tro bay theo ngọn lửa đáp ngẫu nhiên lên thân gốm, tạo nên lớp men hỏa biến sắc xanh rêu ngọc (Lam Sa) loang lổ độc nhất vô nhị. Không có hai chiếc ấm nào mang vân men giống hệt nhau.

![Chi tiết chất men tro rơm hỏa biến loang sắc ngọc rêu](https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=1200&q=80)

### 3. Công thái học hoàn mỹ: Ngắt nước dứt khoát, Cầm nắm êm tay
- Vòi ấm uốn cong theo dáng chim bói cá, dòng nước rót ra tròn đầy, dứt khoát không để lại giọt rỉ bám miệng ấm.
- Quai ấm uốn khuyết hình bán nguyệt vừa vặn hai ngón tay cầm, cách nhiệt tuyệt đối không gây bỏng tay khi pha nước sôi 100°C.
- Nắp ấm mài khít hoàn hảo, khi bịt ngón tay vào lỗ thông hơi trên núm nắp, dòng nước lập tức dừng chảy hoàn toàn.

### 4. Trọn bộ thưởng trà Lam Sa
- 1 Ấm pha trà dung tích 180ml (thích hợp song ẩm hoặc tứ ẩm)
- 4 Chén trà lòng phủ men ngọc tràm tôn sắc nước trà
- 1 Khay trà tre ép già ngâm tẩm sáp ong tự nhiên chống ẩm mốc
- Hộp đựng bọc vải lanh mộc mạc làm quà biếu tặng tao nhã.`,
      risksMarkdown: `Nung gốm củi ở nhiệt độ cao 1.280°C luôn tiềm ẩn tỷ lệ nứt mẻ tự nhiên khoảng 15-20% do lửa lò biến động. 

Để kiểm soát rủi ro và cam kết đúng tiến độ giao hàng:
1. Chúng tôi đã lên kế hoạch nung dôi dư 30% sản lượng để chọn lọc ra những chiếc ấm đạt độ chín men hoàn hảo nhất.
2. Mỗi chiếc ấm trước khi đóng gói đều được thử nghiệm độ khít nắp và độ ngắt nước bằng nước sôi 3 lần.
3. Đóng gói chuyên dụng bọc túi khí chống sốc 4 lớp kèm hộp định hình cứng cáp, cam kết hoàn tiền hoặc đổi mới ngay nếu có sứt mẻ trong quá trình vận chuyển.`,
      location: 'Thừa Thiên Huế',
      status: 'LIVE',
      goalAmount: BigInt(120_000_000),
      durationDays: 30,
      startsAt,
      publishedAt: startsAt,
      endsAt: endsAt2,
      members: {
        create: [
          { userId: creator2.id, role: 'OWNER' },
          ...(thanhUser ? [{ userId: thanhUser.id, role: 'COLLABORATOR' }] : []),
        ],
      },
      media: {
        create: [
          {
            mediaType: 'VIDEO',
            url: 'https://www.youtube.com/watch?v=bTqVqk7FSmY',
            altText: 'Video nghệ nhân chuốt gốm và nung củi tại làng gốm',
            sortOrder: 1,
          },
          {
            mediaType: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=80',
            altText: 'Bộ ấm chén gốm Lam Sa trên bàn trà mộc',
            sortOrder: 2,
          },
          {
            mediaType: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=1200&q=80',
            altText: 'Nghi thức pha trà với ấm gốm hỏa biến',
            sortOrder: 3,
          },
        ],
      },
      rewardTiers: {
        create: [
          {
            title: 'Bộ Song Ẩm Lam Sa (1 Ấm + 2 Chén)',
            description: 'Dành cho những buổi hàn huyên tâm tình bên chén trà thơm. Bao gồm 1 ấm trà 180ml và 2 chén uống trà men ngọc.',
            amount: BigInt(890_000),
            items: [
              '1x Ấm trà men tro Lam Sa 180ml',
              '2x Chén trà men ngọc lòng sâu',
              '1x Khăn lau trà dệt sợi gai tự nhiên',
              'Hộp quà giấy kraft mộc thân thiện môi trường',
            ],
            quantityLimit: 80,
            estimatedDelivery: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            isFeatured: false,
            sortOrder: 1,
          },
          {
            title: 'Bộ Thập Toàn Trà Đạo (1 Ấm + 4 Chén + Khay Tre)',
            description: 'Bộ sản phẩm đầy đủ và được yêu thích nhất. Đáy ấm có khắc triện nghệ nhân và chữ ký thủ công.',
            amount: BigInt(1_450_000),
            items: [
              '1x Ấm trà Lam Sa độc bản khắc triện nghệ nhân',
              '4x Chén trà men tro đồng bộ',
              '1x Chén tống (chén chia trà) dung tích 200ml',
              '1x Khay trà tre già phủ sáp ong tự nhiên',
              'Tặng 1 gói trà cổ thụ Shan Tuyết Hà Giang 100g',
            ],
            quantityLimit: 120,
            estimatedDelivery: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            isFeatured: true,
            sortOrder: 2,
          },
          {
            title: 'Bộ Đại Thưởng Trà Sưu Tầm Cao Cấp',
            description: 'Phiên bản giới hạn dành riêng cho nhà sưu tập trà cụ. Hỏa biến vân lông thỏ ngũ sắc quý hiếm kèm hộp gỗ thông khắc chìm.',
            amount: BigInt(2_450_000),
            items: [
              '1x Ấm trà men hỏa biến tuyển chọn số 1',
              '6x Chén trà Lam Sa nghệ thuật',
              '1x Hũ gốm đựng trà nắp bọc lá đồng khít khí',
              '1x Bộ phụ kiện kẹp gắp và muỗng xúc trà bằng gỗ cẩm lai',
              'Hộp gỗ thông khắc chìm phong cảnh làng Phước Tích',
            ],
            quantityLimit: 30,
            estimatedDelivery: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            isFeatured: false,
            sortOrder: 3,
          },
        ],
      },
      addOns: {
        create: [
          {
            title: 'Trà Cổ Thụ Shan Tuyết Tây Côn Lĩnh (Hộp 100g)',
            description: 'Búp trà 1 tôm 2 lá thu hái từ cây chè cổ thụ trên 300 năm tuổi tại đỉnh Tây Côn Lĩnh.',
            amount: BigInt(280_000),
            quantityLimit: 100,
          },
          {
            title: 'Khăn lót trà dệt sợi gai nhuộm chàm thủ công',
            description: 'Dệt tay từ sợi gai dầu tự nhiên, nhuộm chàm truyền thống thấm hút nước cực tốt.',
            amount: BigInt(110_000),
            quantityLimit: 150,
          },
        ],
      },
      shippingOptions: {
        create: [
          {
            name: 'Giao hàng tiêu chuẩn toàn quốc (Đóng hộp bọt khí chống va đập)',
            provinceCode: 'ALL',
            feeAmount: BigInt(35_000),
            estimatedDaysMin: 3,
            estimatedDaysMax: 5,
          },
        ],
      },
      faqs: {
        create: [
          {
            question: 'Men tro rơm tự nhiên có an toàn tuyệt đối khi pha nước sôi không?',
            answer: 'Hoàn toàn an toàn 100%! Gốm Lam Sa được nung chín ở nhiệt độ cao 1.280°C nên phôi đất đã được khử hoàn toàn tạp chất và kim loại nặng. Men tro từ rơm nếp tự nhiên kết tinh thành thủy tinh silicat trơ, không giải phóng bất kỳ độc tố nào ngay cả khi ủ nước sôi 100°C trong nhiều giờ.',
            sortOrder: 1,
          },
          {
            question: 'Vân men của chiếc ấm tôi nhận được có giống hệt trên hình không?',
            answer: 'Đặc trưng quý giá nhất của gốm hỏa biến nung củi là tính "Độc bản". Lửa lò và tàn tro tự nhiên sẽ tạo ra các dải màu xanh lam, ánh rêu hoặc nâu hổ phách ngẫu nhiên. Chiếc ấm của bạn sẽ có cùng phom dáng công thái học chuẩn nhưng màu sắc men sẽ mang nét chấm phá riêng biệt duy nhất!',
            sortOrder: 2,
          },
          {
            question: 'Cách khai ấm và chăm sóc ấm gốm nung củi lần đầu như thế nào?',
            answer: 'Khi mới nhận ấm, bạn rửa sạch bằng nước ấm, sau đó cho ấm vào nồi nước sôi cùng một ít lá trà đun nhỏ lửa khoảng 15 phút để loại bỏ mùi đất phôi mới. Sau đó bạn có thể sử dụng bình thường. Càng dùng lâu, chất gốm sẽ càng bóng nhuận và tích hương trà thanh khiết.',
            sortOrder: 3,
          },
          {
            question: 'Nếu trong lúc vận chuyển không may bị sứt mẻ thì xử lý thế nào?',
            answer: 'Chúng tôi đóng gói với 4 lớp xốp khí dày và hộp cứng định hình. Nếu bưu tá giao hàng tới và sản phẩm bị sứt mẻ dù chỉ một vết nhỏ, bạn chỉ cần chụp ảnh gửi cho chúng tôi, xưởng sẽ gửi chiếc ấm mới ngay lập tức mà bạn không mất thêm chi phí nào.',
            sortOrder: 4,
          },
        ],
      },
      updates: {
        create: [
          {
            authorId: creator2.id,
            title: 'Cập nhật #1: Kết thúc mẻ nung thử nghiệm số 3 trong lò bầu cổ',
            bodyMarkdown: `Hôm qua, xưởng đã chính thức mở cửa lò bầu sau 48 giờ nung và 24 giờ hạ nhiệt tự nhiên. 

Mẻ nung đạt kết quả vượt ngoài mong đợi: Tỷ lệ ấm lên men hỏa biến chuẩn sắc Lam Sa đạt tới 92%. Dáng vòi chim bói cá thử nghiệm dòng chảy cho tia nước cực kỳ êm ái, ngắt dứt điểm không đọng nước. Chúng tôi đang tiếp tục tinh chỉnh khâu mài nắp để đạt độ kín khí tuyệt đối.`,
            publishedAt: new Date(startsAt.getTime() + 6 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  console.log(`✅ Created Campaign 2: ${campaign2.title}`);

  // Add Comments for Campaign 2
  await prisma.comment.create({
    data: {
      campaignId: campaign2.id,
      authorId: minhAnhUser ? minhAnhUser.id : creator2.id,
      body: 'Gốm nung củi Phước Tích nổi tiếng giữ nhiệt rất tốt. Mình thích dáng ấm Tây Thi này ghê, nhìn mộc mạc mà sang!',
      badge: 'BACKER',
      likeCount: 4,
      createdAt: new Date(startsAt.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.comment.create({
    data: {
      campaignId: campaign2.id,
      authorId: creator2.id,
      body: 'Cảm ơn bạn! Để giữ nhiệt lâu, thành ấm được các nghệ nhân chuốt dày dặn 3.5mm, kết hợp chất đất sét núi giàu khoáng giúp nước trà giữ được hương thơm ngào ngạt suốt buổi thưởng trà.',
      badge: 'CREATOR',
      likeCount: 6,
      createdAt: new Date(startsAt.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 3600 * 1000),
    },
  });

  // Add Pledges for Campaign 2
  const rewards2 = await prisma.rewardTier.findMany({ where: { campaignId: campaign2.id } });
  if (rewards2.length > 0 && adminUser) {
    await prisma.pledge.create({
      data: {
        campaignId: campaign2.id,
        backerId: adminUser.id,
        rewardTierId: rewards2[0].id,
        rewardAmount: rewards2[0].amount,
        shippingAmount: BigInt(35_000),
        totalAmount: rewards2[0].amount + BigInt(35_000),
        status: 'AUTHORIZED',
      },
    });
  }
  if (rewards2.length > 1 && minhAnhUser) {
    await prisma.pledge.create({
      data: {
        campaignId: campaign2.id,
        backerId: minhAnhUser.id,
        rewardTierId: rewards2[1].id,
        rewardAmount: rewards2[1].amount,
        shippingAmount: BigInt(35_000),
        bonusAmount: BigInt(200_000),
        totalAmount: rewards2[1].amount + BigInt(235_000),
        status: 'CAPTURED',
      },
    });
  }

  console.log('🎉 All 2 showcase campaigns successfully seeded!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

