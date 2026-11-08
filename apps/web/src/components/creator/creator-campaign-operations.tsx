"use client";

import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Bell,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FilePenLine,
  Gift,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquareText,
  PackageCheck,
  Rocket,
  Send,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CommentInsights } from "@/components/creator/comment-insights";
import { Modal } from "@/components/ui/modal";
import { useQueryTab } from "@/hooks/use-query-tab";
import type {
  AssistantPriorityComment,
  CampaignCommentReply,
  CampaignCommentInsightsData,
  CampaignOperationsData,
} from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";

const tabs = [
  { id: "overview", label: "Tổng quan", icon: Activity },
  { id: "content", label: "Nội dung & nhóm", icon: Users },
  { id: "community", label: "Cập nhật & bình luận", icon: MessageSquareText },
  { id: "fulfillment", label: "Giao quà", icon: Truck },
] as const;

type TabId = (typeof tabs)[number]["id"];
const creatorTabIds = tabs.map((item) => item.id);
const collaboratorTabIds: TabId[] = ["community"];
type FulfillmentStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";

const collaboratorPermissions = [
  "Đăng cập nhật",
  "Trả lời bình luận",
  "Xem dự báo",
];

const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  PENDING: "Chờ xử lý",
  PREPARING: "Đang chuẩn bị",
  SHIPPED: "Đã gửi",
  DELIVERED: "Đã giao",
};

async function callCreatorOperation(
  action: string,
  payload: Record<string, unknown>,
) {
  return clientRequest<{ data: { auditId: string } }>(
    "/api/v1/creator/operations",
    {
    method: "POST",
    body: JSON.stringify({ action, payload }),
    },
  );
}

function creatorRequestError(error: unknown, fallback: string) {
  return clientRequestMessage(error, fallback);
}

