import { Hono } from 'hono';
import type { Env } from '../types';

const wishlistRoutes = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    c.set('userId', payload.userId || payload.sub);
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'トークンが無効です' } }, 401);
  }
};

// ウィッシュリスト取得
wishlistRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const sql = `
      SELECT 
        w.id, w.created_at,
        c.id as course_id, c.title, c.subtitle, c.slug, c.thumbnail_url,
        c.price, c.currency, c.average_rating, c.total_reviews, c.total_enrollments,
        c.level,
        up.display_name as instructor_name
      FROM el_wishlists w
      JOIN el_courses c ON w.course_id = c.id
      JOIN el_users u ON c.instructor_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE w.user_id = ? AND c.deleted_at IS NULL AND c.is_published = 1
      ORDER BY w.created_at DESC
    `;

    const wishlist = await c.env.DB.prepare(sql).bind(userId).all();

    return c.json({
      success: true,
      data: {
        items: wishlist.results.map((item: any) => ({
          id: item.id,
          addedAt: item.created_at,
          course: {
            id: item.course_id,
            title: item.title,
            subtitle: item.subtitle,
            slug: item.slug,
            thumbnailUrl: item.thumbnail_url,
            price: item.price,
            currency: item.currency,
            averageRating: item.average_rating,
            totalReviews: item.total_reviews,
            totalEnrollments: item.total_enrollments,
            level: item.level,
            instructorName: item.instructor_name,
          },
        })),
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// ウィッシュリストに追加
wishlistRoutes.post('/courses/:courseId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    // コースの存在確認
    const course = await c.env.DB.prepare(
      'SELECT id FROM el_courses WHERE id = ? AND is_published = 1 AND deleted_at IS NULL'
    ).bind(courseId).first();

    if (!course) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'コースが見つかりません' } }, 404);
    }

    // 既に追加済みか確認
    const existing = await c.env.DB.prepare(
      'SELECT id FROM el_wishlists WHERE user_id = ? AND course_id = ?'
    ).bind(userId, courseId).first();

    if (existing) {
      return c.json({ 
        success: false, 
        error: { code: 'ALREADY_EXISTS', message: '既にウィッシュリストに追加済みです' } 
      }, 400);
    }

    // 受講済みか確認
    const enrolled = await c.env.DB.prepare(
      'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(userId, courseId).first();

    if (enrolled) {
      return c.json({ 
        success: false, 
        error: { code: 'ALREADY_ENROLLED', message: '既に受講中のコースです' } 
      }, 400);
    }

    const now = new Date().toISOString();
    const wishlistId = crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO el_wishlists (id, user_id, course_id, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(wishlistId, userId, courseId, now).run();

    return c.json({
      success: true,
      data: { id: wishlistId },
      message: 'ウィッシュリストに追加しました',
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// ウィッシュリストから削除
wishlistRoutes.delete('/courses/:courseId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    await c.env.DB.prepare(
      'DELETE FROM el_wishlists WHERE user_id = ? AND course_id = ?'
    ).bind(userId, courseId).run();

    return c.json({
      success: true,
      message: 'ウィッシュリストから削除しました',
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// コースがウィッシュリストにあるか確認
wishlistRoutes.get('/courses/:courseId/check', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM el_wishlists WHERE user_id = ? AND course_id = ?'
    ).bind(userId, courseId).first();

    return c.json({
      success: true,
      data: { isInWishlist: !!existing }
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { wishlistRoutes };
