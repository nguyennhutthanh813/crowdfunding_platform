import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/request-validation";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const previewCode = "GOP-4821";

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  if (
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !emailPattern.test(body.email)
  ) {
    return NextResponse.json(
      { error: { message: "Vui lòng nhập email hợp lệ" } },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: {
      email: body.email.toLowerCase(),
      previewCode,
      message:
        "Mã đặt lại đã được tạo cho môi trường trải nghiệm. Backend thật sẽ gửi mã này qua email.",
    },
  });
}

export async function PATCH(request: Request) {
  const parsed = await readJsonObject(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  if (
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !emailPattern.test(body.email)
  ) {
    return NextResponse.json(
      { error: { message: "Email không hợp lệ" } },
      { status: 422 },
    );
  }
  if (
    typeof body.code !== "string" ||
    body.code.trim().toUpperCase() !== previewCode
  ) {
    return NextResponse.json(
      { error: { message: "Mã xác nhận chưa đúng" } },
      { status: 422 },
    );
  }
  if (
    typeof body.password !== "string" ||
    body.password.length < 8 ||
    body.password.length > 128
  ) {
    return NextResponse.json(
      { error: { message: "Mật khẩu mới cần ít nhất 8 ký tự" } },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: {
      success: true,
      persisted: false,
      simulation: true,
      message:
        "Đã kiểm tra biểu mẫu đặt lại. Bản demo không gửi email và không đổi mật khẩu; tài khoản mẫu vẫn dùng mật khẩu cũ.",
    },
  });
}
