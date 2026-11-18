"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, FileEdit, Loader2, Lock, Megaphone, Pencil, Plus, Send, Trash2 } from "lucide-react";
import type { UpdateRow } from "@/server/queries/studio";
import { deleteUpdateDraftAction, publishUpdateAction, saveUpdateAction } from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { Badge, RoleBadge } from "@/components/ui/primitives";
import { formatDate, timeAgo } from "@/lib/utils";
import { LOCK_REASON } from "./meta";

function ModeSubmit({
  value,
  variant,
  children,
}: {
  value: "0" | "1";
  variant: Parameters<typeof buttonClass>[0];
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="publish" value={value} disabled={pending} className={buttonClass(variant, "md")}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function UpdatesPanel({
  projectId,
  updates,
  canPublish,
}: {
  projectId: string;
  updates: UpdateRow[];
  canPublish: boolean;
}) {
  const [editing, setEditing] = useState<UpdateRow | null>(null);

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Megaphone className="size-5 text-violet-500" /> Viết bản tin tiến độ (Update)
            </h3>
            <p className="mt-1 text-sm text-muted">
              Cập nhật tiến độ sản xuất, cột mốc hoặc lời cảm ơn tới cộng đồng.
            </p>
          </div>
          {!canPublish && (
            <Badge tone="sky" className="gap-1">
              <Lock className="size-3" /> Collaborator soạn nháp
            </Badge>
          )}
        </div>

        <ActionForm action={saveUpdateAction} resetOnSuccess className="mt-4 space-y-4">
          <input type="hidden" name="project_id" value={projectId} />

          <Field label="Tiêu đề bản tin" required>
            <Input name="title" minLength={3} required placeholder="Ví dụ: Cập nhật tuần 3: Đã hoàn tất khuôn mẫu sản xuất!" />
          </Field>

          <Field label="Nội dung chi tiết" required>
            <Textarea
              name="body"
              minLength={10}
              rows={4}
              required
              placeholder="Chia sẻ tiến độ thực tế, hình ảnh hoặc thông tin backer cần lưu ý…"
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="backers_only" className="size-4 accent-violet-600" />
            Chỉ hiển thị cho backer đã góp vốn
          </label>

          {!canPublish && (
            <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-700 dark:text-sky-300">
              <Lock className="size-4 shrink-0" />
              <span>{LOCK_REASON["update.publish"]}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ModeSubmit value="0" variant={canPublish ? "secondary" : "primary"}>
              <Plus className="size-4" /> Lưu bản nháp
            </ModeSubmit>
            {canPublish ? (
              <ModeSubmit value="1" variant="primary">
                <Send className="size-4" /> Đăng công khai ngay
              </ModeSubmit>
            ) : (
              <Button type="button" variant="outline" disabled title={LOCK_REASON["update.publish"]}>
                <Lock className="size-4" /> Đăng công khai
              </Button>
            )}
          </div>
        </ActionForm>
      </div>

      {/* List */}
      {updates.length === 0 ? (
        <EmptyState
          compact
          title="Chưa có Update nào"
          description="Hãy soạn bản tin đầu tiên để giữ nhiệt với người ủng hộ."
        />
      ) : (
        <div className="space-y-3">
          {updates.map((u) => {
            const isDraft = u.status === "DRAFT";
            return (
              <div key={u.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={isDraft ? "amber" : "emerald"} dot>
                        {isDraft ? (
                          <>
                            <FileEdit className="size-3" /> Bản nháp
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3" /> Đã đăng
                          </>
                        )}
                      </Badge>
                      {u.backers_only === 1 && <Badge tone="violet">Chỉ dành cho Backer</Badge>}
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        Tác giả: <b className="text-fg">{u.author_name}</b>
                        {u.author_role && <RoleBadge role={u.author_role} />}
                      </span>
                    </div>
                    <h4 className="text-base font-bold sm:text-lg">{u.title}</h4>
                    <div className="text-xs text-muted">
                      {u.published_at
                        ? `Đăng lúc ${formatDate(u.published_at, true)}${u.publisher_name ? ` bởi ${u.publisher_name}` : ""}`
                        : `Cập nhật ${timeAgo(u.updated_at)}`}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(isDraft || canPublish) && (
                      <Button variant="ghost" size="xs" onClick={() => setEditing(u)}>
                        <Pencil className="size-3.5" /> Sửa
                      </Button>
                    )}

                    {isDraft &&
                      (canPublish ? (
                        <ActionForm action={publishUpdateAction}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="update_id" value={u.id} />
                          <SubmitButton variant="success" size="xs" pendingText="Đang đăng…">
                            <Send className="size-3.5" /> Duyệt &amp; đăng
                          </SubmitButton>
                        </ActionForm>
                      ) : (
                        <Button variant="outline" size="xs" disabled title={LOCK_REASON["update.publish"]}>
                          <Lock className="size-3.5" /> Chờ Creator đăng
                        </Button>
                      ))}

                    {isDraft && (
                      <ActionForm action={deleteUpdateDraftAction} confirm="Xoá bản nháp Update này?">
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="update_id" value={u.id} />
                        <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="size-3.5" />
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg/90">{u.body}</p>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Chỉnh sửa Update"
        wide
      >
        {editing && (
          <ActionForm
            key={editing.id}
            action={saveUpdateAction}
            onSuccess={() => setEditing(null)}
            className="space-y-4"
          >
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="update_id" value={editing.id} />
            <input type="hidden" name="publish" value="0" />

            <Field label="Tiêu đề" required>
              <Input name="title" defaultValue={editing.title} minLength={3} required />
            </Field>
            <Field label="Nội dung" required>
              <Textarea name="body" defaultValue={editing.body} minLength={10} rows={6} required />
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
              <input type="checkbox" name="backers_only" defaultChecked={editing.backers_only === 1} className="size-4 accent-violet-600" />
              Chỉ hiển thị cho backer đã góp vốn
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Huỷ
              </Button>
              <SubmitButton pendingText="Đang lưu…">Lưu thay đổi</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}
