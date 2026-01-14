import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const subscriptionsRoutes = new Hono<{ Bindings: Env }>();

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

// =============================================
// プラン一覧取得
// =============================================
subscriptionsRoutes.get('/plans', async (c) => {
  try {
    const plans = await c.env.DB.prepare(`
      SELECT id, name, slug, description, price_monthly, price_yearly, currency, features, max_courses, sort_order
      FROM el_subscription_plans
      WHERE is_active = 1
      ORDER BY sort_order
    `).all();

    return c.json({
      success: true,
      data: {
        plans: plans.results.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          priceMonthly: p.price_monthly,
          priceYearly: p.price_yearly,
          currency: p.currency,
          features: p.features ? JSON.parse(p.features) : [],
          maxCourses: p.max_courses,
        })),
      }
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'プランの取得に失敗しました' } }, 500);
  }
});

// =============================================
// 現在のサブスクリプション取得
// =============================================
subscriptionsRoutes.get('/my-subscription', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const subscription = await c.env.DB.prepare(`
      SELECT 
        s.id, s.plan_id, s.billing_cycle, s.status, 
        s.current_period_start, s.current_period_end,
        s.cancel_at_period_end, s.canceled_at, s.trial_end,
        s.created_at,
        p.name as plan_name, p.slug as plan_slug, 
        p.price_monthly, p.price_yearly, p.features
      FROM el_user_subscriptions s
      JOIN el_subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status IN ('active', 'trialing', 'past_due')
      ORDER BY s.created_at DESC
      LIMIT 1
    `).bind(userId).first();

    if (!subscription) {
      return c.json({
        success: true,
        data: { subscription: null }
      });
    }

    return c.json({
      success: true,
      data: {
        subscription: {
          id: (subscription as any).id,
          planId: (subscription as any).plan_id,
          planName: (subscription as any).plan_name,
          planSlug: (subscription as any).plan_slug,
          billingCycle: (subscription as any).billing_cycle,
          status: (subscription as any).status,
          priceMonthly: (subscription as any).price_monthly,
          priceYearly: (subscription as any).price_yearly,
          features: (subscription as any).features ? JSON.parse((subscription as any).features) : [],
          currentPeriodStart: (subscription as any).current_period_start,
          currentPeriodEnd: (subscription as any).current_period_end,
          cancelAtPeriodEnd: !!(subscription as any).cancel_at_period_end,
          canceledAt: (subscription as any).canceled_at,
          trialEnd: (subscription as any).trial_end,
          createdAt: (subscription as any).created_at,
        }
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'サブスクリプションの取得に失敗しました' } }, 500);
  }
});

// =============================================
// サブスクリプション購読開始（Stripe Checkout）
// =============================================
const subscribeSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

