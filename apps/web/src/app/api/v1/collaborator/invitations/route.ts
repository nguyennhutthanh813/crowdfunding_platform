import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getServerPlatformPreviewState, writePlatformPreviewCookie } from "@/lib/auth/platform-preview-cookie";
import { previewInvitationForUser } from "@/lib/auth/preview-collaborators";

export async function POST(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Dữ liệu lời mời chưa hợp lệ." } }, { status: 400 });
  }
  const payload = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown> : {};
  if ((payload.action !== "ACCEPT" && payload.action !== "DECLINE") || typeof payload.campaignId !== "string") {
    return NextResponse.json({ error: { code: "INVITATION_INVALID", message: "Thiếu hồ sơ cần tham gia." } }, { status: 422 });
  }
  const platform = await getServerPlatformPreviewState();
  const invitation = previewInvitationForUser(payload.campaignId, access.session, platform);
  if (!invitation) {
    return NextResponse.json({ error: { code: "INVITATION_NOT_FOUND", message: "Email tài khoản này không có lời mời vào hồ sơ." } }, { status: 403 });
  }
  if (invitation.accepted) {
    if (payload.action === "DECLINE") {
      return NextResponse.json({ error: { code: "ALREADY_JOINED", message: "Bạn đã tham gia nhóm. Hãy liên hệ Chủ dự án nếu muốn rời nhóm." } }, { status: 409 });
    }
    return NextResponse.json({ data: { campaignId: invitation.campaignId, accepted: true } });
  }
  if (payload.action === "DECLINE") {
    const snapshot = platform.campaignDrafts[invitation.campaignId];
    snapshot.collaborators = (snapshot.collaborators ?? []).filter((member) =>
      member.email.trim().toLowerCase() !== access.session.user.email.trim().toLowerCase());
    const response = NextResponse.json({ data: { campaignId: invitation.campaignId, accepted: false, declined: true } });
    return writePlatformPreviewCookie(response, platform, {
      campaignId: invitation.campaignId, actorUserId: access.session.user.id,
      actorRole: "COLLABORATOR", eventType: "DECLINE_INVITATION", stage: "PREPARATION",
      visibility: "TEAM", title: "Người được mời từ chối tham gia nhóm",
      detail: "Lời mời đã được gỡ. Chủ dự án có thể mời lại nếu hai bên thống nhất.",
    }) ?? response;
  }
  platform.acceptedCollaborators = {
    ...platform.acceptedCollaborators,
    [invitation.campaignId]: [
      ...new Set([...(platform.acceptedCollaborators[invitation.campaignId] ?? []), access.session.user.id]),
    ],
  };
  const response = NextResponse.json({ data: { campaignId: invitation.campaignId, accepted: true } });
  return writePlatformPreviewCookie(response, platform, {
    campaignId: invitation.campaignId, actorUserId: access.session.user.id,
    actorRole: "COLLABORATOR", eventType: "ACCEPT_INVITATION", stage: "PREPARATION",
    visibility: "TEAM", title: "Cộng tác viên chấp nhận lời mời",
    detail: "Tài khoản khớp email trong hồ sơ và đã tự xác nhận tham gia.",
  }) ?? response;
}
