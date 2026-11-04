import type { SessionResult } from "@/lib/api/contracts";
import { defaultNotificationPreferences } from "./notification-preferences";

type PreviewState = NonNullable<SessionResult["previewState"]>;

const emptyPreviewState: PreviewState = {
  interests: [],
  savedCampaignIds: [],
  followedCreatorIds: [],
  notifiedCampaignIds: [],
  authorizedPledges: [],
  taskStatuses: {},
  fulfillmentStatuses: {},
  collaboratorPermissions: {},
  reviewDecisions: {},
  fraudStatuses: {},
  userStatuses: {},
  campaignStatuses: {},
  platformFeePercent: 5,
  readMessageIds: [],
  sentMessages: [],
  publishedUpdates: [],
};

const previewStateByUser: Record<string, PreviewState> = {
  usr_minh_anh: {
    interests: ["technology", "design", "green-living"],
    savedCampaignIds: ["cmp_lacviet", "cmp_pulse", "cmp_afterrain"],
    followedCreatorIds: ["usr_hoang_linh", "usr_moc", "usr_vy"],
    notifiedCampaignIds: [],
    authorizedPledges: [],
  },
};

function cloneState(state: PreviewState): PreviewState {
  return {
    notificationPreferences: {
      ...(state.notificationPreferences ?? defaultNotificationPreferences),
    },
    interests: [...(state.interests ?? [])],
    savedCampaignIds: [...(state.savedCampaignIds ?? [])],
    followedCreatorIds: [...(state.followedCreatorIds ?? [])],
    notifiedCampaignIds: [...(state.notifiedCampaignIds ?? [])],
    authorizedPledges: [...(state.authorizedPledges ?? [])],
    taskStatuses: { ...(state.taskStatuses ?? {}) },
    fulfillmentStatuses: { ...(state.fulfillmentStatuses ?? {}) },
    collaboratorPermissions: Object.fromEntries(
      Object.entries(state.collaboratorPermissions ?? {}).map(
        ([memberId, permissions]) => [memberId, [...permissions]],
      ),
    ),
    reviewDecisions: { ...(state.reviewDecisions ?? {}) },
    fraudStatuses: { ...(state.fraudStatuses ?? {}) },
    userStatuses: { ...(state.userStatuses ?? {}) },
    campaignStatuses: { ...(state.campaignStatuses ?? {}) },
    platformFeePercent: state.platformFeePercent ?? 5,
    readMessageIds: [...(state.readMessageIds ?? [])],
    sentMessages: [...(state.sentMessages ?? [])],
    publishedUpdates: [...(state.publishedUpdates ?? [])],
  };
}

export function getInitialPreviewState(userId: string): PreviewState {
  return cloneState(previewStateByUser[userId] ?? emptyPreviewState);
}

export function getEffectivePreviewState(
  session: Pick<SessionResult, "user" | "previewState">,
): PreviewState {
  const defaults = getInitialPreviewState(session.user.id);
  const current = session.previewState;

  return {
    notificationPreferences: {
      ...(current?.notificationPreferences ??
        defaults.notificationPreferences ??
        defaultNotificationPreferences),
    },
    interests: current?.interests ?? defaults.interests,
    savedCampaignIds: current?.savedCampaignIds ?? defaults.savedCampaignIds,
    followedCreatorIds:
      current?.followedCreatorIds ?? defaults.followedCreatorIds,
    notifiedCampaignIds:
      current?.notifiedCampaignIds ?? defaults.notifiedCampaignIds,
    authorizedPledges: current?.authorizedPledges ?? defaults.authorizedPledges,
    taskStatuses: current?.taskStatuses ?? defaults.taskStatuses,
    fulfillmentStatuses:
      current?.fulfillmentStatuses ?? defaults.fulfillmentStatuses,
    collaboratorPermissions:
      current?.collaboratorPermissions ?? defaults.collaboratorPermissions,
    reviewDecisions: current?.reviewDecisions ?? defaults.reviewDecisions,
    fraudStatuses: current?.fraudStatuses ?? defaults.fraudStatuses,
    userStatuses: current?.userStatuses ?? defaults.userStatuses,
    campaignStatuses: current?.campaignStatuses ?? defaults.campaignStatuses,
    platformFeePercent:
      current?.platformFeePercent ?? defaults.platformFeePercent,
    readMessageIds: current?.readMessageIds ?? defaults.readMessageIds,
    sentMessages: current?.sentMessages ?? defaults.sentMessages,
    publishedUpdates: current?.publishedUpdates ?? defaults.publishedUpdates,
  };
}
