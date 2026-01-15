import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';

const coursesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']).default('all_levels'),
  language: z.string().default('ja'),
  price: z.number().min(0).default(0),
  objectives: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  targetAudience: z.array(z.string()).optional(),
});

const updateCourseSchema = createCourseSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  categoryId: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']).optional(),
  status: z.enum(['draft', 'pending_review', 'published', 'unpublished', 'rejected']).optional(),
  instructorId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'price', 'rating', 'enrollments']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /courses - List courses (public, with filtering)
coursesRoutes.get('/', zValidator('query', querySchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.env.DB;

  try {
    // Build query for courses
    let sql = `
      SELECT 
        c.id,
        c.title,
        c.subtitle,
        c.description,
        c.slug,
        c.level,
        c.price,
        c.currency,
        c.thumbnail_url as thumbnailUrl,
        c.average_rating as averageRating,
        c.total_reviews as totalReviews,
        c.total_enrollments as totalEnrollments,
        c.total_duration as totalDuration,
        c.total_lectures as totalLectures,
        c.status,
        c.is_published as isPublished,
        c.is_subsidy_eligible as isSubsidyEligible,
        c.created_at as createdAt,
        c.updated_at as updatedAt,
        c.instructor_id as instructorId,
        p.display_name as instructorName,
        c.category_id as categoryId,
        cat.name as categoryName
      FROM el_courses c
      LEFT JOIN el_user_profiles p ON c.instructor_id = p.user_id
      LEFT JOIN el_categories cat ON c.category_id = cat.id
      WHERE c.deleted_at IS NULL AND c.is_published = 1
    `;

    const params: any[] = [];

    if (query.categoryId) {
      sql += ` AND c.category_id = ?`;
      params.push(query.categoryId);
    }

    if (query.level) {
      sql += ` AND c.level = ?`;
      params.push(query.level);
    }

    if (query.search) {
      sql += ` AND (c.title LIKE ? OR c.subtitle LIKE ? OR c.description LIKE ?)`;
      const searchTerm = `%${query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add sorting
    const sortColumn = {
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
      price: 'c.price',
      rating: 'c.average_rating',
      enrollments: 'c.total_enrollments',
    }[query.sortBy];
    
    sql += ` ORDER BY ${sortColumn} ${query.sortOrder.toUpperCase()}`;

    // Add pagination
    const offset = (query.page - 1) * query.limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(query.limit, offset);

    const result = await db.prepare(sql).bind(...params).all();

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM el_courses c WHERE c.deleted_at IS NULL AND c.is_published = 1`;
    const countParams: any[] = [];
    
    if (query.categoryId) {
      countSql += ` AND c.category_id = ?`;
      countParams.push(query.categoryId);
    }
    if (query.level) {
      countSql += ` AND c.level = ?`;
      countParams.push(query.level);
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first<{ total: number }>();
    const total = countResult?.total || 0;

    // Transform results
    const courses = result.results.map((row: any) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      slug: row.slug,
      level: row.level,
      price: row.price,
      currency: row.currency,
      thumbnailUrl: row.thumbnailUrl,
      averageRating: row.averageRating || 0,
      totalReviews: row.totalReviews || 0,
      totalEnrollments: row.totalEnrollments || 0,
      totalDuration: row.totalDuration || 0,
      totalLectures: row.totalLectures || 0,
      status: row.status,
      isPublished: row.isPublished === 1,
      isSubsidyEligible: row.isSubsidyEligible === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      instructor: {
        id: row.instructorId,
        name: row.instructorName || '講師',
      },
      category: {
        id: row.categoryId,
        name: row.categoryName || 'その他',
      },
    }));

    return c.json({
      success: true,
      data: {
        courses,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return c.json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'コースの取得に失敗しました',
      },
    }, 500);
  }
});

