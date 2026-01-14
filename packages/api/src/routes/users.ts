import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

export const usersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
usersRoutes.use('*', authMiddleware);

// Schema definitions
const updateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  websiteUrl: z.string().url().optional().nullable(),
  twitterUrl: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
});

// Get current user
usersRoutes.get('/me', async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare(
    `SELECT u.*, up.bio, up.website_url, up.twitter_url, up.linkedin_url, 
            up.phone, up.company, up.job_title
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE u.id = ? AND u.status = 'active'`
  )
    .bind(userId)
    .first();

  if (!user) {
    throw new AppError('NOT_FOUND', 'ユーザーが見つかりません', 404);
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      role: user.role,
      emailVerifiedAt: user.email_verified_at,
      twoFactorEnabled: Boolean(user.two_factor_enabled),
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      profile: {
        bio: user.bio,
        websiteUrl: user.website_url,
        twitterUrl: user.twitter_url,
        linkedinUrl: user.linkedin_url,
        phone: user.phone,
        company: user.company,
        jobTitle: user.job_title,
      },
    },
  });
});

// Update current user profile
usersRoutes.patch('/me/profile', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const data = updateProfileSchema.parse(body);

  // Check if profile exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM user_profiles WHERE user_id = ?'
  )
    .bind(userId)
    .first();

  if (!existing) {
    // Create profile
    await c.env.DB.prepare(
      `INSERT INTO user_profiles (id, user_id, bio, website_url, twitter_url, linkedin_url, phone, company, job_title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
      .bind(
        crypto.randomUUID(),
        userId,
        data.bio || null,
        data.websiteUrl || null,
        data.twitterUrl || null,
        data.linkedinUrl || null,
        data.phone || null,
        data.company || null,
        data.jobTitle || null
      )
      .run();
  } else {
    // Update profile
    const updates: string[] = [];
    const values: any[] = [];

    if (data.bio !== undefined) {
      updates.push('bio = ?');
      values.push(data.bio);
    }
    if (data.websiteUrl !== undefined) {
      updates.push('website_url = ?');
      values.push(data.websiteUrl);
    }
    if (data.twitterUrl !== undefined) {
      updates.push('twitter_url = ?');
      values.push(data.twitterUrl);
    }
    if (data.linkedinUrl !== undefined) {
      updates.push('linkedin_url = ?');
      values.push(data.linkedinUrl);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.company !== undefined) {
      updates.push('company = ?');
      values.push(data.company);
    }
    if (data.jobTitle !== undefined) {
      updates.push('job_title = ?');
      values.push(data.jobTitle);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(userId);

      await c.env.DB.prepare(
        `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`
      )
        .bind(...values)
        .run();
    }
  }

  return c.json({
    success: true,
    message: 'プロフィールを更新しました',
  });
});

// Get user's enrollments (purchased/enrolled courses)
usersRoutes.get('/me/enrollments', async (c) => {
  const userId = c.get('userId');

  const enrollments = await c.env.DB.prepare(
    `SELECT e.*, 
            c.title, c.slug, c.thumbnail_url, c.total_duration, c.total_lectures,
            c.average_rating, c.level,
            ip.display_name as instructor_name, ip.user_id as instructor_id
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     LEFT JOIN instructor_profiles ip ON c.instructor_id = ip.user_id
     WHERE e.user_id = ?
     ORDER BY e.last_accessed_at DESC NULLS LAST, e.created_at DESC`
  )
    .bind(userId)
    .all();

  return c.json({
    success: true,
    data: enrollments.results.map((e) => ({
      id: e.id,
      courseId: e.course_id,
      enrollmentType: e.enrollment_type,
      progressPercent: e.progress_percent,
      completedAt: e.completed_at,
      lastAccessedAt: e.last_accessed_at,
      createdAt: e.created_at,
      course: {
        title: e.title,
        slug: e.slug,
        thumbnailUrl: e.thumbnail_url,
        totalDuration: e.total_duration,
        totalLectures: e.total_lectures,
        averageRating: e.average_rating,
        level: e.level,
        instructor: {
          id: e.instructor_id,
          name: e.instructor_name,
        },
      },
    })),
  });
});

// Get user's certificates
usersRoutes.get('/me/certificates', async (c) => {
  const userId = c.get('userId');

  const certificates = await c.env.DB.prepare(
    `SELECT cert.*, c.title as course_title, c.slug as course_slug
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     WHERE cert.user_id = ?
     ORDER BY cert.issued_at DESC`
  )
    .bind(userId)
    .all();

  return c.json({
    success: true,
    data: certificates.results.map((cert) => ({
      id: cert.id,
      certificateNumber: cert.certificate_number,
      type: cert.type,
      issuedAt: cert.issued_at,
      pdfUrl: cert.pdf_url,
      course: {
        id: cert.course_id,
        title: cert.course_title,
        slug: cert.course_slug,
      },
    })),
  });
});
