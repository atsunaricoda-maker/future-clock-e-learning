import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const couponsRoutes = new Hono<{ Bindings: Env }>();

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

// 管理者/講師認証ミドルウェア
const requireInstructorOrAdmin = async (c: any, next: any) => {
  const role = c.get('userRole');
  if (role !== 'instructor' && role !== 'admin' && role !== 'super_admin') {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: '権限がありません' } }, 403);
  }
  await next();
};

// クーポンを検証
couponsRoutes.post('/validate', requireAuth, async (c) => {
  const userId = c.get('userId');
  
  try {
    const body = await c.req.json();
    const { code, courseId } = body;

    if (!code) {
      return c.json({ success: false, error: { code: 'INVALID_CODE', message: 'クーポンコードを入力してください' } }, 400);
    }

    const now = new Date().toISOString();

    // クーポンを検索
    const coupon = await c.env.DB.prepare(`
      SELECT c.*, co.title as course_title, co.price as course_price
      FROM el_coupons c
      LEFT JOIN el_courses co ON c.course_id = co.id
      WHERE c.code = ? AND c.is_active = 1
      AND (c.valid_from IS NULL OR c.valid_from <= ?)
      AND (c.valid_until IS NULL OR c.valid_until >= ?)
    `).bind(code.toUpperCase(), now, now).first();

    if (!coupon) {
      return c.json({ success: false, error: { code: 'INVALID_COUPON', message: '無効なクーポンコードです' } }, 400);
    }

    // コース指定クーポンの場合、対象コースか確認
    if ((coupon as any).course_id && (coupon as any).course_id !== courseId) {
      return c.json({ success: false, error: { code: 'INVALID_COUPON', message: 'このクーポンは対象コースではありません' } }, 400);
    }

    // 使用回数上限の確認
    if ((coupon as any).max_uses && (coupon as any).used_count >= (coupon as any).max_uses) {
      return c.json({ success: false, error: { code: 'COUPON_EXHAUSTED', message: 'このクーポンは使用上限に達しています' } }, 400);
    }

    // ユーザーごとの使用回数制限の確認
    if ((coupon as any).max_uses_per_user) {
      const userUsage = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM el_coupon_usages WHERE coupon_id = ? AND user_id = ?'
      ).bind((coupon as any).id, userId).first<{ count: number }>();

      if (userUsage && userUsage.count >= (coupon as any).max_uses_per_user) {
        return c.json({ success: false, error: { code: 'COUPON_USED', message: 'このクーポンは既に使用済みです' } }, 400);
      }
    }

    // 割引額を計算
    let discountAmount = 0;
    if (courseId) {
      const course = await c.env.DB.prepare('SELECT price FROM el_courses WHERE id = ?').bind(courseId).first<{ price: number }>();
      if (course) {
        if ((coupon as any).discount_type === 'percentage') {
          discountAmount = Math.floor(course.price * (coupon as any).discount_value / 100);
        } else {
          discountAmount = Math.min((coupon as any).discount_value, course.price);
        }
      }
    }

    return c.json({
      success: true,
      data: {
        couponId: (coupon as any).id,
        code: (coupon as any).code,
        discountType: (coupon as any).discount_type,
        discountValue: (coupon as any).discount_value,
        discountAmount,
        description: (coupon as any).description,
        validUntil: (coupon as any).valid_until,
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// クーポンを使用（支払い処理時に呼び出し）
couponsRoutes.post('/use', requireAuth, async (c) => {
  const userId = c.get('userId');
  
  try {
    const body = await c.req.json();
    const { couponId, courseId, paymentId } = body;

    const now = new Date().toISOString();
    const usageId = crypto.randomUUID();

    // 使用履歴を記録
    await c.env.DB.prepare(`
      INSERT INTO el_coupon_usages (id, coupon_id, user_id, course_id, payment_id, used_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(usageId, couponId, userId, courseId, paymentId, now).run();

    // 使用回数を更新
    await c.env.DB.prepare(
      'UPDATE el_coupons SET used_count = used_count + 1, updated_at = ? WHERE id = ?'
    ).bind(now, couponId).run();

    return c.json({
      success: true,
      data: { usageId },
      message: 'クーポンを適用しました',
    });
  } catch (error) {
    console.error('Use coupon error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// クーポン作成（講師/管理者用）
const createCouponSchema = z.object({
  code: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(1),
  courseId: z.string().optional(),
  maxUses: z.number().optional(),
  maxUsesPerUser: z.number().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

couponsRoutes.post(
  '/',
  requireAuth,
  requireInstructorOrAdmin,
  zValidator('json', createCouponSchema),
  async (c) => {
    const userId = c.get('userId');
    const data = c.req.valid('json');

    try {
      // コードの重複チェック
      const existing = await c.env.DB.prepare(
        'SELECT id FROM el_coupons WHERE code = ?'
      ).bind(data.code.toUpperCase()).first();

      if (existing) {
        return c.json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'このクーポンコードは既に使用されています' } }, 400);
      }

      const now = new Date().toISOString();
      const couponId = crypto.randomUUID();

      await c.env.DB.prepare(`
        INSERT INTO el_coupons (
          id, code, description, discount_type, discount_value, 
          course_id, max_uses, max_uses_per_user, valid_from, valid_until,
          is_active, used_count, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
      `).bind(
        couponId,
        data.code.toUpperCase(),
        data.description || null,
        data.discountType,
        data.discountValue,
        data.courseId || null,
        data.maxUses || null,
        data.maxUsesPerUser || null,
        data.validFrom || null,
        data.validUntil || null,
        userId,
        now,
        now
      ).run();

      return c.json({
        success: true,
        data: { id: couponId, code: data.code.toUpperCase() },
        message: 'クーポンを作成しました',
      });
    } catch (error) {
      console.error('Create coupon error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// クーポン一覧（講師/管理者用）
couponsRoutes.get('/', requireAuth, requireInstructorOrAdmin, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  try {
    let sql = `
      SELECT c.*, co.title as course_title
      FROM el_coupons c
      LEFT JOIN el_courses co ON c.course_id = co.id
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_coupons';
    const params: any[] = [];
    const countParams: any[] = [];

    // 講師は自分が作成したクーポンのみ
    if (userRole === 'instructor') {
      sql += ' WHERE c.created_by = ?';
      countSql += ' WHERE created_by = ?';
      params.push(userId);
      countParams.push(userId);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [coupons, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        coupons: coupons.results.map((cp: any) => ({
          id: cp.id,
          code: cp.code,
          description: cp.description,
          discountType: cp.discount_type,
          discountValue: cp.discount_value,
          courseId: cp.course_id,
          courseTitle: cp.course_title,
          maxUses: cp.max_uses,
          usedCount: cp.used_count,
          isActive: !!cp.is_active,
          validFrom: cp.valid_from,
          validUntil: cp.valid_until,
          createdAt: cp.created_at,
        })),
        pagination: {
          page,
          limit,
          total: total?.total || 0,
          totalPages: Math.ceil((total?.total || 0) / limit),
        }
      }
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// クーポン無効化
couponsRoutes.put('/:couponId/deactivate', requireAuth, requireInstructorOrAdmin, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  const { couponId } = c.req.param();

  try {
    // 権限チェック
    if (userRole === 'instructor') {
      const coupon = await c.env.DB.prepare(
        'SELECT id FROM el_coupons WHERE id = ? AND created_by = ?'
      ).bind(couponId, userId).first();

      if (!coupon) {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'クーポンが見つかりません' } }, 404);
      }
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE el_coupons SET is_active = 0, updated_at = ? WHERE id = ?'
    ).bind(now, couponId).run();

    return c.json({
      success: true,
      message: 'クーポンを無効化しました',
    });
  } catch (error) {
    console.error('Deactivate coupon error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { couponsRoutes };
