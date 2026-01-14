// Enrollment and progress types
export type EnrollmentType = 'purchase' | 'subscription' | 'assigned';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrollmentType: EnrollmentType;
  paymentId: string | null;
  assignedBy: string | null;
  progressPercent: number;
  completedAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LectureProgress {
  id: string;
  userId: string;
  lectureId: string;
  courseId: string;
  watchedSeconds: number;
  isCompleted: boolean;
  completedAt: string | null;
  lastPosition: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchLog {
  id: string;
  userId: string;
  lectureId: string;
  courseId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  playbackRate: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  type: CertificateType;
  pdfUrl: string | null;
  createdAt: string;
}

export type CertificateType = 'completion' | 'achievement' | 'certification';

// Progress update input
export interface UpdateProgressInput {
  watchedSeconds: number;
  lastPosition: number;
  isCompleted?: boolean;
}

// Watch log input
export interface CreateWatchLogInput {
  lectureId: string;
  courseId: string;
  startedAt: string;
  playbackRate?: number;
}

export interface EndWatchLogInput {
  endedAt: string;
  durationSeconds: number;
}
