import assert from "node:assert/strict";

const baseUrl = process.env.GOP_PREVIEW_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname)) {
  throw new Error("Bộ test này chỉ chạy trên server local.");
}

const jar = new Map();
async function request(path, method = "GET", body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    assert.ok(cookie.length < 4096, "Cookie vượt giới hạn thông dụng");
    const pair = cookie.split(";")[0];
    const equals = pair.indexOf("=");
    jar.set(pair.slice(0, equals), pair.slice(equals + 1));
  }
  return { status: response.status, data: await response.json() };
}

async function login(email) {
  const result = await request("/api/v1/auth/session", "POST", {
    mode: "SIGN_IN", email, password: "gop12345",
  });
  assert.equal(result.status, 200, `Không đăng nhập được ${email}`);
}

async function readPage(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; ") },
    redirect: "manual",
  });
  return { status: response.status, html: await response.text() };
}

const campaignPath = "/api/v1/creator/campaigns";
await login("minhanh@example.com");
assert.equal((await request(campaignPath, "POST", { action: "CREATE", draft: { title: "Không có quyền" } })).status, 403);

await login("linh@orbit.vn");
const fields = {
  title: "Bếp Mây — bộ lọc nước cho căn bếp nhỏ",
  blurb: "Một bộ lọc lắp ở vòi để gia đình dễ dùng nước sạch, giảm chai nhựa và thay lõi dễ dàng.",
  category: "Đời sống xanh",
  goal: "120000000",
  duration: "30",
  location: "Đà Nẵng",
  story: "Nhóm bắt đầu từ nhu cầu của các gia đình ở nhà thuê: bếp nhỏ, khó lắp hệ thống lọc lớn. Bếp Mây thử một bộ lọc gọn, lắp được tại vòi và thay lõi đơn giản.",
  risks: "Lõi lọc có thể giao trễ nếu nhà cung ứng thiếu vật liệu. Nhóm sẽ công khai tiến độ lô đầu và có nguồn dự phòng.",
  shippingFee: "30000",
  hasVideo: false,
  coverAssetId: "bep-may-v1",
};
const rewards = [{ id: 1, title: "Bộ lọc lô đầu", amount: "750000", delivery: "03/2027", limit: "100" }];
const collaborators = [{ id: 1, email: "giahuy@orbit.vn", name: "Lê Gia Huy",
  canUpdate: true, canReply: true, canViewAi: false }];
assert.equal((await request(campaignPath, "POST", {
  action: "CREATE", draft: { title: "Ảnh không có trong thư viện", coverAssetId: "https://example.com/a.jpg" },
})).status, 422, "Không nhận đường dẫn ảnh tùy ý từ request");
const created = await request(campaignPath, "POST", {
  action: "CREATE", draft: fields, rewards, addOns: [], collaborators,
});
assert.equal(created.status, 201, JSON.stringify(created.data));
const campaignId = created.data.data.campaignId;
assert.match(campaignId, /^cmp_preview_[a-f0-9]{12}$/);
const restoredPage = await readPage(`/creator/campaigns/new?draft=${campaignId}`);
assert.equal(restoredPage.status, 200);
assert.ok(restoredPage.html.includes(fields.title), "Trang nháp không hiện tiêu đề vừa lưu");
let portfolio = await request("/api/v1/creator/portfolio");
assert.ok(portfolio.data.campaigns.some((item) => item.id === campaignId && item.status === "DRAFT"));

const missing = await request(campaignPath, "POST", { action: "CREATE", draft: { title: "Ý tưởng còn thiếu" } });
assert.equal(missing.status, 201);
assert.equal((await request(campaignPath, "POST", { action: "SUBMIT", campaignId: missing.data.data.campaignId })).status, 422);

const submitted = await request(campaignPath, "POST", { action: "SUBMIT", campaignId });
assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
assert.equal((await request(`/api/v1/campaigns/${campaignId}`)).status, 404,
  "Hồ sơ đang duyệt không được công khai qua API");
assert.equal((await request(campaignPath, "POST", { action: "LAUNCH", campaignId })).status, 409,
  "Chưa duyệt không được mở gọi vốn");
portfolio = await request("/api/v1/creator/portfolio");
assert.ok(portfolio.data.campaigns.some((item) => item.id === campaignId && item.status === "IN_REVIEW"));
assert.equal((await request(campaignPath, "POST", { action: "SAVE", campaignId, draft: { title: "Sửa khi đang duyệt" } })).status, 409);