subscriptionsRoutes.post(
  '/subscribe',
  requireAuth,
  zValidator('json', subscribeSchema),
  async (c) => {
    const userId = c.get('userId');
    const { planId, billingCycle, successUrl, cancelUrl } = c.req.valid('json');

    try {
      // 既存のアクティブなサブスクリプションをチェック
      const existingSubscription = await c.env.DB.prepare(`
        SELECT id FROM el_user_subscriptions
        WHERE user_id = ? AND status IN ('active', 'trialing')
      `).bind(userId).first();

      if (existingSubscription) {
        return c.json({
          success: false,
          error: { code: 'ALREADY_SUBSCRIBED', message: '既にサブスクリプションに登録されています' }
        }, 400);
      }

      // プランを取得
      const plan = await c.env.DB.prepare(`
        SELECT id, name, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly
        FROM el_subscription_plans
        WHERE id = ? AND is_active = 1
      `).bind(planId).first();

      if (!plan) {
        return c.json({
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'プランが見つかりません' }
        }, 404);
      }

      // ユーザー情報取得
      const user = await c.env.DB.prepare(`
        SELECT email FROM el_users WHERE id = ?
      `).bind(userId).first();

      const stripeSecretKey = c.env.STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        // Stripe未設定の場合はモック応答（開発用）
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));
        
        const subscriptionId = crypto.randomUUID();
        
        await c.env.DB.prepare(`
          INSERT INTO el_user_subscriptions 
          (id, user_id, plan_id, billing_cycle, status, current_period_start, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
        `).bind(
          subscriptionId,
          userId,
          planId,
          billingCycle,
          now.toISOString(),
          periodEnd.toISOString(),
          now.toISOString(),
          now.toISOString()
        ).run();

        return c.json({
          success: true,
          data: {
            subscriptionId,
            status: 'active',
            message: 'サブスクリプションを開始しました（デモモード）',
          }
        });
      }

      // Stripe Checkout Session作成
      const price = billingCycle === 'yearly' 
        ? (plan as any).price_yearly 
        : (plan as any).price_monthly;

      const stripePriceId = billingCycle === 'yearly'
        ? (plan as any).stripe_price_id_yearly
        : (plan as any).stripe_price_id_monthly;

      // Stripe APIを呼び出し
      const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'mode': 'subscription',
          'customer_email': (user as any)?.email || '',
          'line_items[0][price]': stripePriceId || '',
          'line_items[0][quantity]': '1',
          'success_url': successUrl || `${c.req.header('Origin') || ''}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          'cancel_url': cancelUrl || `${c.req.header('Origin') || ''}/pricing`,
          'metadata[user_id]': userId,
          'metadata[plan_id]': planId,
          'metadata[billing_cycle]': billingCycle,
          'subscription_data[metadata][user_id]': userId,
          'subscription_data[metadata][plan_id]': planId,
        }).toString(),
      });

      const stripeSession = await stripeResponse.json() as any;

      if (!stripeResponse.ok) {
        console.error('Stripe error:', stripeSession);
        return c.json({
          success: false,
          error: { code: 'STRIPE_ERROR', message: 'Stripeセッションの作成に失敗しました' }
        }, 500);
      }

      return c.json({
        success: true,
        data: {
          sessionId: stripeSession.id,
          url: stripeSession.url,
        }
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'サブスクリプションの開始に失敗しました' } }, 500);
    }
  }
);

// =============================================
// サブスクリプションキャンセル
// =============================================
subscriptionsRoutes.post('/cancel', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const subscription = await c.env.DB.prepare(`
      SELECT id, stripe_subscription_id, status
      FROM el_user_subscriptions
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `).bind(userId).first();

    if (!subscription) {
      return c.json({
        success: false,
        error: { code: 'NOT_SUBSCRIBED', message: 'アクティブなサブスクリプションがありません' }
      }, 404);
    }

    const now = new Date().toISOString();
    const stripeSecretKey = c.env.STRIPE_SECRET_KEY;
    const stripeSubscriptionId = (subscription as any).stripe_subscription_id;

    if (stripeSecretKey && stripeSubscriptionId) {
      // Stripeでキャンセル（期間終了時に解約）
      await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'cancel_at_period_end=true',
      });
    }

    // DBを更新
    await c.env.DB.prepare(`
      UPDATE el_user_subscriptions
      SET cancel_at_period_end = 1, canceled_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, now, (subscription as any).id).run();

    return c.json({
      success: true,
      message: 'サブスクリプションは現在の請求期間終了時にキャンセルされます',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'キャンセルに失敗しました' } }, 500);
  }
});

// =============================================
// サブスクリプション再開
// =============================================
subscriptionsRoutes.post('/resume', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const subscription = await c.env.DB.prepare(`
      SELECT id, stripe_subscription_id, cancel_at_period_end
      FROM el_user_subscriptions
      WHERE user_id = ? AND status = 'active' AND cancel_at_period_end = 1
    `).bind(userId).first();

    if (!subscription) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'キャンセル予定のサブスクリプションがありません' }
      }, 404);
    }

    const now = new Date().toISOString();
    const stripeSecretKey = c.env.STRIPE_SECRET_KEY;
    const stripeSubscriptionId = (subscription as any).stripe_subscription_id;

    if (stripeSecretKey && stripeSubscriptionId) {
      // Stripeでキャンセル取り消し
      await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'cancel_at_period_end=false',
      });
    }

    // DBを更新
    await c.env.DB.prepare(`
      UPDATE el_user_subscriptions
      SET cancel_at_period_end = 0, canceled_at = NULL, updated_at = ?
      WHERE id = ?
    `).bind(now, (subscription as any).id).run();

    return c.json({
      success: true,
      message: 'サブスクリプションを再開しました',
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: '再開に失敗しました' } }, 500);
  }
});

