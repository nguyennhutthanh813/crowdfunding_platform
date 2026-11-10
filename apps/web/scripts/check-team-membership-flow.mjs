import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const baseUrl = process.env.GOP_PREVIEW_URL ?? "http://localhost:3000";
const dbName = process.env.GOP_EXPECT_LOCAL_DB_NAME;
if (!new Set(["localhost", "127.0.0.1"]).has(new URL(baseUrl).hostname) ||
  !dbName || !/^[a-z0-9_-]+$/i.test(dbName) || dbName === "gop-mock") {
  throw new Error("Chạy trên server local với GOP_EXPECT_LOCAL_DB_NAME là tên DB test riêng.");
}

function browser() {
  const cookies = new Map();
  return async (path, method = "GET", body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const index = pair.indexOf("=");
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  };
}

const creator = browser();
const admin = browser();
const invited = browser();
const stranger = browser();
async function signIn(client, email, password = "gop12345") {
  const result = await client("/api/v1/auth/session", "POST", { mode: "SIGN_IN", email, password, remember: false });
  assert.equal(result.status, 200, JSON.stringify(result.data));
}
await signIn(creator, "linh@orbit.vn");
await signIn(admin, "quantri@gop.vn");
await signIn(stranger, "minhanh@example.com");
const dbInfo = await admin("/api/v1/local-db");
assert.equal(dbInfo.data.data.file, `.local-data/${dbName}.sqlite`);

const email = `nhom-${Date.now()}@example.com`;
const registered = await invited("/api/v1/auth/session", "POST", {
  mode: "REGISTER", fullName: "Nguyễn Thu An", email, password: "thu-an-demo-2026",
});
assert.equal(registered.status, 201, JSON.stringify(registered.data));
const invitedId = registered.data.user.id;
const oldPassword = "thu-an-demo-2026";
const newPassword = "thu-an-moi-2027";
const preferences = {
  projectUpdates: false, pledgeStatus: true, recommendations: false,
  creatorTasks: true, moderationAlerts: false,
};
assert.equal((await invited("/api/v1/auth/session", "PATCH", {
  notificationPreferences: preferences,
})).status, 200);
assert.equal((await invited("/api/v1/me/dashboard", "POST", {
  action: "CHANGE_PASSWORD", payload: { currentPassword: "sai-mat-khau", newPassword },
})).status, 422);
assert.equal((await invited("/api/v1/me/dashboard", "POST", {
  action: "CHANGE_PASSWORD", payload: { currentPassword: oldPassword, newPassword },
})).status, 200);
assert.equal((await invited("/api/v1/auth/session", "DELETE")).status, 200);
assert.equal((await invited("/api/v1/auth/session", "POST", {
  mode: "SIGN_IN", email, password: oldPassword,
})).status, 401);
const signedInAgain = await invited("/api/v1/auth/session", "POST", {
  mode: "SIGN_IN", email, password: newPassword,
});
assert.equal(signedInAgain.status, 200);
assert.deepEqual(signedInAgain.data.previewState.notificationPreferences, preferences);
const title = `Bếp Mây ${Date.now().toString().slice(-6)} — bộ lọc nước nhỏ`;
const created = await creator("/api/v1/creator/campaigns", "POST", {
  action: "CREATE",
  draft: {
    title, blurb: "Bộ lọc lắp tại vòi cho gia đình ở nhà thuê, thay lõi dễ và giảm chai nhựa dùng một lần.",
    category: "Đời sống xanh", goal: "120000000", duration: "30", location: "Đà Nẵng",
    story: "Nhóm bắt đầu từ nhu cầu có nước sạch trong những căn bếp nhỏ. Sản phẩm được lắp vào vòi hiện có, làm mẫu tại Đà Nẵng, kiểm tra tốc độ lọc rồi mới đặt vật liệu cho lô đầu.",
    risks: "Nguồn lõi lọc có thể giao trễ. Nhóm sẽ công khai tiến độ theo từng lô và chuẩn bị một nhà cung ứng dự phòng.",
    shippingFee: "30000", hasVideo: false,
  },
  rewards: [{ id: 1, title: "Bộ lọc lô đầu", amount: "750000", delivery: "03/2027", limit: "100" }],
  addOns: [], collaborators: [],
});
assert.equal(created.status, 201, JSON.stringify(created.data));
const campaignId = created.data.data.campaignId;
function memberStatus() {
  const database = new DatabaseSync(join(process.cwd(), ".local-data", `${dbName}.sqlite`), { readOnly: true });
  try {
    return database.prepare("SELECT status FROM campaign_members WHERE campaign_id=? AND user_id=?")
      .get(campaignId, invitedId)?.status;
  } finally { database.close(); }
}
assert.equal((await creator("/api/v1/creator/campaigns", "POST", { action: "SUBMIT", campaignId })).status, 200);
const queue = await admin("/api/v1/admin/overview");
const review = queue.data.reviewQueue.find((item) => item.title === title);
assert.ok(review);
assert.equal((await admin("/api/v1/admin/actions", "POST", {
  action: "REVIEW_CAMPAIGN", payload: { reviewId: review.id, decision: "APPROVED", feedback: "Đủ nội dung để thử luồng nhóm." },
})).status, 200);

