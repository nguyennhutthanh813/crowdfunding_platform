/** Nghiệp vụ góp vốn (FR19–FR24) — mọi số tiền tính lại phía server. */
import type { DatabaseSync } from "node:sqlite";
import { DomainError, all, insert, newId, notify, nowIso, one, run, tx } from "../db/helpers.ts";
import { loadViewer, pledgeBlocker } from "../rbac/rbac.ts";
import { bumpDailyStats } from "./stats.ts";

export interface PledgeInput {
  projectId: string;
  tierId: string | null;
  bonusAmount: number;
  addOns: { id: string; quantity: number }[];
  addressId?: string | null;
  newAddress?: { recipientName: string; phone: string; line1: string; ward: string; district: string; province: string } | null;
  paymentMethodId?: string | null;
  newCard?: { number: string; expMonth: number; expYear: number; holderName: string } | null;
  anonymous?: boolean;
  note?: string;
  /** Đổi pledge: huỷ pledge đang hiệu lực rồi tạo pledge mới (BR05). */
  replaceExisting?: boolean;
}

export function luhnValid(num: string) {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): "VISA" | "MASTERCARD" | "JCB" | "NAPAS" {
  const d = num.replace(/\D/g, "");
  if (d.startsWith("4")) return "VISA";
  if (/^5[1-5]|^2[2-7]/.test(d)) return "MASTERCARD";
  if (/^35/.test(d)) return "JCB";
  return "NAPAS";
}

/** Thẻ thử bị từ chối của MockPay. */
export const DECLINED_TEST_CARD = "4000000000000002";

export function quotePledge(db: DatabaseSync, input: Pick<PledgeInput, "projectId" | "tierId" | "bonusAmount" | "addOns">) {
  let reward = 0, shipping = 0, ships = false;
  let tier: { id: string; amount: number; shipping_fee: number; ships_physical: number; quantity_limit: number | null; claimed_count: number; is_active: number; title: string } | undefined;
  if (input.tierId) {
    tier = one(db, `SELECT id, amount, shipping_fee, ships_physical, quantity_limit, claimed_count, is_active, title FROM reward_tiers WHERE id = ? AND project_id = ?`, input.tierId, input.projectId);
    if (!tier || !tier.is_active) throw new DomainError("Mức quà không hợp lệ.");
    if (tier.quantity_limit !== null && tier.claimed_count >= tier.quantity_limit) throw new DomainError("Mức quà này đã hết suất.");
    reward = tier.amount;
    ships = tier.ships_physical === 1;
    shipping = ships ? tier.shipping_fee : 0;
  }
  const bonus = Math.max(0, Math.round(input.bonusAmount || 0));
  let addOnAmount = 0;
  const lines: { id: string; quantity: number; price: number; title: string }[] = [];
  if (input.addOns.length && !tier) throw new DomainError("Add-on chỉ mua kèm khi chọn mức quà.");
  for (const a of input.addOns.filter((x) => x.quantity > 0)) {
    const row = one<{ id: string; price: number; title: string; max_per_pledge: number; is_active: number; stock: number | null; sold_count: number }>(db,
      `SELECT id, price, title, max_per_pledge, is_active, stock, sold_count FROM add_ons WHERE id = ? AND project_id = ?`, a.id, input.projectId);
    if (!row || !row.is_active) throw new DomainError("Add-on không hợp lệ.");
    if (a.quantity > row.max_per_pledge) throw new DomainError(`Tối đa ${row.max_per_pledge} × ${row.title}.`);
    if (row.stock !== null && row.sold_count + a.quantity > row.stock) throw new DomainError(`${row.title} không đủ số lượng.`);
    addOnAmount += row.price * a.quantity;
    lines.push({ id: row.id, quantity: a.quantity, price: row.price, title: row.title });
  }
  const total = reward + bonus + addOnAmount + shipping;
  if (total < 10_000) throw new DomainError("Số tiền góp tối thiểu là 10.000đ.");
  return { reward, bonus, addOnAmount, shipping, total, ships, lines, tier };
}

