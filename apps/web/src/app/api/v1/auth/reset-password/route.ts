import { NextResponse } from "next/server";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: {
    email?: string;
    code?: string;
    resetToken?: string;
    newPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ." } },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const resetToken = typeof body.resetToken === "string" ? body.resetToken.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  const fieldErrors: Record<string, string> = {};
  if (!email || !emailPattern.test(email)) fieldErrors.email = "Email không hợp lệ";
  if (!code || code.length < 4) fieldErrors.code = "Mã xác nhận gồm 6 chữ số";
  if (!resetToken) fieldErrors.resetToken = "Thiếu mã phiên khôi phục";
  if (!newPassword || newPassword.length < 6)
    fieldErrors.newPassword = "Mật khẩu mới cần tối thiểu 6 ký tự";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Vui lòng kiểm tra lại thông tin gửi lên.",
          fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  try {
    const apiRes = await fetch(`${apiUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, resetToken, newPassword }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      const rawMsg = Array.isArray(data.message)
        ? data.message.join(", ")
        : (data.message || "Đặt lại mật khẩu thất bại");

      return NextResponse.json(
        {
          error: {
            code: "RESET_FAILED",
            message: rawMsg,
            fieldErrors: {},
          },
        },
        { status: apiRes.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || "Đặt lại mật khẩu thành công!",
    });
  } catch (err) {
    console.warn("Reset password backend connection failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_UNAVAILABLE",
          message: "Máy chủ xác thực hiện chưa sẵn sàng. Vui lòng thử lại sau.",
          fieldErrors: {},
        },
      },
      { status: 503 },
    );
  }
}
