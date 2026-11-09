import assert from "node:assert/strict";

const baseUrl = process.env.GOP_PREVIEW_URL ?? "http://localhost:3000";
const dbName = process.env.GOP_EXPECT_LOCAL_DB_NAME;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname)) {
  throw new Error("Bộ test SQLite chỉ được gọi vào server trên máy.");
}
if (!dbName || !/^[a-z0-9_-]+$/i.test(dbName) || dbName === "gop-mock") {
  throw new Error("Đặt GOP_EXPECT_LOCAL_DB_NAME là tên DB test riêng trước khi chạy.");
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
const collaborator = browser();
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
assert.equal(before.data.data.file, `.local-data/${dbName}.sqlite`, "Server đang trỏ nhầm DB.");
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
  addOns: [], collaborators: [{ id: 1, email: "giahuy@orbit.vn", name: "Lê Gia Huy",
    canUpdate: true, canReply: true, canViewAi: false }],
});
assert.equal(created.status, 201, JSON.stringify(created.data));
const campaignId = created.data.data.campaignId;
assert.match(campaignId, /^cmp_preview_[a-f0-9]{12}$/);

const extraDraft = await creator(campaignRoute, "POST", {
  action: "CREATE", draft: { title: "Bản nháp chỉ để kiểm xóa" },
  rewards: [{ id: 1, title: "Gói thử", amount: "100000", delivery: "03/2027", limit: "5" }],
  addOns: [], collaborators: [],
});
assert.equal(extraDraft.status, 201, JSON.stringify(extraDraft.data));
const extraDraftId = extraDraft.data.data.campaignId;
assert.equal((await admin(campaignRoute, "POST", { action: "DELETE_DRAFT", campaignId: extraDraftId })).status, 403);
assert.equal((await creator(campaignRoute, "POST", { action: "DELETE_DRAFT", campaignId: extraDraftId })).status, 200);
assert.ok(!(await admin("/api/v1/local-db")).data.data.campaigns.some((item) => item.id === extraDraftId),
  "Bản nháp đã xóa vẫn nằm trong bảng campaigns của SQLite");
const removedPage = await creator(`/creator/campaigns/${extraDraftId}/manage`);
assert.ok(String(removedPage.data).includes("404 · Không tìm thấy"),
  "Đường dẫn bản nháp đã xóa vẫn mở được nội dung cũ");

await login(creatorAgain, "linh@orbit.vn");
let portfolio = await creatorAgain("/api/v1/creator/portfolio");
assert.ok(portfolio.data.campaigns.some((item) => item.id === campaignId && item.status === "DRAFT"));
assert.ok(portfolio.data.campaigns.filter((item) => item.ownership === "OWNER").length >= 4);
const submitted = await creator(campaignRoute, "POST", { action: "SUBMIT", campaignId });
assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
assert.equal((await creator(campaignRoute, "POST", { action: "DELETE_DRAFT", campaignId })).status, 409,
  "Hồ sơ đã gửi duyệt không được xóa như bản nháp mới");
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
assert.equal(dashboard.data.backedProjects.find((item) => item.campaign.id === "cmp_orbit")?.fulfillmentStatus,
  "NOT_APPLICABLE", "Gói không cần giao không được hiện là đang chờ giao quà");
assert.ok((await backerAgain("/api/v1/auth/session")).data.data.previewState.savedCampaignIds.includes("cmp_orbit"),
  "Tài khoản mới mất danh sách đã lưu sau khi trạng thái chung thay đổi");

const after = await admin("/api/v1/local-db");
assert.equal(after.status, 200);
assert.deepEqual(after.data.data.foreignKeyErrors, []);
const beforeOrbit = before.data.data.campaigns.find((item) => item.id === "cmp_orbit");
const afterOrbit = after.data.data.campaigns.find((item) => item.id === "cmp_orbit");
assert.equal(afterOrbit.pledgedAmount, beforeOrbit.pledgedAmount + pledge.data.totalAmount,
  "Tổng cam kết SQLite phải khớp số vừa ghi ở màn Backer.");
assert.equal(afterOrbit.pledgeCount, beforeOrbit.pledgeCount + 1);
assert.ok(after.data.data.previewCampaigns.some((item) => item.id === campaignId));
assert.ok(after.data.data.recentPledges.some((item) => item.id === pledge.data.authorizationId));
assert.ok(after.data.data.campaigns.find((item) => item.id === campaignId).eventCount >= 6,
  "Nhật ký chiến dịch không giữ đủ lần tạo/gửi/duyệt/sửa.");
