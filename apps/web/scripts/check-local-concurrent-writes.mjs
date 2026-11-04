import assert from "node:assert/strict";

const baseUrl = process.env.GOP_PREVIEW_URL;
const secondUrl = process.env.GOP_PREVIEW_URL_2;
const databaseName = process.env.GOP_EXPECT_LOCAL_DB_NAME;
if (!baseUrl || !["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname)) {
  throw new Error("GOP_PREVIEW_URL phải trỏ tới server test local.");
}
if (secondUrl && !["localhost", "127.0.0.1"].includes(new URL(secondUrl).hostname)) {
  throw new Error("GOP_PREVIEW_URL_2 phải trỏ tới server test local.");
}
if (!databaseName || !/^[a-z0-9_-]{1,50}$/i.test(databaseName) || databaseName === "gop-mock") {
  throw new Error("Chỉ chạy trên GOP_EXPECT_LOCAL_DB_NAME là file test riêng, không dùng gop-mock.");
}

function browser(origin = baseUrl) {
  const jar = new Map();
  return async (path, method = "GET", body) => {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: {
        Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return { status: response.status, data: await response.json() };
  };
}

const admin = browser();
assert.equal((await admin("/api/v1/auth/session", "POST", {
  mode: "SIGN_IN", email: "quantri@gop.vn", password: "gop12345",
})).status, 200);
const database = await admin("/api/v1/local-db");
assert.equal(database.status, 200, "Server cần chạy chế độ SQLite local.");
assert.equal(database.data.data.file, `.local-data/${databaseName}.sqlite`,
  "Tên database của server khác file test được chỉ định.");

const backer = browser();
assert.equal((await backer("/api/v1/auth/session", "POST", {
  mode: "SIGN_IN", email: "minhanh@example.com", password: "gop12345",
})).status, 200);
const secondBacker = secondUrl ? browser(secondUrl) : backer;
if (secondUrl) {
  const secondAdmin = browser(secondUrl);
  assert.equal((await secondAdmin("/api/v1/auth/session", "POST", {
    mode: "SIGN_IN", email: "quantri@gop.vn", password: "gop12345",
  })).status, 200);
  assert.equal((await secondAdmin("/api/v1/local-db")).data.data.file,
    `.local-data/${databaseName}.sqlite`, "Hai server phải dùng cùng file SQLite test.");
  assert.equal((await secondBacker("/api/v1/auth/session", "POST", {
    mode: "SIGN_IN", email: "minhanh@example.com", password: "gop12345",
  })).status, 200);
}

const runId = crypto.randomUUID().slice(0, 8);
const bodies = Array.from({ length: 12 }, (_, index) =>
  `Mình hỏi thêm về thời gian giao lô thử ở Đà Nẵng. Lượt kiểm ${runId}-${index + 1}.`);
const results = await Promise.all(bodies.map((body, index) =>
  (index % 2 === 0 ? backer : secondBacker)("/api/v1/me/dashboard", "POST", {
    action: "ASK_QUESTION", payload: { campaignId: "cmp_orbit", body },
  })));
assert.ok(results.every((item) => item.status === 200 || item.status === 409),
  `Có request lỗi ngoài dự kiến: ${results.map((item) => item.status).join(", ")}`);
assert.ok(results.every((item) => item.status !== 409 || item.data.error?.code === "LOCAL_DB_STALE"),
  "Lượt xung đột cần trả mã LOCAL_DB_STALE để giao diện hướng dẫn thử lại.");
const succeeded = results.flatMap((item, index) => item.status === 200
  ? [{ id: item.data.data.recordId, body: bodies[index] }] : []);
assert.ok(succeeded.length > 0, "Không có câu hỏi nào được ghi.");

const detail = await backer("/api/v1/campaigns/orbit-one-ca-phe-thong-minh");
assert.equal(detail.status, 200);
for (const item of succeeded) {
  assert.equal(detail.data.comments.filter((comment) =>
    comment.id === item.id && comment.body === item.body).length, 1,
  `API đã báo lưu nhưng câu hỏi ${item.id} không còn trong chiến dịch.`);
}
const failedBodies = bodies.filter((_, index) => results[index].status === 409);
assert.ok(failedBodies.every((body) => !detail.data.comments.some((item) => item.body === body)),
  "Request báo xung đột không được ghi âm thầm.");
for (const body of failedBodies) {
  const retried = await backer("/api/v1/me/dashboard", "POST", {
    action: "ASK_QUESTION", payload: { campaignId: "cmp_orbit", body },
  });
  assert.equal(retried.status, 200, `Gửi lại câu hỏi sau 409 thất bại: ${body}`);
  succeeded.push({ id: retried.data.data.recordId, body });
}
const afterRetry = await backer("/api/v1/campaigns/orbit-one-ca-phe-thong-minh");
for (const item of succeeded) {
  assert.equal(afterRetry.data.comments.filter((comment) =>
    comment.id === item.id && comment.body === item.body).length, 1,
  `Câu hỏi ${item.id} không được giữ sau khi gửi lại.`);
}
const after = await admin("/api/v1/local-db");
assert.deepEqual(after.data.data.foreignKeyErrors, []);
console.log(`PASS: ${succeeded.length} câu đã lưu/đọc lại, ${failedBodies.length} lượt báo xung đột rồi gửi lại, SQLite FK 0`);
