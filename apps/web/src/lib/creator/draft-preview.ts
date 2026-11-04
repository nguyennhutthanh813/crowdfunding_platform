import type {
  CampaignDraftAddOn,
  CampaignDraftCollaborator,
  CampaignDraftFields,
  CampaignDraftReward,
  CampaignDraftSnapshot,
} from "@/lib/api/contracts";
import { getSampleCoverArt } from "@/lib/campaign/sample-cover-art";

type DraftPayload = Record<string, unknown>;

type DraftResult =
  | { value: CampaignDraftSnapshot; error: null }
  | { value: null; error: string };

const textLimits: Record<Exclude<keyof CampaignDraftFields, "hasVideo" | "coverAssetId">, number> = {
  title: 90,
  blurb: 180,
  category: 60,
  goal: 15,
  duration: 3,
  location: 100,
  story: 3000,
  risks: 1500,
  shippingFee: 12,
};

const numberFields = new Set<keyof CampaignDraftFields>([
  "goal",
  "duration",
  "shippingFee",
]);

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function shortText(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max ? value.trim() : null;
}

function parseReward(value: unknown): CampaignDraftReward | null {
  const item = objectValue(value);
  if (!item || !Number.isSafeInteger(item.id)) return null;
  const title = shortText(item.title, 80);
  const amount = shortText(item.amount, 15);
  const delivery = shortText(item.delivery, 20);
  const limit = shortText(item.limit, 10);
  if ([title, amount, delivery, limit].some((field) => field === null)) {
    return null;
  }
  if (!/^\d*$/.test(amount!) || !/^\d*$/.test(limit!)) return null;
  return { id: item.id as number, title: title!, amount: amount!, delivery: delivery!, limit: limit! };
}

function parseAddOn(value: unknown): CampaignDraftAddOn | null {
  const item = objectValue(value);
  if (!item || !Number.isSafeInteger(item.id)) return null;
  const title = shortText(item.title, 80);
  const amount = shortText(item.amount, 15);
  if (title === null || amount === null || !/^\d*$/.test(amount)) return null;
  return { id: item.id as number, title, amount };
}

function parseCollaborator(value: unknown): CampaignDraftCollaborator | null {
  const item = objectValue(value);
  if (!item || !Number.isSafeInteger(item.id)) return null;
  const email = shortText(item.email, 254);
  const name = shortText(item.name, 80);
  if (
    email === null ||
    name === null ||
    typeof item.canUpdate !== "boolean" ||
    typeof item.canReply !== "boolean" ||
    typeof item.canViewAi !== "boolean"
  ) {
    return null;
  }
  return {
    id: item.id as number,
    email,
    name,
    canUpdate: item.canUpdate,
    canReply: item.canReply,
    canViewAi: item.canViewAi,
  };
}

function parseList<T>(
  payload: DraftPayload,
  key: "rewards" | "addOns" | "collaborators",
  max: number,
  parser: (value: unknown) => T | null,
) {
  const raw = payload[key];
  if (raw === undefined) return { value: undefined, valid: true };
  if (!Array.isArray(raw) || raw.length > max) {
    return { value: undefined, valid: false };
  }
  const value = raw.map(parser);
  return value.some((item) => item === null)
    ? { value: undefined, valid: false }
    : { value: value as T[], valid: true };
}

export function buildCampaignDraftSnapshot(
  payload: DraftPayload,
  current: CampaignDraftSnapshot | undefined,
  campaignId: string,
  ownerId: string,
): DraftResult {
  const rawDraft = objectValue(payload.draft);
  if (!rawDraft) {
    return {
      value: null,
      error: "Bản nháp gửi lên chưa đúng cấu trúc.",
    };
  }

  const nextDraft: Partial<CampaignDraftFields> = { ...(current?.draft ?? {}) };
  let changedFieldCount = 0;
  for (const [key, max] of Object.entries(textLimits) as Array<
    [Exclude<keyof CampaignDraftFields, "hasVideo" | "coverAssetId">, number]
  >) {
    if (rawDraft[key] === undefined) continue;
    const value = shortText(rawDraft[key], max);
    if (value === null || (numberFields.has(key) && !/^\d*$/.test(value))) {
      return {
        value: null,
        error: `Trường ${key} trong bản nháp chưa hợp lệ.`,
      };
    }
    nextDraft[key] = value;
    changedFieldCount += 1;
  }
  if (rawDraft.hasVideo !== undefined) {
    if (typeof rawDraft.hasVideo !== "boolean") {
      return { value: null, error: "Trạng thái video chưa hợp lệ." };
    }
    nextDraft.hasVideo = rawDraft.hasVideo;
    changedFieldCount += 1;
  }
  if (rawDraft.coverAssetId !== undefined) {
    if (typeof rawDraft.coverAssetId !== "string" ||
      (rawDraft.coverAssetId !== "" && !getSampleCoverArt(rawDraft.coverAssetId))) {
      return { value: null, error: "Ảnh minh họa được chọn không có trong thư viện mẫu." };
    }
    nextDraft.coverAssetId = rawDraft.coverAssetId;
    changedFieldCount += 1;
  }

  const rewards = parseList(payload, "rewards", 6, parseReward);
  const addOns = parseList(payload, "addOns", 6, parseAddOn);
  const collaborators = parseList(
    payload,
    "collaborators",
    5,
    parseCollaborator,
  );
  if (!rewards.valid || !addOns.valid || !collaborators.valid) {
    return {
      value: null,
      error: "Gói ủng hộ, phần bổ sung hoặc cộng tác viên chưa đúng cấu trúc.",
    };
  }
  if (
    changedFieldCount === 0 &&
    rewards.value === undefined &&
    addOns.value === undefined &&
    collaborators.value === undefined
  ) {
    return { value: null, error: "Bản nháp chưa có nội dung để lưu." };
  }

  return {
    value: {
      campaignId,
      ownerId,
      savedAt: new Date().toISOString(),
      draft: nextDraft,
      rewards: rewards.value ?? current?.rewards,
      addOns: addOns.value ?? current?.addOns,
      collaborators: collaborators.value ?? current?.collaborators,
    },
    error: null,
  };
}