const newEmail = `test-creator-${Date.now()}@example.com`;
const registered = await request("/api/v1/auth/session", "POST", {
  mode: "REGISTER", fullName: "Nguyễn Thu Hà", email: newEmail, password: "gop12345",
});
assert.equal(registered.status, 201, JSON.stringify(registered.data));
assert.equal((await request("/api/v1/auth/session", "PATCH", { grantRole: "CREATOR" })).status, 200);
portfolio = await request("/api/v1/creator/portfolio");
assert.ok(!portfolio.data.campaigns.some((item) => item.id === campaignId));
const emptyCreatorPage = await readPage("/creator");
assert.ok(emptyCreatorPage.html.includes("Chưa có chiến dịch của bạn"));
assert.equal((await request(campaignPath, "POST", { action: "SAVE", campaignId, draft: { title: "Không phải của Hà" } })).status, 404);
assert.equal((await request(campaignPath, "POST", { action: "LAUNCH", campaignId })).status, 404,
  "Chủ dự án khác không được mở chiến dịch");
const wrongOwnerPage = await readPage(`/creator/campaigns/new?draft=${campaignId}`);
assert.ok(wrongOwnerPage.html.includes("không thuộc tài khoản"), "Trang phải báo rõ nháp không thuộc tài khoản");
const own = await request(campaignPath, "POST", { action: "CREATE", draft: { title: "Gốm Sông Hàn" }, rewards: [] });
assert.equal(own.status, 201, JSON.stringify(own.data));
const secondOwn = await request(campaignPath, "POST", { action: "CREATE", draft: { title: "Vườn rau Bờ Sông" }, rewards: [] });
assert.equal(secondOwn.status, 201, JSON.stringify(secondOwn.data));
portfolio = await request("/api/v1/creator/portfolio");
assert.equal(portfolio.data.campaigns.length, 2, "Một chủ dự án được có nhiều chiến dịch");
assert.ok(portfolio.data.campaigns.some((item) => item.id === own.data.data.campaignId));
assert.ok(portfolio.data.campaigns.some((item) => item.id === secondOwn.data.data.campaignId));
const creatorPage = await readPage("/creator");
assert.ok(creatorPage.html.includes("Gốm Sông Hàn"), "Không gian Creator mới không hiện hồ sơ riêng");
assert.ok(creatorPage.html.includes("Vườn rau Bờ Sông"), "Không gian Creator mới không hiện hồ sơ thứ hai");
assert.ok(creatorPage.html.includes("Bản đồ chiến dịch"), "Thiếu cây quan hệ ở Creator mới");

await login("quantri@gop.vn");
const overview = await request("/api/v1/admin/overview");
const review = overview.data.reviewQueue.find((item) => item.title === fields.title);
assert.ok(review, "Admin không thấy hồ sơ mới trong hàng chờ");
assert.equal(review.evidence.story, fields.story);
assert.equal(review.evidence.rewards[0].amount, 750000);
const approved = await request("/api/v1/admin/actions", "POST", {
  action: "REVIEW_CAMPAIGN", payload: { reviewId: review.id, decision: "APPROVED", feedback: "Đã kiểm tra nội dung bản demo." },
});
assert.equal(approved.status, 200, JSON.stringify(approved.data));

