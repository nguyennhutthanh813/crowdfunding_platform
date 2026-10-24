export type CampaignStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "PRE_LAUNCH"
  | "LIVE"
  | "SUCCESSFUL"
  | "FAILED"
  | "SUSPENDED";

export type CampaignMotif =
  "coffee" | "game" | "light" | "health" | "music" | "eco";

export type CampaignPalette =
  "ember" | "mint" | "indigo" | "sun" | "rose" | "ocean";

export interface CreatorProfile {
  id: string;
  name: string;
  initials: string;
  location: string;
  bio: string;
  verified: boolean;
  followers: number;
  launchedProjects: number;
  backedProjects: number;
}

export interface CampaignCardData {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  category: string;
  status: CampaignStatus;
  goalAmount: number;
  pledgedAmount: number;
  backerCount: number;
  daysLeft: number;
  launchDate: string;
  location: string;
  creator: Pick<CreatorProfile, "id" | "name" | "initials" | "verified"> &
    Partial<
      Pick<
        CreatorProfile,
        "location" | "bio" | "followers" | "launchedProjects" | "backedProjects"
      >
    >;
  tags: string[];
  recommendationReason?: string;
  predictionScore?: number;
  visual: {
    motif: CampaignMotif;
    palette: CampaignPalette;
    label: string;
    imageSrc?: string;
    imageAlt?: string;
  };
}

export type CreatorCampaignNextAction =
  "OPERATE" | "FULFILL" | "CONTINUE_DRAFT" | "FOLLOW_REVIEW";

export interface CreatorPortfolioCampaign {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  category: string;
  location: string;
  status: CampaignStatus;
  ownership: "OWNER";
  goalAmount: number;
  pledgedAmount: number;
  backerCount: number;
  daysLeft: number;
  teamSize: number;
  openTaskCount: number;
  fundingTrend: Array<{ date: string; amount: number }>;
  nextAction: CreatorCampaignNextAction;
  nextActionLabel: string;
  nextActionDetail: string;
}

export interface CreatorPortfolioData {
  owner: {
    id: string;
    name: string;
    initials: string;
  };
  activeCampaignId: string;
  snapshotAt: string;
  summary: {
    total: number;
    live: number;
    draftOrReview: number;
    successful: number;
    totalPledgedAmount: number;
  };
  campaigns: CreatorPortfolioCampaign[];
}

export interface RewardTier {
  id: string;
  title: string;
  description: string;
  amount: number;
  estimatedDelivery: string;
  items: string[];
  limit?: number;
  claimed: number;
  featured?: boolean;
}

export interface AddOn {
  id: string;
  title: string;
  description: string;
  amount: number;
}

export interface CampaignUpdate {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  commentCount: number;
}

export type CommentBadge =
  | "CREATOR"
  | "COLLABORATOR"
  | "SUPERBACKER"
  | "BACKER"
  | "ADMIN";

export interface CampaignComment {
  id: string;
  authorId?: string;
  author: string;
  initials: string;
  badge: CommentBadge;
  body: string;
  createdAt: string;
  likes: number;
  isHidden?: boolean;
  parentCommentId?: string;
  replies?: CampaignComment[];
}

export interface CampaignDetail extends CampaignCardData {
  story: {
    lead: string;
    paragraphs: string[];
    highlights: Array<{ title: string; description: string }>;
    fundingPlan: Array<{
      label: string;
      percent: number;
      amount: number;
      detail: string;
    }>;
    evidence: Array<{
      label: string;
      status: "VERIFIED" | "IN_PROGRESS" | "PLANNED";
      detail: string;
    }>;
    roadmap: Array<{
      period: string;
      title: string;
      status: "done" | "now" | "next";
    }>;
    risks: string;
  };
  rewards: RewardTier[];
  addOns: AddOn[];
  faqs: Array<{ question: string; answer: string }>;
  updates: CampaignUpdate[];
  comments: CampaignComment[];
  team: Array<{ name: string; role: string; initials: string }>;
  community: {
    newBackerPercent: number;
    returningBackerPercent: number;
    topCities: Array<{ name: string; backers: number }>;
  };
  dailyFunding: Array<{ date: string; amount: number }>;
}

export type PaymentStatus = "AUTHORIZED" | "CAPTURED" | "CANCELED" | "FAILED";

