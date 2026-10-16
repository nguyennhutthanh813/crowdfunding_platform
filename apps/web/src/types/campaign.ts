/**
 * UI-level types cho Campaign Card — tương thích với response từ NestJS API.
 * Các field này là projection từ Campaign + CampaignFundingSummary + creator info.
 */

export type CampaignStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PRE_LAUNCH'
  | 'LIVE'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'SUSPENDED';

export type CampaignMotif = 'coffee' | 'game' | 'light' | 'health' | 'music' | 'eco';
export type CampaignPalette = 'ember' | 'mint' | 'indigo' | 'sun' | 'rose' | 'ocean';

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
  creator: {
    id: string;
    name: string;
    initials: string;
    verified: boolean;
  };
  tags: string[];
  /** Visual descriptor — dùng để render CampaignVisual */
  visual: {
    motif: CampaignMotif;
    palette: CampaignPalette;
    label: string;
    imageSrc?: string;
    imageAlt?: string;
  };
}

/**
 * Mapping từ API response raw → CampaignCardData
 * Khi backend chưa trả đủ field visual, dùng fallback.
 */
export function mapToCampaignCard(raw: Record<string, unknown>): CampaignCardData {
  const motifs: CampaignMotif[] = ['coffee', 'game', 'light', 'health', 'music', 'eco'];
  const palettes: CampaignPalette[] = ['ember', 'mint', 'indigo', 'sun', 'rose', 'ocean'];

  // Deterministic fallback từ id
  const hash = String(raw.id ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? raw.id ?? ''),
    title: String(raw.title ?? ''),
    blurb: String(raw.blurb ?? raw.description ?? ''),
    category: String(raw.category ?? raw.categoryName ?? 'Khác'),
    status: (raw.status as CampaignStatus) ?? 'DRAFT',
    goalAmount: Number(raw.goalAmount ?? raw.goal_amount ?? 0),
    pledgedAmount: Number(raw.pledgedAmount ?? raw.pledged_amount ?? 0),
    backerCount: Number(raw.backerCount ?? raw.backer_count ?? 0),
    daysLeft: Number(raw.daysLeft ?? raw.days_left ?? 0),
    launchDate: String(raw.launchDate ?? raw.startsAt ?? raw.starts_at ?? new Date().toISOString()),
    location: String(raw.location ?? 'Việt Nam'),
    creator: {
      id: String((raw.creator as Record<string, unknown>)?.id ?? raw.creatorId ?? ''),
      name: String((raw.creator as Record<string, unknown>)?.name ?? (raw.creator as Record<string, unknown>)?.displayName ?? 'Chủ dự án'),
      initials: String((raw.creator as Record<string, unknown>)?.initials ?? 'C'),
      verified: Boolean((raw.creator as Record<string, unknown>)?.verified ?? false),
    },
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    visual: (raw.visual as CampaignCardData['visual']) ?? {
      motif: motifs[hash % motifs.length],
      palette: palettes[hash % palettes.length],
      label: String(raw.title ?? '').slice(0, 20),
    },
  };
}
