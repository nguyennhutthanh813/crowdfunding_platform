import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import {
  DEMO_SNAPSHOT_AT,
  getMockPledgeTotal,
  mockPledges,
} from "@/lib/api/mock/relational-store";

// Một người sửa cam kết thì bản local thay bản seed của chính người đó.
export function previewFundingChange(campaignId: string, platform?: Pick<PlatformPreviewState, "pledges">) {
  return (platform?.pledges ?? [])
    .filter((pledge) => pledge.campaignId === campaignId)
    .reduce((change, pledge) => {
      const original = mockPledges.find((item) =>
        item.campaignId === campaignId && item.backerId === pledge.backerId);
      const originalAmount = original ? getMockPledgeTotal(original) : 0;
      const originalIsToday = original?.pledgedAt.slice(0, 10) ===
        DEMO_SNAPSHOT_AT.slice(0, 10);
      return {
        amount: change.amount + pledge.totalAmount - originalAmount,
        backers: change.backers + (original ? 0 : 1),
        todayAmount: change.todayAmount + pledge.totalAmount -
          (originalIsToday ? originalAmount : 0),
        todayBackers: change.todayBackers + (originalIsToday ? 0 : 1),
      };
    }, { amount: 0, backers: 0, todayAmount: 0, todayBackers: 0 });
}
