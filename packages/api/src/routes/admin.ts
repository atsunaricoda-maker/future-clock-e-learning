import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const adminRoutes = new Hono<{ Bindings: Env }>();

// 管理者認証ミドルウェア
const requireAdmin = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;
    
    if (role !== 'admin' && role !== 'super_admin') {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } }, 403);
    }
    
    c.set('userId', payload.userId || payload.sub);
    c.set('userRole', role);
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'トークンが無効です' } }, 401);
  }
};

// ダッシュボード統計
adminRoutes.get('/stats', requireAdmin, async (c) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 各種統計を取得
    const [users, courses, enrollments, revenue, newUsers, newEnrollments] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM el_users WHERE deleted_at IS NULL').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM el_courses WHERE deleted_at IS NULL').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM el_enrollments').first<{ count: number }>(),
      c.env.DB.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM el_payments WHERE status = 'succeeded'").first<{ total: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM el_users WHERE created_at >= ? AND deleted_at IS NULL').bind(startOfMonth).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM el_enrollments WHERE created_at >= ?').bind(startOfMonth).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        totalUsers: users?.count || 0,
        totalCourses: courses?.count || 0,
        totalEnrollments: enrollments?.count || 0,
        totalRevenue: revenue?.total || 0,
        newUsersThisMonth: newUsers?.count || 0,
        newEnrollmentsThisMonth: newEnrollments?.count || 0,
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// ユーザー一覧
adminRoutes.get('/users', requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const role = c.req.query('role');
  const status = c.req.query('status');
  const search = c.req.query('search');

  try {
    let sql = `
      SELECT 
        u.id, u.email, u.role, u.status, u.email_verified, u.created_at,
        up.display_name, up.first_name, up.last_name, up.avatar_url
      FROM el_users u
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE u.deleted_at IS NULL
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_users u WHERE u.deleted_at IS NULL';
    const params: any[] = [];
    const countParams: any[] = [];

    if (role) {
      sql += ' AND u.role = ?';
      countSql += ' AND u.role = ?';
      params.push(role);
      countParams.push(role);
    }

    if (status) {
      sql += ' AND u.status = ?';
      countSql += ' AND u.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      sql += ' AND (u.email LIKE ? OR up.display_name LIKE ?)';
      countSql += ' AND (u.email LIKE ? OR EXISTS (SELECT 1 FROM el_user_profiles up WHERE up.user_id = u.id AND up.display_name LIKE ?))';
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [users, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        users: users.results.map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          status: u.status,
          emailVerified: !!u.email_verified,
          displayName: u.display_name,
          firstName: u.first_name,
          lastName: u.last_name,
          avatarUrl: u.avatar_url,
          createdAt: u.created_at,
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
    console.error('Get admin users error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// ユーザーステータス更新
const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending', 'deleted']),
});

adminRoutes.put(
  '/users/:userId/status',
  requireAdmin,
  zValidator('json', updateStatusSchema),
  async (c) => {
    const { userId } = c.req.param();
    const { status } = c.req.valid('json');

    try {
      const now = new Date().toISOString();
      
      if (status === 'deleted') {
        await c.env.DB.prepare(
          'UPDATE el_users SET status = ?, deleted_at = ?, updated_at = ? WHERE id = ?'
        ).bind(status, now, now, userId).run();
      } else {
        await c.env.DB.prepare(
          'UPDATE el_users SET status = ?, updated_at = ? WHERE id = ?'
        ).bind(status, now, userId).run();
      }

      return c.json({
        success: true,
        message: 'ユーザーステータスを更新しました',
      });
    } catch (error) {
      console.error('Update user status error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// ユーザーロール更新
const updateRoleSchema = z.object({
  role: z.enum(['student', 'instructor', 'admin', 'super_admin']),
});

adminRoutes.put(
  '/users/:userId/role',
  requireAdmin,
  zValidator('json', updateRoleSchema),
  async (c) => {
    const { userId } = c.req.param();
    const { role: newRole } = c.req.valid('json');
    const currentUserRole = c.get('userRole');

    try {
      // super_adminロールへの昇格はsuper_adminのみ可能
      if (newRole === 'super_admin' && currentUserRole !== 'super_admin') {
        return c.json({ 
          success: false, 
          error: { code: 'FORBIDDEN', message: 'super_adminロールの付与はsuper_adminのみ可能です' } 
        }, 403);
      }

      const now = new Date().toISOString();
      
      await c.env.DB.prepare(
        'UPDATE el_users SET role = ?, updated_at = ? WHERE id = ?'
      ).bind(newRole, now, userId).run();

      // インストラクターに昇格した場合、instructor_profileを作成
      if (newRole === 'instructor') {
        const existingProfile = await c.env.DB.prepare(
          'SELECT id FROM el_instructor_profiles WHERE user_id = ?'
        ).bind(userId).first();

        if (!existingProfile) {
          await c.env.DB.prepare(
            `INSERT INTO el_instructor_profiles (id, user_id, commission_rate, created_at, updated_at)
             VALUES (?, ?, 30, ?, ?)`
          ).bind(crypto.randomUUID(), userId, now, now).run();
        }
      }

      return c.json({
        success: true,
        message: 'ユーザーロールを更新しました',
        data: { userId, role: newRole }
      });
    } catch (error) {
      console.error('Update user role error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// コース一覧（管理者用）
adminRoutes.get('/courses', requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');

  try {
    let sql = `
      SELECT 
        c.id, c.title, c.slug, c.subtitle, c.status, c.price, c.currency, c.level,
        c.is_published, c.created_at, c.updated_at, c.thumbnail_url,
        c.total_enrollments, c.average_rating, c.is_subsidy_eligible,
        c.instructor_id, c.rejection_reason,
        up.display_name as instructor_name, u.email as instructor_email,
        (SELECT COUNT(*) FROM el_lectures l JOIN el_sections s ON l.section_id = s.id WHERE s.course_id = c.id) as total_lectures,
        (SELECT COALESCE(SUM(l.duration), 0) FROM el_lectures l JOIN el_sections s ON l.section_id = s.id WHERE s.course_id = c.id) as total_duration
      FROM el_courses c
      JOIN el_users u ON c.instructor_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE c.deleted_at IS NULL
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_courses WHERE deleted_at IS NULL';
    const params: any[] = [];
    const countParams: any[] = [];

    if (status) {
      sql += ' AND c.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [courses, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        courses: courses.results.map((course: any) => ({
          id: course.id,
          title: course.title,
          subtitle: course.subtitle,
          slug: course.slug,
          status: course.status,
          price: course.price || 0,
          currency: course.currency || 'JPY',
          level: course.level || 'all_levels',
          thumbnailUrl: course.thumbnail_url,
          isPublished: !!course.is_published,
          totalEnrollments: course.total_enrollments || 0,
          totalLectures: course.total_lectures || 0,
          totalDuration: course.total_duration || 0,
          averageRating: course.average_rating || 0,
          isSubsidyEligible: !!course.is_subsidy_eligible,
          instructorId: course.instructor_id,
          instructorName: course.instructor_name || 'Unknown',
          instructorEmail: course.instructor_email,
          rejectionReason: course.rejection_reason,
          submittedAt: course.updated_at || course.created_at,
          createdAt: course.created_at,
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
    console.error('Get admin courses error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// コース承認
adminRoutes.post('/courses/:courseId/approve', requireAdmin, async (c) => {
  const { courseId } = c.req.param();

  try {
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE el_courses 
      SET status = 'published', is_published = 1, published_at = ?, updated_at = ?
      WHERE id = ? AND status = 'pending_review'
    `).bind(now, now, courseId).run();

    return c.json({
      success: true,
      message: 'コースを承認しました',
    });
  } catch (error) {
    console.error('Approve course error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// コース却下
const rejectSchema = z.object({
  reason: z.string().min(1, '却下理由を入力してください'),
});

adminRoutes.post(
  '/courses/:courseId/reject',
  requireAdmin,
  zValidator('json', rejectSchema),
  async (c) => {
    const { courseId } = c.req.param();
    const { reason } = c.req.valid('json');

    try {
      const now = new Date().toISOString();
      
      // 却下理由をDBに保存
      await c.env.DB.prepare(`
        UPDATE el_courses 
        SET status = 'rejected', rejection_reason = ?, updated_at = ?
        WHERE id = ? AND status = 'pending_review'
      `).bind(reason, now, courseId).run();

      // 却下理由を通知（実際には通知テーブルに保存）
      const course = await c.env.DB.prepare(
        'SELECT instructor_id FROM el_courses WHERE id = ?'
      ).bind(courseId).first();

      if (course) {
        await c.env.DB.prepare(`
          INSERT INTO el_notifications (id, user_id, type, title, message, link, created_at)
          VALUES (?, ?, 'course_published', 'コースが却下されました', ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          (course as any).instructor_id,
          `却下理由: ${reason}`,
          `/instructor/courses/${courseId}`,
          now
        ).run();
      }

      return c.json({
        success: true,
        message: 'コースを却下しました',
      });
    } catch (error) {
      console.error('Reject course error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// 受講登録一覧
adminRoutes.get('/enrollments', requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const courseId = c.req.query('courseId');
  const search = c.req.query('search');

  try {
    let sql = `
      SELECT 
        e.id, e.user_id, e.course_id, e.created_at as enrolled_at, e.status,
        e.progress, e.completed_at, e.purchase_price,
        u.email as user_email,
        up.display_name as user_name,
        c.title as course_title
      FROM el_enrollments e
      JOIN el_users u ON e.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      JOIN el_courses c ON e.course_id = c.id
      WHERE 1=1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_enrollments e JOIN el_users u ON e.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (courseId) {
      sql += ' AND e.course_id = ?';
      countSql += ' AND e.course_id = ?';
      params.push(courseId);
      countParams.push(courseId);
    }

    if (search) {
      sql += ' AND (u.email LIKE ? OR c.title LIKE ?)';
      countSql += ' AND (u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`);
    }

    sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [enrollments, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        enrollments: enrollments.results.map((e: any) => ({
          id: e.id,
          userId: e.user_id,
          courseId: e.course_id,
          userEmail: e.user_email,
          userName: e.user_name,
          courseTitle: e.course_title,
          enrolledAt: e.enrolled_at,
          status: e.status || 'active',
          progressPercentage: e.progress || 0,
          completedAt: e.completed_at,
          paymentStatus: e.purchase_price > 0 ? 'paid' : 'free',
          amount: e.purchase_price || 0,
          currency: 'JPY',
          isCompleted: e.status === 'completed',
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
    console.error('Get admin enrollments error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講師支払い一覧
adminRoutes.get('/instructor-payouts', requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status'); // pending, paid

  try {
    let sql = `
      SELECT 
        ip.user_id as instructor_id,
        up.display_name as instructor_name,
        u.email as instructor_email,
        ip.commission_rate,
        ip.total_earnings,
        ip.pending_balance,
        ip.payout_enabled,
        ip.stripe_account_id
      FROM el_instructor_profiles ip
      JOIN el_users u ON ip.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE u.role = 'instructor'
    `;
    let countSql = `SELECT COUNT(*) as total FROM el_instructor_profiles ip 
                    JOIN el_users u ON ip.user_id = u.id WHERE u.role = 'instructor'`;
    const params: any[] = [];
    const countParams: any[] = [];

    if (status === 'pending') {
      sql += ' AND ip.pending_balance > 0';
      countSql += ' AND ip.pending_balance > 0';
    }

    sql += ' ORDER BY ip.pending_balance DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    // Summary query
    const summarySql = `
      SELECT 
        COALESCE(SUM(pending_balance), 0) as total_pending,
        COUNT(*) as total_instructors,
        COALESCE(AVG(commission_rate), 70) as avg_commission
      FROM el_instructor_profiles ip
      JOIN el_users u ON ip.user_id = u.id
      WHERE u.role = 'instructor'
    `;

    const [instructors, total, summaryResult] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
      c.env.DB.prepare(summarySql).first<{ total_pending: number; total_instructors: number; avg_commission: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        instructors: instructors.results.map((i: any) => ({
          instructorId: i.instructor_id,
          instructorName: i.instructor_name || '名前未設定',
          instructorEmail: i.instructor_email,
          commissionRate: i.commission_rate || 30,
          totalEarnings: i.total_earnings || 0,
          pendingBalance: i.pending_balance || 0,
          payoutEnabled: !!i.payout_enabled,
          stripeAccountId: i.stripe_account_id,
        })),
        pagination: {
          page,
          limit,
          total: total?.total || 0,
          totalPages: Math.ceil((total?.total || 0) / limit),
        },
        summary: {
          totalPendingPayouts: summaryResult?.total_pending || 0,
          totalPaidThisMonth: 0, // TODO: Calculate from payout history
          totalInstructors: summaryResult?.total_instructors || 0,
          averageCommissionRate: Math.round(summaryResult?.avg_commission || 70),
        }
      }
    });
  } catch (error) {
    console.error('Get instructor payouts error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 支払い履歴
adminRoutes.get('/payout-history', requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const instructorId = c.req.query('instructorId');

  try {
    let sql = `
      SELECT 
        p.id, p.instructor_id, p.amount, p.currency, p.status,
        p.stripe_payout_id, p.created_at, p.paid_at, p.period_start, p.period_end,
        up.display_name as instructor_name,
        u.email as instructor_email
      FROM el_payouts p
      JOIN el_users u ON p.instructor_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE 1=1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_payouts WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (instructorId) {
      sql += ' AND p.instructor_id = ?';
      countSql += ' AND instructor_id = ?';
      params.push(instructorId);
      countParams.push(instructorId);
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [payouts, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        payouts: payouts.results.map((p: any) => ({
          id: p.id,
          instructorId: p.instructor_id,
          instructorName: p.instructor_name,
          instructorEmail: p.instructor_email,
          amount: p.amount,
          currency: p.currency || 'JPY',
          status: p.status,
          paymentMethod: 'bank_transfer',
          transactionId: p.stripe_payout_id,
          createdAt: p.created_at,
          paidAt: p.paid_at,
          payoutDate: p.created_at,
          processedAt: p.paid_at,
          note: null,
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
    console.error('Get payout history error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講師への支払い実行
adminRoutes.post('/instructors/:instructorId/payout', requireAdmin, async (c) => {
  const { instructorId } = c.req.param();

  try {
    // 講師の残高を取得
    const instructor = await c.env.DB.prepare(`
      SELECT ip.pending_balance, ip.stripe_account_id, u.email
      FROM el_instructor_profiles ip
      JOIN el_users u ON ip.user_id = u.id
      WHERE ip.user_id = ?
    `).bind(instructorId).first<any>();

    if (!instructor) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: '講師が見つかりません' } }, 404);
    }

    if (!instructor.pending_balance || instructor.pending_balance <= 0) {
      return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: '支払い可能な残高がありません' } }, 400);
    }

    const now = new Date().toISOString();
    const payoutId = crypto.randomUUID();
    const amount = instructor.pending_balance;

    // 支払い履歴を作成 (el_payouts テーブルを使用)
    await c.env.DB.prepare(`
      INSERT INTO el_payouts (id, instructor_id, amount, currency, status, period_start, period_end, net_amount, created_at, updated_at)
      VALUES (?, ?, ?, 'JPY', 'pending', ?, ?, ?, ?, ?)
    `).bind(payoutId, instructorId, amount, now, now, amount, now, now).run();

    // 残高をリセット（本番ではStripe Connect経由で実際に送金）
    await c.env.DB.prepare(`
      UPDATE el_instructor_profiles 
      SET pending_balance = 0, total_earnings = total_earnings + ?, updated_at = ?
      WHERE user_id = ?
    `).bind(amount, now, instructorId).run();

    // 支払いステータスを完了に更新（本番ではWebhookで更新）
    await c.env.DB.prepare(`
      UPDATE el_payouts SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ?
    `).bind(now, now, payoutId).run();

    return c.json({
      success: true,
      data: {
        payoutId,
        status: 'completed',
        amount,
      },
      message: '支払いを実行しました',
    });
  } catch (error) {
    console.error('Process payout error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講師の手数料率更新
const updateCommissionSchema = z.object({
  commissionRate: z.number().min(0).max(100),
});

adminRoutes.put(
  '/instructors/:instructorId/commission-rate',
  requireAdmin,
  zValidator('json', updateCommissionSchema),
  async (c) => {
    const { instructorId } = c.req.param();
    const { commissionRate } = c.req.valid('json');

    try {
      const now = new Date().toISOString();

      await c.env.DB.prepare(`
        UPDATE el_instructor_profiles SET commission_rate = ?, updated_at = ? WHERE user_id = ?
      `).bind(commissionRate, now, instructorId).run();

      return c.json({
        success: true,
        message: '手数料率を更新しました',
        data: { instructorId, commissionRate },
      });
    } catch (error) {
      console.error('Update commission rate error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// 収益レポート
adminRoutes.get('/revenue', requireAdmin, async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    let sql = `
      SELECT 
        strftime('%Y-%m', p.created_at) as month,
        SUM(p.amount) as total_revenue,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT p.user_id) as unique_buyers
      FROM el_payments p
      WHERE p.status = 'succeeded'
    `;
    const params: any[] = [];

    if (startDate) {
      sql += ' AND date(p.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND date(p.created_at) <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY strftime(\'%Y-%m\', p.created_at) ORDER BY month DESC';

    const revenue = await c.env.DB.prepare(sql).bind(...params).all();

    return c.json({
      success: true,
      data: {
        monthly: revenue.results.map((r: any) => ({
          month: r.month,
          totalRevenue: r.total_revenue,
          transactionCount: r.transaction_count,
          uniqueBuyers: r.unique_buyers,
        })),
      }
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { adminRoutes };
