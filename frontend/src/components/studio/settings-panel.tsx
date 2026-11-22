"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  History,
  Rocket,
  Settings2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import type { StudioProject } from "@/server/queries/studio";
import { PROJECT_STATUS } from "@/lib/status";
import {
  cancelProjectAction,
  deleteDraftAction,
  launchNowAction,
  saveCompletedDisplayAction,
  setScheduleAction,
  submitForReviewAction,
  withdrawSubmissionAction,
} from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { formatDate, formatVnd } from "@/lib/utils";
import { PRE_LAUNCH } from "./meta";
import { toVnDatetimeLocal } from "./media";

export function SettingsPanel({
  project,
  checklist,
  reviews,
  timeline,
  hasPledges,
}: {
  project: StudioProject;
  checklist: { key: string; label: string; ok: boolean; required: boolean }[];
  reviews: { id: string; decision: string; note: string; created_at: string; reviewer: string }[];
  timeline: { id: string; from_status: string | null; to_status: string; reason: string; created_at: string; actor: string | null }[];
  hasPledges: boolean;
}) {
  const canSchedule = PRE_LAUNCH.includes(project.status);
  const canCancel = PRE_LAUNCH.includes(project.status);
  const canDelete = ["DRAFT", "REJECTED", "CANCELLED"].includes(project.status) && !hasPledges;
  const missingReq = checklist.filter((c) => c.required && !c.ok);

  return (
    <div className="space-y-6">
      {/* Lifecycle Controls */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Settings2 className="size-5 text-violet-500" /> Vòng đời chiến dịch
              </h3>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Mục tiêu: <b className="text-fg">{formatVnd(project.goal_amount)}</b> · Thời lượng:{" "}
              <b className="text-fg">{project.duration_days} ngày</b>
              {!["DRAFT", "REJECTED"].includes(project.status) && " (đã khoá sau khi gửi duyệt)"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {["DRAFT", "REJECTED"].includes(project.status) && (
              <>
                <ButtonLink href={`/studio/${project.slug}/setup`} variant="outline" size="sm">
                  Mở Wizard 5 bước
                </ButtonLink>
                <ActionForm action={submitForReviewAction}>
                  <input type="hidden" name="project_id" value={project.id} />
                  <SubmitButton disabled={missingReq.length > 0} size="sm" pendingText="Đang gửi…">
                    <Rocket className="size-4" /> Gửi duyệt
                  </SubmitButton>
                </ActionForm>
              </>
            )}

            {project.status === "PENDING_REVIEW" && (
              <ActionForm action={withdrawSubmissionAction} confirm="Rút lại bản gửi duyệt về Bản nháp để chỉnh sửa?">
                <input type="hidden" name="project_id" value={project.id} />
                <SubmitButton variant="secondary" size="sm">
                  <Undo2 className="size-4" /> Rút lại bản gửi duyệt
                </SubmitButton>
              </ActionForm>
            )}

            {project.status === "SCHEDULED" && (
              <ActionForm action={launchNowAction} confirm="Mở gọi vốn ngay bây giờ thay vì chờ ngày hẹn?">
                <input type="hidden" name="project_id" value={project.id} />
                <SubmitButton variant="success" size="sm" pendingText="Đang mở…">
                  <Sparkles className="size-4" /> Mở chiến dịch sớm ngay
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>

        {["DRAFT", "REJECTED"].includes(project.status) && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {checklist.map((c) => (
              <div key={c.key} className="flex items-center gap-2 rounded-xl bg-surface-2/50 px-3 py-2 text-xs">
                {c.ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-amber-500" />
                )}
                <span className={c.ok ? "font-medium" : "font-semibold text-amber-700 dark:text-amber-300"}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule & Preview */}
      <div className="card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <CalendarClock className="size-5 text-sky-500" /> Lịch bắt đầu &amp; Trang xem trước
        </h3>
        <p className="mt-1 text-sm text-muted">
          Đặt ngày dự kiến mở chiến dịch (giờ Việt Nam) và bật/tắt trang xem trước công khai khi dự án ở trạng thái Sắp mở.
        </p>

        {canSchedule ? (
          <ActionForm action={setScheduleAction} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Ngày giờ bắt đầu dự kiến (UTC+7)"
                hint={project.status === "SCHEDULED" ? "Bắt buộc có ngày trong tương lai" : "Để trống để mở ngay khi được duyệt"}
              >
                <Input
                  name="start_at"
                  type="datetime-local"
                  defaultValue={toVnDatetimeLocal(project.start_at)}
                  required={project.status === "SCHEDULED"}
                />
              </Field>
              <div className="rounded-xl bg-surface-2/50 p-3.5 text-xs text-muted">
                <div>Trạng thái hiện tại: <b className="text-fg">{PROJECT_STATUS[project.status]?.label ?? project.status}</b></div>
                <div className="mt-1">Mở hiện tại: <b className="text-fg">{formatDate(project.start_at, true)}</b></div>
                <div className="mt-1">Kết thúc dự kiến: <b className="text-fg">{formatDate(project.end_at, true)}</b></div>
              </div>
            </div>

            <Toggle
              name="is_preview_public"
              defaultChecked={project.is_preview_public === 1}
              label="Cho phép cộng đồng xem trước khi sắp mở"
              description="Khi bật, mọi người truy cập được trang dự án để xem nội dung và nhấn Lưu dự án."
            />

            <div className="flex justify-end">
              <SubmitButton variant="secondary" size="sm" pendingText="Đang lưu…">
                Lưu lịch &amp; cài đặt xem trước
              </SubmitButton>
            </div>
          </ActionForm>
        ) : (
          <div className="mt-4 grid gap-3 rounded-xl bg-surface-2/50 p-4 text-sm sm:grid-cols-2">
            <div>Ngày mở: <b>{formatDate(project.start_at, true)}</b></div>
            <div>Ngày kết thúc: <b>{formatDate(project.end_at, true)}</b></div>
          </div>
        )}
      </div>

      {/* Completed Display (FR08) */}
      <div className="card p-5 sm:p-6">
        <h3 className="text-lg font-bold">Hiển thị khi dự án hoàn thành</h3>
        <p className="mt-1 text-sm text-muted">
          Khi dự án hoàn thành, thanh tiến trình gọi vốn sẽ ẩn và trang công khai hiển thị nội dung bạn chọn bên dưới.
        </p>

        <ActionForm action={saveCompletedDisplayAction} className="mt-4 space-y-4">
          <input type="hidden" name="project_id" value={project.id} />
          <Field label="Chế độ hiển thị trang dự án đã hoàn thành">
            <Select name="completed_display" defaultValue={project.completed_display}>
              <option value="SUMMARY">Tổng kết chiến dịch (số tiền, số người ủng hộ, kết quả giao quà)</option>
              <option value="UPDATES">Ưu tiên các bản tin cập nhật mới nhất</option>
              <option value="THANK_YOU">Thư cảm ơn tuỳ chỉnh của chủ dự án</option>
            </Select>
          </Field>
          <Field label="Thông điệp cảm ơn / tổng kết gửi tới cộng đồng">
            <Textarea
              name="completed_message"
              defaultValue={project.completed_message ?? ""}
              rows={3}
              placeholder="Cảm ơn các bạn đã đồng hành cùng dự án từ những ngày đầu tiên…"
            />
          </Field>
          <div className="flex justify-end">
            <SubmitButton variant="secondary" size="sm" pendingText="Đang lưu…">
              Lưu tuỳ chọn hiển thị
            </SubmitButton>
          </div>
        </ActionForm>
      </div>

      {/* Review History & Status Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="flex items-center gap-2 font-bold">
            <ShieldAlert className="size-4 text-violet-500" /> Lịch sử kiểm duyệt ({reviews.length})
          </h4>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có lượt kiểm duyệt nào.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-line bg-surface-2/30 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={r.decision === "APPROVED" ? "emerald" : r.decision === "REJECTED" ? "rose" : "amber"}>
                      {r.decision === "APPROVED" ? "Đã duyệt" : r.decision === "REJECTED" ? "Từ chối" : "Yêu cầu sửa"}
                    </Badge>
                    <span className="text-xs text-muted">{formatDate(r.created_at, true)}</span>
                  </div>
                  {r.note && <p className="mt-1.5 text-fg">“{r.note}”</p>}
                  <div className="mt-1 text-xs text-muted">Người duyệt: {r.reviewer}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h4 className="flex items-center gap-2 font-bold">
            <History className="size-4 text-emerald-500" /> Dòng thời gian trạng thái ({timeline.length})
          </h4>
          {timeline.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có thay đổi trạng thái.</p>
          ) : (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {timeline.map((h) => (
                <div key={h.id} className="rounded-xl border border-line bg-surface-2/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">
                      {h.from_status ? `${PROJECT_STATUS[h.from_status]?.label ?? h.from_status} → ` : ""}
                      {PROJECT_STATUS[h.to_status]?.label ?? h.to_status}
                    </span>
                    <span className="text-muted">{formatDate(h.created_at, true)}</span>
                  </div>
                  {h.reason && <p className="mt-1 text-fg">{h.reason}</p>}
                  <div className="mt-1 text-muted">Thực hiện: {h.actor ?? "Hệ thống (Bộ lập lịch)"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {(canCancel || canDelete) && (
        <div className="card border-rose-500/30 bg-rose-500/5 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-5" /> Vùng thao tác nguy hiểm
          </h3>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {canCancel && (
              <ActionForm
                action={cancelProjectAction}
                confirm="Huỷ chiến dịch này? Dự án sẽ chuyển sang Đã huỷ."
                className="flex flex-1 flex-wrap items-end gap-2"
              >
                <input type="hidden" name="project_id" value={project.id} />
                <Field label="Lý do huỷ dự án (trước khi khởi chạy)" className="min-w-[220px] flex-1">
                  <Input name="reason" placeholder="Ví dụ: Cần thêm thời gian hoàn thiện mẫu thử" />
                </Field>
                <SubmitButton variant="danger" size="sm">
                  Huỷ dự án
                </SubmitButton>
              </ActionForm>
            )}

            {canDelete && (
              <ActionForm
                action={deleteDraftAction}
                confirm="Xoá vĩnh viễn dự án này? Thao tác không thể hoàn tác."
              >
                <input type="hidden" name="project_id" value={project.id} />
                <SubmitButton variant="outline" size="sm" className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10">
                  <Trash2 className="size-4" /> Xoá vĩnh viễn bản nháp
                </SubmitButton>
              </ActionForm>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            Lưu ý: Chỉ huỷ được trước khi chiến dịch khởi chạy; chỉ xoá được khi chưa từng có lượt góp vốn.{" "}
            <Link href="/explore" className="underline">
              Tìm hiểu thêm quy định vận hành
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
