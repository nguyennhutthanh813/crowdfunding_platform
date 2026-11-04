const baseUrl = process.env.GOP_PREVIEW_URL ?? "http://localhost:3000";

async function login(email) {
  const response = await fetch(`${baseUrl}/api/v1/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "SIGN_IN",
      email,
      password: "gop12345",
      remember: false,
    }),
  });
  if (!response.ok) throw new Error(`LOGIN_FAILED:${email}:${response.status}`);

  const setCookie = response.headers.get("set-cookie") ?? "";
  const token = setCookie.match(/gop_preview_session=([^;]+)/)?.[1];
  if (!token) throw new Error(`SESSION_COOKIE_MISSING:${email}`);
  return `gop_preview_session=${token}`;
}

async function request(cookie, method, path, body) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  const setCookie = response.headers.get("set-cookie") ?? "";
  const nextToken = setCookie.match(/gop_preview_session=([^;]+)/)?.[1];
  return {
    status: response.status,
    code: result?.error?.code ?? "OK",
    body: result,
    cookie: nextToken ? `gop_preview_session=${nextToken}` : cookie,
  };
}

const [backer, creator, collaborator, admin] = await Promise.all([
  login("minhanh@example.com"),
  login("linh@orbit.vn"),
  login("giahuy@orbit.vn"),
  login("quantri@gop.vn"),
]);

const cases = [
  {
    name: "Guest bị chặn workspace",
    cookie: "",
    method: "GET",
    path: "/api/v1/creator/operations?slug=orbit-one-ca-phe-thong-minh",
    expect: 401,
  },
  {
    name: "Backer đọc dashboard",
    cookie: backer,
    method: "GET",
    path: "/api/v1/me/dashboard",
    expect: 200,
  },
  {
    name: "Backer bị chặn Creator",
    cookie: backer,
    method: "GET",
    path: "/api/v1/creator/operations?slug=orbit-one-ca-phe-thong-minh",
    expect: 403,
  },
  {
    name: "Backer không thể nhắn cho dự án chưa ủng hộ",
    cookie: backer,
    method: "POST",
    path: "/api/v1/me/dashboard",
    body: {
      action: "SEND_MESSAGE",
      payload: {
        campaignId: "cmp_nova",
        recipientUserId: "usr_nova_labs",
        subject: "Hỏi thông tin dự án",
        body: "Mình muốn hỏi thêm về kế hoạch thử nghiệm của nhóm.",
      },
    },
    expect: 403,
  },
  {
    name: "Creator đọc workspace ORBIT",
    cookie: creator,
    method: "GET",
    path: "/api/v1/creator/operations?slug=orbit-one-ca-phe-thong-minh",
    expect: 200,
  },
  {
    name: "Creator đọc vận hành ORBIT Drip",
    cookie: creator,
    method: "GET",
    path: "/api/v1/creator/operations?slug=orbit-drip-bo-pha-cham-2025",
    expect: 200,
  },
  {
    name: "Creator đọc hồ sơ ORBIT Mini",
    cookie: creator,
    method: "GET",
    path: "/api/v1/creator/operations?slug=orbit-mini-bo-pha-gon",
    expect: 200,
  },
  {
    name: "Creator gửi ORBIT Mini duyệt hoặc nhận báo đã gửi",
    cookie: creator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "SUBMIT_REVIEW",
      payload: {
        campaignId: "cmp_orbit_mini",
        title: "ORBIT Mini — bộ pha gọn cho góc làm việc",
        category: "Công nghệ",
        rewardCount: 3,
        addOnCount: 2,
        readiness: 91,
      },
    },
    expect: 200,
    allowAlreadyInReview: true,
  },
  {
    name: "Creator xử lý đơn campaign cũ",
    cookie: creator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "UPDATE_FULFILLMENT",
      payload: {
        campaignId: "cmp_orbit_drip",
        orderId: "ODR-0342",
        status: "SHIPPED",
      },
    },
    expect: 200,
  },
  {
    name: "Creator trả lời đúng tin nhắn của người ủng hộ",
    cookie: creator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "REPLY_MESSAGE",
      payload: {
        campaignId: "cmp_orbit",
        messageId: "msg_backer_orbit_1",
        body: "Nhóm sẽ đặt đơn nhận máy tận nơi và báo mã vận chuyển trước một ngày.",
      },
    },
    expect: 200,
  },
  {
    name: "Creator không thể trả lời tin của campaign khác",
    cookie: creator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "REPLY_MESSAGE",
      payload: {
        campaignId: "cmp_orbit_drip",
        messageId: "msg_backer_orbit_1",
        body: "Nội dung kiểm thử quan hệ sai campaign.",
      },
    },
    expect: 404,
  },
  {
    name: "Creator không sửa đơn ngoài chiến dịch",
    cookie: creator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "UPDATE_FULFILLMENT",
      payload: {
        campaignId: "cmp_orbit_drip",
        orderId: "ODR-KHONG-THUOC-DRIP",
        status: "SHIPPED",
      },
    },
    expect: 404,
  },
  {
    name: "Mã đơn có thật vẫn bị chặn nếu truyền sai campaign",
    cookie: creator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "UPDATE_FULFILLMENT",
      payload: {
        campaignId: "cmp_orbit",
        orderId: "ODR-0342",
        status: "SHIPPED",
      },
    },
    expect: 404,
  },
  {
    name: "Collaborator đọc workspace",
    cookie: collaborator,
    method: "GET",
    path: "/api/v1/creator/operations?slug=orbit-one-ca-phe-thong-minh",
    expect: 200,
  },
  {
    name: "Collaborator bị chặn ORBIT Drip",
    cookie: collaborator,
    method: "GET",
    path: "/api/v1/creator/operations?slug=orbit-drip-bo-pha-cham-2025",
    expect: 403,
  },
  {
    name: "Collaborator xem AI được cấp",
    cookie: collaborator,
    method: "GET",
    path: "/api/v1/creator/ai?campaignId=cmp_orbit",
    expect: 200,
  },
  {
    name: "Collaborator hoàn tất việc của mình",
    cookie: collaborator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "UPDATE_TASK_STATUS",
      payload: {
        campaignId: "cmp_orbit",
        taskId: "task-thermal-update",
        status: "DONE",
      },
    },
    expect: 200,
  },
  {
    name: "Collaborator bị chặn việc người khác",
    cookie: collaborator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: {
      action: "UPDATE_TASK_STATUS",
      payload: {
        campaignId: "cmp_orbit",
        taskId: "task-warranty-reply",
        status: "DONE",
      },
    },
    expect: 403,
  },
  {
    name: "Collaborator bị chặn mở campaign",
    cookie: collaborator,
    method: "POST",
    path: "/api/v1/creator/operations",
    body: { action: "LAUNCH", payload: { campaignId: "cmp_orbit" } },
    expect: 403,
  },
  {
    name: "Admin đọc hàng vận hành",
    cookie: admin,
    method: "GET",
    path: "/api/v1/admin/overview",
    expect: 200,
  },
  {
    name: "Admin duyệt record thật",
    cookie: admin,
    method: "POST",
    path: "/api/v1/admin/actions",
    body: {
      action: "REVIEW_CAMPAIGN",
      payload: {
        reviewId: "rev_01",
        decision: "CHANGES",
        feedback: "Bỏ cụm từ dễ hiểu là thiết bị chẩn đoán.",
      },
    },
    expect: 200,
  },
  {
    name: "Admin xử lý fraud record thật",
    cookie: admin,
    method: "POST",
    path: "/api/v1/admin/actions",
    body: {
      action: "RESOLVE_FRAUD",
      payload: {
        alertId: "fra_001",
        status: "ESCALATED",
        resolution: "Cụm thiết bị trùng và tốc độ cam kết tăng bất thường.",
      },
    },
    expect: 200,
  },
  {
    name: "Admin bị chặn action Backer",
    cookie: admin,
    method: "POST",
    path: "/api/v1/me/dashboard",
    body: {
      action: "SAVE_PROJECT",
      payload: { campaignId: "cmp_orbit", saved: true },
    },
    expect: 403,
  },
  {
    name: "Admin bị chặn AI Creator",
    cookie: admin,
    method: "GET",
    path: "/api/v1/creator/ai?campaignId=cmp_orbit",
    expect: 403,
  },
];

const results = [];
for (const testCase of cases) {
  const result = await request(
    testCase.cookie,
    testCase.method,
    testCase.path,
    testCase.body,
  );
  results.push({
    test: testCase.name,
    http: result.status,
    code: result.code,
    result: result.status === testCase.expect ||
      (testCase.allowAlreadyInReview && result.status === 409 && result.code === "CAMPAIGN_ALREADY_IN_REVIEW")
      ? "PASS" : "FAIL",
  });
}

const portfolioResult = await request(
  creator,
  "GET",
  "/api/v1/creator/portfolio",
);
const ownedCampaigns = portfolioResult.body?.campaigns ?? [];
const ownedIds = new Set(ownedCampaigns.map((campaign) => campaign.id));
const portfolioIsConsistent =
  portfolioResult.status === 200 &&
  portfolioResult.body?.summary?.total === ownedCampaigns.length &&
  ownedCampaigns.length >= 3 &&
  ownedCampaigns.every((campaign) => campaign.ownership === "OWNER") &&
  ownedIds.size === ownedCampaigns.length &&
  ["cmp_orbit", "cmp_orbit_drip", "cmp_orbit_mini"].every((id) => ownedIds.has(id));
results.push({
  test: "Creator đọc đủ chiến dịch sở hữu, kể cả hồ sơ mới",
  http: portfolioResult.status,
  code: portfolioIsConsistent ? `${ownedCampaigns.length}_CAMPAIGNS` : "PORTFOLIO_MISMATCH",
  result: portfolioIsConsistent ? "PASS" : "FAIL",
});

const backerPortfolioResult = await request(
  backer,
  "GET",
  "/api/v1/creator/portfolio",
);
results.push({
  test: "Backer bị chặn danh mục Creator",
  http: backerPortfolioResult.status,
  code: backerPortfolioResult.code,
  result: backerPortfolioResult.status === 403 ? "PASS" : "FAIL",
});

const taskWrite = await request(
  collaborator,
  "POST",
  "/api/v1/creator/operations",
  {
    action: "UPDATE_TASK_STATUS",
    payload: {
      campaignId: "cmp_orbit",
      taskId: "task-bean-question",
      status: "DONE",
    },
  },
);
const taskReload = await request(
  taskWrite.cookie,
  "GET",
  "/api/v1/creator/operations?slug=orbit-one-ca-phe-thong-minh",
);
const persistedTask = taskReload.body?.data?.tasks?.find(
  (task) => task.id === "task-bean-question",
);
results.push({
  test: "Task còn nguyên sau khi đọc lại",
  http: taskReload.status,
  code: persistedTask?.status ?? "MISSING",
  result:
    taskWrite.status === 200 && persistedTask?.status === "DONE"
      ? "PASS"
      : "FAIL",
});

const reviewWrite = await request(admin, "POST", "/api/v1/admin/actions", {
  action: "REVIEW_CAMPAIGN",
  payload: {
    reviewId: "rev_02",
    decision: "APPROVED",
    feedback: "",
  },
});
const reviewReload = await request(
  reviewWrite.cookie,
  "GET",
  "/api/v1/admin/overview",
);
const reviewStillQueued = reviewReload.body?.reviewQueue?.some(
  (review) => review.id === "rev_02",
);
results.push({
  test: "Hồ sơ đã duyệt rời hàng chờ sau tải lại",
  http: reviewReload.status,
  code: reviewStillQueued === false ? "REMOVED" : "STILL_QUEUED",
  result:
    reviewWrite.status === 200 && reviewStillQueued === false
      ? "PASS"
      : "FAIL",
});

const fraudWrite = await request(admin, "POST", "/api/v1/admin/actions", {
  action: "RESOLVE_FRAUD",
  payload: {
    alertId: "fra_002",
    status: "CLEARED",
    resolution: "Đã đối chiếu thiết bị và xác minh giao dịch hợp lệ.",
  },
});
const fraudReload = await request(
  fraudWrite.cookie,
  "GET",
  "/api/v1/admin/overview",
);
const persistedAlert = fraudReload.body?.alerts?.find(
  (alert) => alert.id === "fra_002",
);
results.push({
  test: "Kết luận fraud còn nguyên sau tải lại",
  http: fraudReload.status,
  code: persistedAlert?.status ?? "MISSING",
  result:
    fraudWrite.status === 200 && persistedAlert?.status === "CLEARED"
      ? "PASS"
      : "FAIL",
});

const messageReadWrite = await request(
  backer,
  "POST",
  "/api/v1/me/dashboard",
  {
    action: "MARK_MESSAGE_READ",
    payload: { messageId: "msg_1" },
  },
);
const messageReadReload = await request(
  messageReadWrite.cookie,
  "GET",
  "/api/v1/me/dashboard",
);
const persistedMessage = messageReadReload.body?.messages?.find(
  (message) => message.id === "msg_1",
);
results.push({
  test: "Tin đã đọc còn nguyên sau tải lại",
  http: messageReadReload.status,
  code: persistedMessage?.unread === false ? "READ" : "UNREAD",
  result:
    messageReadWrite.status === 200 && persistedMessage?.unread === false
      ? "PASS"
      : "FAIL",
});

const sentSubject = "Hỏi lịch nhận máy ORBIT One";
const messageSendWrite = await request(
  messageReadWrite.cookie,
  "POST",
  "/api/v1/me/dashboard",
  {
    action: "SEND_MESSAGE",
    payload: {
      campaignId: "cmp_orbit",
      recipientUserId: "usr_hoang_linh",
      subject: sentSubject,
      body: "Mình ở Đà Nẵng, nhóm cho mình hỏi lịch dự kiến chốt màu máy nhé.",
    },
  },
);
const messageSendReload = await request(
  messageSendWrite.cookie,
  "GET",
  "/api/v1/me/dashboard",
);
const persistedSentMessage = messageSendReload.body?.sentMessages?.find(
  (message) => message.subject === sentSubject,
);
results.push({
  test: "Tin đã gửi còn nguyên sau tải lại",
  http: messageSendReload.status,
  code: persistedSentMessage ? "SENT" : "MISSING",
  result:
    messageSendWrite.status === 200 && persistedSentMessage ? "PASS" : "FAIL",
});

const updateTitle = "Đã chốt số seri bản mẫu ORB-P4";
const updateWrite = await request(
  creator,
  "POST",
  "/api/v1/creator/operations",
  {
    action: "PUBLISH_UPDATE",
    payload: {
      campaignId: "cmp_orbit",
      title: updateTitle,
      body: "Nhóm đã đối chiếu số seri và đính kèm bảng nhiệt độ của 200 chu kỳ thử.",
    },
  },
);
const updateReload = await request(
  updateWrite.cookie,
  "GET",
  "/api/v1/creator/operations?slug=orbit-one-ca-phe-thong-minh",
);
const persistedUpdate = updateReload.body?.data?.updateHistory?.find(
  (update) => update.title === updateTitle,
);
results.push({
  test: "Bản tin chiến dịch còn nguyên sau tải lại",
  http: updateReload.status,
  code: persistedUpdate ? "PUBLISHED" : "MISSING",
  result: updateWrite.status === 200 && persistedUpdate ? "PASS" : "FAIL",
});

console.table(results);
const failed = results.filter((result) => result.result === "FAIL");
if (failed.length) {
  throw new Error(`ROLE_PERMISSION_MATRIX_FAILED:${failed.length}`);
}
console.log(`ROLE_PERMISSION_MATRIX_PASSED:${results.length}/${results.length}`);
