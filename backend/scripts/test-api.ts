import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { generateTotpCode } from "../src/auth/totp.js";
import { verifySmtpConnection } from "../src/services/mailer.js";

async function main() {
  const tempDb = join(tmpdir(), `fundviet-test-${Date.now()}.sqlite`);
  process.env.FUNDVIET_DB_FILE = tempDb;
  process.env.FUNDVIET_AUTO_SCHEDULER = "0";
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 4000;
  const base = `http://127.0.0.1:${port}/api/v1`;

  const req = async <T = Record<string, unknown>>(
    path: string,
    opts: { method?: string; token?: string; body?: unknown } = {},
  ): Promise<{ status: number; data: T }> => {
    const headers: Record<string, string> = {};
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    const r = await fetch(`${base}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const data = (await r.json()) as T;
    return { status: r.status, data };
  };

  try {
    console.log(`▶ Đang kiểm thử Backend API tại ${base} ...`);

    // 1. Health check
    const health = await req<{ ok: boolean; users: number; projects: number; smtpConfigured: boolean }>("/health");
    assert.equal(health.status, 200);
    assert.equal(health.data.ok, true);
    assert.ok(health.data.users >= 4, "Phải có tối thiểu 4 tài khoản chính");
    assert.ok(health.data.projects >= 20, "Phải có dữ liệu dự án mẫu đầy đủ");
    console.log(`  ✓ /health OK (${health.data.users} users, ${health.data.projects} projects, SMTP=${health.data.smtpConfigured})`);

    // 2. Đăng nhập cả 4 tài khoản yêu cầu bắt buộc đầu tiên
    const primaryAccounts = [
      { label: "Admin", identifier: "phuocthinh2248@gmail.com", pass: "phuocthinh2248@Abc", checkRole: "ADMIN" },
      { label: "Chủ dự án", identifier: "nguyennhutthanh813@gmail.com", pass: "nguyennhutthanh813@Abc", checkRole: "MEMBER" },
      { label: "CTV", identifier: "ctv000001@gmail.com", pass: "ctv000001@Abc", checkRole: "MEMBER" },
      { label: "Người dùng", identifier: "user000001@gmail.com", pass: "user000001@Abc", checkRole: "MEMBER" },
    ] as const;

    const tokens: Record<string, string> = {};
    const refreshTokens: Record<string, string> = {};

    for (const acc of primaryAccounts) {
      const login = await req<{
        ok: boolean;
        requiresTwoFactor: boolean;
        accessToken: string;
        refreshToken: string;
        user: { email: string; systemRoles: string[] };
      }>("/auth/login", {
        method: "POST",
        body: { identifier: acc.identifier, password: acc.pass },
      });
      assert.equal(login.status, 200, `Đăng nhập ${acc.label} thất bại`);
      assert.equal(login.data.ok, true);
      assert.equal(login.data.requiresTwoFactor, false);
      assert.ok(login.data.user.systemRoles.includes(acc.checkRole));
      tokens[acc.label] = login.data.accessToken;
      refreshTokens[acc.label] = login.data.refreshToken;
      console.log(`  ✓ Đăng nhập ${acc.label} (${acc.identifier}) thành công`);
    }

    // 3. Kiểm thử Refresh Token JWT rotation
    const refreshed = await req<{ ok: boolean; accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken: refreshTokens["Người dùng"] },
    });
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.data.ok, true);
    tokens["Người dùng"] = refreshed.data.accessToken;
    console.log("  ✓ Xoay vòng JWT Refresh Token hoạt động chuẩn");

    // 4. Kiểm thử 2FA TOTP (Google Authenticator / 2fa.live) trọn vòng đời trên tài khoản Người dùng
    const setup2fa = await req<{ ok: boolean; secret: string; otpauthUrl: string; qrCodeDataUrl: string }>("/auth/2fa/setup", {
      method: "POST",
      token: tokens["Người dùng"],
    });
    assert.equal(setup2fa.status, 200);
    assert.ok(setup2fa.data.secret.length >= 16, "Secret Base32 phải hợp lệ cho 2fa.live");
    assert.ok(setup2fa.data.qrCodeDataUrl.startsWith("data:image/png;base64,"), "QR Code Data URL phải hợp lệ");

    const otpCode1 = generateTotpCode(setup2fa.data.secret);
    const enable2fa = await req<{ ok: boolean; backupCodes: string[] }>("/auth/2fa/enable", {
      method: "POST",
      token: tokens["Người dùng"],
      body: { code: otpCode1 },
    });
    assert.equal(enable2fa.status, 200);
    assert.equal(enable2fa.data.backupCodes.length, 8);

    // Đăng nhập khi đã bật 2FA -> phải yêu cầu bước 2 (challengeToken)
    const loginStep1 = await req<{ ok: boolean; requiresTwoFactor: boolean; challengeToken: string }>("/auth/login", {
      method: "POST",
      body: { identifier: "user000001@gmail.com", password: "user000001@Abc" },
    });
    assert.equal(loginStep1.status, 200);
    assert.equal(loginStep1.data.requiresTwoFactor, true);
    assert.ok(loginStep1.data.challengeToken);

    const otpCode2 = generateTotpCode(setup2fa.data.secret);
    const loginStep2 = await req<{ ok: boolean; accessToken: string }>("/auth/2fa/verify-login", {
      method: "POST",
      body: { challengeToken: loginStep1.data.challengeToken, code: otpCode2 },
    });
    assert.equal(loginStep2.status, 200);
    assert.ok(loginStep2.data.accessToken);
    tokens["Người dùng"] = loginStep2.data.accessToken;

    // Tắt lại 2FA để trả trạng thái sạch cho tài khoản mẫu
    const disable2fa = await req<{ ok: boolean }>("/auth/2fa/disable", {
      method: "POST",
      token: tokens["Người dùng"],
      body: { password: "user000001@Abc", code: generateTotpCode(setup2fa.data.secret) },
    });
    assert.equal(disable2fa.status, 200);
    console.log("  ✓ Luồng 2FA TOTP (Setup Secret Base32 / QR -> Enable -> Challenge Login -> Disable) hoạt động chuẩn");

    // 5. Kiểm thử Public / Explore / Chi tiết dự án / Studio / Admin / Me
    const home = await req<{ ok: boolean; trending: unknown[]; categories: unknown[] }>("/home");
    assert.equal(home.status, 200);
    assert.ok(home.data.trending.length > 0 && home.data.categories.length >= 8);

    const detail = await req<{ ok: boolean; project: { slug: string }; tiers: unknown[] }>("/projects/orbit-one", {
      token: tokens["Người dùng"],
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.data.project.slug, "orbit-one");
    assert.ok(detail.data.tiers.length >= 3);

    const meOverview = await req<{ ok: boolean; summary: { username: string } }>("/me/overview", {
      token: tokens["Người dùng"],
    });
    assert.equal(meOverview.status, 200);
    assert.equal(meOverview.data.summary.username, "user000001");

    const studioCreator = await req<{ ok: boolean; mine: unknown[] }>("/studio/projects", {
      token: tokens["Chủ dự án"],
    });
    assert.equal(studioCreator.status, 200);
    assert.ok(studioCreator.data.mine.length >= 2, "Chủ dự án phải có các dự án của mình");

    const studioCtv = await req<{ ok: boolean; collab: unknown[] }>("/studio/projects", {
      token: tokens["CTV"],
    });
    assert.equal(studioCtv.status, 200);
    assert.ok(studioCtv.data.collab.length >= 2, "CTV phải thấy các dự án cộng tác");

    const adminDash = await req<{ ok: boolean; data: { kpis: { users: number } } }>("/admin/dashboard", {
      token: tokens["Admin"],
    });
    assert.equal(adminDash.status, 200);
    assert.ok(adminDash.data.data.kpis.users >= 4);
    console.log("  ✓ Các phân hệ Public, Explore, Project Detail, Me, Studio (Creator & CTV), Admin hoạt động chuẩn");

    // 6. Kiểm tra kết nối SMTP thực tế
    const smtpCheck = await verifySmtpConnection();
    console.log(`  ✓ Kiểm tra kết nối Gmail SMTP: ${smtpCheck.ok ? "Sẵn sàng gửi OTP qua Email" : `Cảnh báo: ${smtpCheck.error}`}`);

    // 7. Thông báo bảo mật trong ứng dụng sau khi đăng nhập / bật tắt 2FA
    const notifs = await req<{ ok: boolean; notifications: { title: string }[] }>("/me/notifications?unread=0&limit=50", {
      token: tokens["Người dùng"],
    });
    assert.equal(notifs.status, 200);
    const titles = notifs.data.notifications.map((n) => n.title);
    assert.ok(titles.some((t) => t.includes("Đăng nhập mới")), "Phải có thông báo đăng nhập mới");
    assert.ok(titles.some((t) => t.includes("xác thực 2 lớp")), "Phải có thông báo bật/tắt 2FA");
    console.log("  ✓ Thông báo bảo mật (đăng nhập mới, bật/tắt 2FA) xuất hiện trong chuông thông báo");

    // 8. JSON hỏng phải trả lỗi 400 rõ ràng thay vì 500
    const bad = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{oops" });
    const badJson = (await bad.json()) as { code?: string };
    assert.equal(bad.status, 400);
    assert.equal(badJson.code, "INVALID_JSON");

    // 9. Chặn dò mật khẩu: vượt hạn mức đăng nhập phải nhận 429 kèm Retry-After
    let limited = 0;
    for (let i = 0; i < 12; i++) {
      const r = await req<{ code?: string }>("/auth/login", { method: "POST", body: { identifier: "user000001@gmail.com", password: "sai-mat-khau" } });
      if (r.status === 429) {
        limited++;
        assert.equal(r.data.code, "RATE_LIMITED");
      }
    }
    assert.ok(limited > 0, "Phải bị giới hạn sau nhiều lần đăng nhập sai");
    console.log(`  ✓ Chặn dò mật khẩu hoạt động (${limited} yêu cầu bị 429)`);

    console.log("✅ TẤT CẢ KIỂM THỬ BACKEND ĐỀU VƯỢT QUA!");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      rmSync(tempDb, { force: true });
      rmSync(`${tempDb}-wal`, { force: true });
      rmSync(`${tempDb}-shm`, { force: true });
    } catch {
      // Bỏ qua nếu Windows còn giữ handle file tạm
    }
  }
}

void main().catch((e) => {
  console.error("❌ Kiểm thử thất bại:", e);
  process.exit(1);
});