// =============================================
// プラン変更
// =============================================
const changePlanSchema = z.object({
  newPlanId: z.string().min(1),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
});

subscriptionsRoutes.post(
  '/change-plan',
  requireAuth,
  zValidator('json', changePlanSchema),
  async (c) => {
    const userId = c.get('userId');
    const { newPlanId, billingCycle } = c.req.valid('json');

    try {
      const subscription = await c.env.DB.prepare(`
        SELECT id, plan_id, billing_cycle, stripe_subscription_id
        FROM el_user_subscriptions
        WHERE user_id = ? AND status IN ('active', 'trialing')
      `).bind(userId).first();

      if (!subscription) {
        return c.json({
          success: false,
          error: { code: 'NOT_SUBSCRIBED', message: 'アクティブなサブスクリプションがありません' }
        }, 404);
      }

      // 新しいプランを取得
      const newPlan = await c.env.DB.prepare(`
        SELECT id, stripe_price_id_monthly, stripe_price_id_yearly
        FROM el_subscription_plans
        WHERE id = ? AND is_active = 1
      `).bind(newPlanId).first();

      if (!newPlan) {
        return c.json({
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'プランが見つかりません' }
        }, 404);
      }

      const now = new Date().toISOString();
      const newBillingCycle = billingCycle || (subscription as any).billing_cycle;
      const stripeSecretKey = c.env.STRIPE_SECRET_KEY;
      const stripeSubscriptionId = (subscription as any).stripe_subscription_id;

      if (stripeSecretKey && stripeSubscriptionId) {
        const newStripePriceId = newBillingCycle === 'yearly'
          ? (newPlan as any).stripe_price_id_yearly
          : (newPlan as any).stripe_price_id_monthly;

        // Stripeでプラン変更
        // まず現在のサブスクリプションアイテムを取得
        const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
          headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
        });
        const stripeSubscription = await subResponse.json() as any;
        const itemId = stripeSubscription.items?.data?.[0]?.id;

        if (itemId && newStripePriceId) {
          await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              [`items[0][id]`]: itemId,
              [`items[0][price]`]: newStripePriceId,
              'proration_behavior': 'create_prorations',
            }).toString(),
          });
        }
      }

      // DBを更新
      await c.env.DB.prepare(`
        UPDATE el_user_subscriptions
        SET plan_id = ?, billing_cycle = ?, updated_at = ?
        WHERE id = ?
      `).bind(newPlanId, newBillingCycle, now, (subscription as any).id).run();

      return c.json({
        success: true,
        message: 'プランを変更しました',
      });
    } catch (error) {
      console.error('Change plan error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'プラン変更に失敗しました' } }, 500);
    }
  }
);