const teamUrl = "/api/v1/creator/collaborators";
assert.equal((await stranger(teamUrl, "POST", { action: "INVITE", campaignId, email })).status, 403);
assert.equal((await creator(teamUrl, "POST", {
  action: "INVITE", campaignId, email, name: "Nguyễn Thu An", canUpdate: "yes",
})).status, 422);
assert.equal((await creator(teamUrl, "POST", {
  action: "INVITE", campaignId, email, name: "Nguyễn Thu An",
  canUpdate: false, canReply: false, canViewAi: true,
})).status, 200);
const permissionDb = new DatabaseSync(join(process.cwd(), ".local-data", `${dbName}.sqlite`), { readOnly: true });
try {
  const permission = permissionDb.prepare(`SELECT can_post_updates,can_reply_comments,can_view_ai
    FROM campaign_invitations WHERE campaign_id=? AND email=?`).get(campaignId, email);
  assert.equal(permission?.can_post_updates, 0);
  assert.equal(permission?.can_reply_comments, 0);
  assert.equal(permission?.can_view_ai, 1);
} finally { permissionDb.close(); }
assert.equal((await stranger("/api/v1/collaborator/invitations", "POST", { action: "ACCEPT", campaignId })).status, 403);
assert.equal((await invited("/api/v1/collaborator/invitations", "POST", { action: "DECLINE", campaignId })).status, 200);
assert.equal((await invited("/api/v1/collaborator/invitations", "POST", { action: "ACCEPT", campaignId })).status, 403);
assert.equal((await creator(teamUrl, "POST", {
  action: "INVITE", campaignId, email, name: "Nguyễn Thu An",
  canUpdate: false, canReply: false, canViewAi: true,
})).status, 200);
assert.equal((await invited("/api/v1/collaborator/invitations", "POST", { action: "ACCEPT", campaignId })).status, 200);
assert.equal((await invited("/api/v1/collaborator/invitations", "POST", { action: "DECLINE", campaignId })).status, 409);
assert.equal(memberStatus(), "ACTIVE");
const joinedSession = await invited("/api/v1/auth/session");
assert.ok(joinedSession.data.data.user.roles.includes("COLLABORATOR"));
assert.equal((await invited("/api/v1/auth/session", "PATCH", { activeRole: "COLLABORATOR" })).status, 200);
assert.equal((await creator(teamUrl, "POST", { action: "REMOVE", campaignId, email })).status, 200);
assert.equal(memberStatus(), "REVOKED", "Rời nhóm khi chưa có việc vẫn phải giữ quan hệ cũ.");
const revokedSession = await invited("/api/v1/auth/session");
assert.ok(!revokedSession.data.data.user.roles.includes("COLLABORATOR"));
assert.equal(revokedSession.data.data.user.activeRole, "BACKER");
assert.equal((await invited("/api/v1/auth/session", "PATCH", { activeRole: "COLLABORATOR" })).status, 403);
const afterRemoval = await admin("/api/v1/admin/overview");
assert.equal(afterRemoval.data.users.find((user) => user.id === invitedId)?.campaignRelations
  ?.find((relation) => relation.campaignId === campaignId)?.kind, "REVOKED");
assert.equal((await creator(teamUrl, "POST", { action: "INVITE", campaignId, email, name: "Nguyễn Thu An" })).status, 200);
assert.equal((await invited("/api/v1/collaborator/invitations", "POST", { action: "ACCEPT", campaignId })).status, 200);
assert.equal(memberStatus(), "ACTIVE", "Nhận lời mời lại phải khôi phục quyền thành viên.");
const afterRejoin = await admin("/api/v1/admin/overview");
assert.equal(afterRejoin.data.users.find((user) => user.id === invitedId)?.campaignRelations
  ?.find((relation) => relation.campaignId === campaignId)?.kind, "COLLABORATOR");
