"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ui/action-form";
import { apiGet, apiPost, formToPayload } from "../api";

function revalidateProject(slug?: string) {
  revalidatePath("/studio");
  if (slug) {
    revalidatePath(`/studio/${slug}`);
    revalidatePath(`/studio/${slug}/setup`);
    revalidatePath(`/p/${slug}`);
  }
}

async function runStudioPost(path: string, form: FormData): Promise<ActionResult> {
  const res = await apiPost<ActionResult & { slug?: string }>(path, formToPayload(form));
  if (res.ok) revalidateProject(res.slug);
  return res;
}

export async function createDraftProjectAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/projects", form);
}
export async function updateBasicsAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/basics", form);
}
export async function saveSectionAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/sections/save", form);
}
export async function moveSectionAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/sections/move", form);
}
export async function deleteSectionAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/sections/delete", form);
}
export async function saveRisksAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/risks", form);
}

export async function saveTierAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/tiers/save", form);
}
export async function toggleTierActiveAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/tiers/toggle", form);
}
export async function deleteTierAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/tiers/delete", form);
}
export async function saveAddOnAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/addons/save", form);
}
export async function deleteAddOnAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/addons/delete", form);
}

export async function saveUpdateAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/updates/save", form);
}
export async function publishUpdateAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/updates/publish", form);
}
export async function deleteUpdateDraftAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/updates/delete", form);
}

export async function saveFaqAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/faqs/save", form);
}
export async function deleteFaqAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/faqs/delete", form);
}
export async function moveFaqAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/faqs/move", form);
}

export async function replyInboxCommentAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/comments/reply", form);
}
export async function markCommentHandledAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/comments/handled", form);
}
export async function moderateStudioCommentAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/comments/moderate", form);
}
export async function promoteCommentToFaqAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/comments/promote-faq", form);
}

export async function runAiPredictionAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/ai/predict", form);
}

export async function inviteCollaboratorAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/team/invite", form);
}
export async function resendInvitationAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/team/resend", form);
}
export async function revokeInvitationAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/team/revoke", form);
}
export async function removeCollaboratorAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/team/remove", form);
}
export async function leaveProjectAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await runStudioPost("/studio/team/leave", form);
  if (res?.ok) revalidatePath("/me");
  return res;
}
export async function searchInvitableUsersAction(
  slug: string,
  q: string,
): Promise<{
  ok: boolean;
  users: { id: string; username: string; display_name: string; email: string; avatar_url: string | null }[];
  error?: string;
}> {
  if (!slug) return { ok: false, users: [], error: "Thiếu thông tin dự án." };
  const res = await apiGet<{
    ok?: boolean;
    users?: { id: string; username: string; display_name: string; email: string; avatar_url: string | null }[];
    error?: string;
  }>(`/studio/projects/${encodeURIComponent(slug)}/team/search?q=${encodeURIComponent(q)}`);
  return { ok: Boolean(res.ok), users: res.users ?? [], error: res.error };
}

export async function saveFundingScheduleAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/funding-schedule", form);
}
export async function submitForReviewAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/submit", form);
}
export async function withdrawSubmissionAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/withdraw", form);
}
export async function setScheduleAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/schedule", form);
}
export async function launchNowAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/launch", form);
}
export async function cancelProjectAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/cancel", form);
}
export async function deleteDraftAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/delete", form);
}
export async function saveCompletedDisplayAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/lifecycle/completion", form);
}

export async function advanceFulfillmentAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/fulfillment/advance", form);
}
export async function updateShipmentAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/fulfillment/shipment", form);
}
export async function bulkShipAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runStudioPost("/studio/fulfillment/bulk-ship", form);
}
