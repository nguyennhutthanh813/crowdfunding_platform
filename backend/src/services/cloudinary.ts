import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env, isCloudinaryConfigured } from "../config/env.js";

export interface UploadResult {
  url: string;
  publicId: string;
  provider: "cloudinary" | "local";
  width?: number;
  height?: number;
}

/**
 * Tải ảnh lên Cloudinary (ký xác thực SHA-1 với CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET).
 * Khi chưa điền đủ Cloud Name / API Secret ở môi trường phát triển, tự động lưu an toàn vào backend/uploads.
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  mimeType: string,
  opts: { folder?: string; publicId?: string } = {},
): Promise<UploadResult> {
  const folder = opts.folder ? `${env.cloudinaryFolder}/${opts.folder}` : env.cloudinaryFolder;

  if (isCloudinaryConfigured()) {
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = { folder, timestamp };
    if (opts.publicId) {
      params.public_id = opts.publicId;
      params.overwrite = "true";
    }

    const sortedParamStr = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const signature = createHash("sha1")
      .update(`${sortedParamStr}${env.cloudinaryApiSecret}`)
      .digest("hex");

    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
    const form = new FormData();
    form.append("file", dataUri);
    form.append("api_key", env.cloudinaryApiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    if (opts.publicId) {
      form.append("public_id", opts.publicId);
      form.append("overwrite", "true");
    }
    form.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudinary upload error (${res.status}): ${errText}`);
    }
    const json = (await res.json()) as {
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
    };
    return {
      url: json.secure_url,
      publicId: json.public_id,
      provider: "cloudinary",
      width: json.width,
      height: json.height,
    };
  }

  // Fallback lưu tệp tạm an toàn khi chưa khai báo đủ CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_SECRET
  const ext = mimeType.includes("webp")
    ? "webp"
    : mimeType.includes("png")
      ? "png"
      : mimeType.includes("gif")
        ? "gif"
        : "jpg";
  const fileName = `${opts.publicId ?? randomUUID()}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uploadDir = env.isVercel ? "/tmp/uploads" : join(process.cwd(), "uploads");
  mkdirSync(uploadDir, { recursive: true });
  writeFileSync(join(uploadDir, fileName), buffer);
  return {
    url: `${env.backendPublicUrl}/uploads/${fileName}`,
    publicId: fileName,
    provider: "local",
  };
}