export function createPledge(db: DatabaseSync, backerId: string, input: PledgeInput) {
  return tx(db, () => {
    const viewer = loadViewer(db, backerId);
    const project = one<{ id: string; status: string; end_at: string | null; title: string; slug: string; creator_id: string }>(db,
      `SELECT id, status, end_at, title, slug, creator_id FROM projects WHERE id = ?`, input.projectId);
    if (!project) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
    const blocker = pledgeBlocker(db, viewer, project);
    if (blocker) throw new DomainError(blocker === "LOGIN" ? "Vui lòng đăng nhập để góp vốn." : blocker, "FORBIDDEN");

    const existing = one<{ id: string; total_amount: number }>(db,
      `SELECT id, total_amount FROM pledges WHERE project_id = ? AND backer_id = ? AND status = 'AUTHORIZED'`, project.id, backerId);
    if (existing && !input.replaceExisting) throw new DomainError("Bạn đã góp vốn cho dự án này. Hãy dùng chức năng đổi pledge.", "CONFLICT");
    if (existing) cancelPledgeInternal(db, backerId, existing.id, "Đổi sang pledge mới");

    const q = quotePledge(db, input);

    // Địa chỉ giao hàng (chỉ khi quà vật lý, nội bộ Việt Nam)
    let address: Record<string, string> | undefined;
    if (q.ships) {
      if (input.newAddress) {
        const id = newId();
        const hasDefault = one(db, `SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1`, backerId);
        insert(db, "addresses", {
          id, user_id: backerId, recipient_name: input.newAddress.recipientName.trim(), phone: input.newAddress.phone.replace(/\D/g, ""),
          line1: input.newAddress.line1.trim(), ward: input.newAddress.ward.trim(), district: input.newAddress.district.trim(),
          province: input.newAddress.province.trim(), is_default: hasDefault ? 0 : 1,
        });
        input.addressId = id;
      }
      address = one(db, `SELECT * FROM addresses WHERE id = ? AND user_id = ?`, input.addressId ?? "", backerId);
      if (!address) throw new DomainError("Vui lòng nhập địa chỉ giao hàng tại Việt Nam.");
    }

    // Thẻ mô phỏng — chỉ lưu token + 4 số cuối (NFR07)
    let cardId = input.paymentMethodId ?? null;
    if (input.newCard) {
      const num = input.newCard.number.replace(/\D/g, "");
      if (!luhnValid(num)) throw new DomainError("Số thẻ không hợp lệ.");
      const now = new Date();
      if (input.newCard.expYear < now.getFullYear() || (input.newCard.expYear === now.getFullYear() && input.newCard.expMonth < now.getMonth() + 1))
        throw new DomainError("Thẻ đã hết hạn.");
      if (num === DECLINED_TEST_CARD) throw new DomainError("MockPay: thẻ bị ngân hàng từ chối (thẻ thử 4000 0000 0000 0002).");
      cardId = newId();
      const hasDefault = one(db, `SELECT 1 FROM payment_methods WHERE user_id = ? AND is_default = 1`, backerId);
      insert(db, "payment_methods", {
        id: cardId, user_id: backerId, brand: cardBrand(num), last4: num.slice(-4), exp_month: input.newCard.expMonth,
        exp_year: input.newCard.expYear, holder_name: input.newCard.holderName.trim().toUpperCase(), provider_token: `tok_${newId()}`,
        is_default: hasDefault ? 0 : 1,
      });
    }
    if (!cardId || !one(db, `SELECT 1 FROM payment_methods WHERE id = ? AND user_id = ?`, cardId, backerId))
      throw new DomainError("Vui lòng chọn hoặc nhập thẻ thanh toán.");

    const seq = Number(one<{ n: number }>(db, `SELECT COUNT(*) + 1001 n FROM pledges`)?.n ?? 1001);
    const code = `FV-${String(seq).padStart(6, "0")}-${newId().slice(0, 3).toUpperCase()}`;
    const id = newId();
    const now = nowIso();
    insert(db, "pledges", {
      id, code, project_id: project.id, backer_id: backerId, tier_id: input.tierId, payment_method_id: cardId,
      address_id: address?.id ?? null, reward_amount: q.reward, bonus_amount: q.bonus, add_on_amount: q.addOnAmount,
      shipping_amount: q.shipping, total_amount: q.total, status: "AUTHORIZED",
      ship_recipient: address?.recipient_name ?? null, ship_phone: address?.phone ?? null,
      ship_address: address ? [address.line1, address.ward, address.district].filter(Boolean).join(", ") : null,
      ship_province: address?.province ?? null, is_anonymous: input.anonymous ? 1 : 0, note: (input.note ?? "").slice(0, 300),
      created_at: now, updated_at: now,
    });
    for (const l of q.lines) insert(db, "pledge_add_ons", { pledge_id: id, add_on_id: l.id, project_id: project.id, quantity: l.quantity, unit_price: l.price });
    insert(db, "payment_transactions", {
      id: newId(), pledge_id: id, kind: "AUTHORIZE", amount: q.total, status: "SUCCEEDED", idempotency_key: `${id}:AUTHORIZE`,
      provider_ref: `mp_${newId().slice(0, 12)}`, message: "Đã giữ chỗ (chưa trừ tiền)",
    });
    bumpDailyStats(db, project.id, { pledges: 1, backers: 1, amount: q.total });
    notify(db, { userId: project.creator_id, type: "PLEDGE_RECEIVED", title: `${project.title} vừa nhận pledge mới`, body: `+${q.total.toLocaleString("vi-VN")}đ`, link: `/studio/${project.slug}`, actorId: backerId, projectId: project.id });
    notify(db, { userId: backerId, type: "PLEDGE_CONFIRMED", title: "Góp vốn thành công!", body: `Mã ${code} — tiền chỉ bị trừ khi dự án đạt mục tiêu.`, link: `/me/backed`, projectId: project.id });
    return { id, code, total: q.total };
  });
}

