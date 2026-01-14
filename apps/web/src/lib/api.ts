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

  // Progress & Enrollments
  async enrollCourse(courseId: string) {
    return this.request<{ enrollmentId: string; courseId: string; enrolledAt: string }>(
      `/v1/progress/courses/${courseId}/enroll`,
      { method: 'POST' }
    );
  }

  async getCourseProgress(courseId: string) {
    return this.request<{
      courseId: string;
      totalLectures: number;
      completedLectures: number;
      progressPercent: number;
      totalWatchTime: number;
      lastAccessedLecture: any;
      isCompleted: boolean;
    }>(`/v1/progress/courses/${courseId}/progress`);
  }

  async getLecturesProgress(courseId: string) {
    return this.request<{
      lectures: Array<{
        lectureId: string;
        isCompleted: boolean;
        watchedDuration: number;
        completedAt: string | null;
      }>;
    }>(`/v1/progress/courses/${courseId}/lectures/progress`);
  }

  async completeLecture(courseId: string, lectureId: string, watchedDuration?: number) {
    return this.request<{ lectureId: string; completedAt: string }>(
      `/v1/progress/courses/${courseId}/lectures/${lectureId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ watchedDuration }),
      }
    );
  }

  async getMyProgress() {
    return this.request<{
      courses: Array<{
        courseId: string;
        title: string;
        thumbnailUrl: string;
        enrolledAt: string;
        totalLectures: number;
        completedLectures: number;
        progressPercent: number;
        totalWatchTime: number;
        isCompleted: boolean;
      }>;
    }>('/v1/progress/my-progress');
  }

  // Payments
  async createCheckoutSession(courseId: string, successUrl?: string, cancelUrl?: string) {
    return this.request<{ sessionId: string; url: string }>(
      '/v1/payments/checkout',
      {
        method: 'POST',
        body: JSON.stringify({ courseId, successUrl, cancelUrl }),
      }
    );
  }

  async getPaymentHistory() {
    return this.request<{
      payments: Array<{
        id: string;
        courseId: string;
        courseTitle: string;
        amount: number;
        currency: string;
        status: string;
        createdAt: string;
      }>;
    }>('/v1/payments/history');
  }

  // Certificates
  async getCertificates() {
    return this.request<{
      certificates: Array<{
        id: string;
        courseId: string;
        courseTitle: string;
        issuedAt: string;
        certificateUrl: string;
      }>;
    }>('/v1/certificates');
  }

  async downloadCertificate(courseId: string) {
    return this.request<{ url: string }>(`/v1/certificates/${courseId}/download`);
  }

  // Learning Time Logs (助成金対応)
  async getLearningTimeLogs(params?: { startDate?: string; endDate?: string; courseId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.courseId) searchParams.set('courseId', params.courseId);

    const query = searchParams.toString();
    return this.request<{
      logs: Array<{
        date: string;
        courseId: string;
        courseTitle: string;
        totalDuration: number;
        sessions: number;
      }>;
      totalDuration: number;
    }>(`/v1/learning-time${query ? `?${query}` : ''}`);
  }

  async exportLearningTimeLogs(params?: { startDate?: string; endDate?: string; format?: 'csv' | 'pdf' }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.format) searchParams.set('format', params.format);

    const query = searchParams.toString();
    return this.request<{ url: string }>(`/v1/learning-time/export${query ? `?${query}` : ''}`);
  }

  // Admin
  async getAdminStats() {
    return this.request<{
      totalUsers: number;
      totalCourses: number;
      totalEnrollments: number;
      totalRevenue: number;
      newUsersThisMonth: number;
      newEnrollmentsThisMonth: number;
    }>('/v1/admin/stats');
  }

  async getAdminUsers(params?: { page?: number; limit?: number; role?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.role) searchParams.set('role', params.role);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<{ users: any[]; pagination: any }>(`/v1/admin/users${query ? `?${query}` : ''}`);
  }

  async updateUserStatus(userId: string, status: string) {
    return this.request<any>(`/v1/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getAdminCourses(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<{ courses: any[]; pagination: any }>(`/v1/admin/courses${query ? `?${query}` : ''}`);
  }

  async approveCourse(courseId: string) {
    return this.request<any>(`/v1/admin/courses/${courseId}/approve`, { method: 'POST' });
  }

  async rejectCourse(courseId: string, reason: string) {
    return this.request<any>(`/v1/admin/courses/${courseId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Videos (Cloudflare Stream)
  async getVideoUploadUrl() {
    return this.request<{
      uploadId: string;
      uploadUrl: string;
      expiresAt: string;
    }>('/v1/videos/upload-url', { method: 'POST' });
  }

  async getVideoStatus(videoId: string) {
    return this.request<{
      videoId: string;
      status: string;
      duration: number;
      thumbnail: string;
      playbackUrl: string;
    }>(`/v1/videos/status/${videoId}`);
  }

  async linkVideoToLecture(data: {
    courseId: string;
    sectionId: string;
    lectureId: string;
    streamVideoId: string;
    duration?: number;
  }) {
    return this.request<{
      videoId: string;
      lectureId: string;
      streamVideoId: string;
      duration: number;
      hlsUrl: string;
      thumbnailUrl: string;
    }>('/v1/videos/link', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getVideoPlaybackUrl(lectureId: string) {
    return this.request<{
      lectureId: string;
      playbackUrl: string;
      thumbnailUrl: string;
      duration: number;
      isFree: boolean;
    }>(`/v1/videos/playback/${lectureId}`);
  }
}

export const api = new ApiClient(API_URL);
export type { ApiResponse };
