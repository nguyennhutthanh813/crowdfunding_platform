import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentIntentDto, SimulateWebhookDto } from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initStripe();
  }

  private initStripe() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey && !secretKey.startsWith('sk_test_xxx')) {
      try {
        this.stripe = new Stripe(secretKey, {
          apiVersion: '2025-02-24.acacia' as any,
        });
        this.logger.log('Stripe SDK initialized with API key.');
      } catch (err) {
        this.logger.warn(`Failed to initialize Stripe SDK: ${err}`);
      }
    } else {
      this.logger.log('Stripe secret key not configured. Operating in Sandbox / Simulated Mode.');
    }
  }

  /**
   * Tạo Payment Intent (Ủy quyền thanh toán) cho khoản Pledge
   */
  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const pledge = await this.prisma.pledge.findUnique({
      where: { id: dto.pledgeId },
      include: {
        campaign: { select: { id: true, title: true, creatorId: true, status: true } },
        backer: { select: { id: true, email: true, displayName: true } },
      },
    });

    if (!pledge) {
      throw new NotFoundException('Không tìm thấy khoản cam kết (Pledge).');
    }

    if (pledge.backerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho khoản cam kết này.');
    }

    if (!['PENDING', 'AUTHORIZED'].includes(pledge.status)) {
      throw new BadRequestException(`Không thể thanh toán khoản cam kết đang ở trạng thái ${pledge.status}.`);
    }

    const totalAmountNum = Number(pledge.totalAmount || 0);
    if (totalAmountNum <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0.');
    }

    // Kiểm tra xem đã có PaymentAuthorization nào cho pledge này chưa
    const existingAuth = await this.prisma.paymentAuthorization.findFirst({
      where: {
        pledgeId: pledge.id,
        status: { in: ['REQUIRES_ACTION', 'AUTHORIZED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let providerPaymentId: string;
    let clientSecret: string | null = null;

    if (this.stripe) {
      try {
        // Tạo Stripe PaymentIntent với capture_method = 'manual' cho gọi vốn cộng đồng (chỉ giữ tiền, chưa trừ ngay)
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: totalAmountNum,
          currency: (pledge.currency || 'vnd').toLowerCase(),
          capture_method: 'manual',
          description: `Ủng hộ chiến dịch: ${pledge.campaign.title}`,
          metadata: {
            pledgeId: pledge.id,
            campaignId: pledge.campaignId,
            backerId: pledge.backerId,
            backerEmail: pledge.backer.email,
          },
        });

        providerPaymentId = paymentIntent.id;
        clientSecret = paymentIntent.client_secret;
      } catch (stripeError: any) {
        this.logger.error(`Stripe paymentIntent create failed: ${stripeError.message}`);
        throw new BadRequestException(`Lỗi cổng thanh toán Stripe: ${stripeError.message}`);
      }
    } else {
      // Chế độ Sandbox Simulation: Sinh mã Intent mô phỏng
      providerPaymentId = existingAuth?.providerPaymentId || `pi_sim_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      clientSecret = `${providerPaymentId}_secret_sim_${crypto.randomBytes(8).toString('hex')}`;
    }

    // Ghi nhận bản ghi PaymentAuthorization vào PostgreSQL
    const isSimulatedAuthorized = Boolean(dto.simulateSuccess);
    const authorization = await this.prisma.paymentAuthorization.upsert({
      where: { providerPaymentId },
      create: {
        pledgeId: pledge.id,
        provider: 'STRIPE',
        providerPaymentId,
        amount: pledge.totalAmount || BigInt(totalAmountNum),
        currency: pledge.currency || 'VND',
        status: isSimulatedAuthorized ? 'AUTHORIZED' : 'REQUIRES_ACTION',
        authorizedAt: isSimulatedAuthorized ? new Date() : null,
        authorizationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
      },
      update: {
        amount: pledge.totalAmount || BigInt(totalAmountNum),
        status: isSimulatedAuthorized ? 'AUTHORIZED' : 'REQUIRES_ACTION',
        authorizedAt: isSimulatedAuthorized ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    if (isSimulatedAuthorized) {
      await this.prisma.pledge.update({
        where: { id: pledge.id },
        data: { status: 'AUTHORIZED' },
      });

      // Tạo PaymentEvent tương ứng cho việc ủy quyền thành công
      const eventId = `evt_sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await this.prisma.paymentEvent.create({
        data: {
          paymentAuthorizationId: authorization.id,
          providerEventId: eventId,
          eventType: 'payment_intent.amount_capturable_updated',
          payload: {
            id: eventId,
            type: 'payment_intent.amount_capturable_updated',
            data: {
              object: {
                id: providerPaymentId,
                amount_capturable: totalAmountNum,
                currency: 'vnd',
                status: 'requires_capture',
              },
            },
          },
          processedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      provider: 'STRIPE',
      isLiveStripe: Boolean(this.stripe),
      paymentAuthorizationId: authorization.id,
      authorizationId: authorization.id,
      providerPaymentId: authorization.providerPaymentId,
      clientSecret,
      amount: totalAmountNum,
      currency: authorization.currency,
      status: isSimulatedAuthorized ? 'AUTHORIZED' : authorization.status,
      campaignTitle: pledge.campaign.title,
    };
  }

  /**
   * Tiếp nhận và xử lý Webhook từ Stripe hoặc hệ thống sự kiện thanh toán
   */
  async handleWebhook(rawBody: Buffer | string | any, signature?: string, directEvent?: any) {
    let event: any;
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (this.stripe && signature && webhookSecret && !webhookSecret.startsWith('whsec_xxx')) {
      try {
        const payloadBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
        event = this.stripe.webhooks.constructEvent(payloadBuffer, signature, webhookSecret);
      } catch (err: any) {
        this.logger.error(`Webhook signature verification failed: ${err.message}`);
        throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
      }
    } else if (directEvent) {
      event = directEvent;
    } else {
      try {
        event = typeof rawBody === 'string' ? JSON.parse(rawBody) : Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString('utf8')) : rawBody;
      } catch {
        throw new BadRequestException('Invalid JSON payload in webhook');
      }
    }

    if (!event || !event.id || !event.type) {
      throw new BadRequestException('Webhook payload missing event id or type');
    }

    // ─── Idempotency Check: Chống xử lý trùng lặp Webhook ───
    const existingEvent = await this.prisma.paymentEvent.findUnique({
      where: { providerEventId: event.id },
    });

    if (existingEvent && existingEvent.processedAt) {
      this.logger.log(`Duplicate webhook event ignored: ${event.id}`);
      return { received: true, duplicate: true, eventId: event.id };
    }

    // Ghi nhận bản ghi sự kiện vào payment_events
    const paymentEvent = existingEvent
      ? existingEvent
      : await this.prisma.paymentEvent.create({
          data: {
            providerEventId: event.id,
            eventType: event.type,
            payload: event,
          },
        });

    const paymentIntent = event.data?.object;
    const providerPaymentId = paymentIntent?.id;

    if (!providerPaymentId) {
      await this.prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          processedAt: new Date(),
          processingError: 'No payment_intent object in event payload',
        },
      });
      return { received: true, ignored: true };
    }

    // Tìm PaymentAuthorization tương ứng
    const authorization = await this.prisma.paymentAuthorization.findUnique({
      where: { providerPaymentId },
      include: {
        pledge: {
          include: {
            campaign: { select: { id: true, title: true, creatorId: true } },
            backer: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    if (!authorization) {
      this.logger.warn(`PaymentAuthorization not found for providerPaymentId: ${providerPaymentId}`);
      await this.prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          processedAt: new Date(),
          processingError: `Authorization not found for ${providerPaymentId}`,
        },
      });
      return { received: true, matched: false };
    }

    // Gắn ID authorization vào event
    await this.prisma.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: { paymentAuthorizationId: authorization.id },
    });

    // ─── Xử lý nghiệp vụ theo từng loại sự kiện ───
    try {
      switch (event.type) {
        // 1. Giữ tiền thành công (Ủy quyền sẵn sàng để capture)
        case 'payment_intent.amount_capturable_updated': {
          await this.prisma.$transaction([
            this.prisma.paymentAuthorization.update({
              where: { id: authorization.id },
              data: {
                status: 'AUTHORIZED',
                authorizedAt: new Date(),
              },
            }),
            this.prisma.pledge.update({
              where: { id: authorization.pledgeId },
              data: { status: 'AUTHORIZED' },
            }),
          ]);
          this.logger.log(`Pledge ${authorization.pledgeId} successfully AUTHORIZED.`);
          break;
        }

        // 2. Thu tiền thành công (Captured)
        case 'payment_intent.succeeded': {
          await this.prisma.$transaction([
            this.prisma.paymentAuthorization.update({
              where: { id: authorization.id },
              data: {
                status: 'CAPTURED',
                capturedAt: new Date(),
              },
            }),
            this.prisma.pledge.update({
              where: { id: authorization.pledgeId },
              data: { status: 'CAPTURED' },
            }),
            // Đảm bảo đơn fulfillment được khởi tạo
            this.prisma.fulfillment.upsert({
              where: { pledgeId: authorization.pledgeId },
              create: {
                pledgeId: authorization.pledgeId,
                status: 'PENDING',
              },
              update: {},
            }),
            // Ghi nhận sự kiện tương tác PLEDGE
            this.prisma.interactionEvent.create({
              data: {
                userId: authorization.pledge.backerId,
                campaignId: authorization.pledge.campaignId,
                eventType: 'PLEDGE',
                source: 'stripe_webhook',
              },
            }),
            // Gửi thông báo cho Creator
            this.prisma.notification.create({
              data: {
                userId: authorization.pledge.campaign.creatorId,
                type: 'PLEDGE_RECEIVED',
                title: 'Ủng hộ mới cho chiến dịch!',
                body: `${authorization.pledge.backer.displayName} vừa ủng hộ ${Number(authorization.amount).toLocaleString('vi-VN')} VND cho chiến dịch "${authorization.pledge.campaign.title}".`,
                actionUrl: `/creator/campaigns/${authorization.pledge.campaign.id}/manage`,
              },
            }),
            // Gửi thông báo cho Backer
            this.prisma.notification.create({
              data: {
                userId: authorization.pledge.backerId,
                type: 'PLEDGE_CONFIRMED',
                title: 'Xác nhận ủng hộ thành công!',
                body: `Bạn đã hoàn tất ủng hộ ${Number(authorization.amount).toLocaleString('vi-VN')} VND cho chiến dịch "${authorization.pledge.campaign.title}". Cảm ơn bạn!`,
                actionUrl: `/dashboard`,
              },
            }),
          ]);
          this.logger.log(`Pledge ${authorization.pledgeId} successfully CAPTURED.`);
          break;
        }

        // 3. Thanh toán thất bại
        case 'payment_intent.payment_failed': {
          const failureCode = paymentIntent.last_payment_error?.code || 'PAYMENT_FAILED';
          const failureMessage = paymentIntent.last_payment_error?.message || 'Giao dịch bị từ chối bởi ngân hàng phát hành.';

          await this.prisma.$transaction([
            this.prisma.paymentAuthorization.update({
              where: { id: authorization.id },
              data: {
                status: 'FAILED',
                failureCode,
                failureMessage,
              },
            }),
            this.prisma.pledge.update({
              where: { id: authorization.pledgeId },
              data: { status: 'FAILED' },
            }),
          ]);
          this.logger.warn(`Pledge ${authorization.pledgeId} payment FAILED: ${failureMessage}`);
          break;
        }

        // 4. Hủy thanh toán
        case 'payment_intent.canceled': {
          await this.prisma.$transaction([
            this.prisma.paymentAuthorization.update({
              where: { id: authorization.id },
              data: {
                status: 'CANCELED',
                canceledAt: new Date(),
              },
            }),
            this.prisma.pledge.update({
              where: { id: authorization.pledgeId },
              data: { status: 'CANCELED' },
            }),
          ]);
          this.logger.log(`Pledge ${authorization.pledgeId} payment CANCELED.`);
          break;
        }

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }

      // Đánh dấu sự kiện đã xử lý thành công
      await this.prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: { processedAt: new Date() },
      });

      return { received: true, success: true, eventType: event.type };
    } catch (err: any) {
      this.logger.error(`Error processing webhook event ${event.id}: ${err.message}`);
      await this.prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: { processingError: err.message },
      });
      throw err;
    }
  }

  /**
   * Mô phỏng Webhook cho môi trường Dev / Testing (khi không chạy Stripe CLI)
   */
  async simulateWebhook(dto: SimulateWebhookDto) {
    const syntheticEvent = {
      id: `evt_sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      type: dto.eventType,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: dto.providerPaymentId,
          object: 'payment_intent',
          amount: 100000,
          currency: 'vnd',
          status: dto.eventType === 'payment_intent.succeeded' ? 'succeeded' : 'requires_capture',
          last_payment_error:
            dto.eventType === 'payment_intent.payment_failed'
              ? { code: 'card_declined', message: 'Thẻ bị từ chối hoặc số dư không đủ.' }
              : null,
        },
      },
    };

    return this.handleWebhook(syntheticEvent, undefined, syntheticEvent);
  }

  /**
   * Cưỡng chế trừ tiền (Capture) khoản giữ tiền của Pledge (dành cho Admin hoặc Creator khi chiến dịch thành công)
   */
  async capturePayment(pledgeId: string, requesterUserId: string) {
    const authorization = await this.prisma.paymentAuthorization.findFirst({
      where: { pledgeId, status: { in: ['AUTHORIZED', 'REQUIRES_ACTION'] } },
      include: {
        pledge: {
          include: {
            campaign: { select: { id: true, creatorId: true, title: true } },
          },
        },
      },
    });

    if (!authorization) {
      throw new NotFoundException('Không tìm thấy ủy quyền thanh toán hợp lệ để trừ tiền.');
    }

    const isCreator = authorization.pledge.campaign.creatorId === requesterUserId;
    const isAdmin = await this.prisma.userRole.findFirst({
      where: { userId: requesterUserId, role: 'ADMIN' },
    });

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException('Chỉ chủ dự án hoặc Admin mới có quyền thực hiện trừ tiền cam kết.');
    }

    if (this.stripe && !authorization.providerPaymentId.startsWith('pi_sim_')) {
      try {
        await this.stripe.paymentIntents.capture(authorization.providerPaymentId);
      } catch (err: any) {
        throw new BadRequestException(`Stripe capture failed: ${err.message}`);
      }
    }

    // Cập nhật trạng thái thành CAPTURED
    await this.prisma.$transaction([
      this.prisma.paymentAuthorization.update({
        where: { id: authorization.id },
        data: { status: 'CAPTURED', capturedAt: new Date() },
      }),
      this.prisma.pledge.update({
        where: { id: pledgeId },
        data: { status: 'CAPTURED' },
      }),
      this.prisma.fulfillment.upsert({
        where: { pledgeId },
        create: { pledgeId, status: 'PENDING' },
        update: {},
      }),
    ]);

    return { success: true, message: 'Đã trừ tiền cam kết thành công.', pledgeId, status: 'CAPTURED' };
  }

  /**
   * Hủy ủy quyền thanh toán (Cancel / Release hold)
   */
  async cancelPayment(pledgeId: string, requesterUserId: string) {
    const authorization = await this.prisma.paymentAuthorization.findFirst({
      where: { pledgeId, status: { in: ['AUTHORIZED', 'REQUIRES_ACTION'] } },
      include: { pledge: true },
    });

    if (!authorization) {
      throw new NotFoundException('Không tìm thấy ủy quyền thanh toán để hủy.');
    }

    const isBacker = authorization.pledge.backerId === requesterUserId;
    const isAdmin = await this.prisma.userRole.findFirst({
      where: { userId: requesterUserId, role: 'ADMIN' },
    });

    if (!isBacker && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền hủy khoản thanh toán này.');
    }

    if (this.stripe && !authorization.providerPaymentId.startsWith('pi_sim_')) {
      try {
        await this.stripe.paymentIntents.cancel(authorization.providerPaymentId);
      } catch (err: any) {
        this.logger.warn(`Stripe cancel failed: ${err.message}`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.paymentAuthorization.update({
        where: { id: authorization.id },
        data: { status: 'CANCELED', canceledAt: new Date() },
      }),
      this.prisma.pledge.update({
        where: { id: pledgeId },
        data: { status: 'CANCELED' },
      }),
    ]);

    return { success: true, message: 'Đã hủy ủy quyền thanh toán.', pledgeId, status: 'CANCELED' };
  }

  /**
   * Lấy lịch sử và thông tin ủy quyền thanh toán của Pledge
   */
  async getAuthorization(pledgeId: string, userId: string) {
    const pledge = await this.prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: {
        campaign: { select: { id: true, creatorId: true } },
      },
    });

    if (!pledge) {
      throw new NotFoundException('Không tìm thấy khoản cam kết.');
    }

    const isBacker = pledge.backerId === userId;
    const isCreator = pledge.campaign.creatorId === userId;
    const isAdmin = await this.prisma.userRole.findFirst({
      where: { userId, role: 'ADMIN' },
    });

    if (!isBacker && !isCreator && !isAdmin) {
      throw new ForbiddenException('Không có quyền xem chi tiết thanh toán.');
    }

    return this.prisma.paymentAuthorization.findMany({
      where: { pledgeId },
      include: {
        events: {
          select: {
            id: true,
            eventType: true,
            receivedAt: true,
            processedAt: true,
            processingError: true,
          },
          orderBy: { receivedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
