"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  Edit3,
  Eye,
  FileText,
  Gift,
  Image as ImageIcon,
  Info,
  LayoutTemplate,
  Lightbulb,
  LoaderCircle,
  MapPin,
  PackagePlus,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Table,
  Target,
  Trash2,
  Truck,
  Upload,
  UserPlus,
  Users,
  Video,
  WandSparkles,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { StoryMarkdown } from "@/components/campaign/story-markdown";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";

function formatFutureMonthYear(monthsAhead = 3): string {
  const safeMonths =
    Number.isFinite(monthsAhead) && monthsAhead > 0 ? Math.round(monthsAhead) : 3;
  const target = new Date();
  target.setMonth(target.getMonth() + safeMonths);
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const year = target.getFullYear();
  return `${month}/${year}`;
}

const wizardSteps = [
  { label: "Thông tin", icon: LayoutTemplate },
  { label: "Câu chuyện", icon: FileText },
  { label: "Quà & phần bổ sung", icon: Gift },
  { label: "Giao hàng & nhóm", icon: Users },
  { label: "Xem trước", icon: Rocket },
];

interface DraftReward {
  id: number;
  title: string;
  amount: string;
  delivery: string;
  limit: string;
}

interface DraftCampaign {
  title: string;
  blurb: string;
  category: string;
  goal: string;
  duration: string;
  location: string;
  imageUrl?: string;
  story: string;
  risks: string;
  shippingFee: string;
  hasVideo: boolean;
  videoUrl?: string;
}

interface DraftAddOn {
  id: number;
  title: string;
  amount: string;
}

interface DraftCollaborator {
  id: number;
  email: string;
  name: string;
  canUpdate: boolean;
  canReply: boolean;
  canViewAi: boolean;
}

const inputLabel = "text-xs font-bold text-ink-soft";

const sampleDraft: DraftCampaign = {
  title: "ORBIT Mini — bộ pha gọn cho góc làm việc",
  blurb:
    "Bản nháp đang hoàn thiện cho mẫu máy nhỏ hơn, ưu tiên dễ vệ sinh và vừa bàn làm việc.",
  category: "cong-nghe-sang-tao",
  goal: "360000000",
  duration: "30",
  location: "TP. Hồ Chí Minh",
  imageUrl: "/images/campaigns/orbit-one.png",
  story:
    "ORBIT Mini bắt đầu từ mong muốn mang trải nghiệm pha ổn định vào những căn bếp có diện tích nhỏ. Bản mẫu hiện tại đã hoàn tất thử nghiệm nhiệt và chúng tôi đang chuẩn bị khuôn vỏ cho lô đầu tiên.\n\n## Rủi ro & Phương án dự phòng\nTiến độ khuôn vỏ và nguồn cung cảm biến có thể ảnh hưởng lịch giao. Nhóm đã chuẩn bị nhà cung cấp dự phòng và biên độ lịch bốn tuần.",
  risks: "",
  shippingFee: "45000",
  hasVideo: true,
  videoUrl: "https://www.youtube.com/watch?v=sample-orbit-mini",
};

const blankDraft: DraftCampaign = {
  title: "",
  blurb: "",
  category: "cong-nghe-sang-tao",
  goal: "",
  duration: "30",
  location: "TP. Hồ Chí Minh",
  imageUrl: "",
  story: "",
  risks: "",
  shippingFee: "45000",
  hasVideo: false,
  videoUrl: "",
};

function normalizeCategory(cat?: string): string {
  if (!cat) return "cong-nghe-sang-tao";
  if (cat === "Công nghệ & Sáng tạo" || cat === "Công nghệ") return "cong-nghe-sang-tao";
  if (cat === "Nghệ thuật & Xuất bản") return "nghe-thuat-xuat-ban";
  if (cat === "Thủ công mỹ nghệ") return "thu-cong-my-nghe";
  if (cat === "Cộng đồng & Xã hội") return "cong-dong-xa-hoi";
  if (cat === "Ẩm thực & Nông sản") return "am-thuc-nong-san";
  return cat;
}


const sampleRewards: DraftReward[] = [
  {
    id: 1,
    title: "Ưu đãi sớm",
    amount: "2890000",
    delivery: "01/2027",
    limit: "300",
  },
  {
    id: 2,
    title: "ORBIT Duo",
    amount: "5390000",
    delivery: "02/2027",
    limit: "100",
  },
];

const sampleAddOns: DraftAddOn[] = [
  { id: 1, title: "Ca đánh sữa 450 ml", amount: "320000" },
  { id: 2, title: "Bộ lọc dự phòng", amount: "240000" },
];

const sampleCollaborators: DraftCollaborator[] = [
  {
    id: 1,
    email: "huy.le@example.com",
    name: "Lê Gia Huy",
    canUpdate: true,
    canReply: true,
    canViewAi: true,
  },
];

