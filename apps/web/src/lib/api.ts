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

  async getWeeklyStudyTime() {
    return this.request<{
      weeklyData: Array<{
        dayOfWeek: string;
        date: string;
        totalMinutes: number;
      }>;
      thisWeekTotal: number;
      lastWeekTotal: number;
    }>('/v1/progress/weekly-study-time');
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

  async updateUserRole(userId: string, role: string) {
    return this.request<any>(`/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // Instructor Payouts (Admin)
  async getAdminInstructorPayouts(params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    hasPendingPayout?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.hasPendingPayout) searchParams.set('hasPendingPayout', 'true');

    const query = searchParams.toString();
    return this.request<{
      instructors: Array<{
        id: string;
        instructorId: string;
        instructorName: string;
        instructorEmail: string;
        totalSales: number;
        platformFee: number;
        commissionRate: number;
        netPayout: number;
        pendingBalance: number;
        paidAmount: number;
        lastPayoutDate: string | null;
        payoutStatus: string;
      }>;
      pagination: any;
      summary?: {
        totalPendingPayouts: number;
        totalPaidThisMonth: number;
        totalInstructors: number;
        averageCommissionRate: number;
      };
    }>(`/v1/admin/instructor-payouts${query ? `?${query}` : ''}`);
  }

  async getAdminPayoutHistory(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<{
      payouts: Array<{
        id: string;
        instructorId: string;
        instructorName: string;
        amount: number;
        status: string;
        payoutDate: string;
        processedAt: string | null;
        transactionId: string | null;
        note: string | null;
      }>;
      pagination: any;
    }>(`/v1/admin/payout-history${query ? `?${query}` : ''}`);
  }

  async processInstructorPayout(instructorId: string, data: { amount: number; note?: string }) {
    return this.request<{ payoutId: string; status: string }>(`/v1/admin/instructors/${instructorId}/payout`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInstructorCommissionRate(instructorId: string, data: { commissionRate: number }) {
    return this.request<any>(`/v1/admin/instructors/${instructorId}/commission-rate`, {
      method: 'PUT',
      body: JSON.stringify(data),
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

  async getAdminEnrollments(params?: { page?: number; limit?: number; courseId?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.courseId) searchParams.set('courseId', params.courseId);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return this.request<{
      enrollments: Array<{
        id: string;
        userId: string;
        userEmail: string;
        userName: string;
        courseId: string;
        courseTitle: string;
        enrolledAt: string;
        paymentStatus: string;
        amount: number;
        currency: string;
        progressPercent: number;
        isCompleted: boolean;
      }>;
      pagination: any;
    }>(`/v1/admin/enrollments${query ? `?${query}` : ''}`);
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

  // Images / Thumbnails (Cloudflare R2)
  async getImageUploadUrl(type: 'thumbnail' | 'avatar' | 'promo') {
    return this.request<{
      uploadId: string;
      uploadUrl: string;
      publicUrl: string;
      expiresAt: string;
    }>(`/v1/images/upload-url?type=${type}`, { method: 'POST' });
  }

  async uploadCourseThumbnail(courseId: string, file: File) {
    // For direct upload, we need to use FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);

    const currentToken = this.getToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/courses/${courseId}/thumbnail`, {
        method: 'POST',
        headers: {
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'UPLOAD_ERROR',
            message: data.message || 'アップロードに失敗しました',
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

  async deleteCourseThumbnail(courseId: string) {
    return this.request<{ deleted: boolean }>(`/v1/courses/${courseId}/thumbnail`, {
      method: 'DELETE',
    });
  }

  async uploadPromoVideo(courseId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);

    const currentToken = this.getToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/courses/${courseId}/promo-video`, {
        method: 'POST',
        headers: {
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'UPLOAD_ERROR',
            message: data.message || 'アップロードに失敗しました',
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

  // Instructor
  async getInstructorStats() {
    return this.request<{
      publishedCourses: number;
      totalEnrollments: number;
      monthlyRevenue: number;
      averageRating: number;
      newEnrollmentsThisMonth: number;
    }>('/v1/instructor/stats');
  }

  async getInstructorCourses(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<{ courses: any[]; pagination: any }>(`/v1/instructor/courses${query ? `?${query}` : ''}`);
  }

  async getInstructorRevenue(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    return this.request<{
      commissionRate: number;
      totalEarnings: number;
      pendingBalance: number;
      monthly: Array<{
        month: string;
        grossRevenue: number;
        netRevenue: number;
        transactionCount: number;
      }>;
      byCourse: Array<{
        courseId: string;
        courseTitle: string;
        grossRevenue: number;
        netRevenue: number;
        salesCount: number;
      }>;
    }>(`/v1/instructor/revenue${query ? `?${query}` : ''}`);
  }

  async getInstructorQuestions(params?: { page?: number; limit?: number; status?: string; courseId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.courseId) searchParams.set('courseId', params.courseId);

    const query = searchParams.toString();
    return this.request<{
      questions: Array<{
        id: string;
        title: string;
        content: string;
        status: string;
        courseId: string;
        courseTitle: string;
        userName: string;
        answerCount: number;
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: any;
    }>(`/v1/instructor/questions${query ? `?${query}` : ''}`);
  }

  async answerQuestion(questionId: string, content: string) {
    return this.request<{ id: string; content: string; createdAt: string }>(
      `/v1/instructor/questions/${questionId}/answer`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
  }

  async getInstructorAnalytics() {
    return this.request<{
      dailyEnrollments: Array<{ date: string; count: number }>;
      dailyRevenue: Array<{ date: string; revenue: number }>;
      courseStats: Array<{
        courseId: string;
        courseTitle: string;
        totalEnrollments: number;
        completedCount: number;
        averageRating: number;
        totalReviews: number;
        totalRevenue: number;
      }>;
      recentReviews: Array<{
        id: string;
        rating: number;
        title: string;
        content: string;
        courseId: string;
        courseTitle: string;
        userName: string;
        createdAt: string;
      }>;
    }>('/v1/instructor/analytics');
  }

  async getInstructorStudents(params?: { page?: number; limit?: number; courseId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.courseId) searchParams.set('courseId', params.courseId);

    const query = searchParams.toString();
    return this.request<{
      students: Array<{
        id: string;
        email: string;
        displayName: string;
        enrolledCourses: number;
        lastEnrollment: string;
        joinedAt: string;
      }>;
      pagination: any;
    }>(`/v1/instructor/students${query ? `?${query}` : ''}`);
  }

  // Reviews
  async getCourseReviews(courseId: string, params?: { page?: number; limit?: number; sortBy?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);

    const query = searchParams.toString();
    return this.request<{
      reviews: Array<{
        id: string;
        rating: number;
        title: string;
        content: string;
        helpfulCount: number;
        isVerifiedPurchase: boolean;
        userName: string;
        avatarUrl: string;
        createdAt: string;
      }>;
      ratingDistribution: Record<number, number>;
      pagination: any;
    }>(`/v1/reviews/courses/${courseId}${query ? `?${query}` : ''}`);
  }

  async getMyReview(courseId: string) {
    return this.request<{
      id: string;
      rating: number;
      title: string;
      content: string;
      createdAt: string;
      updatedAt: string;
    } | null>(`/v1/reviews/my/${courseId}`);
  }

  async createReview(courseId: string, data: { rating: number; title?: string; content?: string }) {
    return this.request<{ id: string }>(`/v1/reviews/courses/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReview(reviewId: string, data: { rating: number; title?: string; content?: string }) {
    return this.request<any>(`/v1/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReview(reviewId: string) {
    return this.request<any>(`/v1/reviews/${reviewId}`, { method: 'DELETE' });
  }

  async markReviewHelpful(reviewId: string) {
    return this.request<any>(`/v1/reviews/${reviewId}/helpful`, { method: 'POST' });
  }

  // Notifications
  async getNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');

    const query = searchParams.toString();
    return this.request<{
      notifications: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        link: string;
        isRead: boolean;
        createdAt: string;
      }>;
      unreadCount: number;
      pagination: any;
    }>(`/v1/notifications${query ? `?${query}` : ''}`);
  }

  async getUnreadCount() {
    return this.request<{ count: number }>('/v1/notifications/unread-count');
  }

  async markNotificationRead(notificationId: string) {
    return this.request<any>(`/v1/notifications/${notificationId}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/v1/notifications/read-all', { method: 'PUT' });
  }

  // Coupons
  async validateCoupon(code: string, courseId?: string) {
    return this.request<{
      couponId: string;
      code: string;
      discountType: string;
      discountValue: number;
      discountAmount: number;
      description: string;
      validUntil: string;
    }>('/v1/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, courseId }),
    });
  }

  // Questions (Q&A)
  async getCourseQuestions(courseId: string, params?: { page?: number; limit?: number; lectureId?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.lectureId) searchParams.set('lectureId', params.lectureId);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<{
      questions: Array<{
        id: string;
        title: string;
        content: string;
        status: string;
        lectureId: string;
        lectureTitle: string;
        userName: string;
        avatarUrl: string;
        answerCount: number;
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: any;
    }>(`/v1/questions/courses/${courseId}${query ? `?${query}` : ''}`);
  }

  async getQuestion(questionId: string) {
    return this.request<{
      question: {
        id: string;
        courseId: string;
        lectureId: string;
        lectureTitle: string;
        title: string;
        content: string;
        status: string;
        userId: string;
        userName: string;
        avatarUrl: string;
        createdAt: string;
        updatedAt: string;
      };
      answers: Array<{
        id: string;
        content: string;
        isAccepted: boolean;
        isInstructor: boolean;
        userId: string;
        userName: string;
        avatarUrl: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/v1/questions/${questionId}`);
  }

  async createQuestion(data: { courseId: string; lectureId?: string; title: string; content: string }) {
    return this.request<{ id: string }>('/v1/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createAnswer(questionId: string, content: string) {
    return this.request<{ id: string }>(`/v1/questions/${questionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async acceptAnswer(questionId: string, answerId: string) {
    return this.request<any>(`/v1/questions/${questionId}/answers/${answerId}/accept`, { method: 'PUT' });
  }

  async getMyQuestions(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<{
      questions: Array<{
        id: string;
        title: string;
        status: string;
        courseId: string;
        courseTitle: string;
        answerCount: number;
        createdAt: string;
      }>;
      pagination: any;
    }>(`/v1/questions/my/list${query ? `?${query}` : ''}`);
  }

  // Wishlist
  async getWishlist() {
    return this.request<{
      items: Array<{
        id: string;
        addedAt: string;
        course: {
          id: string;
          title: string;
          subtitle: string;
          slug: string;
          thumbnailUrl: string;
          price: number;
          currency: string;
          averageRating: number;
          totalReviews: number;
          totalEnrollments: number;
          level: string;
          instructorName: string;
        };
      }>;
    }>('/v1/wishlist');
  }

  async addToWishlist(courseId: string) {
    return this.request<{ id: string }>(`/v1/wishlist/courses/${courseId}`, { method: 'POST' });
  }

  async removeFromWishlist(courseId: string) {
    return this.request<any>(`/v1/wishlist/courses/${courseId}`, { method: 'DELETE' });
  }

  async checkWishlist(courseId: string) {
    return this.request<{ isInWishlist: boolean }>(`/v1/wishlist/courses/${courseId}/check`);
  }

  // Coupons
  async getCoupons(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<{
      coupons: Array<{
        id: string;
        code: string;
        description: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        courseId: string;
        courseTitle: string;
        maxUses: number;
        usedCount: number;
        isActive: boolean;
        validFrom: string;
        validUntil: string;
        createdAt: string;
      }>;
      pagination: any;
    }>(`/v1/coupons${query ? `?${query}` : ''}`);
  }

  async createCoupon(data: {
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    courseId?: string;
    maxUses?: number;
    maxUsesPerUser?: number;
    validFrom?: string;
    validUntil?: string;
  }) {
    return this.request<{ id: string; code: string }>('/v1/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deactivateCoupon(couponId: string) {
    return this.request<any>(`/v1/coupons/${couponId}/deactivate`, { method: 'PUT' });
  }

  // Password Reset / Email
  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/v1/email/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ message: string }>('/v1/email/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async verifyResetToken(token: string) {
    return this.request<{ email: string; expiresAt: string }>(`/v1/email/verify-reset-token?token=${token}`);
  }

  // Notes
  async getNotes(params?: { lectureId?: string; courseId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.lectureId) searchParams.set('lectureId', params.lectureId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);

    const query = searchParams.toString();
    return this.request<{
      notes: Array<{
        id: string;
        lectureId: string;
        lectureTitle?: string;
        sectionTitle?: string;
        courseTitle?: string;
        courseId?: string;
        content: string;
        timestampSeconds: number | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/v1/notes${query ? `?${query}` : ''}`);
  }

  async createNote(data: { lectureId: string; content: string; timestampSeconds?: number }) {
    return this.request<{
      id: string;
      lectureId: string;
      content: string;
      timestampSeconds: number | null;
      createdAt: string;
    }>('/v1/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNote(noteId: string, data: { content: string; timestampSeconds?: number }) {
    return this.request<{
      id: string;
      content: string;
      timestampSeconds: number | null;
      updatedAt: string;
    }>(`/v1/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(noteId: string) {
    return this.request<{ deleted: boolean }>(`/v1/notes/${noteId}`, { method: 'DELETE' });
  }

  // Bookmarks
  async getBookmarks(params?: { lectureId?: string; courseId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.lectureId) searchParams.set('lectureId', params.lectureId);
    if (params?.courseId) searchParams.set('courseId', params.courseId);

    const query = searchParams.toString();
    return this.request<{
      bookmarks: Array<{
        id: string;
        lectureId: string;
        lectureTitle?: string;
        sectionTitle?: string;
        courseTitle?: string;
        courseId?: string;
        title: string | null;
        timestampSeconds: number;
        createdAt: string;
      }>;
    }>(`/v1/notes/bookmarks${query ? `?${query}` : ''}`);
  }

  async createBookmark(data: { lectureId: string; timestampSeconds: number; title?: string }) {
    return this.request<{
      id: string;
      lectureId: string;
      title: string | null;
      timestampSeconds: number;
      createdAt: string;
    }>('/v1/notes/bookmarks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBookmark(bookmarkId: string) {
    return this.request<{ deleted: boolean }>(`/v1/notes/bookmarks/${bookmarkId}`, { method: 'DELETE' });
  }

  // Instructor Videos
  async getInstructorVideos() {
    return this.request<{
      videos: Array<{
        id: string;
        title: string;
        duration: number;
        status: 'processing' | 'ready' | 'error';
        thumbnailUrl?: string;
        size?: number;
        createdAt: string;
        linkedLecture?: {
          id: string;
          title: string;
          courseTitle: string;
        };
      }>;
    }>('/v1/instructor/videos');
  }

  async deleteVideo(videoId: string) {
    return this.request<any>(`/v1/videos/${videoId}`, { method: 'DELETE' });
  }

  // Course Review Submission
  async submitCourseForReview(courseId: string) {
    return this.request<{ courseId: string; status: string; submittedAt: string }>(
      `/v1/courses/${courseId}/publish`,
      { method: 'POST' }
    );
  }

  // Public Instructor Profile
  async getInstructorProfile(instructorId: string) {
    return this.request<{
      id: string;
      name: string;
      avatarUrl?: string;
      headline?: string;
      bio?: string;
      expertise?: string[];
      experience?: string;
      website?: string;
      socialLinks?: {
        twitter?: string;
        linkedin?: string;
        youtube?: string;
      };
      totalStudents: number;
      totalCourses: number;
      totalReviews: number;
      averageRating: number;
      isVerified?: boolean;
    }>(`/v1/users/${instructorId}/instructor-profile`);
  }

  async getInstructorPublicCourses(instructorId: string) {
    return this.request<{
      courses: Array<{
        id: string;
        title: string;
        subtitle?: string;
        thumbnailUrl?: string;
        price: number;
        currency: string;
        level: string;
        totalDuration: number;
        totalLectures: number;
        averageRating: number;
        totalReviews: number;
        totalEnrollments: number;
      }>;
    }>(`/v1/users/${instructorId}/courses`);
  }

  async getInstructorPublicReviews(instructorId: string, params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<{
      reviews: Array<{
        id: string;
        courseId: string;
        courseTitle: string;
        rating: number;
        title?: string;
        content?: string;
        userName: string;
        createdAt: string;
      }>;
      pagination: any;
    }>(`/v1/users/${instructorId}/reviews${query ? `?${query}` : ''}`);
  }

  // Subscriptions
  async getSubscriptionPlans() {
    return this.request<{
      plans: Array<{
        id: string;
        name: string;
        slug: string;
        description: string;
        priceMonthly: number;
        priceYearly: number;
        currency: string;
        features: string[];
        maxCourses: number | null;
      }>;
    }>('/v1/subscriptions/plans');
  }

  async getMySubscription() {
    return this.request<{
      subscription: {
        id: string;
        planId: string;
        planName: string;
        planSlug: string;
        billingCycle: 'monthly' | 'yearly';
        status: string;
        priceMonthly: number;
        priceYearly: number;
        features: string[];
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        canceledAt: string | null;
        trialEnd: string | null;
        createdAt: string;
      } | null;
    }>('/v1/subscriptions/my-subscription');
  }

  async subscribe(data: { planId: string; billingCycle: 'monthly' | 'yearly'; successUrl?: string; cancelUrl?: string }) {
    return this.request<{
      sessionId?: string;
      url?: string;
      subscriptionId?: string;
      status?: string;
      message?: string;
    }>('/v1/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelSubscription() {
    return this.request<{ message: string }>('/v1/subscriptions/cancel', { method: 'POST' });
  }

  async resumeSubscription() {
    return this.request<{ message: string }>('/v1/subscriptions/resume', { method: 'POST' });
  }

  async changeSubscriptionPlan(data: { newPlanId: string; billingCycle?: 'monthly' | 'yearly' }) {
    return this.request<{ message: string }>('/v1/subscriptions/change-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSubscriptionPayments(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<{
      payments: Array<{
        id: string;
        planName: string;
        amount: number;
        currency: string;
        status: string;
        paidAt: string;
        billingPeriodStart: string;
        billingPeriodEnd: string;
      }>;
      pagination: any;
    }>(`/v1/subscriptions/payments${query ? `?${query}` : ''}`);
  }

  async checkSubscriptionAccess() {
    return this.request<{
      hasAccess: boolean;
      plan: string | null;
      expiresAt?: string;
    }>('/v1/subscriptions/check-access');
  }
}

export const api = new ApiClient(API_URL);
export type { ApiResponse };
