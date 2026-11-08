import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getServerPlatformPreviewState, writePlatformPreviewCookie } from "@/lib/auth/platform-preview-cookie";
import { previewInvitationForUser } from "@/lib/auth/preview-collaborators";
import { localDbEnabled } from "@/lib/local-db/database";

export async function POST(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Dữ liệu cập nhật chưa hợp lệ." } }, { status: 400 });
  }
  const payload = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown> : {};
  if (!["PUBLISH_UPDATE", "EDIT_UPDATE", "DELETE_UPDATE"].includes(String(payload.action)) || typeof payload.campaignId !== "string") {
    return NextResponse.json({ error: { code: "ACTION_INVALID", message: "Thiếu chiến dịch hoặc thao tác." } }, { status: 422 });
  }
  const platform = await getServerPlatformPreviewState();
  const invitation = previewInvitationForUser(payload.campaignId, access.session, platform);
  if (!invitation?.accepted || !invitation.permissions.canUpdate) {
    return NextResponse.json({ error: { code: "UPDATE_PERMISSION_REQUIRED", message: "Bạn chưa nhận lời mời hoặc chưa được cấp quyền đăng cập nhật." } }, { status: 403 });
  }
  if (invitation.status !== "LIVE") {
    return NextResponse.json({ error: { code: "CAMPAIGN_NOT_LIVE", message: "Chỉ đăng cập nhật khi chiến dịch đang gọi vốn." } }, { status: 409 });
  }
  if (payload.action === "EDIT_UPDATE" || payload.action === "DELETE_UPDATE") {
    const updateId = typeof payload.updateId === "string" ? payload.updateId : "";
    const current = platform.publishedUpdates.find((item) =>
      item.id === updateId && item.campaignId === invitation.campaignId);
    if (!current) {
      return NextResponse.json({ error: { code: "UPDATE_NOT_FOUND", message: "Không thấy bản tin trong chiến dịch này." } }, { status: 404 });
    }
    if (current.authorId !== access.session.user.id) {
      return NextResponse.json({ error: { code: "UPDATE_AUTHOR_REQUIRED", message: "Bạn chỉ được sửa hoặc gỡ bản tin do mình đăng." } }, { status: 403 });
    }
    let nextTitle = current.title;
    if (payload.action === "EDIT_UPDATE") {
      const title = typeof payload.title === "string" ? payload.title.trim() : "";
      const content = typeof payload.body === "string" ? payload.body.trim() : "";
      if (title.length < 8 || title.length > 80 || content.length < 30 || content.length > 1000) {
        return NextResponse.json({ error: { code: "UPDATE_INVALID", message: "Tiêu đề cần 8–80 ký tự, nội dung cần 30–1.000 ký tự." } }, { status: 422 });
      }
      nextTitle = title;
      platform.publishedUpdates = platform.publishedUpdates.map((item) =>
        item.id === updateId ? { ...item, title, body: content, when: "Vừa chỉnh sửa" } : item);
    } else {
      platform.publishedUpdates = platform.publishedUpdates.filter((item) => item.id !== updateId);
    }
    const response = NextResponse.json({ data: { id: updateId, campaignId: invitation.campaignId, action: payload.action } });
    return writePlatformPreviewCookie(response, platform, {
      campaignId: invitation.campaignId, actorUserId: access.session.user.id,
      actorRole: "COLLABORATOR", eventType: payload.action,
      stage: "FUNDING", visibility: "PUBLIC",
      title: payload.action === "EDIT_UPDATE" ? "Cộng tác viên chỉnh bản tin" : "Cộng tác viên gỡ bản tin",
      detail: nextTitle, refId: updateId,
    }) ?? response;
  }
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const content = typeof payload.body === "string" ? payload.body.trim() : "";
  if (title.length < 8 || title.length > 80 || content.length < 30 || content.length > 1000) {
    return NextResponse.json({ error: { code: "UPDATE_INVALID", message: "Tiêu đề cần 8–80 ký tự, nội dung cần 30–1.000 ký tự." } }, { status: 422 });
  }
  const update = {
    id: `update_${crypto.randomUUID().slice(0, 12)}`,
    campaignId: invitation.campaignId, title, body: content,
    author: access.session.user.name, authorId: access.session.user.id,
    publishedAt: new Date().toISOString(), when: "Vừa đăng",
  };
  platform.publishedUpdates = [update, ...platform.publishedUpdates]
    .slice(0, localDbEnabled() ? undefined : 8);
  const response = NextResponse.json({ data: { id: update.id, campaignId: update.campaignId } }, { status: 201 });
  return writePlatformPreviewCookie(response, platform, {
    campaignId: update.campaignId, actorUserId: access.session.user.id,
    actorRole: "COLLABORATOR", eventType: "PUBLISH_UPDATE", stage: "FUNDING",
    visibility: "PUBLIC", title: "Cộng tác viên đăng cập nhật", detail: update.title,
    refId: update.id,
  }) ?? response;
}
