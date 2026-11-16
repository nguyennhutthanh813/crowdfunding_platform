"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Check,
  CircleDollarSign,
  Eye,
  FileText,
  Gift,
  ImagePlus,
  Info,
  LayoutTemplate,
  LoaderCircle,
  MapPin,
  PackagePlus,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Target,
  Trash2,
  Truck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { Modal } from "@/components/ui/modal";
import type {
  CampaignDraftAddOn,
  CampaignDraftCollaborator,
  CampaignDraftFields,
  CampaignDraftReward,
  CampaignDraftSnapshot,
  CampaignStatus,
} from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { getSampleCoverArt, sampleCoverArt } from "@/lib/campaign/sample-cover-art";
import { formatVnd } from "@/lib/format";
import {
  newCampaignExample,
  newCampaignExampleRewards,
  sampleAddOns,
  sampleCollaborators,
  sampleDraft,
  sampleRewards,
} from "./campaign-wizard-samples";

const wizardSteps = [
  { label: "Cơ bản", mobileLabel: "Cơ bản", icon: LayoutTemplate },
  { label: "Story", mobileLabel: "Story", icon: FileText },
  { label: "Quà tặng", mobileLabel: "Quà tặng", icon: Gift },
  { label: "Giao hàng", mobileLabel: "Giao hàng", icon: Truck },
  { label: "Xem lại", mobileLabel: "Xem lại", icon: Eye },
  { label: "Dự báo AI ✦", mobileLabel: "AI ✦", icon: Sparkles, isAi: true },
];

type DraftReward = CampaignDraftReward;
type DraftCampaign = CampaignDraftFields;
type DraftAddOn = CampaignDraftAddOn;
type DraftCollaborator = CampaignDraftCollaborator;

const inputLabel = "text-xs font-bold text-ink-soft";

const blankDraft: DraftCampaign = {
  title: "",
  blurb: "",
  category: "Công nghệ",
  goal: "",
  duration: "30",
  location: "TP. Hồ Chí Minh",
  story: "",
  risks: "",
  shippingFee: "45000",
  hasVideo: false,
  coverAssetId: "",
};

