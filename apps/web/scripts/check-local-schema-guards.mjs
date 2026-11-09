import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { activeMembershipGuards, localSchema } from "../src/lib/local-db/schema.ts";

const db = new DatabaseSync(":memory:");
try {
  db.exec(localSchema);
  db.exec(activeMembershipGuards);
  const user = db.prepare("INSERT INTO users (id,display_name,email,location,status,source) VALUES (?,?,?,?,?,?)");
  user.run("u_owner", "Chủ dự án", "owner@example.com", "Huế", "ACTIVE", "LOCAL");
  user.run("u_team", "Thành viên", "team@example.com", "Huế", "ACTIVE", "LOCAL");
  user.run("u_other", "Người khác", "other@example.com", "Hà Nội", "ACTIVE", "LOCAL");
  const campaign = db.prepare(`INSERT INTO campaigns
    (id,creator_id,category_id,title,slug,status,goal_amount,pledged_amount,source)
    VALUES (?,?,NULL,?,?,?,?,?,?)`);
  campaign.run("c_one", "u_owner", "Chiến dịch một", "c-one", "DRAFT", 10000000, 0, "LOCAL");
  campaign.run("c_two", "u_other", "Chiến dịch hai", "c-two", "DRAFT", 10000000, 0, "LOCAL");
  const member = db.prepare("INSERT INTO campaign_members (campaign_id,user_id,role) VALUES (?,?,?)");
  assert.throws(() => member.run("c_one", "u_team", "OWNER"), /owner differs from creator/);
  member.run("c_one", "u_owner", "OWNER");
  member.run("c_one", "u_team", "COLLABORATOR");
  member.run("c_two", "u_other", "OWNER");
  assert.throws(() => db.prepare("UPDATE campaign_members SET status='REVOKED' WHERE campaign_id='c_one' AND user_id='u_owner'").run(),
    /owner must be active/);

  const task = db.prepare(`INSERT INTO campaign_tasks
    (id,campaign_id,assignee_user_id,created_by_user_id,title,status,detail,created_at)
    VALUES (?,?,?,?,?,?,?,?)`);
  assert.throws(() => task.run("t_bad", "c_one", "u_other", "u_owner", "Sai nhóm", "TODO", "", "2026-11-09"),
    /task member (outside campaign|revoked)/);
  task.run("t_good", "c_one", "u_team", "u_owner", "Kiểm tra mẫu", "TODO", "", "2026-11-09");
  assert.throws(() => db.prepare(`INSERT INTO campaign_task_handoffs
    (id,task_id,from_user_id,to_user_id,note,created_at) VALUES (?,?,?,?,?,?)`)
    .run("h_bad", "t_good", "u_team", "u_other", "Chuyển sai nhóm", "2026-11-09"),
    /handoff member (outside campaign|revoked)/);
  assert.throws(() => db.prepare(`INSERT INTO campaign_updates
    (id,campaign_id,author_id,title,body,published_at,source) VALUES (?,?,?,?,?,?,?)`)
    .run("up_bad", "c_one", "u_other", "Tin sai nhóm", "Nội dung", "2026-11-09", "LOCAL"),
    /update author (outside campaign|revoked)/);
  db.prepare("UPDATE campaign_members SET status='REVOKED' WHERE campaign_id='c_one' AND user_id='u_team'").run();
  assert.equal(db.prepare("SELECT status FROM campaign_tasks WHERE id='t_good'").get().status, "TODO");
  assert.throws(() => task.run("t_revoked", "c_one", "u_team", "u_owner", "Sai quyền", "TODO", "", "2026-11-09"),
    /task member revoked/);
  assert.throws(() => db.prepare(`INSERT INTO campaign_updates
    (id,campaign_id,author_id,title,body,published_at,source) VALUES (?,?,?,?,?,?,?)`)
    .run("up_revoked", "c_one", "u_team", "Tin sai quyền", "Nội dung", "2026-11-09", "LOCAL"),
    /update author revoked/);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  const addPledge = db.prepare(`INSERT INTO pledges
    (id,campaign_id,backer_id,status,total_amount,source) VALUES (?,?,?,?,?,?)`);
  addPledge.run("p_seed", "c_one", "u_team", "AUTHORIZED", 100000, "SEED");
  addPledge.run("p_local", "c_one", "u_team", "AUTHORIZED", 150000, "LOCAL");
  assert.deepEqual(db.prepare("SELECT id FROM effective_pledges WHERE campaign_id='c_one'").all().map((row) => row.id),
    ["p_local"], "Cam kết mới phải thay bản seed trong phép đếm hiện hành.");
  db.prepare("INSERT INTO reward_tiers (id,campaign_id,title,amount,source) VALUES ('rw_other','c_two','Gói khác',100000,'LOCAL')").run();
  db.prepare("INSERT INTO shipping_options (id,campaign_id,name,fee_amount,source) VALUES ('sh_other','c_two','Giao khác',15000,'LOCAL')").run();
  db.prepare("INSERT INTO addresses (id,user_id,recipient_name,province,source) VALUES ('addr_other','u_other','Người khác','Hà Nội','LOCAL')").run();
  assert.throws(() => db.prepare("UPDATE pledges SET reward_tier_id='rw_other' WHERE id='p_local'").run(), /reward outside campaign/);
  assert.throws(() => db.prepare("UPDATE pledges SET shipping_option_id='sh_other' WHERE id='p_local'").run(), /shipping outside campaign/);
  assert.throws(() => db.prepare("UPDATE pledges SET shipping_address_id='addr_other' WHERE id='p_local'").run(), /address belongs to another backer/);
  db.prepare("INSERT INTO add_ons (id,campaign_id,title,amount,source) VALUES ('addon_one','c_one','Phụ kiện',25000,'LOCAL')").run();
  assert.throws(() => db.prepare("INSERT INTO pledge_add_ons (pledge_id,campaign_id,add_on_id,quantity) VALUES ('p_local','c_two','addon_one',1)").run(), /add-on outside pledge campaign/);
  db.prepare("INSERT INTO pledge_add_ons (pledge_id,campaign_id,add_on_id,quantity) VALUES ('p_local','c_one','addon_one',1)").run();
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  console.log("PASS SQLite schema guards: owner/nhóm, cam kết cùng chiến dịch và đúng địa chỉ, FK sạch.");
} finally {
  db.close();
}

const oldDb = new DatabaseSync(":memory:");
try {
  const oldSchema = localSchema.replace(
    "  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),\n  PRIMARY KEY (campaign_id, user_id)",
    "  PRIMARY KEY (campaign_id, user_id)",
  );
  assert.notEqual(oldSchema, localSchema);
  oldDb.exec(oldSchema);
  oldDb.exec("ALTER TABLE campaign_members ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED'))");
  oldDb.exec(activeMembershipGuards);
  assert.ok(oldDb.prepare("PRAGMA table_info(campaign_members)").all().some((column) => column.name === "status"));
  console.log("PASS migration: file SQLite cũ có thể thêm trạng thái thành viên và trigger mới.");
} finally {
  oldDb.close();
}
