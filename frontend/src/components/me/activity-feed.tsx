import Link from "next/link";
import { ChevronDown, Flag, HandCoins, Lock, MessageSquare, Newspaper, RotateCcw } from "lucide-react";
import type { ActivityItem } from "@/server/queries/me";
import { Badge, Card } from "@/components/ui/primitives";
import { SafeImage } from "./safe-media";
import { PROJECT_STATUS } from "@/lib/status";
import { formatDate, formatVnd, timeAgo } from "@/lib/utils";

function vnDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

function vnDateLabel(dateKey: string) {
  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const yesterdayKey = new Date(now.getTime() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  if (dateKey === todayKey) return "Hôm nay";
  if (dateKey === yesterdayKey) return "Hôm qua";
  const [y, m, d] = dateKey.split("-");
  return `Ngày ${d}/${m}/${y}`;
}

const KIND_META: Record<
  ActivityItem["kind"],
  { label: string; tone: "violet" | "sky" | "emerald" | "neutral" | "amber"; icon: typeof Newspaper }
> = {
  UPDATE: { label: "Bản tin tiến độ", tone: "violet", icon: Newspaper },
  STATUS: { label: "Trạng thái dự án", tone: "sky", icon: Flag },
  PLEDGE: { label: "Góp vốn", tone: "emerald", icon: HandCoins },
  PLEDGE_CANCEL: { label: "Huỷ góp vốn", tone: "neutral", icon: RotateCcw },
  COMMENT: { label: "Bình luận", tone: "amber", icon: MessageSquare },
};

export function ActivityFeedList({ items }: { items: ActivityItem[] }) {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const key = vnDateKey(item.at);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([dateKey, list]) => (
        <section key={dateKey} className="space-y-3">
          <div className="sticky top-16 z-10 inline-flex items-center rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-bold text-fg backdrop-blur">
            {vnDateLabel(dateKey)} · {list.length} hoạt động
          </div>

          <div className="space-y-2.5">
            {list.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              const isLongUpdate = item.kind === "UPDATE" && item.locked === 0 && item.body.length > 220;

              return (
                <Card key={item.id} className="p-4 transition hover:border-violet-400/40">
                  <div className="flex items-start gap-3">
                    <Link
                      href={item.link}
                      className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2 sm:h-14 sm:w-20"
                    >
                      {item.cover_url && (
                        <SafeImage src={item.cover_url} alt={item.project_title} fill sizes="80px" className="object-cover" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={meta.tone}>
                            <Icon className="size-3" /> {meta.label}
                          </Badge>
                          <Link
                            href={`/p/${item.project_slug}`}
                            className="truncate text-xs font-semibold text-muted hover:text-fg hover:underline"
                          >
                            {item.project_title}
                          </Link>
                        </div>
                        <span className="text-[11px] text-muted" title={formatDate(item.at, true)} suppressHydrationWarning>
                          {timeAgo(item.at)}
                        </span>
                      </div>

                      {item.kind === "UPDATE" && (
                        <div className="space-y-1">
                          <Link href={item.link} className="block font-bold hover:text-violet-600 dark:hover:text-violet-400">
                            {item.title}
                          </Link>
                          {item.locked === 1 ? (
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                              <Lock className="size-3.5" /> Bản tin dành riêng cho người đã góp vốn
                            </div>
                          ) : isLongUpdate ? (
                            <details className="group text-sm text-muted">
                              <summary className="cursor-pointer list-none space-y-1">
                                <p className="line-clamp-2 prose-fv">{item.body}</p>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 group-open:hidden dark:text-violet-400">
                                  Đọc đầy đủ <ChevronDown className="size-3.5" />
                                </span>
                              </summary>
                              <p className="mt-2 rounded-xl bg-surface-2/60 p-3 text-sm text-fg prose-fv">{item.body}</p>
                            </details>
                          ) : (
                            item.body && <p className="text-sm text-muted prose-fv">{item.body}</p>
                          )}
                        </div>
                      )}

                      {item.kind === "STATUS" && (
                        <div className="text-sm">
                          <Link href={item.link} className="font-bold hover:underline">
                            Chuyển sang {PROJECT_STATUS[item.title]?.label ?? item.title}
                          </Link>
                          {item.body && <p className="mt-0.5 text-xs text-muted">{item.body}</p>}
                        </div>
                      )}

                      {(item.kind === "PLEDGE" || item.kind === "PLEDGE_CANCEL") && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Link href={item.link} className="font-bold hover:underline">
                            {item.kind === "PLEDGE" ? "Đã góp vốn" : "Đã huỷ khoản góp"}{" "}
                            <span className="font-mono text-xs">{item.title}</span>
                          </Link>
                          {item.meta && (
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatVnd(Number(item.meta))}
                            </span>
                          )}
                        </div>
                      )}

                      {item.kind === "COMMENT" && (
                        <div className="space-y-1 text-sm">
                          <Link href={item.link} className="font-semibold hover:underline">
                            {item.title === "reply" ? "Bạn đã trả lời một bình luận" : "Bạn đã đăng bình luận"}
                          </Link>
                          {item.body && (
                            <p className="rounded-xl bg-surface-2/60 px-3 py-2 text-xs text-muted">“{item.body}”</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
