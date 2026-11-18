"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ui/action-form";
import { apiPatch, apiPost, formToPayload } from "../api";

type Res = NonNullable<ActionResult>;

function revalidateMe(extra: string[] = []) {
  revalidatePath("/me");
  revalidatePath("/me/backed");
  revalidatePath("/me/activity");
  revalidatePath("/me/messages");
  revalidatePath("/me/notifications");
  revalidatePath("/me/settings");
  for (const p of extra) revalidatePath(p);
  revalidatePath("/", "layout");
}

export async function respondInvitationAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res & { slug?: string }>("/me/invitations/respond", formToPayload(form));
  if (res.ok) revalidateMe(["/studio", ...(res.slug ? [`/studio/${res.slug}`, `/p/${res.slug}`] : [])]);
  return res;
}

export async function cancelMyPledgeAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/pledges/cancel", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}

export async function sendMessageAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res & { conversationId?: string }>("/me/messages", formToPayload(form));
  if (res.ok) revalidateMe(res.conversationId ? [`/me/messages/${res.conversationId}`] : []);
  return res;
}

export async function markConversationReadAction(conversationId: string) {
  if (!conversationId) return { ok: false, updated: false };
  const res = await apiPost<{ ok: boolean; updated: boolean }>(
    `/me/conversations/${encodeURIComponent(conversationId)}/read`,
    {},
  );
  if (res.updated) {
    revalidatePath("/me");
    revalidatePath("/me/messages");
    revalidatePath(`/me/messages/${conversationId}`);
  }
  return res;
}

export async function startConversationAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res & { conversationId?: string }>("/me/conversations", formToPayload(form));
  if (res.ok) revalidateMe(res.conversationId ? [`/me/messages/${res.conversationId}`] : []);
  return res;
}

export async function updateProfileAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPatch<Res & { username?: string }>("/me/profile", formToPayload(form));
  if (res.ok) revalidateMe(res.username ? [`/u/${res.username}`] : []);
  return res;
}

export async function updateAccountAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPatch<Res & { oldUsername?: string; newUsername?: string }>(
    "/me/account",
    formToPayload(form),
  );
  if (res.ok) {
    const paths: string[] = [];
    if (res.oldUsername) paths.push(`/u/${res.oldUsername}`);
    if (res.newUsername) paths.push(`/u/${res.newUsername}`);
    revalidateMe(paths);
  }
  return res;
}

export async function changePasswordAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/password", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}

export async function updatePreferencesAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPatch<Res & { username?: string }>("/me/preferences", formToPayload(form));
  if (res.ok) revalidateMe(res.username ? [`/u/${res.username}`] : []);
  return res;
}

export async function saveAddressAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/addresses", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}

export async function setDefaultAddressAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/addresses/default", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}

export async function deleteAddressAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/addresses/delete", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}

export async function addCardAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/cards", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}

export async function setDefaultCardAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/cards/default", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}

export async function deleteCardAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<Res>("/me/cards/delete", formToPayload(form));
  if (res.ok) revalidateMe();
  return res;
}
