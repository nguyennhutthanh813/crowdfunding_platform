"use client";

import {
  ArrowUpRight,
  Check,
  Clock3,
  FileText,
  Kanban,
  LayoutList,
  LoaderCircle,
  MessageSquareText,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { CampaignWorkspaceTask, WorkspaceTaskStatus } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

const statusLabels: Record<WorkspaceTaskStatus, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  IN_REVIEW: "Chờ duyệt",
  DONE: "Đã xong",
};

const priorityLabels = {
  HIGH: "Ưu tiên cao",
  MEDIUM: "Ưu tiên vừa",
  LOW: "Theo dõi",
};

export function CollaboratorTaskList({
  initialTasks,
  campaignId,
}: {
  initialTasks: CampaignWorkspaceTask[];
  campaignId: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [taskToComplete, setTaskToComplete] = useState<CampaignWorkspaceTask | null>(null);
  const [taskToInspect, setTaskToInspect] = useState<CampaignWorkspaceTask | null>(null);

  const visibleTasks = tasks.filter((task) => {
    if (filter === "open") return task.status !== "DONE";
    if (filter === "done") return task.status === "DONE";
    return true;
  });

  const doneCount = tasks.filter((item) => item.status === "DONE").length;
  const inProgressCount = tasks.filter(
    (item) => item.status === "IN_PROGRESS" || item.status === "IN_REVIEW",
  ).length;
  const todoCount = tasks.filter((item) => item.status === "TODO").length;

  const updateTaskStatus = async (
    taskId: string,
    status: WorkspaceTaskStatus,
    successNotice: string,
  ) => {
    setBusy(taskId);
    setNotice("");
    setActionError("");
    try {
      await clientRequest("/api/v1/creator/operations", {
        method: "POST",
        body: JSON.stringify({
          action: "UPDATE_TASK_STATUS",
          payload: { taskId, status, campaignId },
        }),
      });
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                detail:
                  status === "DONE"
                    ? "Vừa hoàn thành"
                    : status === "IN_PROGRESS"
                      ? "Đang xử lý trong ca trực"
                      : task.detail,
              }
            : task,
        ),
      );
      setTaskToInspect((current) =>
        current && current.id === taskId ? { ...current, status } : current,
      );
      setNotice(successNotice);
      if (status === "DONE") setTaskToComplete(null);
      router.refresh();
    } catch (error) {
      setActionError(
        clientRequestMessage(
          error,
          "Chưa thể cập nhật công việc. Bạn thử lại sau nhé.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const markDone = async (taskId: string) => {
    await updateTaskStatus(
      taskId,
      "DONE",
      "Đã báo cho nhóm rằng công việc này hoàn tất.",
    );
  };

  return (
    <article
      id="viec-hom-nay"
      className="scroll-mt-36 rounded-[20px] border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-[#2869ac]">Việc cần làm</p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold">
            Việc được giao ở ORBIT One
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Chuyển trạng thái từng bước để Chủ dự án theo dõi tiến độ theo thời gian thực.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-xl border border-line bg-[#f4f6f8] p-1"
            aria-label="Chế độ hiển thị công việc"
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition ${
                viewMode === "list"
                  ? "bg-white text-[#173d65] shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <LayoutList className="size-3.5" /> Danh sách
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              aria-pressed={viewMode === "kanban"}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition ${
                viewMode === "kanban"
                  ? "bg-white text-[#173d65] shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Kanban className="size-3.5" /> Bảng tiến độ
            </button>
          </div>
          <div
            className="grid w-full grid-cols-3 rounded-full bg-[#eff0e9] p-1 sm:flex sm:w-auto"
            aria-label="Lọc công việc"
          >
            {[
              ["all", `Tất cả (${tasks.length})`],
              ["open", `Đang mở (${tasks.length - doneCount})`],
              ["done", `Đã xong (${doneCount})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id as typeof filter)}
                className={`min-h-9 min-w-0 whitespace-nowrap rounded-full px-2 text-[11px] font-bold transition ${
                  filter === id
                    ? "bg-white text-forest shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-2xl border border-[#d6e4f2] bg-[#f7fafd] p-3">
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            1 · Cần làm
          </p>
          <p className="mt-0.5 font-display text-lg font-extrabold text-ink">
            {todoCount}
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
            2 · Đang xử lý
          </p>
          <p className="mt-0.5 font-display text-lg font-extrabold text-blue-700">
            {inProgressCount}
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            3 · Hoàn tất
          </p>
          <p className="mt-0.5 font-display text-lg font-extrabold text-emerald-700">
            {doneCount}
          </p>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="mt-5 grid gap-3.5 md:grid-cols-3">
          {(
            [
              {
                key: "TODO",
                title: "Cần làm",
                tone: "border-stone-200 bg-[#f9fafb]",
                badgeTone: "bg-stone-200 text-stone-700",
                items: visibleTasks.filter((t) => t.status === "TODO"),
              },
              {
                key: "IN_PROGRESS",
                title: "Đang xử lý",
                tone: "border-blue-200 bg-[#f2f7fd]",
                badgeTone: "bg-blue-100 text-blue-800",
                items: visibleTasks.filter(
                  (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW",
                ),
              },
              {
                key: "DONE",
                title: "Đã xong",
                tone: "border-emerald-200 bg-[#f2fbf6]",
                badgeTone: "bg-emerald-100 text-emerald-800",
                items: visibleTasks.filter((t) => t.status === "DONE"),
              },
            ] as const
          ).map((col) => (
            <div
              key={col.key}
              className={`rounded-2xl border p-3.5 ${col.tone}`}
            >
              <div className="flex items-center justify-between gap-2 pb-3">
                <p className="text-xs font-extrabold text-ink">{col.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.badgeTone}`}
                >
                  {col.items.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {col.items.map((task) => (
                  <div
                    key={task.id}
                    className="card-lift rounded-xl border border-line bg-white p-3.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold ${
                          task.priority === "HIGH"
                            ? "text-red-600"
                            : "text-ink-muted"
                        }`}
                      >
                        {priorityLabels[task.priority]}
                      </span>
                      <span className="text-[10px] text-ink-muted">
                        {task.dueLabel}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold leading-5 text-ink">
                      {task.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-ink-muted">
                      {task.detail}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                      <button
                        type="button"
                        onClick={() => { setActionError(""); setTaskToInspect(task); }}
                        className="min-h-9 rounded-lg border border-line px-3 text-xs font-bold text-ink-soft hover:bg-[#f4f6f8]"
                      >
                        Chi tiết
                      </button>
                      {task.status === "TODO" ? (
                        <button
                          type="button"
                          disabled={busy === task.id}
                          onClick={() =>
                            void updateTaskStatus(
                              task.id,
                              "IN_PROGRESS",
                              `Đã chuyển "${task.title}" sang Đang làm.`,
                            )
                          }
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <Play className="size-2.5" /> Bắt đầu
                        </button>
                      ) : null}
                      {task.status !== "DONE" ? (
                        <button
                          type="button"
                          disabled={busy === task.id}
                          onClick={() => {
                            setActionError("");
                            setTaskToComplete(task);
                          }}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Check className="size-2.5" /> Chốt xong
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy === task.id}
                          onClick={() =>
                            void updateTaskStatus(
                              task.id,
                              "IN_PROGRESS",
                              `Đã mở lại công việc "${task.title}".`,
                            )
                          }
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line px-3 text-xs font-bold text-ink-muted hover:text-ink"
                        >
                          <RotateCcw className="size-2.5" /> Mở lại
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!col.items.length ? (
                  <p className="rounded-xl border border-dashed border-line/80 bg-white/60 px-3 py-6 text-center text-[11px] text-ink-muted">
                    Trống
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-white">
          {visibleTasks.map((task) => {
            const Icon =
              task.area === "COMMUNITY"
                ? MessageSquareText
                : task.area === "COMPLIANCE"
                  ? ShieldCheck
                  : FileText;
            return (
              <div
                key={task.id}
                className="grid grid-cols-[40px_1fr] items-start gap-x-3 gap-y-3 p-4 transition hover:bg-[#f9fbfd] sm:grid-cols-[40px_1fr_auto] sm:gap-x-4"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    task.status === "DONE"
                      ? "bg-emerald-50 text-emerald-700"
                      : task.status === "IN_PROGRESS"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-[#eef1e7] text-forest"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-sm font-bold ${
                        task.status === "DONE"
                          ? "text-ink-soft line-through"
                          : "text-ink"
                      }`}
                    >
                      {task.title}
                    </p>
                    <span
                      className={`text-[11px] font-bold ${
                        task.priority === "HIGH"
                          ? "text-red-600"
                          : "text-ink-muted"
                      }`}
                    >
                      {priorityLabels[task.priority]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        task.status === "DONE"
                          ? "bg-emerald-50 text-emerald-700"
                          : task.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-[#eff0e9] text-ink-soft"
                      }`}
                    >
                      {statusLabels[task.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                    {task.detail}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" /> {task.dueLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setActionError(""); setTaskToInspect(task); }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-ink-soft transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900"
                    >
                      Xem luồng việc
                    </button>
                    {task.status === "TODO" ? (
                      <button
                        type="button"
                        disabled={busy === task.id}
                        onClick={() =>
                          void updateTaskStatus(
                            task.id,
                            "IN_PROGRESS",
                            `Đã bắt đầu xử lý: ${task.title}`,
                          )
                        }
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-blue-50 px-2.5 text-blue-700 transition hover:bg-blue-100"
                      >
                        <Play className="size-3" /> Nhận xử lý
                      </button>
                    ) : null}
                    {task.status !== "DONE" ? (
                      <Link
                        href={task.hrefByRole.collaborator}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-blue-700 transition hover:bg-blue-50 hover:text-blue-900"
                      >
                        Mở phần làm việc <ArrowUpRight className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
                {task.status === "DONE" ? (
                  <div className="col-span-2 flex items-center gap-2 justify-self-start sm:col-span-1">
                    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700">
                      <Check className="size-3" /> Đã xong
                    </span>
                    <button
                      type="button"
                      disabled={busy === task.id}
                      onClick={() =>
                        void updateTaskStatus(
                          task.id,
                          "IN_PROGRESS",
                          `Đã mở lại công việc: ${task.title}`,
                        )
                      }
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] font-semibold text-ink-muted hover:border-blue-300 hover:text-ink"
                      title="Mở lại công việc"
                    >
                      <RotateCcw className="size-3" /> Mở lại
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy === task.id}
                    onClick={() => {
                      setActionError("");
                      setTaskToComplete(task);
                    }}
                    className="col-span-2 min-h-10 justify-self-start rounded-full border border-line bg-white px-3.5 text-[11px] font-bold text-ink-soft transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-wait sm:col-span-1"
                  >
                    {busy === task.id ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      "Đánh dấu đã xong"
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!visibleTasks.length ? (
        <div className="mt-5 rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-ink-muted">
          Không có công việc trong nhóm này.
        </div>
      ) : null}
      <p
        className="mt-3 min-h-5 text-xs font-semibold text-emerald-700"
        role="status"
      >
        {notice}
      </p>
      {actionError && !taskToComplete ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}
      <Modal
        open={Boolean(taskToComplete)}
        title="Xác nhận hoàn thành công việc"
        description={taskToComplete?.title}
        onClose={() => setTaskToComplete(null)}
        locked={busy !== null}
        size="sm"
      >
        <p className="text-sm leading-6 text-ink-soft">
          Hãy kiểm tra phần việc đã làm xong trước khi báo cho chủ dự án. Trạng thái này sẽ đồng bộ ngay trên bảng vận hành của nhóm.
        </p>
        {actionError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setTaskToComplete(null)}
            className="button-secondary"
          >
            Để sau
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => taskToComplete && void markDone(taskToComplete.id)}
            className="button-primary"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Xác nhận đã xong
          </button>
        </div>
      </Modal>
      <Modal
        open={Boolean(taskToInspect)}
        title={taskToInspect?.title ?? "Chi tiết đầu việc"}
        description={
          taskToInspect
            ? `${priorityLabels[taskToInspect.priority]} · ${statusLabels[taskToInspect.status]} · ${taskToInspect.dueLabel}`
            : undefined
        }
        badge={
          taskToInspect ? `TASK · ${taskToInspect.id.toUpperCase()}` : undefined
        }
        onClose={() => setTaskToInspect(null)}
        footer={
          taskToInspect ? (
            <>
              {taskToInspect.status !== "DONE" ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = taskToInspect;
                    setTaskToInspect(null);
                    setTaskToComplete(target);
                  }}
                  className="button-secondary"
                >
                  <Check className="size-4" /> Đánh dấu đã xong
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    void updateTaskStatus(
                      taskToInspect.id,
                      "IN_PROGRESS",
                      `Đã mở lại công việc "${taskToInspect.title}".`,
                    )
                  }
                  className="button-secondary"
                >
                  <RotateCcw className="size-4" /> Mở lại việc
                </button>
              )}
              <Link
                href={taskToInspect.hrefByRole.collaborator}
                onClick={() => setTaskToInspect(null)}
                className="button-dark"
              >
                Mở màn hình làm việc <ArrowUpRight className="size-4" />
              </Link>
            </>
          ) : undefined
        }
      >
        {taskToInspect ? (
          <div className="space-y-4 text-sm leading-6 text-ink-soft">
            {actionError ? <p role="alert" className="text-red-700">{actionError}</p> : null}
            <div className="grid gap-2 rounded-2xl border border-[#d6e4f2] bg-[#f4f8fc] p-3 text-center text-xs sm:grid-cols-3">
              {(
                [
                  ["TODO", "1. Cần làm"],
                  ["IN_PROGRESS", "2. Đang xử lý"],
                  ["DONE", "3. Đã hoàn tất"],
                ] as const
              ).map(([st, label]) => {
                const active = taskToInspect.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={busy !== null || active}
                    aria-pressed={active}
                    onClick={() => {
                      if (st === "DONE") {
                        setTaskToComplete(taskToInspect);
                        setTaskToInspect(null);
                      } else {
                        void updateTaskStatus(
                          taskToInspect.id,
                          st,
                          `Đã chuyển trạng thái sang ${statusLabels[st]}.`,
                        );
                      }
                    }}
                    className={`min-h-11 rounded-xl px-2.5 py-2 font-bold transition ${
                      active
                        ? "bg-[#173d65] text-white shadow-xs"
                        : "bg-white text-ink-soft hover:bg-blue-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-line bg-surface-muted p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink">
                Nội dung cần thực hiện
              </p>
              <p className="mt-1.5">{taskToInspect.detail}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3.5">
                <p className="text-xs font-bold text-ink">Phụ trách & thời hạn</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  {taskToInspect.assigneeName} · {taskToInspect.dueLabel}
                </p>
              </div>
              <div className="rounded-xl border border-line p-3.5">
                <p className="text-xs font-bold text-ink">Liên thông về Chủ dự án</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  Khi bạn chuyển trạng thái hoặc gửi nội dung tại bàn làm việc, dữ liệu sẽ đồng bộ ngay sang bảng điều hành của Chủ dự án.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </article>
  );
}
