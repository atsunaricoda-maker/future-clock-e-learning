import { Hono } from 'hono';
import type { Env, Variables } from '../types';

export const categoriesRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

// Get all categories (hierarchical)
categoriesRoutes.get('/', async (c) => {
  try {
    const categories = await c.env.DB.prepare(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM el_courses WHERE category_id = c.id AND status = 'published') as course_count
       FROM el_categories c
       WHERE c.is_active = 1
       ORDER BY c.parent_id NULLS FIRST, c.sort_order ASC`
    ).all();

  // Build hierarchical structure
  const categoryMap = new Map();
  const rootCategories: any[] = [];

  // First pass: create map
  for (const cat of categories.results) {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      courseCount: cat.course_count,
      children: [],
    });
  }

  // Second pass: build tree
  for (const cat of categories.results) {
    const category = categoryMap.get(cat.id);
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  }

  return c.json({
    success: true,
    data: {
      categories: rootCategories,
    },
  });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'カテゴリの取得に失敗しました' },
    }, 500);
  }
});

// Get single category with courses
categoriesRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const category = await c.env.DB.prepare(
      `SELECT * FROM el_categories WHERE slug = ? AND is_active = 1`
    )
      .bind(slug)
      .first();

  if (!category) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'カテゴリが見つかりません' },
      },
      404
    );
  }

  // Get subcategories
  const subcategories = await c.env.DB.prepare(
    `SELECT c.*, 
            (SELECT COUNT(*) FROM el_courses WHERE category_id = c.id AND status = 'published') as course_count
     FROM el_categories c
     WHERE c.parent_id = ? AND c.is_active = 1
     ORDER BY c.sort_order ASC`
  )
    .bind(category.id)
    .all();

  return c.json({
    success: true,
    data: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      subcategories: subcategories.results.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        courseCount: sub.course_count,
      })),
    },
  });
  } catch (error) {
    console.error('Get category error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'カテゴリの取得に失敗しました' },
    }, 500);
  }
});

// Get courses in category
categoriesRoutes.get('/:slug/courses', async (c) => {
  const slug = c.req.param('slug');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 100);
  const sortBy = c.req.query('sort_by') || 'popular';
  const level = c.req.query('level');

  try {
    // Get category
    const category = await c.env.DB.prepare(
      `SELECT id FROM el_categories WHERE slug = ? AND is_active = 1`
    )
      .bind(slug)
      .first();

  if (!category) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'カテゴリが見つかりません' },
      },
      404
    );
  }

  // Get all descendant category IDs (for nested categories)
  const categoryIds = await c.env.DB.prepare(
    `WITH RECURSIVE category_tree AS (
       SELECT id FROM el_categories WHERE id = ?
       UNION ALL
       SELECT c.id FROM el_categories c
       JOIN category_tree ct ON c.parent_id = ct.id
     )
     SELECT id FROM category_tree`
  )
    .bind(category.id)
    .all();

  const ids = categoryIds.results.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');

  // Build sort clause
  let orderBy = '';
  switch (sortBy) {
    case 'newest':
      orderBy = 'c.published_at DESC';
      break;
    case 'rating':
      orderBy = 'c.average_rating DESC, c.total_reviews DESC';
      break;
    case 'price_low':
      orderBy = 'COALESCE(c.sale_price, c.price) ASC';
      break;
    case 'price_high':
      orderBy = 'COALESCE(c.sale_price, c.price) DESC';
      break;
    default: // popular
      orderBy = 'c.total_enrollments DESC, c.average_rating DESC';
  }

  // Build where clause
  let whereClause = `c.category_id IN (${placeholders}) AND c.status = 'published'`;
  const params: any[] = [...ids];

  if (level) {
    whereClause += ' AND c.level = ?';
    params.push(level);
  }

  // Get total count
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM el_courses c WHERE ${whereClause}`
  )
    .bind(...params)
    .first();

  const totalCount = countResult?.count as number;

  // Get courses
  params.push(pageSize, (page - 1) * pageSize);
  const courses = await c.env.DB.prepare(
    `SELECT c.id, c.title, c.slug, c.subtitle, c.thumbnail_url,
            c.price, c.discount_price as sale_price, c.level, c.average_rating, c.total_reviews,
            c.total_enrollments, c.total_duration, c.is_subsidy_eligible,
            up.display_name as instructor_name, c.instructor_id,
            up.avatar_url as instructor_avatar
     FROM el_courses c
     LEFT JOIN el_user_profiles up ON c.instructor_id = up.user_id
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`
  )
    .bind(...params)
    .all();

  return c.json({
    success: true,
    data: courses.results.map((course: any) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      subtitle: course.subtitle,
      thumbnailUrl: course.thumbnail_url,
      price: course.price,
      salePrice: course.sale_price,
      level: course.level,
      averageRating: course.average_rating,
      totalReviews: course.total_reviews,
      totalEnrollments: course.total_enrollments,
      totalDuration: course.total_duration,
      isSubsidyEligible: Boolean(course.is_subsidy_eligible),
      instructor: {
        id: course.instructor_id,
        name: course.instructor_name,
        avatarUrl: course.instructor_avatar,
      },
    })),
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount,
    },
  });
  } catch (error) {
    console.error('Get category courses error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'コースの取得に失敗しました' },
    }, 500);
  }
});