await login("linh@orbit.vn");
portfolio = await request("/api/v1/creator/portfolio");
assert.ok(portfolio.data.campaigns.some((item) => item.id === campaignId && item.status === "PRE_LAUNCH"));
assert.equal((await request(campaignPath, "POST", { action: "SUBMIT", campaignId })).status, 409);
const preview = await readPage(`/projects/${campaignId}`);
assert.equal(preview.status, 200);
assert.ok(preview.html.includes(fields.title));
assert.ok(!preview.html.includes("Góp chọn"), "Hồ sơ mới không được tự gắn nhãn Góp chọn");
const previewDetail = await request(`/api/v1/campaigns/${campaignId}`);
assert.equal(previewDetail.data.visual.imageSrc, "/images/campaigns/bep-may-minh-hoa-v1.webp");
assert.equal(previewDetail.data.visual.imageNote, "Ảnh minh họa · bản demo");
assert.equal(previewDetail.data.rewards[0].featured, false, "Gói chưa có cam kết không được gắn nhãn nổi bật");
assert.equal((await request("/api/v1/pledges/authorize", "POST", {
  campaignId, rewardId: `reward_${campaignId}_1`, addOnIds: [],
  shippingOptionId: `shipping_${campaignId}`, bonusAmount: 0,
  address: { fullName: "Phạm Minh Anh", phone: "0901234567", line1: "12 Lê Lợi", city: "Đà Nẵng" },
})).status, 422, "Chủ dự án không được tự ghi cam kết cho hồ sơ của mình");
const ownerDesk = await readPage(`/creator/campaigns/${campaignId}/manage`);
assert.equal(ownerDesk.status, 200);
assert.ok(ownerDesk.html.includes("Kiểm tra rồi công bố"));
await login("minhanh@example.com");
assert.equal((await request("/api/v1/me/dashboard", "POST", {
  action: "SET_PRELAUNCH_NOTIFICATION", payload: { campaignId, enabled: true },
})).status, 200);
const earlyQuestionBody = "Nhóm đã thử bộ lọc với vòi nước ở nhà thuê chưa?";
const earlyQuestion = await request("/api/v1/me/dashboard", "POST", {
  action: "ASK_QUESTION", payload: { campaignId, body: earlyQuestionBody },
});
assert.equal(earlyQuestion.status, 200, JSON.stringify(earlyQuestion.data));
await login("linh@orbit.vn");
assert.ok((await readPage(`/creator/campaigns/${campaignId}/manage`)).html.includes(earlyQuestionBody),
  "Chủ dự án phải thấy câu hỏi đến trước ngày mở gọi vốn");
const earlyAnswerBody = "Nhóm đã thử trên vòi của hai căn hộ thuê và sẽ bổ sung ảnh lắp thử.";
const earlyAnswer = await request("/api/v1/me/dashboard", "POST", {
  action: "CREATE_COMMENT", payload: { campaignId, parentId: earlyQuestion.data.data.recordId,
    body: earlyAnswerBody },
});
assert.equal(earlyAnswer.status, 200, JSON.stringify(earlyAnswer.data));
assert.equal(earlyAnswer.data.data.badge, "CREATOR");
const launched = await request(campaignPath, "POST", { action: "LAUNCH", campaignId });
assert.equal(launched.status, 200, JSON.stringify(launched.data));
assert.equal((await request(campaignPath, "POST", { action: "LAUNCH", campaignId })).status, 409,
  "Không mở lặp một chiến dịch đã LIVE");

await login("giahuy@orbit.vn");
const collaboratorHome = await readPage("/collaborator");
assert.ok(collaboratorHome.html.includes(fields.title), "Cộng tác viên phải thấy lời mời đúng email");
assert.equal((await request("/api/v1/collaborator/campaigns", "POST", {
  action: "PUBLISH_UPDATE", campaignId, title: "Thử đăng trước khi nhận",
  body: "Chưa được nhận lời mời thì không thể đăng thông tin cho cộng đồng.",
})).status, 403);
assert.equal((await readPage(`/collaborator/campaigns/${campaignId}/manage`)).status, 200);
const accepted = await request("/api/v1/collaborator/invitations", "POST", { action: "ACCEPT", campaignId });
assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
const collaboratorDesk = await readPage(`/collaborator/campaigns/${campaignId}/manage`);
assert.ok(collaboratorDesk.html.includes("Đăng một cập nhật tiến độ"));
const updateTitle = "Lô lõi lọc đầu tiên đã được kiểm tra";
const published = await request("/api/v1/collaborator/campaigns", "POST", {
  action: "PUBLISH_UPDATE", campaignId, title: updateTitle,
  body: "Nhóm đã kiểm tra vật liệu của lô lõi lọc đầu. Tiếp theo sẽ thử lắp trên vòi nước tại ba căn hộ ở Đà Nẵng.",
});
assert.equal(published.status, 201, JSON.stringify(published.data));
const collaboratorComment = await request("/api/v1/me/dashboard", "POST", {
  action: "CREATE_COMMENT", payload: { campaignId, body: "Nhóm sẽ đăng thêm ảnh thử lắp sau đợt kiểm tra tiếp theo." },
});
assert.equal(collaboratorComment.status, 200, JSON.stringify(collaboratorComment.data));
assert.equal(collaboratorComment.data.data.badge, "COLLABORATOR");
assert.ok((await request(`/api/v1/campaigns/${campaignId}`)).data.updates.some((item) => item.title === updateTitle));

