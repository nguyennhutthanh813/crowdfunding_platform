import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db";
import { one } from "@/server/db/helpers";
import { createSession, destroySession } from "@/server/auth/session";

/** Chỉ dùng khi phát triển: /api/dev/login?u=hoanglinh&next=/studio  (u= rỗng để đăng xuất). */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const u = req.nextUrl.searchParams.get("u");
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  if (!u) {
    await destroySession();
  } else {
    const row = one<{ id: string }>(getDb(), `SELECT id FROM users WHERE username = ?`, u);
    if (!row) return new NextResponse("No such user", { status: 404 });
    await createSession(row.id);
  }
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", req.url));
}
