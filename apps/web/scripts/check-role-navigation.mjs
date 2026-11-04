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

const sessions = {
  BACKER: await login("minhanh@example.com"),
  CREATOR: await login("linh@orbit.vn"),
  COLLABORATOR: await login("giahuy@orbit.vn"),
  ADMIN: await login("quantri@gop.vn"),
};

const cases = [
  ["BACKER", "/dashboard?tab=backed", "Các khoản ủng hộ của bạn."],
  ["BACKER", "/dashboard?tab=saved", "Những dự án bạn đã lưu."],
  ["BACKER", "/dashboard?tab=following", "Những nhóm bạn đang quan tâm."],
  ["BACKER", "/dashboard?tab=messages", "Tin nhắn với đội dự án."],
  ["BACKER", "/dashboard?tab=activity", "Hoạt động gần đây của bạn."],
  ["BACKER", "/dashboard?tab=settings", "Thông báo và quyền riêng tư."],

  ["CREATOR", "/creator", "Chiến dịch của bạn"],
  ["CREATOR", "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=overview", "ORBIT One — trung tâm vận hành."],
  ["CREATOR", "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=content", "Gói ủng hộ, phần bổ sung và giao hàng"],
  ["CREATOR", "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community", "Hộp thư từ người ủng hộ"],
  ["CREATOR", "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=fulfillment", "Chưa phát hành đơn giao"],
  ["CREATOR", "/creator/ai", "Dự báo tiến độ của ORBIT One"],
  ["CREATOR", "/creator/campaigns/new", "Tạo chiến dịch mới"],
  ["CREATOR", "/creator/campaigns/new?campaign=orbit-mini-bo-pha-gon", "Chỉnh sửa ORBIT Mini"],

  ["COLLABORATOR", "/collaborator", "đây là các việc nhóm giao cho bạn"],
  ["COLLABORATOR", "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community", "cùng nhóm cập nhật tiến độ"],
  ["COLLABORATOR", "/collaborator/forecast", "Dữ liệu đang nói gì về ORBIT One?"],
  ["COLLABORATOR", "/projects/orbit-one-ca-phe-thong-minh", "Pha đúng gu trong 90 giây"],
  ["COLLABORATOR", "/account?tab=roles", "Vai trò và phạm vi truy cập"],
  ["COLLABORATOR", "/account?tab=notifications", "Lựa chọn nhắc tin cho sau này"],

  ["ADMIN", "/admin?tab=overview", "Việc nào cần xử lý trước?"],
  ["ADMIN", "/admin?tab=reviews", "Đọc hồ sơ và bằng chứng trước khi duyệt."],
  ["ADMIN", "/admin?tab=fraud", "Đọc tín hiệu trước khi đưa ra kết luận."],
  ["ADMIN", "/admin?tab=users", "Quản lý người dùng theo trạng thái hiện có."],
  ["ADMIN", "/admin?tab=settings", "Phí nền tảng và nhật ký thay đổi."],
  ["ADMIN", "/system-design", "Từ yêu cầu, vai trò đến từng màn hình dùng thử."],
];

const results = await Promise.all(
  cases.map(async ([role, path, marker]) => {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Cookie: sessions[role] },
      redirect: "manual",
    });
    const html = await response.text();
    const markerFound = html.includes(marker);
    return {
      role,
      path,
      http: response.status,
      marker: markerFound ? "FOUND" : "MISSING",
      result: response.status === 200 && markerFound ? "PASS" : "FAIL",
    };
  }),
);

console.table(results);
const passed = results.filter((item) => item.result === "PASS").length;
console.log(`ROLE_NAVIGATION_MATRIX_${passed === results.length ? "PASSED" : "FAILED"}:${passed}/${results.length}`);

if (passed !== results.length) process.exitCode = 1;