await login("minhanh@example.com");
const listed = await request("/api/v1/campaigns?query=Bếp Mây");
assert.ok(listed.data.some((item) => item.id === campaignId && item.status === "LIVE"));
assert.equal((await readPage(`/pledge/${campaignId}`)).status, 200);
const pledgeInput = {
  campaignId, rewardId: `reward_${campaignId}_1`, addOnIds: [],
  shippingOptionId: `shipping_${campaignId}`, bonusAmount: 0,
  address: { fullName: "Phạm Minh Anh", phone: "0901234567", line1: "12 Lê Lợi", city: "Đà Nẵng" },
};
const pledge = await request("/api/v1/pledges/authorize", "POST", pledgeInput);
assert.equal(pledge.status, 201, JSON.stringify(pledge.data));
assert.equal(pledge.data.totalAmount, 780000);
if (process.env.GOP_EXPECT_LOCAL_DB_NAME) {
  const name = process.env.GOP_EXPECT_LOCAL_DB_NAME;
  assert.match(name, /^[a-z0-9_-]{1,50}$/i, "Tên DB test không hợp lệ");
  const [{ DatabaseSync }, { join }] = await Promise.all([
    import("node:sqlite"), import("node:path"),
  ]);
  const db = new DatabaseSync(join(process.cwd(), ".local-data", `${name}.sqlite`), { readOnly: true });
  try {
    const savedAddress = db.prepare(`SELECT a.recipient_name, a.phone, a.address_line, a.province
      FROM pledges p JOIN addresses a ON a.id = p.shipping_address_id
      WHERE p.id = ?`).get(pledge.data.authorizationId);
    assert.deepEqual(savedAddress && {
      fullName: savedAddress.recipient_name, phone: savedAddress.phone,
      line1: savedAddress.address_line, city: savedAddress.province,
    }, pledgeInput.address, "Địa chỉ nhập ở form phải có đủ bốn trường trong SQLite");
  } finally {
    db.close();
  }
}
const detail = await request(`/api/v1/campaigns/${campaignId}`);
assert.equal(detail.data.pledgedAmount, 780000);
assert.equal(detail.data.rewards[0].claimed, 1);
const dashboard = await request("/api/v1/me/dashboard");
assert.ok(dashboard.data.backedProjects?.some((item) => item.campaign.id === campaignId),
  "Backer phải thấy cam kết của chiến dịch mới");
assert.equal(dashboard.data.backedProjects.find((item) => item.campaign.id === campaignId)?.fulfillmentStatus,
  "PENDING", "Gói có địa chỉ giao hàng phải được theo dõi bước giao quà");
assert.equal((await request("/api/v1/me/dashboard", "POST", {
  action: "SAVE_PROJECT", payload: { campaignId, saved: true },
})).status, 200);
assert.equal((await request("/api/v1/me/dashboard", "POST", {
  action: "SET_CREATOR_FOLLOW", payload: { creatorId: "usr_hoang_linh", following: true },
})).status, 200);
const questionBody = "Khi nào nhóm giao bộ lọc ở Đà Nẵng?";
const comment = await request("/api/v1/me/dashboard", "POST", {
  action: "ASK_QUESTION", payload: { campaignId, body: questionBody },
});
assert.equal(comment.status, 200, JSON.stringify(comment.data));
assert.ok(comment.data.data.recordId);
const reply = await request("/api/v1/me/dashboard", "POST", {
  action: "CREATE_COMMENT", payload: { campaignId, parentId: comment.data.data.recordId,
    body: "Mình cũng muốn biết lịch giao lô đầu." },
});
assert.equal(reply.status, 200, JSON.stringify(reply.data));
const detailWithComments = await request(`/api/v1/campaigns/${campaignId}`);
const savedQuestion = detailWithComments.data.comments.find((item) => item.id === comment.data.data.recordId);
assert.equal(savedQuestion.kind, "QUESTION", "Câu hỏi cần giữ loại bản ghi khi đọc lại");
assert.equal(savedQuestion.replies.length, 1);
const questionAssignmentRoute = "/api/v1/creator/questions";
const notificationRoute = "/api/v1/notifications";
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: "usr_gia_huy",
})).status, 403, "Backer không được phân công câu hỏi");
assert.equal((await request(notificationRoute)).status, 403, "Backer không được xem việc của cộng tác viên");
const message = await request("/api/v1/me/dashboard", "POST", {
  action: "SEND_MESSAGE", payload: { campaignId, recipientUserId: "usr_hoang_linh",
    subject: "Hỏi về lõi lọc", body: "Nhóm có bán lõi thay thế sau khi giao không?" },
});
assert.equal(message.status, 200, JSON.stringify(message.data));

