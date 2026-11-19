import { randomBytes } from "node:crypto";
import { getDb } from "../db/index.js";
import { audit, DomainError, humanizeError, insert, newId, notify, nowIso, one, all, run, statusHistory, tx, type DbClient } from "../db/helpers.js";
import { canProject, hasSystemPerm, type Viewer } from "../rbac/rbac.js";
import {
  advanceFulfillment,
  cancelProject,
  deleteDraft,
  launchNow,
  setSchedule,
  submitForReview,
  updateShipment,
  withdrawSubmission,
} from "../services/lifecycle.js";
import { runPrediction } from "../services/ai/run.js";
import { bumpDailyStats } from "../services/stats.js";
import {
  arrVal,
  boolVal,
  hasKey,
  intVal,
  LOCK_REASON,
  rawStrVal,
  slugify,
  strVal,
  type ActionResult,
  type Payload,
} from "../utils-shared.js";

const DAY_MS = 86_400_000;

function parseVnDatetimeLocal(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)
    ? `${t}:00+07:00`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(t)
      ? `${t}+07:00`
      : t;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) throw new DomainError("Ngày giờ không hợp lệ.");
  return d.toISOString();
}

async function requireActor(v: Viewer | null, projectId: string, perm: string) {
  if (!v) throw new DomainError("Vui lòng đăng nhập để tiếp tục.", "FORBIDDEN");
  const db = getDb();
  if (!(await canProject(db, v, projectId, perm))) {
    throw new DomainError(LOCK_REASON[perm] ?? "Bạn không có quyền thực hiện thao tác này.", "FORBIDDEN");
  }
  const p = await one<{
    id: string;
    slug: string;
    title: string;
    status: string;
    creator_id: string;
    goal_amount: number;
    duration_days: number;
  }>(
    db,
    `SELECT id, slug, title, status, creator_id, goal_amount, duration_days FROM projects WHERE id = ?`,
    projectId,
  );
  if (!p) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
  return { v, db, p };
}

async function notifyUpdatePublished(db: DbClient, p: { id: string; slug: string; title: string }, updateTitle: string, actorId: string) {
  const recipients = await all<{ user_id: string }>(
    db,
    `SELECT DISTINCT backer_id AS user_id FROM pledges WHERE project_id = ? AND status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED')
     UNION
     SELECT user_id FROM saved_projects WHERE project_id = ?`,
    p.id,
    p.id,
  );
  for (const r of recipients) {
    if (r.user_id === actorId) continue;
    await notify(db, {
      userId: r.user_id,
      type: "PROJECT_UPDATE",
      title: `${p.title} có bản cập nhật mới`,
      body: updateTitle,
      link: `/p/${p.slug}?tab=updates`,
      actorId,
      projectId: p.id,
    });
  }
}

/* ───────────────────────── 1. Dự án nháp & nội dung (project.edit) ───────────────────────── */

