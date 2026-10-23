import { NextResponse } from "next/server";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ." } },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !emailPattern.test(email)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_EMAIL",
          message: "Vui lòng nhập địa chỉ email hợp lệ.",
          fieldErrors: { email: "Email không đúng định dạng" },
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
    const apiRes = await fetch(`${apiUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      const rawMsg = Array.isArray(data.message)
        ? data.message.join(", ")
        : (data.message || "Yêu cầu khôi phục mật khẩu không thành công");

      return NextResponse.json(
        {
          error: {
            code: apiRes.status === 404 ? "USER_NOT_FOUND" : "REQUEST_FAILED",
            message: rawMsg,
            fieldErrors: {},
          },
        },
        { status: apiRes.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || `Mã xác nhận đã được gửi tới ${email}.`,
      resetToken: data.resetToken,
    });
  } catch (err) {
    console.warn("Forgot password backend connection failed:", err);
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
