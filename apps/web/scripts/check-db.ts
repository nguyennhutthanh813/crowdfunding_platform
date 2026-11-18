/**
 * Kiểm thử tự động CSDL, ràng buộc trigger, phân quyền RBAC và domain services cho FundViet v3.
 * Chạy bằng: corepack pnpm test:db (node --experimental-strip-types --no-warnings scripts/check-db.ts)
 * Lưu ý: KHÔNG import "server-only" hoặc alias "@/".
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";

/**
 * Node --experimental-strip-types chưa hỗ trợ TypeScript parameter property (`public code` trong DomainError ở helpers.ts:12).
 * Nếu gặp ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX khi chạy ở chế độ strip-only, dùng chính trình biên dịch TypeScript đã cài
 * để transpile file .ts trong src/server trong bộ nhớ (không sửa file dùng chung).
 */
async function loadRuntimeModules() {
  try {
    await import("../src/server/db/helpers.ts");
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") throw err;
    const ts = await import("typescript");
    registerHooks({
      load(url, context, nextLoad) {
        if (url.startsWith("file:") && url.endsWith(".ts") && url.includes("/src/server/")) {
          const source = readFileSync(fileURLToPath(url), "utf8");
          const out = ts.default.transpileModule(source, {
            fileName: fileURLToPath(url),
            compilerOptions: {
              module: ts.default.ModuleKind.ESNext,
              target: ts.default.ScriptTarget.ES2022,
            },
          });
          return { format: "module", source: out.outputText, shortCircuit: true };
        }
        return nextLoad(url, context);
      },
    });
  }

  const [openMod, catalogMod, helpersMod, schemaMod, rbacMod, pledgeMod, lifecycleMod, schedulerMod] = await Promise.all([
    import("../src/server/db/open.ts"),
    import("../src/server/db/catalog.ts"),
    import("../src/server/db/helpers.ts"),
    import("../src/server/db/schema.ts"),
    import("../src/server/rbac/rbac.ts"),
    import("../src/server/services/pledge.ts"),
    import("../src/server/services/lifecycle.ts"),
    import("../src/server/services/scheduler.ts"),
  ]);

  return {
    ...openMod,
    ...catalogMod,
    ...helpersMod,
    ...schemaMod,
    ...rbacMod,
    ...pledgeMod,
    ...lifecycleMod,
    ...schedulerMod,
  };
}

const m = await loadRuntimeModules();
const {
  openDatabase,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  all,
  insert,
  newId,
  one,
  run,
  TABLE_GROUPS,
  canProject,
  canViewProject,
  hasSystemPerm,
  loadProjectAccess,
  loadViewer,
  pledgeBlocker,
  cancelPledge,
  createPledge,
  luhnValid,
  quotePledge,
  advanceFulfillment,
  cancelProject,
  reviewProject,
  setSchedule,
  submitForReview,
  withdrawSubmission,
  runScheduler,
} = m;

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error("   ", err instanceof Error ? err.stack ?? err.message : err);
  }
}

function expectThrows(fn: () => unknown, pattern?: RegExp, label?: string) {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, label ? `Expected error (${label}), but succeeded` : "Expected error, but succeeded");
  if (pattern) {
    const msg = caught instanceof Error ? caught.message : String(caught);
    assert.match(msg, pattern, `Unexpected error message: ${msg}`);
  }
}

function cleanupTempDb(file: string) {
  for (const f of [file, `${file}-wal`, `${file}-shm`]) {
    if (existsSync(f)) rmSync(f, { force: true });
  }
}

function assertAllProjectCountersSynced(db: DatabaseSync) {
  const rows = all<{
    id: string;
    slug: string;
    pledged_amount: number;
    backers_count: number;
    actual_amount: number;
    actual_backers: number;
  }>(
    db,
    `SELECT p.id, p.slug, p.pledged_amount, p.backers_count,
            COALESCE((SELECT SUM(pl.total_amount) FROM pledges pl WHERE pl.project_id = p.id AND pl.status NOT IN ('CANCELLED','REFUNDED')), 0) AS actual_amount,
            (SELECT COUNT(*) FROM pledges pl WHERE pl.project_id = p.id AND pl.status NOT IN ('CANCELLED','REFUNDED')) AS actual_backers
     FROM projects p`,
  );
  for (const r of rows) {
    assert.equal(r.pledged_amount, r.actual_amount, `pledged_amount mismatch on ${r.slug}`);
    assert.equal(r.backers_count, r.actual_backers, `backers_count mismatch on ${r.slug}`);
  }
}

const tmpFile = join(tmpdir(), `fundviet-check-${process.pid}-${Date.now()}.sqlite`);
let db: DatabaseSync | undefined;

