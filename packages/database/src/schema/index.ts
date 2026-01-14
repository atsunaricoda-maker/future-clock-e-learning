/**
 * Database Schema Index
 * 全テーブル定義のエクスポート
 */

// Users
export {
  users,
  userProfiles,
  instructorProfiles,
  socialAccounts,
} from './users';

// Courses
export {
  categories,
  courses,
  sections,
  lectures,
  videos,
  attachments,
} from './courses';

// Enrollments & Progress
export {
  enrollments,
  lectureProgress,
  watchLogs,
} from './enrollments';

// Payments
export {
  payments,
  coupons,
  couponUsages,
  payouts,
  payoutItems,
} from './payments';

// Reviews & Q&A
export {
  reviews,
  questions,
  answers,
  notifications,
} from './reviews';

// Organizations (Phase 2)
export {
  organizations,
  organizationMembers,
  organizationGroups,
  organizationGroupMembers,
} from './organizations';
