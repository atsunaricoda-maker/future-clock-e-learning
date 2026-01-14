// Role hierarchy for permission checks
export const ROLE_HIERARCHY = {
  learner: 1,
  instructor: 2,
  admin: 3,
  super_admin: 4,
} as const;

// Course pricing
export const COURSE_PRICING = {
  MIN_PRICE: 0,
  MAX_PRICE: 100000, // 10万円
  DEFAULT_CURRENCY: 'JPY',
} as const;

// Video settings
export const VIDEO_SETTINGS = {
  MAX_FILE_SIZE: 4 * 1024 * 1024 * 1024, // 4GB
  ALLOWED_TYPES: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
  ALLOWED_EXTENSIONS: ['.mp4', '.mov', '.avi'],
  RESOLUTIONS: ['720p', '1080p'] as const,
  DEFAULT_RESOLUTION: '720p' as const,
  HLS_SEGMENT_DURATION: 6, // seconds
} as const;

// Attachment settings
export const ATTACHMENT_SETTINGS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'text/plain',
    'image/png',
    'image/jpeg',
  ],
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Revenue share settings
export const REVENUE_SHARE = {
  // PPV revenue share
  PPV_INSTRUCTOR_REFERRAL: 0.9, // 90% for instructor's own referral
  PPV_PLATFORM_REFERRAL: 0.6, // 60% for platform referral
  PPV_AFFILIATE_INSTRUCTOR: 0.5, // 50% instructor, 40% platform, 10% affiliate
  PPV_AFFILIATE_PLATFORM: 0.4,
  PPV_AFFILIATE_COMMISSION: 0.1,
  
  // Subscription revenue share
  SUBSCRIPTION_INSTRUCTOR_POOL: 0.6, // 60% to instructor pool
  SUBSCRIPTION_BASIC_INCOME_POOL: 0.1, // 10% of instructor pool for basic income
} as const;

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'フリー',
    price: 0,
    features: ['無料コース視聴', 'プレビュー動画'],
  },
  standard: {
    name: 'スタンダード',
    monthlyPrice: 2980,
    yearlyPrice: 29800,
    features: ['全コース見放題', '進捗管理', '修了証発行'],
  },
  premium: {
    name: 'プレミアム',
    monthlyPrice: 4980,
    yearlyPrice: 49800,
    features: ['全コース見放題', '質問優先対応', '修了証発行無制限', 'オフライン研修割引'],
  },
} as const;

// B2B plans
export const B2B_PLANS = {
  team: {
    name: 'チーム',
    pricePerSeat: 1980,
    minSeats: 5,
    features: ['全コース見放題', '管理機能'],
  },
  business: {
    name: 'ビジネス',
    pricePerSeat: 2980,
    minSeats: 5,
    features: ['全コース見放題', '進捗レポート', '助成金対応'],
  },
  enterprise: {
    name: 'エンタープライズ',
    pricePerSeat: null, // Custom pricing
    minSeats: 50,
    features: ['全機能', 'カスタマイズ', '専任サポート'],
  },
} as const;

// Certificate settings
export const CERTIFICATE_SETTINGS = {
  COMPLETION_THRESHOLD: 1.0, // 100% completion required
  QUIZ_PASS_SCORE: 0.7, // 70% to pass
} as const;

// Watch log settings (for subsidy compliance)
export const WATCH_LOG_SETTINGS = {
  HEARTBEAT_INTERVAL: 30, // seconds
  MIN_WATCH_DURATION: 5, // minimum seconds to count as watched
  MAX_PLAYBACK_RATE: 2.0, // maximum allowed playback rate
} as const;
