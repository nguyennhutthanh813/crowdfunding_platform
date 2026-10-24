import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import type { UserAddress } from "@/lib/api/contracts";
import {
  addMemoryAddress,
  clearMemoryAddresses,
  getMemoryAddresses,
} from "@/lib/auth/address-memory-store";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireSession();
  if (access.response) return access.response;

  const session = access.session;
  const token = session?.tokens?.accessToken;
  const userId = session?.user.id ?? "user_default";

  if (token && !token.startsWith("session_")) {
    try {
      const { response: res } = await fetchBackendWithAuth(
        "/users/me/addresses",
        { method: "GET" },
        session,
      );

      if (res.ok) {
        const addresses = (await res.json()) as UserAddress[];

        // Tự động đồng bộ địa chỉ từ memory store lên database thật nếu DB đang trống
        // do trước đó gặp sự cố token 401
        const memoryAddresses = getMemoryAddresses(userId);
        if (addresses.length === 0 && memoryAddresses.length > 0) {
          const syncedAddresses: UserAddress[] = [];
          for (const memAddr of memoryAddresses) {
            try {
              const { response: createRes } = await fetchBackendWithAuth(
                "/users/me/addresses",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    recipientName: memAddr.recipientName,
                    phone: memAddr.phone,
                    line1: memAddr.line1,
                    ward: memAddr.ward || undefined,
                    district: memAddr.district || undefined,
                    province: memAddr.province,
                    isDefault: Boolean(memAddr.isDefault),
                  }),
                },
                session,
              );
              if (createRes.ok) {
                const saved = (await createRes.json()) as UserAddress;
                syncedAddresses.push(saved);
              }
            } catch (syncErr) {
              console.warn("Lỗi đồng bộ địa chỉ từ bộ nhớ lên DB:", syncErr);
            }
          }
          if (syncedAddresses.length > 0) {
            clearMemoryAddresses(userId);
            return NextResponse.json({ addresses: syncedAddresses });
          }
        }

        return NextResponse.json({ addresses });
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`Backend GET /users/me/addresses returned ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn("Failed to fetch real addresses from backend:", err);
    }
  }

  // Fallback memory store cho tài khoản demo/preview
  const addresses = getMemoryAddresses(userId);
  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;

  let body: {
    recipientName?: string;
    phone?: string;
    line1?: string;
    ward?: string;
    district?: string;
    province?: string;
    isDefault?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ." } },
      { status: 400 },
    );
  }

  const { recipientName, phone, line1, ward, district, province, isDefault } = body;
  if (!recipientName?.trim() || !phone?.trim() || !line1?.trim() || !province?.trim()) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Vui lòng điền đầy đủ họ tên, số điện thoại, địa chỉ và tỉnh/thành." } },
      { status: 422 },
    );
  }

  const session = access.session;
  const token = session?.tokens?.accessToken;

  if (token && !token.startsWith("session_")) {
    try {
      const { response: res } = await fetchBackendWithAuth(
        "/users/me/addresses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientName: recipientName.trim(),
            phone: phone.trim(),
            line1: line1.trim(),
            ward: ward?.trim() || undefined,
            district: district?.trim() || undefined,
            province: province.trim(),
            isDefault: Boolean(isDefault),
          }),
        },
        session,
      );

      if (res.ok) {
        const address = await res.json();
        return NextResponse.json({ success: true, address }, { status: 201 });
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`Backend POST /users/me/addresses returned ${res.status}:`, errText);
        return NextResponse.json(
          {
            error: {
              code: "BACKEND_ERROR",
              message: "Chưa thể lưu địa chỉ vào cơ sở dữ liệu. Vui lòng thử lại.",
            },
          },
          { status: res.status },
        );
      }
    } catch (err) {
      console.warn("Failed to create address on backend API:", err);
      return NextResponse.json(
        {
          error: {
            code: "SERVER_ERROR",
            message: "Không thể kết nối đến máy chủ cơ sở dữ liệu.",
          },
        },
        { status: 500 },
      );
    }
  }

  // Fallback memory store cho tài khoản demo
  const userId = access.session?.user.id ?? "user_default";
  const newAddress = addMemoryAddress(userId, {
    recipientName: recipientName.trim(),
    phone: phone.trim(),
    line1: line1.trim(),
    ward: ward?.trim(),
    district: district?.trim(),
    province: province.trim(),
    isDefault: Boolean(isDefault),
  });

  return NextResponse.json({ success: true, address: newAddress }, { status: 201 });
}
