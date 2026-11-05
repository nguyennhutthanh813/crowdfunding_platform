import { ConfigService } from '@nestjs/config';

export function jwtSecret(config: ConfigService, name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') {
  const value = config.get<string>(name)?.trim();
  if (!value) throw new Error(`Thiếu ${name}. Hãy đặt khóa riêng trong .env trước khi chạy API.`);
  if (config.get<string>('NODE_ENV') === 'production' && value.length < 32) {
    throw new Error(`${name} cần ít nhất 32 ký tự khi chạy production.`);
  }
  return value;
}
