// ═══════════════════════════════════════════
// Model Interfaces — Mapped from DB tables
// ═══════════════════════════════════════════

import type {
  AccountStatus,
  GlobalRole,
  CampaignStatus,
  CampaignMemberRole,
  MediaType,
  PledgeStatus,
  PaymentStatus,
  FulfillmentStatus,
  InteractionType,
  CommentBadge,
  ReviewDecision,
  FraudAlertStatus,
  AiTask,
  RiskLevel,
  PredictionStage,
} from './enums';

// ── User & Auth ──────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  bio: string | null;
  location: string | null;
  status: AccountStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  userId: string;
  role: GlobalRole;
  grantedBy: string | null;
  grantedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  line1: string;
  ward: string | null;
  district: string | null;
  province: string;
  countryCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Campaign ─────────────────────────────────

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  creatorId: string;
  categoryId: string;
  title: string;
  slug: string;
  blurb: string;
  storyMarkdown: string;
  risksMarkdown: string;
  location: string;
  status: CampaignStatus;
  goalAmount: number;
  currency: string;
  durationDays: number;
  platformFeeBps: number;
  startsAt: string | null;
  endsAt: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMember {
  campaignId: string;
  userId: string;
  role: CampaignMemberRole;
  canPostUpdates: boolean;
  canReplyComments: boolean;
  canViewAiDashboard: boolean;
  invitedBy: string | null;
  joinedAt: string;
}

export interface CampaignMedia {
  id: string;
  campaignId: string;
  mediaType: MediaType;
  url: string;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface RewardTier {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  amount: number;
  items: unknown[];
  quantityLimit: number | null;
  estimatedDelivery: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddOn {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  amount: number;
  quantityLimit: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingOption {
  id: string;
  campaignId: string;
  name: string;
  provinceCode: string | null;
  feeAmount: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isActive: boolean;
}

// ── Pledge & Payment ─────────────────────────

export interface Pledge {
  id: string;
  campaignId: string;
  backerId: string;
  rewardTierId: string | null;
  shippingOptionId: string | null;
  shippingAddressId: string | null;
  status: PledgeStatus;
  rewardAmount: number;
  addOnAmount: number;
  shippingAmount: number;
  bonusAmount: number;
  totalAmount: number;
  currency: string;
  pledgedAt: string;
  updatedAt: string;
}

export interface PledgeAddOn {
  pledgeId: string;
  addOnId: string;
  quantity: number;
  unitAmount: number;
}

export interface PaymentAuthorization {
  id: string;
  pledgeId: string;
  provider: string;
  providerPaymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  authorizedAt: string | null;
  authorizationExpiresAt: string | null;
  capturedAt: string | null;
  canceledAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Fulfillment {
  id: string;
  pledgeId: string;
  status: FulfillmentStatus;
  carrier: string | null;
  trackingCode: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  note: string | null;
  updatedAt: string;
}

// ── Social & Communication ───────────────────

export interface Comment {
  id: string;
  campaignId: string;
  updateId: string | null;
  authorId: string;
  parentCommentId: string | null;
  body: string;
  badge: CommentBadge;
  likeCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  campaignId: string | null;
  senderId: string;
  recipientId: string;
  parentMessageId: string | null;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CampaignUpdate {
  id: string;
  campaignId: string;
  authorId: string;
  title: string;
  bodyMarkdown: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFaq {
  id: string;
  campaignId: string;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Analytics ────────────────────────────────

export interface DailyCampaignMetric {
  campaignId: string;
  metricDate: string;
  pledgedAmount: number;
  newPledgedAmount: number;
  backerCount: number;
  newBackerCount: number;
  saveCount: number;
  notifyCount: number;
  viewCount: number;
}

export interface InteractionEvent {
  id: number;
  userId: string | null;
  campaignId: string;
  eventType: InteractionType;
  sessionHash: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

// ── AI / ML ──────────────────────────────────

export interface AiModelVersion {
  id: string;
  task: AiTask;
  name: string;
  version: string;
  metrics: Record<string, unknown>;
  featureSchema: Record<string, unknown>;
  artifactUri: string | null;
  isActive: boolean;
  trainedAt: string | null;
  createdAt: string;
}

export interface RecommendationResult {
  id: number;
  userId: string;
  campaignId: string;
  modelVersionId: string | null;
  score: number;
  rank: number;
  reason: string | null;
  generatedAt: string;
}

export interface CampaignPrediction {
  id: string;
  campaignId: string;
  modelVersionId: string;
  probability: number;
  riskLevel: RiskLevel;
  inputSnapshot: Record<string, unknown>;
  predictionStage: PredictionStage;
  predictedAt: string;
}

export interface PredictionFactor {
  id: string;
  predictionId: string;
  featureName: string;
  featureValue: unknown;
  impact: number;
  direction: 'POSITIVE' | 'NEGATIVE';
  explanation: string;
  sortOrder: number;
}

// ── Admin & Moderation ───────────────────────

export interface CampaignReview {
  id: string;
  campaignId: string;
  reviewerId: string;
  decision: ReviewDecision;
  checklist: Record<string, unknown>;
  feedback: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface FraudAlert {
  id: string;
  pledgeId: string | null;
  campaignId: string;
  subjectUserId: string | null;
  modelVersionId: string | null;
  riskScore: number;
  status: FraudAlertStatus;
  assignedAdminId: string | null;
  resolutionNote: string | null;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface FraudSignal {
  id: string;
  alertId: string;
  signalCode: string;
  weight: number;
  explanation: string;
  evidence: Record<string, unknown>;
}

export interface ModerationAction {
  id: string;
  adminId: string;
  targetType: 'USER' | 'CAMPAIGN' | 'COMMENT' | 'FRAUD_ALERT';
  targetId: string;
  action: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CampaignStatusHistory {
  id: string;
  campaignId: string;
  fromStatus: CampaignStatus | null;
  toStatus: CampaignStatus;
  changedBy: string | null;
  reason: string | null;
  changedAt: string;
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  updatedBy: string | null;
  updatedAt: string;
}

// ── Views ────────────────────────────────────

export interface CampaignFundingSummary {
  campaignId: string;
  goalAmount: number;
  pledgedAmount: number;
  backerCount: number;
  fundingPercent: number;
}
