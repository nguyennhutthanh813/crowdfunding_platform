import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(email: string, password: string, displayName: string) {
    const normalizedEmail = email.trim().toLowerCase();
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName.trim(),
        roles: {
          create: { role: 'BACKER' },
        },
      },
      include: { roles: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.roles.map((r) => r.role));

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        roles: user.roles.map((r) => r.role),
      },
      tokens,
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.roles.map((r) => r.role));

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        roles: user.roles.map((r) => r.role),
      },
      tokens,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      bio: user.bio,
      location: user.location,
      status: user.status,
      roles: user.roles.map((r) => r.role),
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user.id, user.email, user.roles.map((r) => r.role));
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'jwt-refresh-secret-key',
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') || '7d') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, displayName: true, status: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Tài khoản đã bị tạm khóa hoặc vô hiệu hóa. Không thể đặt lại mật khẩu.',
      );
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 8);

    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        codeHash,
        type: 'RESET_PASSWORD',
      },
      {
        expiresIn: '15m',
      },
    );

    console.log(`\n======================================================`);
    console.log(`🔑 [AUTH RECOVERY] Mã xác nhận đặt lại mật khẩu:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Họ tên: ${user.displayName}`);
    console.log(`   Mã OTP: ${code}`);
    console.log(`   Hết hạn: 15 phút`);
    console.log(`======================================================\n`);

    // Gửi email thật qua SMTP Gmail bất đồng bộ (không chặn HTTP response)
    this.mailService
      .sendPasswordResetOtp(user.email, user.displayName, code)
      .catch((err) => console.error('Lỗi gửi email:', err));

    return {
      success: true,
      message: `Mã xác nhận 6 chữ số đã được gửi tới ${user.email}. Mã có hiệu lực trong 15 phút.`,
      resetToken,
    };
  }

  async resetPassword(dto: {
    email: string;
    code: string;
    resetToken: string;
    newPassword: string;
  }) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    let payload: { sub: string; email: string; codeHash: string; type: string };

    try {
      payload = this.jwtService.verify(dto.resetToken);
    } catch {
      throw new BadRequestException(
        'Mã xác nhận hoặc phiên khôi phục đã hết hạn. Vui lòng gửi lại yêu cầu mới.',
      );
    }

    if (
      payload.type !== 'RESET_PASSWORD' ||
      payload.email.toLowerCase() !== normalizedEmail
    ) {
      throw new BadRequestException('Thông tin phiên khôi phục mật khẩu không khớp.');
    }

    const isCodeValid = await bcrypt.compare(dto.code.trim(), payload.codeHash);
    if (!isCodeValid) {
      throw new BadRequestException('Mã xác nhận OTP không chính xác.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc vô hiệu hóa.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log(`✅ [AUTH RECOVERY] Đã đặt lại mật khẩu thành công cho ${user.email}`);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
    };
  }
}