assert.ok(after.data.data.campaigns.find((item) => item.id === "cmp_orbit").eventCount >= 1,
  "Cam kết mẫu chưa được ghi vào nhật ký ORBIT.");
assert.equal((await creatorAgain(`/campaigns/${campaignId}/timeline`)).status, 200);
assert.equal((await admin(`/campaigns/${campaignId}/timeline`)).status, 200);
const backerPrelaunch = await backer(`/campaigns/${campaignId}/timeline`);
assert.equal(backerPrelaunch.status, 200);
assert.ok(backerPrelaunch.data.includes(title), "Hồ sơ đã duyệt ở Pre-launch phải xem công khai được.");
assert.ok(!backerPrelaunch.data.includes("Gửi hồ sơ xét duyệt lần 1"),
  "Người ủng hộ không được đọc nhật ký nội bộ của nhóm.");
const guestPrelaunch = await anonymous(`/campaigns/${campaignId}/timeline`);
assert.equal(guestPrelaunch.status, 200);
assert.ok(!guestPrelaunch.data.includes("Gửi hồ sơ xét duyệt lần 1"),
  "Khách không được đọc nhật ký nội bộ của nhóm.");
const backerTimeline = await backer(`/campaigns/cmp_orbit/timeline`);
assert.equal(backerTimeline.status, 200);
assert.ok(backerTimeline.data.includes("Ghi cam kết ủng hộ mẫu"));
assert.ok(!backerTimeline.data.includes("Điều chỉnh quyền cộng tác"),
  "Việc nội bộ không được lộ trong trang người ủng hộ.");
assert.equal((await admin("/local-data")).status, 200);

await login(collaborator, "giahuy@orbit.vn");
const accepted = await collaborator("/api/v1/collaborator/invitations", "POST", {
  action: "ACCEPT", campaignId,
});
assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
const taskRoute = "/api/v1/campaign-tasks";
assert.equal((await anonymous(taskRoute, "POST", { action: "CREATE", campaignId })).status, 401);
assert.equal((await creator(taskRoute, "POST", { action: "CREATE", campaignId,
  title: "Kiểm tra lõi lọc lô đầu", assigneeUserId: "usr_minh_anh" })).status, 422,
"Không được giao việc cho người ngoài nhóm");
const assigned = await creator(taskRoute, "POST", { action: "CREATE", campaignId,
  title: "Kiểm tra lõi lọc lô đầu", detail: "Đo tốc độ lọc trên ba vòi nước ở Đà Nẵng.",
  assigneeUserId: "usr_gia_huy" });
assert.equal(assigned.status, 201, JSON.stringify(assigned.data));
const taskId = assigned.data.data.taskId;
assert.equal((await admin(taskRoute, "POST", { action: "DELETE", campaignId, taskId })).status, 403);
assert.equal((await collaborator(taskRoute, "POST", { action: "EDIT", campaignId, taskId,
  title: "Tự ý sửa tên việc", assigneeUserId: "usr_gia_huy" })).status, 403);
assert.equal((await collaborator(taskRoute, "POST", { action: "UPDATE_STATUS", campaignId, taskId,
  status: "IN_PROGRESS" })).status, 200);
assert.ok((await creator(`/creator/campaigns/${campaignId}/manage`)).data.includes("Kiểm tra lõi lọc lô đầu"));
assert.ok((await collaborator(`/collaborator/campaigns/${campaignId}/manage`)).data.includes("Kiểm tra lõi lọc lô đầu"));
assert.ok(!(await anonymous(`/collaborator/campaigns/${campaignId}/manage`)).data.includes("Kiểm tra lõi lọc lô đầu"));
assert.equal((await creator(taskRoute, "POST", { action: "EDIT", campaignId, taskId,
  title: "Ghi lại tốc độ lọc lô đầu", detail: "Gửi số đo và ảnh vào nhóm.",
  assigneeUserId: "usr_gia_huy" })).status, 200);
assert.ok((await collaborator(`/collaborator/campaigns/${campaignId}/manage`)).data.includes("Ghi lại tốc độ lọc lô đầu"));
assert.equal((await creator(taskRoute, "POST", { action: "EDIT", campaignId, taskId,
  title: "Ghi lại tốc độ lọc lô đầu", detail: "Gửi số đo và ảnh vào nhóm.",
  assigneeUserId: "usr_hoang_linh" })).status, 422,
"Đổi người nhận phải có lý do bàn giao");
assert.equal((await creator(taskRoute, "POST", { action: "EDIT", campaignId, taskId,
  title: "Ghi lại tốc độ lọc lô đầu", detail: "Gửi số đo và ảnh vào nhóm.",
  assigneeUserId: "usr_hoang_linh", handoffNote: "Chủ dự án tự tổng hợp kết quả." })).status, 200);
