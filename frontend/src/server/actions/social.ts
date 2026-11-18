"use server";

import { revalidatePath } from "next/cache";
import { apiPost } from "../api";

export type ToggleResult = { ok: boolean; on?: boolean; error?: string; needLogin?: boolean };

export async function toggleSaveAction(projectId: string): Promise<ToggleResult> {
  const res = await apiPost<ToggleResult>("/social/save", { projectId });
  if (res.ok) revalidatePath("/me");
  return res;
}

export async function toggleFollowAction(userId: string): Promise<ToggleResult> {
  const res = await apiPost<ToggleResult>("/social/follow", { userId });
  if (res.ok) revalidatePath("/me");
  return res;
}

export async function markNotificationsReadAction(ids?: string[]) {
  const res = await apiPost<{ ok: boolean }>("/social/notifications/read", { ids });
  revalidatePath("/", "layout");
  return res;
}

export async function reportAction(input: {
  targetType: "PROJECT" | "COMMENT" | "USER";
  projectId?: string;
  commentId?: string;
  userId?: string;
  reason: string;
  detail: string;
}) {
  return apiPost<{ ok: boolean; message?: string; error?: string }>("/social/report", input);
}
