import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  HelpCircle,
  History,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Video,
  XCircle,
} from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { BANNED_KEYWORDS, reviewDetail } from "@/server/queries/admin";
import {
  formatWaiting,
  REVIEW_DECISION_META,
  splitHighlightKeywords,
  toYoutubeEmbedUrl,
} from "@/components/admin/admin-helpers";
import { ReviewDecisionForm } from "@/components/admin/review-decision-form";
import { SafeAvatar, SafeImage } from "@/components/admin/safe-image";
import { Gauge } from "@/components/fx/gauge";
import { ButtonLink } from "@/components/ui/button";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { cn, formatCompactVnd, formatDate, formatVnd } from "@/lib/utils";

export const metadata = { title: "Chi tiết duyệt dự án" };

function HighlightedText({ text }: { text: string }) {
  const parts = splitHighlightKeywords(text, BANNED_KEYWORDS);
  return (
    <>
      {parts.map((part, idx) =>
        part.match ? (
          <mark
            key={idx}
            className="rounded bg-rose-500/20 px-1 py-0.5 font-bold text-rose-700 ring-1 ring-rose-500/40 dark:text-rose-300"
          >
            {part.text}
          </mark>
        ) : (
          <span key={idx}>{part.text}</span>
        ),
      )}
    </>
  );
}

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireSystemPerm("admin.project.review", "/admin/reviews");
  const { slug } = await params;
  const data = reviewDetail(slug);
  if (!data) notFound();

  const { project: p, sections, tiers, addOns, faqs, checklist, extraChecks, prediction, creator, pastProjects, reviews } = data;
  const requiredOk = checklist.every((c) => !c.required || c.ok);
  const videoEmbed = toYoutubeEmbedUrl(p.video_url);

  return (
    <div className="space-y-6">
      {/* Header điều hướng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <ButtonLink href="/admin/reviews" variant="outline" size="xs">
            <ArrowLeft className="size-3.5" /> Quay lại hàng chờ
          </ButtonLink>
          <ProjectStatusBadge status={p.status} />
          <Badge tone="amber" dot>
            <Clock className="size-3" /> Chờ {formatWaiting(data.waitingMs)}
          </Badge>
          {data.willSchedule && data.desiredStart && (
            <Badge tone="sky">
              <CalendarClock className="size-3" /> Dự kiến mở {formatDate(data.desiredStart, true)}
            </Badge>
          )}
        </div>

        <ButtonLink href={`/p/${p.slug}`} variant="ghost" size="xs">
          Xem trang công khai <ExternalLink className="size-3.5" />
        </ButtonLink>
      </div>

      {/* Bố cục 2 cột: trái xem trước dự án, phải kiểm tra & duyệt */}
      <div className="grid gap-6 lg:grid-cols-[1fr_390px] lg:items-start">
        {/* CỘT TRÁI: Xem trước chỉ đọc */}
        <div className="min-w-0 space-y-6">
          {/* Ảnh bìa & thông tin chính */}
          <section className="card overflow-hidden">
            <div className="relative aspect-[16/9] w-full bg-surface-2">
              <SafeImage src={p.cover_url} alt={p.title} fill sizes="(max-width:1024px) 100vw, 720px" className="object-cover" />
              <span
                className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow"
                style={{ backgroundColor: p.color }}
              >
                {p.category}
              </span>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  <HighlightedText text={p.title} />
                </h1>
                <p className="mt-2 text-sm text-muted sm:text-base">
                  <HighlightedText text={p.blurb || "Chưa có mô tả ngắn."} />
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface-2/60 p-4 sm:grid-cols-4">
                <div>
                  <div className="text-[11px] text-muted">Mục tiêu gọi vốn</div>
                  <div className="mt-0.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatVnd(p.goal_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">Thời lượng</div>
                  <div className="mt-0.5 text-sm font-extrabold">{p.duration_days} ngày</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">Chế độ xem trước</div>
                  <div className="mt-0.5 text-sm font-extrabold">{p.is_preview_public ? "Công khai khi duyệt" : "Riêng tư"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">Gửi duyệt lúc</div>
                  <div className="mt-0.5 text-sm font-bold">{formatDate(p.submitted_at, true)}</div>
                </div>
              </div>

              {p.video_url && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                    <Video className="size-3.5" /> Video giới thiệu
                  </div>
                  {videoEmbed ? (
                    <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-black">
                      <iframe
                        src={videoEmbed}
                        title={`Video ${p.title}`}
                        className="h-full w-full"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a
                      href={p.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
                    >
                      {p.video_url} <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Nội dung Campaign (sections) */}
          <section className="card space-y-5 p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Nội dung chiến dịch ({sections.length} section)</h2>
            {sections.length === 0 ? (
              <p className="text-sm text-muted">Chưa có nội dung chiến dịch.</p>
            ) : (
              <div className="space-y-5">
                {sections.map((sec) => {
                  const secVideoEmbed = sec.kind === "VIDEO" ? toYoutubeEmbedUrl(sec.media_url) : null;
                  return (
                    <div key={sec.id} className="space-y-2 border-b border-line pb-5 last:border-b-0 last:pb-0">
                      {sec.heading && (
                        <h3 className="text-base font-bold">
                          <HighlightedText text={sec.heading} />
                        </h3>
                      )}
                      {sec.kind === "TEXT" && (
                        <div className="prose-fv text-sm text-fg/90">
                          <HighlightedText text={sec.body} />
                        </div>
                      )}
                      {sec.kind === "IMAGE" && sec.media_url && (
                        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-surface-2">
                          <SafeImage src={sec.media_url} alt={sec.heading || p.title} fill sizes="(max-width:1024px) 100vw, 700px" className="object-cover" />
                        </div>
                      )}
                      {sec.kind === "VIDEO" && sec.media_url && (
                        secVideoEmbed ? (
                          <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-black">
                            <iframe src={secVideoEmbed} title={sec.heading || "Video"} className="h-full w-full" allowFullScreen />
                          </div>
                        ) : (
                          <a href={sec.media_url} target="_blank" rel="noreferrer" className="text-sm text-violet-600 underline">
                            {sec.media_url}
                          </a>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Phần quà & Add-on */}
          <section className="card space-y-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Gift className="size-5 text-violet-500" />
              <h2 className="text-lg font-extrabold">Mức quà ({tiers.length}) &amp; Add-on ({addOns.length})</h2>
            </div>

            {tiers.length === 0 ? (
              <p className="text-sm text-muted">Chưa có mức quà nào.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {tiers.map((tier) => (
                  <div key={tier.id} className="rounded-2xl border border-line bg-surface-2/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold">
                        <HighlightedText text={tier.title} />
                      </div>
                      <Badge tone={tier.is_active ? "emerald" : "neutral"}>
                        {tier.is_active ? formatVnd(tier.amount) : "Tạm ẩn"}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      <HighlightedText text={tier.description} />
                    </p>
                    {tier.items.length > 0 && (
                      <ul className="mt-2.5 space-y-1 border-t border-line pt-2 text-xs">
                        {tier.items.map((it, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>• {it.name}</span>
                            <span className="font-semibold">×{it.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                      <span>Giao dự kiến: {tier.estimated_delivery}</span>
                      <span>· {tier.ships_physical ? `Giao vật lý (ship ${formatVnd(tier.shipping_fee)})` : "Quà số"}</span>
                      {tier.quantity_limit && <span>· Giới hạn {tier.quantity_limit} suất</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {addOns.length > 0 && (
              <div className="space-y-2 border-t border-line pt-4">
                <h3 className="text-sm font-bold">Add-on mua kèm</h3>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {addOns.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold">{a.title}</div>
                        <div className="text-muted">Tối đa {a.max_per_pledge}/lượt{a.stock != null ? ` · Kho ${a.stock}` : ""}</div>
                      </div>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatVnd(a.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Rủi ro & FAQ */}
          <section className="card space-y-5 p-5 sm:p-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <h2 className="text-base font-extrabold">Rủi ro &amp; phương án dự phòng</h2>
              </div>
              <p className="prose-fv rounded-xl border border-line bg-surface-2/60 p-4 text-sm text-muted">
                {p.risks || "Creator chưa mô tả rủi ro."}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <HelpCircle className="size-4 text-sky-500" />
                <h2 className="text-base font-extrabold">Câu hỏi thường gặp ({faqs.length})</h2>
              </div>
              {faqs.length === 0 ? (
                <p className="text-sm text-muted">Chưa có FAQ nào.</p>
              ) : (
                <div className="space-y-2">
                  {faqs.map((faq) => (
                    <details key={faq.id} className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                      <summary className="cursor-pointer text-sm font-bold">{faq.question}</summary>
                      <p className="mt-2 text-sm text-muted">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* CỘT PHẢI: Kiểm tra tự động, AI, Creator, Lịch sử & Duyệt */}
        <div className="space-y-5">
          {/* Form quyết định duyệt */}
          <ReviewDecisionForm
            projectId={p.id}
            status={p.status}
            willSchedule={data.willSchedule}
            desiredStart={data.desiredStart}
            requiredOk={requiredOk}
          />

          {/* Checklist & Kiểm tra bổ sung */}
          <section className="card space-y-4 p-5">
            <div>
              <h3 className="font-bold">Kiểm tra điều kiện &amp; Từ khoá cấm</h3>
              <p className="text-xs text-muted">Tự động đối chiếu quy tắc BR01–BR02 và từ khoá nhạy cảm</p>
            </div>

            <div className="space-y-2">
              {checklist.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-xs">
                  <span className="flex items-center gap-2">
                    {c.ok ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className={cn("size-4 shrink-0", c.required ? "text-rose-500" : "text-amber-500")} />
                    )}
                    <span className="font-medium">{c.label}</span>
                  </span>
                  <span className="text-[11px] text-muted">{c.required ? "Bắt buộc" : "Khuyến nghị"}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-line pt-3">
              {extraChecks.map((ex) => (
                <div
                  key={ex.key}
                  className={cn(
                    "rounded-xl border p-3 text-xs",
                    ex.ok ? "border-line bg-surface-2/50" : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span className="flex items-center gap-1.5">
                      {ex.ok ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <ShieldAlert className="size-3.5 text-rose-500" />}
                      {ex.label}
                    </span>
                  </div>
                  <div className="mt-1 opacity-85">{ex.detail}</div>
                </div>
              ))}
            </div>
          </section>

          {/* AI dự đoán */}
          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-violet-500" />
                <h3 className="font-bold">Dự đoán AI</h3>
              </div>
              {prediction && (
                <Badge tone={prediction.band === "HIGH" ? "emerald" : prediction.band === "MEDIUM" ? "amber" : "rose"}>
                  {prediction.mode} · {prediction.band}
                </Badge>
              )}
            </div>

            {!prediction ? (
              <p className="text-xs text-muted">Creator chưa chạy mô hình dự đoán AI cho dự án này.</p>
            ) : (
              <>
                <div className="flex flex-col items-center py-1">
                  <Gauge value={Math.round(prediction.probability * 100)} size={170} />
                  {prediction.projected_amount != null && (
                    <div className="mt-2 text-xs text-muted">
                      Dự phóng cuối kỳ: <b className="text-fg">{formatCompactVnd(prediction.projected_amount)}</b>
                    </div>
                  )}
                </div>
                {prediction.factors.length > 0 && (
                  <div className="space-y-2 border-t border-line pt-3">
                    <div className="flex items-center gap-1 text-xs font-bold text-muted">
                      <Sparkles className="size-3.5 text-amber-500" /> Yếu tố ảnh hưởng
                    </div>
                    {prediction.factors.slice(0, 6).map((f) => (
                      <div key={f.key} className="rounded-xl bg-surface-2/70 p-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2 font-bold">
                          <span>{f.label}</span>
                          <span className={f.impact >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {f.impact >= 0 ? `+${f.impact.toFixed(2)}` : f.impact.toFixed(2)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Hồ sơ Creator & dự án trước */}
          <section className="card space-y-4 p-5">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-emerald-500" />
              <h3 className="font-bold">Hồ sơ Creator</h3>
            </div>
            <div className="flex items-center gap-3">
              <SafeAvatar name={creator.display_name} src={creator.avatar_url} size={42} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold">{creator.display_name}</span>
                  <Badge tone={creator.status === "LOCKED" ? "rose" : "emerald"}>{creator.status}</Badge>
                </div>
                <div className="truncate text-xs text-muted">
                  @{creator.username} · {creator.email}
                </div>
                <div className="text-[11px] text-muted">
                  Tuổi tài khoản: {creator.accountAgeDays} ngày{creator.province ? ` · ${creator.province}` : ""}
                </div>
              </div>
            </div>

            {pastProjects.length > 0 && (
              <div className="space-y-2 border-t border-line pt-3">
                <div className="text-xs font-bold text-muted">Dự án khác của Creator ({pastProjects.length})</div>
                {pastProjects.map((pp) => (
                  <Link
                    key={pp.slug}
                    href={`/p/${pp.slug}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-xs transition hover:border-violet-400/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{pp.title}</div>
                      <div className="text-[11px] text-muted">
                        {formatCompactVnd(pp.pledged_amount)} / {formatCompactVnd(pp.goal_amount)}
                      </div>
                    </div>
                    <ProjectStatusBadge status={pp.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Lịch sử duyệt dự án này */}
          {reviews.length > 0 && (
            <section className="card space-y-3 p-5">
              <div className="flex items-center gap-2">
                <History className="size-4 text-indigo-500" />
                <h3 className="font-bold">Lịch sử duyệt dự án này</h3>
              </div>
              <div className="space-y-2">
                {reviews.map((r) => {
                  const meta = REVIEW_DECISION_META[r.decision] ?? { label: r.decision, tone: "neutral" as const };
                  return (
                    <div key={r.id} className="rounded-xl border border-line bg-surface-2/60 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="text-muted">{formatDate(r.created_at, true)}</span>
                      </div>
                      {r.note && <p className="mt-1.5 text-fg/90">{r.note}</p>}
                      <div className="mt-1 text-[11px] text-muted">Người duyệt: {r.reviewer}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