export function CreatorCampaignOperations({
  viewerRole = "creator",
  assistantData,
  operations,
}: {
  viewerRole?: "creator" | "collaborator";
  assistantData: CampaignCommentInsightsData;
  operations: CampaignOperationsData;
}) {
  const isCollaborator = viewerRole === "collaborator";
  const visibleTabs = isCollaborator
    ? tabs.filter((item) => item.id === "community")
    : tabs;
  const [tab, setTab] = useQueryTab<TabId>(
    isCollaborator ? collaboratorTabIds : creatorTabIds,
    isCollaborator ? "community" : "overview",
  );
  const [campaignStatus, setCampaignStatus] = useState<"PRE_LAUNCH" | "LIVE">(
    "LIVE",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [orders, setOrders] = useState(
    operations.fulfillment.previousCampaign.orders,
  );
  const [tasks, setTasks] = useState(operations.tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedUpdateKey, setSelectedUpdateKey] = useState<string | null>(
    null,
  );
  const [selectedReservationId, setSelectedReservationId] = useState<
    string | null
  >(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [communityFocus, setCommunityFocus] = useState<
    "all" | "discussions" | "updates"
  >("all");
  const [orderStageFilter, setOrderStageFilter] = useState<
    "ALL" | FulfillmentStatus
  >("ALL");
  const [members, setMembers] = useState(
    operations.team.filter((member) => member.id !== "usr_hoang_linh"),
  );
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [updates, setUpdates] = useState(operations.updateHistory);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateBody, setUpdateBody] = useState("");
  const [updateAttempted, setUpdateAttempted] = useState(false);
  const [reply, setReply] = useState("");
  const [commentReplies, setCommentReplies] = useState(
    operations.commentReplies ?? [],
  );
  const [selectedComment, setSelectedComment] =
    useState<AssistantPriorityComment | null>(
      assistantData.priorities[0] ?? null,
    );
  const [selectedInboxMessageId, setSelectedInboxMessageId] = useState<
    string | null
  >(null);
  const [messageReply, setMessageReply] = useState("");
  const [handledMessageIds, setHandledMessageIds] = useState<string[]>([]);
  const selectedInboxMessage = operations.communityMessages.find(
    (message) => message.id === selectedInboxMessageId,
  );
  const collaboratorMember = operations.team.find(
    (member) => member.id === "usr_gia_huy",
  );
  const replyActor = isCollaborator
    ? collaboratorMember
    : operations.team.find((member) => member.role.includes("Chủ dự án"));
  const selectedCommentReply = selectedComment
    ? commentReplies.find((item) => item.commentId === selectedComment.id)
    : undefined;
  const collaboratorOpenTasks = tasks.filter(
    (task) =>
      task.assigneeId === "usr_gia_huy" && task.status !== "DONE",
  );
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const selectedUpdate = updates.find(
    (item) => (item.id ?? `${item.title}-${item.when}`) === selectedUpdateKey,
  );
  const selectedReservation = operations.reservations.find(
    (item) => item.id === selectedReservationId,
  );
  const selectedOrder = orders.find((item) => item.id === selectedOrderId);

  const focusReplyComposer = () => {
    requestAnimationFrame(() => {
      document
        .getElementById("comment-reply-composer")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const chooseComment = (comment: AssistantPriorityComment) => {
    setSelectedComment(comment);
    setReply(
      commentReplies.find((item) => item.commentId === comment.id)?.body ?? "",
    );
    focusReplyComposer();
  };

  const useSuggestedReply = (
    comment: AssistantPriorityComment,
    suggestion: string,
  ) => {
    setSelectedComment(comment);
    setReply(suggestion);
    focusReplyComposer();
  };

  const runOperation = async (
    key: string,
    action: string,
    payload: Record<string, unknown>,
    onDone: () => void,
    message: string,
  ) => {
    setBusy(key);
    setNotice(null);
    try {
      await callCreatorOperation(action, payload);
      onDone();
      setNotice({ tone: "success", message });
    } catch (error) {
      setNotice({
        tone: "error",
        message: creatorRequestError(
          error,
          "Hệ thống đang bận. Bạn vui lòng thử lại sau một chút.",
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const updateFulfillment = (orderId: string, status: FulfillmentStatus) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    void runOperation(
      `order-${orderId}`,
      "UPDATE_FULFILLMENT",
      { campaignId: order.campaignId, orderId, status },
      () => {
        setOrders((current) =>
          current.map((order) =>
            order.id === orderId ? { ...order, status } : order,
          ),
        );
      },
      `Đã cập nhật ${orderId}`,
    );
  };

  const toggleTaskStatus = (taskId: string) => {
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask) return;
    const nextStatus = currentTask.status === "DONE" ? "TODO" : "DONE";
    void runOperation(
      `task-${taskId}`,
      "UPDATE_TASK_STATUS",
      { campaignId: operations.campaignId, taskId, status: nextStatus },
      () => {
        setTasks((current) =>
          current.map((item) =>
            item.id === taskId ? { ...item, status: nextStatus } : item,
          ),
        );
      },
      nextStatus === "DONE"
        ? `Đã đánh dấu hoàn tất: ${currentTask.title}`
        : `Đã mở lại đầu việc: ${currentTask.title}`,
    );
  };

  const updateMemberPermission = async (
    memberId: string,
    permission: string,
    enabled: boolean,
  ) => {
    const member = members.find((item) => item.id === memberId);
    if (!member) return;

    const permissions = enabled
      ? [...new Set([...member.permissions, permission])]
      : member.permissions.filter((item) => item !== permission);

    const previousPermissions = member.permissions;
    setMembers((current) =>
      current.map((item) =>
        item.id === memberId ? { ...item, permissions } : item,
      ),
    );
    setBusy(`permission-${member.name}`);
    setNotice(null);
    try {
      await callCreatorOperation("UPDATE_COLLABORATOR_PERMISSIONS", {
        campaignId: operations.campaignId,
        memberId,
        permissions,
      });
      setNotice({
        tone: "success",
        message: `Đã cập nhật quyền của ${member.name}`,
      });
    } catch (error) {
      setMembers((current) =>
        current.map((item) =>
          item.id === memberId
            ? { ...item, permissions: previousPermissions }
            : item,
        ),
      );
      setNotice({
        tone: "error",
        message: creatorRequestError(
          error,
          "Chưa thể cập nhật quyền. Bạn thử lại sau nhé.",
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const exportOrders = () => {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [
      ["Mã đơn", "Người ủng hộ", "Gói quà", "Thành phố", "Trạng thái"],
      ...orders.map((order) => [
        order.id,
        order.backer,
        order.reward,
        order.city,
        fulfillmentLabels[order.status],
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "orbit-drip-2025-giao-hang.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setNotice({
      tone: "success",
      message: "Đã tải danh sách giao hàng.",
    });
  };

  const publishUpdate = () => {
    setUpdateAttempted(true);
    if (!updateTitle.trim() || !updateBody.trim()) {
      setNotice({
        tone: "error",
        message: "Bản cập nhật cần có đủ tiêu đề và nội dung trước khi đăng.",
      });
      return;
    }

    void runOperation(
      "update",
      "PUBLISH_UPDATE",
      {
        campaignId: operations.campaignId,
        title: updateTitle,
        body: updateBody,
      },
      () => {
        setUpdates((current) => [
          {
            id: `local-update-${Date.now()}`,
            title: updateTitle.trim(),
            body: updateBody.trim(),
            author: replyActor?.name,
            when: "Vừa cập nhật",
          },
          ...current,
        ]);
        setUpdateTitle("");
        setUpdateBody("");
        setUpdateAttempted(false);
      },
      "Đã đăng cập nhật",
    );
  };

  const sendCommentReply = () => {
    if (!selectedComment || !reply.trim()) return;
    const comment = selectedComment;
    const replyBody = reply.trim();
    void runOperation(
      "reply",
      "REPLY_COMMENT",
      {
        campaignId: operations.campaignId,
        commentId: comment.id,
        body: replyBody,
      },
      () => {
        const savedReply: CampaignCommentReply = {
          id:
            selectedCommentReply?.id ??
            `local-comment-reply-${Date.now()}`,
          campaignId: operations.campaignId,
          commentId: comment.id,
          body: replyBody,
          authorId: replyActor?.id ?? "preview-viewer",
          authorName:
            replyActor?.name ??
            (isCollaborator ? "Cộng tác viên" : "Chủ dự án"),
          authorRole: isCollaborator ? "COLLABORATOR" : "CREATOR",
          createdAt: "Vừa xong",
        };
        setCommentReplies((current) => [
          savedReply,
          ...current.filter((item) => item.commentId !== comment.id),
        ]);
        setReply("");
      },
      selectedCommentReply ? "Đã cập nhật phản hồi" : "Đã gửi phản hồi",
    );
  };

  const replyToInboxMessage = () => {
    if (!selectedInboxMessage || !messageReply.trim()) return;

    void runOperation(
      `message-${selectedInboxMessage.id}`,
      "REPLY_MESSAGE",
      {
        campaignId: operations.campaignId,
        messageId: selectedInboxMessage.id,
        body: messageReply,
      },
      () => {
        setHandledMessageIds((current) => [
          ...new Set([...current, selectedInboxMessage.id]),
        ]);
        setMessageReply("");
        setSelectedInboxMessageId(null);
      },
      `Đã trả lời ${selectedInboxMessage.senderName}`,
    );
  };

  return (
    <div className="container-shell pt-6">
      {isCollaborator ? (
        <section className="overflow-hidden rounded-[18px] border border-[#bcd4ea] bg-[#edf6ff]">
          <div className="grid lg:grid-cols-[1.25fr_1fr]">
            <div className="border-b border-[#c8dff1] p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <p className="eyebrow text-[#2869ac]">
                <MessageSquareText className="size-4" /> Ca nội dung & phản hồi
              </p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-[-0.03em] text-[#173d65]">
                Chỉ hiện phần việc được giao trong ORBIT One
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-5 text-[#526d87]">
                Bạn có thể đăng tiến độ và trả lời cộng đồng. Cấu hình gọi vốn,
                mục tiêu và giao quà vẫn thuộc quyền của chủ dự án.
              </p>
            </div>
            <div className="grid grid-cols-3 bg-white/60">
              <div className="border-r border-[#c8dff1] p-4 sm:p-5">
                <Clock3 className="size-4 text-[#2869ac]" />
                <p className="mt-3 font-display text-xl font-extrabold text-[#173d65]">
                  {collaboratorOpenTasks.length}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#4f657b]">
                  việc đang mở
                </p>
              </div>
              <div className="border-r border-[#c8dff1] p-4 sm:p-5">
                <ShieldCheck className="size-4 text-[#2869ac]" />
                <p className="mt-3 font-display text-xl font-extrabold text-[#173d65]">
                  {collaboratorMember?.permissions.length ?? 0}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#4f657b]">
                  quyền được cấp
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <BadgeCheck className="size-4 text-[#2869ac]" />
                <p className="mt-3 font-display text-xl font-extrabold text-[#173d65]">
                  {operations.handoffs.length}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#4f657b]">
                  lượt bàn giao
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div
          className="flex gap-1.5 overflow-x-auto rounded-[16px] border border-line bg-white p-2 shadow-2xs"
          role="tablist"
          aria-label="Quản lý chiến dịch"
        >
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            const badgeCount =
              item.id === "overview"
                ? tasks.filter((t) => t.status !== "DONE").length
                : item.id === "content"
                  ? members.length
                  : item.id === "community"
                    ? operations.communityMessages.length +
                      assistantData.priorities.length
                    : orders.length;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all ${
                  tab === item.id
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:bg-forest/5"
                }`}
              >
                <Icon
                  className={`size-4 ${
                    tab === item.id ? "text-lime" : "text-ink-muted"
                  }`}
                />{" "}
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    tab === item.id
                      ? "bg-white/15 text-lime"
                      : "bg-[#f2f3ee] text-ink-muted"
                  }`}
                >
                  {badgeCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold leading-5 ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.tone === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}
          {notice.message}
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[20px] border border-line bg-white p-6 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="eyebrow text-coral">
                  <Rocket className="size-4" /> Trạng thái chiến dịch
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  {campaignStatus === "PRE_LAUNCH"
                    ? "Đã duyệt · sẵn sàng mở"
                    : "Đang gọi vốn · nhận cam kết"}
                </h2>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${campaignStatus === "LIVE" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}
              >
                {campaignStatus === "LIVE" ? "ĐANG GỌI VỐN" : "SẮP MỞ"}
              </span>
            </div>
            <div className="mt-7 grid grid-cols-4 gap-2">
              {["BẢN NHÁP", "ĐANG DUYỆT", "SẮP MỞ", "GỌI VỐN"].map(
                (stage, index) => {
                  const done = campaignStatus === "LIVE" ? true : index <= 2;
                  return (
                    <div key={stage}>
                      <div
                        className={`h-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-forest/10"}`}
                      />
                      <p
                        className={`mt-2 text-[11px] font-bold ${done ? "text-emerald-700" : "text-ink-muted"}`}
                      >
                        {stage}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {campaignStatus === "PRE_LAUNCH" ? (
                <button
                  type="button"
                  disabled={busy === "launch"}
                  onClick={() =>
                    void runOperation(
                      "launch",
                      "LAUNCH",
                      { campaignId: operations.campaignId },
                      () => setCampaignStatus("LIVE"),
                      "Chiến dịch đã mở gọi vốn",
                    )
                  }
                  className="button-dark"
                >
                  {busy === "launch" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Rocket className="size-4" />
                  )}{" "}
                  Mở gọi vốn
                </button>
              ) : (
                <Link
                  href={`/projects/${operations.slug}`}
                  className="button-dark"
                >
                  <Rocket className="size-4" /> Xem trang đang gọi vốn
                </Link>
              )}
              <Link href="/creator/ai" className="button-secondary">
                Xem dự báo
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-ink-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" /> Chỉ chủ sở hữu
              chiến dịch được mở gọi vốn. Quyền và trạng thái luôn được kiểm tra
              lại trước khi thực hiện.
            </p>
          </article>

          <article className="rounded-[20px] bg-forest p-6 text-white sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-lime">
                  <BadgeCheck className="size-4" /> Phản hồi xét duyệt
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Đã duyệt có điều kiện
                </h2>
              </div>
              <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold text-forest">
                ĐÃ DUYỆT
              </span>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/6 p-4">
              <p className="text-sm font-bold">Checklist 8/8 mục đạt</p>
              <p className="mt-3 text-xs leading-6 text-white/57">
                Nội dung và rủi ro đã rõ. Trước khi mở gọi vốn, bổ sung mã chứng
                nhận an toàn điện trong bản cập nhật đầu tiên và không thay đổi
                mục tiêu.
              </p>
              <p className="mt-4 text-[11px] text-white/38">
                Duyệt bởi Trần Khánh An · 06/09/2026 14:20
              </p>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
            {[
              {
                label: "Đã cam kết",
                value: formatVnd(operations.today.pledgedAmount, true),
                icon: Gift,
              },
              {
                label: "Người ủng hộ",
                value: operations.today.backerCount.toLocaleString("vi-VN"),
                icon: Users,
              },
              {
                label: "Bình quân / cam kết",
                value: formatVnd(operations.today.averagePledgeAmount, true),
                icon: Bell,
              },
              {
                label: "Việc đang mở",
                value: String(
                  tasks.filter((task) => task.status !== "DONE").length,
                ),
                icon: Clock3,
              },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  key={metric.label}
                  className="rounded-2xl border border-line bg-white p-5"
                >
                  <Icon className="size-4 text-coral" />
                  <p className="mt-4 font-display text-2xl font-extrabold">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {metric.label}
                  </p>
                </article>
              );
            })}
          </div>

          <article className="rounded-[20px] border border-line bg-white p-6 xl:col-span-2">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow text-coral">
                  <Clock3 className="size-4" /> Đầu việc & bàn giao ca
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Phối hợp giữa chủ dự án và cộng tác viên
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                  Trạng thái việc liên thông trực tiếp với không gian làm việc của Gia Huy và Minh Trang.
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#f2f6e8] px-3 py-1.5 text-[11px] font-bold text-[#566c27]">
                {tasks.filter((item) => item.status === "DONE").length}/{tasks.length} đã hoàn tất
              </span>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-2.5">
                {tasks.map((task) => {
                  const done = task.status === "DONE";
                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                        done
                          ? "border-emerald-200 bg-emerald-50/45"
                          : "border-line bg-[#fbfaf7]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              done
                                ? "bg-emerald-100 text-emerald-800"
                                : task.status === "IN_PROGRESS"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-stone-200 text-stone-700"
                            }`}
                          >
                            {done
                              ? "HOÀN TẤT"
                              : task.status === "IN_PROGRESS"
                                ? "ĐANG XỬ LÝ"
                                : "CHỜ LÀM"}
                          </span>
                          <span className="text-[11px] font-semibold text-ink-muted">
                            Phụ trách: {task.assigneeName} · hạn {task.dueLabel}
                          </span>
                        </div>
                        <p
                          className={`mt-2 text-sm font-bold ${
                            done ? "line-through text-ink-muted" : "text-ink"
                          }`}
                        >
                          {task.title}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(task.id)}
                          className="button-ghost min-h-10 px-3 text-xs"
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          disabled={busy === `task-${task.id}`}
                          onClick={() => toggleTaskStatus(task.id)}
                          className="button-secondary min-h-10 px-3 text-xs"
                        >
                          {busy === `task-${task.id}` ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          {done ? "Mở lại" : "Chốt xong"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-line bg-[#f7f5f0] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Nhật ký bàn giao giữa các vai trò
                </p>
                <div className="mt-3 space-y-2.5">
                  {operations.handoffs.map((handoff) => (
                    <div
                      key={handoff.id}
                      className="rounded-xl border border-line bg-white p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold leading-5 text-ink">
                          {handoff.title}
                        </p>
                        <span className="shrink-0 text-[11px] font-semibold text-coral">
                          {handoff.at}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                        {handoff.note}
                      </p>
                      <p className="mt-2 text-[11px] font-bold text-ink-muted">
                        {handoff.from} → {handoff.to}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {tab === "content" ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[20px] border border-line bg-white p-6">
            <p className="eyebrow text-coral">
              <Gift className="size-4" /> Cấu hình bán
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">
              Gói ủng hộ, phần bổ sung và giao hàng
            </h2>
            <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {[
                ["Gói ủng hộ", "3 gói đang hoạt động"],
                ["Phần bổ sung", "3 lựa chọn"],
                ["Khu vực giao", "Việt Nam · 35.000 đ"],
                ["Mục tiêu gọi vốn", "800.000.000 đ · đã khóa"],
              ].map((row) => (
                <div
                  key={row[0]}
                  className="flex items-center justify-between gap-4 px-4 py-4"
                >
                  <p className="text-xs font-bold">{row[0]}</p>
                  <p className="text-right text-xs text-ink-muted">{row[1]}</p>
                </div>
              ))}
            </div>
            <Link
              href="/creator/campaigns/new?campaign=orbit-mini-bo-pha-gon"
              className="button-secondary mt-5"
            >
              <FilePenLine className="size-4" /> Mở bản cấu hình
            </Link>
          </article>
          <article className="rounded-[20px] border border-line bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow text-coral">
                  <Users className="size-4" /> Nhóm thực hiện
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Cộng tác viên của chiến dịch
                </h2>
              </div>
              <span className="rounded-full bg-[#f2f6e8] px-3 py-1.5 text-[11px] font-bold text-[#566c27]">
                {members.length} THÀNH VIÊN
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {members.map((member) => (
                <div
                  key={member.name}
                  className="rounded-2xl border border-line p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-forest font-display text-xs font-extrabold text-lime">
                      {member.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{member.name}</p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {member.role} · {member.openTasks} việc đang mở
                      </p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        Hoạt động {member.lastSeen}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {member.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="rounded-full bg-[#f2f6e8] px-2 py-1 text-[11px] font-bold text-[#566c27]"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-expanded={editingMember === member.name}
                      onClick={() =>
                        setEditingMember((current) =>
                          current === member.name ? null : member.name,
                        )
                      }
                      className="button-ghost min-h-11 px-3 text-xs"
                    >
                      {editingMember === member.name ? "Đóng" : "Sửa quyền"}
                    </button>
                  </div>
                  {editingMember === member.name ? (
                    <fieldset className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-3">
                      <legend className="sr-only">
                        Quyền của {member.name}
                      </legend>
                      {collaboratorPermissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#f6f5f0] px-3 py-2.5 text-[11px] font-semibold"
                        >
                          <input
                            name={`permission-${member.id}-${permission}`}
                            type="checkbox"
                            checked={member.permissions.includes(permission)}
                            disabled={busy === `permission-${member.name}`}
                            onChange={(event) =>
                              void updateMemberPermission(
                                member.id,
                                permission,
                                event.target.checked,
                              )
                            }
                            className="size-4 accent-[#f36545]"
                          />
                          {permission}
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      {tab === "community" ? (
        <div
          className={`mt-6 grid gap-5 ${
            isCollaborator
              ? "xl:grid-cols-[0.88fr_1.12fr]"
              : "xl:grid-cols-[1fr_0.9fr]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 xl:col-span-2">
            <div>
              <p className="text-xs font-extrabold text-ink">
                Chế độ tập trung trong ca
              </p>
              <p className="text-[11px] text-ink-muted">
                Lọc nhanh luồng cần xử lý để giao diện gọn gàng hơn khi trực ca.
              </p>
            </div>
            <div
              className="flex flex-wrap rounded-xl bg-[#f3f4ef] p-1"
              aria-label="Lọc khu vực cộng đồng"
            >
              {(
                [
                  ["all", "Tất cả luồng"],
                  ["discussions", "Hộp thư & Bình luận"],
                  ["updates", "Bản tin tiến độ"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCommunityFocus(mode)}
                  aria-pressed={communityFocus === mode}
                  className={`min-h-9 rounded-lg px-3 text-[11px] font-bold transition ${
                    communityFocus === mode
                      ? "bg-white text-forest shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <article
            className={`rounded-[20px] border bg-white p-6 xl:col-span-2 ${
              isCollaborator
                ? "border-[#bcd4ea] bg-[#f8fbff]"
                : "border-line"
            } ${communityFocus === "updates" ? "hidden" : ""}`}
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p
                  className={`eyebrow ${
                    isCollaborator ? "text-[#2869ac]" : "text-coral"
                  }`}
                >
                  <Mail className="size-4" /> Tin nhắn theo chiến dịch
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Hộp thư từ người ủng hộ
                </h2>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Mỗi tin đều gắn với chiến dịch và tài khoản người gửi, nên cả
                  nhóm có thể theo dõi đúng ngữ cảnh trao đổi.
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#f3eee7] px-3 py-1.5 text-[11px] font-bold text-ink-soft">
                {operations.communityMessages.length} cuộc trao đổi
              </span>
            </div>

            {operations.communityMessages.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {operations.communityMessages.map((message) => {
                  const handled = handledMessageIds.includes(message.id);
                  return (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => {
                        setSelectedInboxMessageId(message.id);
                        setMessageReply("");
                      }}
                      className="group min-h-36 rounded-2xl border border-line bg-[#fbfaf7] p-4 text-left transition hover:border-coral/45 hover:bg-white"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-[11px] font-bold text-white">
                            {message.senderInitials}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">
                              {message.senderName}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-ink-muted">
                              {message.sentAt}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${
                            handled
                              ? "bg-emerald-50 text-emerald-700"
                              : message.unread
                                ? "bg-coral/10 text-coral"
                                : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {handled
                            ? "ĐÃ TRẢ LỜI"
                            : message.unread
                              ? "TIN MỚI"
                              : "ĐÃ ĐỌC"}
                        </span>
                      </span>
                      <span className="mt-4 block text-sm font-bold leading-5">
                        {message.subject}
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-ink-muted">
                        {message.body}
                      </span>
                      <span className="mt-3 block text-[11px] font-bold text-coral group-hover:underline">
                        Đọc và trả lời
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-xs leading-5 text-ink-muted">
                Chưa có tin nhắn trực tiếp cho chiến dịch này. Bình luận công
                khai vẫn được theo dõi ở phần bên dưới.
              </div>
            )}
          </article>
          <div
            className={`${isCollaborator ? "xl:order-2" : ""} ${
              communityFocus === "updates" ? "hidden" : ""
            }`}
          >
            <CommentInsights
              data={assistantData}
              viewerRole={viewerRole}
              selectedCommentId={selectedComment?.id}
              onSelectComment={chooseComment}
              onUseReply={useSuggestedReply}
            />
          </div>
          <article
            className={`rounded-[20px] border bg-white p-6 ${
              isCollaborator
                ? "border-[#bcd4ea] bg-[#f8fbff] xl:order-1"
                : "border-line"
            } ${
              communityFocus === "discussions"
                ? "hidden"
                : communityFocus === "updates"
                  ? "xl:col-span-2"
                  : ""
            }`}
          >
            <p className={`eyebrow ${isCollaborator ? "text-[#2869ac]" : "text-coral"}`}>
              <Send className="size-4" /> Cập nhật chiến dịch
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">
              {isCollaborator
                ? "Soạn bản tin từ phần việc của bạn"
                : "Đăng cập nhật tiến độ"}
            </h2>
            {isCollaborator ? (
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                Nội dung sẽ hiển thị nhãn cộng tác viên để người ủng hộ biết ai
                đang chia sẻ tiến độ.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-ink-muted">
                Điền nhanh mẫu:
              </span>
              <button
                type="button"
                onClick={() => {
                  setUpdateTitle("Hoàn tất 200 chu kỳ đo áp suất cụm van ORB-P4");
                  setUpdateBody(
                    "Nhóm kỹ thuật đã chạy thử liên tục 200 chu kỳ chiết xuất ở 9 bar và 93°C. Độ lệch nhiệt độ duy trì dưới ±0.4°C, sẵn sàng khóa thông số cho lô linh kiện đầu tiên.",
                  );
                }}
                className="rounded-lg border border-line bg-[#f7f6f1] px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-coral/40 hover:bg-white hover:text-ink"
              >
                + Mốc thử nghiệm áp suất
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpdateTitle("Cập nhật lịch đóng gói & xác nhận địa chỉ đợt 1");
                  setUpdateBody(
                    "Hiện đã có hơn 94% người ủng hộ hoàn tất xác nhận địa chỉ nhận máy. Nhóm đang rà soát hộp chống sốc 2 lớp trước khi bàn giao đơn vị vận chuyển.",
                  );
                }}
                className="rounded-lg border border-line bg-[#f7f6f1] px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-coral/40 hover:bg-white hover:text-ink"
              >
                + Lịch đóng gói đợt 1
              </button>
            </div>
            <form
              className="mt-6 space-y-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                publishUpdate();
              }}
            >
              <label>
                <span className="text-xs font-bold text-ink-soft">Tiêu đề</span>
                <input
                  name="campaign-update-title"
                  className="input-field mt-2"
                  value={updateTitle}
                  onChange={(event) => setUpdateTitle(event.target.value)}
                  placeholder="Ví dụ: Hoàn tất kiểm thử khuôn vỏ"
                  maxLength={100}
                  aria-invalid={updateAttempted && !updateTitle.trim()}
                  aria-describedby="campaign-update-title-help"
                />
                <span
                  id="campaign-update-title-help"
                  className={`mt-1.5 flex justify-between gap-3 text-[11px] ${
                    updateAttempted && !updateTitle.trim()
                      ? "font-semibold text-red-700"
                      : "text-ink-muted"
                  }`}
                >
                  <span>
                    {updateAttempted && !updateTitle.trim()
                      ? "Nhập tiêu đề để người ủng hộ nhận ra nội dung chính."
                      : "Nêu đúng mốc tiến độ, tránh đặt tiêu đề chung chung."}
                  </span>
                  <span className="shrink-0">{updateTitle.length}/100</span>
                </span>
              </label>
              <label>
                <span className="text-xs font-bold text-ink-soft">
                  Nội dung
                </span>
                <textarea
                  name="campaign-update-body"
                  className="input-field mt-2 min-h-36 resize-y"
                  value={updateBody}
                  onChange={(event) => setUpdateBody(event.target.value)}
                  placeholder="Mô tả tiến độ, thay đổi và rủi ro mới…"
                  maxLength={2000}
                  aria-invalid={updateAttempted && !updateBody.trim()}
                  aria-describedby="campaign-update-body-help"
                />
                <span
                  id="campaign-update-body-help"
                  className={`mt-1.5 flex justify-between gap-3 text-[11px] ${
                    updateAttempted && !updateBody.trim()
                      ? "font-semibold text-red-700"
                      : "text-ink-muted"
                  }`}
                >
                  <span>
                    {updateAttempted && !updateBody.trim()
                      ? "Bổ sung nội dung trước khi đăng cập nhật."
                      : "Nên ghi việc đã làm, phần đang vướng và mốc tiếp theo."}
                  </span>
                  <span className="shrink-0">{updateBody.length}/2000</span>
                </span>
              </label>
              <button
                type="submit"
                disabled={busy === "update"}
                className="button-dark min-h-11 disabled:cursor-wait disabled:opacity-60"
              >
                {busy === "update" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}{" "}
                Đăng cập nhật
              </button>
            </form>
            <div className="mt-7 border-t border-line pt-5">
              <p className="text-xs font-bold">Lịch sử gần đây</p>
              <div className="mt-3 space-y-2">
                {updates.map((update) => {
                  const updateKey =
                    update.id ?? `${update.title}-${update.when}`;
                  return (
                    <button
                      key={updateKey}
                      type="button"
                      onClick={() => setSelectedUpdateKey(updateKey)}
                      className="w-full rounded-xl border border-transparent bg-[#f6f5f0] p-3 text-left transition hover:border-coral/40 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold">{update.title}</p>
                        <span className="shrink-0 text-[10px] font-bold text-coral">
                          Xem bản tin
                        </span>
                      </div>
                      {update.body ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">
                          {update.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {update.when}
                        {update.author ? ` · ${update.author}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
          <article
            id="comment-reply-composer"
            className={`rounded-[20px] border border-line bg-white p-6 ${
              isCollaborator
                ? "border-[#bcd4ea] ring-1 ring-blue-100 xl:order-3 xl:col-span-2"
                : ""
            } ${communityFocus === "updates" ? "hidden" : ""}`}
          >
            <p className="eyebrow text-coral">
              <MessageSquareText className="size-4" /> Hộp thư bình luận
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">
              Trả lời với nhãn {isCollaborator ? "Cộng tác viên" : "Chủ dự án"}
            </h2>
            {selectedComment ? (
              <div className="mt-6 rounded-2xl bg-[#f6f5f0] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">
                    {selectedComment.initials}
                  </span>
                  <div>
                    <p className="text-xs font-bold">
                      {selectedComment.author}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {selectedComment.createdAt} · Người ủng hộ
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-6 text-ink-soft">
                  {selectedComment.body}
                </p>
                {selectedCommentReply ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                      Phản hồi đã lưu · {selectedCommentReply.authorName}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-emerald-950">
                      {selectedCommentReply.body}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-line p-5 text-xs text-ink-muted">
                Chọn một bình luận ở danh sách ưu tiên để bắt đầu trả lời.
              </div>
            )}
            <label className="mt-4 block">
              <span className="text-xs font-bold text-ink-soft">Phản hồi</span>
              <textarea
                name="comment-reply"
                className="input-field mt-2 min-h-28 resize-y"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                disabled={!selectedComment}
                placeholder={`Câu trả lời sẽ có nhãn ${isCollaborator ? "Cộng tác viên" : "Chủ dự án"}…`}
                maxLength={500}
              />
            </label>
            <p className="mt-2 text-[11px] leading-4 text-ink-muted">
              Gợi ý chỉ được điền vào ô soạn, không tự gửi. Bạn có thể sửa từng
              câu để đúng thông tin của nhóm.
            </p>
            <button
              type="button"
              disabled={!selectedComment || !reply.trim() || busy === "reply"}
              onClick={sendCommentReply}
              className="button-secondary mt-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "reply" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <MessageSquareText className="size-4" />
              )}{" "}
              {selectedCommentReply ? "Cập nhật phản hồi" : "Gửi phản hồi"}
            </button>
          </article>
          {isCollaborator ? (
            <article className="rounded-[20px] border border-[#bcd4ea] bg-[#173d65] p-6 text-white xl:order-4 xl:col-span-2">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow text-[#b8e3fb]">
                    <Clock3 className="size-4" /> Nhật ký bàn giao
                  </p>
                  <h2 className="mt-2 font-display text-xl font-extrabold">
                    Dữ liệu nối giữa bạn và chủ dự án
                  </h2>
                </div>
                <Link
                  href="/collaborator#viec-hom-nay"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/16 bg-white/8 px-4 text-xs font-bold text-white hover:bg-white/12"
                >
                  Quay lại bảng việc
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {operations.handoffs.map((handoff) => (
                  <div
                    key={handoff.id}
                    className="rounded-2xl border border-white/10 bg-white/6 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold leading-5">
                        {handoff.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-[#b8e3fb]">
                        {handoff.at}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-white/60">
                      {handoff.note}
                    </p>
                    <p className="mt-3 text-[11px] font-semibold text-white/70">
                      {handoff.from} → {handoff.to}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={Boolean(selectedInboxMessage)}
        title={selectedInboxMessage?.subject ?? "Tin nhắn từ người ủng hộ"}
        description={
          selectedInboxMessage
            ? `${selectedInboxMessage.senderName} · ${selectedInboxMessage.sentAt}`
            : undefined
        }
        onClose={() => {
          setSelectedInboxMessageId(null);
          setMessageReply("");
        }}
        locked={busy === `message-${selectedInboxMessage?.id}`}
      >
        {selectedInboxMessage ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              replyToInboxMessage();
            }}
          >
            <div className="rounded-2xl border border-line bg-[#f7f5f0] p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-forest text-[11px] font-bold text-white">
                  {selectedInboxMessage.senderInitials}
                </span>
                <div>
                  <p className="text-xs font-bold">
                    {selectedInboxMessage.senderName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    Người ủng hộ · mã tin {selectedInboxMessage.id}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-soft">
                {selectedInboxMessage.body}
              </p>
            </div>
            <label className="mt-5 block">
              <span className="text-xs font-bold text-ink-soft">
                Phản hồi của nhóm dự án
              </span>
              <textarea
                name={`message-reply-${selectedInboxMessage.id}`}
                value={messageReply}
                onChange={(event) => setMessageReply(event.target.value)}
                className="input-field mt-2 min-h-28 resize-y"
                placeholder="Trả lời đúng thông tin người ủng hộ đang hỏi…"
                maxLength={500}
              />
              <span className="mt-1.5 flex justify-between gap-4 text-[11px] text-ink-muted">
                <span>Phản hồi sẽ xuất hiện trong hộp thư của người gửi.</span>
                <span>{messageReply.length}/500</span>
              </span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedInboxMessageId(null);
                  setMessageReply("");
                }}
                className="button-ghost min-h-11 px-4 text-xs"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={
                  !messageReply.trim() ||
                  busy === `message-${selectedInboxMessage.id}`
                }
                className="button-primary min-h-11 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === `message-${selectedInboxMessage.id}` ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {busy === `message-${selectedInboxMessage.id}`
                  ? "Đang gửi…"
                  : "Gửi phản hồi"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      {tab === "fulfillment" ? (
        <div className="mt-6 space-y-7">
          <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
            <article className="rounded-[20px] bg-forest p-6 text-white sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-lime">
                    <LockKeyhole className="size-4" /> ORBIT One · đang gọi vốn
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-extrabold">
                    Chưa phát hành đơn giao
                  </h2>
                </div>
                <span className="rounded-[8px] bg-white/8 px-2.5 py-1 text-[11px] font-bold text-white/70">
                  ĐANG KHÓA
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/62">
                {operations.fulfillment.currentCampaign.explanation}
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-5">
                <div>
                  <p className="font-display text-xl font-extrabold">
                    {operations.fulfillment.currentCampaign.authorizedCount.toLocaleString("vi-VN")}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-white/45">
                    cam kết đang giữ
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl font-extrabold">
                    {operations.fulfillment.currentCampaign.addressReadyCount.toLocaleString("vi-VN")}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-white/45">
                    địa chỉ đã đủ
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl font-extrabold">
                    {operations.fulfillment.currentCampaign.surveyPendingCount}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-white/45">
                    cần xác nhận thêm
                  </p>
                </div>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-white/58">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-lime" />
                {operations.fulfillment.currentCampaign.unlockLabel}
              </p>
            </article>

            <article className="rounded-[20px] border border-line bg-white p-6 sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-coral">
                    <CircleDollarSign className="size-4" /> Cam kết gần đây
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-extrabold">
                    Đã ủy quyền, chưa thu tiền
                  </h2>
                </div>
                <span className="text-xs text-ink-muted">
                  {operations.reservations.length} cam kết gần nhất
                </span>
              </div>
              <div className="mt-5 divide-y divide-line border-y border-line">
                {operations.reservations.map((reservation) => (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={() => setSelectedReservationId(reservation.id)}
                    className="grid w-full gap-2 py-4 text-left transition hover:bg-[#fbfaf7] sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{reservation.backer}</p>
                        <span className="text-[11px] font-bold text-amber-700">
                          ỦY QUYỀN · CHƯA THU
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-ink-muted">
                        {reservation.id} · {reservation.reward} · {reservation.city}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {reservation.authorizedAt} · Nhấn xem biên nhận ủy quyền
                      </p>
                    </div>
                    <p className="font-display text-base font-extrabold text-coral-dark">
                      {formatVnd(reservation.amount)}
                    </p>
                  </button>
                ))}
              </div>
            </article>
          </div>

          <section id="orbit-drip-fulfillment" className="scroll-mt-28">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow text-coral">
                  <PackageCheck className="size-4" /> Chiến dịch đã thành công
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  {operations.fulfillment.previousCampaign.title}
                </h2>
                <p className="mt-2 text-xs text-ink-muted">
                  {operations.fulfillment.previousCampaign.successfulAt} · {formatVnd(operations.fulfillment.previousCampaign.capturedAmount)} đã được đối soát
                </p>
              </div>
              <button
                type="button"
                onClick={exportOrders}
                className="button-secondary"
              >
                <Download className="size-4" /> Xuất CSV giao hàng
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {(
                [
                  ["ALL", "Tất cả đơn", orders.length],
                  [
                    "PENDING",
                    fulfillmentLabels.PENDING,
                    orders.filter((o) => o.status === "PENDING").length,
                  ],
                  [
                    "PREPARING",
                    fulfillmentLabels.PREPARING,
                    orders.filter((o) => o.status === "PREPARING").length,
                  ],
                  [
                    "SHIPPED",
                    fulfillmentLabels.SHIPPED,
                    orders.filter((o) => o.status === "SHIPPED").length,
                  ],
                  [
                    "DELIVERED",
                    fulfillmentLabels.DELIVERED,
                    orders.filter((o) => o.status === "DELIVERED").length,
                  ],
                ] as const
              ).map(([stageKey, label, count]) => {
                const active = orderStageFilter === stageKey;
                return (
                  <button
                    key={stageKey}
                    type="button"
                    onClick={() => setOrderStageFilter(stageKey)}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition ${
                      active
                        ? "border-forest bg-forest text-white shadow-xs"
                        : "border-line bg-white text-ink-soft hover:border-coral/40"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        active
                          ? "bg-white/15 text-lime"
                          : "bg-[#f3f3ed] text-ink-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 overflow-x-auto rounded-[16px] border border-line bg-white">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-[#f3f3ed] text-[11px] uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-5 py-4">Mã đơn</th>
                    <th className="px-5 py-4">Người ủng hộ</th>
                    <th className="px-5 py-4">Gói quà</th>
                    <th className="px-5 py-4">Địa chỉ</th>
                    <th className="px-5 py-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders
                    .filter(
                      (order) =>
                        orderStageFilter === "ALL" ||
                        order.status === orderStageFilter,
                    )
                    .map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-4 font-bold">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="text-left font-bold text-ink underline-offset-4 hover:text-coral hover:underline"
                        >
                          {order.id}
                        </button>
                      </td>
                      <td className="px-5 py-4">{order.backer}</td>
                      <td className="px-5 py-4 text-ink-soft">{order.reward}</td>
                      <td className="px-5 py-4 text-ink-muted">{order.city}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            name={`fulfillment-status-${order.id}`}
                            aria-label={`Trạng thái ${order.id}`}
                            disabled={busy === `order-${order.id}`}
                            value={order.status}
                            onChange={(event) =>
                              updateFulfillment(
                                order.id,
                                event.target.value as FulfillmentStatus,
                              )
                            }
                            className="rounded-xl border border-line bg-white px-3 py-2 text-[11px] font-bold outline-none focus:border-coral"
                          >
                            {(
                              Object.keys(
                                fulfillmentLabels,
                              ) as FulfillmentStatus[]
                            ).map((status) => (
                              <option key={status} value={status}>
                                {fulfillmentLabels[status]}
                              </option>
                            ))}
                          </select>
                          {busy === `order-${order.id}` ? (
                            <LoaderCircle className="size-4 animate-spin text-coral" />
                          ) : order.status === "DELIVERED" ? (
                            <Check className="size-4 text-emerald-600" />
                          ) : (
                            <Clock3 className="size-4 text-ink-muted" />
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="button-ghost min-h-9 px-2.5 text-[11px]"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      <Modal
        open={Boolean(selectedTask)}
        badge={
          selectedTask?.status === "DONE"
            ? "ĐÃ HOÀN TẤT"
            : selectedTask?.status === "IN_PROGRESS"
              ? "ĐANG XỬ LÝ"
              : "ĐẦU VIỆC NHÓM"
        }
        title={selectedTask?.title ?? "Chi tiết đầu việc"}
        description={
          selectedTask
            ? `Phụ trách: ${selectedTask.assigneeName} · Hạn xử lý: ${selectedTask.dueLabel}`
            : undefined
        }
        onClose={() => setSelectedTaskId(null)}
        footer={
          selectedTask ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/campaigns/${operations.campaignId}/timeline`}
                className="button-secondary min-h-10 px-4 text-xs"
              >
                Mở nhật ký chiến dịch
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy === `task-${selectedTask.id}`}
                  onClick={() => toggleTaskStatus(selectedTask.id)}
                  className="button-primary min-h-10 px-4 text-xs"
                >
                  {selectedTask.status === "DONE"
                    ? "Mở lại đầu việc"
                    : "Đánh dấu hoàn tất"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(null)}
                  className="button-ghost min-h-10 px-4 text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selectedTask ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-line bg-[#f7f5f0] p-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Mã đầu việc
                </p>
                <p className="mt-1 font-mono text-xs font-bold text-ink">
                  {selectedTask.id}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Thành viên nhận việc
                </p>
                <p className="mt-1 text-xs font-bold text-ink">
                  {selectedTask.assigneeName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Trạng thái đồng bộ
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-800">
                  {selectedTask.status === "DONE"
                    ? "Đã đồng bộ trên hệ thống"
                    : "Đang mở trên bàn cộng tác viên"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-xs font-bold text-ink">
                Luồng phối hợp giữa Chủ dự án và Cộng tác viên
              </p>
              <p className="mt-1.5 text-xs leading-6 text-ink-soft">
                Khi đầu việc này đổi trạng thái, cả bàn điều hành của Hoàng Linh lẫn bảng việc của {selectedTask.assigneeName} đều cập nhật ngay trên cùng bản ghi chiến dịch.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedUpdate)}
        badge="BẢN TIN TIẾN ĐỘ"
        title={selectedUpdate?.title ?? "Chi tiết cập nhật"}
        description={
          selectedUpdate
            ? `${selectedUpdate.when}${selectedUpdate.author ? ` · Đăng bởi ${selectedUpdate.author}` : ""}`
            : undefined
        }
        onClose={() => setSelectedUpdateKey(null)}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/campaigns/${operations.slug}#updates`}
              className="button-secondary min-h-10 px-4 text-xs"
            >
              Xem trên trang công khai
            </Link>
            <button
              type="button"
              onClick={() => setSelectedUpdateKey(null)}
              className="button-dark min-h-10 px-4 text-xs"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedUpdate ? (
          <div className="rounded-2xl border border-line bg-[#f7f5f0] p-4">
            <p className="whitespace-pre-line text-sm leading-7 text-ink-soft">
              {selectedUpdate.body ||
                "Bản tin đã được hiển thị công khai trên dòng cập nhật của chiến dịch."}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedReservation)}
        badge="ỦY QUYỀN · CHƯA THU TIỀN"
        title={
          selectedReservation
            ? `Cam kết ${selectedReservation.id} · ${selectedReservation.backer}`
            : "Chi tiết cam kết"
        }
        description={
          selectedReservation
            ? `${selectedReservation.authorizedAt} · Khu vực giao: ${selectedReservation.city}`
            : undefined
        }
        onClose={() => setSelectedReservationId(null)}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/campaigns/${operations.campaignId}/timeline`}
              className="button-secondary min-h-10 px-4 text-xs"
            >
              Đối chiếu nhật ký chiến dịch
            </Link>
            <button
              type="button"
              onClick={() => setSelectedReservationId(null)}
              className="button-dark min-h-10 px-4 text-xs"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedReservation ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-line bg-[#f7f5f0] p-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Gói phần thưởng đã chọn
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {selectedReservation.reward}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Số tiền giữ chỗ
                </p>
                <p className="mt-1 font-display text-lg font-extrabold text-coral-dark">
                  {formatVnd(selectedReservation.amount)}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-6 text-amber-950">
              Theo cơ chế tất cả hoặc không gì cả, khoản cam kết này đang ở trạng thái <strong>ủy quyền giữ chỗ</strong>. Đơn giao hàng chỉ mở khóa khi chiến dịch chạm 100% mục tiêu đúng hạn.
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedOrder)}
        badge={selectedOrder ? fulfillmentLabels[selectedOrder.status] : undefined}
        title={
          selectedOrder
            ? `Đơn giao quà ${selectedOrder.id} · ${selectedOrder.backer}`
            : "Chi tiết đơn giao quà"
        }
        description={
          selectedOrder
            ? `${operations.fulfillment.previousCampaign.title} · Giao tới ${selectedOrder.city}`
            : undefined
        }
        onClose={() => setSelectedOrderId(null)}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedOrderId(null)}
              className="button-dark min-h-10 px-4 text-xs"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedOrder ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-line bg-[#f7f5f0] p-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Người nhận
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {selectedOrder.backer}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Khu vực: {selectedOrder.city}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Gói phần thưởng
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {selectedOrder.reward}
                </p>
              </div>
            </div>
            <label className="block rounded-2xl border border-line bg-white p-4">
              <span className="text-xs font-bold text-ink-soft">
                Cập nhật trạng thái vận chuyển
              </span>
              <select
                name={`modal-fulfillment-status-${selectedOrder.id}`}
                value={selectedOrder.status}
                disabled={busy === `order-${selectedOrder.id}`}
                onChange={(event) =>
                  updateFulfillment(
                    selectedOrder.id,
                    event.target.value as FulfillmentStatus,
                  )
                }
                className="input-field mt-2"
              >
                {(
                  Object.keys(fulfillmentLabels) as FulfillmentStatus[]
                ).map((status) => (
                  <option key={status} value={status}>
                    {fulfillmentLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
