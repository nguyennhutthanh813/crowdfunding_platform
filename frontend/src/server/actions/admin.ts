"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ui/action-form";
import { apiPost, formToPayload } from "../api";

function revalidateAdminPaths(...extra: string[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/scheduler");
  revalidatePath("/admin/audit");
  for (const path of extra) revalidatePath(path);
}

async function runAdminPost(path: string, form?: FormData, extraPaths: string[] = []): Promise<ActionResult> {
  const res = await apiPost<ActionResult & { slug?: string }>(path, form ? formToPayload(form) : {});
  if (res.ok) {
    revalidateAdminPaths(
      ...extraPaths,
      ...(res.slug ? [`/p/${res.slug}`, `/admin/reviews/${res.slug}`] : []),
    );
  }
  return res;
}

export async function decideReviewAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/reviews/decide", form, ["/", "/explore"]);
}

export async function takedownProjectAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/projects/takedown", form, ["/", "/explore"]);
}

export async function restoreProjectAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/projects/restore", form, ["/", "/explore"]);
}

export async function toggleUserLockAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/users/lock", form);
}

export async function adminResetUserTwoFactorAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/users/reset-2fa", form);
}

export async function adminCreateUserAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/users/create", form);
}

export async function adminUpdateUserAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/users/update", form);
}

export async function adminSetUserPasswordAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/users/set-password", form);
}

export async function adminDeleteUserAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/users/delete", form);
}

export async function handleReportAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/reports/handle", form, ["/", "/explore"]);
}

export async function saveCategoryAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/categories/save", form, ["/", "/explore"]);
}

export async function toggleCategoryAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/categories/toggle", form, ["/", "/explore"]);
}

export async function deleteCategoryAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/categories/delete", form, ["/", "/explore"]);
}

export async function refundPledgeAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/transactions/refund", form, ["/", "/explore", "/me/backed"]);
}

export async function resolveFailedCaptureAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/transactions/resolve-failed", form, ["/me/backed"]);
}

export async function runSchedulerNowAction(_p: ActionResult, _form: FormData): Promise<ActionResult> {
  void _form;
  return runAdminPost("/admin/scheduler/run", undefined, ["/", "/explore"]);
}

export async function settleLiveProjectNowAction(_p: ActionResult, form: FormData): Promise<ActionResult> {
  return runAdminPost("/admin/scheduler/settle-project", form, ["/", "/explore"]);
}

export async function flushEmailOutboxAction(_p: ActionResult, _form: FormData): Promise<ActionResult> {
  void _form;
  return runAdminPost("/api/v1/admin/email-outbox/flush");
}