// GET /courses/:id - Get course details
coursesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;

  try {
    // Get course with instructor and category
    const course = await db.prepare(`
      SELECT 
        c.*,
        p.display_name as instructor_name,
        p.avatar_url as instructor_avatar,
        ip.headline as instructor_headline,
        cat.name as category_name,
        cat.slug as category_slug
      FROM el_courses c
      LEFT JOIN el_user_profiles p ON c.instructor_id = p.user_id
      LEFT JOIN el_instructor_profiles ip ON c.instructor_id = ip.user_id
      LEFT JOIN el_categories cat ON c.category_id = cat.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `).bind(id).first<any>();

    if (!course) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'コースが見つかりません',
        },
      }, 404);
    }

    // Get sections and lectures
    const sections = await db.prepare(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.sort_order
      FROM el_sections s
      WHERE s.course_id = ?
      ORDER BY s.sort_order
    `).bind(id).all();

    const sectionsWithLectures = await Promise.all(
      sections.results.map(async (section: any) => {
        const lectures = await db.prepare(`
          SELECT 
            l.id,
            l.title,
            l.description,
            l.content_type,
            l.duration,
            l.is_free,
            l.is_published,
            l.sort_order
          FROM el_lectures l
          WHERE l.section_id = ?
          ORDER BY l.sort_order
        `).bind(section.id).all();

        return {
          id: section.id,
          title: section.title,
          description: section.description,
          sortOrder: section.sort_order,
          lectures: lectures.results.map((l: any) => ({
            id: l.id,
            title: l.title,
            description: l.description,
            contentType: l.content_type,
            duration: l.duration || 0,
            isFree: l.is_free === 1,
            isPublished: l.is_published === 1,
          })),
        };
      })
    );

    return c.json({
      success: true,
      data: {
        id: course.id,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        slug: course.slug,
        level: course.level,
        language: course.language,
        price: course.price,
        discountPrice: course.discount_price,
        currency: course.currency,
        thumbnailUrl: course.thumbnail_url,
        promoVideoUrl: course.promo_video_url,
        objectives: course.objectives ? JSON.parse(course.objectives) : [],
        requirements: course.requirements ? JSON.parse(course.requirements) : [],
        targetAudience: course.target_audience ? JSON.parse(course.target_audience) : [],
        averageRating: course.average_rating || 0,
        totalReviews: course.total_reviews || 0,
        totalEnrollments: course.total_enrollments || 0,
        totalDuration: course.total_duration || 0,
        totalLectures: course.total_lectures || 0,
        status: course.status,
        rejectionReason: course.rejection_reason || null,
        isPublished: course.is_published === 1,
        isSubsidyEligible: course.is_subsidy_eligible === 1,
        subsidyCategory: course.subsidy_category,
        instructor: {
          id: course.instructor_id,
          name: course.instructor_name || '講師',
          avatarUrl: course.instructor_avatar,
          headline: course.instructor_headline,
        },
        category: {
          id: course.category_id,
          name: course.category_name || 'その他',
          slug: course.category_slug,
        },
        sections: sectionsWithLectures,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return c.json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'コースの取得に失敗しました',
      },
    }, 500);
  }
});

// POST /courses - Create course (instructor only)
coursesRoutes.post(
  '/',
  requireAuth,
  requireRole(['instructor', 'admin']),
  zValidator('json', createCourseSchema),
  async (c) => {
    const user = c.get('user');
    const input = c.req.valid('json');
    const db = c.env.DB;
    
    try {
      const courseId = crypto.randomUUID();
      const slug = input.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100) + '-' + courseId.substring(0, 8);

      await db.prepare(`
        INSERT INTO el_courses (
          id, instructor_id, category_id, title, slug, subtitle, description,
          level, language, price, currency, status, objectives, requirements, target_audience
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'JPY', 'draft', ?, ?, ?)
      `).bind(
        courseId,
        user!.userId,
        input.categoryId || null,
        input.title,
        slug,
        input.subtitle || null,
        input.description || null,
        input.level,
        input.language,
        input.price,
        input.objectives ? JSON.stringify(input.objectives) : null,
        input.requirements ? JSON.stringify(input.requirements) : null,
        input.targetAudience ? JSON.stringify(input.targetAudience) : null
      ).run();

      return c.json({
        success: true,
        data: {
          id: courseId,
          slug,
          ...input,
          status: 'draft',
          isPublished: false,
        },
        message: 'コースが作成されました',
      }, 201);
    } catch (error) {
      console.error('Error creating course:', error);
      return c.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'コースの作成に失敗しました',
        },
      }, 500);
    }
  }
);

// PUT /courses/:id - Update course
coursesRoutes.put(
  '/:id',
  requireAuth,
  requireRole(['instructor', 'admin']),
  zValidator('json', updateCourseSchema),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const input = c.req.valid('json');
    const db = c.env.DB;

    try {
      // Verify ownership
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first<{ instructor_id: string }>();

      if (!course) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'コースが見つかりません' },
        }, 404);
      }

      if (course.instructor_id !== user!.userId && user!.role !== 'admin') {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];

      if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
      if (input.subtitle !== undefined) { updates.push('subtitle = ?'); params.push(input.subtitle); }
      if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
      if (input.categoryId !== undefined) { updates.push('category_id = ?'); params.push(input.categoryId); }
      if (input.level !== undefined) { updates.push('level = ?'); params.push(input.level); }
      if (input.language !== undefined) { updates.push('language = ?'); params.push(input.language); }
      if (input.price !== undefined) { updates.push('price = ?'); params.push(input.price); }
      if (input.objectives !== undefined) { updates.push('objectives = ?'); params.push(JSON.stringify(input.objectives)); }
      if (input.requirements !== undefined) { updates.push('requirements = ?'); params.push(JSON.stringify(input.requirements)); }
      if (input.targetAudience !== undefined) { updates.push('target_audience = ?'); params.push(JSON.stringify(input.targetAudience)); }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(id);

        await db.prepare(`
          UPDATE el_courses SET ${updates.join(', ')} WHERE id = ?
        `).bind(...params).run();
      }

      return c.json({
        success: true,
        message: 'コースが更新されました',
      });
    } catch (error) {
      console.error('Error updating course:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'コースの更新に失敗しました' },
      }, 500);
    }
  }
);

// DELETE /courses/:id - Delete course (soft delete)
coursesRoutes.delete(
  '/:id',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const db = c.env.DB;

    try {
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first<{ instructor_id: string }>();

      if (!course) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'コースが見つかりません' },
        }, 404);
      }

      if (course.instructor_id !== user!.userId && user!.role !== 'admin') {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      await db.prepare(`
        UPDATE el_courses SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
      `).bind(id).run();

      return c.json({
        success: true,
        message: 'コースが削除されました',
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'コースの削除に失敗しました' },
      }, 500);
    }
  }
);

// POST /courses/:id/publish - Request course publication
coursesRoutes.post(
  '/:id/publish',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;

    try {
      // 再申請時は rejection_reason をクリア
      await db.prepare(`
        UPDATE el_courses SET status = 'pending_review', rejection_reason = NULL, updated_at = datetime('now') WHERE id = ?
      `).bind(id).run();

      return c.json({
        success: true,
        data: {
          courseId: id,
          status: 'pending_review',
          submittedAt: new Date().toISOString(),
        },
        message: 'コースが審査待ちになりました',
      });
    } catch (error) {
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: '操作に失敗しました' },
      }, 500);
    }
  }
);

// POST /courses/:id/thumbnail - Upload course thumbnail
coursesRoutes.post(
  '/:id/thumbnail',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const db = c.env.DB;

    try {
      // Verify ownership
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first<{ instructor_id: string }>();

      if (!course) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'コースが見つかりません' },
        }, 404);
      }

      if (course.instructor_id !== user!.userId && user!.role !== 'admin') {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      // Parse form data
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'ファイルが必要です' },
        }, 400);
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'JPG、PNG、WEBP、GIF形式のみ対応しています' },
        }, 400);
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'ファイルサイズは5MB以下にしてください' },
        }, 400);
      }

      // Upload to Cloudflare Images or R2
      const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
      const imagesApiToken = c.env.CLOUDFLARE_IMAGES_API_TOKEN;
      
      let thumbnailUrl = '';
      
      if (accountId && imagesApiToken) {
        // Upload to Cloudflare Images
        const uploadFormData = new FormData();
        uploadFormData.append('file', file, file.name);
        
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${imagesApiToken}`,
            },
            body: uploadFormData,
          }
        );
        
        const result = await response.json() as any;
        
        if (result.success && result.result) {
          // Get public URL variant
          thumbnailUrl = result.result.variants?.[0] || `https://imagedelivery.net/${accountId}/${result.result.id}/public`;
        } else {
          throw new Error(result.errors?.[0]?.message || 'Image upload failed');
        }
      } else {
        // Cloudflare Images API not configured - return error
        return c.json({
          success: false,
          error: { code: 'CONFIGURATION_ERROR', message: '画像アップロード機能は現在利用できません。管理者にお問い合わせください。' },
        }, 503);
      }

      // Update course thumbnail_url
      await db.prepare(`
        UPDATE el_courses SET thumbnail_url = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(thumbnailUrl, id).run();

      return c.json({
        success: true,
        data: {
          thumbnailUrl,
        },
        message: 'サムネイルをアップロードしました',
      });
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      return c.json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: 'サムネイルのアップロードに失敗しました' },
      }, 500);
    }
  }
);

// DELETE /courses/:id/thumbnail - Delete course thumbnail
coursesRoutes.delete(
  '/:id/thumbnail',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const db = c.env.DB;

    try {
      const course = await db.prepare(`
        SELECT instructor_id, thumbnail_url FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first<{ instructor_id: string; thumbnail_url: string }>();

      if (!course) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'コースが見つかりません' },
        }, 404);
      }

      if (course.instructor_id !== user!.userId && user!.role !== 'admin') {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      // TODO: Delete from Cloudflare Images if needed

      await db.prepare(`
        UPDATE el_courses SET thumbnail_url = NULL, updated_at = datetime('now') WHERE id = ?
      `).bind(id).run();

      return c.json({
        success: true,
        data: { deleted: true },
        message: 'サムネイルを削除しました',
      });
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'サムネイルの削除に失敗しました' },
      }, 500);
    }
  }
);