try {
  console.log(`\n[check-db] Khởi tạo CSDL tạm tại: ${tmpFile}`);
  db = openDatabase(tmpFile, { reset: true });

  const userByUsername = (u: string) =>
    one<{ id: string }>(db!, `SELECT id FROM users WHERE username = ?`, u)!.id;
  const projectBySlug = (s: string) =>
    one<{ id: string; status: string; is_preview_public: number; end_at: string | null; creator_id: string }>(
      db!,
      `SELECT id, status, is_preview_public, end_at, creator_id FROM projects WHERE slug = ?`,
      s,
    )!;

  const minhanhId = userByUsername("minhanh");
  const hoanglinhId = userByUsername("hoanglinh");
  const giahuyId = userByUsername("giahuy");
  const quantriId = userByUsername("quantri");

  const orbitOne = projectBySlug("orbit-one");
  const bepMay = projectBySlug("bep-may");
  const chuCuoi = projectBySlug("chu-cuoi");
  const sonMaiSo = projectBySlug("son-mai-so");
  const meoMun = projectBySlug("meo-mun-di-hoc");
  const buocXanh = projectBySlug("buoc-xanh");
  const thanhPho = projectBySlug("thanh-pho-sau-mua");
  const mocLamp = projectBySlug("moc-lamp");

  console.log("\n1. Kiểm tra lược đồ & dữ liệu tham chiếu");

  test("40 bảng nghiệp vụ + meta, 3 view, 25 trigger tồn tại đầy đủ", () => {
    const tables = new Set(
      all<{ name: string }>(db!, `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).map(
        (r) => r.name,
      ),
    );
    const expectedTables = Object.values(TABLE_GROUPS).flat();
    assert.equal(expectedTables.length, 40);
    for (const t of [...expectedTables, "meta"]) {
      assert.ok(tables.has(t), `Missing table ${t}`);
    }

    const views = new Set(all<{ name: string }>(db!, `SELECT name FROM sqlite_master WHERE type = 'view'`).map((r) => r.name));
    for (const v of ["v_user_system_permissions", "v_project_permissions", "v_project_backer_countries"]) {
      assert.ok(views.has(v), `Missing view ${v}`);
    }

    const triggers = all<{ name: string }>(db!, `SELECT name FROM sqlite_master WHERE type = 'trigger'`);
    assert.equal(triggers.length, 25, `Expected 25 triggers, got ${triggers.length}`);
  });

  test("Bảng roles, permissions, role_permissions và categories khớp catalog.ts & seed.ts", () => {
    const dbRoles = all<{ code: string; scope: string }>(db!, `SELECT code, scope FROM roles`);
    assert.equal(dbRoles.length, ROLES.length);
    const dbPerms = all<{ code: string; scope: string }>(db!, `SELECT code, scope FROM permissions`);
    assert.equal(dbPerms.length, PERMISSIONS.length);

    const expectedRpCount = Object.values(ROLE_PERMISSIONS).reduce((s, arr) => s + arr.length, 0);
    const dbRpCount = one<{ c: number }>(db!, `SELECT COUNT(*) c FROM role_permissions`)!.c;
    assert.equal(dbRpCount, expectedRpCount);

    const cats = one<{ c: number }>(db!, `SELECT COUNT(*) c FROM categories`)!.c;
    assert.equal(cats, 8);
  });

  test("Counter cache của tất cả dự án sau khi seed khớp SUM(pledges)", () => {
    assertAllProjectCountersSynced(db!);
  });

  console.log("\n2. Kiểm tra đầy đủ ma trận phân quyền trên orbit-one");

  const minhanh = loadViewer(db, minhanhId)!;
  const hoanglinh = loadViewer(db, hoanglinhId)!;
  const giahuy = loadViewer(db, giahuyId)!;
  const quantri = loadViewer(db, quantriId)!;

  test("Xem dự án công khai / xem trước / nháp theo từng vai trò (Guest, Backer, Creator, Collaborator, Admin)", () => {
    assert.equal(canViewProject(db!, null, orbitOne), true);
    assert.equal(canViewProject(db!, null, bepMay), true);
    assert.equal(canViewProject(db!, null, chuCuoi), false);

    assert.equal(canViewProject(db!, minhanh, orbitOne), true);
    assert.equal(canViewProject(db!, minhanh, chuCuoi), false);

    assert.equal(canViewProject(db!, hoanglinh, orbitOne), true);
    assert.equal(canViewProject(db!, hoanglinh, chuCuoi), true);

    assert.equal(canViewProject(db!, giahuy, orbitOne), true);
    assert.equal(canViewProject(db!, giahuy, chuCuoi), false);

    assert.equal(canViewProject(db!, quantri, orbitOne), true);
    assert.equal(canViewProject(db!, quantri, chuCuoi), true);
    assert.equal(canViewProject(db!, quantri, sonMaiSo), true);
  });

  test("Kiểm tra toàn bộ 38 mã quyền trong catalog.ts across minhanh, hoanglinh, giahuy, quantri trên orbit-one", () => {
    const memberSet = new Set(ROLE_PERMISSIONS.MEMBER);
    const adminSet = new Set(ROLE_PERMISSIONS.ADMIN);
    const creatorSet = new Set(ROLE_PERMISSIONS.CREATOR);
    const collabSet = new Set(ROLE_PERMISSIONS.COLLABORATOR);

    const checkedCodes = new Set<string>();
    for (const p of PERMISSIONS) {
      checkedCodes.add(p.code);
      if (p.scope === "SYSTEM") {
        assert.equal(hasSystemPerm(null, p.code), false, `Guest must not have ${p.code}`);
        assert.equal(hasSystemPerm(minhanh, p.code), memberSet.has(p.code), `minhanh system perm ${p.code}`);
        assert.equal(hasSystemPerm(hoanglinh, p.code), memberSet.has(p.code), `hoanglinh system perm ${p.code}`);
        assert.equal(hasSystemPerm(giahuy, p.code), memberSet.has(p.code), `giahuy system perm ${p.code}`);
        assert.equal(hasSystemPerm(quantri, p.code), adminSet.has(p.code), `quantri system perm ${p.code}`);
      } else {
        assert.equal(canProject(db!, null, orbitOne.id, p.code), false, `Guest must not have ${p.code}`);
        assert.equal(canProject(db!, minhanh, orbitOne.id, p.code), false, `minhanh must not have ${p.code} on orbit-one`);
        assert.equal(canProject(db!, hoanglinh, orbitOne.id, p.code), creatorSet.has(p.code), `hoanglinh project perm ${p.code}`);
        assert.equal(canProject(db!, giahuy, orbitOne.id, p.code), collabSet.has(p.code), `giahuy project perm ${p.code}`);
        assert.equal(canProject(db!, quantri, orbitOne.id, p.code), false, `quantri must not have project perm ${p.code}`);
      }
    }
    assert.equal(checkedCodes.size, PERMISSIONS.length);

    assert.equal(loadProjectAccess(db!, minhanh.id, orbitOne.id).role, null);
    assert.equal(loadProjectAccess(db!, hoanglinh.id, orbitOne.id).role, "CREATOR");
    assert.equal(loadProjectAccess(db!, giahuy.id, orbitOne.id).role, "COLLABORATOR");
    assert.equal(loadProjectAccess(db!, quantri.id, orbitOne.id).role, null);
  });

  test("Footnote ¹: pledgeBlocker chặn Khách, Creator, Collaborator, Admin trên orbit-one; cho phép Backer & tài khoản khác dự án", () => {
    assert.equal(pledgeBlocker(db!, null, orbitOne), "LOGIN");
    assert.equal(pledgeBlocker(db!, minhanh, orbitOne), null);
    assert.ok(pledgeBlocker(db!, hoanglinh, orbitOne) !== null);
    assert.ok(pledgeBlocker(db!, giahuy, orbitOne) !== null);
    assert.ok(pledgeBlocker(db!, quantri, orbitOne) !== null);

    assert.equal(pledgeBlocker(db!, hoanglinh, thanhPho), null);
    assert.equal(pledgeBlocker(db!, giahuy, thanhPho), null);
    assert.ok(pledgeBlocker(db!, quantri, thanhPho) !== null);
    assert.ok(pledgeBlocker(db!, minhanh, bepMay) !== null);
    assert.ok(pledgeBlocker(db!, minhanh, chuCuoi) !== null);
  });

  console.log("\n3. Kiểm tra Trigger & Ràng buộc toàn vẹn CSDL");

  const cardOf = (userId: string) =>
    one<{ id: string }>(db!, `SELECT id FROM payment_methods WHERE user_id = ? AND is_default = 1`, userId)!.id;
  const addrOf = (userId: string) =>
    one<{ id: string }>(db!, `SELECT id FROM addresses WHERE user_id = ? AND is_default = 1`, userId)!.id;

  test("trg_pledges_guard: chặn Creator, Collaborator, Admin góp vốn trực tiếp bằng SQL", () => {
    for (const [label, uid] of [
      ["Creator (hoanglinh)", hoanglinhId],
      ["Collaborator (giahuy)", giahuyId],
    ] as const) {
      expectThrows(
        () =>
          insert(db!, "pledges", {
            id: newId(),
            code: `CHK-${newId().slice(0, 8)}`,
            project_id: orbitOne.id,
            backer_id: uid,
            tier_id: null,
            payment_method_id: cardOf(uid),
            address_id: null,
            reward_amount: 0,
            bonus_amount: 100_000,
            add_on_amount: 0,
            shipping_amount: 0,
            total_amount: 100_000,
            status: "AUTHORIZED",
          }),
        /project members cannot back their own project/,
        label,
      );
    }

    const adminCard = newId();
    insert(db!, "payment_methods", {
      id: adminCard,
      user_id: quantriId,
      brand: "VISA",
      last4: "4242",
      exp_month: 12,
      exp_year: 2029,
      holder_name: "ADMIN TEST",
      provider_token: `tok_${newId()}`,
      is_default: 1,
    });
    expectThrows(
      () =>
        insert(db!, "pledges", {
          id: newId(),
          code: `CHK-${newId().slice(0, 8)}`,
          project_id: orbitOne.id,
          backer_id: quantriId,
          tier_id: null,
          payment_method_id: adminCard,
          address_id: null,
          reward_amount: 0,
          bonus_amount: 100_000,
          add_on_amount: 0,
          shipping_amount: 0,
          total_amount: 100_000,
          status: "AUTHORIZED",
        }),
      /user lacks pledge\.create permission/,
      "Admin SQL pledge",
    );
    run(db!, `DELETE FROM payment_methods WHERE id = ?`, adminCard);
  });

  test("trg_pledges_guard: chặn góp vốn vào dự án không phải LIVE (SCHEDULED, DRAFT, SUCCESS, FAILED)", () => {
    const anyBacker = one<{ id: string }>(
      db!,
      `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'MEMBER'
       WHERE u.status = 'ACTIVE' AND u.id <> ? LIMIT 1`,
      hoanglinhId,
    )!.id;
    for (const proj of [bepMay, chuCuoi, meoMun, buocXanh]) {
      expectThrows(
        () =>
          insert(db!, "pledges", {
            id: newId(),
            code: `CHK-${newId().slice(0, 8)}`,
            project_id: proj.id,
            backer_id: anyBacker,
            tier_id: null,
            payment_method_id: cardOf(anyBacker),
            address_id: null,
            reward_amount: 0,
            bonus_amount: 100_000,
            add_on_amount: 0,
            shipping_amount: 0,
            total_amount: 100_000,
            status: "AUTHORIZED",
          }),
        /project is not live/,
        proj.status,
      );
    }
  });

  test("uq_pledge_active: mỗi backer chỉ được 1 pledge đang hiệu lực trên 1 dự án", () => {
    const hasExisting = one(
      db!,
      `SELECT 1 FROM pledges WHERE project_id = ? AND backer_id = ? AND status = 'AUTHORIZED'`,
      orbitOne.id,
      minhanhId,
    );
    assert.ok(hasExisting, "Seed must give minhanh an AUTHORIZED pledge on orbit-one");
    expectThrows(
      () =>
        insert(db!, "pledges", {
          id: newId(),
          code: `CHK-${newId().slice(0, 8)}`,
          project_id: orbitOne.id,
          backer_id: minhanhId,
          tier_id: null,
          payment_method_id: cardOf(minhanhId),
          address_id: null,
          reward_amount: 0,
          bonus_amount: 100_000,
          add_on_amount: 0,
          shipping_amount: 0,
          total_amount: 100_000,
          status: "AUTHORIZED",
        }),
      /UNIQUE constraint failed/,
      "Duplicate active pledge",
    );
  });

  test("Chống bán vượt số suất của reward_tiers (CHECK claimed_count <= quantity_limit)", () => {
    const limitedTierId = newId();
    insert(db!, "reward_tiers", {
      id: limitedTierId,
      project_id: thanhPho.id,
      title: "Suất giới hạn 1 cái",
      description: "Test limit",
      amount: 150_000,
      estimated_delivery: "2027-02",
      quantity_limit: 1,
      ships_physical: 0,
      shipping_fee: 0,
      is_active: 1,
      sort_order: 99,
    });
    const candidates = all<{ id: string }>(
      db!,
      `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'MEMBER'
       WHERE u.status = 'ACTIVE'
         AND NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM pledges pl WHERE pl.project_id = ? AND pl.backer_id = u.id AND pl.status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED'))
       LIMIT 2`,
      thanhPho.id,
      thanhPho.id,
    );
    assert.equal(candidates.length, 2);

    const p1 = createPledge(db!, candidates[0].id, {
      projectId: thanhPho.id,
      tierId: limitedTierId,
      bonusAmount: 0,
      addOns: [],
      paymentMethodId: cardOf(candidates[0].id),
    });

    expectThrows(
      () =>
        createPledge(db!, candidates[1].id, {
          projectId: thanhPho.id,
          tierId: limitedTierId,
          bonusAmount: 0,
          addOns: [],
          paymentMethodId: cardOf(candidates[1].id),
        }),
      /hết suất/,
      "Service oversell block",
    );

    expectThrows(
      () =>
        insert(db!, "pledges", {
          id: newId(),
          code: `CHK-${newId().slice(0, 8)}`,
          project_id: thanhPho.id,
          backer_id: candidates[1].id,
          tier_id: limitedTierId,
          payment_method_id: cardOf(candidates[1].id),
          address_id: null,
          reward_amount: 150_000,
          bonus_amount: 0,
          add_on_amount: 0,
          shipping_amount: 0,
          total_amount: 150_000,
          status: "AUTHORIZED",
        }),
      /CHECK constraint failed/,
      "DB oversell block",
    );

    cancelPledge(db!, candidates[0].id, p1.id);
  });

  test("trg_pledges_amount_immutable: không cho sửa các cột tiền, gói quà, dự án, backer của pledge", () => {
    const samplePledge = one<{ id: string; total_amount: number }>(
      db!,
      `SELECT id, total_amount FROM pledges WHERE project_id = ? AND backer_id = ? AND status = 'AUTHORIZED'`,
      orbitOne.id,
      minhanhId,
    )!;
    expectThrows(
      () => run(db!, `UPDATE pledges SET total_amount = ? WHERE id = ?`, samplePledge.total_amount + 50_000, samplePledge.id),
      /pledge amounts are immutable/,
    );
    expectThrows(
      () => run(db!, `UPDATE pledges SET bonus_amount = bonus_amount + 10000 WHERE id = ?`, samplePledge.id),
      /pledge amounts are immutable/,
    );
    expectThrows(
      () => run(db!, `UPDATE pledges SET reward_amount = 0 WHERE id = ?`, samplePledge.id),
      /pledge amounts are immutable/,
    );
  });

  test("trg_projects_status_flow & trg_pledges_status_flow: chặn chuyển trạng thái sai quy trình", () => {
    expectThrows(
      () => run(db!, `UPDATE projects SET status = 'LIVE', start_at = '2026-01-01T00:00:00Z', end_at = '2026-02-01T00:00:00Z' WHERE id = ?`, chuCuoi.id),
      /invalid project status transition/,
      "DRAFT -> LIVE",
    );
    expectThrows(
      () => run(db!, `UPDATE projects SET status = 'LIVE' WHERE id = ?`, buocXanh.id),
      /invalid project status transition/,
      "FAILED -> LIVE",
    );
    const nguoiGiuRung = projectBySlug("nguoi-giu-rung");
    expectThrows(
      () => run(db!, `UPDATE projects SET status = 'DRAFT' WHERE id = ?`, nguoiGiuRung.id),
      /invalid project status transition/,
      "COMPLETED -> DRAFT",
    );

    const voided = one<{ id: string }>(db!, `SELECT id FROM pledges WHERE status = 'VOIDED' LIMIT 1`)!;
    expectThrows(
      () => run(db!, `UPDATE pledges SET status = 'CAPTURED' WHERE id = ?`, voided.id),
      /invalid pledge status transition/,
      "VOIDED -> CAPTURED",
    );
    const auth = one<{ id: string }>(db!, `SELECT id FROM pledges WHERE status = 'AUTHORIZED' LIMIT 1`)!;
    expectThrows(
      () => run(db!, `UPDATE pledges SET status = 'REFUNDED' WHERE id = ?`, auth.id),
      /invalid pledge status transition/,
      "AUTHORIZED -> REFUNDED",
    );
  });

  test("trg_projects_lock_funding: khoá mục tiêu và thời lượng sau khi gửi duyệt; vẫn cho sửa khi DRAFT", () => {
    expectThrows(
      () => run(db!, `UPDATE projects SET goal_amount = goal_amount + 1000000 WHERE id = ?`, sonMaiSo.id),
      /goal and duration are locked after submission/,
      "PENDING_REVIEW goal",
    );
    expectThrows(
      () => run(db!, `UPDATE projects SET duration_days = 45 WHERE id = ?`, orbitOne.id),
      /goal and duration are locked after submission/,
      "LIVE duration",
    );
    run(db!, `UPDATE projects SET goal_amount = 260000000 WHERE id = ?`, chuCuoi.id);
    assert.equal(one<{ goal_amount: number }>(db!, `SELECT goal_amount FROM projects WHERE id = ?`, chuCuoi.id)!.goal_amount, 260_000_000);
  });

  test("trg_updates_author & trg_updates_publish: Collaborator soạn nháp Update được nhưng không được đăng công khai; Creator đăng được", () => {
    const draftId = newId();
    insert(db!, "project_updates", {
      id: draftId,
      project_id: orbitOne.id,
      author_id: giahuyId,
      title: "Bản nháp kiểm thử Collaborator",
      body: "Nội dung nháp tiến độ sản xuất thử nghiệm từ Collaborator.",
      status: "DRAFT",
    });

    expectThrows(
      () =>
        insert(db!, "project_updates", {
          id: newId(),
          project_id: orbitOne.id,
          author_id: giahuyId,
          title: "Đăng trực tiếp bởi Collaborator",
          body: "Collaborator không có quyền publish update công khai.",
          status: "PUBLISHED",
          published_by: giahuyId,
          published_at: new Date().toISOString(),
        }),
      /publisher lacks update\.publish/,
    );

    expectThrows(
      () =>
        run(
          db!,
          `UPDATE project_updates SET status = 'PUBLISHED', published_by = ?, published_at = ? WHERE id = ?`,
          giahuyId,
          new Date().toISOString(),
          draftId,
        ),
      /publisher lacks update\.publish/,
    );

    expectThrows(
      () =>
        insert(db!, "project_updates", {
          id: newId(),
          project_id: orbitOne.id,
          author_id: minhanhId,
          title: "Người ngoài chèn update",
          body: "Không phải thành viên dự án thì không có update.draft.",
          status: "DRAFT",
        }),
      /author lacks update\.draft/,
    );

    run(
      db!,
      `UPDATE project_updates SET status = 'PUBLISHED', published_by = ?, published_at = ? WHERE id = ?`,
      hoanglinhId,
      new Date().toISOString(),
      draftId,
    );
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM project_updates WHERE id = ?`, draftId)!.status, "PUBLISHED");
  });

  test("trg_comments_guard: bình luận trả lời tối đa 2 cấp", () => {
    const rootId = newId();
    const replyId = newId();
    insert(db!, "comments", {
      id: rootId,
      project_id: orbitOne.id,
      author_id: minhanhId,
      body: "Bình luận cấp 1 kiểm thử độ sâu",
    });
    insert(db!, "comments", {
      id: replyId,
      project_id: orbitOne.id,
      parent_id: rootId,
      author_id: giahuyId,
      body: "Trả lời cấp 2 kiểm thử độ sâu",
    });
    expectThrows(
      () =>
        insert(db!, "comments", {
          id: newId(),
          project_id: orbitOne.id,
          parent_id: replyId,
          author_id: hoanglinhId,
          body: "Trả lời cấp 3 phải bị chặn",
        }),
      /replies are limited to two levels/,
    );
  });

  test("Khoá ngoại ghép chặn dùng thẻ hoặc địa chỉ của người khác trên pledges", () => {
    const otherBacker = one<{ id: string }>(
      db!,
      `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'MEMBER'
       WHERE u.status = 'ACTIVE' AND u.id <> ?
         AND EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id)
         AND EXISTS (SELECT 1 FROM payment_methods pm WHERE pm.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = ? AND pm2.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM pledges pl WHERE pl.project_id = ? AND pl.backer_id = u.id)
       LIMIT 1`,
      minhanhId,
      thanhPho.id,
      thanhPho.id,
    )!.id;

    expectThrows(
      () =>
        insert(db!, "pledges", {
          id: newId(),
          code: `CHK-${newId().slice(0, 8)}`,
          project_id: thanhPho.id,
          backer_id: otherBacker,
          tier_id: null,
          payment_method_id: cardOf(minhanhId),
          address_id: null,
          reward_amount: 0,
          bonus_amount: 100_000,
          add_on_amount: 0,
          shipping_amount: 0,
          total_amount: 100_000,
          status: "AUTHORIZED",
        }),
      /FOREIGN KEY constraint failed/,
      "Foreign card",
    );

    const physicalTier = one<{ id: string; amount: number; shipping_fee: number }>(
      db!,
      `SELECT id, amount, shipping_fee FROM reward_tiers WHERE project_id = ? AND ships_physical = 1 AND is_active = 1 LIMIT 1`,
      thanhPho.id,
    )!;
    expectThrows(
      () =>
        insert(db!, "pledges", {
          id: newId(),
          code: `CHK-${newId().slice(0, 8)}`,
          project_id: thanhPho.id,
          backer_id: otherBacker,
          tier_id: physicalTier.id,
          payment_method_id: cardOf(otherBacker),
          address_id: addrOf(minhanhId),
          reward_amount: physicalTier.amount,
          bonus_amount: 0,
          add_on_amount: 0,
          shipping_amount: physicalTier.shipping_fee,
          total_amount: physicalTier.amount + physicalTier.shipping_fee,
          ship_recipient: "Ai đó",
          ship_phone: "0901234567",
          ship_address: "Địa chỉ mượn",
          ship_province: "Hà Nội",
          status: "AUTHORIZED",
        }),
      /FOREIGN KEY constraint failed/,
      "Foreign address",
    );
  });

  test("Các trigger bảo vệ khác: creator bất biến, không thăng cấp Collaborator, khoá giá gói đã có người chọn, chặn huỷ khi còn pledge", () => {
    expectThrows(
      () => run(db!, `UPDATE projects SET creator_id = ? WHERE id = ?`, minhanhId, orbitOne.id),
      /creator cannot be changed/,
    );
    expectThrows(
      () =>
        run(
          db!,
          `UPDATE project_members SET role_code = 'CREATOR' WHERE project_id = ? AND user_id = ?`,
          orbitOne.id,
          giahuyId,
        ),
      /collaborator cannot become creator/,
    );
    const claimedTier = one<{ id: string; amount: number }>(
      db!,
      `SELECT id, amount FROM reward_tiers WHERE project_id = ? AND claimed_count > 0 LIMIT 1`,
      orbitOne.id,
    )!;
    expectThrows(
      () => run(db!, `UPDATE reward_tiers SET amount = ? WHERE id = ?`, claimedTier.amount + 10_000, claimedTier.id),
      /tier with backers cannot change price/,
    );
    expectThrows(
      () => run(db!, `DELETE FROM reward_tiers WHERE id = ?`, claimedTier.id),
      /tier with pledges cannot be deleted/,
    );
    expectThrows(
      () => run(db!, `UPDATE projects SET status = 'CANCELLED' WHERE id = ?`, orbitOne.id),
      /project has active pledges/,
    );
    expectThrows(
      () =>
        insert(db!, "project_reviews", {
          id: newId(),
          project_id: sonMaiSo.id,
          reviewer_id: minhanhId,
          decision: "APPROVED",
          note: "Không phải admin",
        }),
      /reviewer lacks admin\.project\.review/,
    );
    const authPledge = one<{ id: string }>(db!, `SELECT id FROM pledges WHERE status = 'AUTHORIZED' LIMIT 1`)!;
    expectThrows(
      () => insert(db!, "shipments", { pledge_id: authPledge.id, status: "PREPARING" }),
      /shipment requires a captured pledge with physical reward/,
    );
  });

  console.log("\n4. Kiểm tra Domain Services (pledge, lifecycle, scheduler)");

  test("createPledge → cancelPledge: đồng bộ counter cache, reward_tiers.claimed_count và payment_transactions", () => {
    assert.equal(luhnValid("4532015112830366"), true);
    assert.equal(luhnValid("4532015112830367"), false);

    const sacMau = projectBySlug("sac-mau-ba-mien");
    const tier = one<{ id: string; amount: number; shipping_fee: number; ships_physical: number; claimed_count: number }>(
      db!,
      `SELECT id, amount, shipping_fee, ships_physical, claimed_count FROM reward_tiers WHERE project_id = ? AND ships_physical = 1 AND is_active = 1 LIMIT 1`,
      sacMau.id,
    )!;
    const beforeProj = one<{ pledged_amount: number; backers_count: number }>(
      db!,
      `SELECT pledged_amount, backers_count FROM projects WHERE id = ?`,
      sacMau.id,
    )!;

    const q = quotePledge(db!, { projectId: sacMau.id, tierId: tier.id, bonusAmount: 50_000, addOns: [] });
    assert.equal(q.total, tier.amount + 50_000 + tier.shipping_fee);

    const created = createPledge(db!, minhanhId, {
      projectId: sacMau.id,
      tierId: tier.id,
      bonusAmount: 50_000,
      addOns: [],
      addressId: addrOf(minhanhId),
      paymentMethodId: cardOf(minhanhId),
      note: "Kiểm thử tự động",
    });

    const afterCreateProj = one<{ pledged_amount: number; backers_count: number }>(
      db!,
      `SELECT pledged_amount, backers_count FROM projects WHERE id = ?`,
      sacMau.id,
    )!;
    assert.equal(afterCreateProj.pledged_amount, beforeProj.pledged_amount + created.total);
    assert.equal(afterCreateProj.backers_count, beforeProj.backers_count + 1);
    assert.equal(
      one<{ claimed_count: number }>(db!, `SELECT claimed_count FROM reward_tiers WHERE id = ?`, tier.id)!.claimed_count,
      tier.claimed_count + 1,
    );
    const authTx = one<{ kind: string; status: string; amount: number }>(
      db!,
      `SELECT kind, status, amount FROM payment_transactions WHERE idempotency_key = ?`,
      `${created.id}:AUTHORIZE`,
    );
    assert.equal(authTx?.kind, "AUTHORIZE");
    assert.equal(authTx?.status, "SUCCEEDED");
    assert.equal(authTx?.amount, created.total);
    assertAllProjectCountersSynced(db!);

    cancelPledge(db!, minhanhId, created.id);

    const afterCancelProj = one<{ pledged_amount: number; backers_count: number }>(
      db!,
      `SELECT pledged_amount, backers_count FROM projects WHERE id = ?`,
      sacMau.id,
    )!;
    assert.equal(afterCancelProj.pledged_amount, beforeProj.pledged_amount);
    assert.equal(afterCancelProj.backers_count, beforeProj.backers_count);
    assert.equal(
      one<{ claimed_count: number }>(db!, `SELECT claimed_count FROM reward_tiers WHERE id = ?`, tier.id)!.claimed_count,
      tier.claimed_count,
    );
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM pledges WHERE id = ?`, created.id)!.status, "CANCELLED");
    assert.equal(
      one<{ kind: string; status: string }>(
        db!,
        `SELECT kind, status FROM payment_transactions WHERE idempotency_key = ?`,
        `${created.id}:VOID`,
      )?.kind,
      "VOID",
    );
    assertAllProjectCountersSynced(db!);
  });

  test("reviewProject: duyệt PENDING_REVIEW → LIVE (không hẹn ngày) hoặc SCHEDULED (ngày tương lai) & rút/yêu cầu sửa", () => {
    const msgLive = reviewProject(db!, quantriId, sonMaiSo.id, "APPROVED", "Hồ sơ đạt chuẩn");
    assert.match(msgLive, /mở góp vốn ngay/);
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, sonMaiSo.id)!.status, "LIVE");

    const futureStart = new Date(Date.now() + 5 * 86_400_000).toISOString();
    run(
      db!,
      `UPDATE projects SET blurb = 'Phim hoạt hình 3D kể lại truyền thuyết chú Cuội cung trăng dành cho gia đình Việt.',
                          risks = 'Rủi ro chính là thời gian render kéo dài; nhóm đã thuê thêm server dự phòng trước 4 tuần.'
       WHERE id = ?`,
      chuCuoi.id,
    );
    setSchedule(db!, hoanglinhId, chuCuoi.id, futureStart, true);
    submitForReview(db!, hoanglinhId, chuCuoi.id);
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, chuCuoi.id)!.status, "PENDING_REVIEW");

    withdrawSubmission(db!, hoanglinhId, chuCuoi.id);
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, chuCuoi.id)!.status, "DRAFT");

    submitForReview(db!, hoanglinhId, chuCuoi.id);
    reviewProject(db!, quantriId, chuCuoi.id, "CHANGES_REQUESTED", "Cần bổ sung thêm thông tin bản quyền nhạc phim.");
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, chuCuoi.id)!.status, "DRAFT");

    submitForReview(db!, hoanglinhId, chuCuoi.id);
    const msgSched = reviewProject(db!, quantriId, chuCuoi.id, "APPROVED", "Đủ điều kiện mở theo lịch");
    assert.match(msgSched, /sẽ tự mở/);
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, chuCuoi.id)!.status, "SCHEDULED");
  });

  test("runScheduler: mở SCHEDULED đến hạn, CAPTURE dự án đạt goal, VOID dự án thiếu goal, và idempotent khi chạy lại", () => {
    const pastIso = new Date(Date.now() - 60_000).toISOString();
    const futureEnd = new Date(Date.now() + 25 * 86_400_000).toISOString();

    run(db!, `UPDATE projects SET start_at = ?, end_at = ? WHERE id = ?`, pastIso, futureEnd, bepMay.id);
    const mocAuthCount = one<{ c: number }>(
      db!,
      `SELECT COUNT(*) c FROM pledges WHERE project_id = ? AND status = 'AUTHORIZED'`,
      mocLamp.id,
    )!.c;
    assert.ok(mocAuthCount > 0, "moc-lamp must have AUTHORIZED pledges");
    run(db!, `UPDATE projects SET end_at = ? WHERE id = ?`, pastIso, mocLamp.id);

    const tpAuthCount = one<{ c: number }>(
      db!,
      `SELECT COUNT(*) c FROM pledges WHERE project_id = ? AND status = 'AUTHORIZED'`,
      thanhPho.id,
    )!.c;
    assert.ok(tpAuthCount > 0, "thanh-pho-sau-mua must have AUTHORIZED pledges");
    run(db!, `UPDATE projects SET end_at = ? WHERE id = ?`, pastIso, thanhPho.id);

    const r1 = runScheduler(db!, { source: "MANUAL", actorId: quantriId });
    assert.ok(r1.opened >= 1, "Expected bep-may to open");
    assert.ok(r1.success >= 1, "Expected moc-lamp to succeed");
    assert.ok(r1.failed >= 1, "Expected thanh-pho-sau-mua to fail");
    assert.equal(r1.captured, mocAuthCount, "All moc-lamp AUTHORIZED pledges should be captured");
    assert.equal(r1.voided, tpAuthCount, "All thanh-pho-sau-mua AUTHORIZED pledges should be voided");

    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, bepMay.id)!.status, "LIVE");
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, mocLamp.id)!.status, "SUCCESS");
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, thanhPho.id)!.status, "FAILED");

    assert.equal(
      one<{ c: number }>(db!, `SELECT COUNT(*) c FROM pledges WHERE project_id = ? AND status = 'AUTHORIZED'`, mocLamp.id)!.c,
      0,
    );
    assert.equal(
      one<{ c: number }>(db!, `SELECT COUNT(*) c FROM pledges WHERE project_id = ? AND status = 'CAPTURED'`, mocLamp.id)!.c,
      mocAuthCount,
    );
    assert.equal(
      one<{ c: number }>(db!, `SELECT COUNT(*) c FROM pledges WHERE project_id = ? AND status = 'VOIDED'`, thanhPho.id)!.c,
      tpAuthCount,
    );

    const txCountBefore = one<{ c: number }>(db!, `SELECT COUNT(*) c FROM payment_transactions`)!.c;
    const r2 = runScheduler(db!, { source: "MANUAL", actorId: quantriId });
    assert.deepEqual(r2, { opened: 0, success: 0, failed: 0, captured: 0, voided: 0 });
    const txCountAfter = one<{ c: number }>(db!, `SELECT COUNT(*) c FROM payment_transactions`)!.c;
    assert.equal(txCountAfter, txCountBefore, "Re-running scheduler must not create duplicate transactions");

    advanceFulfillment(db!, hoanglinhId, mocLamp.id, "FULFILLING");
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, mocLamp.id)!.status, "FULFILLING");
    const shipmentsCreated = one<{ c: number }>(
      db!,
      `SELECT COUNT(*) c FROM shipments s JOIN pledges pl ON pl.id = s.pledge_id WHERE pl.project_id = ?`,
      mocLamp.id,
    )!.c;
    assert.ok(shipmentsCreated > 0, "Expected shipments created for physical CAPTURED pledges");

    const draftProjId = newId();
    insert(db!, "projects", {
      id: draftProjId,
      creator_id: hoanglinhId,
      category_id: "cat_tech",
      title: "Dự án thử huỷ bản nháp",
      slug: `draft-cancel-${newId().slice(0, 6)}`,
      goal_amount: 10_000_000,
      duration_days: 30,
    });
    cancelProject(db!, hoanglinhId, draftProjId, "Không làm nữa");
    assert.equal(one<{ status: string }>(db!, `SELECT status FROM projects WHERE id = ?`, draftProjId)!.status, "CANCELLED");
  });
} finally {
  try {
    db?.close();
  } catch {
    // bỏ qua lỗi đóng DB nếu có
  }
  cleanupTempDb(tmpFile);
}

console.log(`\n[check-db] Hoàn tất: ${passed} đạt, ${failed} lỗi.\n`);
if (failed > 0) process.exit(1);
