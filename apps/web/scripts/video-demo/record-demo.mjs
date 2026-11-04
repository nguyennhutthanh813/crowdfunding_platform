// Quay thao tác trình duyệt thật trên DB demo riêng. Chạy A rồi B rồi C.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const { chromium } = require(resolve(root, "output/video-tools/node_modules/playwright"));
const out = resolve(root, "output/video-demo-2026-11-01");
const site = "http://localhost:3112";
const scenes = readFileSync(resolve(out, "scenes-with-duration.json"), "utf8");
const voice = Object.fromEntries(JSON.parse(scenes).map((item) => [item.id, item]));
const part = (process.argv[2] ?? "A").toUpperCase();
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const origin = Date.now();
const manifest = { part, site, campaignId: null, pledgeAuthorizationId: null, scenes: [], errors: [], video: null };
if (part !== "A") {
  manifest.campaignId = JSON.parse(readFileSync(resolve(out, "manifest-A.json"), "utf8")).campaignId;
  if (!manifest.campaignId) throw new Error("Chặng A chưa ghi được mã chiến dịch.");
}
page.on("pageerror", (error) => manifest.errors.push({ kind: "pageerror", message: error.message }));
page.on("console", (message) => {
  if (message.type() === "error") manifest.errors.push({ kind: "console", message: message.text().slice(0, 300) });
});

