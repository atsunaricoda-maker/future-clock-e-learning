export type UserRole = "admin" | "company_admin" | "student";
export type CourseStatus = "draft" | "published" | "archived";
export type LessonType = "video" | "document" | "quiz";
export type QuestionType = "multiple_choice" | "true_false";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type NotificationType = "enrollment" | "lesson_complete" | "quiz_result" | "certificate";

export interface NotificationPreferences {
  email_enrollment: boolean;
  email_lesson_complete: boolean;
  email_quiz_result: boolean;
  email_certificate: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  company_id: string | null;
  is_active: boolean;
  notification_preferences: NotificationPreferences | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan_type: string;
  max_users: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  status: CourseStatus;
  is_public: boolean;
  estimated_duration_min: number | null;
  difficulty_level: string | null;
  category: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  type: LessonType;
  content_url: string | null;
  duration_seconds: number | null;
  order_index: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string | null;
  description: string | null;
  pass_threshold: number;
  time_limit_seconds: number | null;
  max_attempts: number | null;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  type: QuestionType;
  text: string;
  options: QuestionOption[];
  correct_answer: { id: string };
  explanation: string | null;
  points: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percentage: number;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  video_position_seconds: number;
  max_watched_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number | null;
  passed: boolean | null;
  answers: Record<string, string> | null;
  started_at: string;
  completed_at: string | null;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  pdf_url: string | null;
  issued_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_url: string | null;
  created_at: string;
}

export interface CompanyCourse {
  id: string;
  company_id: string;
  course_id: string;
  assigned_at: string;
  expires_at: string | null;
}

export type InvitationStatus = "pending" | "accepted" | "cancelled";

export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  invited_by: string;
  status: InvitationStatus;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface Review {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}
