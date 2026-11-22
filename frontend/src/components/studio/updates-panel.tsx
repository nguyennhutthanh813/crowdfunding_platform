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
    <button type="submit" name="publish" value={value} disabled={pending} className={buttonClass(variant, "sm")}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

function UpdateFormFields({ defaults }: { defaults?: Pick<UpdateRow, "title" | "body" | "backers_only"> }) {
  return (
    <>
      <Field label="Tiêu đề bản tin" required>
        <Input
          name="title"
          defaultValue={defaults?.title ?? ""}
          minLength={3}
          required
          placeholder="Ví dụ: Cập nhật tuần 3: Đã hoàn tất khuôn mẫu sản xuất!"
        />
      </Field>

      <Field label="Nội dung chi tiết" required>
        <Textarea
          name="body"
          defaultValue={defaults?.body ?? ""}
          minLength={10}
          rows={5}
          required
          placeholder="Chia sẻ tiến độ thực tế, hình ảnh hoặc thông tin người ủng hộ cần lưu ý…"
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input
          type="checkbox"
          name="backers_only"
          defaultChecked={defaults?.backers_only === 1}
          className="size-4 accent-violet-600"
        />
        Chỉ hiển thị cho người ủng hộ đã góp vốn
      </label>
    </>
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
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UpdateRow | null>(null);
  const draftCount = updates.filter((u) => u.status === "DRAFT").length;

  return (
    <div className="space-y-4">
      {/* Compact Header Action Bar */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold sm:text-lg">
              <Megaphone className="size-5 text-violet-500" /> Bản tin tiến độ ({updates.length})
            </h3>
            {draftCount > 0 && <Badge tone="amber">{draftCount} bản nháp chờ đăng</Badge>}
            {!canPublish && (
              <Badge tone="sky" className="gap-1">
                <Lock className="size-3" /> Cộng tác viên soạn nháp
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Cập nhật tiến độ sản xuất, cột mốc hoặc lời cảm ơn tới người ủng hộ ngay trên trang dự án.
          </p>
        </div>

        <Button type="button" variant="primary" size="sm" onClick={() => setCreating(true)} className="shrink-0">
          <Plus className="size-4" /> Viết bản tin mới
        </Button>
      </div>

      {/* List */}
      {updates.length === 0 ? (
        <EmptyState
          compact
          title="Chưa có bản tin nào"
          description="Hãy soạn bản tin đầu tiên để giữ nhiệt với người ủng hộ."
          action={
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Viết bản tin đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {updates.map((u) => {
            const isDraft = u.status === "DRAFT";
            return (
              <div key={u.id} className="card p-4 sm:p-5">
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
                      {u.backers_only === 1 && <Badge tone="violet">Chỉ dành cho người ủng hộ</Badge>}
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
                          <Lock className="size-3.5" /> Chờ chủ dự án đăng
                        </Button>
                      ))}

                    {(isDraft || canPublish) && (
                      <ActionForm
                        action={deleteUpdateDraftAction}
                        confirm={isDraft ? "Xoá bản nháp bản tin này?" : "Xoá bản tin đã đăng này?"}
                      >
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="update_id" value={u.id} />
                        <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="size-3.5" />
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </div>

                <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-fg/90">{u.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal viết bản tin mới */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="Viết bản tin tiến độ mới"
        description={
          canPublish
            ? "Bạn có thể lưu nháp để rà soát hoặc đăng công khai gửi thông báo tới toàn bộ người ủng hộ."
            : "Bản tin sẽ được lưu dưới dạng nháp để Chủ dự án duyệt và đăng công khai."
        }
      >
        <ActionForm
          key={creating ? "create-upd-open" : "create-upd-closed"}
          action={saveUpdateAction}
          resetOnSuccess
          onSuccess={() => setCreating(false)}
          className="space-y-4"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <UpdateFormFields />

          {!canPublish && (
            <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-700 dark:text-sky-300">
              <Lock className="size-4 shrink-0" />
              <span>{LOCK_REASON["update.publish"]}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Huỷ
            </Button>
            <ModeSubmit value="0" variant={canPublish ? "secondary" : "primary"}>
              <Plus className="size-4" /> Lưu bản nháp
            </ModeSubmit>
            {canPublish && (
              <ModeSubmit value="1" variant="primary">
                <Send className="size-4" /> Đăng công khai ngay
              </ModeSubmit>
            )}
          </div>
        </ActionForm>
      </Dialog>

      {/* Modal sửa bản tin */}
      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="lg" title="Chỉnh sửa bản tin">
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
            <UpdateFormFields defaults={editing} />

            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Huỷ
              </Button>
              <SubmitButton size="sm" pendingText="Đang lưu…">
                Lưu thay đổi
              </SubmitButton>
            </div>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}
