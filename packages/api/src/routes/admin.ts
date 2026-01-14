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
        c.id, c.title, c.slug, c.status, c.price, c.is_published, c.created_at,
        c.total_enrollments, c.average_rating, c.is_subsidy_eligible,
        up.display_name as instructor_name, u.email as instructor_email
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
          slug: course.slug,
          status: course.status,
          price: course.price,
          isPublished: !!course.is_published,
          totalEnrollments: course.total_enrollments,
          averageRating: course.average_rating,
          isSubsidyEligible: !!course.is_subsidy_eligible,
          instructorName: course.instructor_name,
          instructorEmail: course.instructor_email,
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
      
      await c.env.DB.prepare(`
        UPDATE el_courses 
        SET status = 'rejected', updated_at = ?
        WHERE id = ? AND status = 'pending_review'
      `).bind(now, courseId).run();

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