export function CampaignWizard({
  prefillSample = false,
  mode = "create",
  campaignId = "cmp_draft",
  campaignSlug,
  campaignStatus,
  initialDraft,
  initialRewards,
  initialAddOns,
  initialCollaborators,
  reviewFeedback,
}: {
  prefillSample?: boolean;
  mode?: "create" | "edit";
  campaignId?: string;
  campaignSlug?: string;
  campaignStatus?: string;
  initialDraft?: Partial<DraftCampaign>;
  initialRewards?: DraftReward[];
  initialAddOns?: DraftAddOn[];
  initialCollaborators?: DraftCollaborator[];
  reviewFeedback?: string | null;
}) {
  const router = useRouter();
  const [activeCampaignId, setActiveCampaignId] = useState(campaignId);
  const [activeCampaignSlug, setActiveCampaignSlug] = useState(campaignSlug);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftCampaign>(() => {
    const base = prefillSample ? sampleDraft : blankDraft;
    const initial = initialDraft || {};
    return {
      ...base,
      ...initial,
      category: normalizeCategory(initial.category || base.category),
    };
  });
  const [rewards, setRewards] = useState<DraftReward[]>(() =>
    initialRewards && initialRewards.length > 0
      ? initialRewards
      : prefillSample
        ? sampleRewards.map((reward) => ({ ...reward }))
        : [{ id: 1, title: "", amount: "", delivery: "", limit: "" }],
  );
  const [addOns, setAddOns] = useState<DraftAddOn[]>(() =>
    initialAddOns && initialAddOns.length > 0
      ? initialAddOns
      : prefillSample
        ? sampleAddOns.map((addOn) => ({ ...addOn }))
        : [],
  );
  const [collaborators, setCollaborators] = useState<DraftCollaborator[]>(() =>
    initialCollaborators && initialCollaborators.length > 0
      ? initialCollaborators
      : prefillSample
        ? sampleCollaborators.map((member) => ({ ...member }))
        : [],
  );
  const [imageTab, setImageTab] = useState<"upload" | "link">(() =>
    draft.imageUrl?.startsWith("http") ? "link" : "upload",
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const [storyTab, setStoryTab] = useState<"edit" | "preview">("edit");
  const [storyImageUploading, setStoryImageUploading] = useState(false);
  const [showStoryGuide, setShowStoryGuide] = useState(false);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  const [videoTab, setVideoTab] = useState<"upload" | "link">(() =>
    draft.videoUrl?.startsWith("http") ? "link" : "upload",
  );
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Contextual Inline AI States
  const [inlineAiLoading, setInlineAiLoading] = useState<{
    title?: boolean;
    story?: boolean;
    rewards?: boolean;
    audit?: boolean;
  }>({});
  const [inlineAiNotice, setInlineAiNotice] = useState<string | null>(null);

  // Step 0 AI: Title & Blurb
  const [titleIdeaInput, setTitleIdeaInput] = useState("");
  const [titleSuggestions, setTitleSuggestions] = useState<Array<{
    style: string;
    styleLabel: string;
    title: string;
    blurb: string;
    rationale: string;
  }> | null>(null);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

  // Step 1 AI: Story & Risks
  const [storyDetailsInput, setStoryDetailsInput] = useState("");
  const [storySuggestion, setStorySuggestion] = useState<{
    mode?: "WRITE_SAMPLE" | "REVIEW_AND_COACH";
    changesSummary?: string;
    storyMarkdown: string;
    risksMarkdown?: string;
    writingTips?: string[];
    suggestedAdditions?: Array<{
      title: string;
      reason: string;
      content: string;
    }>;
  } | null>(null);
  const [showStoryAiPanel, setShowStoryAiPanel] = useState(false);

  // Step 2 AI: Reward Tiers
  const [rewardSuggestion, setRewardSuggestion] = useState<{
    tiers: Array<{
      tierType?: string;
      title: string;
      amount: string;
      description: string;
      limit: string;
      delivery: string;
    }>;
    strategicAdvice?: string;
  } | null>(null);
  const [showRewardAiPanel, setShowRewardAiPanel] = useState(false);

  // Step 4 AI: Pre-flight Audit
  const [auditResult, setAuditResult] = useState<{
    readinessScore: number;
    grade: string;
    verdict: string;
    strengths: string[];
    improvements: Array<{
      id: string;
      field: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
      title: string;
      advice: string;
      stepIndex: number;
    }>;
  } | null>(null);

  const readiness = useMemo(() => {
    let score = 0;
    // Step 0: Basic Info (max 30)
    const titleLen = draft.title.trim().length;
    if (titleLen >= 20 && titleLen <= 90) score += 10;
    else if (titleLen >= 8) score += 5;

    const blurbLen = draft.blurb.trim().length;
    if (blurbLen >= 50 && blurbLen <= 180) score += 10;
    else if (blurbLen >= 20) score += 5;

    const goalNum = Number(draft.goal);
    if (goalNum >= 10_000_000) score += 10;
    else if (goalNum > 0) score += 4;

    // Step 1: Media & Story (max 40)
    if (draft.imageUrl && draft.imageUrl.trim().length > 0) score += 12;
    if (draft.hasVideo || (draft.videoUrl && draft.videoUrl.trim().length > 0)) score += 5;

    const storyLen = draft.story.trim().length;
    if (storyLen >= 300) score += 23;
    else if (storyLen >= 100) score += 12;

    // Step 2: Rewards (max 20)
    const validRewards = rewards.filter(
      (r) => r.title.trim().length >= 3 && Number(r.amount) >= 50_000 && r.delivery.trim().length > 0
    );
    if (validRewards.length >= 2) score += 15;
    else if (validRewards.length === 1) score += 8;

    if (addOns.length > 0 && addOns.every((a) => a.title.trim() && Number(a.amount) > 0)) {
      score += 5;
    }

    // Step 3: Logistics & Team (max 10)
    if (draft.shippingFee && Number(draft.shippingFee) >= 0 && draft.title.trim().length > 0) {
      score += 5;
    }
    if (collaborators.length > 0 && collaborators.every((c) => c.email.includes("@"))) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }, [addOns, collaborators, draft, rewards]);

  // Contextual Inline AI Handlers
  const handleInlineSuggestTitle = async (customIdea?: string) => {
    setInlineAiLoading((prev) => ({ ...prev, title: true }));
    setInlineAiNotice(null);
    setShowTitleSuggestions(true);
    try {
      const rawIdea =
        (customIdea ?? titleIdeaInput).trim() ||
        draft.title.trim() ||
        draft.blurb.trim() ||
        "Dự án sáng tạo đổi mới";
      const res = await clientRequest<{
        data: {
          suggestions: Array<{
            style: string;
            styleLabel: string;
            title: string;
            blurb: string;
            rationale: string;
          }>;
        };
      }>(
        "/api/v1/creator/ai",
        {
          method: "POST",
          body: JSON.stringify({
            action: "SUGGEST_TITLE_BLURB",
            payload: {
              idea: rawIdea,
              category: draft.category,
            },
          }),
        },
        { timeoutMs: 35000 },
      );

      if (res?.data?.suggestions?.length) {
        setTitleSuggestions(res.data.suggestions);
      } else {
        setInlineAiNotice("Chưa tạo được gợi ý. Hãy nhập thêm vài từ khóa về sản phẩm.");
      }
    } catch (err: any) {
      setInlineAiNotice(err?.message || "Không thể kết nối trợ lý AI lúc này.");
    } finally {
      setInlineAiLoading((prev) => ({ ...prev, title: false }));
    }
  };

  const handleInlineGenerateStory = async (
    modeToUse: "WRITE_SAMPLE" | "REVIEW_AND_COACH" = "WRITE_SAMPLE",
  ) => {
    setInlineAiLoading((prev) => ({ ...prev, story: true }));
    setInlineAiNotice(null);
    setShowStoryAiPanel(true);
    try {
      const extraDetails = storyDetailsInput.trim();
      const productDetails = [
        extraDetails,
        `Mục tiêu gọi vốn: ${formatVnd(Number(draft.goal) || 50000000, true)}`,
        `Địa điểm: ${draft.location}`,
      ]
        .filter(Boolean)
        .join(". ");

      const res = await clientRequest<{
        data: {
          mode?: "WRITE_SAMPLE" | "REVIEW_AND_COACH";
          changesSummary?: string;
          storyMarkdown?: string;
          risksMarkdown?: string;
          writingTips?: string[];
          suggestedAdditions?: Array<{
            title: string;
            reason: string;
            content: string;
          }>;
        };
      }>(
        "/api/v1/creator/ai",
        {
          method: "POST",
          body: JSON.stringify({
            action: "SUGGEST_STORY",
            payload: {
              title: draft.title.trim() || "Dự án sáng tạo mới",
              blurb: draft.blurb.trim(),
              category: draft.category,
              productDetails,
              mode: modeToUse,
              currentStory: draft.story,
              currentRisks: draft.risks,
            },
          }),
        },
        { timeoutMs: 35000 },
      );

      if (res?.data?.storyMarkdown) {
        setStorySuggestion({
          mode: res.data.mode || modeToUse,
          changesSummary: res.data.changesSummary,
          storyMarkdown: res.data.storyMarkdown,
          risksMarkdown: res.data.risksMarkdown,
          writingTips: res.data.writingTips || [],
          suggestedAdditions: res.data.suggestedAdditions || [],
        });
      }
    } catch (err: any) {
      setInlineAiNotice(err?.message || "Chưa thể kết nối trợ lý AI lúc này.");
    } finally {
      setInlineAiLoading((prev) => ({ ...prev, story: false }));
    }
  };

  const handleInlineGenerateRewards = async () => {
    setInlineAiLoading((prev) => ({ ...prev, rewards: true }));
    setInlineAiNotice(null);
    setShowRewardAiPanel(true);
    try {
      const goalAmount = Number(draft.goal) >= 100000 ? Number(draft.goal) : 50000000;
      const res = await clientRequest<{
        data: {
          tiers: Array<{
            tierType?: string;
            title: string;
            amount: string | number;
            description?: string;
            limit?: string | number;
            limitQuantity?: number | null;
            delivery?: string;
            estimatedDeliveryMonths?: number;
          }>;
          strategicAdvice?: string;
        };
      }>(
        "/api/v1/creator/ai",
        {
          method: "POST",
          body: JSON.stringify({
            action: "SUGGEST_REWARDS",
            payload: {
              goalAmount,
              productName: draft.title.trim() || "Sản phẩm chiến dịch",
              category: draft.category,
            },
          }),
        },
        { timeoutMs: 35000 },
      );

      if (res?.data?.tiers?.length) {
        const defaultLimits = [200, 50, 150, 30];
        const normalizedTiers = res.data.tiers.map((t, idx) => {
          const rawAmount = Math.max(50000, Number(t.amount) || 100000);
          const rawLimit = Number(t.limit ?? t.limitQuantity);
          const validLimit =
            Number.isFinite(rawLimit) && rawLimit >= 1
              ? Math.round(rawLimit)
              : (defaultLimits[idx] ?? 100);
          const validDelivery =
            typeof t.delivery === "string" && /^\d{2}\/\d{4}$/.test(t.delivery.trim())
              ? t.delivery.trim()
              : formatFutureMonthYear(t.estimatedDeliveryMonths || (idx === 0 ? 1 : 3));

          return {
            tierType: t.tierType,
            title: String(t.title || `Gói ủng hộ #${idx + 1}`).trim(),
            amount: String(rawAmount),
            description: String(t.description || "").trim(),
            limit: String(validLimit),
            delivery: validDelivery,
          };
        });
        setRewardSuggestion({
          tiers: normalizedTiers,
          strategicAdvice: res.data.strategicAdvice,
        });
      }
    } catch (err: any) {
      setInlineAiNotice(err?.message || "Chưa thể gợi ý gói thưởng lúc này.");
    } finally {
      setInlineAiLoading((prev) => ({ ...prev, rewards: false }));
    }
  };

  const handleInlineAudit = async () => {
    setInlineAiLoading((prev) => ({ ...prev, audit: true }));
    setInlineAiNotice(null);
    try {
      const validRewardsCount = rewards.filter(
        (r) =>
          r.title.trim().length >= 3 &&
          Number(r.amount) >= 50_000 &&
          /^\d{2}\/\d{4}$/.test(r.delivery.trim()),
      ).length;

      const res = await clientRequest<{
        data: {
          readinessScore: number;
          grade: string;
          verdict: string;
          strengths: string[];
          improvements: Array<{
            id: string;
            field: string;
            priority: "HIGH" | "MEDIUM" | "LOW";
            title: string;
            advice: string;
            stepIndex: number;
          }>;
        };
      }>(
        "/api/v1/creator/ai",
        {
          method: "POST",
          body: JSON.stringify({
            action: "AUDIT_DRAFT",
            payload: {
              title: draft.title,
              blurb: draft.blurb,
              category: draft.category,
              goalAmount: Number(draft.goal) || 0,
              durationDays: Number(draft.duration) || 30,
              storyMarkdown: draft.story,
              risksMarkdown: draft.risks,
              rewardCount: validRewardsCount,
              imageCount: draft.imageUrl ? 1 : 0,
              hasVideo: Boolean(draft.videoUrl || draft.hasVideo),
            },
          }),
        },
        { timeoutMs: 35000 },
      );

      if (res?.data) {
        setAuditResult(res.data);
      }
    } catch (err: any) {
      setInlineAiNotice(err?.message || "Chưa thể thẩm định hồ sơ lúc này.");
    } finally {
      setInlineAiLoading((prev) => ({ ...prev, audit: false }));
    }
  };

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
        issues.push("Mục tiêu gọi vốn tối thiểu của bản demo là 10 triệu đồng.");
      }
      if (Number(draft.duration) < 15 || Number(draft.duration) > 60) {
        issues.push("Thời lượng chiến dịch phải từ 15 đến 60 ngày.");
      }
    }
    if (step === 1) {
      if (draft.story.trim().length < 100) {
        issues.push("Câu chuyện dự án cần ít nhất 100 ký tự.");
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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim())) {
          issues.push(`Email cộng tác viên #${index + 1} chưa đúng định dạng.`);
        }
      });
    }
    if (step === 4 && readiness < 70) {
      issues.push("Bản nháp cần đạt ít nhất 70/100 trước khi gửi xét duyệt.");
    }
    return issues;
  }, [addOns, collaborators, draft, readiness, rewards, step]);
  const canContinue = stepIssues.length === 0;
  const showStepErrors = attemptedStep === step && !canContinue;

  const goNext = () => {
    if (!canContinue) {
      setAttemptedStep(step);
      return;
    }
    setAttemptedStep(null);
    setStep((value) => Math.min(wizardSteps.length - 1, value + 1));
  };

  const updateDraft = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const loadSampleData = () => {
    setDraft({ ...sampleDraft });
    setRewards(sampleRewards.map((reward) => ({ ...reward })));
    setAddOns(sampleAddOns.map((addOn) => ({ ...addOn })));
    setCollaborators(sampleCollaborators.map((member) => ({ ...member })));
    toast.success("Đã điền nội dung ví dụ để bạn tham khảo");
  };
  const updateReward = (id: number, key: keyof DraftReward, value: string) => {
    setRewards((current) =>
      current.map((reward) =>
        reward.id === id ? { ...reward, [key]: value } : reward,
      ),
    );
  };
  const updateAddOn = (id: number, key: keyof DraftAddOn, value: string) => {
    setAddOns((current) =>
      current.map((addOn) =>
        addOn.id === id ? { ...addOn, [key]: value } : addOn,
      ),
    );
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
  };
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setVideoUploadError("Dung lượng video tối đa là 50MB.");
      return;
    }

    setVideoUploading(true);
    setVideoUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/upload/video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không thể tải lên video.");
      }

      updateDraft("videoUrl", data.videoUrl);
      updateDraft("hasVideo", true);
      setUploadedFileName(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tải video.";
      setVideoUploadError(message);
    } finally {
      setVideoUploading(false);
    }
  };
  const handleRemoveVideo = () => {
    updateDraft("videoUrl", "");
    updateDraft("hasVideo", false);
    setUploadedFileName(null);
    setVideoUploadError(null);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setImageUploadError("Kích thước ảnh tối đa là 10MB.");
      return;
    }

    setImageUploading(true);
    setImageUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/upload/image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không thể tải lên hình ảnh.");
      }

      updateDraft("imageUrl", data.imageUrl || data.url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tải ảnh.";
      setImageUploadError(message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    updateDraft("imageUrl", "");
    setImageUploadError(null);
  };

  const handleStoryImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Kích thước ảnh tối đa là 10MB.");
      return;
    }

    setStoryImageUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/upload/image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không thể tải lên hình ảnh.");
      }

      const uploadedUrl = data.imageUrl || data.url;
      const altText = file.name.replace(/\.[^/.]+$/, "");
      const snippet = `\n\n![${altText}](${uploadedUrl})\n*Hình: ${altText}*\n\n`;
      updateDraft("story", (draft.story || "") + snippet);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tải ảnh.";
      alert(message);
    } finally {
      setStoryImageUploading(false);
      if (storyFileInputRef.current) storyFileInputRef.current.value = "";
    }
  };

  const insertStoryTemplate = () => {
    const template = `## 1. Vì sao chúng tôi khởi động dự án này?
Chia sẻ lý do, câu chuyện cá nhân hoặc vấn đề thực tế mà bạn muốn giải quyết. Người ủng hộ tài trợ vì niềm tin vào con người và ý nghĩa thực tế của dự án.

> "Mục tiêu của chúng tôi không chỉ là tạo ra một sản phẩm tốt, mà là mang lại trải nghiệm trọn vẹn nhất cho cộng đồng."

## 2. Thiết kế & Tính năng nổi bật
Trình bày các ưu điểm, thông số kỹ thuật và những gì làm cho sản phẩm của bạn khác biệt trên thị trường.

- **Vật liệu cao cấp:** Chọn lọc tỉ mỉ, thân thiện môi trường và có độ bền vượt trội.
- **Thiết kế tối giản:** Tinh tế, vừa vặn không gian sống và dễ dàng bảo dưỡng.
- **Trải nghiệm tối ưu:** Đã qua hơn 50 lần thử nghiệm thực tế với người dùng.

### Bảng thông số kỹ thuật

| Thông số | Chi tiết |
|---|---|
| Kích thước | Tiêu chuẩn nhỏ gọn |
| Trọng lượng | Nhẹ, dễ mang theo |
| Bảo hành | 12 tháng chính hãng |

## 3. Quy trình sản xuất & Đội ngũ thực hiện
Minh bạch nguồn gốc vật liệu, các xưởng gia công đối tác và kinh nghiệm của các thành viên nòng cốt.

## 4. Kế hoạch bàn giao & Rủi ro dự phòng
Lộ trình chi tiết từ khi kết thúc gọi vốn, sản xuất hàng loạt, kiểm định chất lượng đến phương án dự phòng rủi ro và giao tận tay người ủng hộ.`;

    if (
      !draft.story.trim() ||
      window.confirm("Bạn có muốn chèn khung câu chuyện mẫu? Nội dung hiện tại sẽ được thay thế bằng cấu trúc chuẩn.")
    ) {
      updateDraft("story", template);
    }
  };
  const getDraftRequiredIssues = () => {
    const missing: string[] = [];
    const titleTrimmed = draft.title.trim();
    const blurbTrimmed = draft.blurb.trim();
    const goalNum = Number(draft.goal);
    const durationNum = Number(draft.duration);

    if (!titleTrimmed) {
      missing.push("Tên chiến dịch");
    } else if (titleTrimmed.length > 120) {
      missing.push("Tên chiến dịch tối đa 120 ký tự");
    }

    if (!blurbTrimmed) {
      missing.push("Mô tả ngắn");
    } else if (blurbTrimmed.length > 220) {
      missing.push("Mô tả ngắn tối đa 220 ký tự");
    }

    if (!draft.goal.trim() || !Number.isFinite(goalNum) || goalNum < 10_000_000) {
      missing.push("Mục tiêu gọi vốn (tối thiểu 10.000.000 đ)");
    }

    if (
      !draft.duration.trim() ||
      !Number.isFinite(durationNum) ||
      durationNum < 15 ||
      durationNum > 60
    ) {
      missing.push("Thời lượng chiến dịch (15–60 ngày)");
    }

    return missing;
  };

  const saveDraft = async () => {
    const requiredIssues = getDraftRequiredIssues();
    if (requiredIssues.length > 0) {
      const detail = `Vui lòng điền/kiểm tra các thuộc tính bắt buộc: ${requiredIssues.join(", ")}.`;
      toast.error("Chưa thể lưu bản nháp", {
        description: detail,
        duration: 6000,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await clientRequest<{
        data?: { campaignId?: string; campaignSlug?: string };
      }>(
        "/api/v1/creator/operations",
        {
          method: "POST",
          body: JSON.stringify({
            action: "SAVE_DRAFT",
            payload: {
              campaignId: activeCampaignId,
              draft,
              rewards,
              addOns,
              collaborators,
            },
          }),
        },
      );
      if (res?.data?.campaignId) {
        setActiveCampaignId(res.data.campaignId);
      }
      if (res?.data?.campaignSlug) {
        setActiveCampaignSlug(res.data.campaignSlug);
      }
      toast.success("Đã lưu bản nháp thành công", {
        description: "Chiến dịch đã được lưu ở trạng thái bản nháp (DRAFT).",
      });
    } catch (error) {
      const msg = clientRequestMessage(error, "Chưa thể lưu bản nháp");
      toast.error("Chưa thể lưu bản nháp", {
        description: msg,
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  };
  const isSavedDraft =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activeCampaignId,
    ) &&
    (!campaignStatus || campaignStatus === "DRAFT");

  const deleteDraft = async () => {
    if (!isSavedDraft) return;
    setDeleting(true);
    try {
      await clientRequest("/api/v1/creator/operations", {
        method: "POST",
        body: JSON.stringify({
          action: "DELETE_DRAFT",
          payload: { campaignId: activeCampaignId },
        }),
      });
      setConfirmDeleteOpen(false);
      toast.success("Đã xóa bản nháp chiến dịch");
      router.push("/creator");
      router.refresh();
    } catch (error) {
      const msg = clientRequestMessage(error, "Chưa thể xóa bản nháp");
      toast.error("Chưa thể xóa bản nháp", {
        description: msg,
        duration: 6000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const submit = async () => {
    if (!canContinue) {
      setAttemptedStep(step);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const res = await clientRequest<{
        data?: { campaignId?: string; campaignSlug?: string };
      }>(
        "/api/v1/creator/operations",
        {
          method: "POST",
          body: JSON.stringify({
            action: "SUBMIT_REVIEW",
            payload: {
              campaignId: activeCampaignId,
              title: draft.title.trim(),
              category: draft.category,
              rewardCount: rewards.length,
              addOnCount: addOns.length,
              readiness,
              draft,
              rewards,
              addOns,
              collaborators,
            },
          }),
        },
      );
      if (res?.data?.campaignId) {
        setActiveCampaignId(res.data.campaignId);
      }
      if (res?.data?.campaignSlug) {
        setActiveCampaignSlug(res.data.campaignSlug);
      }
      setSaving(false);
      setSubmitted(true);
    } catch (error) {
      setSaving(false);
      setSubmitError(clientRequestMessage(error, "Chưa thể gửi chiến dịch. Bạn vui lòng thử lại."));
    }
  };

  if (submitted) {
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
              Quản trị viên sẽ kiểm tra nội dung, gói ủng hộ, phần bổ sung, giao
              hàng, rủi ro và hình ảnh trước khi phản hồi.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={
                  activeCampaignSlug
                    ? `/creator/campaigns/${activeCampaignSlug}/manage?tab=review`
                    : "/creator"
                }
                className="button-dark"
              >
                Về không gian Chủ dự án <ArrowRight className="size-4" />
              </Link>
              <Link href="/creator/ai" className="button-secondary">
                Xem dự báo chiến dịch
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const checklist = [
    {
      label: "Thông tin, mục tiêu và thời lượng hợp lệ",
      ok: Boolean(draft.title && draft.blurb && Number(draft.goal) > 0),
    },
    {
      label: "Có câu chuyện dự án chi tiết (bao gồm kế hoạch & rủi ro)",
      ok: draft.story.trim().length >= 100,
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
    { label: "Có video hoặc hình ảnh minh họa", ok: draft.hasVideo },
  ];
  const canLoadSample =
    !prefillSample &&
    !draft.title.trim() &&
    rewards.every((reward) => !reward.title.trim() && !reward.amount);
  const storyWordCount = draft.story.trim()
    ? draft.story.trim().split(/\s+/).length
    : 0;

  return (
    <section className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="border-b border-forest/10 bg-[#e5ebe5] py-8">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <Link
                href={
                  campaignSlug
                    ? `/creator/campaigns/${campaignSlug}/manage`
                    : "/creator"
                }
                className="inline-flex items-center gap-2 text-xs font-bold text-ink-muted hover:text-forest"
              >
                <ArrowLeft className="size-4" />
                {mode === "edit" ? "Quay lại hồ sơ" : "Quay lại danh mục"}
              </Link>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
                {mode === "edit" ? "Chỉnh sửa hồ sơ chiến dịch" : "Tạo chiến dịch mới"}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {canLoadSample ? (
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="button-secondary min-h-11 px-4 text-xs"
                >
                  <WandSparkles className="size-4" /> Dùng nội dung ví dụ
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving || deleting}
                onClick={() => void saveDraft()}
                className="button-dark min-h-11 px-4 text-xs"
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}{" "}
                Lưu bản nháp
              </button>
              {isSavedDraft ? (
                <button
                  type="button"
                  disabled={saving || deleting}
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-4" /> Xóa bản nháp
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container-shell py-7">
        {reviewFeedback && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-red-300 bg-red-50/95 p-4 text-ink shadow-sm">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-xs">
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-extrabold text-red-950">
                Ban quản trị yêu cầu chỉnh sửa hồ sơ
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-900 font-medium italic">
                &quot;{reviewFeedback}&quot;
              </p>
              <p className="mt-1.5 text-[11px] text-red-800/80">
                Vui lòng cập nhật các thông tin theo yêu cầu trên, sau đó chuyển sang bước 5 để gửi xét duyệt lại.
              </p>
            </div>
          </div>
        )}

        <ol className="grid grid-cols-5 gap-2">
          {wizardSteps.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const done = index < step;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  disabled={index > step}
                  onClick={() => {
                    setAttemptedStep(null);
                    setStep(index);
                  }}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-xs font-bold sm:px-3 ${active ? "border-coral bg-[#fff5f0] text-coral-dark" : done ? "cursor-pointer border-forest bg-forest text-white" : "border-line bg-white/50 text-ink-muted"}`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg ${active ? "bg-coral text-white" : done ? "bg-lime text-forest" : "bg-forest/6"}`}
                  >
                    {done ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </span>
                  <span className="hidden lg:inline">
                    {index + 1}. {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="rounded-[20px] border border-line bg-white p-5 sm:p-8">
            {step === 0 ? (
              <div>
                <p className="eyebrow text-coral">Thông tin cơ bản</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Đặt nền móng cho chiến dịch
                </h2>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className={inputLabel}>Tên chiến dịch</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleInlineSuggestTitle()}
                          disabled={inlineAiLoading.title}
                          className="inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/5 px-3 py-1 text-xs font-bold text-forest transition hover:bg-forest/15 hover:border-forest disabled:opacity-50"
                        >
                          {inlineAiLoading.title ? (
                            <LoaderCircle className="size-3 animate-spin text-forest" />
                          ) : (
                            <Sparkles className="size-3 text-forest" />
                          )}
                          {inlineAiLoading.title
                            ? "AI đang gợi ý..."
                            : "AI Gợi ý tiêu đề & mô tả"}
                        </button>
                      </div>
                    </div>
                    <input
                      name="campaign-title"
                      className="input-field mt-2"
                      value={draft.title}
                      placeholder="Ví dụ: BrewBot — Máy pha cà phê mini thông minh"
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
                    <span className="mt-1 block text-right text-[10px] text-ink-muted">
                      {draft.title.length}/90
                    </span>
                  </label>
                  <label className="sm:col-span-2">
                    <span className={inputLabel}>Mô tả ngắn (Elevator Pitch)</span>
                    <textarea
                      name="campaign-blurb"
                      rows={3}
                      className="input-field mt-2 min-h-[100px] resize-y"
                      value={draft.blurb}
                      placeholder="Tóm tắt ngắn gọn ý tưởng cốt lõi và giá trị khác biệt trong 1–2 câu..."
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
                    <span className="mt-1 block text-right text-[10px] text-ink-muted">
                      {draft.blurb.length}/180
                    </span>
                  </label>

                  {/* Contextual Inline AI: Title & Blurb Suggestions */}
                  {showTitleSuggestions && (
                    <div className="sm:col-span-2 rounded-2xl border border-forest/25 bg-[#f4f7ee] p-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest/15 pb-3">
                        <div className="flex items-center gap-1.5 font-bold text-forest">
                          <Sparkles className="size-3.5 text-forest" />
                          <span>Trợ lý AI — Gợi ý 3 phong cách Tiêu đề & Mô tả ngắn</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTitleSuggestions(false)}
                          className="text-[11px] font-semibold text-ink-muted hover:text-ink"
                        >
                          Thu gọn ✕
                        </button>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={titleIdeaInput}
                          onChange={(e) => setTitleIdeaInput(e.target.value)}
                          placeholder={
                            draft.title.trim()
                              ? `Từ khóa bổ sung cho "${draft.title.trim()}" (tùy chọn)...`
                              : "Nhập ý tưởng sản phẩm hoặc vài từ khóa chính..."
                          }
                          className="input-field flex-1 bg-white py-2 text-xs"
                        />
                        <button
                          type="button"
                          disabled={inlineAiLoading.title}
                          onClick={() => void handleInlineSuggestTitle(titleIdeaInput)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-bold text-white transition hover:bg-forest/90 disabled:opacity-50"
                        >
                          {inlineAiLoading.title ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="size-3.5" />
                          )}
                          {titleSuggestions ? "Tạo lại 3 phương án" : "Tạo gợi ý"}
                        </button>
                      </div>

                      {titleSuggestions && titleSuggestions.length > 0 && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          {titleSuggestions.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col justify-between rounded-xl border border-forest/20 bg-white p-3.5 shadow-xs transition hover:border-forest hover:shadow"
                            >
                              <div>
                                <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-extrabold text-forest">
                                  {item.styleLabel || item.style}
                                </span>
                                <p className="mt-2 font-display text-xs font-extrabold text-ink">
                                  {item.title}
                                </p>
                                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
                                  {item.blurb}
                                </p>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2.5">
                                <span className="line-clamp-2 text-[10px] text-ink-muted">
                                  {item.rationale}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateDraft("title", item.title.slice(0, 90));
                                    updateDraft("blurb", item.blurb.slice(0, 180));
                                    setShowTitleSuggestions(false);
                                    toast.success("✨ Đã áp dụng Tiêu đề và Mô tả từ AI!");
                                  }}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-forest px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-forest/90"
                                >
                                  <Check className="size-3" /> Áp dụng
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {inlineAiNotice && step === 0 && (
                    <div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                      ⚠️ {inlineAiNotice}
                    </div>
                  )}
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
                      <option value="cong-nghe-sang-tao">Công nghệ & Sáng tạo</option>
                      <option value="nghe-thuat-xuat-ban">Nghệ thuật & Xuất bản</option>
                      <option value="thu-cong-my-nghe">Thủ công mỹ nghệ</option>
                      <option value="cong-dong-xa-hoi">Cộng đồng & Xã hội</option>
                      <option value="am-thuc-nong-san">Ẩm thực & Nông sản</option>
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
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <p className="eyebrow text-coral">Câu chuyện & media</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">
                  Cho cộng đồng thấy kế hoạch thật
                </h2>
                <div className="mt-7 space-y-5">
                  {/* Khối Ảnh bìa dự án (Khuyến nghị) */}
                  <div className="rounded-2xl border border-line bg-[#faf9f5] p-4 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-lime">
                          <ImageIcon className="size-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-ink">Ảnh bìa chiến dịch</p>
                            <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coral">
                              Khuyến nghị
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            Hình ảnh đại diện chính của chiến dịch, hiển thị trên trang khám phá và phần mở đầu câu chuyện.
                          </p>
                        </div>
                      </div>
                      {draft.imageUrl ? (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" /> Gỡ bỏ ảnh
                        </button>
                      ) : null}
                    </div>

                    {/* Mode Tabs: Tải tệp từ máy tính vs Dán liên kết */}
                    <div className="mt-4 flex gap-2 border-b border-line pb-3">
                      <button
                        type="button"
                        onClick={() => setImageTab("upload")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          imageTab === "upload"
                            ? "bg-forest text-white shadow-sm"
                            : "border border-line bg-white text-ink-muted hover:text-ink"
                        }`}
                      >
                        <Upload className="size-3.5" /> Tải ảnh từ máy tính
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab("link")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          imageTab === "link"
                            ? "bg-forest text-white shadow-sm"
                            : "border border-line bg-white text-ink-muted hover:text-ink"
                        }`}
                      >
                        Dán liên kết ảnh ngoài
                      </button>
                    </div>

                    {/* Upload tab */}
                    {imageTab === "upload" ? (
                      <div className="mt-4">
                        {draft.imageUrl && draft.imageUrl.startsWith("/uploads/") ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <BadgeCheck className="size-5 shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-xs font-bold text-emerald-950">
                                    Đã tải ảnh lên máy chủ thành công
                                  </p>
                                  <p className="text-[11px] text-emerald-700">
                                    {draft.imageUrl.split("/").pop()}
                                  </p>
                                </div>
                              </div>
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold hover:bg-forest/5">
                                Thay đổi ảnh khác
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif"
                                  className="hidden"
                                  disabled={imageUploading}
                                  onChange={handleImageUpload}
                                />
                              </label>
                            </div>
                            <img
                              src={draft.imageUrl}
                              alt="Ảnh bìa đã tải"
                              className="mt-3 aspect-video max-h-56 w-full rounded-lg object-cover shadow"
                            />
                          </div>
                        ) : (
                          <div>
                            <label
                              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                                imageUploading
                                  ? "border-amber-300 bg-amber-50/50"
                                  : "border-forest/20 bg-white hover:border-forest/40 hover:bg-forest/5"
                              }`}
                            >
                              {imageUploading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <LoaderCircle className="size-8 animate-spin text-forest" />
                                  <p className="text-xs font-bold text-forest">
                                    Đang tải và lưu hình ảnh vào thư mục máy chủ...
                                  </p>
                                  <p className="text-[10px] text-ink-muted">Vui lòng đợi giây lát</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="grid size-12 place-items-center rounded-full bg-forest/8 text-forest">
                                    <Upload className="size-6" />
                                  </div>
                                  <p className="text-xs font-bold text-ink">
                                    Bấm vào đây để chọn ảnh bìa từ máy tính của bạn
                                  </p>
                                  <p className="text-[11px] text-ink-muted">
                                    Hỗ trợ định dạng PNG, JPG, WebP · Kích thước khuyến nghị 1600x1000px · Tối đa 10MB
                                  </p>
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                className="hidden"
                                disabled={imageUploading}
                                onChange={handleImageUpload}
                              />
                            </label>
                            {imageUploadError ? (
                              <p className="mt-2 text-xs font-semibold text-red-600">
                                {imageUploadError}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Link tab */
                      <div className="mt-4 space-y-3">
                        <label className="block">
                          <span className={inputLabel}>Đường dẫn ảnh bìa (URL)</span>
                          <input
                            name="campaign-image-url"
                            type="url"
                            className="input-field mt-1.5 bg-white"
                            placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
                            value={
                              draft.imageUrl && !draft.imageUrl.startsWith("/uploads/")
                                ? draft.imageUrl
                                : ""
                            }
                            onChange={(event) => {
                              updateDraft("imageUrl", event.target.value);
                            }}
                          />
                        </label>
                        {draft.imageUrl && !draft.imageUrl.startsWith("/uploads/") ? (
                          <div className="rounded-xl border border-line bg-white p-3">
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                              <BadgeCheck className="size-4" /> Đã ghi nhận đường dẫn ảnh bìa
                            </p>
                            <img
                              src={draft.imageUrl}
                              alt="Ảnh bìa xem trước"
                              className="mt-2 aspect-video max-h-56 w-full rounded-lg object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Khối Video giới thiệu (Không bắt buộc) */}
                  <div className="rounded-2xl border border-line bg-[#faf9f5] p-4 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-lime">
                          <Video className="size-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-ink">Video giới thiệu</p>
                            <span className="rounded-full bg-forest/8 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                              Không bắt buộc
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            Có thể tải tệp trực tiếp từ máy tính hoặc dán link YouTube/Vimeo. Nếu chưa có video, bạn hoàn toàn có thể để trống.
                          </p>
                        </div>
                      </div>
                      {draft.videoUrl ? (
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" /> Gỡ bỏ video
                        </button>
                      ) : null}
                    </div>

                    {/* Mode Tabs */}
                    <div className="mt-4 flex gap-2 border-b border-line pb-3">
                      <button
                        type="button"
                        onClick={() => setVideoTab("upload")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          videoTab === "upload"
                            ? "bg-forest text-white shadow-sm"
                            : "border border-line bg-white text-ink-muted hover:text-ink"
                        }`}
                      >
                        <Upload className="size-3.5" /> Tải tệp từ máy tính
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoTab("link")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          videoTab === "link"
                            ? "bg-forest text-white shadow-sm"
                            : "border border-line bg-white text-ink-muted hover:text-ink"
                        }`}
                      >
                        Dán liên kết (YouTube / Vimeo)
                      </button>
                    </div>

                    {/* Upload tab */}
                    {videoTab === "upload" ? (
                      <div className="mt-4">
                        {draft.videoUrl && draft.videoUrl.startsWith("/uploads/") ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <BadgeCheck className="size-5 shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-xs font-bold text-emerald-950">
                                    Đã tải video từ máy lên hệ thống
                                  </p>
                                  <p className="text-[11px] text-emerald-700">
                                    {uploadedFileName || draft.videoUrl.split("/").pop()}
                                  </p>
                                </div>
                              </div>
                              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50">
                                <span>Chọn tệp khác</span>
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                                  className="hidden"
                                  onChange={handleVideoUpload}
                                />
                              </label>
                            </div>
                            <video
                              controls
                              className="mt-3 aspect-video max-h-56 w-full rounded-lg bg-black object-contain shadow"
                              src={draft.videoUrl}
                            />
                            <p className="mt-2 text-[10px] text-ink-muted">
                              Đường dẫn lưu trữ trên server: <code className="rounded bg-black/5 px-1 py-0.5">{draft.videoUrl}</code>
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label
                              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                                videoUploading
                                  ? "border-amber-300 bg-amber-50/50"
                                  : "border-forest/20 bg-white hover:border-forest/40 hover:bg-forest/5"
                              }`}
                            >
                              {videoUploading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <LoaderCircle className="size-8 animate-spin text-forest" />
                                  <p className="text-xs font-bold text-forest">Đang tải và lưu video vào thư mục server...</p>
                                  <p className="text-[10px] text-ink-muted">Vui lòng đợi giây lát</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="grid size-12 place-items-center rounded-full bg-forest/8 text-forest">
                                    <Upload className="size-6" />
                                  </div>
                                  <p className="text-xs font-bold text-ink">
                                    Bấm vào đây để chọn video từ máy tính của bạn
                                  </p>
                                  <p className="text-[11px] text-ink-muted">
                                    Hỗ trợ định dạng MP4, WebM, MOV · Dung lượng tối đa 50MB
                                  </p>
                                </div>
                              )}
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                                className="hidden"
                                disabled={videoUploading}
                                onChange={handleVideoUpload}
                              />
                            </label>
                            {videoUploadError ? (
                              <p className="mt-2 text-xs font-semibold text-red-600">
                                {videoUploadError}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Link tab */
                      <div className="mt-4 space-y-3">
                        <label className="block">
                          <span className={inputLabel}>Đường dẫn video ngoài</span>
                          <input
                            name="campaign-video-url"
                            type="url"
                            className="input-field mt-1.5 bg-white"
                            placeholder="https://www.youtube.com/watch?v=... hoặc https://vimeo.com/..."
                            value={
                              draft.videoUrl && !draft.videoUrl.startsWith("/uploads/")
                                ? draft.videoUrl
                                : ""
                            }
                            onChange={(event) => {
                              const val = event.target.value;
                              updateDraft("videoUrl", val);
                              updateDraft("hasVideo", Boolean(val.trim()));
                            }}
                          />
                        </label>
                        {draft.videoUrl && !draft.videoUrl.startsWith("/uploads/") ? (
                          <div className="rounded-xl border border-line bg-white p-3">
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                              <BadgeCheck className="size-4" /> Đã ghi nhận đường dẫn video
                            </p>
                            <p className="mt-1 truncate text-xs text-ink-soft">
                              {draft.videoUrl}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Story Textarea with Rich Toolbar & Live Preview */}
                  <div>
                    {/* Input file ẩn cho upload ảnh câu chuyện */}
                    <input
                      ref={storyFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleStoryImageUpload}
                    />

                    {/* Thanh tiêu đề và chuyển đổi tab Soạn thảo / Xem trước */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <span className={inputLabel}>Câu chuyện dự án (Markdown)</span>
                        <span className="rounded-full bg-forest/5 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                          {storyWordCount} từ
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowStoryAiPanel((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/5 px-3 py-1 text-xs font-bold text-forest transition hover:border-forest hover:bg-forest/15"
                        >
                          <Sparkles className="size-3 text-forest" />
                          {showStoryAiPanel ? "Đóng trợ lý AI" : "AI Viết mẫu & Sửa lỗi"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowStoryGuide((prev) => !prev)}
                          className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-forest/5"
                        >
                          <Lightbulb className="size-3.5 text-amber-500" />
                          {showStoryGuide ? "Đóng hướng dẫn" : "Hướng dẫn"}
                        </button>

                        <div className="flex rounded-lg border border-line bg-[#f0eee6] p-0.5 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setStoryTab("edit")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                              storyTab === "edit"
                                ? "bg-white text-ink shadow-sm"
                                : "text-ink-soft hover:text-ink"
                            }`}
                          >
                            <Edit3 className="size-3.5" />
                            Soạn thảo
                          </button>
                          <button
                            type="button"
                            onClick={() => setStoryTab("preview")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                              storyTab === "preview"
                                ? "bg-white text-coral-dark shadow-sm"
                                : "text-ink-soft hover:text-ink"
                            }`}
                          >
                            <Eye className="size-3.5" />
                            Xem trước
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Khung AI gọn: Viết mẫu từ ý tưởng HOẶC Sửa lỗi & Góp ý */}
                    {showStoryAiPanel && (
                      <div className="mt-3 rounded-2xl border border-forest/25 bg-[#f4f7ee] p-3.5 text-xs">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={storyDetailsInput}
                            onChange={(e) => setStoryDetailsInput(e.target.value)}
                            placeholder="Nhập ý tưởng, điểm nổi bật sản phẩm để AI viết bài mẫu..."
                            className="input-field flex-1 bg-white py-2 text-xs"
                          />
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              disabled={inlineAiLoading.story}
                              onClick={() => void handleInlineGenerateStory("WRITE_SAMPLE")}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-bold text-white transition hover:bg-forest/90 disabled:opacity-50"
                            >
                              {inlineAiLoading.story ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="size-3.5" />
                              )}
                              Viết bài mẫu
                            </button>
                            <button
                              type="button"
                              disabled={inlineAiLoading.story || draft.story.trim().length < 10}
                              onClick={() => void handleInlineGenerateStory("REVIEW_AND_COACH")}
                              title="Sửa lỗi câu chữ trên bài bạn đang viết và tạo sẵn các mục gợi ý còn thiếu"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-forest/40 bg-white px-3 py-2 text-xs font-bold text-forest transition hover:bg-forest/10 disabled:opacity-40"
                            >
                              Sửa lỗi & Góp ý
                            </button>
                          </div>
                        </div>

                        {inlineAiNotice && step === 1 && !inlineAiLoading.story && (
                          <p className="mt-2.5 text-xs text-amber-800">⚠️ {inlineAiNotice}</p>
                        )}

                        {storySuggestion && !inlineAiLoading.story && (
                          <div className="mt-3 space-y-3 border-t border-forest/15 pt-3">
                            <div>
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <p className="font-bold text-forest">
                                  {storySuggestion.mode === "REVIEW_AND_COACH"
                                    ? `1. Bản đã sửa lỗi câu chữ${storySuggestion.changesSummary ? ` (${storySuggestion.changesSummary})` : ""}:`
                                    : "Bài viết mẫu đề xuất:"}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateDraft("story", storySuggestion.storyMarkdown);
                                    if (storySuggestion.risksMarkdown) {
                                      updateDraft("risks", storySuggestion.risksMarkdown);
                                    }
                                    toast.success(
                                      storySuggestion.mode === "REVIEW_AND_COACH"
                                        ? "Đã áp dụng bản sửa lỗi câu chữ!"
                                        : "Đã áp dụng bài viết mẫu & rủi ro từ AI!",
                                    );
                                  }}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-forest px-2.5 py-1 text-[11px] font-bold text-white hover:bg-forest/90"
                                >
                                  <Check className="size-3" />
                                  {storySuggestion.mode === "REVIEW_AND_COACH"
                                    ? "Áp dụng bản đã sửa lỗi"
                                    : "Áp dụng vào bài viết"}
                                </button>
                              </div>
                              <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-white p-3 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-soft">
                                {storySuggestion.storyMarkdown}
                              </div>
                            </div>

                            {/* Các mục gợi ý bổ sung kèm sẵn nội dung sửa đổi để chỉnh trực tiếp và chèn */}
                            {storySuggestion.suggestedAdditions &&
                              storySuggestion.suggestedAdditions.length > 0 && (
                                <div className="space-y-2">
                                  <p className="font-bold text-forest">
                                    2. Gợi ý bổ sung (bạn có thể sửa trực tiếp nội dung bên dưới rồi bấm chèn):
                                  </p>
                                  {storySuggestion.suggestedAdditions.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="rounded-xl border border-forest/20 bg-white p-3"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <span className="font-display text-xs font-extrabold text-ink">
                                            💡 {item.title}
                                          </span>
                                          {item.reason && (
                                            <span className="ml-2 text-[11px] text-ink-muted">
                                              — {item.reason}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            updateDraft(
                                              "story",
                                              `${draft.story.trim()}\n\n${item.content.trim()}\n`,
                                            );
                                            setStorySuggestion((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    suggestedAdditions:
                                                      prev.suggestedAdditions?.filter(
                                                        (_, i) => i !== idx,
                                                      ),
                                                  }
                                                : null,
                                            );
                                            toast.success(
                                              `Đã chèn mục "${item.title}" vào cuối bài viết!`,
                                            );
                                          }}
                                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-forest/30 bg-forest/10 px-2.5 py-1 text-[11px] font-bold text-forest hover:bg-forest/20"
                                        >
                                          + Chèn mục này vào bài
                                        </button>
                                      </div>
                                      <textarea
                                        rows={3}
                                        value={item.content}
                                        onChange={(e) => {
                                          const newVal = e.target.value;
                                          setStorySuggestion((prev) => {
                                            if (!prev || !prev.suggestedAdditions) return prev;
                                            const next = [...prev.suggestedAdditions];
                                            next[idx] = { ...next[idx], content: newVal };
                                            return { ...prev, suggestedAdditions: next };
                                          });
                                        }}
                                        className="mt-2 w-full rounded-lg border border-line bg-[#faf9f5] p-2 font-mono text-[11px] leading-relaxed text-ink focus:bg-white focus:outline-none"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                            {/* Gợi ý ngắn khi ở chế độ Viết bài mẫu */}
                            {(!storySuggestion.suggestedAdditions ||
                              storySuggestion.suggestedAdditions.length === 0) &&
                              storySuggestion.writingTips &&
                              storySuggestion.writingTips.length > 0 && (
                                <div className="rounded-xl bg-white/80 px-3 py-2 text-[11px] text-ink-soft">
                                  <p className="font-bold text-forest">
                                    💡 Lưu ý để bài viết thuyết phục hơn:
                                  </p>
                                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                    {storySuggestion.writingTips.map((tip, i) => (
                                      <li key={i}>{tip}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                            {storySuggestion.suggestedAdditions &&
                              storySuggestion.suggestedAdditions.length > 0 && (
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const extraBlocks = (
                                        storySuggestion.suggestedAdditions || []
                                      )
                                        .map((item) => item.content.trim())
                                        .filter(Boolean)
                                        .join("\n\n");
                                      updateDraft(
                                        "story",
                                        `${storySuggestion.storyMarkdown.trim()}${extraBlocks ? `\n\n${extraBlocks}` : ""}`,
                                      );
                                      if (storySuggestion.risksMarkdown) {
                                        updateDraft("risks", storySuggestion.risksMarkdown);
                                      }
                                      setShowStoryAiPanel(false);
                                      toast.success(
                                        "Đã áp dụng bản sửa lỗi kèm toàn bộ mục gợi ý bổ sung!",
                                      );
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest/90"
                                  >
                                    <Check className="size-3.5" /> Áp dụng cả sửa lỗi & tất cả mục gợi ý
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hộp hướng dẫn viết câu chuyện (Collapsible) */}
                    {showStoryGuide && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 text-xs text-ink-soft">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                              <Sparkles className="size-4 text-amber-600" />
                              Cấu trúc câu chuyện thu hút người ủng hộ
                            </h4>
                            <p className="mt-1 text-amber-900/80">
                              Một câu chuyện chi tiết, nhiều hình ảnh minh họa chân thực giúp tỷ lệ gọi vốn thành công tăng gấp 3 lần:
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={insertStoryTemplate}
                            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-amber-700"
                          >
                            + Chèn mẫu chuẩn
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-2 border-t border-amber-200/60">
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="font-bold text-ink">1. Ý tưởng & Động lực ra đời</p>
                            <p className="mt-0.5 text-ink-muted">Chia sẻ câu chuyện thật, vấn đề bạn gặp phải và động lực tạo ra sản phẩm.</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="font-bold text-ink">2. Tính năng & Ảnh sản phẩm</p>
                            <p className="mt-0.5 text-ink-muted">Chèn ảnh nguyên mẫu thực tế (dùng nút <strong>+ Tải ảnh</strong>), nêu điểm độc đáo.</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="font-bold text-ink">3. Đội ngũ & Xưởng gia công</p>
                            <p className="mt-0.5 text-ink-muted">Minh bạch quy trình sản xuất, tay nghề thợ để tạo dựng lòng tin.</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="font-bold text-ink">4. Lịch trình giao quà</p>
                            <p className="mt-0.5 text-ink-muted">Liệt kê các mốc tiến độ cụ thể từng tháng để người ủng hộ yên tâm theo dõi.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Thanh công cụ định dạng Markdown gọn 1 hàng */}
                    {storyTab === "edit" && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-[#faf9f5] px-2.5 py-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = "\n\n## Tiêu đề phần mới\n\nNội dung chi tiết...";
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          + Tiêu đề
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = "\n\n### Điểm nổi bật\n\nNội dung mô tả...";
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          + Mục nhỏ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = " **nội dung in đậm** ";
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink hover:bg-forest/5"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = '\n\n> "Trích dẫn thông điệp..."\n\n';
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          + Trích dẫn
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = "\n\n- Đặc điểm 1\n- Đặc điểm 2\n\n";
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          + Danh sách
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tableSnippet = "\n\n| Thông số | Chi tiết |\n|---|---|\n| Kích thước | Tiêu chuẩn |\n| Bảo hành | 12 tháng |\n\n";
                            updateDraft("story", (draft.story || "") + tableSnippet);
                          }}
                          className="flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          <Table className="size-3" />
                          + Bảng
                        </button>

                        <div className="mx-1 h-4 w-px bg-line" />

                        <button
                          type="button"
                          disabled={storyImageUploading}
                          onClick={() => storyFileInputRef.current?.click()}
                          className="flex items-center gap-1 rounded-md border border-coral bg-coral/10 px-2.5 py-1 text-xs font-bold text-coral-dark transition-colors hover:bg-coral/20 disabled:opacity-50"
                        >
                          {storyImageUploading ? (
                            <>
                              <LoaderCircle className="size-3 animate-spin" /> Đang tải...
                            </>
                          ) : (
                            <>
                              <Upload className="size-3 text-coral" /> + Tải ảnh
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = window.prompt("Nhập đường dẫn hình ảnh (URL):", "https://images.unsplash.com/...");
                            if (url) {
                              const snippet = `\n\n![Ảnh minh họa](${url.trim()})\n*Hình: Ảnh minh họa*\n\n`;
                              updateDraft("story", (draft.story || "") + snippet);
                            }
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-forest/5"
                        >
                          + Link ảnh
                        </button>
                      </div>
                    )}

                    {/* Vùng soạn thảo hoặc Xem trước */}
                    {storyTab === "edit" ? (
                      <textarea
                        name="project-story"
                        rows={18}
                        className="input-field mt-2 min-h-[460px] h-[520px] resize-y font-mono text-sm leading-relaxed p-4 bg-white focus:bg-white shadow-inner"
                        placeholder="Hãy kể câu chuyện truyền cảm hứng về dự án của bạn..."
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
                    ) : (
                      <div className="mt-2 min-h-[460px] max-h-[700px] overflow-y-auto rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-inner">
                        {draft.story?.trim() ? (
                          <StoryMarkdown content={draft.story} />
                        ) : (
                          <div className="grid min-h-[300px] place-items-center text-center text-ink-muted">
                            <div>
                              <Edit3 className="mx-auto size-8 opacity-40 mb-2" />
                              <p className="text-sm font-medium">Chưa có nội dung câu chuyện.</p>
                              <p className="mt-1 text-xs">Hãy chuyển sang tab "Soạn thảo" để bắt đầu viết hoặc chèn mẫu có sẵn.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="mt-1.5 block text-[11px] text-ink-muted">
                      {storyWordCount} từ · Hỗ trợ đầy đủ định dạng Markdown, tiêu đề, danh sách, bảng biểu và hình ảnh minh họa.
                    </span>
                  </div>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!rewardSuggestion && !inlineAiLoading.rewards) {
                          void handleInlineGenerateRewards();
                        } else {
                          setShowRewardAiPanel((prev) => !prev);
                        }
                      }}
                      disabled={inlineAiLoading.rewards}
                      className="button-ghost border border-forest/40 bg-forest/10 text-forest transition hover:bg-forest/20 hover:border-forest disabled:opacity-50"
                    >
                      {inlineAiLoading.rewards ? (
                        <LoaderCircle className="size-4 animate-spin text-forest" />
                      ) : (
                        <Sparkles className="size-4 text-forest" />
                      )}
                      {inlineAiLoading.rewards
                        ? "AI đang thiết kế gói quà..."
                        : "AI Thiết kế cơ cấu gói quà"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRewards((current) => [
                          ...current,
                          {
                            id: Date.now(),
                            title: "Gói mới",
                            amount: "",
                            delivery: formatFutureMonthYear(3),
                            limit: "100",
                          },
                        ])
                      }
                      className="button-secondary"
                    >
                      <Plus className="size-4" /> Thêm gói ủng hộ
                    </button>
                  </div>
                </div>

                {/* Contextual Inline AI: Reward Tiers Preview Panel */}
                {showRewardAiPanel && (
                  <div className="mt-5 rounded-2xl border border-forest/25 bg-[#f4f7ee] p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest/15 pb-3">
                      <div className="flex items-center gap-1.5 font-bold text-forest">
                        <Sparkles className="size-3.5 text-forest" />
                        <span>
                          Trợ lý AI — Cơ cấu gói thưởng đề xuất (Mục tiêu:{" "}
                          {formatVnd(Number(draft.goal) || 50000000, true)})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={inlineAiLoading.rewards}
                          onClick={() => void handleInlineGenerateRewards()}
                          className="font-bold text-forest hover:underline disabled:opacity-50"
                        >
                          {inlineAiLoading.rewards ? "Đang tính lại..." : "↻ Tính toán lại"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRewardAiPanel(false)}
                          className="text-[11px] font-semibold text-ink-muted hover:text-ink"
                        >
                          Thu gọn ✕
                        </button>
                      </div>
                    </div>

                    {inlineAiNotice && step === 2 && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                        ⚠️ {inlineAiNotice}
                      </div>
                    )}

                    {rewardSuggestion && rewardSuggestion.tiers.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {rewardSuggestion.strategicAdvice && (
                          <p className="rounded-xl bg-white/80 px-3 py-2 text-[11px] text-ink-soft">
                            💡 <strong>Chiến lược giá:</strong> {rewardSuggestion.strategicAdvice}
                          </p>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {rewardSuggestion.tiers.map((tier, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col justify-between rounded-xl border border-forest/20 bg-white p-3.5 shadow-xs"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-extrabold text-forest">
                                    {tier.tierType || `GÓI #${idx + 1}`}
                                  </span>
                                  <span className="font-display text-sm font-extrabold text-ink">
                                    {formatVnd(Number(tier.amount) || 0, true)}
                                  </span>
                                </div>
                                <p className="mt-2 font-display text-xs font-extrabold text-ink">
                                  {tier.title}
                                </p>
                                {tier.description && (
                                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                                    {tier.description}
                                  </p>
                                )}
                              </div>
                              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                                <span className="text-[10px] text-ink-muted">
                                  Giới hạn: <strong>{tier.limit}</strong> suất · Giao:{" "}
                                  <strong>{tier.delivery}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRewards((current) => [
                                      ...current.filter(
                                        (r) => r.title.trim() || Number(r.amount) > 0,
                                      ),
                                      {
                                        id: Date.now() + idx,
                                        title: tier.title,
                                        amount: tier.amount,
                                        delivery: tier.delivery,
                                        limit: tier.limit,
                                      },
                                    ]);
                                    toast.success(`✨ Đã thêm "${tier.title}" vào danh sách!`);
                                  }}
                                  className="rounded-lg border border-forest/30 px-2.5 py-1 text-[11px] font-bold text-forest hover:bg-forest/10"
                                >
                                  + Thêm gói này
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRewards(
                                rewardSuggestion.tiers.map((t, idx) => ({
                                  id: Date.now() + idx,
                                  title: t.title,
                                  amount: t.amount,
                                  delivery: t.delivery,
                                  limit: t.limit,
                                })),
                              );
                              setShowRewardAiPanel(false);
                              toast.success(
                                `✨ Đã áp dụng trọn bộ ${rewardSuggestion.tiers.length} gói quà từ AI!`,
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-forest/90"
                          >
                            <Check className="size-3.5" /> Áp dụng trọn bộ ({rewardSuggestion.tiers.length} gói)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-7 space-y-4">
                  {rewards.map((reward, index) => (
                    <div
                      key={reward.id}
                      className="rounded-[16px] border border-line bg-[#faf9f5] p-5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-display font-extrabold">
                          Gói #{index + 1}
                        </p>
                        <button
                          type="button"
                          disabled={rewards.length <= 1}
                          onClick={() =>
                            setRewards((current) =>
                              current.filter((item) => item.id !== reward.id),
                            )
                          }
                          className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Xóa gói ủng hộ ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
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
                      Quyền chỉ có hiệu lực trong chiến dịch này.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCollaborators((current) => [
                        ...current,
                        {
                          id: Date.now(),
                          email: "",
                          name: "Thành viên mới",
                          canUpdate: true,
                          canReply: true,
                          canViewAi: false,
                        },
                      ])
                    }
                    className="button-secondary"
                  >
                    <Plus className="size-4" /> Mời thành viên
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
                            {member.name
                              .split(" ")
                              .slice(-2)
                              .map((part) => part[0])
                              .join("")}
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
                          aria-label={`Gỡ ${member.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          ["canUpdate", "Đăng update"],
                          ["canReply", "Trả lời comment"],
                          ["canViewAi", "Xem AI"],
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
                              className="accent-[#f36545]"
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
                  {draft.videoUrl && draft.videoUrl.startsWith("/uploads/") ? (
                    <video
                      controls
                      className="aspect-[16/8] w-full bg-black object-contain"
                      src={draft.videoUrl}
                    />
                  ) : (
                    <CampaignVisual
                      motif="coffee"
                      palette="ember"
                      label={
                        draft.title
                          ? draft.title.split(/[—-]/)[0].trim().slice(0, 24)
                          : "DỰ ÁN MỚI"
                      }
                      imageSrc={
                        draft.imageUrl ||
                        (draft.title.toLowerCase().includes("orbit")
                          ? "/images/campaigns/orbit-one.png"
                          : undefined)
                      }
                      imageAlt="Bản xem trước hình ảnh chiến dịch"
                      className="aspect-[16/8]"
                    />
                  )}
                  <div className="bg-white p-5 sm:p-6">
                    <span className="rounded-full bg-[#fff0e9] px-2.5 py-1 text-[10px] font-bold text-coral-dark">
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
                        <p className="text-[10px] text-ink-muted">
                          Mục tiêu gọi vốn
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-extrabold">
                          {draft.duration} ngày
                        </p>
                        <p className="text-[10px] text-ink-muted">Thời lượng</p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-extrabold">
                          {rewards.length}
                        </p>
                        <p className="text-[10px] text-ink-muted">Gói ủng hộ</p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-extrabold">
                          {addOns.length}
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          Phần bổ sung
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Contextual Inline AI: Pre-flight Audit */}
                <div className="mt-6 rounded-2xl border border-forest/30 bg-[#edf1e4]/70 p-5">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-forest">
                        <Sparkles className="size-4" /> AI Thẩm định trước khi gửi duyệt
                      </span>
                      <h4 className="mt-1 font-display text-base font-extrabold text-ink">
                        Kiểm tra chất lượng hồ sơ & phát hiện điểm nghẽn
                      </h4>
                      <p className="mt-1 text-xs text-ink-soft">
                        AI rà soát tiêu đề, câu chuyện, rủi ro và cấu trúc gói quà để tối ưu khả năng được duyệt ngay lần đầu.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={inlineAiLoading.audit}
                      onClick={() => void handleInlineAudit()}
                      className="button-primary shrink-0 text-xs disabled:opacity-50"
                    >
                      {inlineAiLoading.audit ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      {inlineAiLoading.audit
                        ? "Đang thẩm định..."
                        : auditResult
                          ? "Thẩm định lại"
                          : "Thẩm định hồ sơ bằng AI"}
                    </button>
                  </div>

                  {inlineAiNotice && step === 4 && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      ⚠️ {inlineAiNotice}
                    </div>
                  )}

                  {auditResult && (
                    <div className="mt-4 space-y-4 border-t border-forest/15 pt-4 text-xs">
                      <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3.5">
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-forest font-display text-lg font-black text-lime">
                            {auditResult.grade}
                          </span>
                          <div>
                            <p className="text-[11px] font-bold text-ink-muted">
                              Điểm thẩm định AI: {auditResult.readinessScore}/100
                            </p>
                            <p className="mt-0.5 font-display text-sm font-extrabold text-ink">
                              {auditResult.verdict}
                            </p>
                          </div>
                        </div>
                      </div>

                      {auditResult.strengths?.length > 0 && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                          <p className="font-bold text-emerald-900">Điểm mạnh đã hoàn thiện:</p>
                          <ul className="mt-1.5 space-y-1 text-emerald-800">
                            {auditResult.strengths.map((str, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check className="size-3.5 shrink-0 text-emerald-600" />
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {auditResult.improvements?.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-bold text-ink">Khuyến nghị cải thiện:</p>
                          {auditResult.improvements.map((imp) => (
                            <div
                              key={imp.id}
                              className="flex flex-col justify-between gap-2 rounded-xl border border-line bg-white p-3.5 sm:flex-row sm:items-center"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      imp.priority === "HIGH"
                                        ? "bg-red-100 text-red-700"
                                        : imp.priority === "MEDIUM"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {imp.priority === "HIGH"
                                      ? "Quan trọng"
                                      : imp.priority === "MEDIUM"
                                        ? "Nên bổ sung"
                                        : "Gợi ý"}
                                  </span>
                                  <span className="font-bold text-ink">{imp.title}</span>
                                </div>
                                <p className="mt-1 text-ink-soft">{imp.advice}</p>
                              </div>
                              {typeof imp.stepIndex === "number" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttemptedStep(null);
                                    setStep(Math.max(0, Math.min(4, imp.stepIndex)));
                                  }}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-[#faf9f5] px-3 py-1.5 text-[11px] font-bold text-ink hover:bg-forest/5"
                                >
                                  Sửa ở Bước {imp.stepIndex + 1} <ArrowRight className="size-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-line bg-[#faf9f5] p-5">
                  <p className="font-display font-extrabold">
                    Checklist gửi duyệt
                  </p>
                  <ul className="mt-4 space-y-3 text-xs">
                    {checklist.map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <span
                          className={`grid size-5 place-items-center rounded-full ${item.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {item.ok ? <Check className="size-3" /> : "!"}
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
                  onClick={() => void submit()}
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
                  Gửi xét duyệt
                </button>
              )}
            </div>
          </div>

          <aside className="xl:sticky xl:top-24">
            <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-sm">
              {/* Phần trên: Điểm sẵn sàng (Readiness Score) */}
              <div className="bg-forest p-6 text-white">
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-lime">
                    <WandSparkles className="size-4" /> Độ sẵn sàng
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      readiness >= 70
                        ? "border border-emerald-400/30 bg-emerald-500/20 text-emerald-300"
                        : readiness >= 35
                          ? "border border-amber-400/30 bg-amber-500/20 text-amber-300"
                          : "border border-red-400/30 bg-red-500/20 text-red-300"
                    }`}
                  >
                    {readiness >= 70
                      ? "Đạt chuẩn duyệt"
                      : readiness >= 35
                        ? "Đang hoàn thiện"
                        : "Khởi tạo ban đầu"}
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-2.5">
                  <p
                    className={`font-display text-5xl font-extrabold ${
                      readiness >= 70
                        ? "text-lime"
                        : readiness >= 35
                          ? "text-amber-300"
                          : "text-white"
                    }`}
                  >
                    {readiness}
                  </p>
                  <p className="pb-1 text-sm text-white/45">/ 100</p>
                </div>
                <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      readiness >= 70
                        ? "bg-lime"
                        : readiness >= 35
                          ? "bg-amber-400"
                          : "bg-red-400"
                    }`}
                    style={{ width: `${readiness}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-white/65">
                  {readiness >= 70
                    ? "✓ Bản nháp đã đủ điều kiện nộp xét duyệt tới Quản trị viên."
                    : "Cần đạt tối thiểu 70/100 điểm để gửi xét duyệt."}
                </p>
              </div>

              {/* Phần dưới: Tiêu chí trực tiếp theo bước */}
              <div className="p-5">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <p className="text-xs font-extrabold text-ink">
                    Tiêu chí {wizardSteps[step]?.label}
                  </p>
                  <span className="rounded-md bg-forest/8 px-2 py-0.5 text-[10px] font-bold text-forest">
                    Bước {step + 1}/5
                  </span>
                </div>

                {step === 0 && (
                  <div className="mt-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      {draft.title.trim().length >= 20 ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 font-bold text-amber-500">!</span>
                      )}
                      <span
                        className={
                          draft.title.trim().length >= 20 ? "text-ink" : "text-amber-800"
                        }
                      >
                        {draft.title.trim().length >= 20
                          ? `Tiêu đề chuẩn (${draft.title.trim().length}/90 ký tự)`
                          : "Tiêu đề nên từ 20–90 ký tự"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {draft.blurb.trim().length >= 50 ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 font-bold text-amber-500">!</span>
                      )}
                      <span
                        className={
                          draft.blurb.trim().length >= 50 ? "text-ink" : "text-amber-800"
                        }
                      >
                        {draft.blurb.trim().length >= 50
                          ? "Mô tả ngắn đầy đủ ý"
                          : "Mô tả ngắn nên từ 50–180 ký tự"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {Number(draft.goal) >= 10_000_000 ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 font-bold text-amber-500">!</span>
                      )}
                      <span
                        className={
                          Number(draft.goal) >= 10_000_000 ? "text-ink" : "text-amber-800"
                        }
                      >
                        {Number(draft.goal) >= 10_000_000
                          ? `Mục tiêu: ${formatVnd(Number(draft.goal), true)}`
                          : "Mục tiêu tối thiểu 10.000.000 đ"}
                      </span>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      {draft.imageUrl ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 font-bold text-amber-500">!</span>
                      )}
                      <span className={draft.imageUrl ? "text-ink" : "text-amber-800"}>
                        {draft.imageUrl ? "Đã có ảnh bìa đại diện" : "Chưa có ảnh bìa đại diện"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {draft.hasVideo || draft.videoUrl ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 text-ink-muted">•</span>
                      )}
                      <span
                        className={
                          draft.hasVideo || draft.videoUrl ? "text-ink" : "text-ink-muted"
                        }
                      >
                        {draft.hasVideo || draft.videoUrl
                          ? "Đã có video giới thiệu"
                          : "Video giới thiệu (khuyến nghị)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {draft.story.trim().length >= 300 ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 font-bold text-amber-500">!</span>
                      )}
                      <span
                        className={
                          draft.story.trim().length >= 300 ? "text-ink" : "text-amber-800"
                        }
                      >
                        {draft.story.trim().length >= 300
                          ? `Câu chuyện chi tiết (${storyWordCount} từ)`
                          : "Câu chuyện cần tối thiểu 300 ký tự"}
                      </span>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      {rewards.filter(
                        (r) =>
                          r.title.trim().length >= 3 &&
                          Number(r.amount) >= 50_000 &&
                          /^\d{2}\/\d{4}$/.test(r.delivery.trim()),
                      ).length >= 2 ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 font-bold text-amber-500">!</span>
                      )}
                      <span className="text-ink">
                        {
                          rewards.filter(
                            (r) =>
                              r.title.trim().length >= 3 &&
                              Number(r.amount) >= 50_000 &&
                              /^\d{2}\/\d{4}$/.test(r.delivery.trim()),
                          ).length
                        }{" "}
                        gói quà hợp lệ (khuyên tạo 2–4 gói)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {rewards.some(
                        (r) =>
                          r.title.toLowerCase().includes("sớm") ||
                          r.title.toLowerCase().includes("early"),
                      ) ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 text-ink-muted">•</span>
                      )}
                      <span className="text-ink-soft">
                        {rewards.some(
                          (r) =>
                            r.title.toLowerCase().includes("sớm") ||
                            r.title.toLowerCase().includes("early"),
                        )
                          ? "Đã có gói Early Bird kích cầu"
                          : "Khuyên có gói Early Bird ưu đãi sớm"}
                      </span>
                    </div>
                  </div>
                )}

                {step >= 3 && (
                  <div className="mt-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      {Number(draft.shippingFee) >= 0 && draft.shippingFee !== "" ? (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="shrink-0 font-bold text-amber-500">!</span>
                      )}
                      <span className="text-ink">
                        Phí vận chuyển:{" "}
                        <strong>{formatVnd(Number(draft.shippingFee) || 0, true)}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-ink-muted">•</span>
                      <span className="text-ink-muted">
                        {collaborators.length > 0
                          ? `${collaborators.length} cộng tác viên được phân quyền`
                          : "Chưa thêm cộng tác viên (tùy chọn)"}
                      </span>
                    </div>
                    {step === 4 && (
                      <p className="border-t border-line pt-2.5 text-[11px] text-ink-muted">
                        Sau khi gửi xét duyệt, Quản trị viên sẽ phản hồi trong vòng 24–48 giờ làm việc.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        open={confirmDeleteOpen}
        title="Xác nhận xóa bản nháp"
        description="Bản nháp chiến dịch sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục."
        size="sm"
        locked={deleting}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <div className="space-y-4">
          {draft.title.trim() ? (
            <p className="rounded-xl border border-line bg-[#faf9f5] px-3.5 py-2.5 text-xs font-semibold text-ink">
              {draft.title.trim()}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmDeleteOpen(false)}
              className="button-secondary min-h-10 px-4 text-xs"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void deleteDraft()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa bản nháp
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
