import assert from "node:assert/strict";

const baseUrl = process.env.GOP_PREVIEW_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname)) {
  throw new Error("Bộ test SQLite chỉ được gọi vào server trên máy.");
}

function browser() {
  const cookies = new Map();
  return async function request(path, method = "GET", body) {
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
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data };
  };
}

async function login(request, email, password = "gop12345") {
  const result = await request("/api/v1/auth/session", "POST", {
    mode: "SIGN_IN", email, password, remember: false,
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
}

const creator = browser();
const creatorAgain = browser();
const admin = browser();
const backer = browser();
const backerAgain = browser();
const anonymous = browser();
assert.equal((await anonymous("/api/v1/local-db")).status, 401);
const guestTimeline = await anonymous("/campaigns/cmp_orbit/timeline");
assert.equal(guestTimeline.status, 200);
assert.match(guestTimeline.data, /Bạn đang xem với quyền\s*(?:<!-- -->)?Khách/);
assert.ok(!guestTimeline.data.includes("Ghi cam kết ủng hộ mẫu"),
  "Khách không được xem cam kết cá nhân trong lịch sử công khai.");
await login(creator, "linh@orbit.vn");
await login(admin, "quantri@gop.vn");

const before = await admin("/api/v1/local-db");
assert.equal(before.status, 200, "Server chưa bật SQLite local");
assert.deepEqual(before.data.data.foreignKeyErrors, []);
assert.equal((await admin("/api/v1/local-db", "POST", { action: "RESET" })).status, 422);

const suffix = Date.now().toString().slice(-6);
const title = `Bếp Mây ${suffix} — bộ lọc nước cho căn bếp nhỏ`;
const fields = {
  title,
  blurb: "Bộ lọc lắp tại vòi cho gia đình ở nhà thuê, thay lõi dễ và giảm chai nhựa dùng một lần.",
  category: "Đời sống xanh",
  goal: "120000000",
  duration: "30",
  location: "Đà Nẵng",
  story: "Nhóm bắt đầu từ nhu cầu có nước sạch trong những căn bếp nhỏ. Sản phẩm được lắp vào vòi hiện có, làm mẫu tại Đà Nẵng, kiểm tra tốc độ lọc rồi mới đặt vật liệu cho lô đầu.",
  risks: "Nguồn lõi lọc có thể giao trễ. Nhóm sẽ công khai tiến độ theo từng lô và chuẩn bị một nhà cung ứng dự phòng.",
  shippingFee: "30000",
  hasVideo: false,
};
const campaignRoute = "/api/v1/creator/campaigns";
const created = await creator(campaignRoute, "POST", {
  action: "CREATE", draft: fields,
  rewards: [{ id: 1, title: "Bộ lọc lô đầu", amount: "750000", delivery: "03/2027", limit: "100" }],
  addOns: [], collaborators: [],
});
assert.equal(created.status, 201, JSON.stringify(created.data));
const campaignId = created.data.data.campaignId;
assert.match(campaignId, /^cmp_preview_[a-f0-9]{12}$/);

await login(creatorAgain, "linh@orbit.vn");
let portfolio = await creatorAgain("/api/v1/creator/portfolio");
assert.ok(portfolio.data.campaigns.some((item) => item.id === campaignId && item.status === "DRAFT"));
assert.ok(portfolio.data.campaigns.filter((item) => item.ownership === "OWNER").length >= 4);
const submitted = await creator(campaignRoute, "POST", { action: "SUBMIT", campaignId });
assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
const reviewQueue = await admin("/api/v1/admin/overview");
const review = reviewQueue.data.reviewQueue.find((item) => item.title === title);
assert.ok(review, "Admin ở trình duyệt khác chưa thấy hồ sơ");
assert.equal(review.evidence.story, fields.story);

const feedback = "Bổ sung ảnh mẫu và bảng chi phí cho lô đầu, làm rõ cách kiểm tra chất lượng lõi lọc.";
const changes = await admin("/api/v1/admin/actions", "POST", {
  action: "REVIEW_CAMPAIGN", payload: { reviewId: review.id, decision: "CHANGES", feedback },
});
assert.equal(changes.status, 200, JSON.stringify(changes.data));
portfolio = await creatorAgain("/api/v1/creator/portfolio");
const changedCampaign = portfolio.data.campaigns.find((item) => item.id === campaignId);
assert.equal(changedCampaign.status, "DRAFT");
assert.ok(changedCampaign.nextActionDetail.includes("Bổ sung ảnh mẫu"));

const savedAgain = await creator(campaignRoute, "POST", {
  action: "SAVE", campaignId, draft: { risks: `${fields.risks} ${feedback}` },
});
assert.equal(savedAgain.status, 200, JSON.stringify(savedAgain.data));
assert.equal((await creator(campaignRoute, "POST", { action: "SUBMIT", campaignId })).status, 200);
const reviewedAgain = await admin("/api/v1/admin/overview");
const secondReview = reviewedAgain.data.reviewQueue.find((item) => item.title === title);
assert.equal(secondReview.submissionVersion, 2);
assert.equal((await admin("/api/v1/admin/actions", "POST", {
  action: "REVIEW_CAMPAIGN", payload: { reviewId: review.id, decision: "APPROVED", feedback: "Hồ sơ thử đã đủ thông tin để qua vòng duyệt." },
})).status, 200);
portfolio = await creatorAgain("/api/v1/creator/portfolio");
assert.equal(portfolio.data.campaigns.find((item) => item.id === campaignId).status, "PRE_LAUNCH");

const email = `thu-local-${Date.now()}@example.com`;
const password = "mat-khau-demo-2026";
const registration = await backer("/api/v1/auth/session", "POST", {
  mode: "REGISTER", fullName: "Nguyễn Thu Local", email, password,
});
assert.equal(registration.status, 201, JSON.stringify(registration.data));
assert.equal((await backer("/api/v1/me/dashboard", "POST", {
  action: "SAVE_PROJECT", payload: { campaignId: "cmp_orbit", saved: true },
})).status, 200);
const pledge = await backer("/api/v1/pledges/authorize", "POST", {
  campaignId: "cmp_orbit", rewardId: "rw_support", addOnIds: [],
  shippingOptionId: null, bonusAmount: 0, address: null,
});
assert.equal(pledge.status, 201, JSON.stringify(pledge.data));
await login(backerAgain, email, password);
const dashboard = await backerAgain("/api/v1/me/dashboard");
assert.ok(dashboard.data.backedProjects.some((item) => item.campaign.id === "cmp_orbit"));
assert.ok((await backerAgain("/api/v1/auth/session")).data.data.previewState.savedCampaignIds.includes("cmp_orbit"),
  "Tài khoản mới mất danh sách đã lưu sau khi trạng thái chung thay đổi");

const after = await admin("/api/v1/local-db");
assert.equal(after.status, 200);
assert.deepEqual(after.data.data.foreignKeyErrors, []);
assert.ok(after.data.data.previewCampaigns.some((item) => item.id === campaignId));
assert.ok(after.data.data.recentPledges.some((item) => item.id === pledge.data.authorizationId));
assert.ok(after.data.data.campaigns.find((item) => item.id === campaignId).eventCount >= 6,
  "Nhật ký chiến dịch không giữ đủ lần tạo/gửi/duyệt/sửa.");
assert.ok(after.data.data.campaigns.find((item) => item.id === "cmp_orbit").eventCount >= 1,
  "Cam kết mẫu chưa được ghi vào nhật ký ORBIT.");
assert.equal((await creatorAgain(`/campaigns/${campaignId}/timeline`)).status, 200);
assert.equal((await admin(`/campaigns/${campaignId}/timeline`)).status, 200);
const deniedTimeline = await backer(`/campaigns/${campaignId}/timeline`);
assert.ok(!deniedTimeline.data.includes(title),
  "Người ủng hộ không được xem tên hồ sơ local chưa mở gọi vốn.");
assert.ok(deniedTimeline.data.includes("404") || deniedTimeline.status === 404,
  "Trang hồ sơ chưa mở cần hiển thị trạng thái không tìm thấy.");
const guestDenied = await anonymous(`/campaigns/${campaignId}/timeline`);
assert.ok(!guestDenied.data.includes(title), "Khách không được đọc tên hồ sơ local chưa mở.");
const backerTimeline = await backer(`/campaigns/cmp_orbit/timeline`);
assert.equal(backerTimeline.status, 200);
assert.ok(backerTimeline.data.includes("Ghi cam kết ủng hộ mẫu"));
assert.ok(!backerTimeline.data.includes("Điều chỉnh quyền cộng tác"),
  "Việc nội bộ không được lộ trong trang người ủng hộ.");
assert.equal((await admin("/local-data")).status, 200);
console.log(`PASS SQLite local: ${after.data.data.tables.length} bảng, tạo/lưu/gửi/sửa/duyệt chiến dịch qua hai trình duyệt; đăng ký/cam kết/đăng nhập lại; nhật ký phân quyền; khóa ngoại hợp lệ. Campaign ${campaignId}`);