assert.ok(!(await collaborator(`/collaborator/campaigns/${campaignId}/manage`)).data.includes("Ghi lại tốc độ lọc lô đầu"));
assert.equal((await creator(taskRoute, "POST", { action: "EDIT", campaignId, taskId,
  title: "Ghi lại tốc độ lọc lô đầu", detail: "Gửi số đo và ảnh vào nhóm.",
  assigneeUserId: "usr_gia_huy", handoffNote: "Gia Huy tiếp tục đo lô thứ hai." })).status, 200);
assert.equal((await creator(taskRoute, "POST", { action: "DELETE", campaignId, taskId })).status, 200);
assert.ok(!(await collaborator(`/collaborator/campaigns/${campaignId}/manage`)).data.includes("Ghi lại tốc độ lọc lô đầu"));
const ongoing = await creator(taskRoute, "POST", { action: "CREATE", campaignId,
  title: "Chuẩn bị ảnh lô lọc tiếp theo", detail: "Chọn ảnh rõ chi tiết lõi và tem dán.",
  assigneeUserId: "usr_gia_huy" });
assert.equal(ongoing.status, 201);
const ongoingId = ongoing.data.data.taskId;
assert.equal((await creator(taskRoute, "POST", { action: "EDIT", campaignId, taskId: ongoingId,
  title: "Chuẩn bị ảnh lô lọc tiếp theo", detail: "Chọn ảnh rõ chi tiết lõi và tem dán.",
  assigneeUserId: "usr_hoang_linh", handoffNote: "Linh kiểm tra ảnh gốc trước." })).status, 200);
assert.equal((await creator(taskRoute, "POST", { action: "EDIT", campaignId, taskId: ongoingId,
  title: "Chuẩn bị ảnh lô lọc tiếp theo", detail: "Chọn ảnh rõ chi tiết lõi và tem dán.",
  assigneeUserId: "usr_gia_huy", handoffNote: "Gia Huy chọn ảnh để đăng." })).status, 200);
assert.ok((await collaborator(`/collaborator/campaigns/${campaignId}/manage`)).data.includes("Chuẩn bị ảnh lô lọc tiếp theo"));
assert.ok((await collaborator(`/collaborator/campaigns/${campaignId}/manage`)).data.includes("Lịch sử bàn giao"));
assert.ok((await creatorAgain(`/creator/campaigns/${campaignId}/manage`)).data.includes("Chuẩn bị ảnh lô lọc tiếp theo"));
const creatorOverview = await creatorAgain("/creator");
assert.ok(creatorOverview.data.includes(title) && creatorOverview.data.includes("Việc đang mở"));
const collaboratorOverview = await collaborator("/collaborator");
assert.ok(collaboratorOverview.data.includes("việc nhóm đang chờ bạn làm"));
assert.ok(collaboratorOverview.data.includes(`#cong-viec-nhom`));
assert.equal((await creator(campaignRoute, "POST", { action: "LAUNCH", campaignId })).status, 200);
assert.ok(!(await anonymous(`/projects/${campaignId}`)).data.includes("Chuẩn bị ảnh lô lọc tiếp theo"),
  "Việc nội bộ không được hiện trên trang dự án công khai");
