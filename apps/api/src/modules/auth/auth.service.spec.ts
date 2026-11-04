import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

describe('AuthService: vai trò cộng tác theo chiến dịch', () => {
  it('trả COLLABORATOR cho giao diện khi có thành viên, không lưu thành GlobalRole', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({
        id: 'gia-huy', email: 'giahuy@orbit.vn', displayName: 'Lê Gia Huy',
        status: 'ACTIVE', roles: [{ role: 'BACKER' }],
      }) },
      campaignMember: { findFirst: jest.fn().mockResolvedValue({ userId: 'gia-huy' }) },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma, {} as JwtService, {} as ConfigService, {} as MailService,
    );

    const profile = await service.getMe('gia-huy');
    expect(profile.roles).toEqual(['BACKER', 'COLLABORATOR']);
    expect(prisma.campaignMember.findFirst).toHaveBeenCalledWith({
      where: { userId: 'gia-huy', role: 'COLLABORATOR' },
      select: { userId: true },
    });
  });
});
