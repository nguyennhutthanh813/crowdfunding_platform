import { NextResponse } from "next/server";
import { mockUsers } from "@/lib/api/mock/relational-store";
import { getServerPlatformPreviewState, writePlatformPreviewCookie } from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";
import { localDbEnabled } from "@/lib/local-db/database";

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const access = await requireSession();
  if (access.response) return access.response;
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return error(400, "INVALID_JSON", "Dữ liệu công việc chưa đúng định dạng.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return error(422, "INVALID_BODY", "Thông tin công việc chưa hợp lệ.");
  }
  const input = raw as Record<string, unknown>;
  const campaignId = typeof input.campaignId === "string" ? input.campaignId : "";
  const action = input.action;
  if (!isPreviewCampaignId(campaignId)) return error(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy chiến dịch này.");
  if (!["CREATE", "EDIT", "DELETE", "UPDATE_STATUS"].includes(String(action))) {
    return error(400, "ACTION_INVALID", "Thao tác công việc chưa hợp lệ.");
  }
  const platform = await getServerPlatformPreviewState();
  const snapshot = platform.campaignDrafts[campaignId];
  if (!snapshot) return error(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy chiến dịch này.");
  const user = access.session!.user;
  const owner = snapshot.ownerId === user.id && user.roles.includes("CREATOR");
  const collaborator = !owner &&
    (platform.acceptedCollaborators[campaignId] ?? []).includes(user.id) &&
    snapshot.collaborators?.some((item) => item.email.toLowerCase() === user.email.toLowerCase());
  if (!owner && !collaborator) return error(403, "TASK_ACCESS_DENIED", "Bạn chưa tham gia nhóm của chiến dịch này.");
  const status = previewCampaignStatus(campaignId, platform);
  if (status !== "PRE_LAUNCH" && status !== "LIVE") {
    return error(409, "CAMPAIGN_NOT_OPEN", "Chỉ quản lý công việc sau khi hồ sơ được duyệt và chưa bị tạm dừng.");
  }
  const taskId = typeof input.taskId === "string" ? input.taskId : "";
  const current = (platform.campaignTasks ?? []).find((item) => item.id === taskId && item.campaignId === campaignId);
  if (action !== "CREATE" && !current) return error(404, "TASK_NOT_FOUND", "Công việc không còn trong chiến dịch này.");
  if (action !== "UPDATE_STATUS" && !owner) {
    return error(403, "TASK_OWNER_REQUIRED", "Chỉ chủ dự án được giao, sửa hoặc xóa công việc.");
  }
  if (action === "UPDATE_STATUS" && !owner && current?.assigneeUserId !== user.id) {
    return error(403, "TASK_ASSIGNEE_REQUIRED", "Bạn chỉ được cập nhật việc đã giao cho mình.");
  }

  let title = current?.title ?? "";
  let nextTaskId = taskId;
  let handoffNote = "";
  let reassigned = false;
  let handoffId: string | null = null;
  if (action === "CREATE" || action === "EDIT") {
    title = typeof input.title === "string" ? input.title.trim() : "";
    const detail = typeof input.detail === "string" ? input.detail.trim() : "";
    const assigneeUserId = typeof input.assigneeUserId === "string" ? input.assigneeUserId : "";
    if (title.length < 5 || title.length > 100 || detail.length > 500) {
      return error(422, "TASK_INVALID", "Tên việc cần 5–100 ký tự; ghi chú tối đa 500 ký tự.");
    }
    const account = [...mockUsers.map((item) => ({ id: item.id, email: item.email })),
      ...platform.registeredAccounts.map((item) => ({ id: item.id, email: item.email }))]
      .find((item) => item.id === assigneeUserId);
    const eligible = assigneeUserId === snapshot.ownerId ||
      ((platform.acceptedCollaborators[campaignId] ?? []).includes(assigneeUserId) &&
        snapshot.collaborators?.some((item) => item.email.toLowerCase() === account?.email?.toLowerCase()));
    if (!account || !eligible) return error(422, "ASSIGNEE_INVALID", "Chỉ giao việc cho chủ dự án hoặc cộng tác viên đã nhận lời mời.");
    reassigned = action === "EDIT" && current?.assigneeUserId !== assigneeUserId;
    if (reassigned) {
      handoffNote = typeof input.handoffNote === "string" ? input.handoffNote.trim() : "";
      if (handoffNote.length < 5 || handoffNote.length > 200) {
        return error(422, "HANDOFF_NOTE_REQUIRED", "Khi đổi người phụ trách, hãy ghi lý do bàn giao từ 5 đến 200 ký tự.");
      }
    }
    if (action === "CREATE") {
      if (!localDbEnabled() && (platform.campaignTasks ?? []).length >= 12) {
        return error(409, "TASK_LIMIT", "Bản dùng thử trên trình duyệt đã đủ 12 công việc.");
      }
      nextTaskId = `task_preview_${crypto.randomUUID().slice(0, 12)}`;
      platform.campaignTasks = [{ id: nextTaskId, campaignId, title, detail,
        assigneeUserId, createdByUserId: user.id, status: "TODO",
        createdAt: new Date().toISOString() }, ...(platform.campaignTasks ?? [])];
    } else {
      platform.campaignTasks = platform.campaignTasks.map((item) =>
        item.id === taskId ? { ...item, title, detail, assigneeUserId } : item);
      if (reassigned && current) {
        handoffId = `handoff_preview_${crypto.randomUUID().slice(0, 12)}`;
        platform.campaignTaskHandoffs = [{
        id: handoffId,
        taskId, campaignId, fromUserId: current.assigneeUserId, toUserId: assigneeUserId,
        note: handoffNote, createdAt: new Date().toISOString(),
      }, ...(platform.campaignTaskHandoffs ?? [])];
      }
    }
  } else if (action === "UPDATE_STATUS") {
    const nextStatus = input.status;
    if (!["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(String(nextStatus))) {
      return error(422, "TASK_STATUS_INVALID", "Trạng thái công việc chưa hợp lệ.");
    }
    if (!owner && nextStatus === "IN_REVIEW") {
      return error(403, "TASK_REVIEW_OWNER_REQUIRED", "Bước chờ duyệt do chủ dự án cập nhật.");
    }
    platform.campaignTasks = platform.campaignTasks.map((item) =>
      item.id === taskId ? { ...item, status: nextStatus as typeof item.status } : item);
  } else {
    platform.campaignTasks = platform.campaignTasks.filter((item) => item.id !== taskId);
    platform.campaignTaskHandoffs = (platform.campaignTaskHandoffs ?? []).filter((item) => item.taskId !== taskId);
  }
  const labels = { CREATE: "Giao công việc", EDIT: "Sửa công việc", DELETE: "Xóa công việc", UPDATE_STATUS: "Đổi trạng thái công việc" } as const;
  const response = NextResponse.json({ data: { campaignId, taskId: nextTaskId, handoffId, action } },
    { status: action === "CREATE" ? 201 : 200 });
  return writePlatformPreviewCookie(response, platform, {
    campaignId, actorUserId: user.id, actorRole: owner ? "CREATOR" : "COLLABORATOR",
    eventType: reassigned ? "TASK_HANDOFF" : `TASK_${action}`, stage: status === "LIVE" ? "FUNDING" : "PREPARATION",
    visibility: "TEAM", title: reassigned ? "Bàn giao công việc" : labels[action as keyof typeof labels],
    detail: reassigned ? `${title}: ${handoffNote}` : title,
    refId: nextTaskId,
  }) ?? response;
}
