import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { inflateRawSync } from "node:zlib";

const baseUrl = process.env.GOP_PREVIEW_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname)) {
  throw new Error(
    "Bộ test này chỉ chạy ở local, không ghi lên website công khai.",
  );
}
const results = [];
async function check(name, run) {
  try {
    await run();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, reason: error.message });
  }
}

async function request(jar, path, method = "GET", body, raw = false) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    assert.ok(
      cookie.length < 4096,
      "Server gửi cookie vượt kích thước thông dụng",
    );
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

async function login(email, jar = new Map()) {
  const result = await request(jar, "/api/v1/auth/session", "POST", {
    mode: "SIGN_IN",
    email,
    password: "gop12345",
    remember: false,
  });
  assert.equal(result.status, 200, `Không đăng nhập được ${email}`);
  return jar;
}

function readSignedCookiePayload(jar, name) {
  const value = jar.get(name);
  assert.ok(value, `Thiếu cookie ${name}`);
  const payload = value.split(".")[1];
  return JSON.parse(inflateRawSync(Buffer.from(payload, "base64url")).toString());
}
const backer = await login("minhanh@example.com");
const creator = await login("linh@orbit.vn");
const sessionPath = "/api/v1/auth/session";
const dashboardPath = "/api/v1/me/dashboard";
const operationPath = "/api/v1/creator/operations";
const adminActionPath = "/api/v1/admin/actions";

for (const [method, path] of [
  ["PATCH", sessionPath],
  ["POST", dashboardPath],
  ["POST", "/api/v1/auth/recovery"],
  ["PATCH", "/api/v1/auth/recovery"],
]) {
  for (const value of [null, [], "không phải object"]) {
    await check(
      `${method} ${path}: từ chối ${JSON.stringify(value)}`,
      async () => {
        assert.equal((await request(backer, path, method, value)).status, 422);
      },
    );
  }
  await check(`${method} ${path}: JSON hỏng`, async () => {
    assert.equal((await request(backer, path, method, "{", true)).status, 400);
  });
}

