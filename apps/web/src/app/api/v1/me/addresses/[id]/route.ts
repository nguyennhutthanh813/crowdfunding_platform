import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import {
  deleteMemoryAddress,
  updateMemoryAddress,
} from "@/lib/auth/address-memory-store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const access = await requireSession();
  if (access.response) return access.response;

  const { id } = await props.params;
  const body = await request.json().catch(() => ({}));

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const token = access.session?.tokens?.accessToken;
  if (token && !token.startsWith("session_")) {
    try {
      const res = await fetch(`${apiUrl}/users/me/addresses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        return NextResponse.json({ success: true, address: await res.json() });
      }
    } catch (err) {
      console.warn("Failed to update address on backend API:", err);
    }
  }

  // Fallback memory store
  const userId = access.session?.user.id ?? "user_default";
  const updated = updateMemoryAddress(userId, id, body);

  return NextResponse.json({ success: true, address: updated });
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const access = await requireSession();
  if (access.response) return access.response;

  const { id } = await props.params;

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const token = access.session?.tokens?.accessToken;
  if (token && !token.startsWith("session_")) {
    try {
      const res = await fetch(`${apiUrl}/users/me/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        return NextResponse.json({ success: true });
      }
    } catch (err) {
      console.warn("Failed to delete address on backend API:", err);
    }
  }

  // Fallback memory store
  const userId = access.session?.user.id ?? "user_default";
  deleteMemoryAddress(userId, id);

  return NextResponse.json({ success: true });
}

