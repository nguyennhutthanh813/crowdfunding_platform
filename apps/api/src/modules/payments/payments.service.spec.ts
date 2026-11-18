import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../database/prisma.service';

describe('PaymentsService - Payment Gateway & Webhook Integration', () => {
  let service: PaymentsService;
  let prisma: any;
  let configService: any;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockCreatorId = '22222222-2222-2222-2222-222222222222';
  const mockAdminId = '33333333-3333-3333-3333-333333333333';
  const mockPledgeId = '44444444-4444-4444-4444-444444444444';
  const mockCampaignId = '55555555-5555-5555-5555-555555555555';

  const mockPledge = {
    id: mockPledgeId,
    campaignId: mockCampaignId,
    backerId: mockUserId,
    totalAmount: BigInt(500000),
    currency: 'VND',
    status: 'PENDING',
    campaign: {
      id: mockCampaignId,
      title: 'Dự án Công nghệ Mới',
      creatorId: mockCreatorId,
      status: 'LIVE',
    },
    backer: {
      id: mockUserId,
      email: 'backer@example.com',
      displayName: 'Nguyen Van A',
    },
  };

  beforeEach(async () => {
    prisma = {
      pledge: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentAuthorization: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      paymentEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      fulfillment: {
        upsert: jest.fn(),
      },
      interactionEvent: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      userRole: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return null; // Sandbox mode
        if (key === 'STRIPE_WEBHOOK_SECRET') return null;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createPaymentIntent', () => {
    it('should throw NotFoundException if pledge does not exist', async () => {
      prisma.pledge.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent(mockUserId, { pledgeId: mockPledgeId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the backer', async () => {
      prisma.pledge.findUnique.mockResolvedValue({
        ...mockPledge,
        backerId: 'different-user-id',
      });

      await expect(
        service.createPaymentIntent(mockUserId, { pledgeId: mockPledgeId }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if pledge is in terminal status (e.g. CANCELED)', async () => {
      prisma.pledge.findUnique.mockResolvedValue({
        ...mockPledge,
        status: 'CANCELED',
      });

      await expect(
        service.createPaymentIntent(mockUserId, { pledgeId: mockPledgeId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create payment intent in sandbox mode and return authorization info', async () => {
      prisma.pledge.findUnique.mockResolvedValue(mockPledge);
      prisma.paymentAuthorization.findFirst.mockResolvedValue(null);
      prisma.paymentAuthorization.upsert.mockResolvedValue({
        id: 'auth-uuid-123',
        pledgeId: mockPledgeId,
        provider: 'STRIPE',
        providerPaymentId: 'pi_sim_123',
        amount: BigInt(500000),
        currency: 'VND',
        status: 'REQUIRES_ACTION',
      });

      const res = await service.createPaymentIntent(mockUserId, {
        pledgeId: mockPledgeId,
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('STRIPE');
      expect(res.isLiveStripe).toBe(false);
      expect(res.status).toBe('REQUIRES_ACTION');
      expect(res.amount).toBe(500000);
      expect(prisma.paymentAuthorization.upsert).toHaveBeenCalled();
    });

    it('should instantly authorize pledge when simulateSuccess is true', async () => {
      prisma.pledge.findUnique.mockResolvedValue(mockPledge);
      prisma.paymentAuthorization.findFirst.mockResolvedValue(null);
      prisma.paymentAuthorization.upsert.mockResolvedValue({
        id: 'auth-uuid-456',
        pledgeId: mockPledgeId,
        provider: 'STRIPE',
        providerPaymentId: 'pi_sim_456',
        amount: BigInt(500000),
        currency: 'VND',
        status: 'AUTHORIZED',
      });
      prisma.pledge.update.mockResolvedValue({ ...mockPledge, status: 'AUTHORIZED' });
      prisma.paymentEvent.create.mockResolvedValue({ id: 'evt-123' });

      const res = await service.createPaymentIntent(mockUserId, {
        pledgeId: mockPledgeId,
        simulateSuccess: true,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('AUTHORIZED');
      expect(prisma.pledge.update).toHaveBeenCalledWith({
        where: { id: mockPledgeId },
        data: { status: 'AUTHORIZED' },
      });
      expect(prisma.paymentEvent.create).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('should ignore duplicate webhook if already processed (Idempotency)', async () => {
      prisma.paymentEvent.findUnique.mockResolvedValue({
        id: 'evt-db-123',
        providerEventId: 'evt_stripe_123',
        processedAt: new Date(),
      });

      const payload = {
        id: 'evt_stripe_123',
        type: 'payment_intent.succeeded',
      };

      const result = await service.handleWebhook(payload, undefined, payload);
      expect(result.duplicate).toBe(true);
      expect(prisma.paymentAuthorization.update).not.toHaveBeenCalled();
    });

    it('should process payment_intent.amount_capturable_updated successfully', async () => {
      prisma.paymentEvent.findUnique.mockResolvedValue(null);
      prisma.paymentEvent.create.mockResolvedValue({ id: 'evt-record-1' });
      prisma.paymentAuthorization.findUnique.mockResolvedValue({
        id: 'auth-id-1',
        pledgeId: mockPledgeId,
        providerPaymentId: 'pi_stripe_1',
        pledge: mockPledge,
      });
      prisma.paymentEvent.update.mockResolvedValue({});

      const payload = {
        id: 'evt_amount_capturable_1',
        type: 'payment_intent.amount_capturable_updated',
        data: {
          object: {
            id: 'pi_stripe_1',
            status: 'requires_capture',
          },
        },
      };

      const result = await service.handleWebhook(payload, undefined, payload);
      expect(result.success).toBe(true);
      expect(result.eventType).toBe('payment_intent.amount_capturable_updated');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should process payment_intent.succeeded (Capture, Fulfillment, Notifications)', async () => {
      prisma.paymentEvent.findUnique.mockResolvedValue(null);
      prisma.paymentEvent.create.mockResolvedValue({ id: 'evt-record-2' });
      prisma.paymentAuthorization.findUnique.mockResolvedValue({
        id: 'auth-id-2',
        pledgeId: mockPledgeId,
        amount: BigInt(500000),
        providerPaymentId: 'pi_stripe_2',
        pledge: mockPledge,
      });
      prisma.paymentEvent.update.mockResolvedValue({});

      const payload = {
        id: 'evt_succeeded_2',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_stripe_2',
            status: 'succeeded',
          },
        },
      };

      const result = await service.handleWebhook(payload, undefined, payload);
      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should process payment_intent.payment_failed', async () => {
      prisma.paymentEvent.findUnique.mockResolvedValue(null);
      prisma.paymentEvent.create.mockResolvedValue({ id: 'evt-record-3' });
      prisma.paymentAuthorization.findUnique.mockResolvedValue({
        id: 'auth-id-3',
        pledgeId: mockPledgeId,
        providerPaymentId: 'pi_stripe_3',
        pledge: mockPledge,
      });
      prisma.paymentEvent.update.mockResolvedValue({});

      const payload = {
        id: 'evt_failed_3',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_stripe_3',
            last_payment_error: {
              code: 'insufficient_funds',
              message: 'Số dư không đủ.',
            },
          },
        },
      };

      const result = await service.handleWebhook(payload, undefined, payload);
      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('simulateWebhook', () => {
    it('should construct synthetic event and execute webhook handler', async () => {
      prisma.paymentEvent.findUnique.mockResolvedValue(null);
      prisma.paymentEvent.create.mockResolvedValue({ id: 'evt-sim-rec' });
      prisma.paymentAuthorization.findUnique.mockResolvedValue({
        id: 'auth-sim-1',
        pledgeId: mockPledgeId,
        amount: BigInt(500000),
        providerPaymentId: 'pi_sim_test',
        pledge: mockPledge,
      });
      prisma.paymentEvent.update.mockResolvedValue({});

      const result = await service.simulateWebhook({
        providerPaymentId: 'pi_sim_test',
        eventType: 'payment_intent.succeeded',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('capturePayment', () => {
    it('should throw NotFoundException if authorization not found', async () => {
      prisma.paymentAuthorization.findFirst.mockResolvedValue(null);

      await expect(
        service.capturePayment(mockPledgeId, mockCreatorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester is neither creator nor admin', async () => {
      prisma.paymentAuthorization.findFirst.mockResolvedValue({
        id: 'auth-cap-1',
        pledgeId: mockPledgeId,
        providerPaymentId: 'pi_sim_cap',
        pledge: mockPledge,
      });
      prisma.userRole.findFirst.mockResolvedValue(null);

      await expect(
        service.capturePayment(mockPledgeId, 'random-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should capture successfully when called by Creator', async () => {
      prisma.paymentAuthorization.findFirst.mockResolvedValue({
        id: 'auth-cap-2',
        pledgeId: mockPledgeId,
        providerPaymentId: 'pi_sim_cap',
        pledge: mockPledge,
      });

      const result = await service.capturePayment(mockPledgeId, mockCreatorId);
      expect(result.success).toBe(true);
      expect(result.status).toBe('CAPTURED');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should capture successfully when called by Admin', async () => {
      prisma.paymentAuthorization.findFirst.mockResolvedValue({
        id: 'auth-cap-3',
        pledgeId: mockPledgeId,
        providerPaymentId: 'pi_sim_cap',
        pledge: mockPledge,
      });
      prisma.userRole.findFirst.mockResolvedValue({ userId: mockAdminId, role: 'ADMIN' });

      const result = await service.capturePayment(mockPledgeId, mockAdminId);
      expect(result.success).toBe(true);
      expect(result.status).toBe('CAPTURED');
    });
  });

  describe('cancelPayment', () => {
    it('should throw ForbiddenException if requester is not backer or admin', async () => {
      prisma.paymentAuthorization.findFirst.mockResolvedValue({
        id: 'auth-cancel-1',
        pledgeId: mockPledgeId,
        providerPaymentId: 'pi_sim_cancel',
        pledge: mockPledge,
      });
      prisma.userRole.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelPayment(mockPledgeId, 'random-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should cancel successfully when called by Backer', async () => {
      prisma.paymentAuthorization.findFirst.mockResolvedValue({
        id: 'auth-cancel-2',
        pledgeId: mockPledgeId,
        providerPaymentId: 'pi_sim_cancel',
        pledge: mockPledge,
      });

      const result = await service.cancelPayment(mockPledgeId, mockUserId);
      expect(result.success).toBe(true);
      expect(result.status).toBe('CANCELED');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getAuthorization', () => {
    it('should return authorization and events list for authorized user', async () => {
      prisma.pledge.findUnique.mockResolvedValue(mockPledge);
      prisma.paymentAuthorization.findMany.mockResolvedValue([
        {
          id: 'auth-list-1',
          pledgeId: mockPledgeId,
          status: 'AUTHORIZED',
          events: [{ id: 'evt-1', eventType: 'payment_intent.amount_capturable_updated' }],
        },
      ]);

      const list = await service.getAuthorization(mockPledgeId, mockUserId);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('auth-list-1');
    });
  });
});

