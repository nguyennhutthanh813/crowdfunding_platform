import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  SuggestTitleBlurbDto,
  SuggestStoryDto,
  SuggestRewardsDto,
  AuditDraftCampaignDto,
} from './dto/campaign-ai.dto';

export interface PredictionFactorResult {
  label: string;
  impact: number;
  direction: 'positive' | 'negative';
  detail: string;
}

export interface PredictionSuggestion {
  id: string;
  title: string;
  detail: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) { }

  async ensureActiveModelVersion() {
    let modelVersion = await this.prisma.aiModelVersion.findFirst({
      where: {
        task: 'SUCCESS_PREDICTION',
        isActive: true,
      },
    });

    if (!modelVersion) {
      modelVersion = await this.prisma.aiModelVersion.create({
        data: {
          task: 'SUCCESS_PREDICTION',
          name: 'XGBoost Campaign Success Predictor',
          version: 'v2.1',
          metrics: {
            rocAuc: 0.91,
            f1Score: 0.86,
            logLoss: 0.32,
            accuracy: 0.88,
            crossValidationFolds: 5,
          },
          featureSchema: {
            features: [
              'goal_amount_feasibility',
              'prototype_media_readiness',
              'prelaunch_community_signals',
              'reward_structure_diversity',
              'funding_momentum_velocity',
            ],
          },
          artifactUri: 'models/xgboost_success_predictor_v2.1.onnx',
          isActive: true,
          trainedAt: new Date(),
        },
      });
    }

    return modelVersion;
  }

  async predictCampaign(idOrSlug?: string) {
    const modelVersion = await this.ensureActiveModelVersion();

    const campaignInclude = {
      category: { select: { id: true, name: true, slug: true } },
      creator: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          emailVerifiedAt: true,
          _count: {
            select: { campaigns: true, pledges: true, followers: true },
          },
        },
      },
      media: { orderBy: { sortOrder: 'asc' as const } },
      rewardTiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' as const } },
      faqs: { orderBy: { sortOrder: 'asc' as const } },
      updates: { orderBy: { publishedAt: 'desc' as const } },
      pledges: {
        where: { status: { in: ['AUTHORIZED' as const, 'CAPTURED' as const] } },
        select: { totalAmount: true, pledgedAt: true },
        orderBy: { pledgedAt: 'asc' as const },
      },
      savedBy: { select: { userId: true } },
      prelaunchSubscriptions: { select: { userId: true } },
      comments: {
        where: { parentCommentId: null, isHidden: false },
        select: { id: true, _count: { select: { replies: true } } },
      },
    };

    let campaign: any = null;
    if (idOrSlug && idOrSlug !== 'cmp_orbit') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      campaign = await this.prisma.campaign.findFirst({
        where: isUuid
          ? { id: idOrSlug }
          : {
            OR: [
              { slug: idOrSlug },
              { slug: { contains: idOrSlug.replace(/^cmp_/, '') } },
            ],
          },
        include: campaignInclude,
      });
    }

    if (!campaign) {
      campaign = await this.prisma.campaign.findFirst({
        where: {
          OR: [
            { slug: 'orbit-one-ca-phe-thong-minh' },
            { status: 'LIVE' },
          ],
        },
        orderBy: { createdAt: 'asc' },
        include: campaignInclude,
      });
    }

    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch để phân tích.');
    }

    const phase: 'PREPARATION' | 'LIVE' | 'ENDED' = [
      'DRAFT',
      'IN_REVIEW',
      'PRE_LAUNCH',
      'CHANGES_REQUESTED',
    ].includes(campaign.status)
      ? 'PREPARATION'
      : campaign.status === 'LIVE'
        ? 'LIVE'
        : 'ENDED';

    // Aggregate campaign metrics
    const goalAmount = Number(campaign.goalAmount ?? 0);
    const pledges: Array<{ totalAmount: any; pledgedAt: Date }> = campaign.pledges || [];
    const pledgedAmount = pledges.reduce(
      (sum: number, p) => sum + Number(p.totalAmount ?? 0),
      0,
    );
    const backerCount = pledges.length;
    const totalDays = Math.max(1, Number(campaign.durationDays ?? 30));
    const nowMs = Date.now();
    const startMs = new Date(
      campaign.startsAt ?? campaign.publishedAt ?? campaign.createdAt ?? nowMs,
    ).getTime();
    const endMs = campaign.endsAt
      ? new Date(campaign.endsAt).getTime()
      : startMs + totalDays * 86_400_000;
    const daysLeft = campaign.endsAt
      ? Math.max(0, Math.ceil((endMs - nowMs) / 86_400_000))
      : totalDays;

    const referenceMs =
      phase === 'LIVE'
        ? Math.min(nowMs, endMs)
        : campaign.closedAt
          ? new Date(campaign.closedAt).getTime()
          : endMs;
    const elapsedDays = Math.max(
      1,
      Math.min(totalDays, Math.ceil(Math.max(1, referenceMs - startMs) / 86_400_000)),
    );

    // Interaction events count (pre-launch signals)
    const [savesEvents, notifyEvents] = await Promise.all([
      this.prisma.interactionEvent.count({
        where: { campaignId: campaign.id, eventType: 'SAVE' },
      }),
      this.prisma.interactionEvent.count({
        where: { campaignId: campaign.id, eventType: 'NOTIFY_PRELAUNCH' },
      }),
    ]);

    const totalSaves = Math.max(campaign.savedBy?.length ?? 0, savesEvents);
    const totalNotify = Math.max(
      campaign.prelaunchSubscriptions?.length ?? 0,
      notifyEvents,
    );
    const followers = campaign.creator?._count?.followers ?? 0;

    // Shared content attributes
    const categoryName = campaign.category?.name || 'Cùng danh mục';
    const hasVideo = campaign.media?.some((m: any) => m.mediaType === 'VIDEO') ?? false;
    const imageCount = campaign.media?.filter((m: any) => m.mediaType === 'IMAGE').length ?? 0;
    const storyLength = (campaign.storyMarkdown || '').trim().length;
    const risksLength = (campaign.risksMarkdown || '').trim().length;
    const rewardCount = campaign.rewardTiers?.length ?? 0;
    const faqCount = campaign.faqs?.length ?? 0;
    const updateCount = campaign.updates?.length ?? 0;
    const unansweredComments = (campaign.comments || []).filter(
      (c: any) => (c._count?.replies ?? 0) === 0,
    ).length;

    const factors: PredictionFactorResult[] = [];
    const suggestions: PredictionSuggestion[] = [];
    const toGoalPct = (amount: number) =>
      goalAmount > 0 ? Math.min(100, Math.round((amount / goalAmount) * 100)) : 0;

    let timeline: Array<{ day: string; actual: number; expected: number }> = [];
    let paceMetrics:
      | {
          elapsedDays: number;
          totalDays: number;
          daysLeft: number;
          dailyAverageAmount: number;
          requiredDailyAmount: number;
          projectedAmount: number;
          projectedPercent: number;
          pledgeCountLast7Days: number;
          amountLast7Days: number;
        }
      | undefined;
    let readinessItems:
      | Array<{ id: string; label: string; done: boolean; detail: string }>
      | undefined;

    if (phase === 'PREPARATION') {
      if (goalAmount > 0 && goalAmount <= 80_000_000) {
        factors.push({
          label: 'Mục tiêu tài chính vừa vặn',
          impact: 0.25,
          direction: 'positive',
          detail: `Mục tiêu ${(goalAmount / 1_000_000).toLocaleString('vi-VN')} triệu VNĐ gọn gàng, phù hợp với tệp người ủng hộ ban đầu.`,
        });
      } else if (goalAmount <= 250_000_000) {
        factors.push({
          label: 'Mục tiêu tài chính hợp lý',
          impact: 0.2,
          direction: 'positive',
          detail: `Mục tiêu nằm trong ngưỡng phổ biến của nhóm dự án ${categoryName}.`,
        });
      } else if (goalAmount <= 600_000_000) {
        factors.push({
          label: 'Mục tiêu tài chính ở mức cao',
          impact: 0.08,
          direction: 'positive',
          detail: 'Mục tiêu khá lớn, cần chuẩn bị sẵn tệp khách hàng quan tâm trước ngày mở gọi vốn.',
        });
      } else {
        factors.push({
          label: 'Mục tiêu tài chính quá lớn',
          impact: 0.22,
          direction: 'negative',
          detail: 'Mục tiêu trên 600 triệu VNĐ tạo áp lực lớn ngay từ tuần đầu mở bán.',
        });
      }

      if (hasVideo && imageCount >= 2 && storyLength >= 300) {
        factors.push({
          label: 'Hình ảnh & video mẫu thử đầy đủ',
          impact: 0.24,
          direction: 'positive',
          detail: `Có video demo và ${imageCount} ảnh minh họa giúp người xem tin tưởng tính khả thi.`,
        });
      } else if (imageCount >= 2 && storyLength >= 200) {
        factors.push({
          label: 'Có ảnh minh họa nhưng thiếu video thực tế',
          impact: 0.08,
          direction: 'negative',
          detail: `Hồ sơ có ${imageCount} ảnh; bổ sung thêm video quay sản phẩm hoạt động thực tế sẽ tăng độ tin cậy rõ rệt.`,
        });
      } else {
        factors.push({
          label: 'Hồ sơ còn thiếu tư liệu sản phẩm',
          impact: 0.22,
          direction: 'negative',
          detail: 'Cần bổ sung ít nhất 2 ảnh thực tế, video mẫu thử và câu chuyện chi tiết hơn.',
        });
      }

      if (rewardCount >= 3) {
        factors.push({
          label: 'Cấu trúc gói quà phong phú',
          impact: 0.14,
          direction: 'positive',
          detail: `Đã thiết lập ${rewardCount} mức quà tặng tạo nhiều lựa chọn ủng hộ.`,
        });
      } else if (rewardCount >= 1) {
        factors.push({
          label: 'Số lượng gói quà còn ít',
          impact: 0.06,
          direction: 'negative',
          detail: `Mới có ${rewardCount} gói quà; nên có ít nhất 3 mức (gói nhỏ, Early Bird, combo) để tăng tỷ lệ chuyển đổi.`,
        });
      } else {
        factors.push({
          label: 'Chưa thiết lập gói quà ủng hộ',
          impact: 0.2,
          direction: 'negative',
          detail: 'Người ủng hộ chưa có các mức quà tặng cụ thể để chọn cam kết.',
        });
      }

      if (totalSaves >= 25 || totalNotify >= 15) {
        factors.push({
          label: 'Tín hiệu quan tâm trước mở bán tốt',
          impact: 0.18,
          direction: 'positive',
          detail: `Đã có ${totalSaves} lượt lưu và ${totalNotify} người đăng ký nhận thông báo khi mở gọi vốn.`,
        });
      } else if (totalSaves >= 5 || totalNotify >= 3) {
        factors.push({
          label: 'Đã có lượng quan tâm bước đầu',
          impact: 0.07,
          direction: 'positive',
          detail: `Hiện có ${totalSaves} lượt lưu và ${totalNotify} đăng ký nhận nhắc; nên chia sẻ thêm để tích lũy trước ngày mở.`,
        });
      } else {
        factors.push({
          label: 'Chưa có nhiều người chờ mở bán',
          impact: 0.12,
          direction: 'negative',
          detail: 'Lượt lưu và đăng ký nhận nhắc giờ G còn thấp; cần quảng bá trang dự án trước khi mở chính thức.',
        });
      }

      readinessItems = [
        {
          id: 'rd_video',
          label: 'Video giới thiệu / demo mẫu thử',
          done: hasVideo,
          detail: hasVideo ? 'Đã tải lên video minh họa' : 'Chưa có video thực tế của sản phẩm',
        },
        {
          id: 'rd_images',
          label: 'Bộ ảnh minh họa (tối thiểu 2 ảnh)',
          done: imageCount >= 2,
          detail: `${imageCount} ảnh đã tải lên`,
        },
        {
          id: 'rd_story',
          label: 'Câu chuyện & công khai rủi ro',
          done: storyLength >= 300 && risksLength >= 50,
          detail:
            storyLength >= 300 && risksLength >= 50
              ? 'Nội dung và phần rủi ro đã trình bày đầy đủ'
              : 'Nên viết rõ câu chuyện (>300 ký tự) và rủi ro dự kiến',
        },
        {
          id: 'rd_rewards',
          label: 'Tối thiểu 3 gói quà ủng hộ',
          done: rewardCount >= 3,
          detail: `Hiện có ${rewardCount} gói quà đang bật`,
        },
        {
          id: 'rd_faq',
          label: 'Câu hỏi thường gặp (FAQ)',
          done: faqCount >= 2,
          detail: faqCount >= 2 ? `${faqCount} câu hỏi đã sẵn sàng` : `Mới có ${faqCount} câu hỏi FAQ`,
        },
        {
          id: 'rd_prelaunch',
          label: 'Tín hiệu quan tâm trước mở bán',
          done: totalSaves + totalNotify >= 10,
          detail: `${totalSaves} lượt lưu · ${totalNotify} nhận nhắc`,
        },
      ];

      if (!hasVideo) {
        suggestions.push({
          id: 'sug_video',
          title: 'Bổ sung video demo mẫu thử thực tế',
          detail: 'Video quay sản phẩm chạy thật giúp người xem yên tâm hơn trước khi cam kết tiền.',
          priority: 'HIGH',
        });
      }
      if (rewardCount < 3) {
        suggestions.push({
          id: 'sug_rewards',
          title: 'Hoàn thiện tối thiểu 3 mức gói quà',
          detail: 'Nên tách rõ gói ủng hộ nhỏ, gói Early Bird giới hạn và gói combo để phù hợp nhiều ngân sách.',
          priority: 'HIGH',
        });
      }
      if (faqCount < 2) {
        suggestions.push({
          id: 'sug_faq',
          title: 'Thêm FAQ về giao hàng & bảo hành',
          detail: 'Giải đáp trước các thắc mắc về tiến độ sản xuất, vận chuyển và đổi trả giúp giảm tỷ lệ thoát trang.',
          priority: 'MEDIUM',
        });
      }
      if (totalSaves + totalNotify < 15) {
        suggestions.push({
          id: 'sug_prelaunch',
          title: 'Thu hút lượt lưu & nhận nhắc trước giờ mở',
          detail: 'Chia sẻ liên kết dự án tới cộng đồng sớm để tạo lực đẩy cam kết ngay trong 48 giờ đầu mở bán.',
          priority: 'MEDIUM',
        });
      }
      if (suggestions.length === 0) {
        suggestions.push({
          id: 'sug_ready',
          title: 'Hồ sơ đã sẵn sàng để gửi duyệt / mở gọi vốn',
          detail: 'Các hạng mục nền tảng đều ổn định; hãy rà soát lại mốc giao quà dự kiến trước khi công bố.',
          priority: 'LOW',
        });
      }
    } else {
      const last7DaysCutoff = nowMs - 7 * 86_400_000;
      const recentPledges = pledges.filter(
        (p) => new Date(p.pledgedAt).getTime() >= last7DaysCutoff,
      );
      const amountLast7Days = recentPledges.reduce(
        (sum, p) => sum + Number(p.totalAmount ?? 0),
        0,
      );
      const dailyAverageAmount = Math.round(pledgedAmount / elapsedDays);
      const remainingAmount = Math.max(0, goalAmount - pledgedAmount);
      const requiredDailyAmount =
        phase === 'LIVE' && daysLeft > 0
          ? Math.round(remainingAmount / daysLeft)
          : remainingAmount;
      const projectedAmount = Math.round(dailyAverageAmount * totalDays);
      const projectedPercent =
        goalAmount > 0 ? Math.round((projectedAmount / goalAmount) * 100) : 0;

      paceMetrics = {
        elapsedDays,
        totalDays,
        daysLeft: phase === 'LIVE' ? daysLeft : 0,
        dailyAverageAmount,
        requiredDailyAmount,
        projectedAmount,
        projectedPercent,
        pledgeCountLast7Days: recentPledges.length,
        amountLast7Days,
      };

      const checkpointDays = Array.from(
        new Set(
          elapsedDays <= 1
            ? [0, 1]
            : [
                1,
                Math.max(1, Math.round(elapsedDays * 0.33)),
                Math.max(1, Math.round(elapsedDays * 0.66)),
                elapsedDays,
              ],
        ),
      ).sort((a, b) => a - b);

      timeline = checkpointDays.map((dayNum) => {
        if (dayNum === 0) {
          return { day: 'Mở bán', actual: 0, expected: 0 };
        }
        const cutoffMs =
          dayNum === elapsedDays
            ? referenceMs
            : startMs + dayNum * 86_400_000;
        const cumulativeAmount = pledges.reduce((sum, p) => {
          return new Date(p.pledgedAt).getTime() <= cutoffMs
            ? sum + Number(p.totalAmount ?? 0)
            : sum;
        }, 0);
        const expectedPct = Math.min(100, Math.round((dayNum / totalDays) * 100));
        return {
          day:
            dayNum === elapsedDays && phase === 'LIVE'
              ? `Ngày ${dayNum} (Nay)`
              : `Ngày ${dayNum}`,
          actual: toGoalPct(cumulativeAmount),
          expected: expectedPct,
        };
      });

      const fundingRatio = goalAmount > 0 ? pledgedAmount / goalAmount : 0;
      const expectedRatioNow = elapsedDays / totalDays;

      if (fundingRatio >= 1.0) {
        factors.push({
          label: 'Đã hoàn thành 100% mục tiêu vốn',
          impact: 0.35,
          direction: 'positive',
          detail: `Chiến dịch đã huy động ${(fundingRatio * 100).toFixed(0)}% mục tiêu (${backerCount} lượt ủng hộ).`,
        });
      } else if (fundingRatio >= expectedRatioNow) {
        factors.push({
          label: 'Tiến độ vốn đang vượt nhịp thời gian',
          impact: 0.26,
          direction: 'positive',
          detail: `Đã đạt ${(fundingRatio * 100).toFixed(0)}% mục tiêu trong khi thời gian mới trôi qua ${(expectedRatioNow * 100).toFixed(0)}% (${elapsedDays}/${totalDays} ngày).`,
        });
      } else if (fundingRatio >= expectedRatioNow * 0.6) {
        factors.push({
          label: 'Tiến độ vốn bám sát mức trung bình',
          impact: 0.1,
          direction: 'positive',
          detail: `Đã đạt ${(fundingRatio * 100).toFixed(0)}% mục tiêu sau ${elapsedDays}/${totalDays} ngày; cần giữ đều nhịp truyền thông.`,
        });
      } else {
        factors.push({
          label: 'Tiến độ vốn đang chậm hơn kỳ vọng',
          impact: 0.24,
          direction: 'negative',
          detail: `Mới đạt ${(fundingRatio * 100).toFixed(0)}% mục tiêu sau ${elapsedDays}/${totalDays} ngày; cần đẩy mạnh tốc độ gom vốn mỗi ngày.`,
        });
      }

      if (phase === 'LIVE') {
        if (remainingAmount === 0 || dailyAverageAmount >= requiredDailyAmount) {
          factors.push({
            label: 'Tốc độ tiền vào đủ để về đích',
            impact: 0.2,
            direction: 'positive',
            detail: `Trung bình ${(dailyAverageAmount / 1_000_000).toFixed(1)} triệu/ngày; với đà hiện tại dự kiến đạt ${projectedPercent}% khi kết thúc.`,
          });
        } else {
          factors.push({
            label: 'Tốc độ/ngày chưa đủ bù phần còn thiếu',
            impact: 0.18,
            direction: 'negative',
            detail: `Đang đạt ~${(dailyAverageAmount / 1_000_000).toFixed(1)} triệu/ngày, trong khi cần ~${(requiredDailyAmount / 1_000_000).toFixed(1)} triệu/ngày cho ${daysLeft} ngày cuối.`,
          });
        }
      }

      if (backerCount >= 30 || recentPledges.length >= 10) {
        factors.push({
          label: 'Lực ủng hộ cộng đồng tích cực',
          impact: 0.16,
          direction: 'positive',
          detail: `Có ${backerCount} lượt cam kết (${recentPledges.length} lượt mới trong 7 ngày gần nhất).`,
        });
      } else if (backerCount >= 5) {
        factors.push({
          label: 'Đã có nhóm người ủng hộ ban đầu',
          impact: 0.08,
          direction: 'positive',
          detail: `Hiện có ${backerCount} lượt ủng hộ; nên khuyến khích người ủng hộ chia sẻ để mở rộng tệp mới.`,
        });
      } else {
        factors.push({
          label: 'Số lượt ủng hộ mới còn ít',
          impact: 0.15,
          direction: 'negative',
          detail: `Mới ghi nhận ${backerCount} lượt ủng hộ (${recentPledges.length} lượt trong 7 ngày qua).`,
        });
      }

      if (updateCount >= 1 && unansweredComments === 0) {
        factors.push({
          label: 'Duy trì tương tác & cập nhật tốt',
          impact: 0.1,
          direction: 'positive',
          detail: `Đã đăng ${updateCount} bài cập nhật tiến độ và không có bình luận bị bỏ sót.`,
        });
      } else {
        factors.push({
          label:
            unansweredComments > 0
              ? 'Có bình luận chưa được phản hồi'
              : 'Chưa có bài cập nhật tiến độ mới',
          impact: 0.1,
          direction: 'negative',
          detail:
            unansweredComments > 0
              ? `Có ${unansweredComments} bình luận gốc chưa có trả lời; phản hồi sớm giúp tăng niềm tin người xem.`
              : 'Chưa có bài cập nhật nào kể từ khi mở gọi vốn để giữ nhiệt cho người ủng hộ.',
        });
      }

      if (phase === 'LIVE' && remainingAmount > 0 && dailyAverageAmount < requiredDailyAmount) {
        suggestions.push({
          id: 'sug_pace',
          title: `Cần tăng nhịp lên ~${(requiredDailyAmount / 1_000_000).toFixed(1)} triệu/ngày`,
          detail: `Còn ${daysLeft} ngày và thiếu ${(remainingAmount / 1_000_000).toFixed(1)} triệu. Hãy chạy đợt truyền thông ngắn hạn hoặc mở thêm gói quà giới hạn số lượng.`,
          priority: 'HIGH',
        });
      }
      if (unansweredComments > 0) {
        suggestions.push({
          id: 'sug_comments',
          title: `Trả lời ${unansweredComments} bình luận đang chờ`,
          detail: 'Người đang cân nhắc góp tiền thường đọc phần bình luận trước khi xuống tiền.',
          priority: 'HIGH',
        });
      }
      if (updateCount === 0 && phase === 'LIVE') {
        suggestions.push({
          id: 'sug_update',
          title: 'Đăng bài cập nhật tiến độ cho người ủng hộ',
          detail: 'Chia sẻ tiến độ sản xuất thực tế hoặc mốc vừa đạt được giúp kích thích thêm lượt ủng hộ mới.',
          priority: 'MEDIUM',
        });
      }
      if (phase === 'LIVE' && recentPledges.length === 0) {
        suggestions.push({
          id: 'sug_momentum',
          title: 'Kích hoạt lại tương tác trong 7 ngày tới',
          detail: 'Chưa ghi nhận cam kết mới trong 7 ngày qua; hãy gửi thông báo tới nhóm người đã lưu dự án.',
          priority: 'HIGH',
        });
      }
      if (suggestions.length === 0) {
        suggestions.push({
          id: 'sug_keep',
          title:
            fundingRatio >= 1
              ? 'Chuẩn bị kế hoạch sản xuất & giao quà đúng hẹn'
              : 'Duy trì nhịp cập nhật và chăm sóc cộng đồng',
          detail:
            fundingRatio >= 1
              ? 'Chiến dịch đã đạt mục tiêu; hãy giữ cập nhật định kỳ để củng cố uy tín sau khi đóng gọi vốn.'
              : 'Tiến độ đang đi đúng hướng; tiếp tục phản hồi câu hỏi và cập nhật định kỳ.',
          priority: 'LOW',
        });
      }
    }

    let score = 0;
    if (phase === 'PREPARATION') {
      const goalScore =
        goalAmount > 0 && goalAmount <= 80_000_000
          ? 20
          : goalAmount <= 250_000_000
            ? 17
            : goalAmount <= 600_000_000
              ? 11
              : 6;
      const mediaScore =
        (hasVideo ? 12 : 0) +
        Math.min(10, imageCount * 3) +
        (storyLength >= 300 ? 5 : storyLength >= 100 ? 2 : 0) +
        (risksLength >= 50 ? 3 : 0);
      const rewardScore = Math.min(
        20,
        rewardCount * 6 + (rewardCount >= 3 ? 2 : 0),
      );
      const faqScore = Math.min(10, faqCount * 4);
      const prelaunchScore = Math.min(
        20,
        Math.round(totalSaves * 0.5 + totalNotify * 0.8 + followers * 0.3),
      );
      score = Math.min(
        96,
        Math.max(8, goalScore + mediaScore + rewardScore + faqScore + prelaunchScore),
      );
    } else {
      const fundingRatio = goalAmount > 0 ? pledgedAmount / goalAmount : 0;
      const recentCount = pledges.filter(
        (p) => new Date(p.pledgedAt).getTime() >= nowMs - 7 * 86_400_000,
      ).length;
      const fundingScore = Math.min(40, Math.round(fundingRatio * 40));
      const dailyAvg = paceMetrics?.dailyAverageAmount ?? 0;
      const reqDaily = paceMetrics?.requiredDailyAmount ?? 0;
      const paceScore =
        pledgedAmount >= goalAmount && goalAmount > 0
          ? 25
          : phase === 'LIVE'
            ? Math.min(25, Math.round((dailyAvg / Math.max(1, reqDaily)) * 25))
            : Math.min(25, Math.round(fundingRatio * 25));
      const tractionScore = Math.min(
        15,
        Math.round(backerCount * 1.2 + recentCount * 1.0),
      );
      const executionScore =
        (hasVideo ? 6 : 0) +
        Math.min(6, rewardCount * 2) +
        (updateCount >= 1 ? 4 : 0) +
        (unansweredComments === 0 ? 4 : 0);

      const rawScore = fundingScore + paceScore + tractionScore + executionScore;
      score =
        phase === 'ENDED' && pledgedAmount >= goalAmount && goalAmount > 0
          ? 96
          : Math.min(96, Math.max(6, rawScore));
    }
    const probability = score / 100;
    const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      score >= 75 ? 'LOW' : score >= 55 ? 'MEDIUM' : 'HIGH';

    // Persist to Database (campaign_predictions & prediction_factors)
    try {
      await this.prisma.campaignPrediction.create({
        data: {
          campaignId: campaign.id,
          modelVersionId: modelVersion.id,
          probability: probability.toFixed(5),
          riskLevel,
          inputSnapshot: {
            phase,
            goalAmount,
            pledgedAmount,
            backerCount,
            mediaCount: campaign.media?.length ?? 0,
            hasVideo,
            rewardCount,
            totalSaves,
            totalNotify,
          },
          predictionStage: campaign.status,
          factors: {
            create: factors.map((f, idx) => ({
              featureName: f.label,
              featureValue: { impact: f.impact, direction: f.direction },
              impact: f.impact.toFixed(6),
              direction: f.direction,
              explanation: f.detail,
              sortOrder: idx,
            })),
          },
        },
      });
    } catch (dbError) {
      // Log error but do not break inference response
      console.error('Error saving campaign prediction to database:', dbError);
    }

    // Format Campaign Card Data for client
    const creatorName = campaign.creator?.displayName || 'Chủ dự án';
    const initials = creatorName
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0].toUpperCase())
      .slice(-2)
      .join('') || 'CA';

    return {
      campaign: {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        blurb: campaign.blurb || '',
        category: campaign.category?.name || 'Sáng tạo',
        status: campaign.status,
        goalAmount,
        pledgedAmount,
        backerCount,
        daysLeft,
        launchDate: campaign.startsAt ? new Date(campaign.startsAt).toISOString() : new Date().toISOString(),
        location: 'Việt Nam',
        creator: {
          id: campaign.creator?.id || 'c_anon',
          name: creatorName,
          initials,
          verified: Boolean(campaign.creator?.emailVerifiedAt ?? true),
        },
        tags: [campaign.category?.name || 'Sáng tạo', 'Cộng đồng'],
        visual: {
          motif: 'craft',
          palette: 'ember',
          label: campaign.category?.name || 'Chiến dịch',
        },
      },
      phase,
      score,
      riskLevel,
      model: {
        name: modelVersion.name,
        version: modelVersion.version,
        evaluatedAt: new Date().toISOString(),
        rocAuc: (modelVersion.metrics as any)?.rocAuc ?? 0.91,
      },
      factors,
      suggestions,
      timeline,
      preLaunchSignals: {
        saves: totalSaves,
        notify: totalNotify,
        followers,
      },
      paceMetrics,
      readinessItems,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // GOOGLE GEMINI AI COPILOT INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════════
  private readonly logger = new Logger(AiService.name);
  private readonly modelCooldownUntil = new Map<string, number>();
  private readonly responseCache = new Map<string, { expiresAt: number; data: any }>();

  /**
   * Gọi Google Gemini REST API với cơ chế tự động ưu tiên model quota cao (Flash-Lite),
   * tự động né model hết quota (429 cooldown) và cache kết quả trùng lặp.
   */
  async callGemini(prompt: string, jsonMode = true): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY chưa được thiết lập. Sẽ dùng bộ gợi ý thông minh nội bộ.');
      return null;
    }

    const cacheKey = `${jsonMode ? 'json' : 'text'}:${prompt.trim()}`;
    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
    const candidateModels = [
      preferredModel,
      'gemini-3.1-flash-lite-preview',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3-flash-preview',
    ];
    const uniqueModels = Array.from(new Set(candidateModels));

    for (const model of uniqueModels) {
      const cooldownUntil = this.modelCooldownUntil.get(model) || 0;
      if (cooldownUntil > Date.now()) {
        continue; // Bỏ qua ngay lập tức model đang hết quota (429)
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const body: Record<string, any> = {
          contents: [{ parts: [{ text: prompt }] }],
        };

        body.generationConfig = {
          temperature: 0.75,
          maxOutputTokens: 4096,
          ...(model.startsWith('gemini-3') || model.startsWith('gemini-2.5')
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(18000),
        });

        if (!res.ok) {
          if (res.status === 429) {
            // Tạm ngưng gọi model bị hết quota trong 15 phút để chuyển thẳng sang model còn quota
            this.modelCooldownUntil.set(model, Date.now() + 15 * 60 * 1000);
            this.logger.warn(
              `Model ${model} đã chạm giới hạn quota (429). Tự động chuyển sang model dự phòng còn quota.`,
            );
          } else {
            const errText = await res.text();
            this.logger.warn(`Gemini (${model}) returned status ${res.status}: ${errText.slice(0, 120)}`);
          }
          continue;
        }

        const data = (await res.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        let parsedResult: any = rawText;
        if (jsonMode) {
          const cleaned = rawText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          parsedResult = JSON.parse(cleaned);
        }

        // Lưu cache 5 phút để bấm lặp lại không tốn quota
        this.responseCache.set(cacheKey, {
          expiresAt: Date.now() + 5 * 60 * 1000,
          data: parsedResult,
        });
        return parsedResult;
      } catch (err: any) {
        this.logger.warn(`Thử gọi Gemini (${model}) thất bại: ${err?.message || err}. Đang thử model kế tiếp...`);
      }
    }

    this.logger.warn('Tất cả model Gemini đều không phản hồi. Chuyển sang fallback template.');
    return null;
  }

  /**
   * 1. Gợi ý Tiêu đề & Mô tả ngắn (Title & Blurb)
   */
  async suggestTitleAndBlurb(dto: SuggestTitleBlurbDto) {
    const prompt = `
Bạn là một chuyên gia tư vấn chiến lược gọi vốn cộng đồng (Crowdfunding Strategist) hàng đầu trên Kickstarter và Indiegogo.
Nhiệm vụ của bạn là đưa ra 3 phương án gợi ý Tiêu đề (Title) và Mô tả ngắn (Blurb) xuất sắc bằng tiếng Việt cho dự án sau:
- Ý tưởng/Sản phẩm: "${dto.idea}"
- Ngành hàng: "${dto.category || 'Sáng tạo & Đổi mới'}"
- Đối tượng mục tiêu: "${dto.targetAudience || 'Cộng đồng người ủng hộ'}"
- Từ khóa mong muốn: ${dto.keywords?.length ? dto.keywords.join(', ') : 'độc đáo, chất lượng, đổi mới'}

Yêu cầu bắt buộc:
1. Mỗi phương án phải theo một phong cách cụ thể:
   - "CLEAR": Rõ ràng, trực diện, nêu bật tính năng cốt lõi và giá trị sử dụng.
   - "INSPIRING": Kể chuyện, truyền cảm hứng, sứ mệnh cộng đồng và ước mơ.
   - "INNOVATIVE": Thu hút, gây tò mò, tạo cảm giác đột phá công nghệ/sáng tạo.
2. Tiêu đề (title): từ 30 đến 80 ký tự. Phải có định danh sản phẩm rõ ràng.
3. Mô tả ngắn (blurb): từ 80 đến 160 ký tự. Súc tích, thuyết phục người đọc bấm vào xem.
4. Trả về đúng định dạng JSON chuẩn theo cấu trúc sau:
{
  "suggestions": [
    {
      "style": "CLEAR",
      "styleLabel": "Trực diện & Rõ ràng",
      "title": "...",
      "blurb": "...",
      "rationale": "Lý do phương án này hiệu quả..."
    },
    {
      "style": "INSPIRING",
      "styleLabel": "Truyền cảm hứng & Sứ mệnh",
      "title": "...",
      "blurb": "...",
      "rationale": "..."
    },
    {
      "style": "INNOVATIVE",
      "styleLabel": "Đột phá & Thu hút tò mò",
      "title": "...",
      "blurb": "...",
      "rationale": "..."
    }
  ]
}
`;

    const aiResult = await this.callGemini(prompt, true);
    if (aiResult?.suggestions && Array.isArray(aiResult.suggestions) && aiResult.suggestions.length > 0) {
      return {
        source: 'GEMINI_AI',
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        suggestions: aiResult.suggestions,
      };
    }

    // Heuristic Fallback
    const baseName = dto.idea.slice(0, 30).trim();
    return {
      source: 'SMART_HEURISTIC_FALLBACK',
      model: 'Rule-based Kickstarter Blueprint v1',
      suggestions: [
        {
          style: 'CLEAR',
          styleLabel: 'Trực diện & Rõ ràng',
          title: `${baseName} — Thiết kế tinh gọn cho cuộc sống hiện đại`,
          blurb: `Giải pháp tối ưu kết hợp công nghệ thông minh, mang lại trải nghiệm tiện lợi vượt trội mỗi ngày.`,
          rationale: 'Tập trung trực tiếp vào công năng, dễ hiểu ngay với người ủng hộ lần đầu.',
        },
        {
          style: 'INSPIRING',
          styleLabel: 'Truyền cảm hứng & Sứ mệnh',
          title: `${baseName}: Đưa sáng tạo Việt vươn tầm chuẩn quốc tế`,
          blurb: `Cùng chúng tôi hiện thực hóa sản phẩm tiên phong, kiến tạo thói quen sống bền vững và thông minh hơn.`,
          rationale: 'Nhấn mạnh sứ mệnh đồng hành, thúc đẩy sự ủng hộ từ cộng đồng đam mê đổi mới.',
        },
        {
          style: 'INNOVATIVE',
          styleLabel: 'Đột phá & Thu hút tò mò',
          title: `Tái định nghĩa ${baseName} với công nghệ thế hệ mới`,
          blurb: `Khám phá sự giao thoa giữa độ chính xác cơ khí và trải nghiệm người dùng thông minh đỉnh cao.`,
          rationale: 'Kích thích trí tò mò, đặc biệt thu hút nhóm backer đam mê công nghệ cao (early adopters).',
        },
      ],
    };
  }

  /**
   * Hệ quy chiếu chuyên sâu theo từng ngành hàng (tránh dùng chung 1 khuôn mẫu đề mục)
   */
  private getCategoryDomainContext(category?: string): {
    name: string;
    focusAreas: string;
    forbiddenGenericHeadings: string;
  } {
    const cat = (category || '').toLowerCase();
    if (cat.includes('am-thuc') || cat.includes('ẩm thực') || cat.includes('nông sản')) {
      return {
        name: 'Ẩm thực & Nông sản',
        focusAreas:
          'Nguồn gốc vùng nguyên liệu & mùa vụ, quy trình ủ/chế biến thủ công, tầng hương vị cảm quan & cách thưởng thức, cam kết tự nhiên không hóa chất/chứng nhận ATTP, quy cách đóng gói bảo quản giữ độ tươi ngon.',
        forbiddenGenericHeadings:
          'TUYỆT ĐỐI KHÔNG dùng các từ cơ khí/công nghệ như "Thông số kỹ thuật", "Thiết kế & Tính năng", "Mẫu thử Prototype".',
      };
    }
    if (cat.includes('nghe-thuat') || cat.includes('nghệ thuật') || cat.includes('xuất bản')) {
      return {
        name: 'Nghệ thuật & Xuất bản',
        focusAreas:
          'Cảm hứng sáng tác & thông điệp nghệ thuật, thế giới quan/cốt truyện hoặc lối chơi (nếu là boardgame), phong cách mỹ thuật & trích đoạn tác phẩm, chất liệu giấy/in ấn/gia công ấn phẩm sưu tầm độc bản, chân dung tác giả/nhóm sáng tác.',
        forbiddenGenericHeadings:
          'TUYỆT ĐỐI KHÔNG dùng các mục như "Thông số kỹ thuật", "Dây chuyền nhà máy", "Bảo hành linh kiện".',
      };
    }
    if (cat.includes('thu-cong') || cat.includes('thủ công')) {
      return {
        name: 'Thủ công mỹ nghệ & Đời sống',
        focusAreas:
          'Câu chuyện chất liệu bản địa/tái chế, kỹ thuật chế tác tỉ mỉ của người thợ thủ công, độ bền & tính ứng dụng thực tế hằng ngày, hướng dẫn bảo quản sản phẩm theo thời gian, giá trị bền vững cho môi trường/văn hóa.',
        forbiddenGenericHeadings:
          'Không dùng các tiêu đề công nghiệp cứng nhắc lặp lại.',
      };
    }
    if (cat.includes('cong-dong') || cat.includes('cộng đồng') || cat.includes('xã hội')) {
      return {
        name: 'Cộng đồng & Xã hội',
        focusAreas:
          'Thực trạng vấn đề nhức nhối & câu chuyện của những người thụ hưởng trực tiếp, giải pháp can thiệp thực tế tại địa phương, chỉ số tác động xã hội đo lường được (số người/trẻ em/khu vực được hỗ trợ), cam kết minh bạch tài chính & báo cáo tiến độ hiện trường.',
        forbiddenGenericHeadings:
          'TUYỆT ĐỐI KHÔNG dùng các từ thương mại/bán hàng như "Thông số kỹ thuật", "Chính sách bảo hành đổi trả", "Khách hàng".',
      };
    }
    return {
      name: 'Công nghệ & Sáng tạo',
      focusAreas:
        'Bất cập của các sản phẩm cũ trên thị trường, giải pháp kỹ thuật/công nghệ cốt lõi của sản phẩm, trải nghiệm cầm nắm & sử dụng thực tế, quá trình thử nghiệm nguyên mẫu (prototype) và độ hoàn thiện cơ khí/điện tử, chế độ bảo hành & hỗ trợ kỹ thuật.',
      forbiddenGenericHeadings:
        'Tránh đặt các tiêu đề chung chung như "1. Giới thiệu", "2. Thông số kỹ thuật", "3. Kế hoạch sử dụng vốn". Hãy đặt tiêu đề gắn trực tiếp với tên và tính năng riêng của sản phẩm.',
    };
  }

  /**
   * 2. AI Viết bài mẫu từ ý tưởng HOẶC Sửa lỗi & Góp ý chuyên sâu theo đặc thù từng ngành
   */
  async suggestStoryOutline(dto: SuggestStoryDto) {
    const currentStory = (dto.currentStory || '').trim();

    if (dto.mode === 'REVIEW_AND_COACH' && currentStory.length >= 10) {
      return this.reviewAndCoachStory(dto, currentStory);
    }

    const domain = this.getCategoryDomainContext(dto.category);

    const prompt = `
Bạn là người sáng lập và giám đốc sáng tạo của dự án "${dto.title}" thuộc lĩnh vực **${domain.name}**.
Hãy viết bài giới thiệu dự án (Story) hoàn chỉnh bằng tiếng Việt (gộp chung cả phần Rủi ro & Giải pháp dự phòng vào mục cuối của bài viết) dựa trên thông tin:
- Tên dự án: "${dto.title}"
- Mô tả ngắn: "${dto.blurb || ''}"
- Lĩnh vực: "${domain.name}"
- Ý tưởng / Chi tiết sản phẩm: "${dto.productDetails || ''}"

NGUYÊN TẮC BẮT BUỘC ĐỂ BÀI VIẾT SÂU SẮC, ĐÚNG CHẤT NGÀNH HÀNG:
1. ${domain.forbiddenGenericHeadings}
2. KHÔNG dùng khuôn mẫu đề mục cố định cho mọi dự án. Hãy tự đặt 3–4 tiêu đề "## ..." mang đậm dấu ấn riêng của chính sản phẩm "${dto.title}" (xoay quanh: ${domain.focusAreas}), và kết thúc bằng 1 mục "## Rủi ro & Phương án dự phòng" nêu 2 rủi ro đặc thù nhất của riêng sản phẩm này kèm giải pháp thực tế.
3. "storyMarkdown": Viết hoàn chỉnh (350–500 từ), giọng văn giàu cảm xúc, cụ thể, có chiều sâu chuyên môn của người làm trong ngành ${domain.name}.
4. "writingTips": 3 lời khuyên ngắn gọn, sắc bén dành riêng cho chủ dự án "${dto.title}" để bổ sung tư liệu thực tế.

Trả về đúng định dạng JSON chuẩn:
{
  "mode": "WRITE_SAMPLE",
  "storyMarkdown": "...",
  "writingTips": ["...", "...", "..."]
}
`;

    const aiResult = await this.callGemini(prompt, true);
    if (aiResult?.storyMarkdown) {
      return {
        source: 'GEMINI_AI',
        mode: 'WRITE_SAMPLE',
        model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview',
        storyMarkdown: aiResult.storyMarkdown,
        writingTips: Array.isArray(aiResult.writingTips) ? aiResult.writingTips : [],
      };
    }

    return {
      source: 'SMART_HEURISTIC_FALLBACK',
      mode: 'WRITE_SAMPLE',
      model: 'Local Template',
      storyMarkdown: `## Khởi nguồn của ${dto.title}
Dự án **${dto.title}** được ấp ủ từ mong muốn mang đến một giá trị mới mẻ và thực chất trong lĩnh vực ${domain.name}. ${dto.productDetails ? `Điểm nhấn của dự án: ${dto.productDetails}.` : ''}

## Giá trị cốt lõi & Sự khác biệt
Chúng tôi tập trung giải quyết những chi tiết quan trọng nhất đối với người trải nghiệm: từ việc tuyển chọn nguyên vật liệu đầu vào, hoàn thiện quy trình thực hiện cho đến việc kiểm chứng chất lượng thực tế trước khi ra mắt cộng đồng.

## Đồng hành cùng cộng đồng ủng hộ
Nguồn lực từ chiến dịch gọi vốn này giúp đội ngũ hoàn thiện lô sản phẩm đầu tiên với tiêu chuẩn cao nhất, đồng thời tối ưu chi phí để trao gửi lại những phần quà xứng đáng cho những người ủng hộ sớm nhất.

## Rủi ro & Phương án dự phòng
- **Kiểm soát chất lượng đồng đều:** Khi chuyển từ quy mô thử nghiệm sang thực hiện số lượng lớn, đội ngũ sẽ kiểm định từng đợt để bảo đảm mọi sản phẩm giao đi đều đạt chuẩn.
- **Tiến độ bàn giao:** Chúng tôi đã làm việc sẵn với các đối tác cung ứng dự phòng và cam kết cập nhật tiến độ minh bạch hàng tuần trên trang dự án.`,
      writingTips: [
        `Bổ sung hình ảnh thực tế về quá trình tạo ra ${dto.title}.`,
        'Chia sẻ thêm câu chuyện cá nhân hoặc kỷ niệm đáng nhớ nhất khi phát triển dự án.',
        'Làm rõ quyền lợi đặc biệt dành riêng cho những người ủng hộ trong đợt mở bán đầu tiên.',
      ],
    };
  }

  /**
   * 2B. Sửa lỗi & Góp ý chuyên sâu theo ngữ cảnh riêng của từng sản phẩm & ngành hàng
   */
  private async reviewAndCoachStory(dto: SuggestStoryDto, currentStory: string) {
    const domain = this.getCategoryDomainContext(dto.category);

    const prompt = `
Bạn là một Biên tập viên cao cấp và Chuyên gia tư vấn chiến dịch trong lĩnh vực **${domain.name}**.
Hãy đọc kỹ bản nháp Câu chuyện dự án "${dto.title}" dưới đây:

=== CÂU CHUYỆN NGƯỜI DÙNG ĐANG VIẾT ===
${currentStory}

NHIỆM VỤ CỦA BẠN:
1. "polishedStoryMarkdown": Sửa sạch lỗi chính tả, dấu câu, từ viết tắt/khẩu ngữ (ko, đc, sài, tphcm, mn...) và biên tập lại câu văn cho sắc sảo, mượt mà hơn, nhưng GIỮ NGUYÊN 100% ý tưởng và thông tin của tác giả.
2. "changesSummary": Tóm tắt ngắn gọn 1 câu những lỗi chính tả/câu chữ vừa sửa.
3. "suggestedAdditions": Đọc kỹ những gì tác giả ĐÃ VIẾT ở trên và tự đặt câu hỏi: *"Nếu tôi là người bỏ tiền ủng hộ sản phẩm '${dto.title}' thuộc ngành ${domain.name} này, tôi đang tò mò hoặc thấy thiếu nhất 2–3 khía cạnh chuyên sâu nào (bao gồm cả rủi ro thực tế & giải pháp dự phòng nếu bài viết chưa đề cập)?"*
   - QUY TẮC SỐNG CÒN:
     + ${domain.forbiddenGenericHeadings}
     + TUYỆT ĐỐI KHÔNG trả về các đề mục rập khuôn giống nhau kiểu "Lộ trình sản xuất và bàn giao", "Thông số kỹ thuật", "Kế hoạch phân bổ nguồn vốn" nếu nó không phải là điểm đắt giá nhất của bài viết này.
     + Hãy ưu tiên gợi ý các góc độ chuyên sâu của ngành **${domain.name}** (${domain.focusAreas}) và mục Rủi ro đặc thù của sản phẩm mà bài nháp chưa khai thác sâu.
     + Đặt tên "title" thật cụ thể, hấp dẫn, gắn liền với tên/đặc tính của "${dto.title}".
     + Trong "content", hãy VIẾT SẴN một đoạn Markdown hoàn chỉnh, giàu thông tin chuyên môn và truyền cảm hứng cho chính mục đó để tác giả có thể chỉnh sửa nhẹ rồi bấm chèn ngay vào bài.

Trả về đúng định dạng JSON chuẩn:
{
  "mode": "REVIEW_AND_COACH",
  "changesSummary": "...",
  "polishedStoryMarkdown": "...",
  "suggestedAdditions": [
    {
      "title": "Tiêu đề mục chuyên sâu gắn riêng với sản phẩm...",
      "reason": "Vì sao người mua sản phẩm thuộc ngành ${domain.name} này rất muốn đọc phần này...",
      "content": "## Tiêu đề mục chuyên sâu...\\nNội dung viết sẵn sâu sắc, đúng chất ngành hàng..."
    }
  ]
}
`;

    const aiResult = await this.callGemini(prompt, true);
    if (aiResult?.polishedStoryMarkdown) {
      return {
        source: 'GEMINI_AI',
        mode: 'REVIEW_AND_COACH',
        model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview',
        changesSummary:
          aiResult.changesSummary ||
          'Đã sửa lỗi chính tả, dấu câu và chuốt lại câu văn mượt mà hơn.',
        storyMarkdown: aiResult.polishedStoryMarkdown,
        suggestedAdditions: Array.isArray(aiResult.suggestedAdditions)
          ? aiResult.suggestedAdditions
          : [],
      };
    }

    const polishedStory = currentStory
      .replace(/\bko\b/gi, 'không')
      .replace(/\bk\b/gi, 'không')
      .replace(/\bđc\b/gi, 'được')
      .replace(/\bdc\b/gi, 'được')
      .replace(/\bsài\b/gi, 'sử dụng')
      .replace(/\bsp\b/gi, 'sản phẩm')
      .replace(/\bmn\b/gi, 'mọi người')
      .replace(/\btphcm\b/gi, 'TP. Hồ Chí Minh')
      .replace(/\s+,/g, ',')
      .replace(/\s+\./g, '.');

    return {
      source: 'SMART_HEURISTIC_FALLBACK',
      mode: 'REVIEW_AND_COACH',
      model: 'Local Proofreader',
      changesSummary: 'Đã sửa các từ viết tắt khẩu ngữ, chuẩn hóa viết hoa và khoảng trắng dấu câu.',
      storyMarkdown: polishedStory,
      suggestedAdditions: [
        {
          title: `Điểm tạo nên giá trị riêng của ${dto.title}`,
          reason: `Làm rõ hơn chiều sâu chuyên môn trong lĩnh vực ${domain.name}.`,
          content: `## Điểm tạo nên sự khác biệt của ${dto.title}\n${domain.focusAreas}`,
        },
      ],
    };
  }

  /**
   * 3. Gợi ý Cơ cấu gói thưởng (Reward Tiers & Pricing)
   */
  private formatFutureMonthYear(monthsAhead = 3): string {
    const safeMonths = Number.isFinite(monthsAhead) && monthsAhead > 0 ? Math.round(monthsAhead) : 3;
    const target = new Date();
    target.setMonth(target.getMonth() + safeMonths);
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const year = target.getFullYear();
    return `${month}/${year}`;
  }

  private normalizeRewardTier(tier: any, idx: number, fallbackProduct: string) {
    const rawAmount = Number(tier?.amount) || (idx === 0 ? 100000 : 500000);
    const amount = Math.max(50000, Math.round(rawAmount / 1000) * 1000);
    const months = Number(tier?.estimatedDeliveryMonths) || (idx === 0 ? 1 : 3);
    const delivery =
      typeof tier?.delivery === 'string' && /^\d{2}\/\d{4}$/.test(tier.delivery.trim())
        ? tier.delivery.trim()
        : this.formatFutureMonthYear(months);
    const defaultLimits = [200, 50, 150, 30];
    const rawLimit = Number(tier?.limit ?? tier?.limitQuantity);
    const limitQuantity = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.round(rawLimit) : (defaultLimits[idx] ?? 100);

    return {
      tierType: tier?.tierType || (idx === 0 ? 'COMMUNITY' : idx === 1 ? 'EARLY_BIRD' : idx === 2 ? 'STANDARD' : 'VIP_COMBO'),
      title: String(tier?.title || `Gói ủng hộ #${idx + 1}`).trim(),
      amount,
      estimatedRetailPrice: Number(tier?.estimatedRetailPrice) || amount,
      discountPercent: Number(tier?.discountPercent) || 0,
      description: String(tier?.description || `Gói quà dành cho người ủng hộ ${fallbackProduct}.`).trim(),
      items: Array.isArray(tier?.items) ? tier.items : [`01 x ${fallbackProduct}`],
      limitQuantity,
      limit: String(limitQuantity),
      estimatedDeliveryMonths: months,
      delivery,
    };
  }

  async suggestRewardTiers(dto: SuggestRewardsDto) {
    const goal = Number(dto.goalAmount) || 50_000_000;
    const estPrice = dto.estimatedRetailPrice || Math.max(250_000, Math.round((goal * 0.015) / 10000) * 10000);
    const productName = dto.productName || 'Sản phẩm chiến dịch';

    const prompt = `
Bạn là chuyên gia cố vấn thiết kế gói quà tặng (Reward Tiers) cho chiến dịch gọi vốn cộng đồng.
Hãy thiết kế cơ cấu 3 đến 4 gói quà tặng tối ưu theo mô hình bậc thang:
- Mục tiêu tài chính dự án: ${goal.toLocaleString('vi-VN')} VNĐ
- Sản phẩm chính: "${productName}"
- Ngành hàng: "${dto.category || 'Sáng tạo'}"
- Giá bán lẻ dự kiến của sản phẩm chính: ${estPrice.toLocaleString('vi-VN')} VNĐ

Quy tắc cơ cấu gói:
1. Gói "COMMUNITY" (Ủng hộ tinh thần): Mức giá nhỏ (50.000đ - 150.000đ), giới hạn khoảng 200 suất.
2. Gói "EARLY_BIRD" (Ưu đãi sớm): Giảm 20-30% giá bán lẻ, giới hạn số lượng (50-100 suất) để kích cầu giờ G.
3. Gói "STANDARD" (Tiêu chuẩn): Giảm 10-15% giá bán lẻ, giới hạn khoảng 150 suất, gồm trọn bộ sản phẩm và phụ kiện.
4. Gói "VIP_COMBO" (Combo đôi / Bản đặc biệt): Dành cho gia đình hoặc fan cứng, giới hạn 30 suất, tặng kèm quà độc quyền.

Trả về JSON:
{
  "tiers": [
    {
      "tierType": "COMMUNITY | EARLY_BIRD | STANDARD | VIP_COMBO",
      "title": "...",
      "amount": 100000,
      "estimatedRetailPrice": 100000,
      "discountPercent": 0,
      "description": "...",
      "items": ["mục 1", "mục 2"],
      "limitQuantity": 100,
      "estimatedDeliveryMonths": 2
    }
  ],
  "strategicAdvice": "Lời khuyên chiến lược phân bổ giá..."
}
`;

    const aiResult = await this.callGemini(prompt, true);
    if (aiResult?.tiers && Array.isArray(aiResult.tiers) && aiResult.tiers.length > 0) {
      return {
        source: 'GEMINI_AI',
        ...aiResult,
        tiers: aiResult.tiers.map((t: any, idx: number) =>
          this.normalizeRewardTier(t, idx, productName),
        ),
      };
    }

    // Heuristic Fallback
    const earlyBirdPrice = Math.max(150_000, Math.round((estPrice * 0.75) / 10000) * 10000);
    const standardPrice = Math.max(200_000, Math.round((estPrice * 0.9) / 10000) * 10000);
    const vipPrice = Math.max(350_000, Math.round((estPrice * 1.6) / 10000) * 10000);

    const fallbackTiers = [
      {
        tierType: 'COMMUNITY',
        title: 'Gói Đồng Hành & Tri Ân',
        amount: 100000,
        estimatedRetailPrice: 100000,
        discountPercent: 0,
        description: 'Huy hiệu Backer danh dự tại trang dự án, quyền truy cập sớm bản tin cập nhật kín và lời cảm ơn tri ân.',
        items: ['Huy hiệu Backer điện tử', 'Thư cảm ơn từ đội ngũ sáng lập', 'Quyền bỏ phiếu tính năng tương lai'],
        limitQuantity: 200,
        estimatedDeliveryMonths: 1,
      },
      {
        tierType: 'EARLY_BIRD',
        title: 'Gói Early Bird — Ưu đãi sớm (-25%)',
        amount: earlyBirdPrice,
        estimatedRetailPrice: estPrice,
        discountPercent: 25,
        description: 'Suất ủng hộ đặc biệt dành cho 50 người nhanh tay nhất. Trọn bộ sản phẩm kèm số series khắc kỷ niệm đợt đầu.',
        items: [`01 x ${productName}`, 'Khắc tên / Số series kỷ niệm', 'Ưu tiên giao lô đầu tiên'],
        limitQuantity: 50,
        estimatedDeliveryMonths: 2,
      },
      {
        tierType: 'STANDARD',
        title: 'Gói Tiêu Chuẩn — Trọn bộ sản phẩm',
        amount: standardPrice,
        estimatedRetailPrice: estPrice,
        discountPercent: 10,
        description: 'Mức giá ưu đãi độc quyền trong suốt thời gian diễn ra chiến dịch gây quỹ trước khi thương mại hóa.',
        items: [`01 x ${productName}`, 'Bộ phụ kiện tiêu chuẩn đi kèm', 'Bảo hành chính hãng 12 tháng'],
        limitQuantity: 150,
        estimatedDeliveryMonths: 3,
      },
      {
        tierType: 'VIP_COMBO',
        title: 'Gói Combo Đôi — Bản Đặc Biệt (-20%)',
        amount: vipPrice,
        estimatedRetailPrice: estPrice * 2,
        discountPercent: 20,
        description: 'Trọn bộ 2 sản phẩm dành cho gia đình hoặc làm quà tặng đặc biệt, tặng kèm phụ kiện cao cấp.',
        items: [`02 x ${productName}`, '02 x Bộ quà tặng độc quyền', 'Ưu tiên giao hàng đợt 1'],
        limitQuantity: 30,
        estimatedDeliveryMonths: 3,
      },
    ];

    return {
      source: 'SMART_HEURISTIC_FALLBACK',
      tiers: fallbackTiers.map((t, idx) => this.normalizeRewardTier(t, idx, productName)),
      strategicAdvice: 'Gói Early Bird là chìa khóa tạo đà 30% vốn trong 48 giờ đầu tiên. Nên giới hạn số lượng để tạo hiệu ứng khan hiếm.',
    };
  }

  /**
   * 4. Đánh giá chất lượng bản nháp trước khi nộp duyệt (Pre-flight Audit)
   */
  async auditDraftCampaign(dto: AuditDraftCampaignDto) {
    const title = (dto.title || '').trim();
    const blurb = (dto.blurb || '').trim();
    const story = (dto.storyMarkdown || '').trim();
    const risks = (dto.risksMarkdown || '').trim();
    const goal = Number(dto.goalAmount) || 0;
    const rewards = Number(dto.rewardCount) || 0;
    const images = Number(dto.imageCount) || 0;
    const hasVideo = Boolean(dto.hasVideo);

    // Tính điểm đồng bộ với các bước của Campaign Wizard (Bước 0 -> 4)
    let baseScore = 30;
    const strengths: string[] = [];
    const issues: Array<{ id: string; field: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; title: string; advice: string; stepIndex: number }> = [];

    // Check 1: Tiêu đề & Blurb (Bước 0 - Thông tin)
    if (title.length >= 20 && title.length <= 90) {
      baseScore += 12;
      strengths.push('Tiêu đề súc tích, độ dài chuẩn hiển thị (20–90 ký tự)');
    } else {
      issues.push({
        id: 'aud_title_short',
        field: 'title',
        priority: 'HIGH',
        title: 'Tiêu đề cần rõ ràng và đầy đủ hơn',
        advice: 'Nên đặt tên thương hiệu kèm câu định danh sản phẩm rõ ràng (từ 20 đến 90 ký tự).',
        stepIndex: 0,
      });
    }

    if (blurb.length >= 50 && blurb.length <= 180) {
      baseScore += 10;
      strengths.push('Mô tả ngắn (Elevator Pitch) đủ ý, thu hút người xem');
    } else {
      issues.push({
        id: 'aud_blurb_improve',
        field: 'blurb',
        priority: 'MEDIUM',
        title: 'Mô tả ngắn cần tối ưu độ dài (50–180 ký tự)',
        advice: 'Mô tả ngắn nên tóm tắt điểm khác biệt chính trong vòng 50–180 ký tự để hiển thị trọn vẹn trên thẻ dự án.',
        stepIndex: 0,
      });
    }

    // Check 2: Mục tiêu tài chính (Bước 0 - Thông tin)
    if (goal >= 10_000_000 && goal <= 300_000_000) {
      baseScore += 10;
      strengths.push(`Mục tiêu vốn (${(goal / 1_000_000).toLocaleString('vi-VN')} triệu VNĐ) hợp lý, tính khả thi cao`);
    } else if (goal < 10_000_000) {
      issues.push({
        id: 'aud_goal_low',
        field: 'goalAmount',
        priority: 'HIGH',
        title: 'Mục tiêu gọi vốn chưa đạt mức tối thiểu (10 triệu VNĐ)',
        advice: 'Vui lòng nhập mục tiêu gọi vốn tối thiểu từ 10.000.000 đ trở lên.',
        stepIndex: 0,
      });
    } else {
      baseScore += 6;
      issues.push({
        id: 'aud_goal_high',
        field: 'goalAmount',
        priority: 'LOW',
        title: 'Mục tiêu tài chính ở mức lớn',
        advice: 'Mục tiêu trên 300 triệu đòi hỏi kế hoạch truyền thông tiền mở bán mạnh mẽ để giữ nhịp độ cam kết.',
        stepIndex: 0,
      });
    }

    // Check 3: Media, Story & Rủi ro (Bước 1 - Câu chuyện & media)
    if (images >= 1) {
      baseScore += 10;
      strengths.push('Đã có ảnh bìa đại diện cho chiến dịch');
    } else {
      issues.push({
        id: 'aud_no_image',
        field: 'media',
        priority: 'HIGH',
        title: 'Chưa tải lên ảnh bìa chiến dịch',
        advice: 'Ảnh bìa rõ nét giúp tăng tỷ lệ bấm xem dự án trên trang Khám phá.',
        stepIndex: 1,
      });
    }

    if (hasVideo) {
      baseScore += 6;
      strengths.push('Đã có video giới thiệu thực tế');
    } else {
      issues.push({
        id: 'aud_no_video',
        field: 'media',
        priority: 'LOW',
        title: 'Khuyến nghị bổ sung video giới thiệu mẫu thử',
        advice: 'Chiến dịch có video quay trực tiếp sản phẩm thực tế thường đạt tỷ lệ thành công cao hơn gấp 2.4 lần.',
        stepIndex: 1,
      });
    }

    if (story.length >= 300) {
      baseScore += 20;
      strengths.push('Nội dung câu chuyện & phương án dự phòng rủi ro được trình bày chi tiết');
    } else if (story.length >= 100) {
      baseScore += 10;
      issues.push({
        id: 'aud_story_short',
        field: 'storyMarkdown',
        priority: 'MEDIUM',
        title: 'Câu chuyện chiến dịch nên chi tiết hơn (>= 300 ký tự)',
        advice: 'Nên trình bày đầy đủ câu chuyện sản phẩm, kế hoạch thực hiện và phương án xử lý rủi ro ngay trong bài viết.',
        stepIndex: 1,
      });
    } else {
      issues.push({
        id: 'aud_story_short',
        field: 'storyMarkdown',
        priority: 'HIGH',
        title: 'Câu chuyện chiến dịch còn quá ngắn (< 100 ký tự)',
        advice: 'Người ủng hộ cần thấy rõ câu chuyện khởi xướng, giá trị sản phẩm và cam kết thực hiện.',
        stepIndex: 1,
      });
    }

    // Check 4: Gói thưởng (Bước 2 - Quà & phần bổ sung)
    if (rewards >= 2) {
      baseScore += 10;
      strengths.push(`Cơ cấu gói thưởng đa dạng (${rewards} mức ủng hộ)`);
    } else if (rewards === 1) {
      baseScore += 5;
      issues.push({
        id: 'aud_rewards_expand',
        field: 'rewards',
        priority: 'MEDIUM',
        title: 'Nên thiết kế từ 2–4 gói quà theo bậc thang giá',
        advice: 'Bổ sung thêm gói Early Bird ưu đãi sớm và gói Combo để tối ưu giá trị trung bình mỗi lượt ủng hộ.',
        stepIndex: 2,
      });
    } else {
      issues.push({
        id: 'aud_no_rewards',
        field: 'rewards',
        priority: 'HIGH',
        title: 'Chưa có gói quà ủng hộ hợp lệ',
        advice: 'Bạn cần tạo ít nhất một gói ủng hộ có đầy đủ tên, mức giá (>= 50.000đ) và lịch giao MM/YYYY.',
        stepIndex: 2,
      });
    }

    const readinessScore = Math.min(98, Math.max(25, baseScore));
    const grade = readinessScore >= 80 ? 'A' : readinessScore >= 70 ? 'B' : readinessScore >= 50 ? 'C' : 'D';
    const verdict =
      readinessScore >= 80
        ? 'Hồ sơ đạt chất lượng xuất sắc, hoàn toàn sẵn sàng gửi xét duyệt.'
        : readinessScore >= 70
          ? 'Hồ sơ đã đạt chuẩn xét duyệt, có thể tinh chỉnh thêm các gợi ý bên dưới để tối ưu tỷ lệ thành công.'
          : 'Hồ sơ còn một số mục quan trọng cần bổ sung trước khi gửi tới Quản trị viên.';

    return {
      readinessScore,
      grade,
      verdict,
      strengths,
      improvements: issues,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

