import { Hono } from 'hono';
import type { Env } from '../types';

const instructorRoutes = new Hono<{ Bindings: Env }>();

// 講師認証ミドルウェア
const requireInstructor = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;
    
    if (role !== 'instructor' && role !== 'admin' && role !== 'super_admin') {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: '講師権限が必要です' } }, 403);
    }
    
    c.set('userId', payload.userId || payload.sub);
    c.set('userRole', role);
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'トークンが無効です' } }, 401);
  }
};

// 講師ダッシュボード統計
instructorRoutes.get('/stats', requireInstructor, async (c) => {
  const userId = c.get('userId');

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 各種統計を取得
    const [
      publishedCourses,
      totalEnrollments,
      monthlyRevenue,
      averageRating,
      recentEnrollments,
    ] = await Promise.all([
      c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM el_courses WHERE instructor_id = ? AND is_published = 1 AND deleted_at IS NULL'
      ).bind(userId).first<{ count: number }>(),
      c.env.DB.prepare(`
        SELECT COALESCE(SUM(c.total_enrollments), 0) as total 
        FROM el_courses c 
        WHERE c.instructor_id = ? AND c.deleted_at IS NULL
      `).bind(userId).first<{ total: number }>(),
      c.env.DB.prepare(`
        SELECT COALESCE(SUM(p.amount * (1 - ip.commission_rate / 100.0)), 0) as total
        FROM el_payments p
        JOIN el_courses c ON p.course_id = c.id
        LEFT JOIN el_instructor_profiles ip ON c.instructor_id = ip.user_id
        WHERE c.instructor_id = ? 
        AND p.status = 'succeeded' 
        AND p.created_at >= ?
      `).bind(userId, startOfMonth).first<{ total: number }>(),
      c.env.DB.prepare(`
        SELECT COALESCE(AVG(c.average_rating), 0) as avg
        FROM el_courses c
        WHERE c.instructor_id = ? AND c.deleted_at IS NULL AND c.average_rating > 0
      `).bind(userId).first<{ avg: number }>(),
      c.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM el_enrollments e
        JOIN el_courses c ON e.course_id = c.id
        WHERE c.instructor_id = ? AND e.created_at >= ?
      `).bind(userId, startOfMonth).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        publishedCourses: publishedCourses?.count || 0,
        totalEnrollments: totalEnrollments?.total || 0,
        monthlyRevenue: Math.round(monthlyRevenue?.total || 0),
        averageRating: Math.round((averageRating?.avg || 0) * 10) / 10,
        newEnrollmentsThisMonth: recentEnrollments?.count || 0,
      }
    });
  } catch (error) {
    console.error('Get instructor stats error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講師コース一覧
instructorRoutes.get('/courses', requireInstructor, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');

  try {
    let sql = `
      SELECT 
        c.id, c.title, c.subtitle, c.status, c.price, c.currency, c.is_published,
        c.total_enrollments, c.average_rating, c.total_reviews, c.created_at, c.updated_at,
        c.rejection_reason,
        (SELECT COUNT(*) FROM el_sections s WHERE s.course_id = c.id) as total_sections,
        (SELECT COUNT(*) FROM el_lectures l JOIN el_sections s ON l.section_id = s.id WHERE s.course_id = c.id) as total_lectures,
        (SELECT COALESCE(SUM(l.duration), 0) FROM el_lectures l JOIN el_sections s ON l.section_id = s.id WHERE s.course_id = c.id) as total_duration,
        (SELECT COALESCE(SUM(p.amount), 0) FROM el_payments p WHERE p.course_id = c.id AND p.status = 'succeeded') as total_revenue
      FROM el_courses c
      WHERE c.instructor_id = ? AND c.deleted_at IS NULL
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_courses WHERE instructor_id = ? AND deleted_at IS NULL';
    const params: any[] = [userId];
    const countParams: any[] = [userId];

    if (status && status !== 'all') {
      if (status === 'published') {
        sql += ' AND c.is_published = 1';
        countSql += ' AND is_published = 1';
      } else if (status === 'draft') {
        sql += " AND c.status = 'draft'";
        countSql += " AND status = 'draft'";
      } else if (status === 'pending_review') {
        sql += " AND c.status = 'pending_review'";
        countSql += " AND status = 'pending_review'";
      }
    }

    sql += ' ORDER BY c.updated_at DESC LIMIT ? OFFSET ?';
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
          status: course.status,
          rejectionReason: course.rejection_reason || null,
          price: course.price,
          currency: course.currency,
          isPublished: !!course.is_published,
          totalEnrollments: course.total_enrollments || 0,
          averageRating: course.average_rating || 0,
          totalReviews: course.total_reviews || 0,
          totalSections: course.total_sections || 0,
          totalLectures: course.total_lectures || 0,
          totalDuration: course.total_duration || 0,
          totalRevenue: course.total_revenue || 0,
          createdAt: course.created_at,
          updatedAt: course.updated_at,
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
    console.error('Get instructor courses error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 収益レポート
instructorRoutes.get('/revenue', requireInstructor, async (c) => {
  const userId = c.get('userId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    // コミッション率を取得
    const profile = await c.env.DB.prepare(
      'SELECT commission_rate, total_earnings, pending_balance FROM el_instructor_profiles WHERE user_id = ?'
    ).bind(userId).first<{ commission_rate: number; total_earnings: number; pending_balance: number }>();

    const commissionRate = profile?.commission_rate || 30;

    // 月別収益
    let revenueSql = `
      SELECT 
        strftime('%Y-%m', p.created_at) as month,
        SUM(p.amount) as gross_revenue,
        SUM(p.amount * (1 - ? / 100.0)) as net_revenue,
        COUNT(*) as transaction_count
      FROM el_payments p
      JOIN el_courses c ON p.course_id = c.id
      WHERE c.instructor_id = ? AND p.status = 'succeeded'
    `;
    const revenueParams: any[] = [commissionRate, userId];

    if (startDate) {
      revenueSql += ' AND date(p.created_at) >= ?';
      revenueParams.push(startDate);
    }

    if (endDate) {
      revenueSql += ' AND date(p.created_at) <= ?';
      revenueParams.push(endDate);
    }

    revenueSql += " GROUP BY strftime('%Y-%m', p.created_at) ORDER BY month DESC LIMIT 12";

    // コース別収益
    const courseRevenueSql = `
      SELECT 
        c.id, c.title,
        SUM(p.amount) as gross_revenue,
        SUM(p.amount * (1 - ? / 100.0)) as net_revenue,
        COUNT(*) as sales_count
      FROM el_payments p
      JOIN el_courses c ON p.course_id = c.id
      WHERE c.instructor_id = ? AND p.status = 'succeeded'
      GROUP BY c.id, c.title
      ORDER BY gross_revenue DESC
      LIMIT 10
    `;

    const [monthlyRevenue, courseRevenue] = await Promise.all([
      c.env.DB.prepare(revenueSql).bind(...revenueParams).all(),
      c.env.DB.prepare(courseRevenueSql).bind(commissionRate, userId).all(),
    ]);

    return c.json({
      success: true,
      data: {
        commissionRate,
        totalEarnings: profile?.total_earnings || 0,
        pendingBalance: profile?.pending_balance || 0,
        monthly: monthlyRevenue.results.map((r: any) => ({
          month: r.month,
          grossRevenue: r.gross_revenue,
          netRevenue: Math.round(r.net_revenue),
          transactionCount: r.transaction_count,
        })),
        byCourse: courseRevenue.results.map((c: any) => ({
          courseId: c.id,
          courseTitle: c.title,
          grossRevenue: c.gross_revenue,
          netRevenue: Math.round(c.net_revenue),
          salesCount: c.sales_count,
        })),
      }
    });
  } catch (error) {
    console.error('Get instructor revenue error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// Q&A一覧
instructorRoutes.get('/questions', requireInstructor, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const courseId = c.req.query('courseId');

  try {
    let sql = `
      SELECT 
        q.id, q.title, q.content, q.status, q.created_at, q.updated_at,
        c.id as course_id, c.title as course_title,
        u.email as user_email,
        up.display_name as user_name,
        (SELECT COUNT(*) FROM el_answers a WHERE a.question_id = q.id) as answer_count
      FROM el_questions q
      JOIN el_courses c ON q.course_id = c.id
      JOIN el_users u ON q.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE c.instructor_id = ?
    `;
    let countSql = `
      SELECT COUNT(*) as total 
      FROM el_questions q 
      JOIN el_courses c ON q.course_id = c.id 
      WHERE c.instructor_id = ?
    `;
    const params: any[] = [userId];
    const countParams: any[] = [userId];

    if (status && status !== 'all') {
      sql += ' AND q.status = ?';
      countSql += ' AND q.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (courseId) {
      sql += ' AND c.id = ?';
      countSql += ' AND c.id = ?';
      params.push(courseId);
      countParams.push(courseId);
    }

    sql += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [questions, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        questions: questions.results.map((q: any) => ({
          id: q.id,
          title: q.title,
          content: q.content,
          status: q.status,
          courseId: q.course_id,
          courseTitle: q.course_title,
          userName: q.user_name || q.user_email,
          answerCount: q.answer_count,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
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
    console.error('Get instructor questions error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 質問に回答
instructorRoutes.post('/questions/:questionId/answer', requireInstructor, async (c) => {
  const userId = c.get('userId');
  const { questionId } = c.req.param();
  
  try {
    const body = await c.req.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: '回答内容を入力してください' } }, 400);
    }

    // 質問が自分のコースに属しているか確認
    const question = await c.env.DB.prepare(`
      SELECT q.id, q.user_id as asker_id, c.instructor_id
      FROM el_questions q
      JOIN el_courses c ON q.course_id = c.id
      WHERE q.id = ?
    `).bind(questionId).first();

    if (!question) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: '質問が見つかりません' } }, 404);
    }

    if ((question as any).instructor_id !== userId) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'この質問に回答する権限がありません' } }, 403);
    }

    const now = new Date().toISOString();
    const answerId = crypto.randomUUID();

    // 回答を作成
    await c.env.DB.prepare(`
      INSERT INTO el_answers (id, question_id, user_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(answerId, questionId, userId, content, now, now).run();

    // 質問ステータスを更新
    await c.env.DB.prepare(`
      UPDATE el_questions SET status = 'answered', updated_at = ? WHERE id = ?
    `).bind(now, questionId).run();

    // 質問者に通知
    await c.env.DB.prepare(`
      INSERT INTO el_notifications (id, user_id, type, title, message, link, created_at)
      VALUES (?, ?, 'question_answered', '質問への回答がありました', ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      (question as any).asker_id,
      '講師があなたの質問に回答しました',
      `/questions/${questionId}`,
      now
    ).run();

    return c.json({
      success: true,
      data: {
        id: answerId,
        content,
        createdAt: now,
      },
      message: '回答を投稿しました',
    });
  } catch (error) {
    console.error('Post answer error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 分析データ
instructorRoutes.get('/analytics', requireInstructor, async (c) => {
  const userId = c.get('userId');

  try {
    // 日別受講登録
    const dailyEnrollmentsSql = `
      SELECT 
        date(e.created_at) as date,
        COUNT(*) as count
      FROM el_enrollments e
      JOIN el_courses c ON e.course_id = c.id
      WHERE c.instructor_id = ? AND e.created_at >= date('now', '-30 days')
      GROUP BY date(e.created_at)
      ORDER BY date ASC
    `;

    // 日別収益
    const dailyRevenueSql = `
      SELECT 
        date(p.created_at) as date,
        SUM(p.amount) as revenue
      FROM el_payments p
      JOIN el_courses c ON p.course_id = c.id
      WHERE c.instructor_id = ? AND p.status = 'succeeded' AND p.created_at >= date('now', '-30 days')
      GROUP BY date(p.created_at)
      ORDER BY date ASC
    `;

    // コース別統計
    const courseStatsSql = `
      SELECT 
        c.id, c.title, c.total_enrollments, c.average_rating, c.total_reviews,
        (SELECT COUNT(*) FROM el_enrollments e WHERE e.course_id = c.id AND e.status = 'completed') as completed_count,
        (SELECT COALESCE(SUM(p.amount), 0) FROM el_payments p WHERE p.course_id = c.id AND p.status = 'succeeded') as total_revenue
      FROM el_courses c
      WHERE c.instructor_id = ? AND c.deleted_at IS NULL
      ORDER BY c.total_enrollments DESC
      LIMIT 10
    `;

    // 最近のレビュー
    const recentReviewsSql = `
      SELECT 
        r.id, r.rating, r.title, r.content, r.created_at,
        c.id as course_id, c.title as course_title,
        up.display_name as user_name
      FROM el_reviews r
      JOIN el_courses c ON r.course_id = c.id
      JOIN el_users u ON r.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE c.instructor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `;

    const [dailyEnrollments, dailyRevenue, courseStats, recentReviews] = await Promise.all([
      c.env.DB.prepare(dailyEnrollmentsSql).bind(userId).all(),
      c.env.DB.prepare(dailyRevenueSql).bind(userId).all(),
      c.env.DB.prepare(courseStatsSql).bind(userId).all(),
      c.env.DB.prepare(recentReviewsSql).bind(userId).all(),
    ]);

    return c.json({
      success: true,
      data: {
        dailyEnrollments: dailyEnrollments.results.map((d: any) => ({
          date: d.date,
          count: d.count,
        })),
        dailyRevenue: dailyRevenue.results.map((d: any) => ({
          date: d.date,
          revenue: d.revenue,
        })),
        courseStats: courseStats.results.map((c: any) => ({
          courseId: c.id,
          courseTitle: c.title,
          totalEnrollments: c.total_enrollments,
          completedCount: c.completed_count,
          averageRating: c.average_rating,
          totalReviews: c.total_reviews,
          totalRevenue: c.total_revenue,
        })),
        recentReviews: recentReviews.results.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          content: r.content,
          courseId: r.course_id,
          courseTitle: r.course_title,
          userName: r.user_name || '受講者',
          createdAt: r.created_at,
        })),
      }
    });
  } catch (error) {
    console.error('Get instructor analytics error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講師設定取得
instructorRoutes.get('/settings', requireInstructor, async (c) => {
  const userId = c.get('userId');

  try {
    // ユーザー情報と講師プロフィールを取得
    const [user, profile, instructorProfile] = await Promise.all([
      c.env.DB.prepare('SELECT id, email FROM el_users WHERE id = ?').bind(userId).first(),
      c.env.DB.prepare('SELECT * FROM el_user_profiles WHERE user_id = ?').bind(userId).first(),
      c.env.DB.prepare('SELECT * FROM el_instructor_profiles WHERE user_id = ?').bind(userId).first(),
    ]);

    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'ユーザーが見つかりません' } }, 404);
    }

    // display_name または first_name + last_name を使用
    const userName = profile 
      ? ((profile as any).display_name || `${(profile as any).first_name || ''} ${(profile as any).last_name || ''}`.trim() || (user as any).email)
      : (user as any).email;

    return c.json({
      success: true,
      data: {
        user: {
          id: (user as any).id,
          email: (user as any).email,
          name: userName,
        },
        profile: profile ? {
          displayName: (profile as any).display_name,
          firstName: (profile as any).first_name,
          lastName: (profile as any).last_name,
          avatarUrl: (profile as any).avatar_url,
          bio: (profile as any).bio,
          timezone: (profile as any).timezone,
          language: (profile as any).language,
        } : null,
        instructorProfile: instructorProfile ? {
          headline: (instructorProfile as any).headline,
          expertise: (instructorProfile as any).expertise,
          experience: (instructorProfile as any).experience,
          socialLinks: (instructorProfile as any).social_links ? JSON.parse((instructorProfile as any).social_links) : null,
          website: (instructorProfile as any).website,
          stripeAccountId: (instructorProfile as any).stripe_account_id,
          payoutEnabled: (instructorProfile as any).payout_enabled === 1,
          commissionRate: (instructorProfile as any).commission_rate,
          totalEarnings: (instructorProfile as any).total_earnings,
          pendingBalance: (instructorProfile as any).pending_balance,
          bankInfo: (instructorProfile as any).bank_info ? JSON.parse((instructorProfile as any).bank_info) : null,
        } : null,
      }
    });
  } catch (error) {
    console.error('Get instructor settings error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講師設定更新
instructorRoutes.put('/settings', requireInstructor, async (c) => {
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const { profile, instructorProfile } = body;
    const now = new Date().toISOString();

    // プロフィール更新
    if (profile) {
      const existingProfile = await c.env.DB.prepare(
        'SELECT id FROM el_user_profiles WHERE user_id = ?'
      ).bind(userId).first();

      if (existingProfile) {
        await c.env.DB.prepare(`
          UPDATE el_user_profiles SET
            display_name = COALESCE(?, display_name),
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            bio = COALESCE(?, bio),
            timezone = COALESCE(?, timezone),
            language = COALESCE(?, language),
            updated_at = ?
          WHERE user_id = ?
        `).bind(
          profile.displayName || null,
          profile.firstName || null,
          profile.lastName || null,
          profile.bio || null,
          profile.timezone || null,
          profile.language || null,
          now,
          userId
        ).run();
      } else {
        await c.env.DB.prepare(`
          INSERT INTO el_user_profiles (id, user_id, display_name, first_name, last_name, bio, timezone, language, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          userId,
          profile.displayName || null,
          profile.firstName || null,
          profile.lastName || null,
          profile.bio || null,
          profile.timezone || 'Asia/Tokyo',
          profile.language || 'ja',
          now,
          now
        ).run();
      }
    }

    // 講師プロフィール更新
    if (instructorProfile) {
      const existingInstructorProfile = await c.env.DB.prepare(
        'SELECT id FROM el_instructor_profiles WHERE user_id = ?'
      ).bind(userId).first();

      if (existingInstructorProfile) {
        await c.env.DB.prepare(`
          UPDATE el_instructor_profiles SET
            headline = COALESCE(?, headline),
            expertise = COALESCE(?, expertise),
            experience = COALESCE(?, experience),
            social_links = COALESCE(?, social_links),
            website = COALESCE(?, website),
            bank_info = COALESCE(?, bank_info),
            updated_at = ?
          WHERE user_id = ?
        `).bind(
          instructorProfile.headline || null,
          instructorProfile.expertise || null,
          instructorProfile.experience || null,
          instructorProfile.socialLinks ? JSON.stringify(instructorProfile.socialLinks) : null,
          instructorProfile.website || null,
          instructorProfile.bankInfo ? JSON.stringify(instructorProfile.bankInfo) : null,
          now,
          userId
        ).run();
      } else {
        await c.env.DB.prepare(`
          INSERT INTO el_instructor_profiles (id, user_id, headline, expertise, experience, social_links, website, bank_info, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          userId,
          instructorProfile.headline || null,
          instructorProfile.expertise || null,
          instructorProfile.experience || null,
          instructorProfile.socialLinks ? JSON.stringify(instructorProfile.socialLinks) : null,
          instructorProfile.website || null,
          instructorProfile.bankInfo ? JSON.stringify(instructorProfile.bankInfo) : null,
          now,
          now
        ).run();
      }
    }

    return c.json({
      success: true,
      message: '設定を更新しました',
    });
  } catch (error) {
    console.error('Update instructor settings error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 受講者一覧
instructorRoutes.get('/students', requireInstructor, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const courseId = c.req.query('courseId');

  try {
    let sql = `
      SELECT DISTINCT
        u.id, u.email, u.created_at as joined_at,
        up.display_name,
        COUNT(e.id) as enrolled_courses,
        MAX(e.created_at) as last_enrollment
      FROM el_users u
      JOIN el_enrollments e ON u.id = e.user_id
      JOIN el_courses c ON e.course_id = c.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      WHERE c.instructor_id = ?
    `;
    let countSql = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM el_users u
      JOIN el_enrollments e ON u.id = e.user_id
      JOIN el_courses c ON e.course_id = c.id
      WHERE c.instructor_id = ?
    `;
    const params: any[] = [userId];
    const countParams: any[] = [userId];

    if (courseId) {
      sql += ' AND c.id = ?';
      countSql += ' AND c.id = ?';
      params.push(courseId);
      countParams.push(courseId);
    }

    sql += ' GROUP BY u.id, u.email, u.created_at, up.display_name ORDER BY last_enrollment DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [students, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        students: students.results.map((s: any) => ({
          id: s.id,
          email: s.email,
          displayName: s.display_name || s.email.split('@')[0],
          enrolledCourses: s.enrolled_courses,
          lastEnrollment: s.last_enrollment,
          joinedAt: s.joined_at,
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
    console.error('Get instructor students error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講師の動画一覧取得
instructorRoutes.get('/videos', requireInstructor, async (c) => {
  const userId = c.get('userId');

  try {
    // 講師のコースに紐づいた動画を取得
    const videos = await c.env.DB.prepare(`
      SELECT 
        v.id, v.duration, v.status, 
        v.thumbnail_url, v.file_size, v.created_at,
        l.id as lecture_id, l.title as lecture_title,
        c.id as course_id, c.title as course_title
      FROM el_videos v
      JOIN el_lectures l ON v.lecture_id = l.id
      JOIN el_sections s ON l.section_id = s.id
      JOIN el_courses c ON s.course_id = c.id
      WHERE c.instructor_id = ?
      ORDER BY v.created_at DESC
    `).bind(userId).all();

    return c.json({
      success: true,
      data: {
        videos: videos.results.map((v: any) => ({
          id: v.id,
          title: v.lecture_title, // 動画タイトルはレクチャータイトルを使用
          duration: v.duration || 0,
          status: v.status || 'ready',
          thumbnailUrl: v.thumbnail_url,
          size: v.file_size,
          createdAt: v.created_at,
          linkedLecture: v.lecture_id ? {
            id: v.lecture_id,
            title: v.lecture_title,
            courseId: v.course_id,
            courseTitle: v.course_title,
          } : null,
        })),
      }
    });
  } catch (error) {
    console.error('Get instructor videos error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { instructorRoutes };
