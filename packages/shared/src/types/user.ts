// User types based on the database design
export type UserRole = 'learner' | 'instructor' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  bio: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstructorProfile {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  expertise: string[] | null;
  qualifications: string[] | null;
  reviewStatus: InstructorReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
}

export type InstructorReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CreateUserInput {
  email: string;
  name: string;
  avatarUrl?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  avatarUrl?: string;
}

export interface UpdateProfileInput {
  bio?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
}
