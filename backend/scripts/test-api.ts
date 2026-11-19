import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { generateTotpCode } from "../src/auth/totp.js";
import { getDb } from "../src/db/index.js";
import { notify, one } from "../src/db/helpers.js";
import { verifySmtpConnection } from "../src/services/mailer.js";

async function main() {
  const tempDb = join(tmpdir(), `fundviet-test-${Date.now()}.sqlite`);
  process.env.FUNDVIET_TEST_SQLITE = "1";
  process.env.FUNDVIET_DB_FILE = tempDb;
  process.env.FUNDVIET_AUTO_SCHEDULER = "0";
  // Không gửi email thật trong lúc chạy test
  process.env.EMAIL_NOTIFICATIONS = "off";
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

    // 3. Kiểm thử Refresh Token JWT rotation + Grace Window 60s
    const oldRefresh = refreshTokens["Người dùng"];
    const refreshed = await req<{ ok: boolean; accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken: oldRefresh },
    });
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.data.ok, true);
    const graceCheck = await req<{ ok: boolean; accessToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken: oldRefresh },
    });
    assert.equal(graceCheck.status, 200, "Refresh song song trong 60s không được làm văng phiên");
    tokens["Người dùng"] = refreshed.data.accessToken;
    refreshTokens["Người dùng"] = refreshed.data.refreshToken;
    console.log("  ✓ Xoay vòng JWT Refresh Token + cửa sổ ân hạn 60s hoạt động chuẩn");

    // 4. Kiểm thử 2FA TOTP (Google Authenticator / 2fa.live) + lưu trữ CSDL users.two_factor_enabled
    const setup2fa = await req<{ ok: boolean; secret: string; setupToken: string; otpauthUrl: string; qrCodeDataUrl: string }>(
      "/auth/2fa/setup",
      {
        method: "POST",
        token: tokens["Người dùng"],
      },
    );
    assert.equal(setup2fa.status, 200);
    assert.ok(setup2fa.data.secret.length >= 16, "Secret Base32 phải hợp lệ cho 2fa.live");
    assert.ok(setup2fa.data.qrCodeDataUrl.startsWith("data:image/png;base64,"), "QR Code Data URL phải hợp lệ");

    // Dán mã có khoảng trắng kiểu "123 456" từ 2fa.live
    const otpCode1 = generateTotpCode(setup2fa.data.secret);
    const spacedOtp = `${otpCode1.slice(0, 3)} ${otpCode1.slice(3)}`;
    const enable2fa = await req<{ ok: boolean; backupCodes: string[]; twoFactorVault?: string }>("/auth/2fa/enable", {
      method: "POST",
      token: tokens["Người dùng"],
      body: { code: spacedOtp, setupToken: setup2fa.data.setupToken },
    });
    assert.equal(enable2fa.status, 200);
    assert.equal(enable2fa.data.backupCodes.length, 8);
    assert.ok(enable2fa.data.twoFactorVault?.startsWith("v1."), "Phải sinh khoá mã hoá AES-256-GCM twoFactorVault");

    const dbUserAfterEnable = await one<{ two_factor_enabled: number; two_factor_verified_at: string | null }>(
      getDb(),
      `SELECT two_factor_enabled, two_factor_verified_at FROM users WHERE id = 'usr_minhanh'`,
    );
    assert.equal(Number(dbUserAfterEnable?.two_factor_enabled), 1, "Cột users.two_factor_enabled phải lưu = 1 trong CSDL");
    assert.ok(dbUserAfterEnable?.two_factor_verified_at, "Cột users.two_factor_verified_at phải được lưu");

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
    const dbUserAfterDisable = await one<{ two_factor_enabled: number }>(
      getDb(),
      `SELECT two_factor_enabled FROM users WHERE id = 'usr_minhanh'`,
    );
    assert.equal(Number(dbUserAfterDisable?.two_factor_enabled), 0, "Cột users.two_factor_enabled phải về 0 khi tắt 2FA");
    console.log("  ✓ Luồng 2FA TOTP (Setup -> Enable lưu CSDL users -> Challenge Login -> Disable) hoạt động chuẩn");

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

    // 7b. Kiểm thử cổng VNPAY Sandbox trọn luồng (Create Order HMAC-SHA512 -> Order QR -> Process NCB -> Verify Return -> Admin Refund & Retry)
    const orbitProj = await one<{ id: string }>(getDb(), `SELECT id FROM projects WHERE slug = 'orbit-one'`);
    assert.ok(orbitProj?.id);

    const vnpInit = await req<{ ok: boolean; redirect: string }>("/pledges", {
      method: "POST",
      token: tokens["Người dùng"],
      body: {
        projectId: orbitProj.id,
        tierId: "none",
        bonusAmount: 250000,
        paymentGateway: "VNPAY",
        vnpPayChannel: "VNBANK",
        vnpBankCode: "NCB",
        replaceExisting: true,
        note: "Kiểm thử ký quỹ VNPAY Sandbox",
      },
    });
    assert.equal(vnpInit.status, 201);
    assert.ok(vnpInit.data.redirect?.startsWith("/vnpay/checkout?"));

    const checkoutQs = vnpInit.data.redirect.split("?")[1] ?? "";
    const parsedQs = new URLSearchParams(checkoutQs);
    const txnRef = parsedQs.get("vnp_TxnRef") ?? "";
    assert.ok(txnRef.startsWith("VNP"));

    const orderView = await req<{ ok: boolean; order: { signatureVerified: boolean; amount: number }; qrDataUrl: string }>(
      `/vnpay/orders/${encodeURIComponent(txnRef)}?${checkoutQs}`,
      { token: tokens["Người dùng"] },
    );
    assert.equal(orderView.status, 200);
    assert.equal(orderView.data.order.signatureVerified, true);
    assert.equal(orderView.data.order.amount, 250000);
    assert.ok(orderView.data.qrDataUrl.startsWith("data:image/png;base64,"));

    const payRes = await req<{ ok: boolean; responseCode: string; pledgeCode: string; returnUrl: string }>("/vnpay/process", {
      method: "POST",
      token: tokens["Người dùng"],
      body: {
        txnRef,
        orderToken: parsedQs.get("token") ?? undefined,
        payChannel: "VNBANK",
        bankCode: "NCB",
        cardNumber: "9704198526191432198",
        cardHolder: "NGUYEN VAN A",
        issueDate: "07/15",
        otp: "123456",
      },
    });
    assert.equal(payRes.status, 200);
    assert.equal(payRes.data.responseCode, "00");
    assert.ok(payRes.data.pledgeCode.startsWith("FV-"));

    const returnQs = payRes.data.returnUrl.split("?")[1] ?? "";
    const verifiedReturn = await req<{ ok: boolean; signatureValid: boolean; isSuccess: boolean; pledgeCode: string }>(
      `/vnpay/verify-return?${returnQs}`,
    );
    assert.equal(verifiedReturn.status, 200);
    assert.equal(verifiedReturn.data.signatureValid, true);
    assert.equal(verifiedReturn.data.isSuccess, true);
    assert.equal(verifiedReturn.data.pledgeCode, payRes.data.pledgeCode);

    // Kiểm thử Admin xử lý CAPTURE_FAILED và Hoàn tiền VNPAY (REFUND)
    const failedPl = await one<{ id: string }>(getDb(), `SELECT id FROM pledges WHERE status = 'CAPTURE_FAILED' LIMIT 1`);
    if (failedPl) {
      const resolved = await req<{ ok: boolean }>("/admin/transactions/resolve-failed", {
        method: "POST",
        token: tokens["Admin"],
        body: { pledgeId: failedPl.id, op: "RETRY_CAPTURE", note: "Đối soát thu lại thành công" },
      });
      assert.equal(resolved.status, 200);
      assert.equal(resolved.data.ok, true);
    }

    const capturedPl = await one<{ id: string }>(
      getDb(),
      `SELECT pl.id FROM pledges pl
       LEFT JOIN shipments s ON s.pledge_id = pl.id
       WHERE pl.status = 'CAPTURED' AND (s.status IS NULL OR s.status <> 'DELIVERED')
       LIMIT 1`,
    );
    assert.ok(capturedPl?.id);
    const refundRes = await req<{ ok: boolean }>("/admin/transactions/refund", {
      method: "POST",
      token: tokens["Admin"],
      body: { pledgeId: capturedPl.id, reason: "Đối soát hoàn tiền kiểm thử qua cổng VNPAY" },
    });
    assert.equal(refundRes.status, 200);
    assert.equal(refundRes.data.ok, true);

    // Kiểm thử CRUD Bình luận của tác giả (Create -> Edit -> Delete) & CRUD Thể loại Admin
    const createdCmt = await req<{ ok: boolean }>("/comments", {
      method: "POST",
      token: tokens["Người dùng"],
      body: { projectId: orbitProj.id, body: "Bình luận kiểm thử ban đầu" },
    });
    assert.equal(createdCmt.status, 201);
    const cmtRow = await one<{ id: string }>(
      getDb(),
      `SELECT id FROM comments WHERE project_id = ? AND author_id = 'usr_minhanh' ORDER BY created_at DESC LIMIT 1`,
      orbitProj.id,
    );
    assert.ok(cmtRow?.id);
    const editedCmt = await req<{ ok: boolean }>("/comments", {
      method: "PATCH",
      token: tokens["Người dùng"],
      body: { commentId: cmtRow.id, body: "Bình luận đã chỉnh sửa thành công" },
    });
    assert.equal(editedCmt.status, 200);
    const deletedOwnCmt = await req<{ ok: boolean }>("/comments/moderate", {
      method: "POST",
      token: tokens["Người dùng"],
      body: { commentId: cmtRow.id, op: "delete" },
    });
    assert.equal(deletedOwnCmt.status, 200);

    const catCreate = await req<{ ok: boolean }>("/admin/categories/save", {
      method: "POST",
      token: tokens["Admin"],
      body: { name: "Âm nhạc Độc lập", slug: "am-nhac-doc-lap", description: "Dự án indie music", color: "#0EA5E9", sort_order: 99 },
    });
    assert.equal(catCreate.status, 200);
    const createdCatRow = await one<{ id: string }>(getDb(), `SELECT id FROM categories WHERE slug = 'am-nhac-doc-lap'`);
    assert.ok(createdCatRow?.id);
    const catDelete = await req<{ ok: boolean }>("/admin/categories/delete", {
      method: "POST",
      token: tokens["Admin"],
      body: { id: createdCatRow.id },
    });
    assert.equal(catDelete.status, 200);
    console.log("  ✓ Cổng VNPAY Sandbox (HMAC-SHA512, QR, NCB OTP, Return, Admin Refund/Retry) & CRUD Bình luận/Thể loại hoạt động chuẩn");

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

    // 10. Hàng đợi email: thông báo quan trọng được xếp hàng, tài khoản mẫu không bị gửi email thật
    await notify(getDb(), {
      userId: "usr_minhanh",
      type: "PLEDGE_CONFIRMED",
      title: "Góp vốn thành công (kiểm thử)",
      body: "Kiểm thử hàng đợi email.",
      link: "/me/backed",
    });
    const before = await req<{ ok: boolean; stats: Record<string, number> }>("/admin/email-outbox", { token: tokens["Admin"] });
    assert.equal(before.status, 200);
    assert.ok(before.data.stats.PENDING >= 1, "Thông báo PLEDGE_CONFIRMED phải được xếp vào hàng đợi email");
    const flushed = await req<{ ok: boolean; sent: number; skipped: number }>("/admin/email-outbox/flush", {
      method: "POST",
      token: tokens["Admin"],
    });
    assert.equal(flushed.status, 200);
    assert.equal(flushed.data.sent, 0, "Không được gửi email thật cho tài khoản mẫu khi đang test");
    assert.ok(flushed.data.skipped >= 1);
    const userForbidden = await req("/admin/email-outbox", { token: tokens["Người dùng"] });
    assert.equal(userForbidden.status, 403);
    console.log("  ✓ Hàng đợi email thông báo hoạt động (xếp hàng, bỏ qua tài khoản mẫu, chỉ admin được xem)");

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
