// Course types based on the database design
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'unpublished';
export type LectureType = 'video' | 'text' | 'quiz';

export interface Course {
  id: string;
  instructorId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  requirements: string[] | null;
  objectives: string[] | null;
  targetAudience: string[] | null;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  language: string;
  level: CourseLevel;
  price: number;
  salePrice: number | null;
  saleEndsAt: string | null;
  isSubscriptionIncluded: boolean;
  isSubsidyEligible: boolean;
  totalDuration: number;
  totalLectures: number;
  status: CourseStatus;
  publishedAt: string | null;
  averageRating: number;
  totalReviews: number;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lecture {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  description: string | null;
  type: LectureType;
  videoUrl: string | null;
  videoDuration: number | null;
  content: string | null;
  isPreview: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  title: string;
  subtitle?: string;
  description?: string;
  categoryId?: string;
  level?: CourseLevel;
  price?: number;
  language?: string;
}

export interface UpdateCourseInput {
  title?: string;
  subtitle?: string;
  description?: string;
  categoryId?: string;
  level?: CourseLevel;
  price?: number;
  salePrice?: number;
  saleEndsAt?: string;
  requirements?: string[];
  objectives?: string[];
  targetAudience?: string[];
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  isSubscriptionIncluded?: boolean;
  isSubsidyEligible?: boolean;
}

export interface CreateSectionInput {
  courseId: string;
  title: string;
  description?: string;
  order?: number;
}

export interface CreateLectureInput {
  sectionId: string;
  courseId: string;
  title: string;
  description?: string;
  type?: LectureType;
  content?: string;
  isPreview?: boolean;
  order?: number;
}

// Course with related data for display
export interface CourseWithDetails extends Course {
  instructor?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    displayName: string;
    headline: string | null;
  };
  category?: Category;
  sectionsCount?: number;
  lecturesCount?: number;
}

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  price: number;
  salePrice: number | null;
  level: CourseLevel;
  averageRating: number;
  totalReviews: number;
  totalEnrollments: number;
  totalDuration: number;
  isSubscriptionIncluded: boolean;
  isSubsidyEligible: boolean;
  instructor: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}
