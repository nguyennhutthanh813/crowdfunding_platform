import { NextResponse } from "next/server";
import { mockUsers } from "@/lib/api/mock/relational-store";
import { requireSession } from "@/lib/auth/require-session";
import { getServerPlatformPreviewState, writePlatformPreviewCookie } from "@/lib/auth/platform-preview-cookie";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const access = await requireSession(["CREATOR"]);
  if (access.response) return access.response;
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return fail(400, "INVALID_JSON", "Thông tin thành viên chưa đúng định dạng.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fail(422, "INVALID_BODY", "Thiếu thông tin thành viên.");
  }
  const input = raw as Record<string, unknown>;
  const campaignId = typeof input.campaignId === "string" ? input.campaignId : "";
  const action = input.action;
  const platform = await getServerPlatformPreviewState();
  const snapshot = isPreviewCampaignId(campaignId) ? platform.campaignDrafts[campaignId] : null;
  if (!snapshot || snapshot.ownerId !== access.session!.user.id) {
    return fail(404, "CAMPAIGN_NOT_OWNED", "Không thấy chiến dịch thuộc tài khoản này.");
  }
  const status = previewCampaignStatus(campaignId, platform);
  if (status !== "PRE_LAUNCH" && status !== "LIVE") {
    return fail(409, "TEAM_LOCKED", "Hãy quản lý nhóm sau khi hồ sơ được duyệt. Bản nháp chỉnh trong biểu mẫu tạo chiến dịch.");
  }
  const members = snapshot.collaborators ?? [];
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const found = members.find((item) => item.email.trim().toLowerCase() === email);
  let eventTitle = "";
  if (action === "INVITE") {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || name.length > 80) {
      return fail(422, "INVITATION_INVALID", "Nhập email hợp lệ và tên người được mời từ 2 đến 80 ký tự.");
    }
    if (email === access.session!.user.email.toLowerCase() || found) {
      return fail(409, "INVITATION_DUPLICATE", "Email này đã là chủ dự án hoặc đã có trong nhóm.");
    }
    if (members.length >= 5) return fail(409, "TEAM_LIMIT", "Mỗi chiến dịch mẫu có tối đa 5 cộng tác viên.");
    snapshot.collaborators = [...members, {
      id: Math.max(0, ...members.map((item) => item.id)) + 1,
      email, name,
      canUpdate: true, canReply: true, canViewAi: false,
    }];
    eventTitle = "Mời cộng tác viên";
  } else if (action === "UPDATE_PERMISSIONS") {
    if (!found) return fail(404, "MEMBER_NOT_FOUND", "Email này không có trong nhóm chiến dịch.");
    if ([input.canUpdate, input.canReply, input.canViewAi].some((value) => typeof value !== "boolean")) {
      return fail(422, "PERMISSIONS_INVALID", "Ba quyền cộng tác cần được chọn rõ ràng.");
    }
    snapshot.collaborators = members.map((item) => item === found ? {
      ...item, canUpdate: input.canUpdate as boolean,
      canReply: input.canReply as boolean, canViewAi: input.canViewAi as boolean,
    } : item);
    eventTitle = "Đổi quyền cộng tác";
  } else if (action === "REMOVE") {
    if (!found) return fail(404, "MEMBER_NOT_FOUND", "Email này không có trong nhóm chiến dịch.");
    const account = [...mockUsers.map((item) => ({ id: item.id, email: item.email })),
      ...platform.registeredAccounts.map((item) => ({ id: item.id, email: item.email }))]
      .find((item) => item.email?.toLowerCase() === email);
    const userId = account?.id;
    snapshot.collaborators = members.filter((item) => item !== found);
    if (userId) {
      if ((platform.acceptedCollaborators[campaignId] ?? []).includes(userId)) {
        platform.formerCollaborators ??= {};
        platform.formerCollaborators[campaignId] = [
          ...new Set([...(platform.formerCollaborators[campaignId] ?? []), userId]),
        ];
      }
      platform.acceptedCollaborators[campaignId] = (platform.acceptedCollaborators[campaignId] ?? [])
        .filter((id) => id !== userId);
    }
    eventTitle = "Thu hồi quyền cộng tác";
  } else {
    return fail(400, "ACTION_INVALID", "Thao tác nhóm chưa hợp lệ.");
  }
  const response = NextResponse.json({ data: { campaignId, email, action } });
  return writePlatformPreviewCookie(response, platform, {
    campaignId, actorUserId: access.session!.user.id, actorRole: "CREATOR",
    eventType: `TEAM_${action}`, stage: status === "LIVE" ? "FUNDING" : "PREPARATION",
    visibility: "TEAM", title: eventTitle, detail: email,
  }) ?? response;
}
