import { readdirSync, readFileSync, statSync } from "node:fs";
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

async function main() {
  const root = join(process.cwd(), "public", "v3");
  const files = walkFiles(root);
  const db = getDb();
  const urlMap = new Map<string, string>();

  console.log(`Đang tải ${files.length} ảnh lên Cloudinary...`);
  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, "/"); // ví dụ: projects/orbit-one.webp
    const localWebPath = `/v3/${rel}`;
    const folderAndName = rel.replace(/\.[^.]+$/, "");
    const parts = folderAndName.split("/");
    const publicId = parts.pop()!;
    const subFolder = parts.join("/");

    const buf = readFileSync(file);
    const mime = file.endsWith(".webp") ? "image/webp" : file.endsWith(".png") ? "image/png" : "image/jpeg";
    const uploaded = await uploadImageBuffer(buf, mime, { folder: subFolder, publicId });
    urlMap.set(localWebPath, uploaded.url);
    console.log(`  ✓ ${localWebPath} -> ${uploaded.url}`);
  }

  for (const [localPath, cloudUrl] of urlMap.entries()) {
    await run(db, `UPDATE categories SET image_url = ? WHERE image_url = ?`, cloudUrl, localPath);
    await run(db, `UPDATE projects SET cover_url = ? WHERE cover_url = ?`, cloudUrl, localPath);
    await run(db, `UPDATE project_sections SET media_url = ? WHERE media_url = ?`, cloudUrl, localPath);
  }
  console.log("Đã cập nhật toàn bộ đường dẫn ảnh Cloudinary vào cơ sở dữ liệu!");
}

void main();
