"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  FolderKanban,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import type { ConversationRow, QuickContactItem, RelatedProjectItem } from "@/server/queries/me";
import { markConversationReadAction, sendMessageAction, startConversationAction } from "@/server/actions/me";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge, Card, ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { SafeAvatar, SafeImage } from "./safe-media";
import { cn, formatDate, timeAgo } from "@/lib/utils";

interface ContactSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  relation: string;
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

export interface MessengerThreadData {
  conv: {
    id: string;
    subject: string;
    created_at?: string;
    project_id?: string | null;
    project_title: string | null;
    project_slug: string | null;
    project_status: string | null;
    project_cover: string | null;
  };
  participants: ThreadParticipant[];
  messages: ThreadMessage[];
  myLastReadAt?: string | null;
}

const vnDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function vnDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return vnDateFmt.format(d);
}

function formatDayDivider(dayKey: string): string {
  const now = new Date();
  const todayKey = vnDateFmt.format(now);
  const yesterdayKey = vnDateFmt.format(new Date(now.getTime() - 86_400_000));
  if (dayKey === todayKey) return "Hôm nay";
  if (dayKey === yesterdayKey) return "Hôm qua";
  const parts = dayKey.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dayKey;
}

function RecipientSearchInput({
  value,
  onChange,
  placeholder = "Gõ tên hoặc @username để tìm người nhận…",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ContactSearchResult[]>([]);

  useEffect(() => {
    if (!focused) return;
    const ctrl = new AbortController();
    const q = value.trim().replace(/^@+/, "");
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/me/contacts/search?q=${encodeURIComponent(q)}&limit=8`, {
        signal: ctrl.signal,
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { ok?: boolean; users?: ContactSearchResult[] } | null) => {
          if (!ctrl.signal.aborted && data?.ok && Array.isArray(data.users)) {
            setResults(data.users);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, q ? 220 : 60);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, focused]);

  const showDropdown = focused && (loading || results.length > 0);

  return (
    <div className="relative">
      <Input
        name="to"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
        required
      />
      {showDropdown && (
        <div className="card absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto border border-line bg-surface p-1.5 shadow-xl">
          {loading && results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted">
              <Loader2 className="size-3.5 animate-spin" /> Đang tìm thành viên…
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(u.username);
                  setFocused(false);
                }}
                className="flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition hover:bg-surface-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <SafeAvatar name={u.display_name} src={u.avatar_url} size={28} />
                  <div className="min-w-0">
                    <div className="truncate font-bold text-fg">{u.display_name}</div>
                    <div className="truncate text-[11px] text-muted">@{u.username}</div>
                  </div>
                </div>
                <Badge tone="slate" className="shrink-0">
                  {u.relation}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ProjectContextField({ relatedProjects = [] }: { relatedProjects?: RelatedProjectItem[] }) {
  const [customMode, setCustomMode] = useState(relatedProjects.length === 0);
  const [projectVal, setProjectVal] = useState("");

  if (relatedProjects.length === 0) {
    return (
      <Field label="Mã dự án (tuỳ chọn)" hint="Nếu trao đổi riêng không theo dự án, hãy để trống">
        <Input name="project" value={projectVal} onChange={(e) => setProjectVal(e.target.value)} placeholder="Để trống hoặc nhập mã dự án…" />
      </Field>
    );
  }

  return (
    <Field
      label="Dự án liên quan (tuỳ chọn)"
      hint={
        <button
          type="button"
          onClick={() => {
            setCustomMode((prev) => !prev);
            setProjectVal("");
          }}
          className="font-semibold text-violet-600 hover:underline dark:text-violet-400"
        >
          {customMode ? "Chọn từ danh sách dự án liên quan" : "Nhập mã đường dẫn dự án khác"}
        </button>
      }
    >
      {customMode ? (
        <Input
          name="project"
          value={projectVal}
          onChange={(e) => setProjectVal(e.target.value)}
          placeholder="Nhập mã đường dẫn dự án (để trống nếu nhắn chung)…"
        />
      ) : (
        <Select name="project" value={projectVal} onChange={(e) => setProjectVal(e.target.value)}>
          <option value="">Không gắn dự án (nhắn chung)</option>
          {relatedProjects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
              {p.relation ? ` (${p.relation})` : ""}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function NewMessageModalButton({
  quickContacts = [],
  relatedProjects = [],
  variant = "primary",
  size = "sm",
  label = "Tin nhắn mới",
}: {
  quickContacts?: QuickContactItem[];
  relatedProjects?: RelatedProjectItem[];
  variant?: "primary" | "outline" | "secondary" | "ghost";
  size?: "xs" | "sm" | "md";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [toValue, setToValue] = useState("");

  const handleOpen = () => {
    setToValue("");
    setOpen(true);
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={handleOpen}>
        <MessageSquarePlus className="size-4" /> {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Soạn tin nhắn mới"
        description="Trao đổi trực tiếp với Chủ dự án, Cộng tác viên hoặc thành viên cộng đồng ngay trong hộp thư."
      >
        <ActionForm
          key={open ? "new-msg-open" : "new-msg-closed"}
          action={startConversationAction}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <Field label="Người nhận (tìm theo tên, @username hoặc email)" required hint="Gõ tên để tìm hoặc bấm liên hệ gợi ý bên dưới">
            <RecipientSearchInput value={toValue} onChange={setToValue} />
          </Field>

          {quickContacts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted">Chọn nhanh người liên hệ:</div>
              <div className="flex flex-wrap gap-1.5">
                {quickContacts.map((c) => {
                  const selected = toValue.trim().toLowerCase() === c.username.toLowerCase();
                  return (
                    <button
                      key={c.username}
                      type="button"
                      onClick={() => setToValue(c.username)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                        selected
                          ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                          : "border-line bg-surface-2 hover:border-violet-400/60",
                      )}
                    >
                      <SafeAvatar name={c.display_name} src={c.avatar_url} size={18} />
                      <span>{c.display_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <ProjectContextField relatedProjects={relatedProjects} />
            <Field label="Chủ đề (tuỳ chọn)">
              <Input name="subject" maxLength={120} placeholder="Hỏi về phần quà, tiến độ giao hàng…" />
            </Field>
          </div>

          <Field label="Nội dung tin nhắn" required>
            <Textarea name="body" required rows={4} maxLength={2000} placeholder="Viết tin nhắn gửi tới người nhận…" />
          </Field>

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <SubmitButton size="sm" pendingText="Đang gửi…">
              <Send className="size-4" /> Gửi tin nhắn
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

export function QuickMessageModalButton({
  toUsername,
  toDisplayName,
  projectSlug,
  projectTitle,
  variant = "outline",
  size = "xs",
  label = "Nhắn tin",
  className,
}: {
  toUsername: string;
  toDisplayName: string;
  projectSlug?: string | null;
  projectTitle?: string | null;
  variant?: "primary" | "outline" | "secondary" | "ghost";
  size?: "xs" | "sm" | "md";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <MessageSquare className="size-3.5" /> {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={`Nhắn tin tới ${toDisplayName}`}
        description={`Cuộc trò chuyện trực tiếp sẽ mở riêng theo ngữ cảnh${projectTitle ? ` dự án "${projectTitle}"` : ""}.`}
      >
        <ActionForm
          key={open ? `quick-msg-${toUsername}-${projectSlug ?? "dm"}` : "quick-msg-closed"}
          action={startConversationAction}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="to" value={toUsername} />
          <input type="hidden" name="project" value={projectSlug ?? ""} />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-500/25 bg-violet-500/8 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <SafeAvatar name={toDisplayName} size={28} />
              <div>
                <div className="font-bold text-fg">{toDisplayName}</div>
                <div className="text-muted">@{toUsername}</div>
              </div>
            </div>
            {(projectTitle || projectSlug) && (
              <Badge tone="violet" className="max-w-full truncate">
                <FolderKanban className="size-3 shrink-0" />
                <span className="truncate">{projectTitle || projectSlug}</span>
              </Badge>
            )}
          </div>

          <Field label="Chủ đề (tuỳ chọn)">
            <Input name="subject" maxLength={120} placeholder="Hỏi về phần quà, giao hàng hoặc góp ý dự án…" />
          </Field>

          <Field label="Nội dung tin nhắn" required>
            <Textarea name="body" required rows={4} maxLength={2000} placeholder={`Nhập lời nhắn gửi ${toDisplayName}…`} />
          </Field>

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <SubmitButton size="sm" pendingText="Đang gửi…">
              <Send className="size-4" /> Gửi tin nhắn
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

export function ConversationList({
  conversations,
  viewerId,
  activeId,
  quickContacts = [],
  relatedProjects = [],
  embedded = false,
  onSelectConversation,
}: {
  conversations: ConversationRow[];
  viewerId: string;
  activeId?: string | null;
  quickContacts?: QuickContactItem[];
  relatedProjects?: RelatedProjectItem[];
  embedded?: boolean;
  onSelectConversation?: (conv: ConversationRow, e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "UNREAD" | "PROJECT">("ALL");

  const propSig = `${conversations.length}:${conversations[0]?.id ?? ""}:${conversations[0]?.last_message_at ?? ""}:${conversations.reduce((s, c) => s + Number(c.unread), 0)}`;
  const [polled, setPolled] = useState<{ sig: string; items: ConversationRow[] } | null>(null);
  const items = polled && polled.sig === propSig ? polled.items : conversations;

  useEffect(() => {
    if (embedded) return;
    let active = true;
    const poll = () => {
      if (!active || document.hidden) return;
      fetch("/api/me/messages", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { ok?: boolean; conversations?: ConversationRow[] } | null) => {
          if (active && data?.ok && Array.isArray(data.conversations)) {
            setPolled({ sig: propSig, items: data.conversations });
          }
        })
        .catch(() => {});
    };
    const id = window.setInterval(poll, 8_000);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [propSig, embedded]);

  const unreadCount = useMemo(() => items.filter((c) => Number(c.unread) > 0).length, [items]);
  const projectCount = useMemo(() => items.filter((c) => Boolean(c.project_title)).length, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (filterTab === "UNREAD" && Number(c.unread) === 0) return false;
      if (filterTab === "PROJECT" && !c.project_title) return false;
      if (!q) return true;
      return (
        (c.other_name ?? "").toLowerCase().includes(q) ||
        (c.other_username ?? "").toLowerCase().includes(q) ||
        (c.project_title ?? "").toLowerCase().includes(q) ||
        (c.subject ?? "").toLowerCase().includes(q) ||
        (c.last_body ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, filterTab]);

  const inner = (
    <>
      <div className="shrink-0 space-y-2.5 border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-extrabold text-fg">Tin nhắn ({items.length})</h1>
            <p className="text-[11px] text-muted">Tự động đồng bộ tin nhắn mới</p>
          </div>
          <NewMessageModalButton quickContacts={quickContacts} relatedProjects={relatedProjects} size="xs" label="Mới" />
        </div>
        {items.length > 0 && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm người nhận, dự án, nội dung…"
                className="h-8 rounded-xl pl-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
              {[
                { key: "ALL" as const, label: `Tất cả (${items.length})` },
                { key: "UNREAD" as const, label: `Chưa đọc (${unreadCount})` },
                { key: "PROJECT" as const, label: `Theo dự án (${projectCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={cn(
                    "rounded-lg px-2 py-1 transition",
                    filterTab === tab.key
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-surface-2 text-muted hover:text-fg",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={cn("min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain", !embedded && "max-h-[68vh]")}>
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">
            Chưa có cuộc trò chuyện nào. Bấm nút <b>Mới</b> ở góc trên để gửi tin nhắn đầu tiên.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">
            Không tìm thấy hội thoại phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filtered.map((c) => {
            const active = c.id === activeId;
            const otherName = c.other_name ?? "Thành viên";
            return (
              <Link
                key={c.id}
                href={`/me/messages/${c.id}`}
                onClick={(e) => onSelectConversation?.(c, e)}
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
    </>
  );

  if (embedded) {
    return <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface">{inner}</div>;
  }

  return <Card className="flex flex-col overflow-hidden">{inner}</Card>;
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

export function ThreadView({
  conv,
  participants,
  messages,
  viewerId,
  embedded = false,
  onMessageSent,
  onSyncThreadData,
}: {
  conv: MessengerThreadData["conv"];
  participants: ThreadParticipant[];
  messages: ThreadMessage[];
  viewerId: string;
  embedded?: boolean;
  onMessageSent?: (convId: string, msg: ThreadMessage) => void;
  onSyncThreadData?: (convId: string, data: { messages: ThreadMessage[]; participants: ThreadParticipant[] }) => void;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [showJumpBottom, setShowJumpBottom] = useState(false);
  const [hasNewIncoming, setHasNewIncoming] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const prevConvIdRef = useRef(conv.id);
  const prevMsgCountRef = useRef(messages.length);

  const propSig = `${conv.id}:${messages.length}:${participants.map((p) => p.last_read_at ?? "").join(",")}`;
  const [polled, setPolled] = useState<{
    sig: string;
    messages: ThreadMessage[];
    participants: ThreadParticipant[];
  } | null>(null);
  const [optimistic, setOptimistic] = useState<{ sig: string; msg: ThreadMessage }[]>([]);

  const baseMessages = polled && polled.sig === propSig ? polled.messages : messages;
  const activeParticipants = polled && polled.sig === propSig ? polled.participants : participants;

  const liveMessages = useMemo(() => {
    const serverIds = new Set(baseMessages.map((m) => m.id));
    const extras = optimistic
      .filter((o) => o.sig === propSig && !serverIds.has(o.msg.id))
      .map((o) => o.msg);
    return [...baseMessages, ...extras];
  }, [baseMessages, optimistic, propSig]);

  const byId = useMemo(() => new Map(activeParticipants.map((p) => [p.id, p])), [activeParticipants]);
  const other = useMemo(() => activeParticipants.find((p) => p.id !== viewerId), [activeParticipants, viewerId]);
  const myParticipant = byId.get(viewerId);

  const isTeamRole = myParticipant?.role === "CREATOR" || myParticipant?.role === "COLLABORATOR";
  const quickReplies = conv.project_slug
    ? isTeamRole
      ? [
          "Cảm ơn bạn đã ủng hộ! Nhóm đã ghi nhận thông tin và sẽ phản hồi chi tiết ngay.",
          "Dự kiến nhóm sẽ cập nhật tiến độ sản xuất và lịch giao quà trong bản tin tuần này.",
          "Bạn vui lòng xác nhận lại địa chỉ nhận quà và số điện thoại liên hệ nhé.",
        ]
      : [
          "Chào nhóm dự án, cho mình hỏi tiến độ sản xuất và thời gian dự kiến giao quà nhé!",
          "Mình vừa hoàn tất góp vốn và muốn xác nhận thêm thông tin về gói quà.",
          "Cảm ơn nhóm đã phản hồi nhanh chóng, chúc chiến dịch thành công rực rỡ!",
        ]
    : [];

  // Auto-resize composer textarea cleanly (1..4 lines)
  useEffect(() => {
    const ta = composerRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(116, Math.max(44, ta.scrollHeight))}px`;
  }, [draft]);

  // Smart scroll handling on conversation change & new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const convChanged = prevConvIdRef.current !== conv.id;
    const msgGrew = liveMessages.length > prevMsgCountRef.current;
    const lastMsg = liveMessages[liveMessages.length - 1];

    prevConvIdRef.current = conv.id;
    prevMsgCountRef.current = liveMessages.length;

    if (convChanged) {
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
      return;
    }

    if (msgGrew) {
      if (lastMsg?.sender_id === viewerId || isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
        isNearBottomRef.current = true;
      }
    }
  }, [liveMessages, conv.id, viewerId]);

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist < 120;
    isNearBottomRef.current = near;
    setShowJumpBottom(!near);
    if (near) setHasNewIncoming(false);
  };

  const scrollToBottom = (smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    isNearBottomRef.current = true;
    setShowJumpBottom(false);
    setHasNewIncoming(false);
  };

  // Live poll every 5s while tab is visible
  useEffect(() => {
    let active = true;
    const syncThread = () => {
      if (!active || document.hidden) return;
      fetch(`/api/me/messages/${encodeURIComponent(conv.id)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { ok?: boolean; thread?: { messages: ThreadMessage[]; participants: ThreadParticipant[] } } | null) => {
          if (!active || !data?.ok || !data.thread) return;
          const nextMsgs = data.thread.messages;
          const nextParts = data.thread.participants;

          setPolled((prev) => {
            const prevLen = prev && prev.sig === propSig ? prev.messages.length : messages.length;
            if (nextMsgs.length > prevLen && !isNearBottomRef.current) {
              const latest = nextMsgs[nextMsgs.length - 1];
              if (latest?.sender_id !== viewerId) {
                setHasNewIncoming(true);
                setShowJumpBottom(true);
              }
            }
            return { sig: propSig, messages: nextMsgs, participants: nextParts };
          });

          onSyncThreadData?.(conv.id, { messages: nextMsgs, participants: nextParts });

          const me = nextParts.find((p) => p.id === viewerId);
          const hasIncomingUnread = nextMsgs.some(
            (m) => m.sender_id !== viewerId && (!me?.last_read_at || m.created_at > me.last_read_at),
          );
          if (hasIncomingUnread) {
            fetch(`/api/me/messages/${encodeURIComponent(conv.id)}/read`, { method: "POST" }).catch(() => {});
          }
        })
        .catch(() => {});
    };

    const id = window.setInterval(syncThread, 5_000);
    const onFocus = () => syncThread();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [conv.id, propSig, viewerId, messages.length, onSyncThreadData]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: ThreadMessage = {
      id: tempId,
      sender_id: viewerId,
      body: trimmed,
      created_at: new Date().toISOString(),
    };

    setSending(true);
    setDraft("");
    isNearBottomRef.current = true;
    setShowJumpBottom(false);
    setHasNewIncoming(false);
    setOptimistic((prev) => [...prev, { sig: propSig, msg: optimisticMsg }]);

    try {
      const fd = new FormData();
      fd.set("conversationId", conv.id);
      fd.set("body", trimmed);
      const res = await sendMessageAction(null, fd);
      if (res?.error) {
        setOptimistic((prev) => prev.filter((o) => o.msg.id !== tempId));
        setDraft(trimmed);
        toast.error(res.error);
        return;
      }
      if (res?.ok && res.messageItem) {
        const confirmed = res.messageItem;
        setOptimistic((prev) => [
          ...prev.filter((o) => o.msg.id !== tempId),
          { sig: propSig, msg: confirmed },
        ]);
        onMessageSent?.(conv.id, confirmed);
      } else {
        onMessageSent?.(conv.id, optimisticMsg);
      }
      if (!embedded) router.refresh();
    } catch {
      setOptimistic((prev) => prev.filter((o) => o.msg.id !== tempId));
      setDraft(trimmed);
      toast.error("Không gửi được tin nhắn, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  let lastMyMsgId: string | null = null;
  for (let i = liveMessages.length - 1; i >= 0; i--) {
    if (liveMessages[i].sender_id === viewerId) {
      lastMyMsgId = liveMessages[i].id;
      break;
    }
  }

  const content = (
    <>
      {/* Fixed Header with Compact Project Context Chip */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/me/messages"
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-line text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
            aria-label="Quay lại hộp thư"
          >
            <ArrowLeft className="size-4" />
          </Link>
          {other && <SafeAvatar name={other.display_name} src={other.avatar_url} size={38} />}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {other ? (
                <Link href={`/u/${other.username}`} className="truncate text-sm font-bold hover:underline">
                  {other.display_name}
                </Link>
              ) : (
                <span className="text-sm font-bold">Cuộc trò chuyện</span>
              )}
              {other?.role && <RoleBadge role={other.role} />}
              {other && <span className="hidden text-xs text-muted sm:inline">@{other.username}</span>}
            </div>
            <div className="truncate text-xs text-muted">{conv.subject}</div>
          </div>
        </div>

        <div className="flex max-w-full items-center gap-2">
          {conv.project_slug && conv.project_title && (
            <Link
              href={`/p/${conv.project_slug}`}
              className="hidden max-w-[260px] items-center gap-2 rounded-xl border border-line bg-surface-2/70 px-2.5 py-1 text-xs transition hover:border-violet-400/50 sm:inline-flex"
              title={`Mở dự án: ${conv.project_title}`}
            >
              {conv.project_cover && (
                <span className="relative h-5 w-8 shrink-0 overflow-hidden rounded border border-line">
                  <SafeImage src={conv.project_cover} alt={conv.project_title} fill sizes="32px" className="object-cover" />
                </span>
              )}
              <span className="truncate font-semibold text-fg">{conv.project_title}</span>
              {conv.project_status && <ProjectStatusBadge status={conv.project_status} />}
            </Link>
          )}

          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={refreshing}
            title="Làm mới hội thoại"
            aria-label="Làm mới hội thoại"
            onClick={() =>
              startRefresh(async () => {
                const res = await fetch(`/api/me/messages/${encodeURIComponent(conv.id)}`, { cache: "no-store" })
                  .then((r) => (r.ok ? r.json() : null))
                  .catch(() => null);
                if (res?.ok && res.thread) {
                  setPolled({
                    sig: propSig,
                    messages: res.thread.messages,
                    participants: res.thread.participants,
                  });
                  onSyncThreadData?.(conv.id, {
                    messages: res.thread.messages,
                    participants: res.thread.participants,
                  });
                }
                router.refresh();
              })
            }
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            <span className="hidden xl:inline">Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Scrollable Message Viewport */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="h-full space-y-1.5 overflow-y-auto overscroll-contain px-4 py-4"
        >
          {liveMessages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">Hãy gửi tin nhắn đầu tiên để bắt đầu trao đổi.</div>
          ) : (
            liveMessages.map((m, idx) => {
              const mine = m.sender_id === viewerId;
              const sender = byId.get(m.sender_id);
              const curDay = vnDayKey(m.created_at);
              const prev = idx > 0 ? liveMessages[idx - 1] : null;
              const next = idx < liveMessages.length - 1 ? liveMessages[idx + 1] : null;
              const showDayDivider = !prev || curDay !== vnDayKey(prev.created_at);

              const curMs = new Date(m.created_at).getTime();
              const prevMs = prev ? new Date(prev.created_at).getTime() : 0;
              const nextMs = next ? new Date(next.created_at).getTime() : 0;

              const groupedWithPrev =
                !showDayDivider &&
                Boolean(prev) &&
                prev?.sender_id === m.sender_id &&
                !Number.isNaN(curMs) &&
                !Number.isNaN(prevMs) &&
                Math.abs(curMs - prevMs) <= 180_000;

              const groupedWithNext =
                Boolean(next) &&
                next?.sender_id === m.sender_id &&
                vnDayKey(next.created_at) === curDay &&
                !Number.isNaN(curMs) &&
                !Number.isNaN(nextMs) &&
                Math.abs(nextMs - curMs) <= 180_000;

              const isLastMine = m.id === lastMyMsgId;
              const isOptimistic = m.id.startsWith("optimistic-");
              const isSeen = Boolean(!isOptimistic && other?.last_read_at && other.last_read_at >= m.created_at);
              const showMetaLine = !groupedWithNext || isLastMine;

              return (
                <div key={m.id} className={cn(!groupedWithPrev && idx > 0 && "pt-2")}>
                  {showDayDivider && (
                    <div className="flex items-center justify-center py-2" suppressHydrationWarning>
                      <span className="rounded-full border border-line bg-surface px-3 py-0.5 text-[11px] font-semibold text-muted shadow-xs">
                        {formatDayDivider(curDay)}
                      </span>
                    </div>
                  )}

                  <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                    {!mine &&
                      (groupedWithPrev ? (
                        <span className="w-[30px] shrink-0" aria-hidden />
                      ) : sender ? (
                        <SafeAvatar name={sender.display_name} src={sender.avatar_url} size={30} className="mb-0.5" />
                      ) : (
                        <span className="w-[30px] shrink-0" aria-hidden />
                      ))}
                    <div className={cn("max-w-[82%] sm:max-w-[70%]", mine && "flex flex-col items-end text-right")}>
                      {!mine && !groupedWithPrev && sender && (
                        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
                          <span className="font-semibold text-fg">{sender.display_name}</span>
                          {sender.role && <RoleBadge role={sender.role} />}
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                          mine
                            ? "rounded-br-sm bg-brand-gradient text-white shadow-[0_4px_14px_-6px_rgba(109,74,255,0.7)]"
                            : "rounded-bl-sm border border-line bg-surface text-fg shadow-xs",
                          isOptimistic && "opacity-75",
                        )}
                      >
                        {m.body}
                      </div>
                      {showMetaLine && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted" suppressHydrationWarning>
                          <span>{formatDate(m.created_at, true)}</span>
                          {mine && isLastMine && (
                            <span className="inline-flex items-center gap-0.5 font-semibold">
                              ·{" "}
                              {isOptimistic ? (
                                "Đang gửi…"
                              ) : isSeen ? (
                                <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400">
                                  <CheckCheck className="size-3" /> Đã xem
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5">
                                  <Check className="size-3" /> Đã gửi
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showJumpBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className={cn(
              "absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg transition hover:scale-105",
              hasNewIncoming
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-line bg-surface/95 text-fg backdrop-blur-md",
            )}
          >
            <ArrowDown className="size-3.5" />
            {hasNewIncoming ? "Tin nhắn mới" : "Xuống cuối"}
          </button>
        )}
      </div>

      {/* Fixed Composer */}
      <form onSubmit={handleSend} className="shrink-0 space-y-2 border-t border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
        {quickReplies.length > 0 && draft.length === 0 && (
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted">
              <Sparkles className="size-3 text-violet-500" /> Gợi ý:
            </span>
            {quickReplies.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => setDraft((prev) => (prev.trim() ? `${prev.trim()} ${tpl}` : tpl).slice(0, 2000))}
                className="shrink-0 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted transition hover:border-violet-400/60 hover:text-fg"
              >
                {tpl.length > 42 ? `${tpl.slice(0, 42)}…` : tpl}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Textarea
              ref={composerRef}
              name="body"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              required
              maxLength={2000}
              rows={1}
              placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
              className="min-h-[44px] max-h-28 w-full resize-none py-2.5"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
          </div>

          <Button
            type="submit"
            size="md"
            disabled={sending || !draft.trim()}
            className="h-[44px] shrink-0"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="hidden sm:inline">{sending ? "Đang gửi…" : "Gửi"}</span>
          </Button>
        </div>

        {draft.length > 0 && (
          <div className="flex justify-end text-[11px] tabular-nums text-muted">
            {draft.length.toLocaleString("vi-VN")}/2.000
          </div>
        )}
      </form>
    </>
  );

  if (embedded) {
    return <div className="flex h-full min-h-0 flex-col bg-bg/40">{content}</div>;
  }

  return <Card className="flex h-[75vh] min-h-[420px] flex-col overflow-hidden">{content}</Card>;
}

export function MessengerWorkspace({
  initialConversations,
  viewerId,
  initialActiveId,
  initialThread,
  mobileMode,
  quickContacts = [],
  relatedProjects = [],
}: {
  initialConversations: ConversationRow[];
  viewerId: string;
  initialActiveId: string | null;
  initialThread: MessengerThreadData | null;
  mobileMode: "inbox" | "thread";
  quickContacts?: QuickContactItem[];
  relatedProjects?: RelatedProjectItem[];
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRow[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [activeThread, setActiveThread] = useState<MessengerThreadData | null>(initialThread);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const threadCacheRef = useRef<Record<string, MessengerThreadData>>(
    initialThread ? { [initialThread.conv.id]: initialThread } : {},
  );

  // Live poll inbox list every 8s and on window focus
  useEffect(() => {
    let active = true;
    const poll = () => {
      if (!active || document.hidden) return;
      fetch("/api/me/messages", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { ok?: boolean; conversations?: ConversationRow[] } | null) => {
          if (active && data?.ok && Array.isArray(data.conversations)) {
            setConversations(data.conversations);
          }
        })
        .catch(() => {});
    };
    const id = window.setInterval(poll, 8_000);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleSelectConversation = async (c: ConversationRow, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return; // Mobile navigates cleanly to /me/messages/[id]
    }
    e.preventDefault();
    setActiveId(c.id);
    window.history.replaceState(null, "", `/me/messages/${encodeURIComponent(c.id)}`);

    const hadUnread = Number(c.unread) > 0;
    if (hadUnread) {
      setConversations((prev) => prev.map((row) => (row.id === c.id ? { ...row, unread: 0 } : row)));
    }

    const cached = threadCacheRef.current[c.id];
    if (cached) {
      setActiveThread(cached);
    } else {
      setLoadingId(c.id);
    }

    try {
      const res = await fetch(`/api/me/messages/${encodeURIComponent(c.id)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (res?.ok && res.thread) {
        threadCacheRef.current[c.id] = res.thread;
        setActiveThread(res.thread);
      }
      if (hadUnread) {
        await fetch(`/api/me/messages/${encodeURIComponent(c.id)}/read`, { method: "POST" }).catch(() => {});
        router.refresh();
      }
    } finally {
      setLoadingId((cur) => (cur === c.id ? null : cur));
    }
  };

  const handleMessageSent = (convId: string, msg: ThreadMessage) => {
    setConversations((prev) => {
      const target = prev.find((c) => c.id === convId);
      if (!target) return prev;
      const updated: ConversationRow = {
        ...target,
        last_body: msg.body,
        last_sender: viewerId,
        last_message_at: msg.created_at,
        unread: 0,
      };
      return [updated, ...prev.filter((c) => c.id !== convId)];
    });
    const cur = threadCacheRef.current[convId];
    if (cur && !cur.messages.some((m) => m.id === msg.id)) {
      const nextThread: MessengerThreadData = { ...cur, messages: [...cur.messages, msg] };
      threadCacheRef.current[convId] = nextThread;
      setActiveThread((t) => (t?.conv.id === convId ? nextThread : t));
    }
  };

  const handleSyncThreadData = (
    convId: string,
    data: { messages: ThreadMessage[]; participants: ThreadParticipant[] },
  ) => {
    const existing = threadCacheRef.current[convId];
    if (existing) {
      threadCacheRef.current[convId] = { ...existing, messages: data.messages, participants: data.participants };
    }
    const last = data.messages[data.messages.length - 1];
    if (last) {
      setConversations((prev) =>
        prev.map((row) =>
          row.id === convId
            ? { ...row, last_body: last.body, last_sender: last.sender_id, last_message_at: last.created_at, unread: 0 }
            : row,
        ),
      );
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-surface">
      {/* Left Column: Conversation Inbox */}
      <div
        className={cn(
          "h-full min-h-0 shrink-0 flex-col border-r border-line bg-surface lg:flex lg:w-[320px] xl:w-[352px]",
          mobileMode === "inbox" ? "flex w-full" : "hidden",
        )}
      >
        <ConversationList
          conversations={conversations}
          viewerId={viewerId}
          activeId={activeId}
          quickContacts={quickContacts}
          relatedProjects={relatedProjects}
          embedded
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Right Column: Active Chat Thread */}
      <div
        className={cn(
          "h-full min-h-0 min-w-0 flex-1 flex-col bg-bg/40 lg:flex",
          mobileMode === "thread" ? "flex w-full" : "hidden",
        )}
      >
        {loadingId && loadingId === activeId && (!activeThread || activeThread.conv.id !== activeId) ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sm text-muted">
            <Loader2 className="size-6 animate-spin text-violet-500" />
            Đang tải cuộc trò chuyện…
          </div>
        ) : activeThread ? (
          <ThreadView
            key={activeThread.conv.id}
            conv={activeThread.conv}
            participants={activeThread.participants}
            messages={activeThread.messages}
            viewerId={viewerId}
            embedded
            onMessageSent={handleMessageSent}
            onSyncThreadData={handleSyncThreadData}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <MessageSquare className="size-7" />
            </span>
            <h2 className="text-lg font-bold">
              {conversations.length === 0 ? "Hộp thư của bạn đang trống" : "Chọn một cuộc trò chuyện"}
            </h2>
            <p className="max-w-sm text-sm text-muted">
              {conversations.length === 0
                ? "Bắt đầu trao đổi với Chủ dự án, Cộng tác viên hoặc Người ủng hộ ngay tại đây."
                : "Chọn một hội thoại bên danh sách trái để xem lịch sử trao đổi và nhắn tin."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function NewMessageForm({
  prefillTo,
  prefillToDisplay,
  prefillProject,
  quickContacts,
  relatedProjects = [],
}: {
  prefillTo?: string;
  prefillToDisplay?: { username: string; display_name: string; avatar_url: string | null } | null;
  prefillProject?: { slug: string; title: string; status: string } | null;
  quickContacts: QuickContactItem[];
  relatedProjects?: RelatedProjectItem[];
}) {
  const [toValue, setToValue] = useState(prefillTo ?? "");

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
          <Field label="Người nhận (tìm theo tên, @username hoặc email)" required hint="Ví dụ: hoanglinh, haiyen, nguyennhutthanh813">
            <RecipientSearchInput value={toValue} onChange={setToValue} />
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
          <ProjectContextField relatedProjects={relatedProjects} />
        )}

        <Field label="Chủ đề (tuỳ chọn)">
          <Input name="subject" maxLength={120} placeholder="Hỏi về phần quà, tiến độ giao hàng…" />
        </Field>

        <Field label="Nội dung tin nhắn" required>
          <Textarea name="body" required maxLength={2000} placeholder="Viết tin nhắn gửi tới người nhận…" />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Badge tone="slate">Cuộc trò chuyện tự động đồng bộ tin nhắn mới</Badge>
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
