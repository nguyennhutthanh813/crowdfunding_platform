import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { isCloudinaryConfigured } from "../src/config/env.js";
import { getDb } from "../src/db/index.js";
import { run } from "../src/db/helpers.js";
import { uploadImageBuffer } from "../src/services/cloudinary.js";

if (!isCloudinaryConfigured()) {
  console.error(
    "Thiếu CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET trong backend/.env. Vui lòng điền đủ các giá trị này rồi chạy lại.",
  );
  process.exit(1);
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else if (/\.(webp|png|jpg|jpeg)$/i.test(entry)) out.push(full);
  }
  return out;
}

function resolveAssetsRoot(): string {
  const candidates = [
    join(process.cwd(), "..", "frontend", "public", "v3"),
    join(process.cwd(), "public", "v3"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  throw new Error(`Không tìm thấy thư mục ảnh mẫu v3 tại: ${candidates.join(", ")}`);
}

async function main() {
  const root = resolveAssetsRoot();
  const files = walkFiles(root).sort();
  const db = getDb();
  const urlMap: Record<string, string> = {};

  console.log(`Đang tải ${files.length} ảnh từ ${root} lên Cloudinary...`);

  const batchSize = 5;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (file) => {
        const rel = relative(root, file).replace(/\\/g, "/");
        const localWebPath = `/v3/${rel}`;
        const folderAndName = rel.replace(/\.[^.]+$/, "");
        const parts = folderAndName.split("/");
        const publicId = parts.pop()!;
        const subFolder = parts.join("/");

        const buf = readFileSync(file);
        const mime = file.endsWith(".webp") ? "image/webp" : file.endsWith(".png") ? "image/png" : "image/jpeg";
        const uploaded = await uploadImageBuffer(buf, mime, { folder: subFolder, publicId });
        urlMap[localWebPath] = uploaded.url;
        console.log(`  ✓ ${localWebPath} -> ${uploaded.url}`);
      }),
    );
  }

  // Lưu bản đồ đường dẫn công khai để seedDatabase sử dụng mặc định cho cả SQLite & Supabase
  const mapOutPath = join(process.cwd(), "src", "db", "cloudinary-assets.ts");
  const sortedEntries = Object.entries(urlMap).sort(([a], [b]) => a.localeCompare(b));
  const tsSource = `/** Bản đồ ảnh chuẩn hoá đã tải lên Cloudinary CDN (tự sinh bởi scripts/sync-cloudinary.ts). */\nexport const CLOUDINARY_ASSETS: Record<string, string> = {\n${sortedEntries
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join("\n")}\n};\n\nexport function resolveAssetUrl(localPath: string): string {\n  return CLOUDINARY_ASSETS[localPath] ?? localPath;\n}\n`;
  writeFileSync(mapOutPath, tsSource, "utf8");
  console.log(`Đã lưu bản đồ ảnh tại: ${mapOutPath}`);

  for (const [localPath, cloudUrl] of sortedEntries) {
    await run(db, `UPDATE categories SET image_url = ? WHERE image_url = ?`, cloudUrl, localPath);
    await run(db, `UPDATE projects SET cover_url = ? WHERE cover_url = ?`, cloudUrl, localPath);
    await run(db, `UPDATE project_sections SET media_url = ? WHERE media_url = ?`, cloudUrl, localPath);
  }
  console.log("Đã cập nhật toàn bộ đường dẫn ảnh Cloudinary vào cơ sở dữ liệu!");
}

void main();
