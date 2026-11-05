import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function getCampaignUploadsDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "public"))) {
    return path.join(cwd, "public", "uploads", "campaigns");
  }
  return path.join(cwd, "apps", "web", "public", "uploads", "campaigns");
}

export async function POST(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;

  try {
    const contentType = request.headers.get("content-type") || "";
    let buffer: Buffer;
    let ext = "jpg";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const base64Data = body?.image;
      if (!base64Data || typeof base64Data !== "string") {
        return NextResponse.json(
          { error: { code: "INVALID_BODY", message: "Thiếu dữ liệu hình ảnh." } },
          { status: 400 },
        );
      }
      const match = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: { code: "INVALID_BASE64", message: "Định dạng ảnh base64 không hợp lệ." } },
          { status: 400 },
        );
      }
      ext = match[1] === "jpeg" ? "jpg" : match[1];
      buffer = Buffer.from(match[2], "base64");
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: { code: "NO_FILE", message: "Vui lòng đính kèm tệp ảnh." } },
          { status: 400 },
        );
      }

      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: { code: "FILE_TOO_LARGE", message: "Kích thước ảnh tối đa là 10MB." } },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      if (file.type.includes("png")) ext = "png";
      else if (file.type.includes("webp")) ext = "webp";
      else if (file.type.includes("gif")) ext = "gif";
    } else {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_MEDIA", message: "Định dạng yêu cầu không được hỗ trợ." } },
        { status: 415 },
      );
    }

    const userId = (access.session?.user.id ?? "creator").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `campaign-${userId}-${Date.now()}.${ext}`;

    const uploadsDir = getCampaignUploadsDir();
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    const imageUrl = `/uploads/campaigns/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      url: imageUrl,
    });
  } catch (error) {
    console.error("Campaign image upload error:", error);
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "Lỗi trong quá trình tải ảnh lên máy chủ." } },
      { status: 500 },
    );
  }
}

