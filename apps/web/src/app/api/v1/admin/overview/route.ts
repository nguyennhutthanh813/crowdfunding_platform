import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { applyAdminPreviewState } from "@/lib/preview-read-models";

export async function GET() {
  const access = await requireSession(["ADMIN"]);
  if (access.response) return access.response;
  const [data, platformState] = await Promise.all([
    api.getAdminDashboard(),
    getServerPlatformPreviewState(),
  ]);
  return Response.json(
    applyAdminPreviewState(data, access.session, platformState),
  );
}
