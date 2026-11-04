import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CreateInteractionEventDto } from './dto';

describe('AnalyticsController.recordEvent', () => {
  const jwt = new JwtService({ secret: 'test-only-analytics-secret' });
  const dto = { campaignId: 'campaign-1', eventType: 'VIEW' } as CreateInteractionEventDto;
  const recordEvent = jest.fn().mockResolvedValue({ id: 'event-1' });
  const controller = new AnalyticsController(
    { recordEvent } as unknown as AnalyticsService,
    jwt,
  );

  beforeEach(() => recordEvent.mockClear());

  it('gắn user ID khi chữ ký JWT hợp lệ', async () => {
    const token = jwt.sign({ sub: 'user-1' });
    await controller.recordEvent(
      { headers: { authorization: `Bearer ${token}` } } as Request,
      dto,
    );
    expect(recordEvent).toHaveBeenCalledWith('user-1', dto);
  });

  it('ghi ẩn danh nếu phần payload bị sửa mà chữ ký không còn đúng', async () => {
    const token = jwt.sign({ sub: 'user-1' });
    const [header, , signature] = token.split('.');
    const changed = Buffer.from(JSON.stringify({ sub: 'other-user' })).toString('base64url');
    await controller.recordEvent(
      { headers: { authorization: `Bearer ${header}.${changed}.${signature}` } } as Request,
      dto,
    );
    expect(recordEvent).toHaveBeenCalledWith(null, dto);
  });
});
