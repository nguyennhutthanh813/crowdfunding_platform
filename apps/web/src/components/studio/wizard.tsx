"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Eye,
  LayoutDashboard,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { AddOnRow, SectionRow, StudioProject, TierRow } from "@/server/queries/studio";
import type { PredictionResult } from "@/server/services/ai/predict";
import {
  createDraftProjectAction,
  saveFundingScheduleAction,
  submitForReviewAction,
  updateBasicsAction,
} from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { Badge, ProjectStatusBadge } from "@/components/ui/primitives";
import { cn, formatCompactVnd, formatVnd } from "@/lib/utils";
import { COVER_GALLERY, GOAL_CHIPS, WIZARD_STEPS } from "./meta";
import { StudioImage, toVnDatetimeLocal } from "./media";
import { ContentEditor } from "./content-editor";
import { RewardsEditor } from "./rewards-editor";
import { AiPanel } from "./ai-panel";

type CategoryItem = { id: string; name: string; slug: string; image_url: string | null; color: string };
type ChecklistItem = { key: string; label: string; ok: boolean; required: boolean };

const CHECKLIST_STEP: Record<string, number> = {
  title: 1,
  cover: 1,
  video: 1,
  story: 2,
  risks: 2,
  tiers: 3,
  funding: 4,
};