const wait = (ms) => page.waitForTimeout(ms);
async function go(route) {
  try {
    await page.goto(site + route, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!String(error).includes("net::ERR_ABORTED")) throw error;
    await wait(800);
    await page.goto(site + route, { waitUntil: "domcontentloaded" });
  }
  await wait(650);
}
async function scene(id, action) {
  const item = voice[id];
  if (!item) throw new Error(`Chưa có lời dẫn cảnh ${id}`);
  const begin = Date.now();
  const row = { id, title: item.title, role: item.role, startMs: begin - origin, url: "", actionMs: 0, endMs: 0, result: "" };
  manifest.scenes.push(row);
  console.log("SCENE_START", id, item.title);
  await action();
  row.actionMs = Date.now() - begin;
  const remaining = item.seconds * 1000 + 1400 - row.actionMs;
  if (remaining > 0) await wait(remaining);
  row.endMs = Date.now() - origin;
  row.url = page.url();
  row.result = (await page.locator("body").innerText()).slice(0, 250).replace(/\s+/g, " ");
  await page.screenshot({ path: resolve(out, `proof-${id}.png`), fullPage: false });
  console.log("SCENE_END", id, Math.round(row.endMs / 1000), row.url);
}
async function switchTo(name) {
  await go("/auth");
  await wait(450);
  const change = page.getByRole("button", { name: "Đổi tài khoản", exact: true });
  if (await change.count()) {
    await change.first().click();
    await page.getByRole("button", { name: new RegExp(name) }).waitFor({ timeout: 12000 });
  }
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 18000 });
  await page.waitForLoadState("load");
  await wait(1500);
}
async function partA() {
  await scene("01", async () => {
    await go("/");
    await wait(2200);
    await page.locator("#cach-hoat-dong").scrollIntoViewIfNeeded().catch(() => {});
    await wait(2100);
    await page.evaluate(() => window.scrollTo(0, 0));
  });
  await scene("02", async () => {
    await go("/discover");
    await wait(1700);
    await go("/projects/orbit-one-ca-phe-thong-minh");
    for (const tab of ["Gói ủng hộ", "Chủ dự án", "Hỏi đáp", "Cập nhật", "Bình luận", "Cộng đồng", "Câu chuyện"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await wait(850);
    }
  });
  await scene("03", async () => {
    await go("/auth");
    await wait(3100);
    await page.getByRole("button", { name: /Nguyễn Hoàng Linh/ }).click();
    await page.waitForURL(/\/creator/, { timeout: 15000 });
    await wait(700);
  });
  await scene("04", async () => {
    await go("/creator");
    await wait(2000);
    await page.getByRole("heading", { name: "Chiến dịch của bạn" }).scrollIntoViewIfNeeded();
    await wait(1600);
    await page.getByRole("link", { name: "Tạo chiến dịch mới", exact: true }).first().click();
    await page.getByRole("heading", { name: "Tạo chiến dịch mới" }).waitFor();
  });
  await scene("05", async () => {
    await page.locator("button").filter({ hasText: "Điền ví dụ" }).click();
    await wait(1400);
    await page.locator('input[name="funding-goal"]').scrollIntoViewIfNeeded();
    await wait(1400);
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  });
  await scene("06", async () => {
    await page.getByRole("heading", { name: "Cho cộng đồng thấy kế hoạch thật" }).waitFor();
    await page.locator('textarea[name="project-story"]').scrollIntoViewIfNeeded();
    await wait(1400);
    await page.locator('textarea[name="project-risks"]').scrollIntoViewIfNeeded();
    await wait(1400);
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  });
  await scene("07", async () => {
    await page.getByRole("heading", { name: "Quà rõ ràng, phần bổ sung tách riêng" }).waitFor();
    await page.getByRole("button", { name: "Thêm", exact: true }).click();
    await page.locator('input[name^="add-on-title-"]').fill("Lõi lọc dự phòng");
    await page.locator('input[name^="add-on-amount-"]').fill("120000");
    await wait(1600);
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  });
  await scene("08", async () => {
    await page.getByRole("heading", { name: "Chuẩn bị giao hàng và phân quyền" }).waitFor();
    await page.getByRole("button", { name: "Mời thành viên", exact: true }).click();
    await page.locator('input[name^="collaborator-email-"]').fill("giahuy@orbit.vn");
    for (const suffix of ["canUpdate", "canReply", "canViewAi"]) {
      await page.locator(`input[name$="-${suffix}"]`).check();
    }
    await wait(1200);
    await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
    await page.getByText("Đã lưu bản nháp trong bản demo.").waitFor({ timeout: 15000 });
    await page.waitForURL(/draft=/, { timeout: 15000 });
    manifest.campaignId = new URL(page.url()).searchParams.get("draft");
    console.log("CAMPAIGN_ID", manifest.campaignId);
  });
  await scene("09", async () => {
    for (let i = 0; i < 5; i++) {
      if (await page.getByRole("heading", { name: "Kiểm tra trước khi gửi" }).count()) break;
      await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
      await wait(350);
    }
    await page.getByRole("heading", { name: "Kiểm tra trước khi gửi" }).waitFor();
    await wait(1800);
    await page.getByRole("button", { name: "Gửi xét duyệt", exact: true }).click();
    await page.getByRole("heading", { name: /Bản nháp của bạn đã vào hàng chờ/ }).waitFor({ timeout: 20000 });
    const href = await page.getByRole("link", { name: "Xem tiến độ xét duyệt" }).getAttribute("href");
    const fromLink = href?.match(/\/creator\/campaigns\/([^/]+)\/manage/)?.[1];
    if (!fromLink || fromLink !== manifest.campaignId) throw new Error(`Mã chiến dịch sau gửi không khớp: ${href}`);
  });
}

async function partB() {
  const id = manifest.campaignId;
  await scene("10", async () => {
    await switchTo("Trần Khánh An");
    await go("/admin?tab=reviews");
    const card = page.locator("article").filter({ hasText: "Bếp Mây — bộ lọc nước cho căn bếp nhỏ" }).first();
    await card.waitFor({ timeout: 15000 });
    await card.scrollIntoViewIfNeeded();
    await wait(1700);
    await card.getByRole("button", { name: "Xem hồ sơ", exact: true }).click();
    await wait(1700);
    await card.getByRole("button", { name: "Duyệt", exact: true }).click();
    await card.getByRole("button", { name: "Xác nhận duyệt", exact: true }).click();
    await wait(1000);
  });
  await scene("11", async () => {
    await switchTo("Nguyễn Hoàng Linh");
    await go(`/creator/campaigns/${id}/manage`);
    await page.getByRole("button", { name: "Mở gọi vốn mẫu", exact: true }).waitFor({ timeout: 15000 });
    await wait(1800);
    await page.getByRole("button", { name: "Mở gọi vốn mẫu", exact: true }).click();
    await wait(1300);
    await page.getByRole("button", { name: "Xác nhận mở", exact: true }).click();
    await page.getByRole("link", { name: "Xem trang cộng đồng", exact: true }).waitFor({ timeout: 15000 });
  });
  await scene("12", async () => {
    await context.clearCookies();
    await go(`/projects/${id}`);
    await page.getByRole("heading", { name: "Bếp Mây — bộ lọc nước cho căn bếp nhỏ" }).waitFor();
    await wait(1600);
    for (const tab of ["Gói ủng hộ", "Hỏi đáp", "Cập nhật", "Bình luận", "Câu chuyện"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await wait(850);
    }
  });
}

async function partC() {
  const id = manifest.campaignId;
  await scene("13", async () => {
    await switchTo("Phạm Minh Anh");
    await go(`/pledge/${id}`);
    await page.locator('input[name="reward"]').first().check();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    const extra = page.locator('input[name^="add-on-"]');
    if (await extra.count()) await extra.first().check();
    await page.locator('input[name="pledge-bonus"]').fill("50000");
    await wait(900);
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.locator('input[name="shipping-full-name"]').fill("Phạm Minh Anh");
    await page.locator('input[name="shipping-phone"]').fill("0900000000");
    await page.locator('input[name="shipping-address-line1"]').fill("Số 12 đường Mẫu, phường Hải Châu");
    await page.locator('input[name="shipping-city"]').fill("Đà Nẵng");
    await wait(800);
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.locator('input[name="understands-demo"]').check();
    await wait(950);
    await page.getByRole("button", { name: "Ghi nhận cam kết mẫu", exact: true }).click();
    await page.getByRole("heading", { name: "Cảm ơn bạn đã góp sức." }).waitFor({ timeout: 20000 });
    manifest.pledgeAuthorizationId = (await page.locator("body").innerText()).match(/authz_[a-z0-9]+/i)?.[0] ?? null;
    if (!manifest.pledgeAuthorizationId) throw new Error("Không đọc được mã cam kết trên trang thành công.");
    console.log("PLEDGE_AUTH", manifest.pledgeAuthorizationId);
  });
  await scene("14", async () => {
    await go("/dashboard");
    const dashboard = await page.locator("body").innerText();
    if (!dashboard.includes("Bếp Mây")) throw new Error("Sổ ủng hộ không thấy Bếp Mây sau cam kết.");
    await wait(1500);
    await go(`/projects/${id}?tab=faq`);
    await page.getByRole("button", { name: "Gửi câu hỏi mới", exact: true }).click();
    await page.locator("#new-comment").fill("Bộ lọc lô đầu có dùng được với đầu vòi ren ngoài ở căn hộ thuê không? Nhóm có danh sách đầu nối tương thích không?");
    await page.getByRole("button", { name: "Gửi câu hỏi", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 });
    await page.getByRole("tab", { name: "Bình luận", exact: true }).click();
    await page.getByText("Bộ lọc lô đầu có dùng được với đầu vòi ren ngoài", { exact: false }).waitFor({ timeout: 12000 });
  });
  await scene("15", async () => {
    await switchTo("Lê Gia Huy");
    await go("/collaborator");
    await page.getByRole("button", { name: "Chấp nhận tham gia", exact: true }).click();
    await wait(900);
    await go(`/collaborator/campaigns/${id}/manage`);
    await page.getByRole("heading", { name: "Quyền trong chiến dịch này" }).waitFor({ timeout: 12000 });
    await page.locator('input[name="update-title"]').fill("Đã chốt mẫu vỏ bộ lọc lô đầu");
    await page.locator('textarea[name="update-body"]').fill("Nhóm đã thử lắp bộ lọc trên ba loại đầu vòi phổ biến ở căn hộ thuê. Bước tiếp theo là đo độ bền ren và đăng bảng đầu nối tương thích để mọi người đối chiếu trước khi nhận quà.");
    await page.getByRole("button", { name: "Đăng cập nhật", exact: true }).click();
    await page.getByText("Đã đăng cập nhật lên trang dự án.").waitFor({ timeout: 15000 });
    await go(`/projects/${id}?tab=updates`);
    await page.getByText("Đã chốt mẫu vỏ bộ lọc lô đầu", { exact: false }).waitFor({ timeout: 12000 });
  });
}

async function partD() {
  await scene("16", async () => {
    await switchTo("Nguyễn Hoàng Linh");
    await go("/discover");
    await wait(2400);
    await page.evaluate(() => window.scrollTo(0, 480));
    await wait(1800);
    await go("/creator/ai");
    await page.getByRole("heading", { name: "Dự báo tiến độ của ORBIT One" }).waitFor();
    await page.getByRole("heading", { name: "Yếu tố đang tác động đến dự báo" }).scrollIntoViewIfNeeded();
  });
}

async function partE() {
  const id = manifest.campaignId;
  await scene("17", async () => {
    await switchTo("Trần Khánh An");
    await go("/admin?tab=fraud");
    await page.getByRole("heading", { name: "Cảnh báo cần con người xem xét" }).waitFor();
    await page.locator('input[name="admin-fraud-search"]').fill("Nova");
    await wait(1200);
    await page.getByRole("button", { name: "Xóa từ khóa tìm cảnh báo" }).click();
    await page.evaluate(() => window.scrollTo(0, 420));
  });
  await scene("18", async () => {
    await go("/local-data");
    await page.getByRole("heading", { name: "Theo dấu dữ liệu chiến dịch" }).waitFor();
    await wait(1900);
    await page.getByRole("button", { name: "Mới tạo", exact: true }).click();
    const entry = page.locator(`a[href="/campaigns/${id}/timeline"]`).first();
    await entry.waitFor({ timeout: 12000 });
    await entry.click();
    await wait(950);
    await page.evaluate(() => window.scrollTo(0, 560));
  });
}

async function partF() {
  const id = manifest.campaignId;
  await scene("20", async () => {
    await switchTo("Phạm Minh Anh");
    await go(`/pledge/${id}`);
    await page.locator('input[name="reward"][value="no_reward"]').check();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.locator('input[name="pledge-bonus"]').fill("100000");
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await wait(1800);
    await go("/dashboard?tab=saved");
    await wait(1800);
    await go("/account?tab=notifications");
  });
  await scene("21", async () => {
    await switchTo("Nguyễn Hoàng Linh");
    await go("/creator/campaigns/orbit-drip-bo-pha-cham-2025/manage?tab=fulfillment");
    await wait(3200);
    await page.evaluate(() => window.scrollTo(0, 600));
    await wait(2700);
    await go("/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=content");
    await wait(1600);
  });
  await scene("22", async () => {
    await switchTo("Trần Khánh An");
    await go("/admin?tab=users");
    await wait(2500);
    await go("/admin?tab=settings");
    await wait(2500);
    await go("/system-design");
    await page.evaluate(() => window.scrollTo(0, 410));
  });
  await scene("19", async () => {
    await context.clearCookies();
    await go("/");
    await wait(2200);
    await page.evaluate(() => window.scrollTo(0, 520));
    await wait(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
  });
}

try {
  if (part === "A") await partA();
  else if (part === "B") await partB();
  else if (part === "C") await partC();
  else if (part === "D") await partD();
  else if (part === "E") await partE();
  else if (part === "F") await partF();
  else throw new Error(`Chưa có chặng ${part}`);
} catch (error) {
  manifest.errors.push({ kind: "recording", message: String(error?.stack ?? error) });
  await page.screenshot({ path: resolve(out, `failure-${part}.png`), fullPage: false }).catch(() => {});
  process.exitCode = 1;
} finally {
  await page.close();
  manifest.video = await page.video().path();
  await context.close();
  await browser.close();
  writeFileSync(resolve(out, `manifest-${part}.json`), JSON.stringify(manifest, null, 2), "utf8");
  console.log("VIDEO", manifest.video);
  console.log("ERRORS", manifest.errors.length);
}
