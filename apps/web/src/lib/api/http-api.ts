import type {
  AdminDashboardData,
  AuthorizePledgeInput,
  AuthorizePledgeResult,
  CampaignCardData,
  CampaignDetail,
  CampaignFilters,
  CampaignOperationsData,
  CreatorAssistantData,
  CreatorAiDashboardData,
  CreatorPortfolioData,
  SessionInput,
  SessionResult,
  PlatformApi,
  UserDashboardData,
} from "./contracts";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: init?.cache ?? "no-store",
  });

  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "error" in data
        ? (data as { error?: { message?: string } }).error
        : undefined;
    throw new Error(
      detail?.message ?? `Backend trả về trạng thái ${response.status}`,
    );
  }

  return data as T;
}

/**
 * Adapter dành cho backend thật. UI chỉ phụ thuộc PlatformApi nên có thể đổi
 * mockApi sang adapter này khi NestJS/FastAPI đã sẵn sàng.
 */
export class HttpPlatformApi implements PlatformApi {
  constructor(private readonly baseUrl: string) {}

  listCampaigns(filters?: CampaignFilters) {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.query) params.set("query", filters.query);
    const query = params.toString();
    return request<CampaignCardData[]>(
      `${this.baseUrl}/campaigns${query ? `?${query}` : ""}`,
    );
  }

  getCampaignBySlug(slug: string) {
    return request<CampaignDetail | null>(`${this.baseUrl}/campaigns/${slug}`);
  }

  getUserDashboard() {
    return request<UserDashboardData>(`${this.baseUrl}/me/dashboard`);
  }

  getCreatorPortfolio() {
    return request<CreatorPortfolioData>(`${this.baseUrl}/creator/portfolio`);
  }

  getCreatorAiDashboard() {
    return request<CreatorAiDashboardData>(`${this.baseUrl}/creator/ai`);
  }

  getCreatorAssistantData() {
    return request<CreatorAssistantData>(`${this.baseUrl}/creator/assistant`);
  }

  getCampaignOperations(slug: string) {
    return request<CampaignOperationsData>(
      `${this.baseUrl}/creator/operations?slug=${encodeURIComponent(slug)}`,
    );
  }

  getAdminDashboard() {
    return request<AdminDashboardData>(`${this.baseUrl}/admin/overview`);
  }

  authorizePledge(input: AuthorizePledgeInput) {
    return request<AuthorizePledgeResult>(`${this.baseUrl}/pledges/authorize`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createSession(input: SessionInput) {
    return request<SessionResult>(`${this.baseUrl}/auth/session`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}