function cancelPledgeInternal(db: DatabaseSync, backerId: string, pledgeId: string, reason: string) {
  const pl = one<{ id: string; project_id: string; total_amount: number; status: string; p_status: string; end_at: string }>(db,
    `SELECT pl.id, pl.project_id, pl.total_amount, pl.status, p.status p_status, p.end_at
     FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.id = ? AND pl.backer_id = ?`, pledgeId, backerId);
  if (!pl) throw new DomainError("Không tìm thấy pledge.", "NOT_FOUND");
  if (pl.status !== "AUTHORIZED" || pl.p_status !== "LIVE" || new Date(pl.end_at) <= new Date())
    throw new DomainError("Chỉ huỷ được pledge khi dự án còn đang gọi vốn.");
  const now = nowIso();
  run(db, `UPDATE pledges SET status = 'CANCELLED', cancelled_at = ?, updated_at = ? WHERE id = ?`, now, now, pl.id);
  insert(db, "payment_transactions", {
    id: newId(), pledge_id: pl.id, kind: "VOID", amount: pl.total_amount, status: "SUCCEEDED", idempotency_key: `${pl.id}:VOID`,
    message: `Backer huỷ pledge — giải phóng tiền giữ chỗ. ${reason}`,
  });
  bumpDailyStats(db, pl.project_id, { backers: -1, amount: -pl.total_amount });
}

export function cancelPledge(db: DatabaseSync, backerId: string, pledgeId: string) {
  return tx(db, () => cancelPledgeInternal(db, backerId, pledgeId, ""));
}

export function listUserCards(db: DatabaseSync, userId: string) {
  return all<{ id: string; brand: string; last4: string; exp_month: number; exp_year: number; is_default: number }>(db,
    `SELECT id, brand, last4, exp_month, exp_year, is_default FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`, userId);
}
export function listUserAddresses(db: DatabaseSync, userId: string) {
  return all<{ id: string; label: string; recipient_name: string; phone: string; line1: string; ward: string; district: string; province: string; is_default: number }>(db,
    `SELECT id, label, recipient_name, phone, line1, ward, district, province, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`, userId);
}
