import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE_NAME } from "./session-cookie";
import { getServerPlatformPreviewState } from "./platform-preview-cookie";
import { hydrateLocalSession, localSessionUserExists } from "@/lib/local-db/database";
import { campaignWorkspaceSession } from "./campaign-workspace-session";

export async function getServerSession() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !localSessionUserExists(session.user.id)) return null;

  const platformState = await getServerPlatformPreviewState();
  return platformState.userStatuses[session.user.id] === "SUSPENDED"
    ? null
    : campaignWorkspaceSession(hydrateLocalSession(session), platformState);
}
