// Chụp màn hình trang local bằng Edge/Chrome headless (không cần remote debugging).
// node scripts/shot.mjs <url-path> <out.png> [width] [height] [user]
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , path = "/", out = "shot.png", w = "1440", h = "2200", user = ""] = process.argv;
const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const exe = browsers.find((b) => existsSync(b));
if (!exe) { console.error("Không tìm thấy Edge/Chrome"); process.exit(1); }
const target = user
  ? `http://localhost:3000/api/dev/login?u=${encodeURIComponent(user)}&next=${encodeURIComponent(path)}`
  : `http://localhost:3000${path}`;
const profile = mkdtempSync(join(tmpdir(), "fv-shot-"));
const r = spawnSync(exe, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${profile}`, `--window-size=${w},${h}`, "--virtual-time-budget=9000",
  `--screenshot=${out}`, target,
], { stdio: "inherit", timeout: 90_000 });
console.log(r.status === 0 ? `Đã lưu ${out}` : `Lỗi ${r.status}`);
