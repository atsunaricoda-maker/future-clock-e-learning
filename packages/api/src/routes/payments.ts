import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const paymentsRoutes = new Hono<{ Bindings: Env }>();

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

// チェックアウトセッション作成
const checkoutSchema = z.object({
  courseId: z.string().min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

paymentsRoutes.post(
  '/checkout',
  requireAuth,
  zValidator('json', checkoutSchema),
  async (c) => {
    const userId = c.get('userId');
    const { courseId, successUrl, cancelUrl } = c.req.valid('json');

    try {
      // コースが存在し、公開されているか確認
      const course = await c.env.DB.prepare(
        'SELECT id, title, price, currency FROM el_courses WHERE id = ? AND status = ? AND deleted_at IS NULL'
      ).bind(courseId, 'published').first();

      if (!course) {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'コースが見つかりません' } }, 404);
      }

      // 既に購入済みか確認
      const existingEnrollment = await c.env.DB.prepare(
        'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, courseId).first();

      if (existingEnrollment) {
        return c.json({ success: false, error: { code: 'ALREADY_ENROLLED', message: '既にこのコースを購入済みです' } }, 400);
      }

      // 無料コースの場合は直接登録
      if ((course as any).price === 0) {
        const now = new Date().toISOString();
        const enrollmentId = crypto.randomUUID();
        
        await c.env.DB.prepare(`
          INSERT INTO el_enrollments (id, user_id, course_id, status, purchase_price, purchase_currency, created_at, updated_at)
          VALUES (?, ?, ?, 'active', 0, 'JPY', ?, ?)
        `).bind(enrollmentId, userId, courseId, now, now).run();

        return c.json({
          success: true,
          data: {
            enrollmentId,
            free: true,
            message: '無料コースに登録しました',
          }
        });
      }

      // 有料コースの場合はStripeセッションを作成（モック）
      // 本番環境では実際のStripe APIを使用
      const sessionId = `cs_${crypto.randomUUID()}`;
      const paymentId = crypto.randomUUID();
      const now = new Date().toISOString();

      // 支払いレコードを作成（pending状態）
      await c.env.DB.prepare(`
        INSERT INTO el_payments (id, user_id, course_id, stripe_session_id, amount, currency, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(paymentId, userId, courseId, sessionId, (course as any).price, (course as any).currency || 'JPY', now, now).run();

      // 実際の本番環境では以下のようにStripe APIを使用:
      // const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
      // const session = await stripe.checkout.sessions.create({...});

      return c.json({
        success: true,
        data: {
          sessionId,
          url: `${successUrl || '/'}?session_id=${sessionId}`, // モック：成功URLにリダイレクト
          paymentId,
        }
      });
    } catch (error) {
      console.error('Checkout error:', error);
      return c.json({ success: false, error: { code: 'PAYMENT_ERROR', message: '決済処理中にエラーが発生しました' } }, 500);
    }
  }
);

// 支払い完了処理（Stripe Webhookまたはフロントエンドからの確認）
paymentsRoutes.post('/confirm/:sessionId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { sessionId } = c.req.param();

  try {
    // 支払いレコードを取得
    const payment = await c.env.DB.prepare(
      'SELECT id, course_id, amount, currency FROM el_payments WHERE stripe_session_id = ? AND user_id = ? AND status = ?'
    ).bind(sessionId, userId, 'pending').first();

    if (!payment) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: '支払い情報が見つかりません' } }, 404);
    }

    const now = new Date().toISOString();
    const enrollmentId = crypto.randomUUID();

    // トランザクション的に処理
    await c.env.DB.batch([
      // 支払いステータスを更新
      c.env.DB.prepare(`
        UPDATE el_payments SET status = 'succeeded', updated_at = ? WHERE id = ?
      `).bind(now, (payment as any).id),
      // 受講登録を作成
      c.env.DB.prepare(`
        INSERT INTO el_enrollments (id, user_id, course_id, status, purchase_price, purchase_currency, payment_id, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
      `).bind(enrollmentId, userId, (payment as any).course_id, (payment as any).amount, (payment as any).currency, (payment as any).id, now, now),
      // コースの受講者数を増加
      c.env.DB.prepare(`
        UPDATE el_courses SET total_enrollments = total_enrollments + 1, updated_at = ? WHERE id = ?
      `).bind(now, (payment as any).course_id),
    ]);

    return c.json({
      success: true,
      data: {
        enrollmentId,
        courseId: (payment as any).course_id,
        message: 'コースの購入が完了しました',
      }
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return c.json({ success: false, error: { code: 'PAYMENT_ERROR', message: '支払い確認中にエラーが発生しました' } }, 500);
  }
});

// 支払い履歴を取得
paymentsRoutes.get('/history', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const payments = await c.env.DB.prepare(`
      SELECT 
        p.id,
        p.course_id,
        c.title as course_title,
        p.amount,
        p.currency,
        p.status,
        p.created_at
      FROM el_payments p
      JOIN el_courses c ON p.course_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).bind(userId).all();

    return c.json({
      success: true,
      data: {
        payments: payments.results.map((p: any) => ({
          id: p.id,
          courseId: p.course_id,
          courseTitle: p.course_title,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.created_at,
        })),
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { paymentsRoutes };
