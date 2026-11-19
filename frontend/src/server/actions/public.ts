"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiPatch, apiPost, formToPayload } from "../api";
import type { ActionResult } from "@/components/ui/action-form";

export type CommentLikeResult = { ok: boolean; on?: boolean; error?: string; needLogin?: boolean };

export async function recordProjectViewAction(projectId: string) {
  if (!projectId) return { ok: false };
  try {
    const jar = await cookies();
    const key = `fv_viewed_${projectId}`;
    if (jar.get(key)?.value) return { ok: true, counted: false };
    const res = await apiPost<{ ok?: boolean; counted?: boolean }>(`/projects/${encodeURIComponent(projectId)}/view`, {});
    if (!res.ok) return { ok: false };
    jar.set(key, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return { ok: true, counted: true };
  } catch {
    return { ok: false };
  }
}

export async function addCommentAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<ActionResult & { slug?: string }>("/comments", formToPayload(form));
  if (res.ok && res.slug) revalidatePath(`/p/${res.slug}`);
  return res;
}

export async function editCommentAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPatch<ActionResult & { slug?: string }>("/comments", formToPayload(form));
  if (res.ok && res.slug) revalidatePath(`/p/${res.slug}`);
  return res;
}

export async function toggleCommentLikeAction(commentId: string, slug: string): Promise<CommentLikeResult> {
  const res = await apiPost<CommentLikeResult>(`/comments/${encodeURIComponent(commentId)}/like`, {});
  if (res.ok) revalidatePath(`/p/${slug}`);
  return res;
}

export async function moderateCommentAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<ActionResult & { slug?: string }>("/comments/moderate", formToPayload(form));
  if (res.ok && res.slug) revalidatePath(`/p/${res.slug}`);
  return res;
}

export async function submitPledgeAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<ActionResult & { slug?: string }>("/pledges", formToPayload(form));
  if (res.ok) {
    if (res.slug) revalidatePath(`/p/${res.slug}`);
    revalidatePath("/me");
    revalidatePath("/me/backed");
    revalidatePath("/explore");
    revalidatePath("/");
  }
  return res;
}

export async function createVnpayRetryOrderAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const res = await apiPost<{ ok?: boolean; error?: string; checkoutUrl?: string; slug?: string }>(
    "/vnpay/create-order",
    formToPayload(form),
  );
  if (!res.ok || !res.checkoutUrl) {
    return { error: res.error ?? "Không thể khởi tạo phiên thanh toán lại qua VNPAY." };
  }
  return {
    ok: true,
    message: "Đang chuyển tới cổng thanh toán VNPAY...",
    redirect: res.checkoutUrl,
  };
}

export async function processVnpayGatewayAction(payload: {
  txnRef: string;
  orderToken?: string;
  payChannel: "VNPAYQR" | "VNBANK" | "INTCARD";
  bankCode: string;
  cardNumber?: string;
  cardHolder?: string;
  issueDate?: string;
  otp?: string;
  simulateCode?: string;
}): Promise<{ ok: boolean; responseCode?: string; returnUrl?: string; error?: string }> {
  const res = await apiPost<{
    ok?: boolean;
    responseCode?: string;
    returnUrl?: string;
    pledgeCode?: string;
    error?: string;
  }>("/vnpay/process", payload);

  if (res.ok) {
    revalidatePath("/me");
    revalidatePath("/me/backed");
    revalidatePath("/admin/transactions");
    revalidatePath("/explore");
    revalidatePath("/");
  }

  return {
    ok: Boolean(res.ok),
    responseCode: res.responseCode,
    returnUrl: res.returnUrl,
    error: res.error,
  };
}