await check("Họ tên đăng ký sai kiểu không gây 500", async () => {
  assert.equal(
    (
      await request(new Map(), sessionPath, "POST", {
        mode: "REGISTER",
        email: "test@example.com",
        password: "gop12345",
        fullName: 42,
      })
    ).status,
    422,
  );
});
await check("Hồ sơ sai kiểu bị từ chối", async () => {
  assert.equal(
    (
      await request(backer, sessionPath, "PATCH", {
        profile: { name: 42, headline: "" },
      })
    ).status,
    422,
  );
});
await check("Không lưu dự án không tồn tại", async () => {
  assert.equal(
    (
      await request(backer, dashboardPath, "POST", {
        action: "SAVE_PROJECT",
        payload: { campaignId: "cmp_does_not_exist", saved: true },
      })
    ).status,
    404,
  );
});
await check("Không nhận saved sai kiểu", async () => {
  assert.equal(
    (
      await request(backer, dashboardPath, "POST", {
        action: "SAVE_PROJECT",
        payload: { campaignId: "cmp_orbit", saved: "true" },
      })
    ).status,
    422,
  );
});
await check("Lưu và bỏ lưu đọc lại đúng từ phiên", async () => {
  for (const saved of [true, false]) {
    assert.equal(
      (
        await request(backer, dashboardPath, "POST", {
          action: "SAVE_PROJECT",
          payload: { campaignId: "cmp_orbit", saved },
        })
      ).status,
      200,
    );
    const { data } = await request(backer, sessionPath);
    assert.equal(
      data.data.previewState.savedCampaignIds.includes("cmp_orbit"),
      saved,
    );
  }
});
await check("Không theo dõi chủ dự án không tồn tại", async () => {
  assert.equal(
    (
      await request(backer, dashboardPath, "POST", {
        action: "SET_CREATOR_FOLLOW",
        payload: { creatorId: "usr_unknown", following: true },
      })
    ).status,
    404,
  );
});
await check("Không đánh dấu tin nhắn không thuộc hộp thư", async () => {
  assert.equal(
    (
      await request(backer, dashboardPath, "POST", {
        action: "MARK_MESSAGE_READ",
        payload: { messageId: "msg_backer_orbit_1" },
      })
    ).status,
    404,
  );
});
await check("Sở thích phải thuộc danh sách thật", async () => {
  assert.equal(
    (
      await request(backer, dashboardPath, "POST", {
        action: "UPDATE_INTERESTS",
        payload: { interests: ["unknown", "technology"] },
      })
    ).status,
    422,
  );
});
await check("Thông báo sai kiểu bị từ chối", async () => {
  assert.equal(
    (
      await request(backer, sessionPath, "PATCH", {
        notificationPreferences: { projectUpdates: "yes" },
      })
    ).status,
    422,
  );
});
for (const email of [
  "minhanh@example.com",
  "linh@orbit.vn",
  "giahuy@orbit.vn",
  "quantri@gop.vn",
]) {
  await check(`Lưu thông báo và đọc lại: ${email}`, async () => {
    const jar = await login(email);
    const preferences = {
      projectUpdates: false,
      pledgeStatus: true,
      recommendations: false,
      creatorTasks: true,
    };
    if (email === "quantri@gop.vn") preferences.moderationAlerts = true;
    assert.equal(
      (
        await request(jar, sessionPath, "PATCH", {
          notificationPreferences: preferences,
        })
      ).status,
      200,
    );
    assert.deepEqual(
      (await request(jar, sessionPath)).data.data.previewState
        .notificationPreferences,
      preferences,
    );
    assert.equal(
      (
        await request(jar, dashboardPath, "POST", {
          action: "UPDATE_NOTIFICATION_PREFERENCES",
          payload: preferences,
        })
      ).data.data.persisted,
      true,
    );
  });
}
await check("Mật khẩu hiện tại sai không được báo thành công", async () => {
  assert.equal(
    (
      await request(backer, dashboardPath, "POST", {
        action: "CHANGE_PASSWORD",
        payload: {
          currentPassword: "wrong-demo-password",
          newPassword: "new-demo-only",
        },
      })
    ).status,
    422,
  );
});
await check("Mật khẩu chỉ kiểm tra mô phỏng, không echo giá trị", async () => {
  const result = await request(backer, dashboardPath, "POST", {
    action: "CHANGE_PASSWORD",
    payload: { currentPassword: "gop12345", newPassword: "new-demo-only" },
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.data.persisted, false);
  assert.equal(result.data.data.simulation, true);
  assert.ok(!JSON.stringify(result.data).includes("gop12345"));
  assert.ok(!JSON.stringify(result.data).includes("new-demo-only"));
});
await check("Mã recovery sai kiểu bị từ chối", async () => {
  assert.equal(
    (
      await request(new Map(), "/api/v1/auth/recovery", "PATCH", {
        email: "demo@example.com",
        code: 42,
        password: "new-demo-only",
      })
    ).status,
    422,
  );
});
await check("Recovery ghi rõ không đổi mật khẩu", async () => {
  const result = await request(new Map(), "/api/v1/auth/recovery", "PATCH", {
    email: "demo@example.com",
    code: "GOP-4821",
    password: "new-demo-only",
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.data.persisted, false);
  assert.equal(result.data.data.simulation, true);
});
await check("Thiếu danh sách quyền không gây 500", async () => {
  assert.equal(
    (
      await request(creator, operationPath, "POST", {
        action: "UPDATE_COLLABORATOR_PERMISSIONS",
        payload: { campaignId: "cmp_orbit", memberId: "usr_gia_huy" },
      })
    ).status,
    422,
  );
});
await check("Dự án khác không được nhận bộ AI của ORBIT", async () => {
  assert.equal(
    (await request(creator, "/api/v1/creator/ai?campaignId=cmp_orbit_mini"))
      .status,
    404,
  );
  assert.equal(
    (
      await request(
        creator,
        "/api/v1/creator/assistant?campaignId=cmp_orbit_mini",
      )
    ).status,
    404,
  );
});
await check(
  "Thu hồi quyền có hiệu lực khi đổi sang cộng tác viên",
  async () => {
    const jar = await login("linh@orbit.vn");
    assert.equal(
      (
        await request(jar, operationPath, "POST", {
          action: "UPDATE_COLLABORATOR_PERMISSIONS",
          payload: {
            campaignId: "cmp_orbit",
            memberId: "usr_gia_huy",
            permissions: [],
          },
        })
      ).status,
      200,
    );
    const token = jar.get("gop_platform_preview").split(".")[1];
    const state = JSON.parse(
      inflateRawSync(Buffer.from(token, "base64url")).toString(),
    );
    assert.deepEqual(
      state.collaboratorPermissions["cmp_orbit:usr_gia_huy"],
      [],
    );
    assert.equal(state.collaboratorPermissions.usr_gia_huy, undefined);
    await login("giahuy@orbit.vn", jar);
    assert.equal(
      (await request(jar, "/api/v1/creator/ai?campaignId=cmp_orbit")).status,
      403,
    );
    assert.equal(
      (await request(jar, "/api/v1/creator/assistant?campaignId=cmp_orbit"))
        .status,
      403,
    );
    assert.equal(
      (
        await request(jar, operationPath, "POST", {
          action: "PUBLISH_UPDATE",
          payload: {
            campaignId: "cmp_orbit",
            title: "Cập nhật thử",
            body: "Nội dung thử quyền đã thu hồi",
          },
        })
      ).status,
      403,
    );
    const page = await request(jar, "/collaborator/forecast");
    assert.ok(page.data.includes("Bạn chưa có quyền mở nội dung này"));
    await login("linh@orbit.vn", jar);
    assert.equal(
      (
        await request(jar, operationPath, "POST", {
          action: "UPDATE_COLLABORATOR_PERMISSIONS",
          payload: {
            campaignId: "cmp_orbit",
            memberId: "usr_gia_huy",
            permissions: ["Đăng cập nhật", "Trả lời bình luận", "Xem dự báo"],
          },
        })
      ).status,
      200,
    );
    await login("giahuy@orbit.vn", jar);
    assert.equal(
      (await request(jar, "/api/v1/creator/ai?campaignId=cmp_orbit")).status,
      200,
    );
  },
);
await check(
  "Cookie ký bằng khóa cũ trong source không còn được chấp nhận",
  async () => {
    const oldSecret =
      "gop-preview-only-change-this-secret-before-using-real-accounts";
    const payload = Buffer.from(
      JSON.stringify({
        sessionId: "fake",
        user: { id: "usr_khanh_an", roles: ["ADMIN"], activeRole: "ADMIN" },
        expiresAt: "2099-01-01T00:00:00Z",
      }),
    ).toString("base64url");
    const forged = `${payload}.${createHmac("sha256", oldSecret).update(payload).digest("base64url")}`;
    assert.equal(
      (
        await request(
          new Map([["gop_preview_session", forged]]),
          "/api/v1/admin/overview",
        )
      ).status,
      401,
    );
  },
);

await check("Khóa tài khoản có hiệu lực ngoài phiên quản trị", async () => {
  const jar = await login("quantri@gop.vn");
  const suspend = await request(jar, adminActionPath, "POST", {
    action: "SET_USER_STATUS",
    payload: {
      userId: "usr_gia_huy",
      status: "SUSPENDED",
      reason: "Kiểm tra luồng khóa tài khoản trong bản demo",
    },
  });
  assert.equal(suspend.status, 200);

  const blockedLogin = await request(jar, sessionPath, "POST", {
    mode: "SIGN_IN",
    email: "giahuy@orbit.vn",
    password: "gop12345",
    remember: false,
  });
  assert.equal(blockedLogin.status, 403);
  assert.equal(blockedLogin.data.error.code, "ACCOUNT_SUSPENDED");

  const restore = await request(jar, adminActionPath, "POST", {
    action: "SET_USER_STATUS",
    payload: {
      userId: "usr_gia_huy",
      status: "ACTIVE",
      reason: "Kết thúc ca kiểm tra và mở lại tài khoản",
    },
  });
  assert.equal(restore.status, 200);
  await login("giahuy@orbit.vn", jar);
});

await check(
  "Tạm dừng chiến dịch khóa vận hành và nhận cam kết",
  async () => {
    const jar = await login("quantri@gop.vn");
    const suspend = await request(jar, adminActionPath, "POST", {
      action: "SET_CAMPAIGN_STATUS",
      payload: {
        campaignId: "cmp_orbit",
        status: "SUSPENDED",
        reason: "Kiểm tra liên thông trạng thái chiến dịch",
      },
    });
    assert.equal(suspend.status, 200);

    await login("linh@orbit.vn", jar);
    const operation = await request(jar, operationPath, "POST", {
      action: "PUBLISH_UPDATE",
      payload: {
        campaignId: "cmp_orbit",
        title: "Nội dung không được đăng",
        body: "Chiến dịch đang tạm dừng nên thao tác này phải bị khóa.",
      },
    });
    assert.equal(operation.status, 423);
    assert.equal(operation.data.error.code, "CAMPAIGN_SUSPENDED");
    assert.equal(
      (await request(jar, "/api/v1/creator/ai?campaignId=cmp_orbit")).status,
      423,
    );

    await login("minhanh@example.com", jar);
    const pledge = await request(jar, "/api/v1/pledges/authorize", "POST", {
      campaignId: "cmp_orbit",
      rewardId: "reward_orbit_early",
      addOnIds: [],
      shippingOptionId: "shp_orbit_standard",
      bonusAmount: 0,
      address: {
        fullName: "Nguyễn Minh Anh",
        phone: "0901234567",
        line1: "12 Nguyễn Huệ",
        city: "TP. Hồ Chí Minh",
      },
    });
    assert.equal(pledge.status, 423);
    assert.equal(pledge.data.error.code, "CAMPAIGN_SUSPENDED");

    await login("quantri@gop.vn", jar);
    assert.equal(
      (
        await request(jar, adminActionPath, "POST", {
          action: "SET_CAMPAIGN_STATUS",
          payload: {
            campaignId: "cmp_orbit",
            status: "LIVE",
            reason: "Kết thúc ca kiểm tra và mở lại chiến dịch",
          },
        })
      ).status,
      200,
    );
  },
);

await check("Bản nháp được lưu và khôi phục khi tải lại trang", async () => {
  const jar = await login("linh@orbit.vn");
  const draftTitle = "ORBIT Mini — bản nháp kiểm tra lưu lại";
  const saved = await request(jar, operationPath, "POST", {
    action: "SAVE_DRAFT",
    payload: {
      campaignId: "cmp_orbit_mini",
      draft: {
        title: draftTitle,
        blurb: "Bản nháp dùng để kiểm tra dữ liệu có quay lại sau khi tải trang.",
        category: "Công nghệ",
        goal: "360000000",
        duration: "30",
        location: "TP. Hồ Chí Minh",
        story: "Nội dung câu chuyện đang tiếp tục được nhóm hoàn thiện.",
        risks: "Nhóm đang kiểm tra thêm rủi ro về khuôn vỏ.",
        shippingFee: "45000",
        hasVideo: true,
      },
      rewards: [],
      addOns: [],
      collaborators: [],
    },
  });
  assert.equal(saved.status, 200);
  const platform = readSignedCookiePayload(jar, "gop_platform_preview");
  assert.equal(platform.campaignDrafts.cmp_orbit_mini.draft.title, draftTitle);
  const page = await request(
    jar,
    "/creator/campaigns/new?campaign=orbit-mini-bo-pha-gon",
  );
  assert.equal(page.status, 200);
  assert.ok(page.data.includes(draftTitle));
});

await check(
  "Bản tin và phản hồi bình luận được đọc lại ở hai role",
  async () => {
    const jar = await login("linh@orbit.vn");
    const updateTitle = "Đã chốt lịch thử khuôn vỏ tháng 10";
    const updateBody =
      "Nhóm đã xác nhận lịch chạy khuôn thử ngày 05/10 và sẽ đăng ảnh kiểm tra ngay sau buổi nghiệm thu.";
    assert.equal(
      (
        await request(jar, operationPath, "POST", {
          action: "PUBLISH_UPDATE",
          payload: {
            campaignId: "cmp_orbit",
            title: updateTitle,
            body: updateBody,
          },
        })
      ).status,
      200,
    );
    const replyBody =
      "Cảm ơn bạn An. Nhóm đã đưa màu xanh rêu vào khảo sát và sẽ chốt sau khi kiểm tra số lượng tối thiểu.";
    assert.equal(
      (
        await request(jar, operationPath, "POST", {
          action: "REPLY_COMMENT",
          payload: {
            campaignId: "cmp_orbit",
            commentId: "cm_2",
            body: replyBody,
          },
        })
      ).status,
      200,
    );

    const operations = await request(
      jar,
      `${operationPath}?slug=orbit-one-ca-phe-thong-minh`,
    );
    assert.equal(operations.status, 200);
    assert.equal(operations.data.data.updateHistory[0].body, updateBody);
    assert.equal(operations.data.data.commentReplies[0].body, replyBody);

    await login("minhanh@example.com", jar);
    const publicPage = await request(
      jar,
      "/projects/orbit-one-ca-phe-thong-minh?tab=updates",
    );
    assert.equal(publicPage.status, 200);
    assert.ok(publicPage.data.includes(updateTitle));
    assert.ok(publicPage.data.includes(updateBody));
    const commentsPage = await request(
      jar,
      "/projects/orbit-one-ca-phe-thong-minh?tab=comments",
    );
    assert.equal(commentsPage.status, 200);
    assert.ok(commentsPage.data.includes(replyBody));
  },
);

await check("Tài khoản vừa đăng ký có thể đăng nhập lại", async () => {
  const jar = new Map();
  const email = "sinhvien.test@example.com";
  const password = "matkhau-demo-2026";
  const registered = await request(jar, sessionPath, "POST", {
    mode: "REGISTER",
    email,
    password,
    fullName: "Nguyễn Sinh Viên",
    remember: false,
  });
  assert.equal(registered.status, 201);
  const registeredId = registered.data.user.id;
  const platform = readSignedCookiePayload(jar, "gop_platform_preview");
  const stored = platform.registeredAccounts.find(
    (account) => account.id === registeredId,
  );
  assert.ok(stored);
  assert.ok(stored.passwordHash);
  assert.ok(!JSON.stringify(stored).includes(password));

  assert.equal((await request(jar, sessionPath, "DELETE")).status, 200);
  const signedIn = await request(jar, sessionPath, "POST", {
    mode: "SIGN_IN",
    email,
    password,
    remember: false,
  });
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.data.user.id, registeredId);
});

await check("Phí giao lấy từ tùy chọn của chiến dịch", async () => {
  const jar = await login("minhanh@example.com");
  const address = {
    fullName: "Phạm Minh Anh",
    phone: "0903124586",
    line1: "28 đường số 5, TP. Thủ Đức",
    city: "TP. Hồ Chí Minh",
  };
  const digital = await request(jar, "/api/v1/pledges/authorize", "POST", {
    campaignId: "cmp_orbit",
    rewardId: "rw_support",
    addOnIds: [],
    shippingOptionId: null,
    bonusAmount: 0,
    address: null,
  });
  assert.equal(digital.status, 201);
  assert.equal(digital.data.breakdown.shippingAmount, 0);

  const digitalWithPhysicalAddOn = await request(
    jar,
    "/api/v1/pledges/authorize",
    "POST",
    {
      campaignId: "cmp_orbit",
      rewardId: "rw_support",
      addOnIds: ["ad_milk"],
      shippingOptionId: null,
      bonusAmount: 0,
      address: null,
    },
  );
  assert.equal(digitalWithPhysicalAddOn.status, 422);
  assert.equal(digitalWithPhysicalAddOn.data.error.code, "SHIPPING_REQUIRED");

  const missingShipping = await request(
    jar,
    "/api/v1/pledges/authorize",
    "POST",
    {
      campaignId: "cmp_orbit",
      rewardId: "rw_early",
      addOnIds: [],
      shippingOptionId: null,
      bonusAmount: 0,
      address,
    },
  );
  assert.equal(missingShipping.status, 422);
  assert.equal(missingShipping.data.error.code, "SHIPPING_REQUIRED");

  const crossCampaign = await request(
    jar,
    "/api/v1/pledges/authorize",
    "POST",
    {
      campaignId: "cmp_orbit",
      rewardId: "rw_early",
      addOnIds: [],
      shippingOptionId: "shp_lacviet_standard",
      bonusAmount: 0,
      address,
    },
  );
  assert.equal(crossCampaign.status, 422);
  assert.equal(crossCampaign.data.error.code, "SHIPPING_REQUIRED");

  const physical = await request(jar, "/api/v1/pledges/authorize", "POST", {
    campaignId: "cmp_orbit",
    rewardId: "rw_early",
    addOnIds: [],
    shippingOptionId: "shp_orbit_standard",
    bonusAmount: 0,
    address,
  });
  assert.equal(physical.status, 201);
  assert.equal(physical.data.breakdown.shippingAmount, 35_000);
});

await check("Cam kết mới đọc cùng số liệu ở Backer, Creator và Admin", async () => {
  const jar = await login("minhanh@example.com");
  const campaignPath = "/api/v1/campaigns/orbit-one-ca-phe-thong-minh";
  const before = await request(jar, campaignPath);
  assert.equal(before.status, 200);
  const first = await request(jar, "/api/v1/pledges/authorize", "POST", {
    campaignId: "cmp_orbit",
    rewardId: "rw_support",
    addOnIds: [],
    shippingOptionId: null,
    bonusAmount: 0,
    address: null,
  });
  assert.equal(first.status, 201);
  const afterFirst = await request(jar, campaignPath);
  assert.equal(afterFirst.status, 200);
  assert.equal(afterFirst.data.backerCount, before.data.backerCount);

  const second = await request(jar, "/api/v1/pledges/authorize", "POST", {
    campaignId: "cmp_orbit",
    rewardId: null,
    addOnIds: [],
    shippingOptionId: null,
    bonusAmount: 200_000,
    address: null,
  });
  assert.equal(second.status, 201);
  const afterSecond = await request(jar, campaignPath);
  assert.equal(afterSecond.data.pledgedAmount - afterFirst.data.pledgedAmount, 50_000);
  assert.equal(afterSecond.data.backerCount, before.data.backerCount);
  assert.equal(
    readSignedCookiePayload(jar, "gop_platform_preview").pledges.length,
    1,
  );

  const creatorBase = await login("linh@orbit.vn");
  const baselineOperations = await request(creatorBase, operationPath);
  await login("linh@orbit.vn", jar);
  const portfolio = await request(jar, "/api/v1/creator/portfolio");
  assert.equal(portfolio.status, 200);
  assert.equal(
    portfolio.data.campaigns.find((item) => item.id === "cmp_orbit")?.pledgedAmount,
    afterSecond.data.pledgedAmount,
  );
  const operations = await request(jar, operationPath);
  assert.equal(operations.status, 200);
  assert.equal(
    operations.data.data.today.pledgedAmount -
      baselineOperations.data.data.today.pledgedAmount,
    200_000,
  );
  assert.equal(operations.data.data.reservations[0].amount, 200_000);
  assert.equal(
    operations.data.data.reservations[0].id,
    second.data.authorizationId.toUpperCase(),
  );
  assert.ok(
    !operations.data.data.reservations.some((item) => item.id === "PLG-240827-102"),
  );

  const adminBase = await login("quantri@gop.vn");
  const baseline = await request(adminBase, "/api/v1/admin/overview");
  await login("quantri@gop.vn", jar);
  const admin = await request(jar, "/api/v1/admin/overview");
  assert.equal(admin.status, 200);
  assert.equal(
    admin.data.metrics.grossPledged - baseline.data.metrics.grossPledged,
    afterSecond.data.pledgedAmount - before.data.pledgedAmount,
  );

  await login("minhanh@example.com", jar);
  const dashboard = await request(jar, dashboardPath);
  assert.equal(dashboard.status, 200);
  assert.equal(
    dashboard.data.backedProjects.find((item) => item.campaign.id === "cmp_orbit")?.amount,
    200_000,
  );
  assert.equal(
    dashboard.data.backedProjects.find((item) => item.campaign.id === "cmp_orbit")
      ?.campaign.pledgedAmount,
    afterSecond.data.pledgedAmount,
  );
});

await check("Địa chỉ lỗi bị chặn trước khi lưu cam kết", async () => {
  const jar = await login("minhanh@example.com");
  const response = await request(jar, "/api/v1/pledges/authorize", "POST", {
    campaignId: "cmp_orbit",
    rewardId: "rw_early",
    addOnIds: [],
    shippingOptionId: "shp_orbit_standard",
    bonusAmount: 0,
    address: {
      fullName: "A",
      phone: "123",
      line1: "x",
      city: "",
    },
  });
  assert.equal(response.status, 422);
  assert.ok(!jar.has("gop_platform_preview"));
});

await check("Người ủng hộ mới làm tăng đúng một người và một khoản", async () => {
  const jar = new Map();
  const registered = await request(jar, sessionPath, "POST", {
    mode: "REGISTER",
    email: `nguoimoi-${randomBytes(4).toString("hex")}@example.com`,
    password: "gop12345",
    fullName: "Trần Ngọc Mai",
    remember: false,
  });
  assert.equal(registered.status, 201);
  const campaignPath = "/api/v1/campaigns/orbit-one-ca-phe-thong-minh";
  const before = await request(jar, campaignPath);
  const pledge = await request(jar, "/api/v1/pledges/authorize", "POST", {
    campaignId: "cmp_orbit",
    rewardId: "rw_support",
    addOnIds: [],
    shippingOptionId: null,
    bonusAmount: 0,
    address: null,
  });
  assert.equal(pledge.status, 201);
  const after = await request(jar, campaignPath);
  assert.equal(after.data.backerCount, before.data.backerCount + 1);
  assert.equal(after.data.pledgedAmount, before.data.pledgedAmount + 150_000);
  const dashboard = await request(jar, dashboardPath);
  assert.equal(dashboard.data.stats.backed, 1);
  assert.equal(dashboard.data.backedProjects[0].amount, 150_000);
});

await check(
  "Cookie đầy trả lỗi và giữ nguyên trạng thái đã lưu trước đó",
  async () => {
    const jar = await login("minhanh@example.com");
    let rejected = false;
    for (let index = 0; index < 20; index++) {
      const before = [...jar];
      const result = await request(jar, dashboardPath, "POST", {
        action: "SEND_MESSAGE",
        payload: {
          campaignId: "cmp_orbit",
          recipientUserId: "usr_hoang_linh",
          subject: randomBytes(48).toString("base64"),
          body: randomBytes(180).toString("base64"),
        },
      });
      if (result.status === 409) {
        assert.equal(result.data.error.code, "PREVIEW_STORAGE_FULL");
        assert.deepEqual([...jar], before);
        rejected = true;
        break;
      }
      assert.equal(result.status, 200);
    }
    assert.ok(rejected, "Chưa chạm được giới hạn cookie để kiểm thử");
  },
);

for (const item of results)
  console.log(
    `${item.ok ? "PASS" : "FAIL"} ${item.name}${item.reason ? `: ${item.reason}` : ""}`,
  );
console.log(
  `\n${results.filter((item) => item.ok).length}/${results.length} ca đạt. Dữ liệu chỉ thay đổi trong cookie của tiến trình test.`,
);
if (results.some((item) => !item.ok)) process.exitCode = 1;