// POST /courses/:id/promo-video - Upload promotional video
coursesRoutes.post(
  '/:id/promo-video',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const db = c.env.DB;

    try {
      // Verify ownership
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first<{ instructor_id: string }>();

      if (!course) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'コースが見つかりません' },
        }, 404);
      }

      if (course.instructor_id !== user!.userId && user!.role !== 'admin') {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      // Parse form data
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'ファイルが必要です' },
        }, 400);
      }

      // Validate file type
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'MP4、MOV、WebM形式のみ対応しています' },
        }, 400);
      }

      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'ファイルサイズは100MB以下にしてください' },
        }, 400);
      }

      // Upload to Cloudflare Stream
      const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
      const streamApiToken = c.env.CLOUDFLARE_STREAM_API_TOKEN;
      
      let promoVideoUrl = '';
      
      if (accountId && streamApiToken) {
        // Get direct upload URL
        const uploadUrlResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${streamApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              maxDurationSeconds: 300, // 5 minutes max for promo
              allowedOrigins: ['*'],
              meta: {
                courseId: id,
                type: 'promo',
              },
            }),
          }
        );
        
        const uploadUrlResult = await uploadUrlResponse.json() as any;
        
        if (uploadUrlResult.success && uploadUrlResult.result) {
          // Upload the file
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          
          await fetch(uploadUrlResult.result.uploadURL, {
            method: 'POST',
            body: uploadFormData,
          });
          
          // Get the video URL
          promoVideoUrl = `https://cloudflarestream.com/${uploadUrlResult.result.uid}/manifest/video.m3u8`;
        } else {
          throw new Error(uploadUrlResult.errors?.[0]?.message || 'Video upload failed');
        }
      } else {
        // Cloudflare Stream API not configured - return error
        return c.json({
          success: false,
          error: { code: 'CONFIGURATION_ERROR', message: '動画アップロード機能は現在利用できません。管理者にお問い合わせください。' },
        }, 503);
      }

      // Update course promo_video_url
      await db.prepare(`
        UPDATE el_courses SET promo_video_url = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(promoVideoUrl, id).run();

      return c.json({
        success: true,
        data: {
          promoVideoUrl,
        },
        message: 'プロモーション動画をアップロードしました',
      });
    } catch (error) {
      console.error('Error uploading promo video:', error);
      return c.json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: 'プロモーション動画のアップロードに失敗しました' },
      }, 500);
    }
  }
);

// DELETE /courses/:id/promo-video - Delete promotional video
coursesRoutes.delete(
  '/:id/promo-video',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const db = c.env.DB;

    try {
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first<{ instructor_id: string }>();

      if (!course) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'コースが見つかりません' },
        }, 404);
      }

      if (course.instructor_id !== user!.userId && user!.role !== 'admin') {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      await db.prepare(`
        UPDATE el_courses SET promo_video_url = NULL, updated_at = datetime('now') WHERE id = ?
      `).bind(id).run();

      return c.json({
        success: true,
        data: { deleted: true },
        message: 'プロモーション動画を削除しました',
      });
    } catch (error) {
      console.error('Error deleting promo video:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'プロモーション動画の削除に失敗しました' },
      }, 500);
    }
  }
);

export { coursesRoutes };
