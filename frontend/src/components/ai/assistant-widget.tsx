"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { ArrowUp, Bot, MessageCircleQuestion, RotateCcw, Sparkles, X } from "lucide-react";
import { askAssistantAction } from "@/server/actions/ai";
import type { AssistantTurn } from "@/lib/ai-types";
import { cn } from "@/lib/utils";
import { AiRichText } from "./rich-text";

const HIDDEN_PREFIXES = ["/admin", "/studio", "/me", "/login", "/register", "/forgot-password", "/vnpay", "/forbidden"];

function projectSlugOf(pathname: string): string | null {
  const m = /^\/p\/([^/]+)\/?$/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

const STARTERS_PROJECT = [
  "Dự án này có gì nổi bật?",
  "Phí giao hàng và khi nào nhận quà?",
  "Nếu dự án không đạt mục tiêu thì sao?",
  "Mức quà nào phù hợp với mình nhất?",
];
const STARTERS_GLOBAL = [
  "Góp vốn trên FundViet hoạt động thế nào?",
  "Gợi ý vài dự án đang được quan tâm",
  "Tiền của tôi có được hoàn nếu dự án thất bại?",
];

const MAX_TURNS = 24;

/** Nút + khung chat trợ lý AI nổi ở góc phải các trang công khai. */
export function AssistantWidget() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || /^\/p\/[^/]+\/back/.test(pathname);
  const slug = projectSlugOf(pathname);
  const storageKey = `fv-assistant:${slug ?? "global"}`;

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Nạp lịch sử theo từng dự án (sessionStorage) khi đổi trang
  if (loadedKey !== storageKey && typeof window !== "undefined") {
    setLoadedKey(storageKey);
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      setTurns(raw ? (JSON.parse(raw) as AssistantTurn[]) : []);
    } catch {
      setTurns([]);
    }
  }

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(turns.slice(-MAX_TURNS)));
    } catch {
      // bộ nhớ phiên đầy → bỏ qua
    }
  }, [turns, storageKey, loadedKey]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, pending, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Khoá cuộn trang nền khi mở toàn màn hình trên điện thoại
  useEffect(() => {
    if (!open || window.matchMedia("(min-width: 768px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const send = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q || pending) return;
      const next: AssistantTurn[] = [...turns, { role: "user", content: q.slice(0, 600) }];
      setTurns(next);
      setDraft("");
      startTransition(async () => {
        const res = await askAssistantAction({
          slug,
          messages: next.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })),
        }).catch(() => ({ ok: false, error: "Mất kết nối tới trợ lý. Vui lòng thử lại." }) as const);
        if (!res.ok || !("answer" in res) || !res.answer) {
          setTurns((cur) => [...cur, { role: "assistant", content: res.error ?? "Trợ lý đang bận, bạn thử lại sau nhé.", error: true }]);
          return;
        }
        setTurns((cur) => [
          ...cur,
          {
            role: "assistant",
            content: res.answer!,
            followUps: res.followUps ?? [],
            actions: res.actions ?? [],
            source: res.source,
          },
        ]);
      });
    },
    [pending, slug, turns],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(draft);
    }
  };

  const lastAssistant = useMemo(() => [...turns].reverse().find((t) => t.role === "assistant" && !t.error), [turns]);
  const modeLabel = lastAssistant?.source === "RULE" ? "Chế độ cơ bản" : "DeepSeek AI";
  const starters = slug ? STARTERS_PROJECT : STARTERS_GLOBAL;

  if (hidden) return null;

  return (
    <>
      {/* Nút mở */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý AI FundViet"
          className={cn(
            "group fixed right-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand-gradient py-3 pl-3 pr-3 text-sm font-bold text-white shadow-xl shadow-violet-500/30 transition hover:scale-[1.03] hover:shadow-violet-500/45 md:bottom-6 md:right-6 md:pr-4",
            slug ? "bottom-[148px]" : "bottom-[84px]",
          )}
        >
          <span className="relative grid size-7 place-items-center rounded-full bg-white/20">
            <Sparkles className="size-4" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-violet-600" />
          </span>
          <span className="hidden md:inline">Hỏi trợ lý AI</span>
        </button>
      )}

      {/* Khung chat */}
      {open && (
        <section
          role="dialog"
          aria-label="Trợ lý AI FundViet"
          className="fixed inset-0 z-[60] flex flex-col bg-surface md:inset-auto md:bottom-6 md:right-6 md:h-[min(640px,calc(100dvh-7rem))] md:w-[400px] md:overflow-hidden md:rounded-3xl md:border md:border-line md:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-white">
            <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/20">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-extrabold">Trợ lý FundViet</span>
                <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{modeLabel}</span>
              </div>
              <p className="truncate text-xs text-white/80">
                {slug ? "Đang hỏi về dự án bạn đang xem" : "Hỏi về cách góp vốn & dự án phù hợp"}
              </p>
            </div>
            {turns.length > 0 && (
              <button
                type="button"
                onClick={() => setTurns([])}
                className="grid size-8 place-items-center rounded-xl text-white/85 transition hover:bg-white/15"
                aria-label="Bắt đầu cuộc trò chuyện mới"
                title="Cuộc trò chuyện mới"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-xl text-white/85 transition hover:bg-white/15"
              aria-label="Đóng trợ lý"
            >
              <X className="size-5" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            {/* Lời chào */}
            <div className="flex gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 rounded-2xl rounded-tl-md bg-surface-2 px-3.5 py-2.5 text-sm">
                <p className="font-semibold">Xin chào! Mình là trợ lý AI của FundViet 👋</p>
                <p className="mt-1 text-muted">
                  {slug
                    ? "Mình đã đọc câu chuyện, các mức quà, hỏi đáp và bản tin của dự án này. Bạn cứ hỏi nhé!"
                    : "Mình giải thích cơ chế góp vốn, hoàn tiền và gợi ý dự án đang gọi vốn phù hợp với bạn."}
                </p>
              </div>
            </div>

            {turns.length === 0 && (
              <div className="space-y-2 pl-[42px]">
                <p className="text-xs font-semibold text-muted">Gợi ý câu hỏi</p>
                <div className="flex flex-col items-start gap-1.5">
                  {starters.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-violet-500/25 bg-violet-500/5 px-3 py-1.5 text-left text-xs font-semibold text-violet-700 transition hover:border-violet-500/50 hover:bg-violet-500/10 dark:text-violet-300"
                    >
                      <MessageCircleQuestion className="size-3.5 shrink-0" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-md bg-brand-gradient px-3.5 py-2.5 text-sm text-white shadow-sm">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl",
                      t.error ? "bg-rose-500/15 text-rose-600" : "bg-violet-500/15 text-violet-600 dark:text-violet-300",
                    )}
                  >
                    <Bot className="size-4" />
                  </span>
                  <div className="min-w-0 max-w-[88%] space-y-2">
                    <div
                      className={cn(
                        "rounded-2xl rounded-tl-md px-3.5 py-2.5",
                        t.error ? "border border-rose-500/30 bg-rose-500/8 text-sm text-rose-700 dark:text-rose-300" : "bg-surface-2",
                      )}
                    >
                      {t.error ? t.content : <AiRichText text={t.content} />}
                    </div>
                    {!!t.actions?.length && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.actions.map((a) => (
                          <Link
                            key={a.href}
                            href={a.href}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700"
                          >
                            {a.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    {t === lastAssistant && !pending && !!t.followUps?.length && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.followUps.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => send(f)}
                            className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-violet-400/60 hover:text-fg"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

            {pending && (
              <div className="flex gap-2.5" aria-live="polite">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                  <Bot className="size-4" />
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-surface-2 px-4 py-3">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-violet-500/70"
                      style={{ animationDelay: `${d * 140}ms` }}
                    />
                  ))}
                  <span className="sr-only">Trợ lý đang soạn câu trả lời</span>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-line bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface-2/60 p-1.5 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/15">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={600}
                placeholder={slug ? "Hỏi về dự án này…" : "Nhập câu hỏi của bạn…"}
                aria-label="Câu hỏi cho trợ lý AI"
                className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => send(draft)}
                disabled={!draft.trim() || pending}
                aria-label="Gửi câu hỏi"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow transition enabled:hover:scale-105 disabled:opacity-40"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted">
              AI có thể nhầm lẫn — thông tin chính thức luôn nằm trên trang dự án.
            </p>
          </footer>
        </section>
      )}
    </>
  );
}
