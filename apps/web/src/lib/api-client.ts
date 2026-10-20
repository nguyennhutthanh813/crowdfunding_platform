import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor — attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle 401 (token expired)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export const campaignApi = {
  list: (params?: { categoryId?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/campaigns', { params }).then((res) => res.data),

  getCategories: () =>
    apiClient.get('/campaigns/categories').then((res) => res.data),

  getMyCampaigns: () =>
    apiClient.get('/campaigns/creator/my').then((res) => res.data),

  get: (idOrSlug: string) =>
    apiClient.get(`/campaigns/${idOrSlug}`).then((res) => res.data),

  create: (data: {
    title: string;
    categoryId: string;
    blurb: string;
    goalAmount: number;
    durationDays: number;
    storyMarkdown?: string;
    risksMarkdown?: string;
    location?: string;
  }) => apiClient.post('/campaigns', data).then((res) => res.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/campaigns/${id}`, data).then((res) => res.data),

  submitForReview: (id: string) =>
    apiClient.post(`/campaigns/${id}/submit`).then((res) => res.data),

  launch: (id: string) =>
    apiClient.post(`/campaigns/${id}/launch`).then((res) => res.data),

  getRewards: (idOrSlug: string) =>
    apiClient.get(`/campaigns/${idOrSlug}/rewards`).then((res) => res.data),

  getUpdates: (idOrSlug: string) =>
    apiClient.get(`/campaigns/${idOrSlug}/updates`).then((res) => res.data),

  getFaqs: (idOrSlug: string) =>
    apiClient.get(`/campaigns/${idOrSlug}/faqs`).then((res) => res.data),

  createRewardTier: (campaignId: string, data: Record<string, unknown>) =>
    apiClient.post(`/campaigns/${campaignId}/rewards`, data).then((res) => res.data),

  createAddOn: (campaignId: string, data: Record<string, unknown>) =>
    apiClient.post(`/campaigns/${campaignId}/add-ons`, data).then((res) => res.data),

  createShippingOption: (campaignId: string, data: Record<string, unknown>) =>
    apiClient.post(`/campaigns/${campaignId}/shipping-options`, data).then((res) => res.data),

  createUpdate: (campaignId: string, data: { title: string; bodyMarkdown: string }) =>
    apiClient.post(`/campaigns/${campaignId}/updates`, data).then((res) => res.data),

  createFaq: (campaignId: string, data: { question: string; answer: string; sortOrder?: number }) =>
    apiClient.post(`/campaigns/${campaignId}/faqs`, data).then((res) => res.data),
};