await login("linh@orbit.vn");
portfolio = await request("/api/v1/creator/portfolio");
assert.ok(portfolio.data.campaigns.some((item) => item.id === campaignId && item.pledgedAmount === 780000));
const liveDesk = await readPage(`/creator/campaigns/${campaignId}/manage`);
assert.ok(liveDesk.html.includes("Phạm Minh Anh"), "Creator phải thấy cam kết từ Backer");
assert.ok(liveDesk.html.includes(questionBody) && liveDesk.html.includes("Cần nhóm trả lời"),
  "Bàn Chủ dự án phải thấy câu hỏi đang chờ của đúng chiến dịch");
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: "khong-co-cau-hoi", assigneeUserId: "usr_gia_huy",
})).status, 404);
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: "usr_khanh_an",
})).status, 422, "Không giao cho người ngoài nhóm hoặc chưa có quyền trả lời");
const assigned = await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: "usr_gia_huy",
});
assert.equal(assigned.status, 200, JSON.stringify(assigned.data));
assert.ok((await readPage(`/creator/campaigns/${campaignId}/manage`)).html.includes("Người phụ trách: Lê Gia Huy"));
assert.equal((await request(notificationRoute)).status, 403, "Chủ dự án không được xem thông báo riêng của cộng tác viên");
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: "usr_gia_huy",
})).status, 200, "Giao lại cùng người phải là thao tác idempotent");

await login("giahuy@orbit.vn");
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: null,
})).status, 403, "Cộng tác viên không được tự đổi phân công");
const unreadNotification = await request(notificationRoute);
assert.equal(unreadNotification.status, 200, JSON.stringify(unreadNotification.data));
const ownNotifications = unreadNotification.data.data.items.filter((item) =>
  item.campaignId === campaignId && item.commentId === comment.data.data.recordId);
assert.equal(ownNotifications.length, 1, "Một lần giao không sinh thông báo trùng");
const notification = ownNotifications[0];
assert.equal(notification.readAt, null);
assert.equal(notification.commentId, comment.data.data.recordId);
assert.equal(notification.campaignId, campaignId);
assert.equal(notification.answered, false);
assert.equal((await request(notificationRoute, "PATCH", {
  campaignId, commentId: comment.data.data.recordId, assignedAt: "2020-01-01T00:00:00Z",
})).status, 404, "Không đánh dấu nhầm lượt giao cũ");
const markedRead = await request(notificationRoute, "PATCH", {
  campaignId, commentId: notification.commentId, assignedAt: notification.assignedAt,
});
assert.equal(markedRead.status, 200, JSON.stringify(markedRead.data));
assert.ok(markedRead.data.data.readAt);
assert.equal((await request(notificationRoute)).data.data.unreadCount,
  unreadNotification.data.data.unreadCount - 1);
await login("linh@orbit.vn");
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: null,
})).status, 200);
await login("giahuy@orbit.vn");
const afterUnassign = (await request(notificationRoute)).data.data;
assert.equal(afterUnassign.items.filter((item) => item.campaignId === campaignId).length, 0,
  "Bỏ phân công phải bỏ mục khỏi hộp thông báo");
assert.equal((await request(notificationRoute, "PATCH", {
  campaignId, commentId: notification.commentId, assignedAt: notification.assignedAt,
})).status, 404, "Không đánh dấu lượt giao đã bị bỏ");
await login("linh@orbit.vn");
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: "usr_gia_huy",
})).status, 200);
await login("giahuy@orbit.vn");
const reassigned = (await request(notificationRoute)).data.data;
assert.equal(reassigned.unreadCount, afterUnassign.unreadCount + 1,
  "Giao lại phải tạo lượt chưa đọc mới");
