import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE_NAME } from "./session-cookie";

export async function getServerSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
