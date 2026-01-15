import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

export const usersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// =============================================
// Public routes (no auth required)
// =============================================

// Get instructor profile (public)
usersRoutes.get('/:instructorId/instructor-profile', async (c) => {
  const { instructorId } = c.req.param();

  try {
    // Get instructor info with profile
    const instructor = await c.env.DB.prepare(`
      SELECT 
        u.id, u.role,
        up.display_name as name, up.avatar_url, up.bio,
        ip.headline, ip.expertise, ip.experience, ip.website, ip.social_links,
        ip.verified_at
      FROM el_users u
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      LEFT JOIN el_instructor_profiles ip ON u.id = ip.user_id
      WHERE u.id = ? AND u.role = 'instructor' AND u.status = 'active'
    `).bind(instructorId).first();

    if (!instructor) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: '講師が見つかりません' }
      }, 404);
    }

    // Get instructor stats
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT e.user_id) as total_students,
        COUNT(DISTINCT c.id) as total_courses
      FROM el_courses c
      LEFT JOIN el_enrollments e ON c.id = e.course_id
      WHERE c.instructor_id = ? AND c.is_published = 1 AND c.deleted_at IS NULL
    `).bind(instructorId).first();

    // Get reviews stats
    const reviewStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(r.rating) as average_rating
      FROM el_reviews r
      JOIN el_courses c ON r.course_id = c.id
      WHERE c.instructor_id = ? AND c.is_published = 1
    `).bind(instructorId).first();

    // Parse expertise and social_links
    let expertise: string[] = [];
    let socialLinks: any = {};
    
    try {
      if ((instructor as any).expertise) {
        expertise = JSON.parse((instructor as any).expertise);
      }
    } catch { }
    
    try {
      if ((instructor as any).social_links) {
        socialLinks = JSON.parse((instructor as any).social_links);
      }
    } catch { }

    return c.json({
      success: true,
      data: {
        id: (instructor as any).id,
        name: (instructor as any).name || '講師',
        avatarUrl: (instructor as any).avatar_url,
        headline: (instructor as any).headline,
        bio: (instructor as any).bio,
        expertise,
        experience: (instructor as any).experience,
        website: (instructor as any).website,
        socialLinks,
        totalStudents: (stats as any)?.total_students || 0,
        totalCourses: (stats as any)?.total_courses || 0,
        totalReviews: (reviewStats as any)?.total_reviews || 0,
        averageRating: (reviewStats as any)?.average_rating || 0,
        isVerified: !!(instructor as any).verified_at,
      }
    });
  } catch (error) {
    console.error('Get instructor profile error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
    }, 500);
  }
});

// Get instructor's public courses
usersRoutes.get('/:instructorId/courses', async (c) => {
  const { instructorId } = c.req.param();

  try {
    const courses = await c.env.DB.prepare(`
      SELECT 
        c.id, c.title, c.subtitle, c.slug, c.thumbnail_url, c.price, c.currency,
        c.level, c.total_duration, c.total_lectures, c.average_rating, 
        c.total_reviews, c.total_enrollments
      FROM el_courses c
      WHERE c.instructor_id = ? AND c.is_published = 1 AND c.deleted_at IS NULL
      ORDER BY c.total_enrollments DESC, c.created_at DESC
    `).bind(instructorId).all();

    return c.json({
      success: true,
      data: {
        courses: courses.results.map((c: any) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          thumbnailUrl: c.thumbnail_url,
          price: c.price,
          currency: c.currency,
          level: c.level,
          totalDuration: c.total_duration,
          totalLectures: c.total_lectures,
          averageRating: c.average_rating,
          totalReviews: c.total_reviews,
          totalEnrollments: c.total_enrollments,
        })),
      }
    });
  } catch (error) {
    console.error('Get instructor courses error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
    }, 500);
  }
});

