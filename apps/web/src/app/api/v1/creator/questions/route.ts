import { NextResponse } from "next/server";
import {
  getServerPlatformPreviewState,
  writePlatformPreviewCookie,
} from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { previewQuestionResponders } from "@/lib/campaign/question-assignments";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const access = await requireSession(["CREATOR"]);
  if (access.response) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Dữ liệu gửi lên chưa đúng định dạng.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError(422, "INVALID_BODY", "Thông tin phân công chưa hợp lệ.");
  }
  const input = body as Record<string, unknown>;
  const campaignId = typeof input.campaignId === "string" ? input.campaignId : "";
  const commentId = typeof input.commentId === "string" ? input.commentId : "";
  const assigneeUserId = input.assigneeUserId;
  if (!isPreviewCampaignId(campaignId) || !commentId) {
    return apiError(404, "QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi trong chiến dịch này.");
  }
  if (assigneeUserId !== null && (typeof assigneeUserId !== "string" || !assigneeUserId)) {
    return apiError(422, "ASSIGNEE_INVALID", "Hãy chọn một cộng tác viên hoặc bỏ phân công.");
  }

  const platform = await getServerPlatformPreviewState();
  const snapshot = platform.campaignDrafts[campaignId];
  if (!snapshot) return apiError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy chiến dịch.");
  if (snapshot.ownerId !== access.session!.user.id) {
    return apiError(403, "CAMPAIGN_OWNER_REQUIRED", "Chỉ chủ dự án được phân công câu hỏi.");
  }
  const status = previewCampaignStatus(campaignId, platform);
  if (!["PRE_LAUNCH", "LIVE"].includes(status)) {
    return apiError(409, "CAMPAIGN_NOT_OPEN", "Chỉ phân công sau khi hồ sơ đã được duyệt và chưa bị tạm dừng.");
  }
  const question = platform.campaignComments.find((item) =>
    item.campaignId === campaignId && item.id === commentId &&
    item.kind === "QUESTION" && !item.parentId);
  if (!question) return apiError(404, "QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi trong chiến dịch này.");
  const answered = platform.campaignComments.some((item) =>
    item.campaignId === campaignId && item.parentId === commentId &&
    (item.badge === "CREATOR" || item.badge === "COLLABORATOR"));
  if (answered) return apiError(409, "QUESTION_ANSWERED", "Câu hỏi này đã được nhóm trả lời.");

  const responders = previewQuestionResponders(campaignId, platform);
  const chosen = responders.find((item) => item.userId === assigneeUserId);
  if (assigneeUserId !== null && !chosen) {
    return apiError(422, "ASSIGNEE_NOT_ELIGIBLE", "Người được chọn chưa nhận lời mời hoặc chưa có quyền trả lời.");
  }
  const previous = platform.questionAssignments ?? [];
  const current = previous.find((item) =>
    item.campaignId === campaignId && item.commentId === commentId);
  if ((current?.assigneeUserId ?? null) === assigneeUserId) {
    return NextResponse.json({ data: { persisted: true, commentId, assigneeUserId } });
  }
  platform.questionAssignments = previous.filter((item) =>
    item.campaignId !== campaignId || item.commentId !== commentId);
  if (chosen) platform.questionAssignments.unshift({
    campaignId,
    commentId,
    assigneeUserId: chosen.userId,
    assignedByUserId: access.session!.user.id,
    assignedAt: new Date().toISOString(),
  });
  const response = NextResponse.json({ data: { persisted: true, commentId, assigneeUserId } });
  return writePlatformPreviewCookie(response, platform, {
    campaignId,
    actorUserId: access.session!.user.id,
    actorRole: "CREATOR",
    eventType: chosen ? "ASSIGN_QUESTION" : "UNASSIGN_QUESTION",
    stage: status === "LIVE" ? "FUNDING" : "PREPARATION",
    visibility: "TEAM",
    title: chosen ? `Giao câu hỏi cho ${chosen.name}` : "Bỏ phân công câu hỏi",
    detail: `Câu hỏi ${commentId.slice(-6).toUpperCase()} trong chiến dịch được cập nhật người phụ trách.`,
    refId: commentId,
  }) ?? response;
}