export interface BackedProject {
  pledgeId: string;
  referenceCode: string;
  campaign: CampaignCardData;
  amount: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus:
    "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED" | "NOT_APPLICABLE";
  rewardTitle: string;
  pledgedAt: string;
  nextStep: string;
  nextStepAt: string;
}

export interface DashboardAttentionItem {
  id: string;
  kind: "ACTION_REQUIRED" | "STATUS_UPDATE" | "UPCOMING";
  title: string;
  detail: string;
  dueLabel: string;
  actionLabel: string;
  href: string;
}

export interface UserDashboardData {
  user: { name: string; initials: string; memberSince: string };
  stats: { backed: number; saved: number; following: number; messages: number };
  attentionItems: DashboardAttentionItem[];
  backedProjects: BackedProject[];
  savedProjects: CampaignCardData[];
  following: Array<{
    id: string;
    name: string;
    initials: string;
    projects: number;
  }>;
  messages: Array<{
    id: string;
    campaignId: string;
    senderId: string;
    recipientId: string;
    sender: string;
    initials: string;
    subject: string;
    preview: string;
    sentAt: string;
    unread: boolean;
  }>;
  sentMessages: Array<{
    id: string;
    campaignId: string;
    senderId: string;
    recipientId: string;
    recipient: string;
    subject: string;
    body: string;
    sentAt: string;
  }>;
  activities: Array<{
    id: string;
    title: string;
    detail: string;
    occurredAt: string;
  }>;
}

export interface PredictionFactor {
  label: string;
  impact: number;
  direction: "positive" | "negative";
  detail: string;
}

