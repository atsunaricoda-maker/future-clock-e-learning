import { Hono } from 'hono';
import type { Env } from '../types';

const learningTimeRoutes = new Hono<{ Bindings: Env }>();

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

// 学習時間ログを取得（助成金対応）
learningTimeRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const courseId = c.req.query('courseId');

  try {
    let sql = `
      SELECT 
        date(wl.start_time) as date,
        e.course_id,
        c.title as course_title,
        SUM(wl.watched_seconds) as total_duration,
        COUNT(*) as sessions
      FROM el_watch_logs wl
      JOIN el_enrollments e ON wl.enrollment_id = e.id
      JOIN el_courses c ON e.course_id = c.id
      WHERE wl.user_id = ?
    `;
    const params: any[] = [userId];

    if (startDate) {
      sql += ' AND date(wl.start_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND date(wl.start_time) <= ?';
      params.push(endDate);
    }

    if (courseId) {
      sql += ' AND e.course_id = ?';
      params.push(courseId);
    }

    sql += ' GROUP BY date(wl.start_time), e.course_id ORDER BY date(wl.start_time) DESC';

    const logs = await c.env.DB.prepare(sql).bind(...params).all();

    // 合計学習時間を計算
    const totalDuration = logs.results.reduce((sum: number, log: any) => sum + (log.total_duration || 0), 0);

    return c.json({
      success: true,
      data: {
        logs: logs.results.map((log: any) => ({
          date: log.date,
          courseId: log.course_id,
          courseTitle: log.course_title,
          totalDuration: log.total_duration,
          sessions: log.sessions,
        })),
        totalDuration,
      }
    });
  } catch (error) {
    console.error('Get learning time logs error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 月別サマリーを取得
learningTimeRoutes.get('/monthly', requireAuth, async (c) => {
  const userId = c.get('userId');
  const year = c.req.query('year') || new Date().getFullYear().toString();

  try {
    const summary = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', wl.start_time) as month,
        SUM(wl.watched_seconds) as total_duration,
        COUNT(DISTINCT e.course_id) as courses_studied,
        COUNT(DISTINCT date(wl.start_time)) as study_days
      FROM el_watch_logs wl
      JOIN el_enrollments e ON wl.enrollment_id = e.id
      WHERE wl.user_id = ? AND strftime('%Y', wl.start_time) = ?
      GROUP BY strftime('%Y-%m', wl.start_time)
      ORDER BY month DESC
    `).bind(userId, year).all();

    return c.json({
      success: true,
      data: {
        year,
        monthly: summary.results.map((m: any) => ({
          month: m.month,
          totalDuration: m.total_duration,
          coursesStudied: m.courses_studied,
          studyDays: m.study_days,
        })),
      }
    });
  } catch (error) {
    console.error('Get monthly summary error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 学習時間レポートをエクスポート（CSV/PDF用データ）
learningTimeRoutes.get('/export', requireAuth, async (c) => {
  const userId = c.get('userId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const format = c.req.query('format') || 'csv';

  try {
    let sql = `
      SELECT 
        date(wl.start_time) as date,
        e.course_id,
        c.title as course_title,
        c.is_subsidy_eligible,
        l.title as lecture_title,
        wl.watched_seconds as duration
      FROM el_watch_logs wl
      JOIN el_enrollments e ON wl.enrollment_id = e.id
      JOIN el_courses c ON e.course_id = c.id
      LEFT JOIN el_lectures l ON wl.lecture_id = l.id
      WHERE wl.user_id = ?
    `;
    const params: any[] = [userId];

    if (startDate) {
      sql += ' AND date(wl.start_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND date(wl.start_time) <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY wl.start_time ASC';

    const logs = await c.env.DB.prepare(sql).bind(...params).all();

    // ユーザー情報を取得
    const user = await c.env.DB.prepare(`
      SELECT u.email, up.display_name, up.first_name, up.last_name 
      FROM el_users u 
      LEFT JOIN el_user_profiles up ON u.id = up.user_id 
      WHERE u.id = ?
    `).bind(userId).first();

    // サマリー情報を計算
    const totalDuration = logs.results.reduce((sum: number, log: any) => sum + (log.duration || 0), 0);
    const subsidyEligibleDuration = logs.results
      .filter((log: any) => log.is_subsidy_eligible)
      .reduce((sum: number, log: any) => sum + (log.duration || 0), 0);

    if (format === 'csv') {
      // CSV形式でデータを返す
      const csvHeader = '日付,コース名,講義名,学習時間（分）,助成金対象\n';
      const csvBody = logs.results.map((log: any) => 
        `${log.date},"${log.course_title}","${log.lecture_title || ''}",${Math.round((log.duration || 0) / 60)},${log.is_subsidy_eligible ? 'はい' : 'いいえ'}`
      ).join('\n');

      return c.json({
        success: true,
        data: {
          format: 'csv',
          content: csvHeader + csvBody,
          filename: `learning_time_${startDate || 'all'}_${endDate || 'all'}.csv`,
          summary: {
            userName: (user as any)?.display_name || (user as any)?.email,
            period: { startDate, endDate },
            totalDuration,
            totalHours: Math.round(totalDuration / 3600 * 10) / 10,
            subsidyEligibleDuration,
            subsidyEligibleHours: Math.round(subsidyEligibleDuration / 3600 * 10) / 10,
          }
        }
      });
    }

    // PDF用データを返す
    return c.json({
      success: true,
      data: {
        format: 'pdf',
        userName: (user as any)?.display_name || (user as any)?.email,
        period: { startDate, endDate },
        logs: logs.results.map((log: any) => ({
          date: log.date,
          courseTitle: log.course_title,
          lectureTitle: log.lecture_title,
          duration: log.duration,
          isSubsidyEligible: !!log.is_subsidy_eligible,
        })),
        summary: {
          totalDuration,
          totalHours: Math.round(totalDuration / 3600 * 10) / 10,
          subsidyEligibleDuration,
          subsidyEligibleHours: Math.round(subsidyEligibleDuration / 3600 * 10) / 10,
        }
      }
    });
  } catch (error) {
    console.error('Export learning time error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { learningTimeRoutes };
