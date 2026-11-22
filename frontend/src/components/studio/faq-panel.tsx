"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import type { FaqRow } from "@/server/queries/studio";
import { deleteFaqAction, moveFaqAction, saveFaqAction } from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { timeAgo } from "@/lib/utils";

function FaqFormFields({ defaults }: { defaults?: Pick<FaqRow, "question" | "answer"> }) {
  return (
    <>
      <Field label="Câu hỏi" required>
        <Input
          name="question"
          defaultValue={defaults?.question ?? ""}
          minLength={5}
          required
          placeholder="Ví dụ: Sản phẩm được bảo hành bao lâu và đổi trả thế nào?"
        />
      </Field>
      <Field label="Câu trả lời" required>
        <Textarea
          name="answer"
          defaultValue={defaults?.answer ?? ""}
          minLength={2}
          rows={4}
          required
          placeholder="Nhập câu trả lời rõ ràng, ngắn gọn…"
        />
      </Field>
    </>
  );
}

export function FaqPanel({ projectId, faqs }: { projectId: string; faqs: FaqRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FaqRow | null>(null);

  return (
    <div className="space-y-4">
      {/* Compact Header Action Bar */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-bold sm:text-lg">
            <HelpCircle className="size-5 text-violet-500" /> Câu hỏi thường gặp ({faqs.length})
          </h3>
          <p className="mt-1 text-xs text-muted">
            Trả lời trước thắc mắc về giao hàng, bảo hành, kích thước hoặc tiến độ để giảm câu hỏi lặp lại.
          </p>
        </div>

        <Button type="button" variant="primary" size="sm" onClick={() => setCreating(true)} className="shrink-0">
          <Plus className="size-4" /> Thêm câu hỏi
        </Button>
      </div>

      {faqs.length === 0 ? (
        <EmptyState
          compact
          title="Chưa có câu hỏi thường gặp nào"
          description="Dự án có 3–5 câu hỏi thường gặp giúp tạo độ tin cậy cao hơn với người ủng hộ mới."
          action={
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Thêm câu hỏi đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {faqs.map((f, idx) => (
            <div key={f.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-violet-600 dark:text-violet-400">Câu hỏi #{idx + 1}</div>
                  <h4 className="mt-0.5 text-base font-bold">{f.question}</h4>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{f.answer}</p>
                  <div className="mt-2.5 text-[11px] text-muted">
                    Tạo bởi {f.created_by_name}
                    {f.updated_by_name ? ` · Sửa gần nhất bởi ${f.updated_by_name}` : ""} · {timeAgo(f.updated_at)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <ActionForm action={moveFaqAction}>
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="faq_id" value={f.id} />
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton variant="ghost" size="xs" disabled={idx === 0} aria-label="Lên">
                      <ArrowUp className="size-3.5" />
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={moveFaqAction}>
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="faq_id" value={f.id} />
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton variant="ghost" size="xs" disabled={idx === faqs.length - 1} aria-label="Xuống">
                      <ArrowDown className="size-3.5" />
                    </SubmitButton>
                  </ActionForm>
                  <Button variant="ghost" size="xs" onClick={() => setEditing(f)}>
                    <Pencil className="size-3.5" /> Sửa
                  </Button>
                  <ActionForm action={deleteFaqAction} confirm="Xoá câu hỏi thường gặp này?">
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="faq_id" value={f.id} />
                    <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10">
                      <Trash2 className="size-3.5" />
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal thêm câu hỏi */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="Thêm câu hỏi thường gặp"
        description="Hiển thị công khai tại tab Hỏi đáp trên trang dự án để hỗ trợ người ủng hộ."
      >
        <ActionForm
          key={creating ? "faq-create-open" : "faq-create-closed"}
          action={saveFaqAction}
          resetOnSuccess
          onSuccess={() => setCreating(false)}
          className="space-y-4"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <FaqFormFields />
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Huỷ
            </Button>
            <SubmitButton size="sm" pendingText="Đang thêm…">
              <Plus className="size-4" /> Thêm câu hỏi
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>

      {/* Modal sửa câu hỏi */}
      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="lg" title="Chỉnh sửa câu hỏi thường gặp">
        {editing && (
          <ActionForm
            key={editing.id}
            action={saveFaqAction}
            onSuccess={() => setEditing(null)}
            className="space-y-4"
          >
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="faq_id" value={editing.id} />
            <FaqFormFields defaults={editing} />
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
