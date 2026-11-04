import { mockUsers } from "@/lib/api/mock/relational-store";
import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";

export interface QuestionResponder {
  userId: string;
  name: string;
}

export function previewQuestionResponders(
  campaignId: string,
  platform: PlatformPreviewState,
): QuestionResponder[] {
  const snapshot = platform.campaignDrafts[campaignId];
  if (!snapshot) return [];
  const accepted = new Set(platform.acceptedCollaborators[campaignId] ?? []);
  const accounts = [
    ...mockUsers.map((user) => ({ userId: user.id, name: user.displayName, email: user.email })),
    ...platform.registeredAccounts.map((user) => ({ userId: user.id, name: user.name, email: user.email })),
  ];
  return accounts.filter((user) => accepted.has(user.userId) &&
    snapshot.collaborators?.some((member) =>
      member.canReply && member.email.trim().toLowerCase() === user.email?.trim().toLowerCase()))
    .map(({ userId, name }) => ({ userId, name }));
}
