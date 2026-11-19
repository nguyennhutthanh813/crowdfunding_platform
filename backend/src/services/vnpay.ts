/**
 * Cổng thanh toán mô phỏng VNPAY Sandbox chuẩn đặc tả VNPAY 2.1.0 (HMAC-SHA512)
 * Tích hợp cơ chế Ký quỹ / Giữ chỗ All-or-Nothing (Escrow Hold) cho nền tảng gọi vốn cộng đồng FundViet.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { signVnpayOrderToken, verifyVnpayOrderToken } from "../auth/jwt.js";
import { env } from "../config/env.js";
import { DomainError, insert, newId, notify, nowIso, one, run, tx, type DbClient } from "../db/helpers.js";
import { loadViewer, pledgeBlocker } from "../rbac/rbac.js";
import { quotePledge, type PledgeInput } from "./pledge.js";
import { bumpDailyStats } from "./stats.js";

export interface VnpBankMeta {
  code: string;
  name: string;
  shortName: string;
  channel: "VNPAYQR" | "VNBANK" | "INTCARD";
}

export const VNPAY_BANKS: VnpBankMeta[] = [
  { code: "VNPAYQR", name: "Quét mã VNPAY-QR / VietQR Ngân hàng", shortName: "VNPAY-QR", channel: "VNPAYQR" },
  { code: "NCB", name: "Ngân hàng Quốc Dân (NCB Sandbox)", shortName: "NCB", channel: "VNBANK" },
  { code: "VCB", name: "Ngân hàng Ngoại thương (Vietcombank)", shortName: "Vietcombank", channel: "VNBANK" },
  { code: "TCB", name: "Ngân hàng Kỹ thương (Techcombank)", shortName: "Techcombank", channel: "VNBANK" },
  { code: "MBB", name: "Ngân hàng Quân đội (MB Bank)", shortName: "MB Bank", channel: "VNBANK" },
  { code: "BIDV", name: "Ngân hàng Đầu tư & Phát triển (BIDV)", shortName: "BIDV", channel: "VNBANK" },
  { code: "CTG", name: "Ngân hàng Công thương (VietinBank)", shortName: "VietinBank", channel: "VNBANK" },
  { code: "ACB", name: "Ngân hàng Á Châu (ACB)", shortName: "ACB", channel: "VNBANK" },
  { code: "VISA", name: "Thẻ quốc tế Visa / MasterCard / JCB", shortName: "Visa / MC / JCB", channel: "INTCARD" },
];

export const VNPAY_RESPONSE_MESSAGES: Record<string, string> = {
  "00": "Giao dịch thành công — Đã xác nhận ký quỹ giữ chỗ qua VNPAY.",
  "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
  "09": "Giao dịch không thành công do Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng.",
  "10": "Giao dịch không thành công do khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.",
  "11": "Giao dịch không thành công do mã xác thực OTP không chính xác hoặc đã hết hạn chờ thanh toán.",
  "12": "Giao dịch không thành công do Thẻ/Tài khoản của khách hàng đang bị khoá.",
  "24": "Giao dịch không thành công do khách hàng chủ động huỷ giao dịch.",
  "51": "Giao dịch không thành công do tài khoản của quý khách không đủ số dư để thực hiện giao dịch.",
  "65": "Giao dịch không thành công do tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.",
  "75": "Ngân hàng thanh toán đang bảo trì, vui lòng chọn phương thức hoặc ngân hàng khác.",
  "99": "Giao dịch không thành công do lỗi không xác định từ cổng thanh toán.",
};

function formatVnpDate(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    String(vn.getUTCFullYear()) +
    pad(vn.getUTCMonth() + 1) +
    pad(vn.getUTCDate()) +
    pad(vn.getUTCHours()) +
    pad(vn.getUTCMinutes()) +
    pad(vn.getUTCSeconds())
  );
}

/** Chuẩn sắp xếp key ASCII và mã hoá URL của VNPAY 2.1.0 trước khi ký HMAC-SHA512. */
export function buildVnpSignData(params: Record<string, string>): string {
  const keys = Object.keys(params)
    .filter(
      (k) =>
        k.startsWith("vnp_") &&
        k !== "vnp_SecureHash" &&
        k !== "vnp_SecureHashType" &&
        params[k] !== undefined &&
        params[k] !== "",
    )
    .sort();
  return keys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`)
    .join("&");
}

export function signVnpParams(params: Record<string, string>): string {
  const signData = buildVnpSignData(params);
  return createHmac("sha512", env.vnpHashSecret).update(Buffer.from(signData, "utf-8")).digest("hex");
}

export function verifyVnpParams(params: Record<string, string>): boolean {
  const received = (params.vnp_SecureHash ?? "").trim().toLowerCase();
  if (!received || !/^[0-9a-f]{128}$/.test(received)) return false;
  const expected = signVnpParams(params).toLowerCase();
  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

interface StoredPledgeIntent {
  tierId: string | null;
  bonusAmount: number;
  addOns: { id: string; quantity: number }[];
  addressId: string | null;
  anonymous: boolean;
  note: string;
  replaceExisting: boolean;
}

export interface CreateVnpayOrderInput extends Omit<PledgeInput, "paymentMethodId" | "newCard"> {
  bankCode?: string;
  payChannel?: "VNPAYQR" | "VNBANK" | "INTCARD";
  retryPledgeId?: string;
  ipAddress?: string | null;
}

export async function createVnpayOrder(db: DbClient, backerId: string, input: CreateVnpayOrderInput) {
  const bankMeta =
    VNPAY_BANKS.find((b) => b.code === (input.bankCode ?? "").toUpperCase()) ??
    (input.payChannel === "VNPAYQR"
      ? VNPAY_BANKS[0]
      : input.payChannel === "INTCARD"
        ? VNPAY_BANKS[VNPAY_BANKS.length - 1]
        : VNPAY_BANKS[1]);

  return tx(db, async () => {
    const viewer = await loadViewer(db, backerId);
    if (!viewer || viewer.status !== "ACTIVE") {
      throw new DomainError("Vui lòng đăng nhập bằng tài khoản đang hoạt động.", "UNAUTHORIZED");
    }

    // Trường hợp 1: Thanh toán lại khoản thu lỗi (RETRY_CAPTURE)
    if (input.retryPledgeId) {
      const failedPledge = await one<{
        id: string;
        code: string;
        project_id: string;
        total_amount: number;
        status: string;
        slug: string;
        title: string;
        p_status: string;
      }>(
        db,
        `SELECT pl.id, pl.code, pl.project_id, pl.total_amount, pl.status, p.slug, p.title, p.status AS p_status
         FROM pledges pl JOIN projects p ON p.id = pl.project_id
         WHERE pl.id = ? AND pl.backer_id = ?`,
        input.retryPledgeId,
        backerId,
      );
      if (!failedPledge) throw new DomainError("Không tìm thấy khoản góp vốn cần thanh toán lại.", "NOT_FOUND");
      if (failedPledge.status !== "CAPTURE_FAILED") {
        throw new DomainError("Khoản góp vốn này không ở trạng thái lỗi thu tiền.");
      }

      const now = new Date();
      const createdIso = now.toISOString();
      const expiresDate = new Date(now.getTime() + 15 * 60_000);
      const expiresIso = expiresDate.toISOString();
      const id = newId();
      const txnRef = `VNP${formatVnpDate(now).slice(0, 8)}${Math.floor(100000 + Math.random() * 900000)}`;
      const orderInfo = `Thanh toan lai pledge ${failedPledge.code} du an ${failedPledge.slug}`;
      const payloadJson = JSON.stringify({ retryPledgeId: failedPledge.id });

      await insert(db, "vnpay_orders", {
        id,
        txn_ref: txnRef,
        project_id: failedPledge.project_id,
        backer_id: backerId,
        pledge_id: failedPledge.id,
        purpose: "RETRY_CAPTURE",
        amount: Number(failedPledge.total_amount),
        bank_code: bankMeta.code,
        pay_channel: bankMeta.channel,
        order_info: orderInfo,
        payload_json: payloadJson,
        status: "PENDING",
        ip_address: input.ipAddress ?? "127.0.0.1",
        expires_at: expiresIso,
        created_at: createdIso,
      });

      const orderToken = signVnpayOrderToken({
        id,
        txnRef,
        projectId: failedPledge.project_id,
        backerId,
        pledgeId: failedPledge.id,
        purpose: "RETRY_CAPTURE",
        amount: Number(failedPledge.total_amount),
        bankCode: bankMeta.code,
        payChannel: bankMeta.channel,
        orderInfo,
        payloadJson,
        expiresAt: expiresIso,
        createdAt: createdIso,
      });

      const vnpParams: Record<string, string> = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: env.vnpTmnCode,
        vnp_Amount: String(Number(failedPledge.total_amount) * 100),
        vnp_BankCode: bankMeta.code,
        vnp_CreateDate: formatVnpDate(now),
        vnp_CurrCode: "VND",
        vnp_IpAddr: input.ipAddress ?? "127.0.0.1",
        vnp_Locale: "vn",
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: "crowdfunding",
        vnp_ReturnUrl: `${env.frontendUrl}/vnpay/return`,
        vnp_ExpireDate: formatVnpDate(expiresDate),
        vnp_TxnRef: txnRef,
      };
      vnpParams.vnp_SecureHash = signVnpParams(vnpParams);
      const qs = new URLSearchParams({ ...vnpParams, token: orderToken }).toString();

      return {
        txnRef,
        amount: Number(failedPledge.total_amount),
        slug: failedPledge.slug,
        checkoutUrl: `/vnpay/checkout?${qs}`,
      };
    }

    // Trường hợp 2: Góp vốn mới hoặc Đổi mức góp vốn trên dự án đang LIVE
    const project = await one<{
      id: string;
      status: string;
      end_at: string | null;
      title: string;
      slug: string;
      creator_id: string;
    }>(
      db,
      `SELECT id, status, end_at, title, slug, creator_id FROM projects WHERE id = ?`,
      input.projectId,
    );
    if (!project) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
    const blocker = await pledgeBlocker(db, viewer, project);
    if (blocker) throw new DomainError(blocker === "LOGIN" ? "Vui lòng đăng nhập để góp vốn." : blocker, "FORBIDDEN");

    const existing = await one<{ id: string; code: string }>(
      db,
      `SELECT id, code FROM pledges WHERE project_id = ? AND backer_id = ? AND status = 'AUTHORIZED'`,
      project.id,
      backerId,
    );
    if (existing && !input.replaceExisting) {
      throw new DomainError("Bạn đã góp vốn cho dự án này. Hãy dùng chức năng đổi mức góp vốn.", "CONFLICT");
    }

    const q = await quotePledge(db, input);

    let resolvedAddressId = input.addressId ?? null;
    if (q.ships) {
      if (input.newAddress) {
        const addrId = newId();
        const hasDefault = await one(db, `SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1`, backerId);
        await insert(db, "addresses", {
          id: addrId,
          user_id: backerId,
          recipient_name: input.newAddress.recipientName.trim(),
          phone: input.newAddress.phone.replace(/\D/g, ""),
          line1: input.newAddress.line1.trim(),
          ward: input.newAddress.ward.trim(),
          district: input.newAddress.district.trim(),
          province: input.newAddress.province.trim(),
          is_default: hasDefault ? 0 : 1,
        });
        resolvedAddressId = addrId;
      }
      const address = await one(db, `SELECT id FROM addresses WHERE id = ? AND user_id = ?`, resolvedAddressId ?? "", backerId);
      if (!address) throw new DomainError("Vui lòng chọn hoặc nhập địa chỉ giao hàng tại Việt Nam.");
    }

    const now = new Date();
    const createdIso = now.toISOString();
    const expiresDate = new Date(now.getTime() + 15 * 60_000);
    const expiresIso = expiresDate.toISOString();
    const id = newId();
    const txnRef = `VNP${formatVnpDate(now).slice(0, 8)}${Math.floor(100000 + Math.random() * 900000)}`;
    const purpose = existing ? "REPLACE_PLEDGE" : "NEW_PLEDGE";
    const orderInfo = `Ky quy gop von du an ${project.slug}`;
    const intent: StoredPledgeIntent = {
      tierId: input.tierId,
      bonusAmount: q.bonus,
      addOns: q.lines.map((l) => ({ id: l.id, quantity: l.quantity })),
      addressId: resolvedAddressId,
      anonymous: Boolean(input.anonymous),
      note: (input.note ?? "").slice(0, 300),
      replaceExisting: Boolean(existing || input.replaceExisting),
    };
    const payloadJson = JSON.stringify(intent);

    await insert(db, "vnpay_orders", {
      id,
      txn_ref: txnRef,
      project_id: project.id,
      backer_id: backerId,
      pledge_id: null,
      purpose,
      amount: q.total,
      bank_code: bankMeta.code,
      pay_channel: bankMeta.channel,
      order_info: orderInfo,
      payload_json: payloadJson,
      status: "PENDING",
      ip_address: input.ipAddress ?? "127.0.0.1",
      expires_at: expiresIso,
      created_at: createdIso,
    });

    const orderToken = signVnpayOrderToken({
      id,
      txnRef,
      projectId: project.id,
      backerId,
      pledgeId: null,
      purpose,
      amount: q.total,
      bankCode: bankMeta.code,
      payChannel: bankMeta.channel,
      orderInfo,
      payloadJson,
      expiresAt: expiresIso,
      createdAt: createdIso,
    });

    const vnpParams: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: env.vnpTmnCode,
      vnp_Amount: String(q.total * 100),
      vnp_BankCode: bankMeta.code,
      vnp_CreateDate: formatVnpDate(now),
      vnp_CurrCode: "VND",
      vnp_IpAddr: input.ipAddress ?? "127.0.0.1",
      vnp_Locale: "vn",
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "crowdfunding",
      vnp_ReturnUrl: `${env.frontendUrl}/vnpay/return`,
      vnp_ExpireDate: formatVnpDate(expiresDate),
      vnp_TxnRef: txnRef,
    };
    vnpParams.vnp_SecureHash = signVnpParams(vnpParams);
    const qs = new URLSearchParams({ ...vnpParams, token: orderToken }).toString();

    return {
      txnRef,
      amount: q.total,
      slug: project.slug,
      checkoutUrl: `/vnpay/checkout?${qs}`,
    };
  });
}

async function ensureOrderHydrated(db: DbClient, txnRef: string, orderToken?: string) {
  let row = await one<{
    id: string;
    txn_ref: string;
    project_id: string;
    backer_id: string;
    pledge_id: string | null;
    purpose: "NEW_PLEDGE" | "REPLACE_PLEDGE" | "RETRY_CAPTURE";
    amount: number;
    bank_code: string;
    pay_channel: "VNPAYQR" | "VNBANK" | "INTCARD";
    order_info: string;
    payload_json: string;
    status: string;
    vnp_transaction_no: string | null;
    vnp_response_code: string | null;
    expires_at: string;
    paid_at: string | null;
    created_at: string;
  }>(db, `SELECT * FROM vnpay_orders WHERE txn_ref = ?`, txnRef);

  if (!row && orderToken) {
    const verified = verifyVnpayOrderToken(orderToken);
    if (verified && verified.txnRef === txnRef) {
      await insert(db, "vnpay_orders", {
        id: verified.id,
        txn_ref: verified.txnRef,
        project_id: verified.projectId,
        backer_id: verified.backerId,
        pledge_id: verified.pledgeId,
        purpose: verified.purpose,
        amount: verified.amount,
        bank_code: verified.bankCode,
        pay_channel: verified.payChannel,
        order_info: verified.orderInfo,
        payload_json: verified.payloadJson,
        status: "PENDING",
        expires_at: verified.expiresAt,
        created_at: verified.createdAt,
      });
      row = await one(db, `SELECT * FROM vnpay_orders WHERE txn_ref = ?`, txnRef);
    }
  }
  return row;
}

export async function getVnpayOrderDetail(
  db: DbClient,
  txnRef: string,
  vnpQuery: Record<string, string>,
  orderToken?: string,
) {
  const signatureValid = vnpQuery.vnp_SecureHash ? verifyVnpParams(vnpQuery) : true;
  if (!signatureValid) {
    throw new DomainError("Chữ ký số bảo mật VNPAY (HMAC-SHA512) không hợp lệ.", "FORBIDDEN");
  }

  const order = await ensureOrderHydrated(db, txnRef, orderToken);
  if (!order) throw new DomainError("Không tìm thấy đơn thanh toán VNPAY hoặc đơn đã hết hạn.", "NOT_FOUND");

  const now = nowIso();
  if (order.status === "PENDING" && order.expires_at <= now) {
    await run(db, `UPDATE vnpay_orders SET status = 'EXPIRED', vnp_response_code = '11' WHERE id = ?`, order.id);
    order.status = "EXPIRED";
    order.vnp_response_code = "11";
  }

  const project = await one<{ id: string; slug: string; title: string; cover_url: string | null; goal_amount: number; end_at: string | null }>(
    db,
    `SELECT id, slug, title, cover_url, goal_amount, end_at FROM projects WHERE id = ?`,
    order.project_id,
  );
  if (!project) throw new DomainError("Dự án không còn tồn tại.", "NOT_FOUND");

  const qrPayload = `00020101021238570010A000000727012700069704190113FUNDVIETESCROW0208QRIBFTTA530370454${String(
    order.amount,
  ).length.toString().padStart(2, "0")}${order.amount}5802VN62${String(order.txn_ref.length + 4).padStart(
    2,
    "0",
  )}08${String(order.txn_ref.length).padStart(2, "0")}${order.txn_ref}6304ABCD`;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 240,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return {
    order: {
      txnRef: order.txn_ref,
      purpose: order.purpose,
      amount: Number(order.amount),
      bankCode: order.bank_code,
      payChannel: order.pay_channel,
      orderInfo: order.order_info,
      status: order.status,
      expiresAt: order.expires_at,
      createdAt: order.created_at,
      signatureVerified: signatureValid,
      tmnCode: env.vnpTmnCode,
    },
    project,
    qrDataUrl,
    banks: VNPAY_BANKS,
  };
}

export interface ProcessVnpayPaymentInput {
  txnRef: string;
  orderToken?: string;
  payChannel?: "VNPAYQR" | "VNBANK" | "INTCARD";
  bankCode?: string;
  cardNumber?: string;
  cardHolder?: string;
  issueDate?: string;
  otp?: string;
  simulateCode?: string;
}

export async function processVnpayPayment(db: DbClient, viewerId: string | null, input: ProcessVnpayPaymentInput) {
  const order = await ensureOrderHydrated(db, input.txnRef, input.orderToken);
  if (!order) throw new DomainError("Không tìm thấy đơn giao dịch VNPAY.", "NOT_FOUND");
  if (viewerId && order.backer_id !== viewerId) {
    throw new DomainError("Đơn thanh toán này không thuộc tài khoản hiện tại.", "FORBIDDEN");
  }

  const project = await one<{
    id: string;
    slug: string;
    title: string;
    status: string;
    end_at: string | null;
    creator_id: string;
  }>(db, `SELECT id, slug, title, status, end_at, creator_id FROM projects WHERE id = ?`, order.project_id);
  if (!project) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");

  // Idempotency: nếu đơn đã thanh toán xong, trả lại URL kết quả hiện có
  if (order.status === "PAID" && order.pledge_id) {
    const existingPl = await one<{ code: string }>(db, `SELECT code FROM pledges WHERE id = ?`, order.pledge_id);
    const ret = buildSignedReturnUrl({
      txnRef: order.txn_ref,
      amount: Number(order.amount),
      bankCode: order.bank_code,
      orderInfo: order.order_info,
      responseCode: "00",
      transactionNo: order.vnp_transaction_no || "14800001",
      slug: project.slug,
      pledgeCode: existingPl?.code ?? "",
    });
    return { ok: true, responseCode: "00", returnUrl: ret };
  }

  const now = new Date();
  const nowStr = now.toISOString();
  if (order.status === "EXPIRED" || order.expires_at <= nowStr) {
    await run(db, `UPDATE vnpay_orders SET status = 'EXPIRED', vnp_response_code = '11' WHERE id = ?`, order.id);
    const ret = buildSignedReturnUrl({
      txnRef: order.txn_ref,
      amount: Number(order.amount),
      bankCode: order.bank_code,
      orderInfo: order.order_info,
      responseCode: "11",
      transactionNo: "0",
      slug: project.slug,
      pledgeCode: "",
    });
    return { ok: true, responseCode: "11", returnUrl: ret };
  }

  const chosenChannel = input.payChannel || order.pay_channel;
  const chosenBank = (input.bankCode || order.bank_code || "NCB").toUpperCase();
  const cleanDigits = (input.cardNumber ?? "").replace(/\D/g, "");
  const cleanHolder = (input.cardHolder ?? "NGUYEN VAN A").trim().toUpperCase();
  const cleanOtp = (input.otp ?? "").replace(/\s+/g, "");

  let responseCode = "00";
  if (input.simulateCode && Object.prototype.hasOwnProperty.call(VNPAY_RESPONSE_MESSAGES, input.simulateCode)) {
    responseCode = input.simulateCode;
  } else if (chosenChannel === "VNPAYQR") {
    responseCode = "00";
  } else {
    if (cleanDigits.length < 12 || cleanDigits.length > 19) {
      throw new DomainError("Vui lòng nhập số thẻ ATM / thẻ quốc tế hợp lệ (12–19 chữ số).");
    }
    if (cleanHolder.length < 2) {
      throw new DomainError("Vui lòng nhập tên chủ thẻ không dấu.");
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new DomainError("Vui lòng nhập mã xác thực OTP gồm 6 chữ số (mã thử chuẩn VNPAY: 123456).");
    }
    if (cleanOtp === "000000") {
      responseCode = "11";
    } else if (cleanDigits === "4000000000000002" || cleanDigits === "9704198526191432199") {
      responseCode = "51";
    } else if (cleanDigits === "9704198526191432190") {
      responseCode = "12";
    }
  }

  const transactionNo = responseCode === "00" ? `${14800000 + Math.floor(Math.random() * 199999)}` : "0";
  const cardMask =
    chosenChannel === "VNPAYQR"
      ? "VNPAY-QR"
      : cleanDigits.length >= 8
        ? `${cleanDigits.slice(0, 6)}••••••${cleanDigits.slice(-4)}`
        : "970419••••••2198";
  const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "2198";

  if (responseCode !== "00") {
    const failedStatus = responseCode === "24" ? "CANCELLED" : "FAILED";
    await run(
      db,
      `UPDATE vnpay_orders
       SET status = ?, bank_code = ?, pay_channel = ?, vnp_response_code = ?, vnp_transaction_no = ?, card_mask = ?, card_holder = ?
       WHERE id = ?`,
      failedStatus,
      chosenBank,
      chosenChannel,
      responseCode,
      transactionNo,
      cardMask,
      cleanHolder,
      order.id,
    );
    const ret = buildSignedReturnUrl({
      txnRef: order.txn_ref,
      amount: Number(order.amount),
      bankCode: chosenBank,
      orderInfo: order.order_info,
      responseCode,
      transactionNo,
      slug: project.slug,
      pledgeCode: "",
    });
    return { ok: true, responseCode, returnUrl: ret };
  }

  // Xử lý IPN thành công (responseCode === '00') trong một giao dịch CSDL nguyên tử
  const settled = await tx(db, async () => {
    // Lưu hoặc lấy phương thức thanh toán đại diện VNPAY của người dùng
    let pm = await one<{ id: string }>(
      db,
      `SELECT id FROM payment_methods WHERE user_id = ? AND brand = 'VNPAY' AND last4 = ? LIMIT 1`,
      order.backer_id,
      last4,
    );
    if (!pm) {
      const pmId = newId();
      const hasDefault = await one(db, `SELECT 1 FROM payment_methods WHERE user_id = ? AND is_default = 1`, order.backer_id);
      await insert(db, "payment_methods", {
        id: pmId,
        user_id: order.backer_id,
        brand: "VNPAY",
        last4,
        exp_month: 12,
        exp_year: 2030,
        holder_name: `${chosenBank} - ${cleanHolder}`.slice(0, 80),
        provider_token: `vnp_tok_${newId()}`,
        is_default: hasDefault ? 0 : 1,
      });
      pm = { id: pmId };
    }

    if (order.purpose === "RETRY_CAPTURE" && order.pledge_id) {
      const pl = await one<{ id: string; code: string; status: string; tier_id: string | null }>(
        db,
        `SELECT id, code, status, tier_id FROM pledges WHERE id = ? AND backer_id = ?`,
        order.pledge_id,
        order.backer_id,
      );
      if (!pl) throw new DomainError("Không tìm thấy khoản góp vốn cần thu lại.", "NOT_FOUND");
      if (pl.status === "CAPTURE_FAILED") {
        await run(
          db,
          `UPDATE pledges SET status = 'CAPTURED', payment_method_id = ?, captured_at = ?, updated_at = ? WHERE id = ?`,
          pm.id,
          nowStr,
          nowStr,
          pl.id,
        );
        await insert(db, "payment_transactions", {
          id: newId(),
          pledge_id: pl.id,
          kind: "CAPTURE",
          amount: Number(order.amount),
          status: "SUCCEEDED",
          idempotency_key: `${pl.id}:CAPTURE:${order.txn_ref}`,
          provider: "VNPAY",
          provider_ref: transactionNo,
          bank_code: chosenBank,
          vnp_txn_ref: order.txn_ref,
          vnp_response_code: "00",
          message: `Thanh toán bù thành công qua cổng VNPAY (${chosenBank})`,
          created_at: nowStr,
        });
        if (project.status === "FULFILLING" && pl.tier_id) {
          const tier = await one<{ ships_physical: number }>(db, `SELECT ships_physical FROM reward_tiers WHERE id = ?`, pl.tier_id);
          if (tier?.ships_physical === 1) {
            const hasShip = await one(db, `SELECT 1 FROM shipments WHERE pledge_id = ?`, pl.id);
            if (!hasShip) await insert(db, "shipments", { pledge_id: pl.id, status: "PREPARING" });
          }
        }
      }
      await run(
        db,
        `UPDATE vnpay_orders
         SET status = 'PAID', bank_code = ?, pay_channel = ?, vnp_response_code = '00', vnp_transaction_no = ?, card_mask = ?, card_holder = ?, paid_at = ?
         WHERE id = ?`,
        chosenBank,
        chosenChannel,
        transactionNo,
        cardMask,
        cleanHolder,
        nowStr,
        order.id,
      );
      await notify(db, {
        userId: order.backer_id,
        type: "PLEDGE_CONFIRMED",
        title: "Đã thanh toán lại khoản góp vốn thành công!",
        body: `Mã ${pl.code} qua cổng VNPAY (${chosenBank}) — GD #${transactionNo}.`,
        link: "/me/backed",
        projectId: project.id,
      });
      return { pledgeId: pl.id, pledgeCode: pl.code };
    }

    // NEW_PLEDGE hoặc REPLACE_PLEDGE
    const intent = JSON.parse(order.payload_json) as StoredPledgeIntent;
    const existing = await one<{ id: string; total_amount: number }>(
      db,
      `SELECT id, total_amount FROM pledges WHERE project_id = ? AND backer_id = ? AND status = 'AUTHORIZED'`,
      project.id,
      order.backer_id,
    );
    if (existing) {
      await run(db, `UPDATE pledges SET status = 'CANCELLED', cancelled_at = ?, updated_at = ? WHERE id = ?`, nowStr, nowStr, existing.id);
      await insert(db, "payment_transactions", {
        id: newId(),
        pledge_id: existing.id,
        kind: "VOID",
        amount: existing.total_amount,
        status: "SUCCEEDED",
        idempotency_key: `${existing.id}:VOID`,
        provider: "VNPAY",
        message: "Giải phóng khoản giữ chỗ cũ để thay bằng gói góp vốn mới qua VNPAY",
        created_at: nowStr,
      });
      await bumpDailyStats(db, project.id, { backers: -1, amount: -Number(existing.total_amount) });
    }

    const q = await quotePledge(db, {
      projectId: project.id,
      tierId: intent.tierId,
      bonusAmount: intent.bonusAmount,
      addOns: intent.addOns ?? [],
    });

    let address: Record<string, string> | undefined;
    if (q.ships) {
      address = await one(db, `SELECT * FROM addresses WHERE id = ? AND user_id = ?`, intent.addressId ?? "", order.backer_id);
      if (!address) throw new DomainError("Địa chỉ giao hàng không còn hợp lệ.");
    }

    const seq = Number((await one<{ n: number }>(db, `SELECT COUNT(*) + 1001 AS n FROM pledges`))?.n ?? 1001);
    const code = `FV-${String(seq).padStart(6, "0")}-${newId().slice(0, 3).toUpperCase()}`;
    const pledgeId = newId();

    await insert(db, "pledges", {
      id: pledgeId,
      code,
      project_id: project.id,
      backer_id: order.backer_id,
      tier_id: intent.tierId,
      payment_method_id: pm.id,
      address_id: address?.id ?? null,
      reward_amount: q.reward,
      bonus_amount: q.bonus,
      add_on_amount: q.addOnAmount,
      shipping_amount: q.shipping,
      total_amount: q.total,
      status: "AUTHORIZED",
      ship_recipient: address?.recipient_name ?? null,
      ship_phone: address?.phone ?? null,
      ship_address: address ? [address.line1, address.ward, address.district].filter(Boolean).join(", ") : null,
      ship_province: address?.province ?? null,
      is_anonymous: intent.anonymous ? 1 : 0,
      note: (intent.note ?? "").slice(0, 300),
      created_at: nowStr,
      updated_at: nowStr,
    });

    for (const l of q.lines) {
      await insert(db, "pledge_add_ons", {
        pledge_id: pledgeId,
        add_on_id: l.id,
        project_id: project.id,
        quantity: l.quantity,
        unit_price: l.price,
      });
    }

    await insert(db, "payment_transactions", {
      id: newId(),
      pledge_id: pledgeId,
      kind: "AUTHORIZE",
      amount: q.total,
      status: "SUCCEEDED",
      idempotency_key: `${pledgeId}:AUTHORIZE`,
      provider: "VNPAY",
      provider_ref: transactionNo,
      bank_code: chosenBank,
      vnp_txn_ref: order.txn_ref,
      vnp_response_code: "00",
      message: `Đã ký quỹ tạm giữ qua cổng VNPAY (${chosenBank}) — chỉ giải ngân khi dự án đạt mục tiêu`,
      created_at: nowStr,
    });

    await run(
      db,
      `UPDATE vnpay_orders
       SET pledge_id = ?, status = 'PAID', bank_code = ?, pay_channel = ?, vnp_response_code = '00', vnp_transaction_no = ?, card_mask = ?, card_holder = ?, paid_at = ?
       WHERE id = ?`,
      pledgeId,
      chosenBank,
      chosenChannel,
      transactionNo,
      cardMask,
      cleanHolder,
      nowStr,
      order.id,
    );

    await bumpDailyStats(db, project.id, { pledges: 1, backers: 1, amount: q.total });
    await notify(db, {
      userId: project.creator_id,
      type: "PLEDGE_RECEIVED",
      title: `${project.title} vừa nhận khoản góp vốn VNPAY mới`,
      body: `+${q.total.toLocaleString("vi-VN")}đ (${chosenBank})`,
      link: `/studio/${project.slug}`,
      actorId: order.backer_id,
      projectId: project.id,
    });
    await notify(db, {
      userId: order.backer_id,
      type: "PLEDGE_CONFIRMED",
      title: "Góp vốn VNPAY thành công!",
      body: `Mã ${code} · VNPAY #${transactionNo} — tiền được bảo vệ theo cơ chế All-or-Nothing.`,
      link: `/me/backed`,
      projectId: project.id,
    });

    return { pledgeId, pledgeCode: code };
  });

  const returnUrl = buildSignedReturnUrl({
    txnRef: order.txn_ref,
    amount: Number(order.amount),
    bankCode: chosenBank,
    orderInfo: order.order_info,
    responseCode: "00",
    transactionNo,
    slug: project.slug,
    pledgeCode: settled.pledgeCode,
  });

  return {
    ok: true,
    responseCode: "00",
    pledgeCode: settled.pledgeCode,
    transactionNo,
    returnUrl,
  };
}