// Get instructor's public reviews
usersRoutes.get('/:instructorId/reviews', async (c) => {
  const { instructorId } = c.req.param();
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');

  try {
    const reviews = await c.env.DB.prepare(`
      SELECT 
        r.id, r.course_id, r.rating, r.title, r.content, r.created_at,
        c.title as course_title,
        up.display_name as user_name
      FROM el_reviews r
      JOIN el_courses c ON r.course_id = c.id
      JOIN el_users u ON r.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE c.instructor_id = ? AND c.is_published = 1
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(instructorId, limit, (page - 1) * limit).all();

    const total = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM el_reviews r
      JOIN el_courses c ON r.course_id = c.id
      WHERE c.instructor_id = ? AND c.is_published = 1
    `).bind(instructorId).first<{ count: number }>();

    return c.json({
      success: true,
      data: {
        reviews: reviews.results.map((r: any) => ({
          id: r.id,
          courseId: r.course_id,
          courseTitle: r.course_title,
          rating: r.rating,
          title: r.title,
          content: r.content,
          userName: r.user_name || '受講者',
          createdAt: r.created_at,
        })),
        pagination: {
          page,
          limit,
          total: total?.count || 0,
          totalPages: Math.ceil((total?.count || 0) / limit),
        }
      }
    });
  } catch (error) {
    console.error('Get instructor reviews error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
    }, 500);
  }
});

// =============================================
// Protected routes (auth required)
// =============================================

// Apply auth middleware to /me routes
usersRoutes.use('/me/*', authMiddleware);
usersRoutes.use('/me', authMiddleware);

// Get current user
usersRoutes.get('/me', async (c) => {
  const userId = c.get('userId');

  try {
    const user = await c.env.DB.prepare(
      `SELECT u.*, up.bio, up.display_name, up.avatar_url as profile_avatar
       FROM el_users u
       LEFT JOIN el_user_profiles up ON u.id = up.user_id
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
        id: (user as any).id,
        email: (user as any).email,
        name: (user as any).display_name || (user as any).email?.split('@')[0],
        avatarUrl: (user as any).profile_avatar,
        role: (user as any).role,
        emailVerified: !!(user as any).email_verified,
        createdAt: (user as any).created_at,
        profile: {
          bio: (user as any).bio,
        },
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    if (error instanceof AppError) throw error;
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
    }, 500);
  }
});

// Update current user profile
usersRoutes.patch('/me/profile', async (c) => {
  const userId = c.get('userId');
  
  try {
    const body = await c.req.json();
    const data = updateProfileSchema.parse(body);

    // Check if profile exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM el_user_profiles WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    const now = new Date().toISOString();

    if (!existing) {
      // Create profile
      await c.env.DB.prepare(
        `INSERT INTO el_user_profiles (id, user_id, bio, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          userId,
          data.bio || null,
          now,
          now
        )
        .run();
    } else {
      // Update profile
      if (data.bio !== undefined) {
        await c.env.DB.prepare(
          `UPDATE el_user_profiles SET bio = ?, updated_at = ? WHERE user_id = ?`
        )
          .bind(data.bio, now, userId)
          .run();
      }
    }

    return c.json({
      success: true,
      message: 'プロフィールを更新しました',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
    }, 500);
  }
});

// Get user's enrollments (purchased/enrolled courses)
usersRoutes.get('/me/enrollments', async (c) => {
  const userId = c.get('userId');

  try {
    const enrollments = await c.env.DB.prepare(
      `SELECT e.*, 
              c.title, c.slug, c.thumbnail_url, c.total_duration, c.total_lectures,
              c.average_rating, c.level,
              up.display_name as instructor_name, c.instructor_id
       FROM el_enrollments e
       JOIN el_courses c ON e.course_id = c.id
       LEFT JOIN el_user_profiles up ON c.instructor_id = up.user_id
       WHERE e.user_id = ?
       ORDER BY e.last_accessed_at DESC NULLS LAST, e.created_at DESC`
    )
      .bind(userId)
      .all();

    return c.json({
      success: true,
      data: enrollments.results.map((e: any) => ({
        id: e.id,
        courseId: e.course_id,
        status: e.status,
        progress: e.progress,
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
            name: e.instructor_name || '講師',
          },
        },
      })),
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
    }, 500);
  }
});

// Get user's certificates
usersRoutes.get('/me/certificates', async (c) => {
  const userId = c.get('userId');

  try {
    const certificates = await c.env.DB.prepare(
      `SELECT cert.*, c.title as course_title, c.slug as course_slug
       FROM el_certificates cert
       JOIN el_courses c ON cert.course_id = c.id
       WHERE cert.user_id = ?
       ORDER BY cert.issued_at DESC`
    )
      .bind(userId)
      .all();

    return c.json({
      success: true,
      data: certificates.results.map((cert: any) => ({
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
  } catch (error) {
    console.error('Get certificates error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
    }, 500);
  }
});
