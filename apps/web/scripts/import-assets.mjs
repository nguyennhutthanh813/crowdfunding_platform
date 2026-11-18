// Chuyển ảnh sinh ra (jpg/png) sang webp tối ưu trong public/v3.
// Dùng: node scripts/import-assets.mjs <thư-mục-nguồn>
import { createRequire } from "node:module";
import { readdirSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const require = createRequire(realpathSync(join(webRoot, "node_modules", "next", "package.json")));
const sharp = require("sharp");

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error("Thiếu thư mục nguồn");
  process.exit(1);
}

const MAP = [
  [/^brand_hero/, "brand/hero", 2000],
  [/^brand_ai_orb/, "brand/ai-orb", 1000],
  [/^brand_success/, "brand/success", 900],
  [/^brand_empty/, "brand/empty", 700],
  [/^brand_launch/, "brand/launch", 900],
  [/^roles_backer/, "roles/backer", 1000],
  [/^roles_creator/, "roles/creator", 1000],
  [/^roles_collaborator/, "roles/collaborator", 1000],
  [/^roles_admin/, "roles/admin", 1000],
  [/^categories_([a-z]+)/, "categories/$1", 700],
  [/^([a-z0-9_]+)_\d{10,}\.(jpg|png|jpeg)$/, "projects/$1", 1600],
];

const files = readdirSync(src).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)).sort();
const done = new Map();
for (const file of files) {
  for (const [re, target, width] of MAP) {
    const m = file.match(re);
    if (!m) continue;
    let out = target.replace("$1", m[1] ?? "");
    if (out.startsWith("projects/")) out = out.replace(/_/g, "-");
    if (out.startsWith("projects/brand") || out.startsWith("projects/roles") || out.startsWith("projects/categories")) break;
    done.set(out, { file, width }); // bản sinh sau (v2) ghi đè bản trước
    break;
  }
}

for (const [out, { file, width }] of done) {
  const dest = join(webRoot, "public", "v3", `${out}.webp`);
  mkdirSync(dirname(dest), { recursive: true });
  await sharp(join(src, file)).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  console.log(`${file} → public/v3/${out}.webp`);
}