export interface CreatorAiDashboardData {
  campaign: CampaignCardData;
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  model: { name: string; version: string; evaluatedAt: string; rocAuc: number };
  factors: PredictionFactor[];
  suggestions: Array<{
    id: string;
    title: string;
    detail: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
  timeline: Array<{ day: string; actual: number; expected: number }>;
  preLaunchSignals: { saves: number; notify: number; followers: number };
}

export type ContentCheckStatus = "GOOD" | "IMPROVE" | "MISSING";

export interface AssistantRunMeta {
  engineLabel: string;
  promptVersion: string;
  inputSnapshotAt: string;
  locale: "vi-VN";
  requiresHumanReview: true;
}

export interface CampaignContentAssistantData {
  runMeta: AssistantRunMeta;
  score: number;
  analyzedAt: string;
  currentTitle: string;
  currentBlurb: string;
  wordCount: number;
  readingMinutes: number;
  checks: Array<{
    id: string;
    label: string;
    status: ContentCheckStatus;
    finding: string;
  }>;
  titleOptions: Array<{
    id: string;
    text: string;
    reason: string;
  }>;
  blurbOptions: Array<{
    id: string;
    text: string;
    reason: string;
  }>;
  rewardBenchmark: {
    sampleSize: number;
    category: string;
    medianAmount: number;
    currentAmount: number;
    note: string;
  };
}

export type CommentIntent =
  "FEATURE_REQUEST" | "INQUIRY" | "POSITIVE" | "COMPLAINT";

export interface AssistantPriorityComment {
  id: string;
  author: string;
  initials: string;
  body: string;
  createdAt: string;
  intent: CommentIntent;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  suggestedReply: string;
}

export interface CampaignCommentInsightsData {
  runMeta: AssistantRunMeta;
  analyzedCount: number;
  analyzedAt: string;
  summary: string;
  sentiments: Array<{
    label: string;
    count: number;
    percent: number;
    tone: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  }>;
  topics: Array<{
    id: string;
    label: string;
    count: number;
    change: number;
    summary: string;
  }>;
  priorities: AssistantPriorityComment[];
}

export interface CreatorAssistantData {
  content: CampaignContentAssistantData;
  comments: CampaignCommentInsightsData;
}

export type WorkspaceTaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface CampaignWorkspaceTask {
  id: string;
  title: string;
  detail: string;
  area: "COMMUNITY" | "CONTENT" | "FULFILLMENT" | "COMPLIANCE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: WorkspaceTaskStatus;
  assigneeId: string;
  assigneeName: string;
  assigneeInitials: string;
  dueLabel: string;
  hrefByRole: {
    creator: string;
    collaborator: string;
  };
}

export interface CampaignOperationsData {
  campaignId: string;
  slug: string;
  snapshotAt: string;
  today: {
    pledgedAmount: number;
    backerCount: number;
    averagePledgeAmount: number;
    unansweredComments: number;
  };
  funding: {
    remainingAmount: number;
    neededPerDay: number;
    projectedMinAmount: number;
    projectedMaxAmount: number;
    deadlineLabel: string;
  };
  tasks: CampaignWorkspaceTask[];
  team: Array<{
    id: string;
    name: string;
    initials: string;
    role: string;
    permissions: string[];
    openTasks: number;
    lastSeen: string;
  }>;
  handoffs: Array<{
    id: string;
    title: string;
    from: string;
    to: string;
    at: string;
    note: string;
  }>;
  updateHistory: Array<{ title: string; when: string }>;
  communityMessages: Array<{
    id: string;
    campaignId: string;
    senderId: string;
    senderName: string;
    senderInitials: string;
    recipientId: string;
    subject: string;
    body: string;
    sentAt: string;
    unread: boolean;
  }>;
  reservations: Array<{
    id: string;
    backer: string;
    reward: string;
    city: string;
    amount: number;
    authorizedAt: string;
    paymentStatus: "AUTHORIZED";
  }>;
  fulfillment: {
    currentCampaign: {
      authorizedCount: number;
      addressReadyCount: number;
      surveyPendingCount: number;
      unlockLabel: string;
      explanation: string;
    };
    previousCampaign: {
      title: string;
      successfulAt: string;
      capturedAmount: number;
      orders: Array<{
        id: string;
        campaignId: string;
        pledgeId: string;
        backerId: string;
        rewardTierId: string;
        fulfillmentId: string;
        shippingAddressId: string;
        pledgeReference: string;
        backer: string;
        reward: string;
        city: string;
        amount: number;
        carrier: string | null;
        trackingCode: string | null;
        status: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";
      }>;
    };
  };
}

export interface FraudAlert {
  id: string;
  campaignTitle: string;
  userLabel: string;
  amount: number;
  riskScore: number;
  status: "NEW" | "REVIEWING" | "CLEARED" | "ESCALATED";
  createdAt: string;
  signals: string[];
}

export interface ReviewQueueItem {
  id: string;
  campaignId?: string;
  title: string;
  slug?: string;
  blurb?: string;
  story?: string;
  risks?: string;
  location?: string;
  goalAmount?: number;
  durationDays?: number;
  videoUrl?: string;
  imageUrl?: string;
  creator: string;
  creatorEmail?: string;
  creatorAvatar?: string | null;
  submittedAt: string;
  category: string;
  completeness: number;
  status: "PENDING" | "NEEDS_CHANGES";
  submissionVersion: number;
  assignedTo: string;
  reviewDueAt: string;
  documentCount: number;
  checks: Array<{
    label: string;
    status: "PASS" | "WARN" | "MISSING";
    detail: string;
  }>;
  rewardTiers?: Array<{
    id: string;
    title: string;
    amount: number;
    estimatedDelivery?: string;
    quantityLimit?: number | null;
    items?: string[];
  }>;
  addOns?: Array<{
    id: string;
    title: string;
    amount: number;
  }>;
}

export interface AdminDashboardData {
  metrics: {
    grossPledged: number;
    platformRevenue: number;
    activeCampaigns: number;
    openAlerts: number;
  };
  alerts: FraudAlert[];
  reviewQueue: ReviewQueueItem[];
  users: Array<{
    id: string;
    name: string;
    initials: string;
    email: string;
    location: string;
    roles: string[];
    status: "ACTIVE" | "SUSPENDED" | "REVIEWING";
    lastSeen: string;
    phone?: string;
    bio?: string;
    createdAt?: string;
    emailVerified?: boolean;
    campaignCount?: number;
    pledgeCount?: number;
    totalPledgedAmount?: number;
    fraudAlertCount?: number;
    campaigns?: Array<{
      id: string;
      title: string;
      status: string;
      goalAmount: number;
      pledgedAmount: number;
      backerCount: number;
      createdAt: string;
    }>;
    pledges?: Array<{
      id: string;
      campaignTitle: string;
      amount: number;
      status: string;
      pledgedAt: string;
    }>;
    moderationActions?: Array<{
      id: string;
      action: string;
      reason: string;
      createdAt: string;
      adminName: string;
    }>;
  }>;
  fundingSeries: Array<{ month: string; amount: number }>;
  operations: {
    snapshotAt: string;
    reviewsDueToday: number;
    overdueReviews: number;
    authorizedAmount: number;
    authorizedPledges: number;
    supportCasesOpen: number;
    reconciliationLabel: string;
    platformFeePercent: number;
    managedCampaign: {
      id: string;
      title: string;
      status: "LIVE" | "SUSPENDED";
      riskScore: number;
      relatedAlerts: number;
    };
  };
  recentDecisions: Array<{
    id: string;
    time: string;
    actor: string;
    action: string;
    target: string;
    reason: string;
  }>;
}

export interface AuthorizePledgeInput {
  campaignId: string;
  rewardId: string | null;
  addOnIds: string[];
  bonusAmount: number;
  address: {
    fullName: string;
    phone: string;
    line1: string;
    city: string;
  };
}

export interface AuthorizePledgeResult {
  authorizationId: string;
  status: "AUTHORIZED";
  totalAmount: number;
  breakdown: {
    rewardAmount: number;
    addOnAmount: number;
    shippingAmount: number;
    bonusAmount: number;
  };
  authorizedAt: string;
  note: string;
}

export type UserRole = "BACKER" | "CREATOR" | "COLLABORATOR" | "ADMIN";

export interface SessionInput {
  mode: "SIGN_IN" | "REGISTER";
  email: string;
  password: string;
  fullName?: string;
  remember?: boolean;
}

export interface PreviewAuthorizedPledge {
  authorizationId: string;
  campaignId: string;
  rewardId: string | null;
  rewardTitle: string;
  totalAmount: number;
  authorizedAt: string;
}

export interface UserAddress {
  id: string;
  recipientName: string;
  phone: string;
  line1: string;
  ward?: string | null;
  district?: string | null;
  province: string;
  countryCode?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionResult {
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    initials: string;
    headline: string;
    phone?: string | null;
    location?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    roles: UserRole[];
    activeRole: UserRole;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  };
  previewState?: {
    notificationPreferences?: {
      projectUpdates: boolean;
      pledgeStatus: boolean;
      recommendations: boolean;
      creatorTasks: boolean;
      moderationAlerts?: boolean;
    };
    interests?: string[];
    savedCampaignIds?: string[];
    followedCreatorIds?: string[];
    notifiedCampaignIds?: string[];
    authorizedPledges?: PreviewAuthorizedPledge[];
    taskStatuses?: Record<string, WorkspaceTaskStatus>;
    fulfillmentStatuses?: Record<
      string,
      "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED"
    >;
    collaboratorPermissions?: Record<string, string[]>;
    reviewDecisions?: Record<string, "APPROVED" | "CHANGES" | "REJECTED">;
    fraudStatuses?: Record<string, "CLEARED" | "ESCALATED">;
    userStatuses?: Record<string, "ACTIVE" | "SUSPENDED">;
    userRoles?: Record<string, string[]>;
    createdUsers?: AdminDashboardData["users"];
    userModerations?: Record<
      string,
      Array<{
        id: string;
        action: string;
        reason: string;
        createdAt: string;
        adminName: string;
      }>
    >;
    campaignStatuses?: Record<string, "LIVE" | "SUSPENDED">;
    platformFeePercent?: number;
    readMessageIds?: string[];
    sentMessages?: Array<{
      id: string;
      campaignId: string;
      senderId: string;
      recipientId: string;
      recipient: string;
      subject: string;
      body: string;
      sentAt: string;
    }>;
    publishedUpdates?: Array<{
      id: string;
      campaignId: string;
      title: string;
      when: string;
    }>;
  };
  expiresAt: string;
  notice: string;
}

export interface CampaignFilters {
  category?: string;
  status?: CampaignStatus;
  query?: string;
}

export interface PlatformApi {
  listCampaigns(filters?: CampaignFilters): Promise<CampaignCardData[]>;
  getCampaignBySlug(slug: string): Promise<CampaignDetail | null>;
  getUserDashboard(): Promise<UserDashboardData>;
  getCreatorPortfolio(): Promise<CreatorPortfolioData>;
  getCreatorAiDashboard(): Promise<CreatorAiDashboardData>;
  getCreatorAssistantData(): Promise<CreatorAssistantData>;
  getCampaignOperations(slug: string): Promise<CampaignOperationsData>;
  getAdminDashboard(): Promise<AdminDashboardData>;
  authorizePledge(input: AuthorizePledgeInput): Promise<AuthorizePledgeResult>;
  createSession(input: SessionInput): Promise<SessionResult>;
}