const ownerUpdate = await creator(campaignRoute, "POST", {
  action: "PUBLISH_UPDATE", campaignId,
  title: "Đã thử lõi lọc lô đầu",
  body: "Nhóm đã thử lõi lọc trên vòi nước ở ba căn bếp nhỏ tại Đà Nẵng và đang ghi lại tốc độ lọc.",
});
assert.equal(ownerUpdate.status, 200, JSON.stringify(ownerUpdate.data));
const ownerUpdateId = ownerUpdate.data.data.updateId;
assert.equal((await collaborator("/api/v1/collaborator/campaigns", "POST", {
  action: "EDIT_UPDATE", campaignId, updateId: ownerUpdateId,
  title: "Sửa bài của người khác", body: "Nội dung này không được phép ghi đè lên bài do Chủ dự án đăng.",
})).status, 403);
const collaboratorUpdate = await collaborator("/api/v1/collaborator/campaigns", "POST", {
  action: "PUBLISH_UPDATE", campaignId,
  title: "Đã nhận hình ảnh lô thử",
  body: "Nhóm phần cứng đã nhận bộ ảnh lô thử và đang so lại mã linh kiện trước khi công bố lịch giao.",
});
assert.equal(collaboratorUpdate.status, 201, JSON.stringify(collaboratorUpdate.data));
const updateId = collaboratorUpdate.data.data.id;
const edited = await collaborator("/api/v1/collaborator/campaigns", "POST", {
  action: "EDIT_UPDATE", campaignId, updateId,
  title: "Đã đối chiếu ảnh lô thử",
  body: "Nhóm phần cứng đã đối chiếu ảnh lô thử với mã linh kiện, còn chờ xác nhận mẫu cuối để báo lịch giao.",
});
assert.equal(edited.status, 200, JSON.stringify(edited.data));
let publicDetail = await backer(`/api/v1/campaigns/${campaignId}`);
assert.equal(publicDetail.status, 200);
assert.ok(publicDetail.data.updates.some((item) => item.id === updateId && item.title === "Đã đối chiếu ảnh lô thử"));
assert.equal((await collaborator("/api/v1/collaborator/campaigns", "POST", {
  action: "DELETE_UPDATE", campaignId, updateId: ownerUpdateId,
})).status, 403, "Cộng tác viên không được gỡ bài của Chủ dự án");
assert.equal((await backer(campaignRoute, "POST", { action: "DELETE_UPDATE", campaignId, updateId })).status, 403);
const ownerEdited = await creator(campaignRoute, "POST", {
  action: "EDIT_UPDATE", campaignId, updateId,
  title: "Đã chốt ảnh và linh kiện",
  body: "Chủ dự án đã kiểm tra ảnh và mã linh kiện do cộng tác viên bàn giao, tiếp theo nhóm công bố lịch giao dự kiến.",
});
assert.equal(ownerEdited.status, 200, JSON.stringify(ownerEdited.data));
publicDetail = await backer(`/api/v1/campaigns/${campaignId}`);
assert.ok(publicDetail.data.updates.some((item) => item.id === updateId && item.title === "Đã chốt ảnh và linh kiện"));
assert.equal((await creator(campaignRoute, "POST", { action: "DELETE_UPDATE", campaignId, updateId })).status, 200);
publicDetail = await backer(`/api/v1/campaigns/${campaignId}`);
assert.ok(!publicDetail.data.updates.some((item) => item.id === updateId), "Bản tin đã gỡ vẫn hiện công khai");
assert.ok(publicDetail.data.updates.some((item) => item.id === ownerUpdateId));
const finalDb = await admin("/api/v1/local-db");
assert.deepEqual(finalDb.data.data.foreignKeyErrors, []);
assert.equal(finalDb.data.data.tables.find((item) => item.name === "campaign_tasks").count,
  before.data.data.tables.find((item) => item.name === "campaign_tasks").count + 1,
  "Công việc còn mở phải có một dòng trong SQLite, việc đã xóa không được sót lại");
assert.equal(finalDb.data.data.tables.find((item) => item.name === "campaign_task_handoffs").count,
  before.data.data.tables.find((item) => item.name === "campaign_task_handoffs").count + 2,
  "Lịch sử bàn giao của việc đang mở phải có hai dòng, việc đã xóa không còn handoff");
assert.ok(finalDb.data.data.recentHandoffs.some((item) => item.campaignId === campaignId &&
  item.taskTitle === "Chuẩn bị ảnh lô lọc tiếp theo" && item.note === "Gia Huy chọn ảnh để đăng."));
assert.ok(finalDb.data.data.recentTasks.some((item) => item.id === ongoing.data.data.taskId &&
  item.campaignId === campaignId && item.assignee === "Lê Gia Huy" &&
  item.detail === "Chọn ảnh rõ chi tiết lõi và tem dán."),
"Dòng việc SQLite phải giữ đúng chiến dịch, người nhận và nội dung");
assert.ok(finalDb.data.data.campaigns.find((item) => item.id === campaignId).eventCount >= 11);
console.log(`PASS SQLite local: ${after.data.data.tables.length} bảng; tạo/xóa nháp; giao/sửa/bàn giao/xóa việc, cộng tác viên cập nhật; Creator → Admin → Collaborator → Backer; đăng/sửa/gỡ bản tin; khóa ngoại hợp lệ. Campaign ${campaignId}`);