const task = await creator("/api/v1/campaign-tasks", "POST", {
  action: "CREATE", campaignId, title: "Kiểm tra mẫu lõi lọc", detail: "Ghi kết quả thử tại Đà Nẵng.", assigneeUserId: invitedId,
});
assert.equal(task.status, 201, JSON.stringify(task.data));
assert.equal((await invited("/api/v1/campaign-tasks", "POST", {
  action: "UPDATE_STATUS", campaignId, taskId: task.data.data.taskId, status: "IN_PROGRESS",
})).status, 200);
assert.equal((await creator(teamUrl, "POST", {
  action: "UPDATE_PERMISSIONS", campaignId, email, canUpdate: false, canReply: false, canViewAi: false,
})).status, 200);
assert.equal((await creator("/api/v1/creator/campaigns", "POST", { action: "LAUNCH", campaignId })).status, 200);
assert.equal((await invited("/api/v1/collaborator/campaigns", "POST", {
  action: "PUBLISH_UPDATE", campaignId, title: "Tiến độ thử nghiệm lõi lọc", body: "Nhóm đã bắt đầu ghi chép kết quả của từng mẫu lọc tại Đà Nẵng.",
})).status, 403);
assert.equal((await creator(teamUrl, "POST", { action: "REMOVE", campaignId, email })).status, 200);
assert.equal((await invited("/api/v1/campaign-tasks", "POST", {
  action: "UPDATE_STATUS", campaignId, taskId: task.data.data.taskId, status: "DONE",
})).status, 403);
assert.equal((await creator("/api/v1/campaign-tasks", "POST", {
  action: "CREATE", campaignId, title: "Không giao lại người đã rời", assigneeUserId: invitedId,
})).status, 422);

assert.equal((await admin("/api/v1/admin/actions", "POST", {
  action: "SET_USER_STATUS", payload: { userId: invitedId, status: "SUSPENDED", reason: "Kiểm tra quyền tài khoản local." },
})).status, 200);
assert.equal((await admin("/api/v1/admin/actions", "POST", {
  action: "SET_USER_STATUS", payload: { userId: "usr_moc", status: "SUSPENDED", reason: "Không nên khóa hồ sơ seed." },
})).status, 422);
assert.equal((await admin("/api/v1/admin/actions", "POST", {
  action: "SET_USER_STATUS", payload: { userId: "usr_khanh_an", status: "SUSPENDED", reason: "Không được tự khóa." },
})).status, 409);
assert.equal((await invited("/api/v1/auth/session")).data.data, null);
const portfolio = await creator("/api/v1/creator/portfolio");
assert.ok(portfolio.data.campaigns.some((item) => item.id === campaignId), "Admin đổi trạng thái user làm mất chiến dịch.");

const db = new DatabaseSync(join(process.cwd(), ".local-data", `${dbName}.sqlite`), { readOnly: true });
try {
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(db.prepare("SELECT status FROM campaign_invitations WHERE campaign_id=? AND email=?").get(campaignId, email), undefined);
  const membership = db.prepare("SELECT role,status FROM campaign_members WHERE campaign_id=? AND user_id=?").get(campaignId, invitedId);
  assert.equal(membership?.role, "COLLABORATOR");
  assert.equal(membership?.status, "REVOKED");
  assert.deepEqual(db.prepare("SELECT role FROM user_roles WHERE user_id=? ORDER BY role").all(invitedId)
    .map((row) => row.role), ["BACKER"], "Cộng tác viên không được lưu thành quyền tài khoản toàn cục.");
  assert.equal(db.prepare("SELECT status FROM campaign_tasks WHERE id=?").get(task.data.data.taskId)?.status, "IN_PROGRESS");
  const statusEvent = db.prepare("SELECT status, reason, actor_user_id AS actorId FROM user_status_events WHERE user_id=? ORDER BY changed_at DESC LIMIT 1").get(invitedId);
  assert.equal(statusEvent?.status, "SUSPENDED");
  assert.equal(statusEvent?.reason, "Kiểm tra quyền tài khoản local.");
  assert.equal(statusEvent?.actorId, "usr_khanh_an");
} finally { db.close(); }
const dbWrite = new DatabaseSync(join(process.cwd(), ".local-data", `${dbName}.sqlite`));
try {
  dbWrite.exec("PRAGMA foreign_keys=ON");
  assert.throws(() => dbWrite.prepare(`INSERT INTO campaign_tasks
    (id,campaign_id,assignee_user_id,created_by_user_id,title,status,detail,created_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(`invalid_${Date.now()}`, campaignId, "usr_minh_anh",
      "usr_hoang_linh", "Việc sai nhóm", "TODO", "", new Date().toISOString()),
    /task member (outside campaign|revoked)/);
  assert.throws(() => dbWrite.prepare(`INSERT INTO campaign_tasks
    (id,campaign_id,assignee_user_id,created_by_user_id,title,status,detail,created_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(`revoked_${Date.now()}`, campaignId, invitedId,
      "usr_hoang_linh", "Việc sai quyền", "TODO", "", new Date().toISOString()),
    /task member revoked/);
} finally { dbWrite.close(); }
console.log(`PASS team membership: rời nhóm, mời lại, giữ lịch sử việc, Admin khóa tài khoản, SQLite FK hợp lệ. ${campaignId}`);
