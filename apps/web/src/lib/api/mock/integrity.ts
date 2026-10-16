import { campaignDetailsBySlug } from "./campaign-details";
import {
  adminDashboard,
  campaigns,
  creatorAiDashboard,
  creatorAssistantData,
  userDashboard,
} from "./fixtures";
import { campaignOperationsBySlug, orbitOperations } from "./operations";
import { creatorPortfolio } from "./creator-portfolio";
import {
  DEMO_SNAPSHOT_LABEL,
  assertMockRelationalIntegrity,
  getMockAddress,
  getMockCampaign,
  getMockFulfillment,
  getMockPledge,
  getMockPledgeTotal,
  getMockReward,
  getPaymentForPledge,
  mockMessages,
} from "./relational-store";

function expect(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(`MOCK_READ_MODEL_MISMATCH:${code}`);
}

function expectUnique(values: string[], code: string) {
  expect(new Set(values).size === values.length, `${code}_DUPLICATE_ID`);
}

export function auditMockData() {
  const relational = assertMockRelationalIntegrity();

  const publicCampaigns = campaigns.map((campaign) => {
    const record = getMockCampaign(campaign.id);
    expect(record.slug === campaign.slug, `${campaign.id}_SLUG`);
    expect(record.status === campaign.status, `${campaign.id}_STATUS`);
    expect(record.goalAmount === campaign.goalAmount, `${campaign.id}_GOAL`);
    expect(
      record.pledgedAmount === campaign.pledgedAmount,
      `${campaign.id}_PLEDGED`,
    );
    expect(
      record.backerCount === campaign.backerCount,
      `${campaign.id}_BACKERS`,
    );

    const detail = campaignDetailsBySlug[campaign.slug];
    expect(detail, `${campaign.id}_DETAIL_MISSING`);
    expect(detail.rewards.length > 0, `${campaign.id}_REWARDS_EMPTY`);
    expect(detail.story.paragraphs.length > 0, `${campaign.id}_STORY_EMPTY`);
    expect(detail.team.length > 0, `${campaign.id}_TEAM_EMPTY`);
    return campaign.id;
  });

  expectUnique(publicCampaigns, "PUBLIC_CAMPAIGNS");
  expect(
    ["LIVE", "PRE_LAUNCH", "SUCCESSFUL", "FAILED"].every((status) =>
      campaigns.some((campaign) => campaign.status === status),
    ),
    "CAMPAIGN_STATUS_COVERAGE",
  );

  expect(creatorPortfolio.summary.total >= 3, "CREATOR_PORTFOLIO_MULTI_CAMPAIGN");
  expect(
    creatorPortfolio.campaigns.every(
      (campaign) =>
        getMockCampaign(campaign.id).creatorId === creatorPortfolio.owner.id,
    ),
    "CREATOR_PORTFOLIO_OWNER",
  );
  expectUnique(
    creatorPortfolio.campaigns.map((campaign) => campaign.id),
    "CREATOR_PORTFOLIO",
  );
  expect(
    creatorPortfolio.summary.total === creatorPortfolio.campaigns.length,
    "CREATOR_PORTFOLIO_TOTAL",
  );

  userDashboard.backedProjects.forEach((item) => {
    const pledge = getMockPledge(item.pledgeId);
    const payment = getPaymentForPledge(pledge.id);
    expect(item.referenceCode === pledge.referenceCode, `${pledge.id}_REFERENCE`);
    expect(item.campaign.id === pledge.campaignId, `${pledge.id}_CAMPAIGN`);
    expect(item.amount === getMockPledgeTotal(pledge), `${pledge.id}_TOTAL`);
    expect(item.paymentStatus === payment.status, `${pledge.id}_PAYMENT`);
  });
  userDashboard.messages.forEach((message) => {
    const row = mockMessages.find((item) => item.id === message.id);
    expect(row, `${message.id}_MESSAGE_MISSING`);
    expect(row.campaignId === message.campaignId, `${message.id}_CAMPAIGN`);
    expect(row.senderId === message.senderId, `${message.id}_SENDER`);
    expect(row.recipientId === message.recipientId, `${message.id}_RECIPIENT`);
    expect(row.subject === message.subject, `${message.id}_SUBJECT`);
    expect((row.readAt === null) === message.unread, `${message.id}_READ_STATE`);
  });

  expect(orbitOperations.campaignId === "cmp_orbit", "OPERATIONS_CAMPAIGN");
  expect(orbitOperations.snapshotAt === DEMO_SNAPSHOT_LABEL, "OPERATIONS_SNAPSHOT");
  Object.values(campaignOperationsBySlug).forEach((operations) => {
    const campaign = getMockCampaign(operations.campaignId);
    expect(campaign.slug === operations.slug, `${operations.campaignId}_OPERATIONS_SLUG`);
    expect(
      creatorPortfolio.campaigns.some((item) => item.id === operations.campaignId),
      `${operations.campaignId}_OPERATIONS_OWNER_PORTFOLIO`,
    );
    expectUnique(
      operations.fulfillment.previousCampaign.orders.map((order) => order.id),
      `${operations.campaignId}_FULFILLMENT_ORDERS`,
    );
    operations.fulfillment.previousCampaign.orders.forEach((order) => {
      const pledge = getMockPledge(order.pledgeId);
      const reward = getMockReward(order.rewardTierId);
      const address = getMockAddress(order.shippingAddressId);
      const fulfillment = getMockFulfillment(order.fulfillmentId);
      expect(pledge.campaignId === order.campaignId, `${order.id}_CAMPAIGN`);
      expect(pledge.backerId === order.backerId, `${order.id}_BACKER`);
      expect(pledge.rewardTierId === reward.id, `${order.id}_REWARD`);
      expect(address.userId === order.backerId, `${order.id}_ADDRESS_OWNER`);
      expect(fulfillment.pledgeId === pledge.id, `${order.id}_FULFILLMENT_PLEDGE`);
      expect(fulfillment.orderCode === order.id, `${order.id}_ORDER_CODE`);
      expect(getMockPledgeTotal(pledge) === order.amount, `${order.id}_AMOUNT`);
      expect(
        getPaymentForPledge(pledge.id).status === "CAPTURED",
        `${order.id}_PAYMENT_CAPTURED`,
      );
    });
  });
  orbitOperations.reservations.forEach((reservation) => {
    const pledge = [
      "plg_102",
      "plg_orbit_khoa",
      "plg_orbit_ha",
      "plg_orbit_bao",
    ]
      .map(getMockPledge)
      .find((row) => row.referenceCode === reservation.id);
    expect(pledge, `${reservation.id}_PLEDGE_MISSING`);
    expect(
      getMockPledgeTotal(pledge) === reservation.amount,
      `${reservation.id}_AMOUNT`,
    );
    expect(
      getPaymentForPledge(pledge.id).status === reservation.paymentStatus,
      `${reservation.id}_PAYMENT`,
    );
  });

  expect(
    creatorAiDashboard.campaign.id === orbitOperations.campaignId,
    "CREATOR_AI_CAMPAIGN",
  );
  expect(creatorAiDashboard.model.version.length > 0, "CREATOR_AI_MODEL_VERSION");
  expect(creatorAiDashboard.factors.length > 0, "CREATOR_AI_FACTORS");
  expect(
    creatorAssistantData.content.runMeta.promptVersion.startsWith("content.vi."),
    "CONTENT_PROMPT_VERSION",
  );
  expect(
    creatorAssistantData.comments.runMeta.promptVersion.startsWith("community.vi."),
    "COMMUNITY_PROMPT_VERSION",
  );
  expect(
    creatorAssistantData.content.runMeta.requiresHumanReview &&
      creatorAssistantData.comments.runMeta.requiresHumanReview,
    "ASSISTANT_HUMAN_REVIEW",
  );

  const sentimentCount = creatorAssistantData.comments.sentiments.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const sentimentPercent = creatorAssistantData.comments.sentiments.reduce(
    (sum, item) => sum + item.percent,
    0,
  );
  expect(
    sentimentCount === creatorAssistantData.comments.analyzedCount,
    "COMMENT_SENTIMENT_COUNT",
  );
  expect(sentimentPercent === 100, "COMMENT_SENTIMENT_PERCENT");

  expectUnique(
    adminDashboard.reviewQueue.map((item) => item.id),
    "ADMIN_REVIEWS",
  );
  adminDashboard.reviewQueue.forEach((review) => {
    expect(review.submissionVersion > 0, `${review.id}_VERSION`);
    expect(review.documentCount > 0, `${review.id}_DOCUMENTS`);
    expect(review.checks.length > 0, `${review.id}_CHECKS`);
    expect(review.assignedTo.length > 0, `${review.id}_ASSIGNEE`);
  });

  expectUnique(
    adminDashboard.alerts.map((item) => item.id),
    "ADMIN_ALERTS",
  );
  adminDashboard.alerts.forEach((alert, index) => {
    expect(alert.riskScore >= 0 && alert.riskScore <= 100, `${alert.id}_SCORE`);
    expect(alert.signals.length > 0, `${alert.id}_SIGNALS`);
    if (index > 0) {
      expect(
        adminDashboard.alerts[index - 1].riskScore >= alert.riskScore,
        "ADMIN_ALERT_SORT",
      );
    }
  });
  expectUnique(
    adminDashboard.users.map((item) => item.id),
    "ADMIN_USERS",
  );
  adminDashboard.users.forEach((user) => {
    expect(user.name.length > 0, `${user.id}_NAME`);
    expect(user.roles.length > 0, `${user.id}_ROLES`);
    expect(user.location.length > 0, `${user.id}_LOCATION`);
  });
  adminDashboard.recentDecisions.forEach((decision) => {
    expect(decision.actor.length > 0, `${decision.id}_ACTOR`);
    expect(decision.reason.length > 0, `${decision.id}_REASON`);
    expect(decision.time.length > 0, `${decision.id}_TIME`);
  });
  expect(
    adminDashboard.operations.snapshotAt === DEMO_SNAPSHOT_LABEL,
    "ADMIN_SNAPSHOT",
  );
  expect(
    adminDashboard.operations.managedCampaign.id === "cmp_nova",
    "ADMIN_MANAGED_CAMPAIGN",
  );
  expect(
    adminDashboard.operations.platformFeePercent >= 0 &&
      adminDashboard.operations.platformFeePercent <= 20,
    "ADMIN_PLATFORM_FEE",
  );

  return {
    ...relational,
    checkedReadModels: 9,
    roleCoverage: ["GUEST", "BACKER", "CREATOR", "COLLABORATOR", "ADMIN"],
    publicCampaignCount: campaigns.length,
    campaignDetailCount: Object.keys(campaignDetailsBySlug).length,
    adminReviewCount: adminDashboard.reviewQueue.length,
    adminAlertCount: adminDashboard.alerts.length,
  };
}
