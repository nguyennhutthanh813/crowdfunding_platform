import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import type { UserAddress } from "@/lib/api/contracts";
import {
  addMemoryAddress,
  getMemoryAddresses,
} from "@/lib/auth/address-memory-store";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireSession();
  if (access.response) return access.response;

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const token = access.session?.tokens?.accessToken;
  if (token && !token.startsWith("session_")) {
    try {
      const res = await fetch(`${apiUrl}/users/me/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3500),
        cache: "no-store",
      });
      if (res.ok) {
        const addresses = (await res.json()) as UserAddress[];
        return NextResponse.json({ addresses });
      }
    } catch (err) {
      console.warn("Failed to fetch real addresses from backend:", err);
    }
  }

  // Fallback memory store for preview/demo
  const userId = access.session?.user.id ?? "user_default";
  const addresses = getMemoryAddresses(
    userId,
    access.session?.user.name,
    access.session?.user.phone ?? undefined,
  );

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

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const token = access.session?.tokens?.accessToken;
  if (token && !token.startsWith("session_")) {
    try {
      const res = await fetch(`${apiUrl}/users/me/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          line1: line1.trim(),
          ward: ward?.trim(),
          district: district?.trim(),
          province: province.trim(),
          isDefault: Boolean(isDefault),
        }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const address = await res.json();
        return NextResponse.json({ success: true, address }, { status: 201 });
      }
    } catch (err) {
      console.warn("Failed to create address on backend API:", err);
    }
  }

  // Fallback memory store
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