const reassignedItem = reassigned.items.find((item) => item.campaignId === campaignId &&
  item.commentId === comment.data.data.recordId);
assert.ok(reassignedItem);
assert.equal(reassignedItem.readAt, null);
assert.equal((await request(notificationRoute, "PATCH", {
  campaignId, commentId: notification.commentId, assignedAt: reassignedItem.assignedAt,
})).status, 200);
const collaboratorWithQuestion = await readPage(`/collaborator/campaigns/${campaignId}/manage`);
assert.ok(collaboratorWithQuestion.html.includes(questionBody) &&
  collaboratorWithQuestion.html.includes("Bạn phụ trách câu hỏi này") &&
  collaboratorWithQuestion.html.includes("Trả lời ở đây"),
  "Cộng tác viên phải thấy câu hỏi được giao trong đúng chiến dịch");
const collaboratorReplyBody = "Mình phụ trách cập nhật ảnh lắp thử tại Đà Nẵng cho đợt đầu.";
const collaboratorReply = await request("/api/v1/me/dashboard", "POST", {
  action: "CREATE_COMMENT", payload: { campaignId, parentId: comment.data.data.recordId,
    body: collaboratorReplyBody },
});
assert.equal(collaboratorReply.status, 200, JSON.stringify(collaboratorReply.data));
assert.equal(collaboratorReply.data.data.badge, "COLLABORATOR");
assert.ok((await readPage(`/collaborator/campaigns/${campaignId}/manage`)).html.includes(collaboratorReplyBody));
assert.equal((await request(notificationRoute)).data.data.items.find((item) =>
  item.campaignId === campaignId && item.commentId === comment.data.data.recordId)?.answered, true);

await login("linh@orbit.vn");
assert.ok((await readPage(`/creator/campaigns/${campaignId}/manage`)).html.includes(collaboratorReplyBody),
  "Chủ dự án phải đọc lại phản hồi của cộng tác viên");
assert.equal((await request(questionAssignmentRoute, "POST", {
  campaignId, commentId: comment.data.data.recordId, assigneeUserId: null,
})).status, 409, "Câu hỏi đã được nhóm trả lời không đổi phân công nữa");
const teamReplyBody = "Nhóm dự kiến giao lô đầu trong tháng 3/2027 sau khi kiểm tra lõi lọc.";
const teamReply = await request("/api/v1/me/dashboard", "POST", {
  action: "CREATE_COMMENT", payload: { campaignId, parentId: comment.data.data.recordId, body: teamReplyBody },
});
assert.equal(teamReply.status, 200, JSON.stringify(teamReply.data));
assert.equal(teamReply.data.data.badge, "CREATOR");
assert.ok((await readPage(`/creator/campaigns/${campaignId}/manage`)).html.includes(teamReplyBody),
  "Phản hồi của Chủ dự án phải hiện lại sau khi đọc trang");

await login("giahuy@orbit.vn");
assert.ok((await readPage(`/collaborator/campaigns/${campaignId}/manage`)).html.includes(teamReplyBody));

await login("linh@orbit.vn");
const ownerInbox = await request("/api/v1/me/dashboard");
assert.ok(ownerInbox.data.messages.some((item) => item.subject === "Hỏi về lõi lọc"));
const messageId = ownerInbox.data.messages.find((item) => item.subject === "Hỏi về lõi lọc").id;
const ownerReply = await request(campaignPath, "POST", {
  action: "REPLY_MESSAGE", campaignId, messageId,
  body: "Nhóm sẽ công bố giá lõi thay thế sau khi kiểm tra lô sản xuất đầu tiên.",
});
assert.equal(ownerReply.status, 200, JSON.stringify(ownerReply.data));
await login("minhanh@example.com");
const backerInbox = await request("/api/v1/me/dashboard");
assert.ok(backerInbox.data.messages.some((item) => item.subject === "Phản hồi: Hỏi về lõi lọc"));
const publicDiscussion = await request(`/api/v1/campaigns/${campaignId}`);
const publicQuestion = publicDiscussion.data.comments.find((item) => item.id === comment.data.data.recordId);
assert.ok(publicQuestion.replies.some((item) => item.id === teamReply.data.data.recordId && item.body === teamReplyBody));
assert.ok(publicQuestion.replies.some((item) => item.id === collaboratorReply.data.data.recordId && item.body === collaboratorReplyBody));
assert.ok(publicDiscussion.data.comments.some((item) => item.id === earlyQuestion.data.data.recordId &&
  item.replies.some((reply) => reply.id === earlyAnswer.data.data.recordId)),
  "Trao đổi giai đoạn sắp mở phải còn trên trang dự án khi đã gọi vốn");
