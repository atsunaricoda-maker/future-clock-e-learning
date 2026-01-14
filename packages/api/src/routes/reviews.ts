import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const reviewsRoutes = new Hono<{ Bindings: Env }>();

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
    c.set('userRole', payload.role);
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'トークンが無効です' } }, 401);
  }
};

// コースのレビュー一覧取得
reviewsRoutes.get('/courses/:courseId', async (c) => {
  const { courseId } = c.req.param();
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const sortBy = c.req.query('sortBy') || 'newest'; // newest, oldest, highest, lowest, helpful

  try {
    let orderBy = 'r.created_at DESC';
    if (sortBy === 'oldest') orderBy = 'r.created_at ASC';
    if (sortBy === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
    if (sortBy === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';
    if (sortBy === 'helpful') orderBy = 'r.helpful_count DESC, r.created_at DESC';

    const sql = `
      SELECT 
        r.id, r.rating, r.title, r.content, r.helpful_count, r.is_verified_purchase, r.created_at,
        up.display_name as user_name, up.avatar_url
      FROM el_reviews r
      JOIN el_users u ON r.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE r.course_id = ?
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const countSql = 'SELECT COUNT(*) as total FROM el_reviews WHERE course_id = ?';
    
    // 評価分布
    const distributionSql = `
      SELECT rating, COUNT(*) as count 
      FROM el_reviews 
      WHERE course_id = ? 
      GROUP BY rating
    `;

    const [reviews, total, distribution] = await Promise.all([
      c.env.DB.prepare(sql).bind(courseId, limit, (page - 1) * limit).all(),
      c.env.DB.prepare(countSql).bind(courseId).first<{ total: number }>(),
      c.env.DB.prepare(distributionSql).bind(courseId).all(),
    ]);

    // 評価分布を整形
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.results.forEach((d: any) => {
      ratingDistribution[d.rating] = d.count;
    });

    return c.json({
      success: true,
      data: {
        reviews: reviews.results.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          content: r.content,
          helpfulCount: r.helpful_count || 0,
          isVerifiedPurchase: !!r.is_verified_purchase,
          userName: r.user_name || '受講者',
          avatarUrl: r.avatar_url,
          createdAt: r.created_at,
        })),
        ratingDistribution,
        pagination: {
          page,
          limit,
          total: total?.total || 0,
          totalPages: Math.ceil((total?.total || 0) / limit),
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// レビュー投稿
const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().max(2000).optional(),
});

reviewsRoutes.post(
  '/courses/:courseId',
  requireAuth,
  zValidator('json', createReviewSchema),
  async (c) => {
    const userId = c.get('userId');
    const { courseId } = c.req.param();
    const { rating, title, content } = c.req.valid('json');

    try {
      // 受講登録の確認
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, courseId).first();

      if (!enrollment) {
        return c.json({ 
          success: false, 
          error: { code: 'NOT_ENROLLED', message: 'このコースを受講していないためレビューできません' } 
        }, 403);
      }

      // 既存レビューの確認
      const existingReview = await c.env.DB.prepare(
        'SELECT id FROM el_reviews WHERE user_id = ? AND course_id = ?'
      ).bind(userId, courseId).first();

      if (existingReview) {
        return c.json({ 
          success: false, 
          error: { code: 'ALREADY_REVIEWED', message: '既にレビューを投稿しています' } 
        }, 400);
      }

      const now = new Date().toISOString();
      const reviewId = crypto.randomUUID();

      await c.env.DB.prepare(`
        INSERT INTO el_reviews (id, course_id, user_id, rating, title, content, is_verified_purchase, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(reviewId, courseId, userId, rating, title || null, content || null, now, now).run();

      // コースの平均評価を更新
      await c.env.DB.prepare(`
        UPDATE el_courses 
        SET average_rating = (SELECT AVG(rating) FROM el_reviews WHERE course_id = ?),
            total_reviews = (SELECT COUNT(*) FROM el_reviews WHERE course_id = ?),
            updated_at = ?
        WHERE id = ?
      `).bind(courseId, courseId, now, courseId).run();

      return c.json({
        success: true,
        data: { id: reviewId },
        message: 'レビューを投稿しました',
      });
    } catch (error) {
      console.error('Create review error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// レビュー更新
reviewsRoutes.put(
  '/:reviewId',
  requireAuth,
  zValidator('json', createReviewSchema),
  async (c) => {
    const userId = c.get('userId');
    const { reviewId } = c.req.param();
    const { rating, title, content } = c.req.valid('json');

    try {
      // 自分のレビューか確認
      const review = await c.env.DB.prepare(
        'SELECT course_id FROM el_reviews WHERE id = ? AND user_id = ?'
      ).bind(reviewId, userId).first();

      if (!review) {
        return c.json({ 
          success: false, 
          error: { code: 'NOT_FOUND', message: 'レビューが見つかりません' } 
        }, 404);
      }

      const now = new Date().toISOString();

      await c.env.DB.prepare(`
        UPDATE el_reviews 
        SET rating = ?, title = ?, content = ?, updated_at = ?
        WHERE id = ?
      `).bind(rating, title || null, content || null, now, reviewId).run();

      // コースの平均評価を更新
      const courseId = (review as any).course_id;
      await c.env.DB.prepare(`
        UPDATE el_courses 
        SET average_rating = (SELECT AVG(rating) FROM el_reviews WHERE course_id = ?),
            updated_at = ?
        WHERE id = ?
      `).bind(courseId, now, courseId).run();

      return c.json({
        success: true,
        message: 'レビューを更新しました',
      });
    } catch (error) {
      console.error('Update review error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// レビュー削除
reviewsRoutes.delete('/:reviewId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  const { reviewId } = c.req.param();

  try {
    // 自分のレビューか確認（管理者は誰のでも削除可能）
    let review;
    if (userRole === 'admin' || userRole === 'super_admin') {
      review = await c.env.DB.prepare('SELECT course_id FROM el_reviews WHERE id = ?').bind(reviewId).first();
    } else {
      review = await c.env.DB.prepare(
        'SELECT course_id FROM el_reviews WHERE id = ? AND user_id = ?'
      ).bind(reviewId, userId).first();
    }

    if (!review) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'レビューが見つかりません' } 
      }, 404);
    }

    await c.env.DB.prepare('DELETE FROM el_reviews WHERE id = ?').bind(reviewId).run();

    // コースの平均評価を更新
    const courseId = (review as any).course_id;
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      UPDATE el_courses 
      SET average_rating = COALESCE((SELECT AVG(rating) FROM el_reviews WHERE course_id = ?), 0),
          total_reviews = (SELECT COUNT(*) FROM el_reviews WHERE course_id = ?),
          updated_at = ?
      WHERE id = ?
    `).bind(courseId, courseId, now, courseId).run();

    return c.json({
      success: true,
      message: 'レビューを削除しました',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 「参考になった」をマーク
reviewsRoutes.post('/:reviewId/helpful', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { reviewId } = c.req.param();

  try {
    // 既にマーク済みか確認（簡易実装：review_helpful_votes テーブルが必要だが、ここではカウントのみ増やす）
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE el_reviews SET helpful_count = helpful_count + 1, updated_at = ? WHERE id = ?
    `).bind(now, reviewId).run();

    return c.json({
      success: true,
      message: '参考になったとしてマークしました',
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 自分のレビューを取得
reviewsRoutes.get('/my/:courseId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    const review = await c.env.DB.prepare(`
      SELECT id, rating, title, content, created_at, updated_at
      FROM el_reviews
      WHERE user_id = ? AND course_id = ?
    `).bind(userId, courseId).first();

    return c.json({
      success: true,
      data: review ? {
        id: (review as any).id,
        rating: (review as any).rating,
        title: (review as any).title,
        content: (review as any).content,
        createdAt: (review as any).created_at,
        updatedAt: (review as any).updated_at,
      } : null,
    });
  } catch (error) {
    console.error('Get my review error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { reviewsRoutes };
