import assert from "node:assert/strict";
import { join } from "node:path";

const baseUrl = process.env.GOP_PREVIEW_URL;
if (!baseUrl || !["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname)) {
  throw new Error("Đặt GOP_PREVIEW_URL tới server test local trước khi chạy.");
}

function browser() {
  const jar = new Map();
  return async (path, method = "GET", body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      assert.ok(cookie.length < 4096, "Cookie bản demo vượt giới hạn");
      const pair = cookie.split(";")[0];
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const text = await response.text();
    try { return { status: response.status, data: JSON.parse(text) }; }
    catch { return { status: response.status, data: text }; }
  };
}

const backer = browser();
const other = browser();
const campaignId = "cmp_orbit";
const slug = "orbit-one-ca-phe-thong-minh";
const endpoint = "/api/v1/me/dashboard";
const detail = () => backer(`/api/v1/campaigns/${slug}`);
const act = (action, payload) => backer(endpoint, "POST", { action, payload: { campaignId, ...payload } });
const roots = (campaign) => campaign.comments;
const find = (campaign, id) => roots(campaign).flatMap((row) => [row, ...(row.replies ?? [])])
  .find((row) => row.id === id);

assert.equal((await backer(endpoint, "POST", {
  action: "CREATE_COMMENT", payload: { campaignId, body: "Khách chưa đăng nhập" },
})).status, 401);
const signedIn = await backer("/api/v1/auth/session", "POST", {
  mode: "SIGN_IN", email: "minhanh@example.com", password: "gop12345",
});
assert.equal(signedIn.status, 200, JSON.stringify(signedIn.data));
assert.equal((await act("CREATE_COMMENT", { body: "ok" })).status, 422);
assert.equal((await act("CREATE_COMMENT", {
  body: "Không có cha hợp lệ", parentId: "lv_cm_1",
})).status, 404);
assert.equal((await act("LIKE_COMMENT", { commentId: "lv_cm_1", liked: true })).status, 404);

const start = await detail();
assert.equal(start.status, 200);
const baseline = find(start.data, "cm_1").likes;
const body = `Mình đang tìm hiểu chế độ ghi nhớ hạt, câu hỏi thử ${Date.now()}.`;
const posted = await act("ASK_QUESTION", { body });
assert.equal(posted.status, 200, JSON.stringify(posted.data));
assert.equal(posted.data.data.persisted, true);
const newId = posted.data.data.recordId;
assert.ok(newId);
const answer = `Mình cũng muốn biết nhóm đã thử với cà phê rang đậm chưa? ${Date.now()}`;
const replied = await act("CREATE_COMMENT", { parentId: "cm_1", body: answer });
assert.equal(replied.status, 200, JSON.stringify(replied.data));
assert.equal(replied.data.data.persisted, true);
const replyId = replied.data.data.recordId;

const afterPost = await detail();
assert.equal(roots(afterPost.data).filter((row) => row.id === newId).length, 1);
assert.equal(find(afterPost.data, "cm_1").replies.filter((row) => row.id === replyId).length, 1);
assert.equal(find(afterPost.data, replyId).body, answer);

const liked = await act("LIKE_COMMENT", { commentId: "cm_1", liked: true });
assert.equal(liked.status, 200, JSON.stringify(liked.data));
assert.deepEqual({ liked: liked.data.data.liked, likes: liked.data.data.likes },
  { liked: true, likes: baseline + 1 });
assert.equal(find((await detail()).data, "cm_1").likes, baseline + 1);
const again = await act("LIKE_COMMENT", { commentId: "cm_1", liked: true });
assert.equal(again.data.data.likes, baseline + 1, "Thích lại không được cộng trùng");
assert.equal((await act("LIKE_COMMENT", { commentId: replyId, liked: true })).data.data.likes, 1);

const page = await backer(`/projects/${slug}?tab=comments`);
assert.equal(page.status, 200);
assert.ok(page.data.includes(body), "Trang công khai thiếu câu hỏi sau khi tải lại");
assert.ok(page.data.includes(answer), "Trang công khai thiếu trả lời sau khi tải lại");
assert.match(page.data, /aria-pressed="true"/, "Trang phải hiện trạng thái đã thích của người xem");

const unliked = await act("LIKE_COMMENT", { commentId: "cm_1", liked: false });
assert.equal(unliked.data.data.likes, baseline);
assert.equal(find((await detail()).data, "cm_1").likes, baseline);

if (process.env.GOP_EXPECT_LOCAL_DB_NAME) {
  const { DatabaseSync } = await import("node:sqlite");
  const creator = await other("/api/v1/auth/session", "POST", {
    mode: "SIGN_IN", email: "linh@orbit.vn", password: "gop12345",
  });
  assert.equal(creator.status, 200);
  const wrongCampaign = await other("/api/v1/creator/operations", "POST", {
    action: "REPLY_COMMENT", payload: {
      campaignId: "cmp_orbit_drip", commentId: "cm_2", body: "Không được ghi nhầm qua dự án khác.",
    },
  });
  assert.equal(wrongCampaign.status, 404, "Không được trả lời bình luận ORBIT One trong ORBIT Drip");
  const shared = await other(`/api/v1/campaigns/${slug}`);
  assert.equal(find(shared.data, newId).body, body, "Creator ở phiên khác chưa thấy nội dung chung");
  assert.equal(find(shared.data, replyId).body, answer);
  const teamAnswer = `Nhóm sẽ đăng video thử hạt Cầu Đất sau khi chốt lô mẫu. ${Date.now()}`;
  const teamReply = await other("/api/v1/creator/operations", "POST", {
    action: "REPLY_COMMENT", payload: { campaignId, commentId: "cm_2", body: teamAnswer },
  });
  assert.equal(teamReply.status, 200, JSON.stringify(teamReply.data));
  const teamRow = find((await detail()).data, "cm_2").replies.find((row) => row.body === teamAnswer);
  assert.ok(teamRow, "Backer chưa thấy lời đáp từ khu vận hành Creator");
  const db = new DatabaseSync(join(process.cwd(), ".local-data",
    `${process.env.GOP_EXPECT_LOCAL_DB_NAME}.sqlite`));
  try {
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM comment_targets WHERE campaign_id = ? AND id = ?")
      .get(campaignId, replyId).n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM comment_likes WHERE campaign_id = ? AND comment_id = ?")
      .get(campaignId, replyId).n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM comment_targets WHERE campaign_id = ? AND id = ? AND parent_id = ?")
      .get(campaignId, teamRow.id, "cm_2").n, 1);
  } finally { db.close(); }
}

console.log(process.env.GOP_EXPECT_LOCAL_DB_NAME
  ? "OK SQLite: bình luận/trả lời/thích đọc chung giữa phiên, reload giữ trạng thái, FK hợp lệ."
  : "OK cookie: bình luận/trả lời/thích còn sau reload trong cùng trình duyệt.");
