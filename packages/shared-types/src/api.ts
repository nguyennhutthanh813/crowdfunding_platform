// ═══════════════════════════════════════════
// API Types — Request / Response contracts
// ═══════════════════════════════════════════

// ── Pagination ───────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ── Standard API Response ────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
}

// ── Auth ─────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    roles: string[];
  };
  tokens: AuthTokens;
}

// ── Campaign Filters ─────────────────────────

export interface CampaignFilters extends PaginationQuery {
  status?: string;
  categoryId?: string;
  creatorId?: string;
  search?: string;
  minGoal?: number;
  maxGoal?: number;
  fundingStatus?: 'funded' | 'not_funded';
}