function buildSignedReturnUrl(opts: {
  txnRef: string;
  amount: number;
  bankCode: string;
  orderInfo: string;
  responseCode: string;
  transactionNo: string;
  slug: string;
  pledgeCode: string;
}): string {
  const vnpParams: Record<string, string> = {
    vnp_Amount: String(opts.amount * 100),
    vnp_BankCode: opts.bankCode,
    vnp_BankTranNo: opts.responseCode === "00" ? `VNP${opts.transactionNo}` : "",
    vnp_CardType: opts.bankCode === "VNPAYQR" ? "QRCODE" : opts.bankCode === "VISA" ? "VISA" : "ATM",
    vnp_OrderInfo: opts.orderInfo,
    vnp_PayDate: formatVnpDate(new Date()),
    vnp_ResponseCode: opts.responseCode,
    vnp_TmnCode: env.vnpTmnCode,
    vnp_TransactionNo: opts.transactionNo,
    vnp_TransactionStatus: opts.responseCode,
    vnp_TxnRef: opts.txnRef,
  };
  const hash = signVnpParams(vnpParams);
  const full = new URLSearchParams({
    ...vnpParams,
    vnp_SecureHash: hash,
    slug: opts.slug,
    ...(opts.pledgeCode ? { code: opts.pledgeCode } : {}),
  });
  return `/vnpay/return?${full.toString()}`;
}

