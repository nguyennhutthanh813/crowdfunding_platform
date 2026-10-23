import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      this.logger.warn('SMTP credentials not fully configured. Emails will only be logged to console.');
      return;
    }

    // Xóa khoảng trắng nếu có trong mật khẩu ứng dụng Gmail (16 ký tự)
    const cleanPass = pass.replace(/\s+/g, '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: cleanPass,
      },
    });

    this.logger.log(`SMTP Transporter initialized for ${user} via ${host}:${port}`);
  }

  async sendPasswordResetOtp(toEmail: string, displayName: string, otpCode: string): Promise<boolean> {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      `Nền tảng Góp <${this.configService.get<string>('SMTP_USER', 'no-reply@gop.vn')}>`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Khôi phục mật khẩu - Góp</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f2; margin: 0; padding: 24px; color: #1c1917; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .header { background: #102a22; padding: 32px 28px; text-align: center; }
        .logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; text-decoration: none; }
        .logo span { color: #84cc16; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 700; color: #102a22; margin-bottom: 12px; }
        .desc { font-size: 14px; line-height: 1.6; color: #57534e; margin-bottom: 24px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; text-align: center; padding: 20px 16px; margin: 24px 0; }
        .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #15803d; margin-bottom: 8px; }
        .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #14532d; }
        .warning { font-size: 13px; line-height: 1.5; color: #78716c; background: #fafaf9; border-left: 3px solid #84cc16; padding: 12px 14px; border-radius: 0 8px 8px 0; margin-top: 24px; }
        .footer { border-top: 1px solid #f5f5f4; padding: 20px 28px; text-align: center; font-size: 12px; color: #a8a29e; background: #fafaf9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">GÓP<span>.</span></div>
          <div style="font-size: 13px; color: #a3e635; margin-top: 6px; font-weight: 600; letter-spacing: 0.5px;">NỀN TẢNG GỌI VỐN CỘNG ĐỒNG</div>
        </div>
        <div class="content">
          <div class="greeting">Xin chào ${displayName || 'bạn'},</div>
          <div class="desc">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong>${toEmail}</strong> trên nền tảng Góp.
          </div>
          
          <div class="otp-box">
            <div class="otp-label">MÃ XÁC NHẬN OTP CỦA BẠN</div>
            <div class="otp-code">${otpCode}</div>
          </div>

          <div class="warning">
            ⏰ <strong>Mã này có hiệu lực trong vòng 15 phút.</strong><br>
            Tuyệt đối không cung cấp mã này cho bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
          </div>
        </div>
        <div class="footer">
          Email này được gửi tự động từ hệ thống Góp Ý — Nền tảng Crowdfunding Việt Nam.<br>
          © 2026 Góp Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;

    if (!this.transporter) {
      this.logger.warn(`[FALLBACK] SMTP chưa sẵn sàng, OTP gửi tới ${toEmail} là: ${otpCode}`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: `[Góp] Mã xác nhận đặt lại mật khẩu: ${otpCode}`,
        text: `Xin chào ${displayName},\n\nMã xác nhận đặt lại mật khẩu của bạn là: ${otpCode}\n\nMã có hiệu lực trong 15 phút. Tuyệt đối không chia sẻ mã này với ai.\n\nTrân trọng,\nĐội ngũ Góp.`,
        html: htmlContent,
      });

      this.logger.log(`Email đã được gửi thành công tới ${toEmail} (Message ID: ${info.messageId})`);
      return true;
    } catch (error) {
      this.logger.error(`Gửi email tới ${toEmail} thất bại:`, error);
      return false;
    }
  }
}
