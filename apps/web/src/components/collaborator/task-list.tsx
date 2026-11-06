"use client";

import {
  ArrowUpRight,
  Check,
  Clock3,
  FileText,
  LoaderCircle,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { CampaignWorkspaceTask } from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

const statusLabels = {
  TODO: "Cần phản hồi",
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
}: {
  initialTasks: CampaignWorkspaceTask[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [taskToComplete, setTaskToComplete] = useState<CampaignWorkspaceTask | null>(null);
  const visibleTasks = tasks.filter((task) => {
    if (filter === "open") return task.status !== "DONE";
    if (filter === "done") return task.status === "DONE";
    return true;
  });

  const markDone = async (taskId: string) => {
    setBusy(taskId);
    setNotice("");
    setActionError("");
    try {
      await clientRequest("/api/v1/creator/operations", {
        method: "POST",
        body: JSON.stringify({
          action: "UPDATE_TASK_STATUS",
          payload: { taskId, status: "DONE", campaignId: "cmp_orbit" },
        }),
      });
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, status: "DONE" as const, detail: "Vừa hoàn thành" }
            : task,
        ),
      );
      setNotice("Đã báo cho nhóm rằng công việc này hoàn tất.");
      setTaskToComplete(null);
      router.refresh();
    } catch (error) {
      setActionError(clientRequestMessage(error, "Chưa thể cập nhật công việc. Bạn thử lại sau nhé."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <article
      id="viec-hom-nay"
      className="scroll-mt-36 rounded-[20px] border border-line bg-white p-5 sm:p-7"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-coral">Việc cần làm</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold">
            Việc được giao ở ORBIT One
          </h2>
        </div>
        <div
          className="flex rounded-full bg-[#eff0e9] p-1"
          aria-label="Lọc công việc"
        >
          {[
            ["all", "Tất cả"],
            ["open", "Đang mở"],
            ["done", "Đã xong"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id as typeof filter)}
              className={`min-h-11 rounded-full px-3 text-[11px] font-bold ${filter === id ? "bg-white text-forest shadow-sm" : "text-ink-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
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
              className="grid grid-cols-[40px_1fr] items-start gap-x-3 gap-y-3 p-4 sm:grid-cols-[40px_1fr_auto] sm:gap-x-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef1e7] text-forest">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold">{task.title}</p>
                  <span className={`text-[11px] font-bold ${task.priority === "HIGH" ? "text-red-600" : "text-ink-muted"}`}>
                    {priorityLabels[task.priority]}
                  </span>
                  <span className="rounded-full bg-[#eff0e9] px-2 py-1 text-[11px] font-semibold text-ink-soft">
                    {statusLabels[task.status]}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                  {task.detail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" /> {task.dueLabel}
                  </span>
                  {task.status !== "DONE" ? (
                    <Link
                      href={task.hrefByRole.collaborator}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-900"
                    >
                      Mở phần làm việc <ArrowUpRight className="size-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
              {task.status === "DONE" ? (
                <span className="col-span-2 inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-full bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700 sm:col-span-1">
                  <Check className="size-3" /> Đã xong
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy === task.id}
                  onClick={() => {
                    setActionError("");
                    setTaskToComplete(task);
                  }}
                  className="col-span-2 min-h-11 justify-self-start rounded-full border border-line px-3 text-[11px] font-bold text-ink-soft hover:border-forest/25 hover:text-forest disabled:cursor-wait sm:col-span-1"
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
      {!visibleTasks.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-ink-muted">
          Không có công việc trong nhóm này.
        </div>
      ) : null}
      <p
        className="mt-3 min-h-5 text-xs text-ink-muted"
        role="status"
      >
        {notice}
      </p>
      <Modal
        open={Boolean(taskToComplete)}
        title="Xác nhận hoàn thành công việc"
        description={taskToComplete?.title}
        onClose={() => setTaskToComplete(null)}
        locked={busy !== null}
        size="sm"
      >
        <p className="text-sm leading-6 text-ink-soft">
          Hãy kiểm tra phần việc đã làm xong trước khi báo cho chủ dự án. Trạng thái này sẽ xuất hiện trong bảng việc của nhóm.
        </p>
        {actionError ? <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy !== null} onClick={() => setTaskToComplete(null)} className="button-secondary">
            Để sau
          </button>
          <button type="button" disabled={busy !== null} onClick={() => taskToComplete && void markDone(taskToComplete.id)} className="button-primary">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            Xác nhận đã xong
          </button>
        </div>
      </Modal>
    </article>
  );
}