export function WizardShell({
  mode,
  categories,
  initialStep,
  project,
  sections = [],
  tiers = [],
  addOns = [],
  checklist = [],
  prediction = null,
  latestReview = null,
}: {
  mode: "create" | "edit";
  categories: CategoryItem[];
  initialStep: number;
  project?: StudioProject;
  sections?: SectionRow[];
  tiers?: TierRow[];
  addOns?: AddOnRow[];
  checklist?: ChecklistItem[];
  prediction?: PredictionResult | null;
  latestReview?: { decision: string; note: string; created_at: string; reviewer: string } | null;
}) {
  const step = mode === "create" ? 1 : Math.min(5, Math.max(1, initialStep));
  const [title, setTitle] = useState(project?.title ?? "");
  const [blurb, setBlurb] = useState(project?.blurb ?? "");
  const [coverUrl, setCoverUrl] = useState(project?.cover_url ?? COVER_GALLERY[0]);
  const [categoryId, setCategoryId] = useState(project?.category_id ?? categories[0]?.id ?? "");
  const [goalAmount, setGoalAmount] = useState(project?.goal_amount ?? 50_000_000);
  const [durationDays, setDurationDays] = useState(project?.duration_days ?? 30);

  const selectedCat = categories.find((c) => c.id === categoryId) ?? categories[0];
  const requiredMissing = checklist.filter((c) => c.required && !c.ok);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ButtonLink href="/studio" variant="ghost" size="sm">
            <ArrowLeft className="size-4" /> Studio
          </ButtonLink>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {project ? project.title : "Tạo dự án mới"}
              </h1>
              {project && <ProjectStatusBadge status={project.status} />}
            </div>
            <p className="text-xs text-muted">Hướng dẫn 5 bước chuẩn bị chiến dịch &amp; chấm điểm AI trước khi gửi duyệt</p>
          </div>
        </div>

        {project && (
          <div className="flex items-center gap-2">
            <ButtonLink href={`/p/${project.slug}`} variant="outline" size="sm">
              <Eye className="size-4" /> Xem preview
            </ButtonLink>
            <ButtonLink href={`/studio/${project.slug}`} variant="secondary" size="sm">
              <LayoutDashboard className="size-4" /> Studio quản lý
            </ButtonLink>
          </div>
        )}
      </div>

      {/* Rejection Notice */}
      {project?.status === "REJECTED" && latestReview && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" />
          <div>
            <div className="font-bold text-rose-700 dark:text-rose-300">
              Dự án từng bị từ chối bởi {latestReview.reviewer}
            </div>
            <p className="mt-0.5 text-fg">“{latestReview.note}”</p>
            <p className="mt-1 text-xs text-muted">Chỉnh sửa theo góp ý và sang Bước 5 để gửi duyệt lại.</p>
          </div>
        </div>
      )}

      {/* 5-step stepper */}
      <nav aria-label="Các bước thiết lập" className="card p-2">
        <ol className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {WIZARD_STEPS.map((s) => {
            const active = step === s.n;
            const unlocked = mode === "edit";
            const done =
              mode === "edit" &&
              ((s.n === 1 && checklist.find((c) => c.key === "title")?.ok && checklist.find((c) => c.key === "cover")?.ok) ||
                (s.n === 2 && checklist.find((c) => c.key === "story")?.ok && checklist.find((c) => c.key === "risks")?.ok) ||
                (s.n === 3 && checklist.find((c) => c.key === "tiers")?.ok) ||
                (s.n === 4 && checklist.find((c) => c.key === "funding")?.ok));

            const inner = (
              <div
                className={cn(
                  "flex min-w-[150px] flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 transition",
                  active
                    ? "bg-brand-gradient text-white shadow-[0_8px_20px_-8px_rgba(109,74,255,0.75)]"
                    : unlocked
                      ? "hover:bg-surface-2"
                      : "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold",
                    active
                      ? "bg-white/20 text-white"
                      : done
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : "bg-surface-2 text-muted",
                  )}
                >
                  {done && !active ? <Check className="size-4" /> : s.n}
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-xs font-bold sm:text-sm">{s.label}</span>
                  <span className={cn("block truncate text-[11px]", active ? "text-white/80" : "text-muted")}>
                    {s.hint}
                  </span>
                </span>
              </div>
            );

            return (
              <li key={s.n} className="flex-1">
                {unlocked && project ? (
                  <Link href={`/studio/${project.slug}/setup?step=${s.n}`} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div title={s.n > 1 ? "Lưu Bước 1 để mở các bước tiếp theo" : undefined}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ───────── STEP 1: CƠ BẢN ───────── */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <ActionForm
            action={mode === "create" ? createDraftProjectAction : updateBasicsAction}
            className="card space-y-5 p-5 sm:p-6"
          >
            {project && <input type="hidden" name="project_id" value={project.id} />}
            {project && <input type="hidden" name="next_step" value="2" />}
            <input type="hidden" name="cover_url" value={coverUrl} />

            <div>
              <h2 className="text-lg font-bold">Bước 1: Thông tin cơ bản &amp; ảnh bìa</h2>
              <p className="text-sm text-muted">Đặt tên hấp dẫn, chọn thể loại phù hợp và ảnh bìa 3D nổi bật.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên dự án (5–80 ký tự)" required className="sm:col-span-2">
                <Input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  minLength={5}
                  maxLength={80}
                  required
                  placeholder="Ví dụ: Bút Tre Thông Minh – Ghi chú số cho học sinh"
                />
              </Field>

              <Field label="Thể loại" required>
                <Select name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Video giới thiệu (khuyến nghị)" hint="Có video giúp tăng đáng kể điểm AI dự đoán">
                <Input
                  name="video_url"
                  defaultValue={project?.video_url ?? ""}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </Field>
            </div>

            <Field
              label="Mô tả ngắn (blurb)"
              required
              hint={`Tối thiểu 20 ký tự để gửi duyệt · Hiện tại: ${blurb.trim().length}/200`}
            >
              <Textarea
                name="blurb"
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                maxLength={200}
                rows={2}
                required
                placeholder="Tóm tắt trong 1–2 câu điểm độc đáo nhất của sản phẩm…"
              />
            </Field>

            {/* 3D Cover Gallery Picker */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  Chọn ảnh bìa 3D ({COVER_GALLERY.length} mẫu) hoặc nhập URL
                </span>
                <Input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="/v3/projects/... hoặc https://..."
                  className="h-9 sm:w-72"
                />
              </div>

              <div className="grid max-h-64 grid-cols-3 gap-2.5 overflow-y-auto rounded-2xl border border-line bg-surface-2/40 p-2.5 sm:grid-cols-4 md:grid-cols-6">
                {COVER_GALLERY.map((url) => {
                  const selected = coverUrl === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setCoverUrl(url)}
                      className={cn(
                        "group relative aspect-[16/10] overflow-hidden rounded-xl border-2 transition",
                        selected
                          ? "border-violet-500 ring-2 ring-violet-500/35"
                          : "border-transparent hover:border-violet-400/50",
                      )}
                    >
                      <StudioImage src={url} alt="" sizes="140px" />
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-violet-600 text-white shadow">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <SubmitButton size="md" pendingText="Đang lưu…">
                {mode === "create" ? "Tạo bản nháp & sang Bước 2" : "Lưu & sang Bước 2"}
                <ArrowRight className="size-4" />
              </SubmitButton>
            </div>
          </ActionForm>

          {/* Live Card Preview */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Xem trước thẻ dự án</div>
            <div className="card overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden">
                <StudioImage src={coverUrl} alt={title || "Ảnh bìa"} sizes="320px" />
                {selectedCat && (
                  <span
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow"
                    style={{ background: selectedCat.color }}
                  >
                    {selectedCat.name}
                  </span>
                )}
              </div>
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-2 font-bold leading-snug">{title || "Tên dự án của bạn sẽ hiển thị ở đây"}</h3>
                <p className="line-clamp-2 text-sm text-muted">
                  {blurb || "Mô tả ngắn gọn giúp backer hiểu ngay ý tưởng của bạn."}
                </p>
                <div className="pt-2 text-xs text-muted">
                  Mục tiêu dự kiến: <b className="text-fg">{formatCompactVnd(goalAmount)}</b> · {durationDays} ngày
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────── STEP 2: NỘI DUNG & RỦI RO ───────── */}
      {step === 2 && project && (
        <div className="space-y-5">
          <ContentEditor projectId={project.id} sections={sections} risks={project.risks} />
          <div className="flex items-center justify-between">
            <ButtonLink href={`/studio/${project.slug}/setup?step=1`} variant="outline">
              <ArrowLeft className="size-4" /> Quay lại Bước 1
            </ButtonLink>
            <ButtonLink href={`/studio/${project.slug}/setup?step=3`}>
              Tiếp tục: Phần quà <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>
      )}

      {/* ───────── STEP 3: PHẦN QUÀ ───────── */}
      {step === 3 && project && (
        <div className="space-y-5">
          <RewardsEditor projectId={project.id} tiers={tiers} addOns={addOns} />
          <div className="flex items-center justify-between">
            <ButtonLink href={`/studio/${project.slug}/setup?step=2`} variant="outline">
              <ArrowLeft className="size-4" /> Quay lại Bước 2
            </ButtonLink>
            <ButtonLink href={`/studio/${project.slug}/setup?step=4`}>
              Tiếp tục: Mục tiêu &amp; lịch <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>
      )}

      {/* ───────── STEP 4: MỤC TIÊU & LỊCH ───────── */}
      {step === 4 && project && (
        <ActionForm action={saveFundingScheduleAction} className="card space-y-6 p-5 sm:p-6">
          <input type="hidden" name="project_id" value={project.id} />
          <input type="hidden" name="next_step" value="5" />

          <div>
            <h2 className="text-lg font-bold">Bước 4: Mục tiêu gọi vốn, thời lượng &amp; lịch mở</h2>
            <p className="text-sm text-muted">
              All-or-Nothing: chỉ trừ tiền khi đạt 100% mục tiêu. Mục tiêu và thời lượng sẽ khoá sau khi gửi duyệt.
            </p>
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-semibold">Chọn nhanh mục tiêu gọi vốn</span>
            <div className="flex flex-wrap gap-2">
              {GOAL_CHIPS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setGoalAmount(amt)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    goalAmount === amt
                      ? "border-violet-500 bg-violet-500/12 text-violet-700 dark:text-violet-300"
                      : "border-line bg-surface hover:bg-surface-2",
                  )}
                >
                  {formatCompactVnd(amt)}
                </button>
              ))}
            </div>
            <Field label="Số tiền mục tiêu (VND)" required hint={`Hiển thị: ${formatVnd(goalAmount)}`}>
              <Input
                name="goal_amount"
                type="number"
                min={1000000}
                max={2000000000}
                step={500000}
                value={goalAmount}
                onChange={(e) => setGoalAmount(Number(e.target.value) || 0)}
                required
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={`Thời lượng chiến dịch: ${durationDays} ngày`} hint="Tối ưu theo dữ liệu lịch sử: 25–35 ngày (giới hạn 1–60 ngày)">
              <div className="space-y-2 pt-1">
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <Input
                  name="duration_days"
                  type="number"
                  min={1}
                  max={60}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
            </Field>

            <Field
              label="Ngày bắt đầu mong muốn (giờ VN, tuỳ chọn)"
              hint="Để trống nếu muốn mở góp vốn ngay sau khi Quản trị viên duyệt."
            >
              <Input name="start_at" type="datetime-local" defaultValue={toVnDatetimeLocal(project.start_at)} />
            </Field>
          </div>

          <Toggle
            name="is_preview_public"
            defaultChecked={project.is_preview_public === 1}
            label="Mở trang xem trước (Preview) công khai"
            description="Khi dự án ở trạng thái Sắp mở (SCHEDULED), mọi người có thể xem nội dung và nhấn Lưu dự án để nhận thông báo ngày mở."
          />

          <div className="flex items-center justify-between pt-2">
            <ButtonLink href={`/studio/${project.slug}/setup?step=3`} variant="outline">
              <ArrowLeft className="size-4" /> Quay lại Bước 3
            </ButtonLink>
            <SubmitButton pendingText="Đang lưu…">
              Lưu &amp; sang Bước 5 <ArrowRight className="size-4" />
            </SubmitButton>
          </div>
        </ActionForm>
      )}

      {/* ───────── STEP 5: XEM LẠI, AI & GỬI DUYỆT ───────── */}
      {step === 5 && project && (
        <div className="space-y-6">
          {/* Checklist */}
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Kiểm tra điều kiện trước khi gửi duyệt</h2>
                <p className="text-sm text-muted">Hoàn thành tất cả mục bắt buộc để Quản trị viên duyệt nhanh chóng.</p>
              </div>
              <Badge tone={requiredMissing.length === 0 ? "emerald" : "amber"} dot>
                {requiredMissing.length === 0 ? "Đủ điều kiện gửi duyệt" : `Còn thiếu ${requiredMissing.length} mục`}
              </Badge>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {checklist.map((c) => (
                <div
                  key={c.key}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3 text-sm",
                    c.ok
                      ? "border-emerald-500/25 bg-emerald-500/8"
                      : c.required
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-line bg-surface-2/40",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {c.ok ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    ) : (
                      <CircleDashed className={cn("size-5 shrink-0", c.required ? "text-amber-500" : "text-muted")} />
                    )}
                    <span className="font-semibold">
                      {c.label} {!c.required && <span className="text-xs font-normal text-muted">(khuyến nghị)</span>}
                    </span>
                  </div>
                  {!c.ok && (
                    <Link
                      href={`/studio/${project.slug}/setup?step=${CHECKLIST_STEP[c.key] ?? 1}`}
                      className="shrink-0 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400"
                    >
                      Sửa ngay →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pre-launch AI Prediction */}
          <AiPanel
            projectId={project.id}
            canRunAi
            title="AI Chấm điểm trước khi mở chiến dịch"
            prediction={
              prediction
                ? {
                    probability: prediction.probability,
                    band: prediction.band,
                    projectedAmount: prediction.projectedAmount,
                    factors: prediction.factors,
                    suggestions: prediction.suggestions,
                    mode: "PRELAUNCH",
                  }
                : null
            }
          />

          {/* Submit bar */}
          <div className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <ButtonLink href={`/studio/${project.slug}/setup?step=4`} variant="outline">
              <ArrowLeft className="size-4" /> Quay lại Bước 4
            </ButtonLink>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href={`/p/${project.slug}`} variant="secondary">
                <Eye className="size-4" /> Xem preview
              </ButtonLink>

              <ActionForm action={submitForReviewAction}>
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="redirect_to_studio" value="1" />
                <SubmitButton
                  size="lg"
                  disabled={requiredMissing.length > 0}
                  pendingText="Đang gửi duyệt…"
                >
                  <Rocket className="size-4" />
                  <Sparkles className="size-4" /> Gửi duyệt ngay
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
