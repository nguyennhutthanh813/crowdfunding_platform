/** Kiểu dữ liệu dùng chung cho các tính năng AI (an toàn để import ở client). */

export type AiSource = "RULE" | "LLM";

export interface AssistantAction {
  type: "PLEDGE" | "MESSAGE" | "OPEN_PROJECT" | "FAQ" | "REWARDS" | "COMMENTS";
  label: string;
  href: string;
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
  actions?: AssistantAction[];
  source?: AiSource;
  error?: boolean;
}

export interface AssistantResult {
  ok: boolean;
  error?: string;
  answer?: string;
  followUps?: string[];
  actions?: AssistantAction[];
  source?: AiSource;
  project?: { slug: string; title: string } | null;
}

export interface ContentReview {
  score: number;
  verdict: string;
  strengths: string[];
  checklist: { key: string; label: string; status: "OK" | "WEAK" | "MISSING"; note: string }[];
  improvements: { area: string; priority: "HIGH" | "MEDIUM" | "LOW"; suggestion: string; example: string }[];
  titleIdeas: string[];
  blurbIdeas: string[];
  source: AiSource;
  reviewedAt: string;
}

export interface CommunityInsight {
  headline: string;
  mood: "POSITIVE" | "MIXED" | "NEGATIVE";
  highlights: { topic: string; insight: string; count: number }[];
  actions: { text: string; priority: "HIGH" | "MEDIUM" | "LOW"; target: "FAQ" | "UPDATE" | "REWARD" | "STORY" | "REPLY" }[];
  faqCandidates: { question: string; answerHint: string }[];
  source: AiSource;
  analyzedCount: number;
}

export interface RiskSignal {
  key: string;
  group: "CREATOR" | "CONTENT" | "COMMUNITY" | "PLEDGE";
  label: string;
  detail: string;
  weight: number;
}

export interface FraudAssessment {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  signals: RiskSignal[];
  stats: {
    creatorAgeDays: number;
    creatorProjects: number;
    creatorSuccess: number;
    openReports: number;
    pledges: number;
    uniqueBackers: number;
    topBackerShare: number;
    newAccountShare: number;
    failedPaymentRate: number;
  };
  ai: {
    summary: string;
    recommendedAction: "APPROVE" | "REQUEST_INFO" | "INVESTIGATE" | "SUSPEND";
    questions: string[];
    source: AiSource;
  } | null;
  modelVersion: string;
  assessedAt: string;
}

export type ReplyTone = "friendly" | "formal" | "short" | "empathetic";
