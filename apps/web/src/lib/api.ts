// 本番APIのURL（環境変数が設定されていない場合のフォールバック）
const API_URL = 'https://elearning-api.atsunari-coda.workers.dev';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'UNKNOWN_ERROR',
            message: data.message || 'エラーが発生しました',
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'ネットワークエラーが発生しました',
        },
      };
    }
  }

  // Auth
  async register(email: string, password: string, name: string) {
    return this.request<{ user: any; token: string }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<any>('/v1/auth/me');
  }

  async logout() {
    this.setToken(null);
    return { success: true };
  }

  // Courses
  async getCourses(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return this.request<{ courses: any[]; pagination: any }>(
      `/v1/courses${query ? `?${query}` : ''}`
    );
  }

  async getCourse(id: string) {
    return this.request<any>(`/v1/courses/${id}`);
  }

  // Categories
  async getCategories() {
    return this.request<{ categories: any[] }>('/v1/categories');
  }
}

export const api = new ApiClient(API_URL);
export type { ApiResponse };