export async function verifyVnpayReturn(db: DbClient, rawQuery: Record<string, string>) {
  const vnpOnly: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawQuery)) {
    if (k.startsWith("vnp_")) vnpOnly[k] = v;
  }
  const signatureValid = verifyVnpParams(vnpOnly);
  const responseCode = vnpOnly.vnp_ResponseCode || "99";
  const txnRef = vnpOnly.vnp_TxnRef || "";
  const amount = Math.round(Number(vnpOnly.vnp_Amount || 0) / 100);
  const order = txnRef ? await one<{ purpose: string; pledge_id: string | null; project_id: string }>(db, `SELECT purpose, pledge_id, project_id FROM vnpay_orders WHERE txn_ref = ?`, txnRef) : undefined;
  const project = order
    ? await one<{ slug: string; title: string }>(db, `SELECT slug, title FROM projects WHERE id = ?`, order.project_id)
    : rawQuery.slug
      ? await one<{ slug: string; title: string }>(db, `SELECT slug, title FROM projects WHERE slug = ?`, rawQuery.slug)
      : undefined;
  const pledge = order?.pledge_id
    ? await one<{ code: string; status: string }>(db, `SELECT code, status FROM pledges WHERE id = ?`, order.pledge_id)
    : rawQuery.code
      ? await one<{ code: string; status: string }>(db, `SELECT code, status FROM pledges WHERE code = ?`, rawQuery.code)
      : undefined;

  return {
    signatureValid,
    isSuccess: signatureValid && responseCode === "00",
    responseCode,
    message: signatureValid
      ? VNPAY_RESPONSE_MESSAGES[responseCode] ?? VNPAY_RESPONSE_MESSAGES["99"]
      : "Chữ ký số phản hồi VNPAY (vnp_SecureHash) không khớp — Giao dịch bị từ chối đối soát!",
    txnRef,
    transactionNo: vnpOnly.vnp_TransactionNo || "",
    bankCode: vnpOnly.vnp_BankCode || "",
    cardType: vnpOnly.vnp_CardType || "",
    payDate: vnpOnly.vnp_PayDate || "",
    orderInfo: vnpOnly.vnp_OrderInfo || "",
    amount,
    purpose: order?.purpose ?? "NEW_PLEDGE",
    projectSlug: project?.slug ?? rawQuery.slug ?? "",
    projectTitle: project?.title ?? "",
    pledgeCode: pledge?.code ?? rawQuery.code ?? "",
  };
}
