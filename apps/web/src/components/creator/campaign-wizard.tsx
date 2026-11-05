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
import { useMemo, useRef, useState } from "react";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { StoryMarkdown } from "@/components/campaign/story-markdown";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";

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
    "ORBIT Mini bắt đầu từ mong muốn mang trải nghiệm pha ổn định vào những căn bếp có diện tích nhỏ. Bản mẫu hiện tại đã hoàn tất thử nghiệm nhiệt và chúng tôi đang chuẩn bị khuôn vỏ cho lô đầu tiên.",
  risks:
    "Tiến độ khuôn vỏ và nguồn cung cảm biến có thể ảnh hưởng lịch giao. Nhóm đã chuẩn bị nhà cung cấp dự phòng và biên độ lịch bốn tuần.",
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
  initialDraft?: Partial<DraftCampaign>;
  initialRewards?: DraftReward[];
  initialAddOns?: DraftAddOn[];
  initialCollaborators?: DraftCollaborator[];
  reviewFeedback?: string | null;
}) {
  const [activeCampaignId, setActiveCampaignId] = useState(campaignId);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
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

  const readiness = useMemo(() => {
    let score = 30;
    if (draft.title.length >= 30 && draft.title.length <= 70) score += 9;
    if (draft.blurb.length >= 60) score += 7;
    if (Number(draft.goal) > 0) score += 7;
    if (Number(draft.duration) >= 15 && Number(draft.duration) <= 60)
      score += 7;
    if (draft.imageUrl) score += 5;
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
        issues.push("Mục tiêu gọi vốn tối thiểu của bản demo là 10 triệu đồng.");
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
    setSaveNotice("Đã điền một ví dụ để bạn tham khảo");
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

## 4. Kế hoạch bàn giao & Cam kết
Lộ trình chi tiết từ khi kết thúc gọi vốn, sản xuất hàng loạt, kiểm định chất lượng đến khi đóng gói và giao tận tay bạn.`;

    if (
      !draft.story.trim() ||
      window.confirm("Bạn có muốn chèn khung câu chuyện mẫu? Nội dung hiện tại sẽ được thay thế bằng cấu trúc chuẩn.")
    ) {
      updateDraft("story", template);
    }
  };
  const saveDraft = async () => {
    setSaving(true);
    setSaveNotice("");
    try {
      const res = await clientRequest<{ data?: { campaignId?: string } }>(
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
      setSaveNotice("Đã lưu bản nháp vừa xong");
    } catch (error) {
      setSaveNotice(clientRequestMessage(error, "Chưa thể lưu bản nháp"));
    } finally {
      setSaving(false);
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
      const res = await clientRequest<{ data?: { campaignId?: string } }>(
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
                  campaignSlug
                    ? `/creator/campaigns/${campaignSlug}/manage?tab=review`
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
                disabled={saving}
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
              <span
                className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-xs text-ink-muted"
                role="status"
              >
                <span
                  className={`size-1.5 rounded-full ${saveNotice.startsWith("Chưa") ? "bg-red-500" : "bg-emerald-500"}`}
                />
                {saveNotice || "Bản nháp chưa có thay đổi mới"}
              </span>
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
                    <span className="mt-1 block text-right text-[10px] text-ink-muted">
                      {draft.title.length}/90
                    </span>
                  </label>
                  <label className="sm:col-span-2">
                    <span className={inputLabel}>Mô tả ngắn</span>
                    <textarea
                      name="campaign-blurb"
                      rows={3}
                      className="input-field mt-2 min-h-[110px] resize-y"
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
                    <span className="mt-1 block text-right text-[10px] text-ink-muted">
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
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f3f6e7] p-4 text-xs leading-5 text-[#53622f]">
                  <Info className="mt-0.5 size-4 shrink-0" /> Mục tiêu và thời
                  lượng là hai dữ liệu đầu vào quan trọng. Nên tính theo chi phí
                  thực tế thay vì cố đẩy điểm dự báo lên cao.
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
                          onClick={() => setShowStoryGuide((prev) => !prev)}
                          className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-forest/5"
                        >
                          <Lightbulb className="size-3.5 text-amber-500" />
                          {showStoryGuide ? "Đóng hướng dẫn" : "💡 Hướng dẫn viết"}
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

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-amber-900 border-t border-amber-200/60 pt-2 font-mono">
                          <span><code># Tiêu đề lớn</code></span>
                          <span><code>## Tiêu đề con</code></span>
                          <span><code>**In đậm**</code></span>
                          <span><code>&gt; Trích dẫn</code></span>
                          <span><code>- Danh sách</code></span>
                          <span><code>![Tên ảnh](đường_dẫn)</code></span>
                        </div>
                      </div>
                    )}

                    {/* Thanh công cụ định dạng Markdown nhanh */}
                    {storyTab === "edit" && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-[#faf9f5] p-2">
                        <span className="text-[11px] font-bold text-ink-muted px-1">Chèn nhanh:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = "\n\n## Tiêu đề phần mới\n\nNội dung chi tiết...";
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          + Tiêu đề lớn
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
                            const snippet = '\n\n> "Trích dẫn thông điệp truyền cảm hứng..."\n\n';
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          + Trích dẫn
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = "\n\n- Đặc điểm nổi bật 1\n- Đặc điểm nổi bật 2\n- Đặc điểm nổi bật 3\n\n";
                            updateDraft("story", (draft.story || "") + snippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5"
                        >
                          + Danh sách
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tableSnippet = "\n\n| Thông số | Chi tiết |\n|---|---|\n| Kích thước | Tiêu chuẩn gọn nhẹ |\n| Trọng lượng | 450g |\n| Bảo hành | 12 tháng |\n\n";
                            updateDraft("story", (draft.story || "") + tableSnippet);
                          }}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-forest/5 flex items-center gap-1"
                        >
                          <Table className="size-3" />
                          + Bảng thông số
                        </button>

                        <div className="h-4 w-px bg-line mx-1" />

                        {/* Nút tải ảnh trực tiếp từ máy */}
                        <button
                          type="button"
                          disabled={storyImageUploading}
                          onClick={() => storyFileInputRef.current?.click()}
                          className="rounded-md border border-coral bg-coral/10 px-2.5 py-1 text-xs font-bold text-coral-dark hover:bg-coral/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {storyImageUploading ? (
                            <>
                              <LoaderCircle className="size-3 animate-spin" /> Đang tải ảnh...
                            </>
                          ) : (
                            <>
                              <Upload className="size-3 text-coral" /> + Tải ảnh từ máy
                            </>
                          )}
                        </button>

                        {/* Nút dán link ảnh */}
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
                          + Link ảnh ngoài
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

                  <label>
                    <span className={inputLabel}>Rủi ro và thách thức</span>
                    <textarea
                      name="project-risks"
                      rows={6}
                      className="input-field mt-2 min-h-[160px] resize-y leading-7"
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

          <aside className="space-y-4 xl:sticky xl:top-24">
            <div className="rounded-[20px] bg-forest p-6 text-white">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-lime">
                  <WandSparkles className="size-4" /> Độ sẵn sàng
                </p>
                <span className="text-[10px] text-white/42">Điểm bản nháp</span>
              </div>
              <div className="mt-5 flex items-end gap-3">
                <p className="font-display text-5xl font-extrabold text-lime">
                  {readiness}
                </p>
                <p className="pb-1 text-sm text-white/45">/ 100</p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-lime transition-[width] duration-500"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-white/52">
                Điểm kiểm tra độ đầy đủ của bản nháp, không phải xác suất thành
                công cuối cùng.
              </p>
            </div>
            <div className="rounded-[20px] border border-line bg-white p-5">
              <p className="eyebrow text-coral">
                <Sparkles className="size-4" /> Gợi ý theo bước
              </p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-ink-soft">
                {step === 0 ? (
                  <>
                    <p className="flex gap-2">
                      <Target className="mt-0.5 size-4 shrink-0 text-coral" />{" "}
                      {Number(draft.goal) > 0
                        ? `Mục tiêu hiện tại là ${formatVnd(Number(draft.goal), true)}; hãy đối chiếu lại với bảng chi phí thực tế.`
                        : "Nhập mục tiêu từ chi phí sản xuất, vận hành và khoản dự phòng của nhóm."}
                    </p>
                    <p className="flex gap-2">
                      <CircleDollarSign className="mt-0.5 size-4 shrink-0 text-coral" />{" "}
                      {Number(draft.duration) >= 15 &&
                      Number(draft.duration) <= 60
                        ? `Thời lượng ${draft.duration} ngày nằm trong khoảng được phép.`
                        : "Thời lượng chiến dịch cần nằm trong khoảng 15–60 ngày."}
                    </p>
                  </>
                ) : step === 1 ? (
                  <>
                    <p>
                      • Câu chuyện nên có ít nhất 250–400 từ ở bản hoàn chỉnh.
                    </p>
                    <p>• Tách rõ lộ trình và rủi ro thay vì viết chung.</p>
                  </>
                ) : step === 2 ? (
                  <>
                    <p>
                      • Hai gói ủng hộ là vừa đủ ở bản đầu; phần bổ sung không
                      thay thế gói chính.
                    </p>
                    <p>• Không đặt quá nhiều lựa chọn gần giá nhau.</p>
                  </>
                ) : step === 3 ? (
                  <>
                    <p>
                      • Cộng tác viên không được đổi mục tiêu hoặc thực hiện
                      thao tác của quản trị viên.
                    </p>
                    <p>• Phần giao hàng hiện chỉ nhận địa chỉ tại Việt Nam.</p>
                  </>
                ) : (
                  <>
                    <p>• Readiness đã vượt ngưỡng gửi duyệt.</p>
                    <p>
                      • Quản trị viên vẫn là người quyết định cho giai đoạn chờ
                      mở.
                    </p>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
