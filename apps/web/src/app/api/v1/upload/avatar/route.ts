import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function getUploadsDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "public"))) {
    return path.join(cwd, "public", "uploads", "avatars");
  }
  return path.join(cwd, "apps", "web", "public", "uploads", "avatars");
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
          { error: { code: "INVALID_BASE64", message: "Định dạng ảnh không hợp lệ." } },
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
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      if (file.type.includes("png")) ext = "png";
      else if (file.type.includes("webp")) ext = "webp";
    } else {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_MEDIA", message: "Định dạng yêu cầu không hỗ trợ." } },
        { status: 415 },
      );
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "Kích thước ảnh tối đa là 5MB." } },
        { status: 400 },
      );
    }

    const userId = (access.session?.user.id ?? "user").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `avatar-${userId}-${Date.now()}.${ext}`;

    const uploadsDir = getUploadsDir();
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("Upload avatar failed:", err);
    return NextResponse.json(
      { error: { code: "UPLOAD_ERROR", message: "Lỗi trong quá trình lưu ảnh đại diện." } },
      { status: 500 },
    );
  }
}