assert.ok(!(await request("/api/v1/campaigns/orbit-one-ca-phe-thong-minh")).data.comments
  .some((item) => item.body === questionBody), "Câu hỏi không được lẫn sang chiến dịch mẫu");

await login("quantri@gop.vn");
const adminAfterLaunch = await request("/api/v1/admin/overview");
assert.ok(adminAfterLaunch.data.operations.controllableCampaigns.some((item) => item.id === campaignId));
const suspended = await request("/api/v1/admin/actions", "POST", {
  action: "SET_CAMPAIGN_STATUS", payload: {
    campaignId, status: "SUSPENDED", reason: "Kiểm tra lại thông tin lô lõi lọc trong bản demo.",
  },
});
assert.equal(suspended.status, 200, JSON.stringify(suspended.data));
await login("minhanh@example.com");
assert.equal((await request("/api/v1/pledges/authorize", "POST", pledgeInput)).status, 423,
  "Chiến dịch bị tạm dừng không được nhận thêm cam kết");
assert.equal((await request("/api/v1/me/dashboard", "POST", {
  action: "CREATE_COMMENT", payload: { campaignId, body: "Thử gửi khi đang tạm dừng." },
})).status, 409, "Chiến dịch bị tạm dừng không nhận bình luận mới");
assert.equal((await request("/api/v1/me/dashboard", "POST", {
  action: "LIKE_COMMENT", payload: { campaignId, commentId: comment.data.data.recordId, liked: true },
})).status, 409, "Chiến dịch bị tạm dừng không nhận lượt thích mới");
await login("giahuy@orbit.vn");
assert.equal((await request("/api/v1/collaborator/campaigns", "POST", {
  action: "PUBLISH_UPDATE", campaignId, title: "Cập nhật khi đang tạm dừng",
  body: "Chiến dịch đang tạm dừng thì nhóm không công bố tiến độ mới từ khu cộng tác.",
})).status, 409);
await login("quantri@gop.vn");
assert.equal((await request("/api/v1/admin/actions", "POST", {
  action: "SET_CAMPAIGN_STATUS", payload: {
    campaignId, status: "LIVE", reason: "Đã kiểm tra nội dung lô đầu trong bản demo.",
  },
})).status, 200);
assert.equal((await request(`/api/v1/campaigns/${campaignId}`)).data.status, "LIVE");
const localDb = await request("/api/v1/local-db");
if (localDb.status === 200) {
  assert.deepEqual(localDb.data.data.foreignKeyErrors, []);
  assert.ok(localDb.data.data.campaigns.some((item) =>
    item.id === campaignId && item.status === "LIVE" && item.pledgedAmount === 780000 && item.memberCount === 2));
  const tables = new Map(localDb.data.data.tables.map((item) => [item.name, item.count]));
  assert.ok(tables.get("campaign_comments") >= 3);
  assert.ok(tables.get("question_assignments") >= 1);
  assert.ok(tables.get("campaign_media") >= 1, "Ảnh mẫu phải nối với hồ sơ mới trong SQLite");
  assert.ok(localDb.data.data.recentCampaignMedia.some((item) =>
    item.campaignId === campaignId && item.campaignSlug === campaignId &&
    item.campaignStatus === "LIVE" && item.url === previewDetail.data.visual.imageSrc));
  assert.ok(localDb.data.data.recentQuestionAssignments.some((item) => item.commentId === comment.data.data.recordId));
  assert.ok(localDb.data.data.recentQuestionAssignments.some((item) =>
    item.commentId === comment.data.data.recordId && item.readAt), "SQLite phải lưu thời điểm đã đọc");
  assert.ok(tables.get("campaign_updates") >= 1);
} else assert.equal(localDb.status, 404, "Chế độ cookie không được mở SQLite local");

console.log(`PASS Creator tạo → Admin duyệt → Creator mở → Collaborator nhận/đăng → Backer cam kết/bình luận → ${localDb.status === 200 ? "SQLite FK" : "cookie demo"}`);
