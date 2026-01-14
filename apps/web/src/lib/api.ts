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
    // 初期化時にlocalStorageからトークンを読み込み（ブラウザ環境のみ）
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
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
    // 毎回localStorageから最新のトークンを取得（SSR対応）
    if (typeof window !== 'undefined' && !this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // 毎回最新のトークンを取得
    const currentToken = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (currentToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${currentToken}`;
    }
    
    console.log('API Request:', endpoint, 'Token exists:', !!currentToken);

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

  async createCourse(data: {
    title: string;
    subtitle?: string;
    description?: string;
    categoryId?: string;
    level?: string;
    language?: string;
    price?: number;
  }) {
    return this.request<{ id: string; slug: string }>('/v1/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourse(id: string, data: {
    title?: string;
    subtitle?: string;
    description?: string;
    categoryId?: string;
    level?: string;
    price?: number;
  }) {
    return this.request<any>(`/v1/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCourse(id: string) {
    return this.request<any>(`/v1/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // Sections
  async createSection(courseId: string, data: { title: string; description?: string }) {
    return this.request<{ id: string }>(`/v1/courses/${courseId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSection(courseId: string, sectionId: string, data: { title?: string; description?: string }) {
    return this.request<any>(`/v1/courses/${courseId}/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSection(courseId: string, sectionId: string) {
    return this.request<any>(`/v1/courses/${courseId}/sections/${sectionId}`, {
      method: 'DELETE',
    });
  }

  // Lectures
  async createLecture(courseId: string, sectionId: string, data: { 
    title: string; 
    description?: string;
    contentType?: string;
    isFree?: boolean;
  }) {
    return this.request<{ id: string }>(`/v1/courses/${courseId}/sections/${sectionId}/lectures`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLecture(courseId: string, sectionId: string, lectureId: string, data: { 
    title?: string; 
    description?: string;
    isFree?: boolean;
  }) {
    return this.request<any>(`/v1/courses/${courseId}/sections/${sectionId}/lectures/${lectureId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLecture(courseId: string, sectionId: string, lectureId: string) {
    return this.request<any>(`/v1/courses/${courseId}/sections/${sectionId}/lectures/${lectureId}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories() {
    return this.request<{ categories: any[] }>('/v1/categories');
  }
}

export const api = new ApiClient(API_URL);
export type { ApiResponse };
