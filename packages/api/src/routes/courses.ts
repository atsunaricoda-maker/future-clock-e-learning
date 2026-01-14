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
  categoryId: z.string().uuid().optional(),
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
  categoryId: z.string().uuid().optional(),
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
  
  // TODO: Implement D1 database query
  // For now, return mock data
  const courses = [
    {
      id: 'course-1',
      title: 'Pythonで学ぶAI入門',
      subtitle: '初心者でも分かるAIの基礎',
      instructorId: 'instructor-1',
      instructorName: '山田太郎',
      categoryId: 'cat-programming',
      categoryName: 'プログラミング',
      level: 'beginner',
      price: 9800,
      currency: 'JPY',
      thumbnailUrl: null,
      averageRating: 4.5,
      totalReviews: 128,
      totalEnrollments: 1520,
      totalDuration: 36000, // 10 hours
      totalLectures: 45,
      status: 'published',
      isPublished: true,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z',
    },
  ];

  return c.json({
    success: true,
    data: {
      courses,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 1,
        totalPages: 1,
      },
    },
  });
});

// GET /courses/:id - Get course details
coursesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  // TODO: Implement D1 database query
  const course = {
    id,
    title: 'Pythonで学ぶAI入門',
    subtitle: '初心者でも分かるAIの基礎',
    description: 'このコースでは、Python言語を使ってAI・機械学習の基礎を学びます...',
    instructorId: 'instructor-1',
    instructor: {
      id: 'instructor-1',
      displayName: '山田太郎',
      avatarUrl: null,
      headline: 'AI/ML Engineer',
    },
    categoryId: 'cat-programming',
    category: {
      id: 'cat-programming',
      name: 'プログラミング',
      slug: 'programming',
    },
    level: 'beginner',
    language: 'ja',
    price: 9800,
    currency: 'JPY',
    thumbnailUrl: null,
    promoVideoUrl: null,
    objectives: ['Pythonの基礎を理解する', '機械学習の概念を学ぶ', '実際にAIモデルを構築する'],
    requirements: ['パソコンの基本操作ができること'],
    targetAudience: ['プログラミング初心者', 'AIに興味がある方'],
    averageRating: 4.5,
    totalReviews: 128,
    totalEnrollments: 1520,
    totalDuration: 36000,
    totalLectures: 45,
    status: 'published',
    isPublished: true,
    isSubsidyEligible: true,
    sections: [
      {
        id: 'section-1',
        title: '第1章: Pythonの基礎',
        sortOrder: 0,
        lectures: [
          {
            id: 'lecture-1',
            title: 'Python環境の構築',
            contentType: 'video',
            duration: 600,
            isFree: true,
            isPublished: true,
          },
          {
            id: 'lecture-2',
            title: '変数とデータ型',
            contentType: 'video',
            duration: 900,
            isFree: false,
            isPublished: true,
          },
        ],
      },
    ],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  };

  return c.json({
    success: true,
    data: course,
  });
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
    
    // TODO: Implement D1 database insert
    const courseId = crypto.randomUUID();
    const slug = input.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    const course = {
      id: courseId,
      instructorId: user!.userId,
      slug: `${slug}-${courseId.substring(0, 8)}`,
      ...input,
      status: 'draft',
      isPublished: false,
      totalDuration: 0,
      totalLectures: 0,
      averageRating: 0,
      totalReviews: 0,
      totalEnrollments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return c.json(
      {
        success: true,
        data: course,
        message: 'コースが作成されました',
      },
      201
    );
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

    // TODO: Verify ownership and update in D1
    const updatedCourse = {
      id,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: updatedCourse,
      message: 'コースが更新されました',
    });
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

    // TODO: Verify ownership and soft delete in D1

    return c.json({
      success: true,
      message: 'コースが削除されました',
    });
  }
);

// POST /courses/:id/publish - Publish course
coursesRoutes.post(
  '/:id/publish',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    // TODO: Verify course is ready for publishing
    // - Has at least one section
    // - Has at least one published lecture
    // - All required fields are filled

    return c.json({
      success: true,
      message: 'コースが審査待ちになりました',
      data: {
        status: 'pending_review',
      },
    });
  }
);

// POST /courses/:id/unpublish - Unpublish course
coursesRoutes.post(
  '/:id/unpublish',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const id = c.req.param('id');

    return c.json({
      success: true,
      message: 'コースが非公開になりました',
      data: {
        status: 'unpublished',
        isPublished: false,
      },
    });
  }
);

export { coursesRoutes };
