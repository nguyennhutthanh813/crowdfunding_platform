"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { audit, DomainError, humanizeError, insert, newId, notify, nowIso, one, all, run, statusHistory, tx } from "../db/helpers";
import { getViewer } from "../auth/session";
import { canProject, hasSystemPerm } from "../rbac/rbac";
import {
  advanceFulfillment,
  cancelProject,
  deleteDraft,
  launchNow,
  setSchedule,
  submitForReview,
  updateShipment,
  withdrawSubmission,
} from "../services/lifecycle";
import { runPrediction } from "../services/ai/run";
import { bumpDailyStats } from "../services/stats";
import { slugify } from "@/lib/utils";
import { LOCK_REASON } from "@/components/studio/meta";
import type { ActionResult } from "@/components/ui/action-form";

const DAY_MS = 86_400_000;

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function int(form: FormData, key: string, fallback = 0) {
  const raw = str(form, key);
  if (!raw) return fallback;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? n : fallback;
}

function bool(form: FormData, key: string) {
  const vals = form.getAll(key).map(String);
  return vals.includes("1") || vals.includes("on") || vals.includes("true");
}

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

async function requireActor(projectId: string, perm: string) {
  const v = await getViewer();
  if (!v) throw new DomainError("Vui lòng đăng nhập để tiếp tục.", "FORBIDDEN");
  const db = getDb();
  if (!canProject(db, v, projectId, perm)) {
    throw new DomainError(LOCK_REASON[perm] ?? "Bạn không có quyền thực hiện thao tác này.", "FORBIDDEN");
  }
  const p = one<{
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

function revalidateProject(slug: string) {
  revalidatePath("/studio");
  revalidatePath(`/studio/${slug}`);
  revalidatePath(`/studio/${slug}/setup`);
  revalidatePath(`/p/${slug}`);
}

function notifyUpdatePublished(db: ReturnType<typeof getDb>, p: { id: string; slug: string; title: string }, updateTitle: string, actorId: string) {
  const recipients = all<{ user_id: string }>(
    db,
    `SELECT DISTINCT backer_id AS user_id FROM pledges WHERE project_id = ? AND status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED')
     UNION
     SELECT user_id FROM saved_projects WHERE project_id = ?`,
    p.id,
    p.id,
  );
  for (const r of recipients) {
    if (r.user_id === actorId) continue;
    notify(db, {
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

export async function createDraftProjectAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const v = await getViewer();
    if (!v) throw new DomainError("Vui lòng đăng nhập để tạo dự án.", "FORBIDDEN");
    if (!hasSystemPerm(v, "project.create")) {
      throw new DomainError("Tài khoản này không có quyền tạo dự án mới.", "FORBIDDEN");
    }
    const db = getDb();
    const title = str(form, "title");
    const categoryId = str(form, "category_id");
    const blurb = str(form, "blurb");
    const coverUrl = str(form, "cover_url") || null;
    const videoUrl = str(form, "video_url") || null;
    const goalAmount = int(form, "goal_amount", 50_000_000);
    const durationDays = int(form, "duration_days", 30);

    if (title.length < 5 || title.length > 80) throw new DomainError("Tên dự án phải từ 5 đến 80 ký tự.");
    if (blurb.length > 200) throw new DomainError("Mô tả ngắn tối đa 200 ký tự.");
    if (!categoryId || !one(db, `SELECT 1 FROM categories WHERE id = ? AND is_active = 1`, categoryId)) {
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
    while (one(db, `SELECT 1 FROM projects WHERE slug = ?`, slug)) {
      slug = `${baseSlug.slice(0, 52)}-${randomBytes(3).toString("hex")}`;
    }

    const id = newId();
    tx(db, () => {
      insert(db, "projects", {
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
      statusHistory(db, id, null, "DRAFT", v.id, "Tạo bản nháp dự án");
      audit(db, v.id, "project.create", "project", id, slug);
    });

    revalidatePath("/studio");
    return { ok: true, message: "Đã tạo bản nháp dự án!", redirect: `/studio/${slug}/setup?step=2` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function updateBasicsAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "project.edit");

    const title = str(form, "title");
    const categoryId = str(form, "category_id");
    const blurb = str(form, "blurb");
    const coverUrl = str(form, "cover_url") || null;
    const videoUrl = str(form, "video_url") || null;

    if (title.length < 5 || title.length > 80) throw new DomainError("Tên dự án phải từ 5 đến 80 ký tự.");
    if (blurb.length > 200) throw new DomainError("Mô tả ngắn tối đa 200 ký tự.");
    if (!categoryId || !one(db, `SELECT 1 FROM categories WHERE id = ? AND is_active = 1`, categoryId)) {
      throw new DomainError("Vui lòng chọn thể loại hợp lệ.");
    }

    const hasGoal = form.has("goal_amount");
    const hasDuration = form.has("duration_days");
    const goalAmount = hasGoal ? int(form, "goal_amount", p.goal_amount) : p.goal_amount;
    const durationDays = hasDuration ? int(form, "duration_days", p.duration_days) : p.duration_days;

    if (goalAmount < 1_000_000 || goalAmount > 2_000_000_000) {
      throw new DomainError("Mục tiêu phải từ 1.000.000đ đến 2.000.000.000đ.");
    }
    if (durationDays < 1 || durationDays > 60) {
      throw new DomainError("Thời lượng gọi vốn phải từ 1 đến 60 ngày.");
    }

    run(
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

    revalidateProject(p.slug);
    const nextStep = str(form, "next_step");
    return {
      ok: true,
      message: "Đã lưu thông tin cơ bản.",
      ...(nextStep ? { redirect: `/studio/${p.slug}/setup?step=${nextStep}` } : {}),
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveSectionAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "project.edit");

    const sectionId = str(form, "section_id");
    const kind = str(form, "kind").toUpperCase() || "TEXT";
    const heading = str(form, "heading");
    const body = String(form.get("body") ?? "");
    const mediaUrl = str(form, "media_url") || null;

    if (!["TEXT", "IMAGE", "VIDEO"].includes(kind)) throw new DomainError("Loại section không hợp lệ.");
    if (kind === "TEXT" && body.trim().length === 0) {
      throw new DomainError("Nội dung đoạn văn không được để trống.");
    }
    if (kind !== "TEXT" && !mediaUrl) {
      throw new DomainError(kind === "IMAGE" ? "Vui lòng chọn hoặc nhập URL hình ảnh." : "Vui lòng nhập URL video.");
    }

    tx(db, () => {
      if (sectionId) {
        const exists = one(db, `SELECT id FROM project_sections WHERE id = ? AND project_id = ?`, sectionId, projectId);
        if (!exists) throw new DomainError("Không tìm thấy section cần sửa.", "NOT_FOUND");
        run(
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
        const maxOrder = one<{ m: number | null }>(db, `SELECT MAX(sort_order) m FROM project_sections WHERE project_id = ?`, projectId)?.m ?? -1;
        insert(db, "project_sections", {
          id: newId(),
          project_id: projectId,
          kind,
          heading,
          body,
          media_url: kind === "TEXT" ? null : mediaUrl,
          sort_order: Math.max(0, maxOrder + 1),
        });
      }
      run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    revalidateProject(p.slug);
    return { ok: true, message: sectionId ? "Đã cập nhật mục nội dung." : "Đã thêm mục nội dung mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function moveSectionAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "project.edit");
    const sectionId = str(form, "section_id");
    const dir = str(form, "dir") === "down" ? "down" : "up";

    tx(db, () => {
      const rows = all<{ id: string; sort_order: number }>(
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
      run(db, `UPDATE project_sections SET sort_order = -1 WHERE id = ?`, a.id);
      run(db, `UPDATE project_sections SET sort_order = ? WHERE id = ?`, a.sort_order, b.id);
      run(db, `UPDATE project_sections SET sort_order = ? WHERE id = ?`, b.sort_order, a.id);
      run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    revalidateProject(p.slug);
    return { ok: true, message: "Đã đổi vị trí mục nội dung." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteSectionAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "project.edit");
    const sectionId = str(form, "section_id");

    tx(db, () => {
      const res = run(db, `DELETE FROM project_sections WHERE id = ? AND project_id = ?`, sectionId, projectId);
      if (res.changes === 0) throw new DomainError("Không tìm thấy section.", "NOT_FOUND");
      const rest = all<{ id: string }>(db, `SELECT id FROM project_sections WHERE project_id = ? ORDER BY sort_order`, projectId);
      rest.forEach((r, i) => {
        run(db, `UPDATE project_sections SET sort_order = ? WHERE id = ?`, i, r.id);
      });
      run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    revalidateProject(p.slug);
    return { ok: true, message: "Đã xoá mục nội dung." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveRisksAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "project.edit");
    const risks = str(form, "risks");
    run(db, `UPDATE projects SET risks = ?, updated_at = ? WHERE id = ?`, risks, nowIso(), projectId);
    revalidateProject(p.slug);
    return { ok: true, message: "Đã lưu rủi ro & phương án dự phòng." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 2. Phần quà & add-on (reward.manage) ───────────────────────── */

function parseTierItems(form: FormData): { name: string; quantity: number }[] {
  const jsonRaw = str(form, "items_json");
  if (jsonRaw) {
    const parsed = JSON.parse(jsonRaw) as { name?: string; quantity?: number }[];
    return parsed
      .map((i) => ({ name: String(i.name ?? "").trim(), quantity: Math.max(1, Math.round(Number(i.quantity ?? 1))) }))
      .filter((i) => i.name.length > 0);
  }
  const names = form.getAll("item_name").map((x) => String(x).trim());
  const qtys = form.getAll("item_qty").map((x) => Math.max(1, Math.round(Number(x) || 1)));
  return names
    .map((name, idx) => ({ name, quantity: qtys[idx] ?? 1 }))
    .filter((i) => i.name.length > 0);
}

export async function saveTierAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "reward.manage");

    const tierId = str(form, "tier_id");
    const title = str(form, "title");
    const description = str(form, "description");
    const amount = int(form, "amount", 0);
    const estimatedDelivery = str(form, "estimated_delivery") || new Date(Date.now() + 90 * DAY_MS).toISOString().slice(0, 7);
    const limitRaw = str(form, "quantity_limit");
    const quantityLimit = limitRaw ? int(form, "quantity_limit", 0) : null;
    const shipsPhysical = bool(form, "ships_physical") ? 1 : 0;
    const shippingFee = shipsPhysical ? Math.max(0, int(form, "shipping_fee", 0)) : 0;
    const isActive = form.has("is_active") ? (bool(form, "is_active") ? 1 : 0) : 1;
    const items = parseTierItems(form);
    const addOnIds = form.getAll("add_on_ids").map(String).filter(Boolean);
    const syncAddOns = form.get("sync_add_ons") === "1";

    if (title.length < 2) throw new DomainError("Tên mức quà phải có ít nhất 2 ký tự.");
    if (amount < 10_000) throw new DomainError("Số tiền mức quà tối thiểu 10.000đ.");
    if (quantityLimit !== null && quantityLimit <= 0) throw new DomainError("Giới hạn suất phải lớn hơn 0.");

    tx(db, () => {
      let targetId = tierId;
      if (tierId) {
        const cur = one<{ id: string; amount: number; claimed_count: number }>(
          db,
          `SELECT id, amount, claimed_count FROM reward_tiers WHERE id = ? AND project_id = ?`,
          tierId,
          projectId,
        );
        if (!cur) throw new DomainError("Không tìm thấy mức quà.", "NOT_FOUND");
        if (cur.claimed_count > 0 && amount !== cur.amount) {
          throw new DomainError("Mức quà đã có người chọn nên không thể thay đổi giá.");
        }
        if (quantityLimit !== null && quantityLimit < cur.claimed_count) {
          throw new DomainError(`Giới hạn suất phải từ ${cur.claimed_count} trở lên.`);
        }
        run(
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
        const maxOrder = one<{ m: number | null }>(db, `SELECT MAX(sort_order) m FROM reward_tiers WHERE project_id = ?`, projectId)?.m ?? -1;
        insert(db, "reward_tiers", {
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

      run(db, `DELETE FROM reward_items WHERE tier_id = ?`, targetId);
      items.forEach((it, idx) => {
        insert(db, "reward_items", {
          id: newId(),
          tier_id: targetId,
          name: it.name,
          quantity: it.quantity,
          sort_order: idx,
        });
      });

      if (syncAddOns) {
        run(db, `DELETE FROM reward_tier_add_ons WHERE tier_id = ? AND project_id = ?`, targetId, projectId);
        const validAddOns = new Set(all<{ id: string }>(db, `SELECT id FROM add_ons WHERE project_id = ?`, projectId).map((a) => a.id));
        for (const aid of new Set(addOnIds)) {
          if (validAddOns.has(aid)) {
            insert(db, "reward_tier_add_ons", { tier_id: targetId, add_on_id: aid, project_id: projectId });
          }
        }
      }
      run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    revalidateProject(p.slug);
    return { ok: true, message: tierId ? "Đã cập nhật mức quà." : "Đã thêm mức quà mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function toggleTierActiveAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "reward.manage");
    const tierId = str(form, "tier_id");
    const res = run(
      db,
      `UPDATE reward_tiers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ? AND project_id = ?`,
      tierId,
      projectId,
    );
    if (res.changes === 0) throw new DomainError("Không tìm thấy mức quà.", "NOT_FOUND");
    revalidateProject(p.slug);
    return { ok: true, message: "Đã đổi trạng thái mức quà." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteTierAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "reward.manage");
    const tierId = str(form, "tier_id");
    const res = run(db, `DELETE FROM reward_tiers WHERE id = ? AND project_id = ?`, tierId, projectId);
    if (res.changes === 0) throw new DomainError("Không tìm thấy mức quà.", "NOT_FOUND");
    revalidateProject(p.slug);
    return { ok: true, message: "Đã xoá mức quà." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveAddOnAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "reward.manage");

    const addOnId = str(form, "add_on_id");
    const title = str(form, "title");
    const description = str(form, "description");
    const price = int(form, "price", 0);
    const stockRaw = str(form, "stock");
    const stock = stockRaw ? int(form, "stock", 0) : null;
    const maxPerPledge = int(form, "max_per_pledge", 5);
    const isActive = form.has("is_active") ? (bool(form, "is_active") ? 1 : 0) : 1;
    const tierIds = form.getAll("tier_ids").map(String).filter(Boolean);
    const syncTiers = form.get("sync_tiers") === "1";

    if (title.length < 2) throw new DomainError("Tên add-on phải có ít nhất 2 ký tự.");
    if (price <= 0) throw new DomainError("Giá add-on phải lớn hơn 0đ.");
    if (stock !== null && stock < 0) throw new DomainError("Tồn kho không hợp lệ.");
    if (maxPerPledge < 1 || maxPerPledge > 99) throw new DomainError("Số lượng tối đa mỗi đơn từ 1 đến 99.");

    tx(db, () => {
      let targetId = addOnId;
      if (addOnId) {
        const cur = one<{ id: string; sold_count: number }>(
          db,
          `SELECT id, sold_count FROM add_ons WHERE id = ? AND project_id = ?`,
          addOnId,
          projectId,
        );
        if (!cur) throw new DomainError("Không tìm thấy add-on.", "NOT_FOUND");
        if (stock !== null && stock < cur.sold_count) {
          throw new DomainError(`Tồn kho phải lớn hơn hoặc bằng số đã bán (${cur.sold_count}).`);
        }
        run(
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
        insert(db, "add_ons", {
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
        run(db, `DELETE FROM reward_tier_add_ons WHERE add_on_id = ? AND project_id = ?`, targetId, projectId);
        const validTiers = new Set(all<{ id: string }>(db, `SELECT id FROM reward_tiers WHERE project_id = ?`, projectId).map((t) => t.id));
        for (const tid of new Set(tierIds)) {
          if (validTiers.has(tid)) {
            insert(db, "reward_tier_add_ons", { tier_id: tid, add_on_id: targetId, project_id: projectId });
          }
        }
      }
      run(db, `UPDATE projects SET updated_at = ? WHERE id = ?`, nowIso(), projectId);
    });

    revalidateProject(p.slug);
    return { ok: true, message: addOnId ? "Đã cập nhật add-on." : "Đã thêm add-on mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteAddOnAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "reward.manage");
    const addOnId = str(form, "add_on_id");
    if (one(db, `SELECT 1 FROM pledge_add_ons WHERE add_on_id = ? LIMIT 1`, addOnId)) {
      throw new DomainError("Add-on này đã có người đặt mua nên không thể xoá — hãy tắt kích hoạt thay thế.");
    }
    const res = run(db, `DELETE FROM add_ons WHERE id = ? AND project_id = ?`, addOnId, projectId);
    if (res.changes === 0) throw new DomainError("Không tìm thấy add-on.", "NOT_FOUND");
    revalidateProject(p.slug);
    return { ok: true, message: "Đã xoá add-on." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 3. Updates (update.draft / update.publish) ───────────────────────── */

export async function saveUpdateAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const wantPublish = str(form, "publish") === "1";
    const { v, db, p } = await requireActor(projectId, wantPublish ? "update.publish" : "update.draft");

    const updateId = str(form, "update_id");
    const title = str(form, "title");
    const body = str(form, "body");
    const backersOnly = bool(form, "backers_only") ? 1 : 0;

    if (title.length < 3) throw new DomainError("Tiêu đề Update phải có ít nhất 3 ký tự.");
    if (body.length < 10) throw new DomainError("Nội dung Update phải có ít nhất 10 ký tự.");

    const now = nowIso();
    tx(db, () => {
      if (updateId) {
        const cur = one<{ id: string; status: "DRAFT" | "PUBLISHED" }>(
          db,
          `SELECT id, status FROM project_updates WHERE id = ? AND project_id = ?`,
          updateId,
          projectId,
        );
        if (!cur) throw new DomainError("Không tìm thấy bản cập nhật.", "NOT_FOUND");
        if (cur.status === "PUBLISHED" && !canProject(db, v, projectId, "update.publish")) {
          throw new DomainError(LOCK_REASON["update.publish"], "FORBIDDEN");
        }
        if (cur.status === "DRAFT" && wantPublish) {
          run(
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
          notifyUpdatePublished(db, p, title, v.id);
        } else {
          run(
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
        insert(db, "project_updates", {
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
        notifyUpdatePublished(db, p, title, v.id);
      } else {
        insert(db, "project_updates", {
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

    revalidateProject(p.slug);
    return {
      ok: true,
      message: wantPublish ? "Đã đăng Update công khai tới cộng đồng!" : "Đã lưu bản nháp Update.",
      celebrate: wantPublish,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function publishUpdateAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "update.publish");
    const updateId = str(form, "update_id");

    tx(db, () => {
      const cur = one<{ id: string; title: string; status: string }>(
        db,
        `SELECT id, title, status FROM project_updates WHERE id = ? AND project_id = ?`,
        updateId,
        projectId,
      );
      if (!cur) throw new DomainError("Không tìm thấy bản nháp Update.", "NOT_FOUND");
      if (cur.status === "PUBLISHED") throw new DomainError("Update này đã được đăng trước đó.");
      const now = nowIso();
      run(
        db,
        `UPDATE project_updates SET status = 'PUBLISHED', published_by = ?, published_at = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
        v.id,
        now,
        now,
        updateId,
        projectId,
      );
      notifyUpdatePublished(db, p, cur.title, v.id);
    });

    revalidateProject(p.slug);
    return { ok: true, message: "Đã đăng Update công khai và gửi thông báo tới backer!", celebrate: true };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteUpdateDraftAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "update.draft");
    const updateId = str(form, "update_id");
    const cur = one<{ status: string }>(db, `SELECT status FROM project_updates WHERE id = ? AND project_id = ?`, updateId, projectId);
    if (!cur) throw new DomainError("Không tìm thấy bản nháp.", "NOT_FOUND");
    if (cur.status !== "DRAFT") throw new DomainError("Chỉ có thể xoá Update ở trạng thái bản nháp.");
    run(db, `DELETE FROM project_updates WHERE id = ? AND project_id = ? AND status = 'DRAFT'`, updateId, projectId);
    revalidateProject(p.slug);
    return { ok: true, message: "Đã xoá bản nháp Update." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 4. FAQ (faq.manage) ───────────────────────── */

export async function saveFaqAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "faq.manage");
    const faqId = str(form, "faq_id");
    const question = str(form, "question");
    const answer = str(form, "answer");

    if (question.length < 5) throw new DomainError("Câu hỏi phải có ít nhất 5 ký tự.");
    if (answer.length < 2) throw new DomainError("Câu trả lời phải có ít nhất 2 ký tự.");

    if (faqId) {
      const res = run(
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
      const maxOrder = one<{ m: number | null }>(db, `SELECT MAX(sort_order) m FROM faqs WHERE project_id = ?`, projectId)?.m ?? -1;
      insert(db, "faqs", {
        id: newId(),
        project_id: projectId,
        question,
        answer,
        sort_order: maxOrder + 1,
        created_by: v.id,
        updated_by: v.id,
      });
    }

    revalidateProject(p.slug);
    return { ok: true, message: faqId ? "Đã cập nhật FAQ." : "Đã thêm câu hỏi FAQ mới." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteFaqAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "faq.manage");
    const faqId = str(form, "faq_id");
    const res = run(db, `DELETE FROM faqs WHERE id = ? AND project_id = ?`, faqId, projectId);
    if (res.changes === 0) throw new DomainError("Không tìm thấy câu hỏi FAQ.", "NOT_FOUND");
    revalidateProject(p.slug);
    return { ok: true, message: "Đã xoá FAQ." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function moveFaqAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "faq.manage");
    const faqId = str(form, "faq_id");
    const dir = str(form, "dir") === "down" ? "down" : "up";

    tx(db, () => {
      const rows = all<{ id: string }>(db, `SELECT id FROM faqs WHERE project_id = ? ORDER BY sort_order, created_at`, projectId);
      const idx = rows.findIndex((r) => r.id === faqId);
      if (idx === -1) throw new DomainError("Không tìm thấy FAQ.", "NOT_FOUND");
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= rows.length) return;
      [rows[idx], rows[targetIdx]] = [rows[targetIdx], rows[idx]];
      rows.forEach((r, i) => {
        run(db, `UPDATE faqs SET sort_order = ? WHERE id = ?`, i, r.id);
      });
    });

    revalidateProject(p.slug);
    return { ok: true, message: "Đã đổi thứ tự FAQ." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 5. AI Inbox bình luận ───────────────────────── */

export async function replyInboxCommentAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "comment.reply");
    const commentId = str(form, "comment_id");
    const body = str(form, "body");

    if (body.length < 1 || body.length > 2000) throw new DomainError("Nội dung trả lời từ 1 đến 2000 ký tự.");

    tx(db, () => {
      const parent = one<{ id: string; author_id: string; parent_id: string | null; status: string }>(
        db,
        `SELECT id, author_id, parent_id, status FROM comments WHERE id = ? AND project_id = ?`,
        commentId,
        projectId,
      );
      if (!parent || parent.status === "DELETED") throw new DomainError("Không tìm thấy bình luận.", "NOT_FOUND");
      if (parent.parent_id) throw new DomainError("Chỉ trả lời tối đa 2 cấp.");

      insert(db, "comments", {
        id: newId(),
        project_id: projectId,
        parent_id: commentId,
        author_id: v.id,
        body,
        status: "VISIBLE",
      });
      bumpDailyStats(db, projectId, { comments: 1 });

      const now = nowIso();
      run(
        db,
        `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
        v.id,
        now,
        commentId,
      );

      if (parent.author_id !== v.id) {
        notify(db, {
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

    revalidateProject(p.slug);
    return { ok: true, message: "Đã gửi câu trả lời tới cộng đồng!" };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function markCommentHandledAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "comment.reply");
    const commentId = str(form, "comment_id");
    const handled = str(form, "handled") !== "0";

    const exists = one(db, `SELECT 1 FROM comments WHERE id = ? AND project_id = ?`, commentId, projectId);
    if (!exists) throw new DomainError("Không tìm thấy bình luận.", "NOT_FOUND");

    if (handled) {
      run(db, `UPDATE comment_analyses SET handled_by = ?, handled_at = ? WHERE comment_id = ?`, v.id, nowIso(), commentId);
    } else {
      run(db, `UPDATE comment_analyses SET handled_by = NULL, handled_at = NULL WHERE comment_id = ?`, commentId);
    }

    revalidateProject(p.slug);
    return { ok: true, message: handled ? "Đã đánh dấu đã xử lý." : "Đã mở lại trạng thái cần xử lý." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function moderateStudioCommentAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "comment.moderate");
    const commentId = str(form, "comment_id");
    const nextStatus = str(form, "status") || "HIDDEN";
    const reason = str(form, "reason") || "Ẩn từ Studio";

    if (!["VISIBLE", "HIDDEN", "DELETED"].includes(nextStatus)) throw new DomainError("Trạng thái không hợp lệ.");

    tx(db, () => {
      const exists = one(db, `SELECT 1 FROM comments WHERE id = ? AND project_id = ?`, commentId, projectId);
      if (!exists) throw new DomainError("Không tìm thấy bình luận.", "NOT_FOUND");
      const now = nowIso();
      if (nextStatus === "VISIBLE") {
        run(
          db,
          `UPDATE comments SET status = 'VISIBLE', moderated_by = NULL, moderated_reason = NULL, updated_at = ? WHERE id = ? AND project_id = ?`,
          now,
          commentId,
          projectId,
        );
      } else {
        run(
          db,
          `UPDATE comments SET status = ?, moderated_by = ?, moderated_reason = ?, updated_at = ? WHERE id = ? AND project_id = ?`,
          nextStatus,
          v.id,
          reason,
          now,
          commentId,
          projectId,
        );
        run(
          db,
          `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
          v.id,
          now,
          commentId,
        );
      }
      audit(db, v.id, `comment.${nextStatus.toLowerCase()}`, "comment", commentId, reason);
    });

    revalidateProject(p.slug);
    return { ok: true, message: nextStatus === "VISIBLE" ? "Đã hiện lại bình luận." : "Đã ẩn bình luận." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function promoteCommentToFaqAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "faq.manage");
    if (!canProject(db, v, projectId, "insight.view")) {
      throw new DomainError(LOCK_REASON["insight.view"], "FORBIDDEN");
    }
    const commentId = str(form, "comment_id");
    const question = str(form, "question");
    const answer = str(form, "answer");

    if (question.length < 5) throw new DomainError("Câu hỏi FAQ phải có ít nhất 5 ký tự.");
    if (answer.length < 2) throw new DomainError("Câu trả lời FAQ phải có ít nhất 2 ký tự.");

    tx(db, () => {
      const maxOrder = one<{ m: number | null }>(db, `SELECT MAX(sort_order) m FROM faqs WHERE project_id = ?`, projectId)?.m ?? -1;
      insert(db, "faqs", {
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
        run(
          db,
          `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
          v.id,
          now,
          commentId,
        );
      }
    });

    revalidateProject(p.slug);
    return { ok: true, message: "Đã đưa câu hỏi vào mục FAQ công khai!" };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 6. AI Dự đoán (ai.run) ───────────────────────── */

export async function runAiPredictionAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "ai.run");
    const res = runPrediction(db, projectId, v.id);
    revalidateProject(p.slug);
    return { ok: true, message: `AI cập nhật: khả năng thành công ${Math.round(res.probability * 100)}%` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 7. Nhóm Collaborator (member.manage) ───────────────────────── */

export async function inviteCollaboratorAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "member.manage");
    const email = str(form, "email").toLowerCase();
    const message = str(form, "message").slice(0, 300);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("Email không hợp lệ.");

    const invitee = tx(db, () => {
      const existingMember = one<{ role_code: string }>(
        db,
        `SELECT pm.role_code FROM project_members pm JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = ? AND lower(u.email) = lower(?) AND pm.status = 'ACTIVE'`,
        projectId,
        email,
      );
      if (existingMember) throw new DomainError("Người dùng này đã là thành viên của dự án.");

      const u = one<{ id: string; display_name: string }>(db, `SELECT id, display_name FROM users WHERE lower(email) = lower(?)`, email);
      if (u && one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, u.id)) {
        throw new DomainError("Không thể mời tài khoản Quản trị viên làm Collaborator.");
      }

      const now = nowIso();
      // Hết hạn các lời mời cũ quá hạn trước khi kiểm tra trùng
      run(
        db,
        `UPDATE project_invitations SET status = 'EXPIRED', responded_at = ?
         WHERE project_id = ? AND lower(email) = lower(?) AND status = 'PENDING' AND expires_at <= ?`,
        now,
        projectId,
        email,
        now,
      );

      const pending = one(
        db,
        `SELECT 1 FROM project_invitations WHERE project_id = ? AND lower(email) = lower(?) AND status = 'PENDING'`,
        projectId,
        email,
      );
      if (pending) throw new DomainError("Email này đã có lời mời đang chờ phản hồi.");

      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + 7 * DAY_MS).toISOString();
      insert(db, "project_invitations", {
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
        notify(db, {
          userId: u.id,
          type: "INVITATION",
          title: `Lời mời làm Collaborator: ${p.title}`,
          body: message || `${v.displayName} mời bạn đồng hành quản lý dự án.`,
          link: "/me",
          actorId: v.id,
          projectId,
        });
      }
      audit(db, v.id, "member.invite", "project", projectId, email);
      return u;
    });

    revalidateProject(p.slug);
    return {
      ok: true,
      message: invitee ? `Đã gửi lời mời tới ${invitee.display_name} (${email}).` : `Đã tạo lời mời 7 ngày cho ${email}.`,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function revokeInvitationAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "member.manage");
    const invId = str(form, "invitation_id");
    const res = run(
      db,
      `UPDATE project_invitations SET status = 'REVOKED', responded_at = ? WHERE id = ? AND project_id = ? AND status = 'PENDING'`,
      nowIso(),
      invId,
      projectId,
    );
    if (res.changes === 0) throw new DomainError("Lời mời không còn ở trạng thái chờ.");
    revalidateProject(p.slug);
    return { ok: true, message: "Đã thu hồi lời mời." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function removeCollaboratorAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "member.manage");
    const userId = str(form, "user_id");

    tx(db, () => {
      const m = one<{ role_code: string; status: string }>(
        db,
        `SELECT role_code, status FROM project_members WHERE project_id = ? AND user_id = ?`,
        projectId,
        userId,
      );
      if (!m || m.status !== "ACTIVE") throw new DomainError("Thành viên không còn hoạt động.", "NOT_FOUND");
      if (m.role_code === "CREATOR") throw new DomainError("Không thể gỡ Creator khỏi dự án.");
      run(
        db,
        `UPDATE project_members SET status = 'REMOVED', removed_at = ? WHERE project_id = ? AND user_id = ? AND role_code = 'COLLABORATOR'`,
        nowIso(),
        projectId,
        userId,
      );
      audit(db, v.id, "member.remove", "project", projectId, userId);
    });

    revalidateProject(p.slug);
    return { ok: true, message: "Đã gỡ Collaborator khỏi dự án." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/* ───────────────────────── 8. Vòng đời & Giao quà ───────────────────────── */

export async function saveFundingScheduleAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "project.schedule");
    const goalAmount = int(form, "goal_amount", p.goal_amount);
    const durationDays = int(form, "duration_days", p.duration_days);
    const startAt = parseVnDatetimeLocal(str(form, "start_at"));
    const previewPublic = bool(form, "is_preview_public");

    if (goalAmount < 1_000_000 || goalAmount > 2_000_000_000) {
      throw new DomainError("Mục tiêu phải từ 1.000.000đ đến 2.000.000.000đ.");
    }
    if (durationDays < 1 || durationDays > 60) {
      throw new DomainError("Thời lượng gọi vốn phải từ 1 đến 60 ngày.");
    }

    tx(db, () => {
      if (goalAmount !== p.goal_amount || durationDays !== p.duration_days) {
        if (!canProject(db, v, projectId, "project.edit")) {
          throw new DomainError(LOCK_REASON["project.edit"], "FORBIDDEN");
        }
        run(
          db,
          `UPDATE projects SET goal_amount = ?, duration_days = ?, updated_at = ? WHERE id = ?`,
          goalAmount,
          durationDays,
          nowIso(),
          projectId,
        );
      }
      setSchedule(db, v.id, projectId, startAt, previewPublic);
    });

    revalidateProject(p.slug);
    const nextStep = str(form, "next_step");
    return {
      ok: true,
      message: "Đã lưu mục tiêu và lịch mở chiến dịch!",
      ...(nextStep ? { redirect: `/studio/${p.slug}/setup?step=${nextStep}` } : {}),
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function submitForReviewAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "project.submit");
    submitForReview(db, v.id, projectId);
    revalidateProject(p.slug);
    const toStudio = str(form, "redirect_to_studio") === "1";
    return {
      ok: true,
      message: "Đã gửi dự án thành công! Quản trị viên sẽ sớm kiểm duyệt.",
      celebrate: true,
      ...(toStudio ? { redirect: `/studio/${p.slug}` } : {}),
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function withdrawSubmissionAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "project.submit");
    withdrawSubmission(db, v.id, projectId);
    revalidateProject(p.slug);
    return { ok: true, message: "Đã rút lại dự án về trạng thái Bản nháp." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function setScheduleAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "project.schedule");
    const startAt = parseVnDatetimeLocal(str(form, "start_at"));
    const previewPublic = bool(form, "is_preview_public");
    setSchedule(db, v.id, projectId, startAt, previewPublic);
    revalidateProject(p.slug);
    return { ok: true, message: "Đã lưu lịch mở và chế độ xem trước." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function launchNowAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "project.schedule");
    launchNow(db, v.id, projectId);
    revalidateProject(p.slug);
    return { ok: true, message: "Chiến dịch đã chính thức mở góp vốn!", celebrate: true };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function cancelProjectAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "project.cancel");
    const reason = str(form, "reason") || "Creator huỷ dự án";
    cancelProject(db, v.id, projectId, reason);
    revalidateProject(p.slug);
    return { ok: true, message: "Đã huỷ dự án." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function deleteDraftAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "project.cancel");
    deleteDraft(db, v.id, projectId);
    revalidatePath("/studio");
    revalidatePath(`/p/${p.slug}`);
    return { ok: true, message: "Đã xoá bản nháp dự án.", redirect: "/studio" };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveCompletedDisplayAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { db, p } = await requireActor(projectId, "project.completion");
    const mode = str(form, "completed_display") || "SUMMARY";
    const msg = str(form, "completed_message") || null;
    if (!["SUMMARY", "UPDATES", "THANK_YOU"].includes(mode)) {
      throw new DomainError("Chế độ hiển thị không hợp lệ.");
    }
    run(
      db,
      `UPDATE projects SET completed_display = ?, completed_message = ?, updated_at = ? WHERE id = ?`,
      mode,
      msg,
      nowIso(),
      projectId,
    );
    revalidateProject(p.slug);
    return { ok: true, message: "Đã lưu tuỳ chọn hiển thị sau hoàn thành." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function advanceFulfillmentAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "fulfillment.manage");
    const to = str(form, "to");
    if (to !== "FULFILLING" && to !== "COMPLETED") throw new DomainError("Trạng thái giao quà không hợp lệ.");
    advanceFulfillment(db, v.id, projectId, to);
    revalidateProject(p.slug);
    return {
      ok: true,
      message: to === "FULFILLING" ? "Đã tạo danh sách giao quà cho các đơn vật lý!" : "Chúc mừng! Dự án đã hoàn thành.",
      celebrate: to === "COMPLETED",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function updateShipmentAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "fulfillment.manage");
    const pledgeId = str(form, "pledge_id");
    const status = str(form, "status");
    const carrier = str(form, "carrier") || undefined;
    const tracking = str(form, "tracking_code") || undefined;

    if (status !== "PREPARING" && status !== "SHIPPED" && status !== "DELIVERED") {
      throw new DomainError("Trạng thái vận chuyển không hợp lệ.");
    }
    const belongs = one(db, `SELECT 1 FROM pledges WHERE id = ? AND project_id = ?`, pledgeId, projectId);
    if (!belongs) throw new DomainError("Không tìm thấy đơn giao hàng thuộc dự án này.", "NOT_FOUND");

    updateShipment(db, v.id, pledgeId, status, carrier, tracking);
    revalidateProject(p.slug);
    return { ok: true, message: "Đã cập nhật đơn giao quà." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function bulkShipAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const projectId = str(form, "project_id");
    const { v, db, p } = await requireActor(projectId, "fulfillment.manage");
    const to = str(form, "to") === "DELIVERED" ? "DELIVERED" : "SHIPPED";
    const carrier = str(form, "carrier") || undefined;

    const updated = tx(db, () => {
      const targetStatuses = to === "SHIPPED" ? `('PREPARING')` : `('PREPARING', 'SHIPPED')`;
      const rows = all<{ pledge_id: string; tracking_code: string | null }>(
        db,
        `SELECT s.pledge_id, s.tracking_code
         FROM shipments s JOIN pledges pl ON pl.id = s.pledge_id
         WHERE pl.project_id = ? AND s.status IN ${targetStatuses}`,
        projectId,
      );
      if (rows.length === 0) throw new DomainError("Không có đơn nào phù hợp để cập nhật hàng loạt.");
      for (const row of rows) {
        updateShipment(db, v.id, row.pledge_id, to, carrier, row.tracking_code ?? undefined);
      }
      return rows.length;
    });

    revalidateProject(p.slug);
    return {
      ok: true,
      message: `Đã chuyển ${updated} đơn sang trạng thái ${to === "DELIVERED" ? "Đã giao" : "Đang giao"}.`,
      celebrate: to === "DELIVERED",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}
