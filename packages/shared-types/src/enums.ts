// ═══════════════════════════════════════════
// Enums — Mapped from PostgreSQL ENUM types
// ═══════════════════════════════════════════

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum GlobalRole {
  BACKER = 'BACKER',
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PRE_LAUNCH = 'PRE_LAUNCH',
  LIVE = 'LIVE',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
}

export enum CampaignMemberRole {
  OWNER = 'OWNER',
  COLLABORATOR = 'COLLABORATOR',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum PledgeStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum FulfillmentStatus {
  PENDING = 'PENDING',
  SURVEY_SENT = 'SURVEY_SENT',
  ADDRESS_CONFIRMED = 'ADDRESS_CONFIRMED',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

export enum InteractionType {
  VIEW = 'VIEW',
  SAVE = 'SAVE',
  UNSAVE = 'UNSAVE',
  FOLLOW_CREATOR = 'FOLLOW_CREATOR',
  UNFOLLOW_CREATOR = 'UNFOLLOW_CREATOR',
  NOTIFY_PRELAUNCH = 'NOTIFY_PRELAUNCH',
  PLEDGE = 'PLEDGE',
}

export enum CommentBadge {
  BACKER = 'BACKER',
  SUPERBACKER = 'SUPERBACKER',
  CREATOR = 'CREATOR',
  COLLABORATOR = 'COLLABORATOR',
  ADMIN = 'ADMIN',
}

export enum ReviewDecision {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REJECTED = 'REJECTED',
}

export enum FraudAlertStatus {
  NEW = 'NEW',
  REVIEWING = 'REVIEWING',
  CLEARED = 'CLEARED',
  ESCALATED = 'ESCALATED',
}

export enum AiTask {
  RECOMMENDATION = 'RECOMMENDATION',
  SUCCESS_PREDICTION = 'SUCCESS_PREDICTION',
  FRAUD_DETECTION = 'FRAUD_DETECTION',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum PredictionStage {
  DRAFT = 'DRAFT',
  PRE_LAUNCH = 'PRE_LAUNCH',
  LIVE = 'LIVE',
}
