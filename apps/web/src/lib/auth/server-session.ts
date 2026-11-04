import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE_NAME } from "./session-cookie";
import {
  decodePlatformPreview,
  PLATFORM_PREVIEW_COOKIE_NAME,
} from "./platform-preview-cookie";
import { hydrateLocalSession, localSessionUserExists } from "@/lib/local-db/database";

export async function getServerSession() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !localSessionUserExists(session.user.id)) return null;

  const platformState = decodePlatformPreview(
    cookieStore.get(PLATFORM_PREVIEW_COOKIE_NAME)?.value,
  );
  return platformState.userStatuses[session.user.id] === "SUSPENDED"
    ? null
    : hydrateLocalSession(session);
}
