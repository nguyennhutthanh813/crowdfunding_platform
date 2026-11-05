import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';

describe('AdminService - Collaborator & Campaign Management', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      campaign: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      campaignMember: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      moderationAction: {
        create: jest.fn(),
      },
      userRole: {
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('assignCollaborator', () => {
    it('should assign a user as collaborator to a specific campaign', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'usr-1', displayName: 'Thành' });
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'cmp-1',
        title: 'Chiến dịch A',
        slug: 'chien-dich-a',
        status: 'LIVE',
        creatorId: 'creator-other',
      });
      prisma.campaignMember.upsert.mockResolvedValue({
        campaignId: 'cmp-1',
        userId: 'usr-1',
        role: 'COLLABORATOR',
      });

      const result = await service.assignCollaborator('usr-1', 'cmp-1', 'admin-1', 'Hỗ trợ dự án');

      expect(prisma.campaignMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId_userId: { campaignId: 'cmp-1', userId: 'usr-1' } },
          create: expect.objectContaining({
            campaignId: 'cmp-1',
            userId: 'usr-1',
            role: 'COLLABORATOR',
          }),
        }),
      );
      expect(prisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ASSIGN_CAMPAIGN_COLLABORATOR',
            targetId: 'usr-1',
          }),
        }),
      );
      expect(result.role).toBe('COLLABORATOR');
    });

    it('should throw ConflictException if user is already the owner of the campaign', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'usr-1', displayName: 'Thành' });
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'cmp-1',
        title: 'Chiến dịch A',
        creatorId: 'usr-1',
      });

      await expect(
        service.assignCollaborator('usr-1', 'cmp-1', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if campaign does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'usr-1' });
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.assignCollaborator('usr-1', 'invalid-cmp', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCollaborator', () => {
    it('should remove a collaborator from a campaign', async () => {
      prisma.campaignMember.findUnique.mockResolvedValue({
        campaignId: 'cmp-1',
        userId: 'usr-1',
        role: 'COLLABORATOR',
        campaign: { title: 'Chiến dịch A' },
      });
      prisma.campaignMember.delete.mockResolvedValue({});

      const result = await service.removeCollaborator('usr-1', 'cmp-1', 'admin-1');

      expect(prisma.campaignMember.delete).toHaveBeenCalledWith({
        where: { campaignId_userId: { campaignId: 'cmp-1', userId: 'usr-1' } },
      });
      expect(prisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'REMOVE_CAMPAIGN_COLLABORATOR',
          }),
        }),
      );
      expect(result.message).toContain('Collaborator removed successfully');
    });

    it('should prevent removing the owner of the campaign', async () => {
      prisma.campaignMember.findUnique.mockResolvedValue({
        campaignId: 'cmp-1',
        userId: 'owner-1',
        role: 'OWNER',
        campaign: { title: 'Chiến dịch A' },
      });

      await expect(
        service.removeCollaborator('owner-1', 'cmp-1', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});

