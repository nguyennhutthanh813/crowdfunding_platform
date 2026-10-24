import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function getVideoUploadsDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "public"))) {
    return path.join(cwd, "public", "uploads", "videos");
  }
  return path.join(cwd, "apps", "web", "public", "uploads", "videos");
}

export async function POST(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_MEDIA", message: "Yêu cầu định dạng multipart/form-data." } },
        { status: 415 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: "NO_FILE", message: "Vui lòng đính kèm tệp video." } },
        { status: 400 },
      );
    }

    // Limit size: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "Kích thước tệp video tối đa là 50MB." } },
        { status: 400 },
      );
    }

    let ext = "mp4";
    if (file.type.includes("webm")) ext = "webm";
    else if (file.type.includes("quicktime")) ext = "mov";
    else if (file.type.includes("mkv")) ext = "mkv";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const userId = (access.session?.user.id ?? "creator").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `video-${userId}-${Date.now()}.${ext}`;

    const uploadsDir = getVideoUploadsDir();
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);

    const videoUrl = `/uploads/videos/${filename}`;

    return NextResponse.json({
      success: true,
      videoUrl,
      filename: file.name,
      sizeBytes: file.size,
    });
  } catch (err) {
    console.error("Upload video failed:", err);
    return NextResponse.json(
      { error: { code: "UPLOAD_ERROR", message: "Lỗi trong quá trình lưu tệp video." } },
      { status: 500 },
    );
  }
}