export async function createDraftProject(v: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    if (!v) throw new DomainError("Vui lòng đăng nhập để tạo dự án.", "FORBIDDEN");
    if (!hasSystemPerm(v, "project.create")) {
      throw new DomainError("Tài khoản này không có quyền tạo dự án mới.", "FORBIDDEN");
    }
    const db = getDb();
    const title = strVal(bodyIn, "title");
    const categoryId = strVal(bodyIn, "category_id");
    const blurb = strVal(bodyIn, "blurb");
    const coverUrl = strVal(bodyIn, "cover_url") || null;
    const videoUrl = strVal(bodyIn, "video_url") || null;
    const goalAmount = intVal(bodyIn, "goal_amount", 50_000_000);
    const durationDays = intVal(bodyIn, "duration_days", 30);

    if (title.length < 5 || title.length > 80) throw new DomainError("Tên dự án phải từ 5 đến 80 ký tự.");
    if (blurb.length > 200) throw new DomainError("Mô tả ngắn tối đa 200 ký tự.");
    if (!categoryId || !(await one(db, `SELECT 1 FROM categories WHERE id = ? AND is_active = 1`, categoryId))) {
      throw new DomainError("Vui lòng chọn thể loại hợp lệ.");
    }
    if (goalAmount < 1_000_000 || goalAmount > 2_000_000_000) {
      throw new DomainError("Mục tiêu phải từ 1.000.000đ đến 2.000.000.000đ.");
    }
    if (durationDays < 1 || durationDays > 60) {
      throw new DomainError("Thời lượng gọi vốn phải từ 1 đến 60 ngày.");
    }

    let baseSlug = slugify(title) || "du-an";
    if (baseSlug.length < 3) baseSlug = `${baseSlug}-du-an`;
    let slug = baseSlug;
    while (await one(db, `SELECT 1 FROM projects WHERE slug = ?`, slug)) {
      slug = `${baseSlug.slice(0, 52)}-${randomBytes(3).toString("hex")}`;
    }

    const id = newId();
    await tx(db, async () => {
      await insert(db, "projects", {
        id,
        creator_id: v.id,
        category_id: categoryId,
        title,
        slug,
        blurb,
        cover_url: coverUrl,
        video_url: videoUrl,
        goal_amount: goalAmount,
        duration_days: durationDays,
        status: "DRAFT",
      });
      await statusHistory(db, id, null, "DRAFT", v.id, "Tạo bản nháp dự án");
      await audit(db, v.id, "project.create", "project", id, slug);
    });

    return { ok: true, slug, message: "Đã tạo bản nháp dự án!", redirect: `/studio/${slug}/setup?step=2` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function updateBasics(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "project.edit");

    const title = strVal(bodyIn, "title");
    const categoryId = strVal(bodyIn, "category_id");
    const blurb = strVal(bodyIn, "blurb");
    const coverUrl = strVal(bodyIn, "cover_url") || null;
    const videoUrl = strVal(bodyIn, "video_url") || null;

    if (title.length < 5 || title.length > 80) throw new DomainError("Tên dự án phải từ 5 đến 80 ký tự.");
    if (blurb.length > 200) throw new DomainError("Mô tả ngắn tối đa 200 ký tự.");
    if (!categoryId || !(await one(db, `SELECT 1 FROM categories WHERE id = ? AND is_active = 1`, categoryId))) {
      throw new DomainError("Vui lòng chọn thể loại hợp lệ.");
    }

    const hasGoal = hasKey(bodyIn, "goal_amount");
    const hasDuration = hasKey(bodyIn, "duration_days");
    const goalAmount = hasGoal ? intVal(bodyIn, "goal_amount", Number(p.goal_amount)) : Number(p.goal_amount);
    const durationDays = hasDuration ? intVal(bodyIn, "duration_days", Number(p.duration_days)) : Number(p.duration_days);

    if (goalAmount < 1_000_000 || goalAmount > 2_000_000_000) {
      throw new DomainError("Mục tiêu phải từ 1.000.000đ đến 2.000.000.000đ.");
    }
    if (durationDays < 1 || durationDays > 60) {
      throw new DomainError("Thời lượng gọi vốn phải từ 1 đến 60 ngày.");
    }

    await run(
      db,
      `UPDATE projects
       SET title = ?, category_id = ?, blurb = ?, cover_url = ?, video_url = ?, goal_amount = ?, duration_days = ?, updated_at = ?
       WHERE id = ?`,
      title,
      categoryId,
      blurb,
      coverUrl,
      videoUrl,
      goalAmount,
      durationDays,
      nowIso(),
      projectId,
    );

    const nextStep = strVal(bodyIn, "next_step");
    return {
      ok: true,
      slug: p.slug,
      message: "Đã lưu thông tin cơ bản.",
      ...(nextStep ? { redirect: `/studio/${p.slug}/setup?step=${nextStep}` } : {}),
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveSection(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "project.edit");

    const sectionId = strVal(bodyIn, "section_id");
    const kind = strVal(bodyIn, "kind").toUpperCase() || "TEXT";
    const heading = strVal(bodyIn, "heading");
    const body = rawStrVal(bodyIn, "body");
    const mediaUrl = strVal(bodyIn, "media_url") || null;

    if (!["TEXT", "IMAGE", "VIDEO"].includes(kind)) throw new DomainError("Loại section không hợp lệ.");
    if (kind === "TEXT" && body.trim().length === 0) {
      throw new DomainError("Nội dung đoạn văn không được để trống.");
    }
    if (kind !== "TEXT" && !mediaUrl) {
      throw new DomainError(kind === "IMAGE" ? "Vui lòng chọn hoặc nhập URL hình ảnh." : "Vui lòng nhập URL video.");
    }

    await tx(db, async () => {
      if (sectionId) {
        const exists = await one(db, `SELECT id FROM project_sections WHERE id = ? AND project_id = ?`, sectionId, projectId);
        if (!exists) throw new DomainError("Không tìm thấy section cần sửa.", "NOT_FOUND");
        await run(
          db,
          `UPDATE project_sections SET kind = ?, heading = ?, body = ?, media_url = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
          kind,
          heading,
          body,
          kind === "TEXT" ? null : mediaUrl,
          nowIso(),
          sectionId,
          projectId,
        );
      } else {
        const maxOrderRow = await one<{ m: number | null }>(db, `SELECT MAX(sort_order) AS m FROM project_sections WHERE project_id = ?`, projectId);
        const maxOrder = maxOrderRow?.m === null || maxOrderRow?.m === undefined ? -1 : Number(maxOrderRow.m);
        await insert(db, "project_sections", {
          id: newId(),
          project_id: projectId,
          kind,
          heading,
          body,
          media_url: kind === "TEXT" ? null : mediaUrl,
          sort_order: Math.max(0, maxOrder + 1),
        });
      }
      await run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    return { ok: true, slug: p.slug, message: sectionId ? "Đã cập nhật mục nội dung." : "Đã thêm mục nội dung mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function moveSection(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "project.edit");
    const sectionId = strVal(bodyIn, "section_id");
    const dir = strVal(bodyIn, "dir") === "down" ? "down" : "up";

    await tx(db, async () => {
      const rows = await all<{ id: string; sort_order: number }>(
        db,
        `SELECT id, sort_order FROM project_sections WHERE project_id = ? ORDER BY sort_order`,
        projectId,
      );
      const idx = rows.findIndex((r) => r.id === sectionId);
      if (idx === -1) throw new DomainError("Không tìm thấy section.", "NOT_FOUND");
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= rows.length) return;
      const a = rows[idx];
      const b = rows[targetIdx];
      await run(db, `UPDATE project_sections SET sort_order = -1 WHERE id = ?`, a.id);
      await run(db, `UPDATE project_sections SET sort_order = ? WHERE id = ?`, a.sort_order, b.id);
      await run(db, `UPDATE project_sections SET sort_order = ? WHERE id = ?`, b.sort_order, a.id);
      await run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    return { ok: true, slug: p.slug, message: "Đã đổi vị trí mục nội dung." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteSection(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "project.edit");
    const sectionId = strVal(bodyIn, "section_id");

    await tx(db, async () => {
      const res = await run(db, `DELETE FROM project_sections WHERE id = ? AND project_id = ?`, sectionId, projectId);
      if (res.changes === 0) throw new DomainError("Không tìm thấy section.", "NOT_FOUND");
      const rest = await all<{ id: string }>(db, `SELECT id FROM project_sections WHERE project_id = ? ORDER BY sort_order`, projectId);
      for (let i = 0; i < rest.length; i++) {
        await run(db, `UPDATE project_sections SET sort_order = ? WHERE id = ?`, i, rest[i].id);
      }
      await run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    return { ok: true, slug: p.slug, message: "Đã xoá mục nội dung." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveRisks(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "project.edit");
    const risks = strVal(bodyIn, "risks");
    await run(db, `UPDATE projects SET risks = ?, updated_at = ? WHERE id = ?`, risks, nowIso(), projectId);
    return { ok: true, slug: p.slug, message: "Đã lưu rủi ro & phương án dự phòng." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 2. Phần quà & add-on (reward.manage) ───────────────────────── */

function parseTierItems(bodyIn: Payload): { name: string; quantity: number }[] {
  const jsonRaw = strVal(bodyIn, "items_json");
  if (jsonRaw) {
    const parsed = JSON.parse(jsonRaw) as { name?: string; quantity?: number }[];
    return parsed
      .map((i) => ({ name: String(i.name ?? "").trim(), quantity: Math.max(1, Math.round(Number(i.quantity ?? 1))) }))
      .filter((i) => i.name.length > 0);
  }
  const names = arrVal(bodyIn, "item_name").map((x) => x.trim());
  const qtys = arrVal(bodyIn, "item_qty").map((x) => Math.max(1, Math.round(Number(x) || 1)));
  return names
    .map((name, idx) => ({ name, quantity: qtys[idx] ?? 1 }))
    .filter((i) => i.name.length > 0);
}

export async function saveTier(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "reward.manage");

    const tierId = strVal(bodyIn, "tier_id");
    const title = strVal(bodyIn, "title");
    const description = strVal(bodyIn, "description");
    const amount = intVal(bodyIn, "amount", 0);
    const estimatedDelivery = strVal(bodyIn, "estimated_delivery") || new Date(Date.now() + 90 * DAY_MS).toISOString().slice(0, 7);
    const limitRaw = strVal(bodyIn, "quantity_limit");
    const quantityLimit = limitRaw ? intVal(bodyIn, "quantity_limit", 0) : null;
    const shipsPhysical = boolVal(bodyIn, "ships_physical") ? 1 : 0;
    const shippingFee = shipsPhysical ? Math.max(0, intVal(bodyIn, "shipping_fee", 0)) : 0;
    const isActive = hasKey(bodyIn, "is_active") ? (boolVal(bodyIn, "is_active") ? 1 : 0) : 1;
    const items = parseTierItems(bodyIn);
    const addOnIds = arrVal(bodyIn, "add_on_ids").filter(Boolean);
    const syncAddOns = strVal(bodyIn, "sync_add_ons") === "1";

    if (title.length < 2) throw new DomainError("Tên mức quà phải có ít nhất 2 ký tự.");
    if (amount < 10_000) throw new DomainError("Số tiền mức quà tối thiểu 10.000đ.");
    if (quantityLimit !== null && quantityLimit <= 0) throw new DomainError("Giới hạn suất phải lớn hơn 0.");

    await tx(db, async () => {
      let targetId = tierId;
      if (tierId) {
        const cur = await one<{ id: string; amount: number; claimed_count: number }>(
          db,
          `SELECT id, amount, claimed_count FROM reward_tiers WHERE id = ? AND project_id = ?`,
          tierId,
          projectId,
        );
        if (!cur) throw new DomainError("Không tìm thấy mức quà.", "NOT_FOUND");
        if (Number(cur.claimed_count) > 0 && amount !== Number(cur.amount)) {
          throw new DomainError("Mức quà đã có người chọn nên không thể thay đổi giá.");
        }
        if (quantityLimit !== null && quantityLimit < Number(cur.claimed_count)) {
          throw new DomainError(`Giới hạn suất phải từ ${cur.claimed_count} trở lên.`);
        }
        await run(
          db,
          `UPDATE reward_tiers
           SET title = ?, description = ?, amount = ?, estimated_delivery = ?, quantity_limit = ?,
               ships_physical = ?, shipping_fee = ?, is_active = ?
           WHERE id = ? AND project_id = ?`,
          title,
          description,
          amount,
          estimatedDelivery,
          quantityLimit,
          shipsPhysical,
          shippingFee,
          isActive,
          tierId,
          projectId,
        );
      } else {
        targetId = newId();
        const maxOrderRow = await one<{ m: number | null }>(db, `SELECT MAX(sort_order) AS m FROM reward_tiers WHERE project_id = ?`, projectId);
        const maxOrder = maxOrderRow?.m === null || maxOrderRow?.m === undefined ? -1 : Number(maxOrderRow.m);
        await insert(db, "reward_tiers", {
          id: targetId,
          project_id: projectId,
          title,
          description,
          amount,
          estimated_delivery: estimatedDelivery,
          quantity_limit: quantityLimit,
          ships_physical: shipsPhysical,
          shipping_fee: shippingFee,
          is_active: isActive,
          sort_order: maxOrder + 1,
        });
      }

      await run(db, `DELETE FROM reward_items WHERE tier_id = ?`, targetId);
      for (let idx = 0; idx < items.length; idx++) {
        await insert(db, "reward_items", {
          id: newId(),
          tier_id: targetId,
          name: items[idx].name,
          quantity: items[idx].quantity,
          sort_order: idx,
        });
      }

      if (syncAddOns) {
        await run(db, `DELETE FROM reward_tier_add_ons WHERE tier_id = ? AND project_id = ?`, targetId, projectId);
        const validRows = await all<{ id: string }>(db, `SELECT id FROM add_ons WHERE project_id = ?`, projectId);
        const validAddOns = new Set(validRows.map((a) => a.id));
        for (const aid of new Set(addOnIds)) {
          if (validAddOns.has(aid)) {
            await insert(db, "reward_tier_add_ons", { tier_id: targetId, add_on_id: aid, project_id: projectId });
          }
        }
      }
      await run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    return { ok: true, slug: p.slug, message: tierId ? "Đã cập nhật mức quà." : "Đã thêm mức quà mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function toggleTierActive(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "reward.manage");
    const tierId = strVal(bodyIn, "tier_id");
    const res = await run(
      db,
      `UPDATE reward_tiers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ? AND project_id = ?`,
      tierId,
      projectId,
    );
    if (res.changes === 0) throw new DomainError("Không tìm thấy mức quà.", "NOT_FOUND");
    return { ok: true, slug: p.slug, message: "Đã đổi trạng thái mức quà." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteTier(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "reward.manage");
    const tierId = strVal(bodyIn, "tier_id");
    if (await one(db, `SELECT 1 FROM pledges WHERE tier_id = ? LIMIT 1`, tierId)) {
      throw new DomainError("Gói phần thưởng đã có người chọn nên không thể xoá.");
    }
    const res = await run(db, `DELETE FROM reward_tiers WHERE id = ? AND project_id = ?`, tierId, projectId);
    if (res.changes === 0) throw new DomainError("Không tìm thấy mức quà.", "NOT_FOUND");
    return { ok: true, slug: p.slug, message: "Đã xoá mức quà." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveAddOn(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "reward.manage");

    const addOnId = strVal(bodyIn, "add_on_id");
    const title = strVal(bodyIn, "title");
    const description = strVal(bodyIn, "description");
    const price = intVal(bodyIn, "price", 0);
    const stockRaw = strVal(bodyIn, "stock");
    const stock = stockRaw ? intVal(bodyIn, "stock", 0) : null;
    const maxPerPledge = intVal(bodyIn, "max_per_pledge", 5);
    const isActive = hasKey(bodyIn, "is_active") ? (boolVal(bodyIn, "is_active") ? 1 : 0) : 1;
    const tierIds = arrVal(bodyIn, "tier_ids").filter(Boolean);
    const syncTiers = strVal(bodyIn, "sync_tiers") === "1";

    if (title.length < 2) throw new DomainError("Tên phụ kiện phải có ít nhất 2 ký tự.");
    if (price <= 0) throw new DomainError("Giá phụ kiện phải lớn hơn 0đ.");
    if (stock !== null && stock < 0) throw new DomainError("Tồn kho không hợp lệ.");
    if (maxPerPledge < 1 || maxPerPledge > 99) throw new DomainError("Số lượng tối đa mỗi đơn từ 1 đến 99.");

    await tx(db, async () => {
      let targetId = addOnId;
      if (addOnId) {
        const cur = await one<{ id: string; sold_count: number }>(
          db,
          `SELECT id, sold_count FROM add_ons WHERE id = ? AND project_id = ?`,
          addOnId,
          projectId,
        );
        if (!cur) throw new DomainError("Không tìm thấy phụ kiện.", "NOT_FOUND");
        if (stock !== null && stock < Number(cur.sold_count)) {
          throw new DomainError(`Tồn kho phải lớn hơn hoặc bằng số đã bán (${cur.sold_count}).`);
        }
        await run(
          db,
          `UPDATE add_ons SET title = ?, description = ?, price = ?, stock = ?, max_per_pledge = ?, is_active = ? WHERE id = ? AND project_id = ?`,
          title,
          description,
          price,
          stock,
          maxPerPledge,
          isActive,
          addOnId,
          projectId,
        );
      } else {
        targetId = newId();
        await insert(db, "add_ons", {
          id: targetId,
          project_id: projectId,
          title,
          description,
          price,
          stock,
          max_per_pledge: maxPerPledge,
          is_active: isActive,
        });
      }

      if (syncTiers) {
        await run(db, `DELETE FROM reward_tier_add_ons WHERE add_on_id = ? AND project_id = ?`, targetId, projectId);
        const validRows = await all<{ id: string }>(db, `SELECT id FROM reward_tiers WHERE project_id = ?`, projectId);
        const validTiers = new Set(validRows.map((t) => t.id));
        for (const tid of new Set(tierIds)) {
          if (validTiers.has(tid)) {
            await insert(db, "reward_tier_add_ons", { tier_id: tid, add_on_id: targetId, project_id: projectId });
          }
        }
      }
      await run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    return { ok: true, slug: p.slug, message: addOnId ? "Đã cập nhật phụ kiện." : "Đã thêm phụ kiện mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteAddOn(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "reward.manage");
    const addOnId = strVal(bodyIn, "add_on_id");
    if (await one(db, `SELECT 1 FROM pledge_add_ons WHERE add_on_id = ? LIMIT 1`, addOnId)) {
      throw new DomainError("Phụ kiện này đã có người đặt mua nên không thể xoá — hãy tắt kích hoạt thay thế.");
    }
    const res = await run(db, `DELETE FROM add_ons WHERE id = ? AND project_id = ?`, addOnId, projectId);
    if (res.changes === 0) throw new DomainError("Không tìm thấy phụ kiện.", "NOT_FOUND");
    return { ok: true, slug: p.slug, message: "Đã xoá phụ kiện." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 3. Updates (update.draft / update.publish) ───────────────────────── */

export async function saveUpdate(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const wantPublish = strVal(bodyIn, "publish") === "1";
    const { v, db, p } = await requireActor(viewer, projectId, wantPublish ? "update.publish" : "update.draft");

    const updateId = strVal(bodyIn, "update_id");
    const title = strVal(bodyIn, "title");
    const body = strVal(bodyIn, "body");
    const backersOnly = boolVal(bodyIn, "backers_only") ? 1 : 0;

    if (title.length < 3) throw new DomainError("Tiêu đề Update phải có ít nhất 3 ký tự.");
    if (body.length < 10) throw new DomainError("Nội dung Update phải có ít nhất 10 ký tự.");

    const now = nowIso();
    await tx(db, async () => {
      if (updateId) {
        const cur = await one<{ id: string; status: "DRAFT" | "PUBLISHED" }>(
          db,
          `SELECT id, status FROM project_updates WHERE id = ? AND project_id = ?`,
          updateId,
          projectId,
        );
        if (!cur) throw new DomainError("Không tìm thấy bản cập nhật.", "NOT_FOUND");
        if (cur.status === "PUBLISHED" && !(await canProject(db, v, projectId, "update.publish"))) {
          throw new DomainError(LOCK_REASON["update.publish"], "FORBIDDEN");
        }
        if (cur.status === "DRAFT" && wantPublish) {
          await run(
            db,
            `UPDATE project_updates SET title = ?, body = ?, backers_only = ?, status = 'PUBLISHED', published_by = ?, published_at = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
            title,
            body,
            backersOnly,
            v.id,
            now,
            now,
            updateId,
            projectId,
          );
          await notifyUpdatePublished(db, p, title, v.id);
        } else {
          await run(
            db,
            `UPDATE project_updates SET title = ?, body = ?, backers_only = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
            title,
            body,
            backersOnly,
            now,
            updateId,
            projectId,
          );
        }
      } else if (wantPublish) {
        await insert(db, "project_updates", {
          id: newId(),
          project_id: projectId,
          author_id: v.id,
          title,
          body,
          status: "PUBLISHED",
          backers_only: backersOnly,
          published_by: v.id,
          published_at: now,
        });
        await notifyUpdatePublished(db, p, title, v.id);
      } else {
        await insert(db, "project_updates", {
          id: newId(),
          project_id: projectId,
          author_id: v.id,
          title,
          body,
          status: "DRAFT",
          backers_only: backersOnly,
          published_by: null,
          published_at: null,
        });
      }
    });

    return {
      ok: true,
      slug: p.slug,
      message: wantPublish ? "Đã đăng Update công khai tới cộng đồng!" : "Đã lưu bản nháp Update.",
      celebrate: wantPublish,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function publishUpdate(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "update.publish");
    const updateId = strVal(bodyIn, "update_id");

    await tx(db, async () => {
      const cur = await one<{ id: string; title: string; status: string }>(
        db,
        `SELECT id, title, status FROM project_updates WHERE id = ? AND project_id = ?`,
        updateId,
        projectId,
      );
      if (!cur) throw new DomainError("Không tìm thấy bản nháp Update.", "NOT_FOUND");
      if (cur.status === "PUBLISHED") throw new DomainError("Update này đã được đăng trước đó.");
      const now = nowIso();
      await run(
        db,
        `UPDATE project_updates SET status = 'PUBLISHED', published_by = ?, published_at = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
        v.id,
        now,
        now,
        updateId,
        projectId,
      );
      await notifyUpdatePublished(db, p, cur.title, v.id);
    });

    return { ok: true, slug: p.slug, message: "Đã đăng Update công khai và gửi thông báo tới backer!", celebrate: true };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteUpdateDraft(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "update.draft");
    const updateId = strVal(bodyIn, "update_id");
    const cur = await one<{ status: string }>(db, `SELECT status FROM project_updates WHERE id = ? AND project_id = ?`, updateId, projectId);
    if (!cur) throw new DomainError("Không tìm thấy bản tin Update.", "NOT_FOUND");
    if (cur.status !== "DRAFT" && !(await canProject(db, v, projectId, "update.publish"))) {
      throw new DomainError("Collaborator chỉ có thể xoá bản nháp Update. Chỉ Creator mới xoá được bản tin đã đăng.");
    }
    await run(db, `DELETE FROM project_updates WHERE id = ? AND project_id = ?`, updateId, projectId);
    return { ok: true, slug: p.slug, message: cur.status === "DRAFT" ? "Đã xoá bản nháp Update." : "Đã xoá bản tin Update." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 4. FAQ (faq.manage) ───────────────────────── */

export async function saveFaq(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "faq.manage");
    const faqId = strVal(bodyIn, "faq_id");
    const question = strVal(bodyIn, "question");
    const answer = strVal(bodyIn, "answer");

    if (question.length < 5) throw new DomainError("Câu hỏi phải có ít nhất 5 ký tự.");
    if (answer.length < 2) throw new DomainError("Câu trả lời phải có ít nhất 2 ký tự.");

    if (faqId) {
      const res = await run(
        db,
        `UPDATE faqs SET question = ?, answer = ?, updated_by = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
        question,
        answer,
        v.id,
        nowIso(),
        faqId,
        projectId,
      );
      if (res.changes === 0) throw new DomainError("Không tìm thấy câu hỏi FAQ.", "NOT_FOUND");
    } else {
      const maxOrderRow = await one<{ m: number | null }>(db, `SELECT MAX(sort_order) AS m FROM faqs WHERE project_id = ?`, projectId);
      const maxOrder = maxOrderRow?.m === null || maxOrderRow?.m === undefined ? -1 : Number(maxOrderRow.m);
      await insert(db, "faqs", {
        id: newId(),
        project_id: projectId,
        question,
        answer,
        sort_order: maxOrder + 1,
        created_by: v.id,
        updated_by: v.id,
      });
    }

    return { ok: true, slug: p.slug, message: faqId ? "Đã cập nhật FAQ." : "Đã thêm câu hỏi FAQ mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteFaq(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "faq.manage");
    const faqId = strVal(bodyIn, "faq_id");
    const res = await run(db, `DELETE FROM faqs WHERE id = ? AND project_id = ?`, faqId, projectId);
    if (res.changes === 0) throw new DomainError("Không tìm thấy câu hỏi FAQ.", "NOT_FOUND");
    return { ok: true, slug: p.slug, message: "Đã xoá FAQ." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function moveFaq(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "faq.manage");
    const faqId = strVal(bodyIn, "faq_id");
    const dir = strVal(bodyIn, "dir") === "down" ? "down" : "up";

    await tx(db, async () => {
      const rows = await all<{ id: string }>(db, `SELECT id FROM faqs WHERE project_id = ? ORDER BY sort_order, created_at`, projectId);
      const idx = rows.findIndex((r) => r.id === faqId);
      if (idx === -1) throw new DomainError("Không tìm thấy FAQ.", "NOT_FOUND");
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= rows.length) return;
      [rows[idx], rows[targetIdx]] = [rows[targetIdx], rows[idx]];
      for (let i = 0; i < rows.length; i++) {
        await run(db, `UPDATE faqs SET sort_order = ? WHERE id = ?`, i, rows[i].id);
      }
    });

    return { ok: true, slug: p.slug, message: "Đã đổi thứ tự FAQ." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 5. AI Inbox bình luận ───────────────────────── */

export async function replyInboxComment(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "comment.reply");
    const commentId = strVal(bodyIn, "comment_id");
    const body = strVal(bodyIn, "body");

    if (body.length < 1 || body.length > 2000) throw new DomainError("Nội dung trả lời từ 1 đến 2000 ký tự.");

    await tx(db, async () => {
      const parent = await one<{ id: string; author_id: string; parent_id: string | null; status: string }>(
        db,
        `SELECT id, author_id, parent_id, status FROM comments WHERE id = ? AND project_id = ?`,
        commentId,
        projectId,
      );
      if (!parent || parent.status === "DELETED") throw new DomainError("Không tìm thấy bình luận.", "NOT_FOUND");
      if (parent.parent_id) throw new DomainError("Chỉ trả lời tối đa 2 cấp.");

      await insert(db, "comments", {
        id: newId(),
        project_id: projectId,
        parent_id: commentId,
        author_id: v.id,
        body,
        status: "VISIBLE",
      });
      await bumpDailyStats(db, projectId, { comments: 1 });

      const now = nowIso();
      await run(
        db,
        `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
        v.id,
        now,
        commentId,
      );

      if (parent.author_id !== v.id) {
        await notify(db, {
          userId: parent.author_id,
          type: "COMMENT_REPLY",
          title: `${v.displayName} đã trả lời bình luận của bạn`,
          body: body.slice(0, 140),
          link: `/p/${p.slug}?tab=comments`,
          actorId: v.id,
          projectId,
        });
      }
    });

    return { ok: true, slug: p.slug, message: "Đã gửi câu trả lời tới cộng đồng!" };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function markCommentHandled(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "comment.reply");
    const commentId = strVal(bodyIn, "comment_id");
    const handled = strVal(bodyIn, "handled") !== "0";

    const exists = await one(db, `SELECT 1 FROM comments WHERE id = ? AND project_id = ?`, commentId, projectId);
    if (!exists) throw new DomainError("Không tìm thấy bình luận.", "NOT_FOUND");

    if (handled) {
      await run(db, `UPDATE comment_analyses SET handled_by = ?, handled_at = ? WHERE comment_id = ?`, v.id, nowIso(), commentId);
    } else {
      await run(db, `UPDATE comment_analyses SET handled_by = NULL, handled_at = NULL WHERE comment_id = ?`, commentId);
    }

    return { ok: true, slug: p.slug, message: handled ? "Đã đánh dấu đã xử lý." : "Đã mở lại trạng thái cần xử lý." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function moderateStudioComment(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "comment.moderate");
    const commentId = strVal(bodyIn, "comment_id");
    const nextStatus = strVal(bodyIn, "status") || "HIDDEN";
    const reason = strVal(bodyIn, "reason") || "Ẩn từ Studio";

    if (!["VISIBLE", "HIDDEN", "DELETED"].includes(nextStatus)) throw new DomainError("Trạng thái không hợp lệ.");

    await tx(db, async () => {
      const exists = await one(db, `SELECT 1 FROM comments WHERE id = ? AND project_id = ?`, commentId, projectId);
      if (!exists) throw new DomainError("Không tìm thấy bình luận.", "NOT_FOUND");
      const now = nowIso();
      if (nextStatus === "VISIBLE") {
        await run(
          db,
          `UPDATE comments SET status = 'VISIBLE', moderated_by = NULL, moderated_reason = NULL, updated_at = ? WHERE id = ? AND project_id = ?`,
          now,
          commentId,
          projectId,
        );
      } else {
        await run(
          db,
          `UPDATE comments SET status = ?, moderated_by = ?, moderated_reason = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
          nextStatus,
          v.id,
          reason,
          now,
          commentId,
          projectId,
        );
        await run(
          db,
          `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
          v.id,
          now,
          commentId,
        );
      }
      await audit(db, v.id, `comment.${nextStatus.toLowerCase()}`, "comment", commentId, reason);
    });

    return { ok: true, slug: p.slug, message: nextStatus === "VISIBLE" ? "Đã hiện lại bình luận." : "Đã ẩn bình luận." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function promoteCommentToFaq(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "faq.manage");
    if (!(await canProject(db, v, projectId, "insight.view"))) {
      throw new DomainError(LOCK_REASON["insight.view"], "FORBIDDEN");
    }
    const commentId = strVal(bodyIn, "comment_id");
    const question = strVal(bodyIn, "question");
    const answer = strVal(bodyIn, "answer");

    if (question.length < 5) throw new DomainError("Câu hỏi FAQ phải có ít nhất 5 ký tự.");
    if (answer.length < 2) throw new DomainError("Câu trả lời FAQ phải có ít nhất 2 ký tự.");

    await tx(db, async () => {
      const maxOrderRow = await one<{ m: number | null }>(db, `SELECT MAX(sort_order) AS m FROM faqs WHERE project_id = ?`, projectId);
      const maxOrder = maxOrderRow?.m === null || maxOrderRow?.m === undefined ? -1 : Number(maxOrderRow.m);
      await insert(db, "faqs", {
        id: newId(),
        project_id: projectId,
        question,
        answer,
        sort_order: maxOrder + 1,
        created_by: v.id,
        updated_by: v.id,
      });
      if (commentId) {
        const now = nowIso();
        await run(
          db,
          `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
          v.id,
          now,
          commentId,
        );
      }
    });

    return { ok: true, slug: p.slug, message: "Đã đưa câu hỏi vào mục FAQ công khai!" };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 6. AI Dự đoán (ai.run) ───────────────────────── */

export async function runAiPrediction(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "ai.run");
    const res = await runPrediction(db, projectId, v.id);
    return { ok: true, slug: p.slug, prediction: res, message: `AI cập nhật: khả năng thành công ${Math.round(res.probability * 100)}%` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 7. Nhóm Collaborator (member.manage) ───────────────────────── */

export async function inviteCollaborator(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "member.manage");
    const email = strVal(bodyIn, "email").toLowerCase();
    const message = strVal(bodyIn, "message").slice(0, 300);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("Email không hợp lệ.");

    const invitee = await tx(db, async () => {
      const existingMember = await one<{ role_code: string }>(
        db,
        `SELECT pm.role_code FROM project_members pm JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = ? AND LOWER(u.email) = LOWER(?) AND pm.status = 'ACTIVE'`,
        projectId,
        email,
      );
      if (existingMember) throw new DomainError("Người dùng này đã là thành viên của dự án.");

      const u = await one<{ id: string; display_name: string }>(db, `SELECT id, display_name FROM users WHERE LOWER(email) = LOWER(?)`, email);
      if (u && (await one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, u.id))) {
        throw new DomainError("Không thể mời tài khoản Quản trị viên làm Collaborator.");
      }

      const now = nowIso();
      await run(
        db,
        `UPDATE project_invitations SET status = 'EXPIRED', responded_at = ?
         WHERE project_id = ? AND LOWER(email) = LOWER(?) AND status = 'PENDING' AND expires_at <= ?`,
        now,
        projectId,
        email,
        now,
      );

      const pending = await one(
        db,
        `SELECT 1 FROM project_invitations WHERE project_id = ? AND LOWER(email) = LOWER(?) AND status = 'PENDING'`,
        projectId,
        email,
      );
      if (pending) throw new DomainError("Email này đã có lời mời đang chờ phản hồi.");

      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + 7 * DAY_MS).toISOString();
      await insert(db, "project_invitations", {
        id: newId(),
        project_id: projectId,
        email,
        invitee_id: u?.id ?? null,
        invited_by: v.id,
        role_code: "COLLABORATOR",
        message,
        status: "PENDING",
        token,
        expires_at: expiresAt,
        responded_at: null,
      });

      if (u) {
        await notify(db, {
          userId: u.id,
          type: "INVITATION",
          title: `Lời mời làm Collaborator: ${p.title}`,
          body: message || `${v.displayName} mời bạn đồng hành quản lý dự án.`,
          link: "/me",
          actorId: v.id,
          projectId,
        });
      }
      await audit(db, v.id, "member.invite", "project", projectId, email);
      return u;
    });

    return {
      ok: true,
      slug: p.slug,
      message: invitee ? `Đã gửi lời mời tới ${invitee.display_name} (${email}).` : `Đã tạo lời mời 7 ngày cho ${email}.`,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function revokeInvitation(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "member.manage");
    const invId = strVal(bodyIn, "invitation_id");
    const res = await run(
      db,
      `UPDATE project_invitations SET status = 'REVOKED', responded_at = ? WHERE id = ? AND project_id = ? AND status = 'PENDING'`,
      nowIso(),
      invId,
      projectId,
    );
    if (res.changes === 0) throw new DomainError("Lời mời không còn ở trạng thái chờ.");
    return { ok: true, slug: p.slug, message: "Đã thu hồi lời mời." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function removeCollaborator(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "member.manage");
    const userId = strVal(bodyIn, "user_id");

    await tx(db, async () => {
      const m = await one<{ role_code: string; status: string }>(
        db,
        `SELECT role_code, status FROM project_members WHERE project_id = ? AND user_id = ?`,
        projectId,
        userId,
      );
      if (!m || m.status !== "ACTIVE") throw new DomainError("Thành viên không còn hoạt động.", "NOT_FOUND");
      if (m.role_code === "CREATOR") throw new DomainError("Không thể gỡ Creator khỏi dự án.");
      await run(
        db,
        `UPDATE project_members SET status = 'REMOVED', removed_at = ? WHERE project_id = ? AND user_id = ? AND role_code = 'COLLABORATOR'`,
        nowIso(),
        projectId,
        userId,
      );
      await audit(db, v.id, "member.remove", "project", projectId, userId);
    });

    return { ok: true, slug: p.slug, message: "Đã gỡ Collaborator khỏi dự án." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 8. Vòng đời & Giao quà ───────────────────────── */

export async function saveFundingSchedule(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "project.schedule");
    const goalAmount = intVal(bodyIn, "goal_amount", Number(p.goal_amount));
    const durationDays = intVal(bodyIn, "duration_days", Number(p.duration_days));
    const startAt = parseVnDatetimeLocal(strVal(bodyIn, "start_at"));
    const previewPublic = boolVal(bodyIn, "is_preview_public");

    if (goalAmount < 1_000_000 || goalAmount > 2_000_000_000) {
      throw new DomainError("Mục tiêu phải từ 1.000.000đ đến 2.000.000.000đ.");
    }
    if (durationDays < 1 || durationDays > 60) {
      throw new DomainError("Thời lượng gọi vốn phải từ 1 đến 60 ngày.");
    }

    await tx(db, async () => {
      if (goalAmount !== Number(p.goal_amount) || durationDays !== Number(p.duration_days)) {
        if (!(await canProject(db, v, projectId, "project.edit"))) {
          throw new DomainError(LOCK_REASON["project.edit"], "FORBIDDEN");
        }
        await run(
          db,
          `UPDATE projects SET goal_amount = ?, duration_days = ?, updated_at = ? WHERE id = ?`,
          goalAmount,
          durationDays,
          nowIso(),
          projectId,
        );
      }
      await setSchedule(db, v.id, projectId, startAt, previewPublic);
    });

    const nextStep = strVal(bodyIn, "next_step");
    return {
      ok: true,
      slug: p.slug,
      message: "Đã lưu mục tiêu và lịch mở chiến dịch!",
      ...(nextStep ? { redirect: `/studio/${p.slug}/setup?step=${nextStep}` } : {}),
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function submitForReviewOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "project.submit");
    await submitForReview(db, v.id, projectId);
    const toStudio = strVal(bodyIn, "redirect_to_studio") === "1";
    return {
      ok: true,
      slug: p.slug,
      message: "Đã gửi dự án thành công! Quản trị viên sẽ sớm kiểm duyệt.",
      celebrate: true,
      ...(toStudio ? { redirect: `/studio/${p.slug}` } : {}),
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function withdrawSubmissionOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "project.submit");
    await withdrawSubmission(db, v.id, projectId);
    return { ok: true, slug: p.slug, message: "Đã rút lại dự án về trạng thái Bản nháp." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function setScheduleOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "project.schedule");
    const startAt = parseVnDatetimeLocal(strVal(bodyIn, "start_at"));
    const previewPublic = boolVal(bodyIn, "is_preview_public");
    await setSchedule(db, v.id, projectId, startAt, previewPublic);
    return { ok: true, slug: p.slug, message: "Đã lưu lịch mở và chế độ xem trước." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function launchNowOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "project.schedule");
    await launchNow(db, v.id, projectId);
    return { ok: true, slug: p.slug, message: "Chiến dịch đã chính thức mở góp vốn!", celebrate: true };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function cancelProjectOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "project.cancel");
    const reason = strVal(bodyIn, "reason") || "Creator huỷ dự án";
    await cancelProject(db, v.id, projectId, reason);
    return { ok: true, slug: p.slug, message: "Đã huỷ dự án." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteDraftOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "project.cancel");
    await deleteDraft(db, v.id, projectId);
    return { ok: true, slug: p.slug, message: "Đã xoá bản nháp dự án.", redirect: "/studio" };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveCompletedDisplay(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { db, p } = await requireActor(viewer, projectId, "project.completion");
    const mode = strVal(bodyIn, "completed_display") || "SUMMARY";
    const msg = strVal(bodyIn, "completed_message") || null;
    if (!["SUMMARY", "UPDATES", "THANK_YOU"].includes(mode)) {
      throw new DomainError("Chế độ hiển thị không hợp lệ.");
    }
    await run(
      db,
      `UPDATE projects SET completed_display = ?, completed_message = ?, updated_at = ? WHERE id = ?`,
      mode,
      msg,
      nowIso(),
      projectId,
    );
    return { ok: true, slug: p.slug, message: "Đã lưu tuỳ chọn hiển thị sau hoàn thành." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function advanceFulfillmentOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "fulfillment.manage");
    const to = strVal(bodyIn, "to");
    if (to !== "FULFILLING" && to !== "COMPLETED") throw new DomainError("Trạng thái giao quà không hợp lệ.");
    await advanceFulfillment(db, v.id, projectId, to);
    return {
      ok: true,
      slug: p.slug,
      message: to === "FULFILLING" ? "Đã tạo danh sách giao quà cho các đơn vật lý!" : "Chúc mừng! Dự án đã hoàn thành.",
      celebrate: to === "COMPLETED",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function updateShipmentOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "fulfillment.manage");
    const pledgeId = strVal(bodyIn, "pledge_id");
    const status = strVal(bodyIn, "status");
    const carrier = strVal(bodyIn, "carrier") || undefined;
    const tracking = strVal(bodyIn, "tracking_code") || undefined;

    if (status !== "PREPARING" && status !== "SHIPPED" && status !== "DELIVERED") {
      throw new DomainError("Trạng thái vận chuyển không hợp lệ.");
    }
    const belongs = await one(db, `SELECT 1 FROM pledges WHERE id = ? AND project_id = ?`, pledgeId, projectId);
    if (!belongs) throw new DomainError("Không tìm thấy đơn giao hàng thuộc dự án này.", "NOT_FOUND");

    await updateShipment(db, v.id, pledgeId, status, carrier, tracking);
    return { ok: true, slug: p.slug, message: "Đã cập nhật đơn giao quà." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function bulkShipOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  try {
    const projectId = strVal(bodyIn, "project_id");
    const { v, db, p } = await requireActor(viewer, projectId, "fulfillment.manage");
    const to = strVal(bodyIn, "to") === "DELIVERED" ? "DELIVERED" : "SHIPPED";
    const carrier = strVal(bodyIn, "carrier") || undefined;

    const updated = await tx(db, async () => {
      const targetStatuses = to === "SHIPPED" ? `('PREPARING')` : `('PREPARING', 'SHIPPED')`;
      const rows = await all<{ pledge_id: string; tracking_code: string | null }>(
        db,
        `SELECT s.pledge_id, s.tracking_code
         FROM shipments s JOIN pledges pl ON pl.id = s.pledge_id
         WHERE pl.project_id = ? AND s.status IN ${targetStatuses}`,
        projectId,
      );
      if (rows.length === 0) throw new DomainError("Không có đơn nào phù hợp để cập nhật hàng loạt.");
      for (const row of rows) {
        await updateShipment(db, v.id, row.pledge_id, to, carrier, row.tracking_code ?? undefined);
      }
      return rows.length;
    });

    return {
      ok: true,
      slug: p.slug,
      message: `Đã chuyển ${updated} đơn sang trạng thái ${to === "DELIVERED" ? "Đã giao" : "Đang giao"}.`,
      celebrate: to === "DELIVERED",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}