export function CampaignWizard({
  localDbAvailable,
  prefillSample = false,
  mode = "create",
  campaignId = "",
  campaignSlug,
  initialDraft,
  reviewStatus = "DRAFT",
  reviewFeedback,
}: {
  localDbAvailable: boolean;
  prefillSample?: boolean;
  mode?: "create" | "edit";
  campaignId?: string;
  campaignSlug?: string;
  initialDraft?: CampaignDraftSnapshot;
  reviewStatus?: CampaignStatus;
  reviewFeedback?: string;
}) {
  const router = useRouter();
  const [currentCampaignId, setCurrentCampaignId] = useState(campaignId);
  const locked = reviewStatus !== "DRAFT";
  const savedDraft =
    initialDraft?.campaignId === campaignId ? initialDraft : undefined;
  const useSample = prefillSample && !savedDraft;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(() =>
    savedDraft
      ? localDbAvailable
        ? "Đã mở bản nháp lưu trong SQLite trên máy."
        : "Đã mở bản nháp lưu trong trình duyệt này."
      : "",
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dirtyTick, setDirtyTick] = useState(0);
  const [submittedCampaignId, setSubmittedCampaignId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const savingRef = useRef(false);
  const [draft, setDraft] = useState<DraftCampaign>(() => ({
    ...(useSample ? sampleDraft : blankDraft),
    ...(savedDraft?.draft ?? {}),
  }));
  const selectedCover = getSampleCoverArt(draft.coverAssetId);
  const [rewards, setRewards] = useState<DraftReward[]>(() =>
    savedDraft?.rewards
      ? savedDraft.rewards.map((reward) => ({ ...reward }))
      : useSample
      ? sampleRewards.map((reward) => ({ ...reward }))
      : [{ id: 1, title: "", amount: "", delivery: "", limit: "" }],
  );
  const [addOns, setAddOns] = useState<DraftAddOn[]>(() =>
    savedDraft?.addOns
      ? savedDraft.addOns.map((addOn) => ({ ...addOn }))
      : useSample
        ? sampleAddOns.map((addOn) => ({ ...addOn }))
        : [],
  );
  const [collaborators, setCollaborators] = useState<DraftCollaborator[]>(() =>
    savedDraft?.collaborators
      ? savedDraft.collaborators.map((member) => ({ ...member }))
      : useSample
        ? sampleCollaborators.map((member) => ({ ...member }))
        : [],
  );

  const readiness = useMemo(() => {
    let score = 35;
    if (draft.title.length >= 30 && draft.title.length <= 70) score += 9;
    if (draft.blurb.length >= 60) score += 7;
    if (Number(draft.goal) > 0) score += 7;
    if (Number(draft.duration) >= 15 && Number(draft.duration) <= 60)
      score += 7;
    if (draft.story.length >= 180) score += 9;
    if (draft.risks.length >= 80) score += 7;
    if (draft.hasVideo) score += 4;
    if (rewards.some((reward) => Number(reward.amount) > 0)) score += 6;
    if (addOns.every((addOn) => addOn.title && Number(addOn.amount) > 0))
      score += 4;
    if (Number(draft.shippingFee) >= 0) score += 3;
    if (collaborators.every((member) => member.email.includes("@"))) score += 2;
    return Math.min(100, score);
  }, [addOns, collaborators, draft, rewards]);

  const stepIssues = useMemo(() => {
    const issues: string[] = [];
    if (step === 0) {
      if (draft.title.trim().length < 10) {
        issues.push("Tên chiến dịch cần ít nhất 10 ký tự.");
      }
      if (draft.blurb.trim().length < 30) {
        issues.push("Mô tả ngắn cần ít nhất 30 ký tự để người xem hiểu ý tưởng.");
      }
      if (Number(draft.goal) < 10_000_000) {
        issues.push("Mục tiêu gọi vốn tối thiểu là 10 triệu đồng.");
      }
      if (Number(draft.duration) < 15 || Number(draft.duration) > 60) {
        issues.push("Thời lượng chiến dịch phải từ 15 đến 60 ngày.");
      }
    }
    if (step === 1) {
      if (draft.story.trim().length < 100) {
        issues.push("Câu chuyện cần ít nhất 100 ký tự và nêu được vấn đề, giải pháp.");
      }
      if (draft.risks.trim().length < 50) {
        issues.push("Phần rủi ro cần ít nhất 50 ký tự và có hướng xử lý.");
      }
    }
    if (step === 2) {
      if (!rewards.length) issues.push("Cần có ít nhất một gói ủng hộ.");
      rewards.forEach((reward, index) => {
        if (reward.title.trim().length < 3) {
          issues.push(`Gói #${index + 1} chưa có tên rõ ràng.`);
        }
        if (Number(reward.amount) < 50_000) {
          issues.push(`Mức ủng hộ của gói #${index + 1} phải từ 50.000 đ.`);
        }
        if (Number(reward.limit) < 1) {
          issues.push(`Số lượng của gói #${index + 1} phải lớn hơn 0.`);
        }
        if (!/^\d{2}\/\d{4}$/.test(reward.delivery.trim())) {
          issues.push(`Thời gian giao gói #${index + 1} cần theo dạng MM/YYYY.`);
        }
      });
      addOns.forEach((addOn, index) => {
        if (addOn.title.trim().length < 3 || Number(addOn.amount) < 1) {
          issues.push(`Phần bổ sung #${index + 1} cần đủ tên và giá hợp lệ.`);
        }
      });
    }
    if (step === 3) {
      if (draft.shippingFee.trim() === "" || Number(draft.shippingFee) < 0) {
        issues.push("Phí giao hàng không được để trống hoặc nhỏ hơn 0.");
      }
      collaborators.forEach((member, index) => {
        if (member.name.trim().length < 2 || member.name.trim().length > 80) {
          issues.push(`Tên người dự kiến mời #${index + 1} cần từ 2 đến 80 ký tự.`);
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim())) {
          issues.push(`Email cộng tác viên #${index + 1} chưa đúng định dạng.`);
        }
      });
      if (new Set(collaborators.map((member) => member.email.trim().toLowerCase())).size !== collaborators.length) {
        issues.push("Mỗi người chỉ cần ghi một lần theo email.");
      }
    }
    if ((step === 4 || step === 5) && readiness < 70) {
      issues.push("Bản nháp cần đạt ít nhất 70/100 trước khi gửi xét duyệt.");
    }
    return issues;
  }, [addOns, collaborators, draft, readiness, rewards, step]);
  const canContinue = stepIssues.length === 0;
  const showStepErrors = attemptedStep === step && !canContinue;

  const aiForecast = useMemo(() => {
    const goalMillions = Math.max(10, Math.round(Number(draft.goal) / 1_000_000) || 100);
    const goalFactor = goalMillions <= 180 ? 12 : goalMillions <= 350 ? 6 : -8;
    const durationNum = Number(draft.duration) || 30;
    const durationFactor = durationNum >= 25 && durationNum <= 45 ? 8 : 2;
    const storyFactor = draft.story.trim().length >= 220 && draft.risks.trim().length >= 80 ? 14 : draft.story.trim().length >= 100 ? 6 : -6;
    const rewardFactor = rewards.length >= 2 ? 10 : rewards.length === 1 ? 4 : -8;
    const videoFactor = draft.hasVideo ? 8 : 0;
    const baseScore = Math.round(readiness * 0.45 + 22 + goalFactor + durationFactor + storyFactor + rewardFactor + videoFactor);
    const probability = Math.max(28, Math.min(94, baseScore));
    const band = probability >= 72 ? "Khả quan cao" : probability >= 55 ? "Cần tối ưu thêm" : "Rủi ro cao";
    const shapFactors = [
      {
        label: "Câu chuyện & minh bạch rủi ro",
        impact: storyFactor,
        detail: storyFactor >= 10 ? "Story đầy đủ vấn đề, giải pháp và phương án dự phòng." : "Bổ sung thêm chi tiết kế hoạch dùng vốn và rủi ro.",
      },
      {
        label: "Mức mục tiêu & thời lượng",
        impact: goalFactor + durationFactor,
        detail: `${formatVnd(Number(draft.goal) || 0, true)} trong ${durationNum} ngày phù hợp nhóm ngành ${draft.category}.`,
      },
      {
        label: "Cấu trúc gói quà & video giới thiệu",
        impact: rewardFactor + videoFactor,
        detail: `${rewards.length} gói quà${draft.hasVideo ? ", đã có video giới thiệu" : " — thêm video giúp tăng ~8% chuyển đổi"}.`,
      },
    ];
    return { probability, band, shapFactors };
  }, [draft, readiness, rewards.length]);

  const goNext = () => {
    if (!canContinue) {
      setAttemptedStep(step);
      return;
    }
    setAttemptedStep(null);
    setStep((value) => Math.min(wizardSteps.length - 1, value + 1));
  };

  const markDirty = () => setDirtyTick((tick) => tick + 1);

  const updateDraft = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    markDirty();
  };
  const appendStorySection = (heading: string, template: string) => {
    setDraft((current) => {
      const separator = current.story.trim() ? "\n\n" : "";
      return { ...current, story: `${current.story}${separator}## ${heading}\n${template}` };
    });
    markDirty();
  };
  const appendRiskTemplate = () => {
    setDraft((current) => {
      const snippet =
        "Nếu linh kiện sản xuất đến chậm hơn dự kiến 7-10 ngày, nhóm có sẵn hai nhà cung cấp dự phòng trong nước và cam kết cập nhật tiến độ hàng tuần cho toàn bộ người ủng hộ.";
      if (current.risks.includes("nhà cung cấp dự phòng")) return current;
      const separator = current.risks.trim() ? "\n\n" : "";
      return { ...current, risks: `${current.risks}${separator}${snippet}` };
    });
    markDirty();
  };
  const loadSampleData = () => {
    setDraft({ ...newCampaignExample });
    setRewards(newCampaignExampleRewards.map((reward) => ({ ...reward })));
    setAddOns([]);
    setCollaborators([]);
    setSaveFailed(false);
    setSaveNotice("Đã điền ví dụ Bếp Mây vào hồ sơ. Nhấn Lưu bản nháp hoặc tiếp tục chỉnh sửa.");
    markDirty();
  };
  const updateReward = (id: number, key: keyof DraftReward, value: string) => {
    setRewards((current) =>
      current.map((reward) =>
        reward.id === id ? { ...reward, [key]: value } : reward,
      ),
    );
    markDirty();
  };
  const moveReward = (index: number, delta: -1 | 1) => {
    setRewards((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(target, 0, moved);
      return next;
    });
    markDirty();
  };
  const updateAddOn = (id: number, key: keyof DraftAddOn, value: string) => {
    setAddOns((current) =>
      current.map((addOn) =>
        addOn.id === id ? { ...addOn, [key]: value } : addOn,
      ),
    );
    markDirty();
  };
  const updateCollaborator = <K extends keyof DraftCollaborator>(
    id: number,
    key: K,
    value: DraftCollaborator[K],
  ) => {
    setCollaborators((current) =>
      current.map((member) =>
        member.id === id ? { ...member, [key]: value } : member,
      ),
    );
    markDirty();
  };
  const persistDraft = async () => {
    if (mode === "create") {
      const result = await clientRequest<{ data: { campaignId: string } }>(
        "/api/v1/creator/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            action: currentCampaignId ? "SAVE" : "CREATE",
            campaignId: currentCampaignId,
            draft,
            rewards,
            addOns,
            collaborators,
          }),
        },
      );
      if (!currentCampaignId) {
        setCurrentCampaignId(result.data.campaignId);
        router.replace(`/creator/campaigns/new?draft=${result.data.campaignId}`);
      }
      return result.data.campaignId;
    }
    await clientRequest("/api/v1/creator/operations", {
      method: "POST",
      body: JSON.stringify({
        action: "SAVE_DRAFT",
        payload: { campaignId, draft, rewards, addOns, collaborators },
      }),
    });
    return campaignId;
  };
  const persistDraftRef = useRef(persistDraft);
  const readyForAutoSaveRef = useRef(false);
  useEffect(() => {
    persistDraftRef.current = persistDraft;
    readyForAutoSaveRef.current =
      mode === "edit" ||
      Boolean(currentCampaignId) ||
      (draft.title.trim().length >= 10 && Number(draft.goal) >= 10_000_000);
  });

  useEffect(() => {
    if (dirtyTick === 0 || locked || submittedCampaignId) return;
    const timer = window.setTimeout(async () => {
      if (savingRef.current || !readyForAutoSaveRef.current) return;
      savingRef.current = true;
      setSaveNotice("Đang tự động lưu...");
      try {
        await persistDraftRef.current();
        setSaveFailed(false);
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        setSaveNotice(`Đã tự động lưu lúc ${hh}:${mm}`);
      } catch {
        setSaveNotice("Chờ hoàn tất trường bắt buộc để tự động lưu");
      } finally {
        savingRef.current = false;
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [dirtyTick, locked, submittedCampaignId]);

  const saveDraft = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveNotice("");
    setSaveFailed(false);
    try {
      await persistDraft();
      router.refresh();
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setSaveNotice(
        localDbAvailable
          ? `Đã lưu bản nháp lúc ${hh}:${mm}`
          : `Đã lưu cục bộ lúc ${hh}:${mm}`,
      );
    } catch (error) {
      setSaveFailed(true);
      setSaveNotice(clientRequestMessage(error, "Chưa thể lưu bản nháp"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const submit = async () => {
    if (!canContinue) {
      setAttemptedStep(step);
      setConfirmOpen(false);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const savedId = await persistDraft();
      if (mode === "create") {
        await clientRequest("/api/v1/creator/campaigns", {
          method: "POST",
          body: JSON.stringify({ action: "SUBMIT", campaignId: savedId }),
        });
      } else {
        await clientRequest("/api/v1/creator/operations", {
          method: "POST",
          body: JSON.stringify({
            action: "SUBMIT_REVIEW",
            payload: {
              campaignId,
              title: draft.title.trim(),
              category: draft.category,
              rewardCount: rewards.length,
              addOnCount: addOns.length,
              readiness,
            },
          }),
        });
      }
      setConfirmOpen(false);
      setSaving(false);
      setSubmittedCampaignId(savedId);
      router.refresh();
    } catch (error) {
      setConfirmOpen(false);
      setSaving(false);
      setSubmitError(clientRequestMessage(error, "Chưa thể gửi chiến dịch. Bạn vui lòng thử lại."));
    }
  };

  if (submittedCampaignId) {
    const reviewHref = mode === "create"
      ? `/creator/campaigns/${submittedCampaignId}/manage#tien-do-xet-duyet`
      : campaignSlug
        ? `/creator/campaigns/${campaignSlug}/manage?tab=review`
        : "/creator";
    return (
      <section className="min-h-[75vh] bg-[var(--canvas)] py-16">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl rounded-[20px] border border-emerald-200 bg-white p-8 text-center shadow-[var(--shadow-card)] sm:p-12">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <BadgeCheck className="size-8" />
            </span>
            <p className="eyebrow mt-6 text-emerald-700">Đã gửi xét duyệt</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
              {mode === "edit"
                ? "Phiên bản mới đã vào hàng chờ."
                : "Bản nháp của bạn đã vào hàng chờ."}
            </h1>
            <p className="mt-4 text-sm leading-7 text-ink-soft">
              Quản trị viên sẽ đọc nội dung, gói ủng hộ, rủi ro và phương án giao
              hàng đã khai báo. Phản hồi sẽ hiện trong hồ sơ này.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={reviewHref} className="button-dark">
                {reviewHref === "/creator" ? "Xem danh sách chiến dịch" : "Xem tiến độ xét duyệt"}
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/creator" className="button-secondary">
                Về danh sách chiến dịch
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const checklist: Array<{ label: string; ok: boolean; optional?: boolean }> = [
    {
      label: "Thông tin, mục tiêu và thời lượng hợp lệ",
      ok: Boolean(draft.title && draft.blurb && Number(draft.goal) > 0),
    },
    {
      label: "Có câu chuyện cùng phần rủi ro và thách thức",
      ok: draft.story.length > 100 && draft.risks.length > 50,
    },
    {
      label: "Ít nhất một gói ủng hộ hợp lệ",
      ok: rewards.some((reward) => Number(reward.amount) > 0),
    },
    {
      label: "Phần bổ sung và phí giao hàng có giá hợp lệ",
      ok:
        addOns.every((item) => Number(item.amount) > 0) &&
        Number(draft.shippingFee) >= 0,
    },
    { label: "Đã khai báo video giới thiệu (không bắt buộc)", ok: draft.hasVideo, optional: true },
  ];
  const canLoadSample =
    !prefillSample &&
    !draft.title.trim() &&
    rewards.every((reward) => !reward.title.trim() && !reward.amount);
  const storyWordCount = draft.story.trim()
    ? draft.story.trim().split(/\s+/).length
    : 0;
  const previewVisual = {
    "Công nghệ": { motif: "light" as const, palette: "indigo" as const },
    "Trò chơi": { motif: "game" as const, palette: "indigo" as const },
    "Thiết kế": { motif: "light" as const, palette: "sun" as const },
    "Âm nhạc": { motif: "music" as const, palette: "rose" as const },
    "Đời sống xanh": { motif: "eco" as const, palette: "mint" as const },
    "Xuất bản": { motif: "light" as const, palette: "sun" as const },
    "Ẩm thực": { motif: "coffee" as const, palette: "ember" as const },
    "Nghệ thuật": { motif: "light" as const, palette: "rose" as const },
  }[draft.category] ?? { motif: "light" as const, palette: "mint" as const };

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="sticky top-0 z-30 border-b border-line bg-surface/95 py-3.5 backdrop-blur-md sm:py-4">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <Link
                  href={
                    campaignSlug
                      ? `/creator/campaigns/${campaignSlug}/manage`
                      : "/creator"
                  }
                  className="inline-flex items-center gap-1.5 font-bold text-ink-muted hover:text-[#047857]"
                >
                  <ArrowLeft className="size-3.5" />
                  Thoát
                </Link>
                <span className="text-ink-muted">/</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-[#047857]">
                  Studio khởi tạo · Bước {step + 1}/6
                </span>
              </div>
              <h1 className="mt-1.5 truncate font-display text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-[26px]">
                {mode === "edit"
                  ? "Chỉnh sửa ORBIT Mini"
                  : currentCampaignId
                    ? "Hồ sơ chiến dịch của bạn"
                    : "Tạo chiến dịch mới"}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-canvas-soft px-3 text-xs text-ink-soft"
                role={saveFailed ? "alert" : "status"}
              >
                <span
                  className={`size-2 rounded-full ${saveFailed ? "bg-rose-500" : "bg-emerald-500"}`}
                />
                {saveNotice || (locked ? "Hồ sơ đang khóa chỉnh sửa" : "Tự động lưu sau 3s")}
              </span>
              {canLoadSample ? (
                <button
                  type="button"
                  onClick={loadSampleData}
                  aria-label="Điền thử ví dụ Bếp Mây"
                  className="button-secondary min-h-10 justify-center px-3 text-xs"
                >
                  <FileText className="size-3.5" />
                  <span>Điền mẫu Bếp Mây</span>
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving || locked}
                onClick={() => void saveDraft()}
                className="button-dark min-h-10 justify-center px-3.5 text-xs"
              >
                {saving ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}{" "}
                Lưu bản nháp
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-shell py-5 sm:py-7">
        <ol
          className="mb-4 grid grid-cols-6 gap-1.5 lg:hidden"
          aria-label="Các bước tạo chiến dịch"
        >
          {wizardSteps.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const done = index < step;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  disabled={index > step && !locked && readiness < 35}
                  onClick={() => {
                    setAttemptedStep(null);
                    setStep(index);
                  }}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Bước ${index + 1}: ${item.label}`}
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-[11px] font-bold transition ${
                    active
                      ? item.isAi
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-[#059669] bg-emerald-50 text-[#047857]"
                      : done
                        ? "border-emerald-200 bg-emerald-600 text-white"
                        : "border-line bg-surface text-ink-muted"
                  }`}
                >
                  {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  <span className="truncate">{item.mobileLabel}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block">
            <nav
              aria-label="Danh sách 6 bước tạo chiến dịch"
              className="rounded-[20px] border border-line bg-surface p-3 shadow-card"
            >
              <p className="px-2.5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Lộ trình Studio
              </p>
              <ol className="space-y-1">
                {wizardSteps.map((item, index) => {
                  const Icon = item.icon;
                  const active = index === step;
                  const done = index < step;
                  const lockedStep = index > step && !locked && !canContinue && index > step + 1;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        disabled={lockedStep}
                        onClick={() => {
                          setAttemptedStep(null);
                          setStep(index);
                        }}
                        aria-current={active ? "step" : undefined}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                          active
                            ? item.isAi
                              ? "bg-violet-50 text-violet-700 ring-1 ring-violet-300"
                              : "bg-emerald-50 text-[#047857] ring-1 ring-emerald-300"
                            : done
                              ? "text-ink hover:bg-canvas-soft"
                              : "text-ink-muted hover:bg-canvas-soft hover:text-ink"
                        } disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                            active
                              ? item.isAi
                                ? "bg-violet-600 text-white"
                                : "bg-[#059669] text-white"
                              : done
                                ? "bg-emerald-100 text-[#047857]"
                                : "bg-canvas-soft text-ink-muted"
                          }`}
                        >
                          {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                        </span>
                        <span className="flex-1 truncate">
                          {index + 1}. {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="rounded-[20px] border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#047857]">
                  <BadgeCheck className="size-4" /> Hoàn thiện
                </p>
                <span className="font-display text-lg font-extrabold tabular-nums text-ink">
                  {readiness}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas-soft">
                <div
                  className="h-full rounded-full bg-[#059669] transition-[width] duration-500"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2 text-[11px] text-ink-soft">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-2 leading-4">
                    <span
                      className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        item.ok
                          ? "bg-emerald-100 text-[#047857]"
                          : item.optional
                            ? "bg-canvas-soft text-ink-muted"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.ok ? <Check className="size-2.5" /> : item.optional ? "–" : "!"}
                    </span>
                    <span className={item.ok ? "text-ink" : "text-ink-muted"}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[20px] border border-line bg-surface p-4 text-xs leading-5 text-ink-soft shadow-card">
              <p className="inline-flex items-center gap-1.5 font-bold text-ink">
                <Info className="size-3.5 text-[#047857]" /> Gợi ý bước {step + 1}
              </p>
              <p className="mt-2 flex items-start gap-2">
                <Target className="mt-0.5 size-3.5 shrink-0 text-[#047857]" />
                <span>
                  {Number(draft.goal) > 0
                    ? `Mục tiêu: ${formatVnd(Number(draft.goal), true)}`
                    : "Đặt mục tiêu dựa trên chi phí sản xuất & vận hành thực tế."}
                </span>
              </p>
              <p className="mt-1.5 flex items-start gap-2">
                <CircleDollarSign className="mt-0.5 size-3.5 shrink-0 text-[#047857]" />
                <span>Thời lượng 15–60 ngày; hỗ trợ giao hàng toàn quốc.</span>
              </p>
              <p className="mt-1.5 flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#047857]" />
                <span>Địa điểm triển khai: {draft.location || "Chưa chọn"}</span>
              </p>
            </div>
          </aside>

          <fieldset disabled={locked} className="min-w-0 rounded-[20px] border border-line bg-surface p-5 shadow-card sm:p-8">
            {locked ? (
              <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-slate-900">
                <strong>
                  {reviewStatus === "IN_REVIEW"
                    ? "Đang chờ quản trị viên duyệt"
                    : reviewStatus === "LIVE"
                      ? "Chiến dịch đang gọi vốn"
                      : "Hồ sơ đã duyệt"}
                  .
                </strong>{" "}
                {reviewFeedback ||
                  (reviewStatus === "PRE_LAUNCH"
                    ? "Bạn có thể xem trang cộng đồng trước khi mở gọi vốn."
                    : "Bạn có thể xem lại các bước, nhưng chưa thể sửa lúc này.")}
                {mode === "create" && currentCampaignId ? <Link className="ml-2 font-bold underline" href={`/creator/campaigns/${currentCampaignId}/manage`}>Xem tiến độ hồ sơ</Link> : null}
              </div>
            ) : reviewFeedback ? (
              <p role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                Góp ý từ quản trị viên: {reviewFeedback}
              </p>
            ) : null}
            {step === 0 ? (
              <div>
                <p className="eyebrow text-coral">Thông tin cơ bản</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Thông tin chính của chiến dịch
                </h2>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className={inputLabel}>Tên chiến dịch</span>
                    <input
                      name="campaign-title"
                      className="input-field mt-2"
                      value={draft.title}
                      onChange={(event) =>
                        updateDraft("title", event.target.value)
                      }
                      maxLength={90}
                      required
                      aria-invalid={
                        showStepErrors && draft.title.trim().length < 10
                      }
                      aria-describedby={
                        showStepErrors ? "campaign-step-errors" : undefined
                      }
                    />
                    <span className="mt-1 block text-right text-[11px] text-ink-muted">
                      {draft.title.length}/90
                    </span>
                  </label>
                  <label className="sm:col-span-2">
                    <span className={inputLabel}>Mô tả ngắn</span>
                    <textarea
                      name="campaign-blurb"
                      className="input-field mt-2 min-h-24 resize-y"
                      value={draft.blurb}
                      onChange={(event) =>
                        updateDraft("blurb", event.target.value)
                      }
                      maxLength={180}
                      required
                      aria-invalid={
                        showStepErrors && draft.blurb.trim().length < 30
                      }
                      aria-describedby={
                        showStepErrors ? "campaign-step-errors" : undefined
                      }
                    />
                    <span className="mt-1 block text-right text-[11px] text-ink-muted">
                      {draft.blurb.length}/180
                    </span>
                  </label>
                  <label>
                    <span className={inputLabel}>Danh mục</span>
                    <select
                      name="campaign-category"
                      className="input-field mt-2 cursor-pointer"
                      value={draft.category}
                      onChange={(event) =>
                        updateDraft("category", event.target.value)
                      }
                    >
                      <option>Công nghệ</option>
                      <option>Thiết kế</option>
                      <option>Trò chơi</option>
                      <option>Âm nhạc</option>
                      <option>Đời sống xanh</option>
                    </select>
                  </label>
                  <label>
                    <span className={inputLabel}>Địa điểm</span>
                    <select
                      name="campaign-location"
                      className="input-field mt-2 cursor-pointer"
                      value={draft.location}
                      onChange={(event) =>
                        updateDraft("location", event.target.value)
                      }
                    >
                      <option>TP. Hồ Chí Minh</option>
                      <option>Hà Nội</option>
                      <option>Đà Nẵng</option>
                      <option>Cần Thơ</option>
                    </select>
                  </label>
                  <label>
                    <span className={inputLabel}>Mục tiêu gọi vốn (đ)</span>
                    <input
                      name="funding-goal"
                      type="number"
                      min="10000000"
                      className="input-field mt-2"
                      value={draft.goal}
                      onChange={(event) =>
                        updateDraft("goal", event.target.value)
                      }
                      required
                      aria-invalid={
                        showStepErrors && Number(draft.goal) < 10_000_000
                      }
                      aria-describedby={
                        showStepErrors ? "campaign-step-errors" : undefined
                      }
                    />
                  </label>
                  <label>
                    <span className={inputLabel}>Thời lượng (15–60 ngày)</span>
                    <input
                      name="funding-duration"
                      type="number"
                      min="15"
                      max="60"
                      className="input-field mt-2"
                      value={draft.duration}
                      onChange={(event) =>
                        updateDraft("duration", event.target.value)
                      }
                      required
                      aria-invalid={
                        showStepErrors &&
                        (Number(draft.duration) < 15 ||
                          Number(draft.duration) > 60)
                      }
                      aria-describedby={
                        showStepErrors ? "campaign-step-errors" : undefined
                      }
                    />
                  </label>
                </div>
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f3f6e7] p-4 text-xs leading-5 text-[#53622f]">
                  <Info className="mt-0.5 size-4 shrink-0" /> Mục tiêu và thời
                  lượng là hai dữ liệu đầu vào quan trọng. Nên tính theo chi phí
                  thực tế thay vì cố đẩy điểm dự báo lên cao.
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <p className="eyebrow text-[#047857]">Câu chuyện & media</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
                  Cho cộng đồng thấy kế hoạch thật
                </h2>
                <div className="mt-7 space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={inputLabel}>Câu chuyện dự án</span>
                      <div
                        role="toolbar"
                        aria-label="Chèn nhanh cấu trúc Story"
                        className="flex flex-wrap gap-1.5"
                      >
                        {[
                          { label: "+ Vấn đề", heading: "Vấn đề thực tế", body: "Mô tả nỗi đau hiện tại mà người dùng gặp phải mỗi ngày." },
                          { label: "+ Giải pháp", heading: "Giải pháp của nhóm", body: "Sản phẩm giải quyết vấn đề ra sao và điểm khác biệt cốt lõi." },
                          { label: "+ Lộ trình", heading: "Lộ trình sản xuất", body: "Mốc thử nghiệm mẫu, sản xuất hàng loạt và giao hàng dự kiến." },
                          { label: "+ Kêu gọi", heading: "Vì sao cần bạn lúc này", body: "Nguồn vốn cộng đồng sẽ được phân bổ minh bạch theo từng hạng mục." },
                        ].map((snippet) => (
                          <button
                            key={snippet.heading}
                            type="button"
                            onClick={() => appendStorySection(snippet.heading, snippet.body)}
                            className="rounded-lg border border-line bg-canvas-soft px-2.5 py-1 text-[11px] font-bold text-ink-soft transition hover:border-[#059669] hover:text-[#047857]"
                          >
                            {snippet.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block">
                      <span className="sr-only">Nội dung câu chuyện dự án</span>
                      <textarea
                        name="project-story"
                        className="input-field mt-2 min-h-56 resize-y leading-7"
                        value={draft.story}
                        onChange={(event) =>
                          updateDraft("story", event.target.value)
                        }
                        required
                        aria-invalid={
                          showStepErrors && draft.story.trim().length < 100
                        }
                        aria-describedby={
                          showStepErrors ? "campaign-step-errors" : undefined
                        }
                      />
                    </label>
                    <span className="mt-1 block text-[11px] text-ink-muted">
                      {storyWordCount} từ · nên có vấn đề, giải pháp, bản mẫu và
                      kế hoạch dùng vốn.
                    </span>
                  </div>
                  <div>
                    <label className="block">
                      <span className={inputLabel}>Rủi ro và thách thức</span>
                      <textarea
                        name="project-risks"
                        className="input-field mt-2 min-h-32 resize-y leading-7"
                        value={draft.risks}
                        onChange={(event) =>
                          updateDraft("risks", event.target.value)
                        }
                        required
                        aria-invalid={
                          showStepErrors && draft.risks.trim().length < 50
                        }
                        aria-describedby={
                          showStepErrors ? "campaign-step-errors" : undefined
                        }
                      />
                    </label>
                    {!draft.risks.includes("nhà cung cấp dự phòng") && draft.risks.trim().length < 180 ? (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] px-3.5 py-2.5 text-xs text-slate-800">
                        <p className="flex items-center gap-2 font-medium">
                          <span className="font-bold text-[#7C3AED]">✦ Gợi ý AI:</span>
                          <span>Nên nêu rõ phương án dự phòng linh kiện và cam kết cập nhật tiến độ khi chậm trễ.</span>
                        </p>
                        <button
                          type="button"
                          onClick={appendRiskTemplate}
                          className="rounded-lg border border-[#7C3AED]/30 bg-white px-2.5 py-1 text-[11px] font-bold text-[#7C3AED] transition hover:bg-[#7C3AED] hover:text-white"
                        >
                          Thêm mẫu chuẩn
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div role="group" aria-label="Ảnh minh họa cho chiến dịch">
                    <p className={inputLabel}>Ảnh minh họa (không bắt buộc)</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <button type="button" aria-pressed={!draft.coverAssetId}
                        onClick={() => updateDraft("coverAssetId", "")}
                        className={`rounded-2xl border p-3 text-left ${!draft.coverAssetId ? "border-[#059669] bg-emerald-50/70" : "border-line bg-surface hover:border-[#059669]/40"}`}>
                        <span className="flex aspect-[16/9] items-center justify-center rounded-xl bg-canvas-soft text-[#047857]"><ImagePlus className="size-8" /></span>
                        <span className="mt-3 block text-sm font-bold text-ink">Chưa có ảnh</span>
                        <span className="mt-1 block text-xs leading-5 text-ink-muted">Trang dự án dùng nền theo lĩnh vực, không mượn ảnh sản phẩm khác.</span>
                      </button>
                      <button type="button" aria-pressed={draft.coverAssetId === sampleCoverArt.id}
                        onClick={() => updateDraft("coverAssetId", sampleCoverArt.id)}
                        className={`rounded-2xl border p-3 text-left ${draft.coverAssetId === sampleCoverArt.id ? "border-[#059669] bg-emerald-50/70" : "border-line bg-surface hover:border-[#059669]/40"}`}>
                        <CampaignVisual motif="eco" palette="mint" label="Bếp Mây" imageSrc={sampleCoverArt.src}
                          imageAlt={sampleCoverArt.alt} imageNote={sampleCoverArt.note} compact className="aspect-[16/9] rounded-xl" />
                        <span className="mt-3 block text-sm font-bold text-ink">Ảnh bìa Bếp Mây</span>
                        <span className="mt-1 block text-xs leading-5 text-ink-muted">Chọn khi nội dung phù hợp với hình minh họa sản phẩm này.</span>
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-ink-muted">Ảnh bìa rõ nét giúp tăng tỷ lệ nhấp xem dự án trên trang Khám phá.</p>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-[#047857] text-white">
                        <ImagePlus className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">Video giới thiệu</p>
                        <p className="mt-1 text-[11px] text-ink-muted">
                          Đánh dấu nếu bạn đã chuẩn bị video giới thiệu cho trang chiến dịch.
                        </p>
                      </div>
                    </div>
                    <input
                      name="has-intro-video"
                      type="checkbox"
                      checked={draft.hasVideo}
                      onChange={(event) =>
                        updateDraft("hasVideo", event.target.checked)
                      }
                      className="size-5 accent-[#059669]"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="eyebrow text-coral">Các gói ủng hộ</p>
                    <h2 className="mt-2 font-display text-2xl font-extrabold">
                      Quà rõ ràng, phần bổ sung tách riêng
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRewards((current) => [
                        ...current,
                        {
                          id: Date.now(),
                          title: "Gói mới",
                          amount: "",
                          delivery: "",
                          limit: "",
                        },
                      ])
                    }
                    className="button-secondary"
                  >
                    <Plus className="size-4" /> Thêm gói ủng hộ
                  </button>
                </div>
                <div className="mt-7 space-y-4">
                  {rewards.map((reward, index) => (
                    <div
                      key={reward.id}
                      className="rounded-[16px] border border-line bg-[#faf9f5] p-5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-extrabold text-ink">
                          Gói #{index + 1}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveReward(index, -1)}
                            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition hover:border-[#059669] hover:text-[#047857] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Đưa gói ủng hộ ${index + 1} lên trên`}
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === rewards.length - 1}
                            onClick={() => moveReward(index, 1)}
                            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition hover:border-[#059669] hover:text-[#047857] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Đưa gói ủng hộ ${index + 1} xuống dưới`}
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={rewards.length <= 1}
                            onClick={() => {
                              setRewards((current) =>
                                current.filter((item) => item.id !== reward.id),
                              );
                              markDirty();
                            }}
                            className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Xóa gói ủng hộ ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="sm:col-span-2">
                          <span className={inputLabel}>Tên gói ủng hộ</span>
                          <input
                            name={`reward-title-${reward.id}`}
                            className="input-field mt-2"
                            value={reward.title}
                            onChange={(event) =>
                              updateReward(
                                reward.id,
                                "title",
                                event.target.value,
                              )
                            }
                            required
                            aria-invalid={
                              showStepErrors && reward.title.trim().length < 3
                            }
                            aria-describedby={
                              showStepErrors ? "campaign-step-errors" : undefined
                            }
                          />
                        </label>
                        <label>
                          <span className={inputLabel}>Mức ủng hộ (đ)</span>
                          <input
                            name={`reward-amount-${reward.id}`}
                            type="number"
                            className="input-field mt-2"
                            value={reward.amount}
                            onChange={(event) =>
                              updateReward(
                                reward.id,
                                "amount",
                                event.target.value,
                              )
                            }
                            min="50000"
                            required
                            aria-invalid={
                              showStepErrors && Number(reward.amount) < 50_000
                            }
                            aria-describedby={
                              showStepErrors ? "campaign-step-errors" : undefined
                            }
                          />
                        </label>
                        <label>
                          <span className={inputLabel}>Số lượng giới hạn</span>
                          <input
                            name={`reward-limit-${reward.id}`}
                            type="number"
                            className="input-field mt-2"
                            value={reward.limit}
                            onChange={(event) =>
                              updateReward(
                                reward.id,
                                "limit",
                                event.target.value,
                              )
                            }
                            min="1"
                            required
                            aria-invalid={
                              showStepErrors && Number(reward.limit) < 1
                            }
                            aria-describedby={
                              showStepErrors ? "campaign-step-errors" : undefined
                            }
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className={inputLabel}>Giao dự kiến</span>
                          <input
                            name={`reward-delivery-${reward.id}`}
                            className="input-field mt-2"
                            value={reward.delivery}
                            onChange={(event) =>
                              updateReward(
                                reward.id,
                                "delivery",
                                event.target.value,
                              )
                            }
                            placeholder="01/2027"
                            required
                            aria-invalid={
                              showStepErrors &&
                              !/^\d{2}\/\d{4}$/.test(reward.delivery.trim())
                            }
                            aria-describedby={
                              showStepErrors ? "campaign-step-errors" : undefined
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-line pt-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="eyebrow text-coral">
                        <PackagePlus className="size-4" /> Phần bổ sung
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        Người ủng hộ có thể chọn nhiều phần bổ sung trong bước
                        cam kết.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAddOns((current) => [
                          ...current,
                          {
                            id: Date.now(),
                            title: "Phần bổ sung mới",
                            amount: "",
                          },
                        ])
                      }
                      className="button-ghost min-h-11 px-3 text-xs"
                    >
                      <Plus className="size-3.5" /> Thêm
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {addOns.map((addOn) => (
                      <div
                        key={addOn.id}
                        className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
                      >
                        <label>
                          <span className={inputLabel}>Tên phần bổ sung</span>
                          <input
                            name={`add-on-title-${addOn.id}`}
                            className="input-field mt-2"
                            value={addOn.title}
                            onChange={(event) =>
                              updateAddOn(addOn.id, "title", event.target.value)
                            }
                            required
                            aria-invalid={
                              showStepErrors && addOn.title.trim().length < 3
                            }
                            aria-describedby={
                              showStepErrors ? "campaign-step-errors" : undefined
                            }
                          />
                        </label>
                        <label>
                          <span className={inputLabel}>Giá (đ)</span>
                          <input
                            name={`add-on-amount-${addOn.id}`}
                            type="number"
                            className="input-field mt-2"
                            value={addOn.amount}
                            onChange={(event) =>
                              updateAddOn(
                                addOn.id,
                                "amount",
                                event.target.value,
                              )
                            }
                            min="1"
                            required
                            aria-invalid={
                              showStepErrors && Number(addOn.amount) < 1
                            }
                            aria-describedby={
                              showStepErrors ? "campaign-step-errors" : undefined
                            }
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setAddOns((current) =>
                              current.filter((item) => item.id !== addOn.id),
                            )
                          }
                          className="grid size-11 place-items-center rounded-xl text-ink-muted hover:bg-red-50 hover:text-red-600"
                          aria-label={`Xóa ${addOn.title}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <p className="eyebrow text-coral">Giao hàng & cộng tác viên</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Chuẩn bị giao hàng và phân quyền
                </h2>
                <div className="mt-7 grid gap-4 rounded-[16px] border border-line bg-[#faf9f5] p-5 sm:grid-cols-2">
                  <label>
                    <span className={inputLabel}>Khu vực giao</span>
                    <div className="input-field mt-2 flex items-center gap-2 bg-white">
                      <MapPin className="size-4 text-coral" /> Việt Nam
                    </div>
                  </label>
                  <label>
                    <span className={inputLabel}>Phí giao tiêu chuẩn (đ)</span>
                    <input
                      name="shipping-fee"
                      type="number"
                      min="0"
                      className="input-field mt-2"
                      value={draft.shippingFee}
                      onChange={(event) =>
                        updateDraft("shippingFee", event.target.value)
                      }
                      required
                      aria-invalid={
                        showStepErrors &&
                        (draft.shippingFee.trim() === "" ||
                          Number(draft.shippingFee) < 0)
                      }
                      aria-describedby={
                        showStepErrors ? "campaign-step-errors" : undefined
                      }
                    />
                  </label>
                  <p className="sm:col-span-2 flex items-start gap-2 text-[11px] leading-5 text-ink-muted">
                    <Truck className="mt-0.5 size-4 shrink-0" /> Đợt mở bán đầu
                    chỉ nhận địa chỉ tại Việt Nam. Phí giao hàng được chốt khi
                    người dùng xác nhận cam kết.
                  </p>
                </div>
                <div className="mt-8 flex flex-col justify-between gap-3 border-t border-line pt-7 sm:flex-row sm:items-end">
                  <div>
                    <p className="eyebrow text-coral">
                      <UserPlus className="size-4" /> Cộng tác viên
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">
                      Có thể để trống. Đây là danh sách dự kiến; sau khi hồ sơ được duyệt,
                      người có đúng email mới thấy lời mời và tự xác nhận tham gia.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCollaborators((current) => current.length >= 5 ? current : [
                        ...current,
                        {
                          id: Date.now(),
                          email: "",
                          name: "",
                          canUpdate: true,
                          canReply: true,
                          canViewAi: false,
                        },
                      ])
                    }
                    className="button-secondary"
                    disabled={collaborators.length >= 5}
                  >
                    <Plus className="size-4" /> Thêm người dự kiến
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  {collaborators.map((member) => (
                    <article
                      key={member.id}
                      className="rounded-[16px] border border-line p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-forest font-display text-xs font-extrabold text-lime">
                            {member.name.trim() ? member.name
                              .split(" ")
                              .slice(-2)
                              .map((part) => part[0])
                              .join("") : "?"}
                          </span>
                          <label className="min-w-0 flex-1">
                            <span className={inputLabel}>Email thành viên</span>
                            <input
                              name={`collaborator-email-${member.id}`}
                              type="email"
                              className="input-field mt-2"
                              value={member.email}
                              placeholder="ten@example.com"
                              onChange={(event) =>
                                updateCollaborator(
                                  member.id,
                                  "email",
                                  event.target.value,
                                )
                              }
                              required
                              aria-invalid={
                                showStepErrors &&
                                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                  member.email.trim(),
                                )
                              }
                              aria-describedby={
                                showStepErrors ? "campaign-step-errors" : undefined
                              }
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCollaborators((current) =>
                              current.filter((item) => item.id !== member.id),
                            )
                          }
                          className="grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-red-50 hover:text-red-600"
                          aria-label={`Gỡ ${member.name || member.email || "người dự kiến mời"}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <label className="mt-4 block">
                        <span className={inputLabel}>Tên người dự kiến mời</span>
                        <input name={`collaborator-name-${member.id}`} className="input-field mt-2"
                          value={member.name} maxLength={80} minLength={2}
                          onChange={(event) => updateCollaborator(member.id, "name", event.target.value)}
                          placeholder="Ví dụ: Nguyễn Thu An" />
                      </label>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          ["canUpdate", "Đăng cập nhật"],
                          ["canReply", "Trả lời bình luận"],
                          ["canViewAi", "Xem dự báo"],
                        ].map(([key, label]) => (
                          <label
                            key={key}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-[#faf9f5] px-3 py-2 text-[11px] font-semibold"
                          >
                            <input
                              name={`collaborator-permission-${member.id}-${key}`}
                              type="checkbox"
                              checked={
                                member[
                                  key as keyof Pick<
                                    DraftCollaborator,
                                    "canUpdate" | "canReply" | "canViewAi"
                                  >
                                ]
                              }
                              onChange={(event) =>
                                updateCollaborator(
                                  member.id,
                                  key as keyof DraftCollaborator,
                                  event.target.checked,
                                )
                              }
                              className="accent-[#16a34a]"
                            />{" "}
                            {label}
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <p className="eyebrow text-coral">Bản xem trước</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Kiểm tra trước khi gửi duyệt
                </h2>
                <div className="mt-7 overflow-hidden rounded-[18px] border border-line">
                  <CampaignVisual
                    motif={previewVisual.motif}
                    palette={previewVisual.palette}
                    label={
                      draft.title
                        ? draft.title.split(/[—-]/)[0].trim().slice(0, 24)
                        : "DỰ ÁN MỚI"
                    }
                    imageSrc={selectedCover?.src}
                    imageAlt={selectedCover?.alt}
                    imageNote={selectedCover?.note}
                    className="aspect-[16/8]"
                  />
                  <div className="bg-white p-5 sm:p-6">
                    <span className="rounded-full bg-[#fff0e9] px-2.5 py-1 text-[11px] font-bold text-coral-dark">
                      BẢN XEM TRƯỚC
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-extrabold leading-tight">
                      {draft.title || "Tên chiến dịch"}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-ink-soft">
                      {draft.blurb || "Mô tả ngắn sẽ xuất hiện tại đây."}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-4">
                      <div>
                        <p className="font-display text-lg font-extrabold">
                          {formatVnd(Number(draft.goal) || 0, true)}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Mục tiêu gọi vốn
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-extrabold">
                          {draft.duration} ngày
                        </p>
                        <p className="text-[11px] text-ink-muted">Thời lượng</p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-extrabold">
                          {rewards.length}
                        </p>
                        <p className="text-[11px] text-ink-muted">Gói ủng hộ</p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-extrabold">
                          {addOns.length}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Phần bổ sung
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-line bg-[#faf9f5] p-5">
                  <p className="font-display font-extrabold">
                    Checklist gửi duyệt
                  </p>
                  <ul className="mt-4 space-y-3 text-xs">
                    {checklist.map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <span
                          className={`grid size-5 place-items-center rounded-full ${item.ok ? "bg-emerald-100 text-emerald-700" : item.optional ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}
                        >
                          {item.ok ? <Check className="size-3" /> : item.optional ? "–" : "!"}
                        </span>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                  {submitError ? (
                    <p
                      role="alert"
                      className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      {submitError}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                  <Sparkles className="size-3.5" /> Dự báo AI ✦ · Giải thích SHAP
                </p>
                <h2 className="mt-3 font-display text-2xl font-extrabold text-ink">
                  Đánh giá khả năng gọi vốn trước khi gửi duyệt
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Hệ thống phân tích cấu trúc chiến dịch hiện tại để bạn tối ưu trước khi đưa lên hàng chờ xét duyệt.
                </p>

                <div className="ai-card-surface mt-6 grid gap-6 rounded-[20px] border p-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative grid size-36 place-items-center">
                      <svg className="size-36 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
                        <defs>
                          <linearGradient id="wizard-ai-gauge" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#7C3AED" />
                            <stop offset="100%" stopColor="#2563EB" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          fill="none"
                          stroke="rgba(124, 58, 237, 0.14)"
                          strokeWidth="12"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          fill="none"
                          stroke="url(#wizard-ai-gauge)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={326.73}
                          strokeDashoffset={326.73 - (aiForecast.probability / 100) * 326.73}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
                        <span className="font-display text-3xl font-extrabold text-ink">
                          {aiForecast.probability}%
                        </span>
                        <span className="text-[11px] font-bold text-[#7C3AED]">
                          Xác suất đạt mục tiêu
                        </span>
                      </div>
                    </div>
                    <span className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink shadow-2xs">
                      {aiForecast.band}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7C3AED]">
                      3 yếu tố tác động mạnh nhất (SHAP)
                    </p>
                    {aiForecast.shapFactors.map((factor) => {
                      const positive = factor.impact >= 0;
                      const widthPct = Math.min(100, Math.max(18, Math.abs(factor.impact) * 5));
                      return (
                        <div key={factor.label} className="rounded-xl border border-[#DDD6FE]/80 bg-white p-3.5">
                          <div className="flex items-center justify-between gap-2 text-xs font-bold">
                            <span className="text-ink">{factor.label}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 tabular-nums ${
                                positive
                                  ? "bg-emerald-50 text-[#047857]"
                                  : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {positive ? `+${factor.impact}%` : `${factor.impact}%`}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${positive ? "bg-[#059669]" : "bg-rose-500"}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">
                            {factor.detail}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {submitError ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
                  >
                    {submitError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showStepErrors ? (
              <div
                id="campaign-step-errors"
                role="alert"
                className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
              >
                <p className="font-extrabold">Cần kiểm tra lại trước khi đi tiếp:</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {stepIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => {
                  setAttemptedStep(null);
                  setStep((value) => Math.max(0, value - 1));
                }}
                className="button-ghost disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft className="size-4" /> Quay lại
              </button>
              {step < wizardSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  aria-describedby={
                    showStepErrors ? "campaign-step-errors" : undefined
                  }
                  className="button-dark"
                >
                  Tiếp tục <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!canContinue) {
                      setAttemptedStep(step);
                      return;
                    }
                    setConfirmOpen(true);
                  }}
                  disabled={saving}
                  aria-describedby={
                    showStepErrors ? "campaign-step-errors" : undefined
                  }
                  className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Rocket className="size-4" />
                  )}{" "}
                  Kiểm tra & gửi duyệt
                </button>
              )}
            </div>
          </fieldset>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Xác nhận gửi xét duyệt"
        description="Hồ sơ sẽ chuyển sang trạng thái Chờ duyệt để đội ngũ quản trị kiểm tra tính minh bạch."
        badge="Bước cuối cùng"
        size="md"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="button-secondary min-h-11 px-4 text-xs"
            >
              Xem lại thêm
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="button-primary min-h-11 px-5 text-xs"
            >
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Rocket className="size-4" />
              )}{" "}
              Xác nhận gửi xét duyệt
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-line bg-canvas-soft p-4">
            <p className="font-display text-base font-extrabold text-ink">
              {draft.title || "Chiến dịch mới"}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 tabular-nums text-xs">
              <div>
                <p className="text-ink-muted">Mục tiêu</p>
                <p className="mt-0.5 font-bold text-ink">
                  {formatVnd(Number(draft.goal) || 0, true)}
                </p>
              </div>
              <div>
                <p className="text-ink-muted">Hoàn thiện</p>
                <p className="mt-0.5 font-bold text-[#047857]">{readiness}/100</p>
              </div>
              <div>
                <p className="text-ink-muted">Dự báo AI</p>
                <p className="mt-0.5 font-bold text-[#7C3AED]">{aiForecast.probability}%</p>
              </div>
            </div>
          </div>
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs leading-5 text-slate-800">
            Cam kết tuân thủ quy chế <strong>All-or-Nothing</strong>: Chiến dịch chỉ giải ngân khi đạt 100% mục tiêu trước thời hạn. Trong khi chờ duyệt, chỉnh sửa trực tiếp sẽ tạm khóa.
          </p>
        </div>
      </Modal>
    </section>
  );
}
