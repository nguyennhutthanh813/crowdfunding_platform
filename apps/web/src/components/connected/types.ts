export type User = { id: string; email: string; displayName: string; roles: string[] };
export type Category = { id: string; name: string };
export type Reward = {
  id: string;
  title: string;
  description: string;
  amount: number;
  requiresShipping: boolean;
  isActive: boolean;
};
export type AddOn = { id: string; title: string; amount: number; requiresShipping: boolean };
export type Shipping = { id: string; name: string; feeAmount: number };
export type Campaign = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  storyMarkdown: string;
  risksMarkdown: string;
  status: string;
  goalAmount: number;
  durationDays: number;
  location: string;
  creator?: { id: string; displayName: string };
  category?: Category;
  media?: { url: string; altText: string | null; mediaType: string }[];
  rewardTiers?: Reward[];
  addOns?: AddOn[];
  shippingOptions?: Shipping[];
  updates?: {
    id: string;
    title: string;
    bodyMarkdown: string;
    publishedAt: string;
    author?: { displayName: string };
  }[];
  members?: { userId: string; role: string; canPostUpdates: boolean }[];
  statusHistory?: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    changedAt: string;
    changer?: { displayName: string } | null;
  }[];
};
export type Pledge = {
  id: string;
  status: string;
  totalAmount: number;
  campaign: { title: string; slug: string };
  rewardTier?: { title: string } | null;
};
export type ReviewItem = {
  id: string;
  title: string;
  status: string;
  creator: string;
  category: string;
  goalAmount: number;
  story: string;
  risks: string;
  checks: { label: string; status: string; detail: string }[];
};

export const money = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
export const statusLabel: Record<string, string> = {
  DRAFT: 'Bản nháp',
  IN_REVIEW: 'Đang chờ duyệt',
  PRE_LAUNCH: 'Đã duyệt, chờ mở',
  LIVE: 'Đang gọi vốn',
  SUCCESSFUL: 'Đã đạt mục tiêu',
  FAILED: 'Chưa đạt mục tiêu',
  PENDING: 'Chờ thanh toán',
  AUTHORIZED: 'Đã xác thực tiền',
  CANCELED: 'Đã hủy',
};
