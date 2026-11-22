"use client";

import { useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquarePlus, RefreshCw, Send } from "lucide-react";
import type { ConversationRow } from "@/server/queries/me";
import { markConversationReadAction, sendMessageAction, startConversationAction } from "@/server/actions/me";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Badge, Card, ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { SafeAvatar, SafeImage } from "./safe-media";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export function ConversationList({
  conversations,
  viewerId,
  activeId,
}: {
  conversations: ConversationRow[];
  viewerId: string;
  activeId?: string;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">Hộp thư ({conversations.length})</h2>
          <p className="text-[11px] text-muted">Trao đổi trực tiếp cùng chủ dự án &amp; người ủng hộ</p>
        </div>
        <ButtonLink href="/me/messages/new" size="xs">
          <MessageSquarePlus className="size-3.5" /> Mới
        </ButtonLink>
      </div>

      <div className="divide-y divide-line max-h-[68vh] overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">
            Chưa có cuộc trò chuyện nào.{" "}
            <Link href="/me/messages/new" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
              Gửi tin nhắn đầu tiên
            </Link>
          </div>
        ) : (
          conversations.map((c) => {
            const active = c.id === activeId;
            const otherName = c.other_name ?? "Thành viên";
            return (
              <Link
                key={c.id}
                href={`/me/messages/${c.id}`}
                className={cn(
                  "flex gap-3 px-4 py-3 transition hover:bg-surface-2/70",
                  active && "bg-violet-500/10 ring-1 ring-inset ring-violet-500/20",
                )}
              >
                <SafeAvatar name={otherName} src={c.other_avatar} size={40} className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={cn("truncate text-sm", c.unread > 0 ? "font-extrabold text-fg" : "font-semibold text-fg")}>
                        {otherName}
                      </span>
                      {c.other_role && <RoleBadge role={c.other_role} />}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted" suppressHydrationWarning>
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>

                  {c.project_title ? (
                    <div className="truncate text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                      {c.project_title}
                    </div>
                  ) : c.subject ? (
                    <div className="truncate text-[11px] font-medium text-muted">{c.subject}</div>
                  ) : null}

                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("line-clamp-1 text-xs", c.unread > 0 ? "font-semibold text-fg" : "text-muted")}>
                      {c.last_body
                        ? `${c.last_sender === viewerId ? "Bạn: " : ""}${c.last_body}`
                        : "Bắt đầu cuộc trò chuyện"}
                    </p>
                    {c.unread > 0 && (
                      <span className="grid min-w-[18px] shrink-0 place-items-center rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}

export function MarkReadOnMount({ conversationId, hasUnread }: { conversationId: string; hasUnread: boolean }) {
  const router = useRouter();
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasUnread || doneRef.current === conversationId) return;
    doneRef.current = conversationId;
    markConversationReadAction(conversationId).then((res) => {
      if (res?.updated) router.refresh();
    });
  }, [conversationId, hasUnread, router]);

  return null;
}

export interface ThreadParticipant {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
  last_read_at: string | null;
}

export interface ThreadMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function ThreadView({
  conv,
  participants,
  messages,
  viewerId,
}: {
  conv: {
    id: string;
    subject: string;
    project_title: string | null;
    project_slug: string | null;
    project_status: string | null;
    project_cover: string | null;
  };
  participants: ThreadParticipant[];
  messages: ThreadMessage[];
  viewerId: string;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const byId = new Map(participants.map((p) => [p.id, p]));
  const others = participants.filter((p) => p.id !== viewerId);
  const other = others[0];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, conv.id]);

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/me/messages"
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-line text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
            aria-label="Quay lại hộp thư"
          >
            <ArrowLeft className="size-4" />
          </Link>
          {other && <SafeAvatar name={other.display_name} src={other.avatar_url} size={40} />}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {other ? (
                <Link href={`/u/${other.username}`} className="truncate font-bold hover:underline">
                  {other.display_name}
                </Link>
              ) : (
                <span className="font-bold">Cuộc trò chuyện</span>
              )}
              {other?.role && <RoleBadge role={other.role} />}
              {other && <span className="text-xs text-muted">@{other.username}</span>}
            </div>
            <div className="truncate text-xs text-muted">{conv.subject}</div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> Làm mới
        </Button>
      </div>

      {/* Project context bar */}
      {conv.project_slug && conv.project_title && (
        <Link
          href={`/p/${conv.project_slug}`}
          className="flex items-center gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5 text-xs transition hover:bg-surface-2"
        >
          {conv.project_cover && (
            <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-lg border border-line">
              <SafeImage src={conv.project_cover} alt={conv.project_title} fill sizes="56px" className="object-cover" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-fg">{conv.project_title}</div>
            <div className="text-[11px] text-muted">Ngữ cảnh dự án · nhấn để mở trang dự án</div>
          </div>
          {conv.project_status && <ProjectStatusBadge status={conv.project_status} />}
        </Link>
      )}

      {/* Message bubbles */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[54vh] min-h-[280px]">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">Hãy gửi tin nhắn đầu tiên để bắt đầu trao đổi.</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === viewerId;
            const sender = byId.get(m.sender_id);
            return (
              <div key={m.id} className={cn("flex gap-2.5", mine ? "justify-end" : "justify-start")}>
                {!mine && sender && (
                  <SafeAvatar name={sender.display_name} src={sender.avatar_url} size={30} className="mt-1" />
                )}
                <div className={cn("max-w-[82%] space-y-1 sm:max-w-[72%]", mine && "items-end text-right")}>
                  {!mine && sender && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span className="font-semibold text-fg">{sender.display_name}</span>
                      {sender.role && <RoleBadge role={sender.role} />}
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                      mine
                        ? "rounded-br-sm bg-brand-gradient text-white shadow-[0_6px_18px_-8px_rgba(109,74,255,0.75)]"
                        : "rounded-bl-sm border border-line bg-surface-2 text-fg",
                    )}
                  >
                    {m.body}
                  </div>
                  <div className="text-[10px] text-muted" suppressHydrationWarning>
                    {formatDate(m.created_at, true)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <ActionForm
        action={sendMessageAction}
        resetOnSuccess
        onSuccess={() => router.refresh()}
        className="border-t border-line bg-surface-2/40 p-3 sm:p-4"
      >
        <input type="hidden" name="conversationId" value={conv.id} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Textarea
            name="body"
            required
            maxLength={2000}
            rows={2}
            placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
            className="min-h-[54px] flex-1 resize-none py-2.5"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <SubmitButton size="md" pendingText="Đang gửi…" className="shrink-0">
            <Send className="size-4" /> Gửi
          </SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}

export function NewMessageForm({
  prefillTo,
  prefillToDisplay,
  prefillProject,
  quickContacts,
}: {
  prefillTo?: string;
  prefillToDisplay?: { username: string; display_name: string; avatar_url: string | null } | null;
  prefillProject?: { slug: string; title: string; status: string } | null;
  quickContacts: { username: string; display_name: string; avatar_url: string | null; hint: string }[];
}) {
  return (
    <Card className="p-5 sm:p-6">
      <ActionForm action={startConversationAction} className="space-y-4">
        {prefillToDisplay ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3">
            <div className="flex items-center gap-3">
              <SafeAvatar name={prefillToDisplay.display_name} src={prefillToDisplay.avatar_url} size={40} />
              <div>
                <div className="text-sm font-bold">{prefillToDisplay.display_name}</div>
                <div className="text-xs text-muted">@{prefillToDisplay.username}</div>
              </div>
            </div>
            <Link href="/me/messages/new" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
              Đổi người nhận
            </Link>
            <input type="hidden" name="to" value={prefillToDisplay.username} />
          </div>
        ) : (
          <Field label="Người nhận (username hoặc email)" required hint="Ví dụ: hoanglinh, haiyen, lachong">
            <Input
              name="to"
              defaultValue={prefillTo ?? ""}
              placeholder="Nhập username người nhận…"
              required
              list="quick-contacts-list"
            />
            {quickContacts.length > 0 && (
              <datalist id="quick-contacts-list">
                {quickContacts.map((c) => (
                  <option key={c.username} value={c.username}>
                    {c.display_name} ({c.hint})
                  </option>
                ))}
              </datalist>
            )}
          </Field>
        )}

        {!prefillToDisplay && quickContacts.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted">Liên hệ nhanh:</div>
            <div className="flex flex-wrap gap-1.5">
              {quickContacts.map((c) => (
                <Link
                  key={c.username}
                  href={`/me/messages/new?to=${encodeURIComponent(c.username)}${prefillProject ? `&project=${encodeURIComponent(prefillProject.slug)}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium transition hover:border-violet-400/60"
                >
                  <SafeAvatar name={c.display_name} src={c.avatar_url} size={18} />
                  <span>{c.display_name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {prefillProject ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-xs">
            <div className="min-w-0">
              <span className="text-muted">Dự án đính kèm: </span>
              <span className="font-bold text-fg">{prefillProject.title}</span>
            </div>
            <ProjectStatusBadge status={prefillProject.status} />
            <input type="hidden" name="project" value={prefillProject.slug} />
          </div>
        ) : (
          <Field label="Slug dự án (tuỳ chọn)" hint="Nếu muốn gắn ngữ cảnh dự án, ví dụ: orbit-one">
            <Input name="project" placeholder="orbit-one" />
          </Field>
        )}

        <Field label="Chủ đề (tuỳ chọn)">
          <Input name="subject" maxLength={120} placeholder="Hỏi về phần quà, tiến độ giao hàng…" />
        </Field>

        <Field label="Nội dung tin nhắn" required>
          <Textarea name="body" required maxLength={2000} placeholder="Viết tin nhắn gửi tới người nhận…" />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Badge tone="slate">Không real-time · bấm Làm mới trong hộp thư để xem phản hồi</Badge>
          <div className="flex gap-2">
            <ButtonLink href="/me/messages" variant="outline" size="sm">
              Huỷ
            </ButtonLink>
            <SubmitButton size="sm" pendingText="Đang gửi…">
              <Send className="size-4" /> Gửi tin nhắn
            </SubmitButton>
          </div>
        </div>
      </ActionForm>
    </Card>
  );
}
