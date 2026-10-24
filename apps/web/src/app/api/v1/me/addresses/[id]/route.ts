import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import {
  deleteMemoryAddress,
  updateMemoryAddress,
} from "@/lib/auth/address-memory-store";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const access = await requireSession();
  if (access.response) return access.response;

  const { id } = await props.params;
  const body = await request.json().catch(() => ({}));

  const session = access.session;
  const token = session?.tokens?.accessToken;

  if (token && !token.startsWith("session_")) {
    try {
      const { response: res } = await fetchBackendWithAuth(
        `/users/me/addresses/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        session,
      );

      if (res.ok) {
        return NextResponse.json({ success: true, address: await res.json() });
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`Backend PATCH /users/me/addresses/${id} returned ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn("Failed to update address on backend API:", err);
    }
  }

  // Fallback memory store cho tài khoản demo
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
  const session = access.session;
  const token = session?.tokens?.accessToken;

  if (token && !token.startsWith("session_")) {
    try {
      const { response: res } = await fetchBackendWithAuth(
        `/users/me/addresses/${id}`,
        {
          method: "DELETE",
        },
        session,
      );

      if (res.ok) {
        return NextResponse.json({ success: true });
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`Backend DELETE /users/me/addresses/${id} returned ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn("Failed to delete address on backend API:", err);
    }
  }

  // Fallback memory store cho tài khoản demo
  const userId = access.session?.user.id ?? "user_default";
  deleteMemoryAddress(userId, id);

  return NextResponse.json({ success: true });
}