// =============================================
// 支払い履歴取得
// =============================================
subscriptionsRoutes.get('/payments', requireAuth, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');

  try {
    const [payments, total] = await Promise.all([
      c.env.DB.prepare(`
        SELECT 
          sp.id, sp.amount, sp.currency, sp.status, sp.paid_at,
          sp.billing_period_start, sp.billing_period_end,
          p.name as plan_name
        FROM el_subscription_payments sp
        JOIN el_user_subscriptions s ON sp.subscription_id = s.id
        JOIN el_subscription_plans p ON s.plan_id = p.id
        WHERE sp.user_id = ?
        ORDER BY sp.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(userId, limit, (page - 1) * limit).all(),
      c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM el_subscription_payments WHERE user_id = ?
      `).bind(userId).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        payments: payments.results.map((p: any) => ({
          id: p.id,
          planName: p.plan_name,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          paidAt: p.paid_at,
          billingPeriodStart: p.billing_period_start,
          billingPeriodEnd: p.billing_period_end,
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
    console.error('Get payments error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: '支払い履歴の取得に失敗しました' } }, 500);
  }
});

// =============================================
// Stripe Webhook処理
// =============================================
subscriptionsRoutes.post('/webhook', async (c) => {
  const stripeWebhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  const signature = c.req.header('stripe-signature');
  
  if (!stripeWebhookSecret || !signature) {
    return c.json({ success: false, error: 'Webhook not configured' }, 400);
  }

  try {
    const body = await c.req.text();
    // 本番環境ではStripeのsignature検証が必要
    const event = JSON.parse(body);
    const now = new Date().toISOString();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        const planId = subscription.metadata?.plan_id;

        if (userId && planId) {
          const existingSub = await c.env.DB.prepare(`
            SELECT id FROM el_user_subscriptions WHERE stripe_subscription_id = ?
          `).bind(subscription.id).first();

          const status = subscription.status === 'active' ? 'active' 
            : subscription.status === 'trialing' ? 'trialing'
            : subscription.status === 'past_due' ? 'past_due'
            : 'canceled';

          if (existingSub) {
            await c.env.DB.prepare(`
              UPDATE el_user_subscriptions
              SET status = ?, current_period_start = ?, current_period_end = ?,
                  cancel_at_period_end = ?, updated_at = ?
              WHERE id = ?
            `).bind(
              status,
              new Date(subscription.current_period_start * 1000).toISOString(),
              new Date(subscription.current_period_end * 1000).toISOString(),
              subscription.cancel_at_period_end ? 1 : 0,
              now,
              (existingSub as any).id
            ).run();
          } else {
            await c.env.DB.prepare(`
              INSERT INTO el_user_subscriptions
              (id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status,
               current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              crypto.randomUUID(),
              userId,
              planId,
              subscription.id,
              subscription.customer,
              status,
              new Date(subscription.current_period_start * 1000).toISOString(),
              new Date(subscription.current_period_end * 1000).toISOString(),
              subscription.cancel_at_period_end ? 1 : 0,
              now,
              now
            ).run();
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await c.env.DB.prepare(`
          UPDATE el_user_subscriptions
          SET status = 'canceled', updated_at = ?
          WHERE stripe_subscription_id = ?
        `).bind(now, subscription.id).run();
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        const sub = await c.env.DB.prepare(`
          SELECT id, user_id FROM el_user_subscriptions WHERE stripe_subscription_id = ?
        `).bind(subscriptionId).first();

        if (sub) {
          await c.env.DB.prepare(`
            INSERT INTO el_subscription_payments
            (id, subscription_id, user_id, amount, currency, status, stripe_invoice_id,
             billing_period_start, billing_period_end, paid_at, created_at)
            VALUES (?, ?, ?, ?, ?, 'succeeded', ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            (sub as any).id,
            (sub as any).user_id,
            invoice.amount_paid,
            invoice.currency.toUpperCase(),
            invoice.id,
            new Date(invoice.period_start * 1000).toISOString(),
            new Date(invoice.period_end * 1000).toISOString(),
            now,
            now
          ).run();
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        await c.env.DB.prepare(`
          UPDATE el_user_subscriptions
          SET status = 'past_due', updated_at = ?
          WHERE stripe_subscription_id = ?
        `).bind(now, subscriptionId).run();
        break;
      }
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ success: false, error: 'Webhook processing failed' }, 500);
  }
});

// =============================================
// サブスクリプション有効性チェック（内部用）
// =============================================
subscriptionsRoutes.get('/check-access', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const subscription = await c.env.DB.prepare(`
      SELECT s.status, s.current_period_end, p.slug as plan_slug
      FROM el_user_subscriptions s
      JOIN el_subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status IN ('active', 'trialing')
    `).bind(userId).first();

    if (!subscription) {
      return c.json({
        success: true,
        data: {
          hasAccess: false,
          plan: null,
        }
      });
    }

    const periodEnd = new Date((subscription as any).current_period_end);
    const hasAccess = periodEnd > new Date();

    return c.json({
      success: true,
      data: {
        hasAccess,
        plan: (subscription as any).plan_slug,
        expiresAt: (subscription as any).current_period_end,
      }
    });
  } catch (error) {
    console.error('Check access error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'アクセス確認に失敗しました' } }, 500);
  }
});

export { subscriptionsRoutes };
