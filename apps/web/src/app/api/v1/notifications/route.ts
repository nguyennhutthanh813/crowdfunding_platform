import { NextResponse } from "next/server";
import { getServerPlatformPreviewState, writePlatformPreviewCookie } from "@/lib/auth/platform-preview-cookie";
import { previewInvitationForUser } from "@/lib/auth/preview-collaborators";
import { requireSession } from "@/lib/auth/require-session";

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET() {
  const access = await requireSession();
  if (access.response) return access.response;
  const platform = await getServerPlatformPreviewState();
  const user = access.session!.user;
  const items = platform.questionAssignments.flatMap((assignment) => {
    if (assignment.assigneeUserId !== user.id) return [];
    const invitation = previewInvitationForUser(assignment.campaignId, access.session!, platform);
    if (!invitation?.accepted || !invitation.permissions.canReply) return [];
    const question = platform.campaignComments.find((comment) =>
      comment.campaignId === assignment.campaignId && comment.id === assignment.commentId &&
      comment.kind === "QUESTION" && !comment.parentId);
    if (!question) return [];
    const answered = platform.campaignComments.some((comment) =>
      comment.campaignId === assignment.campaignId && comment.parentId === question.id &&
      (comment.badge === "CREATOR" || comment.badge === "COLLABORATOR"));
    return [{
      campaignId: assignment.campaignId,
      commentId: assignment.commentId,
      assignedAt: assignment.assignedAt,
      readAt: assignment.readAt ?? null,
      campaignTitle: invitation.title,
      question: question.body,
      answered,
      href: `/collaborator/campaigns/${assignment.campaignId}/manage#cau-hoi-cong-dong`,
    }];
  }).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  return NextResponse.json({ data: {
    unreadCount: items.filter((item) => !item.readAt && !item.answered).length,
    items: items.slice(0, 20),
  } });
}

export async function PATCH(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Dữ liệu gửi lên chưa đúng định dạng.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError(422, "INVALID_BODY", "Thông báo cần đánh dấu chưa hợp lệ.");
  }
  const input = body as Record<string, unknown>;
  const campaignId = typeof input.campaignId === "string" ? input.campaignId : "";
  const commentId = typeof input.commentId === "string" ? input.commentId : "";
  const assignedAt = typeof input.assignedAt === "string" ? input.assignedAt : "";
  if (!campaignId || !commentId || !assignedAt) {
    return apiError(422, "NOTIFICATION_INVALID", "Thiếu mã câu hỏi hoặc thời điểm giao việc.");
  }
  const platform = await getServerPlatformPreviewState();
  const invitation = previewInvitationForUser(campaignId, access.session!, platform);
  if (!invitation?.accepted || !invitation.permissions.canReply) {
    return apiError(403, "NOTIFICATION_PERMISSION_REQUIRED", "Bạn không còn quyền xử lý câu hỏi của chiến dịch này.");
  }
  const assignment = platform.questionAssignments.find((item) =>
    item.campaignId === campaignId && item.commentId === commentId &&
    item.assignedAt === assignedAt && item.assigneeUserId === access.session!.user.id);
  if (!assignment) return apiError(404, "NOTIFICATION_NOT_FOUND", "Thông báo này không còn thuộc phần việc của bạn.");
  if (assignment.readAt) return NextResponse.json({ data: { persisted: true, readAt: assignment.readAt } });
  const readAt = new Date().toISOString();
  platform.questionAssignments = platform.questionAssignments.map((item) =>
    item === assignment ? { ...item, readAt } : item);
  const response = NextResponse.json({ data: { persisted: true, readAt } });
  return writePlatformPreviewCookie(response, platform) ?? response;
}
