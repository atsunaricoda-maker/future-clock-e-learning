import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const progressRoutes = new Hono<{ Bindings: Env }>();

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

// 講義完了を記録
const completeLectureSchema = z.object({
  watchedDuration: z.number().min(0).optional(), // 視聴時間（秒）
});

progressRoutes.post(
  '/courses/:courseId/lectures/:lectureId/complete',
  requireAuth,
  zValidator('json', completeLectureSchema),
  async (c) => {
    const userId = c.get('userId');
    const { courseId, lectureId } = c.req.param();
    const { watchedDuration } = c.req.valid('json');

    try {
      // 講義が存在するか確認
      const lecture = await c.env.DB.prepare(
        'SELECT id, duration FROM el_lectures WHERE id = ?'
      ).bind(lectureId).first();

      if (!lecture) {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: '講義が見つかりません' } }, 404);
      }

      // 受講登録があるか確認
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, courseId).first();

      if (!enrollment) {
        return c.json({ success: false, error: { code: 'NOT_ENROLLED', message: 'このコースに登録されていません' } }, 403);
      }

      const now = new Date().toISOString();

      // 進捗を記録または更新
      await c.env.DB.prepare(`
        INSERT INTO el_lecture_progress (id, user_id, lecture_id, is_completed, watched_duration, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?, ?)
        ON CONFLICT(user_id, lecture_id) DO UPDATE SET
          is_completed = 1,
          watched_duration = COALESCE(?, watched_duration),
          completed_at = COALESCE(completed_at, ?),
          updated_at = ?
      `).bind(
        crypto.randomUUID(),
        userId,
        lectureId,
        watchedDuration || 0,
        now,
        now,
        now,
        watchedDuration,
        now,
        now
      ).run();

      // 学習時間ログを記録
      if (watchedDuration && watchedDuration > 0) {
        // 受講登録IDを取得
        const enrollmentRecord = await c.env.DB.prepare(
          'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
        ).bind(userId, courseId).first();
        
        if (enrollmentRecord) {
          await c.env.DB.prepare(`
            INSERT INTO el_watch_logs (id, user_id, lecture_id, enrollment_id, session_id, start_time, watched_seconds, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            userId,
            lectureId,
            (enrollmentRecord as any).id,
            crypto.randomUUID(),
            now,
            watchedDuration,
            now
          ).run();
        }
      }

      return c.json({ 
        success: true, 
        message: '講義を完了しました',
        data: { lectureId, completedAt: now }
      });
    } catch (error) {
      console.error('Complete lecture error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// コースの進捗を取得
progressRoutes.get('/courses/:courseId/progress', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    // コースの全講義数を取得
    const totalLectures = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM el_lectures l
      JOIN el_sections s ON l.section_id = s.id
      WHERE s.course_id = ?
    `).bind(courseId).first<{ count: number }>();

    // 完了した講義数を取得
    const completedLectures = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM el_lecture_progress lp
      JOIN el_lectures l ON lp.lecture_id = l.id
      JOIN el_sections s ON l.section_id = s.id
      WHERE lp.user_id = ? AND s.course_id = ? AND lp.is_completed = 1
    `).bind(userId, courseId).first<{ count: number }>();

    // 総学習時間を取得
    const totalWatchTime = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(wl.watched_seconds), 0) as total 
      FROM el_watch_logs wl
      JOIN el_enrollments e ON wl.enrollment_id = e.id
      WHERE wl.user_id = ? AND e.course_id = ?
    `).bind(userId, courseId).first<{ total: number }>();

    // 最後にアクセスした講義を取得
    const lastAccess = await c.env.DB.prepare(`
      SELECT l.id, l.title, lp.updated_at FROM el_lecture_progress lp
      JOIN el_lectures l ON lp.lecture_id = l.id
      JOIN el_sections s ON l.section_id = s.id
      WHERE lp.user_id = ? AND s.course_id = ?
      ORDER BY lp.updated_at DESC LIMIT 1
    `).bind(userId, courseId).first();

    const total = totalLectures?.count || 0;
    const completed = completedLectures?.count || 0;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return c.json({
      success: true,
      data: {
        courseId,
        totalLectures: total,
        completedLectures: completed,
        progressPercent,
        totalWatchTime: totalWatchTime?.total || 0,
        lastAccessedLecture: lastAccess || null,
        isCompleted: total > 0 && completed >= total,
      }
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 講義の進捗を取得
progressRoutes.get('/courses/:courseId/lectures/progress', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    const progress = await c.env.DB.prepare(`
      SELECT 
        l.id as lecture_id,
        lp.is_completed,
        lp.watched_duration,
        lp.completed_at
      FROM el_lectures l
      JOIN el_sections s ON l.section_id = s.id
      LEFT JOIN el_lecture_progress lp ON l.id = lp.lecture_id AND lp.user_id = ?
      WHERE s.course_id = ?
      ORDER BY s.sort_order, l.sort_order
    `).bind(userId, courseId).all();

    return c.json({
      success: true,
      data: {
        lectures: progress.results.map((p: any) => ({
          lectureId: p.lecture_id,
          isCompleted: !!p.is_completed,
          watchedDuration: p.watched_duration || 0,
          completedAt: p.completed_at,
        }))
      }
    });
  } catch (error) {
    console.error('Get lectures progress error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// ユーザーの全コース進捗を取得
progressRoutes.get('/my-progress', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const enrollments = await c.env.DB.prepare(`
      SELECT 
        e.course_id,
        c.title,
        c.thumbnail_url,
        e.enrolled_at,
        (SELECT COUNT(*) FROM el_lectures l JOIN el_sections s ON l.section_id = s.id WHERE s.course_id = c.id) as total_lectures,
        (SELECT COUNT(*) FROM el_lecture_progress lp 
         JOIN el_lectures l ON lp.lecture_id = l.id 
         JOIN el_sections s ON l.section_id = s.id 
         WHERE lp.user_id = e.user_id AND s.course_id = c.id AND lp.is_completed = 1) as completed_lectures,
        (SELECT COALESCE(SUM(wl.watched_seconds), 0) FROM el_watch_logs wl WHERE wl.user_id = e.user_id AND wl.enrollment_id = e.id) as total_watch_time
      FROM el_enrollments e
      JOIN el_courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `).bind(userId).all();

    return c.json({
      success: true,
      data: {
        courses: enrollments.results.map((e: any) => ({
          courseId: e.course_id,
          title: e.title,
          thumbnailUrl: e.thumbnail_url,
          enrolledAt: e.enrolled_at,
          totalLectures: e.total_lectures,
          completedLectures: e.completed_lectures,
          progressPercent: e.total_lectures > 0 ? Math.round((e.completed_lectures / e.total_lectures) * 100) : 0,
          totalWatchTime: e.total_watch_time,
          isCompleted: e.total_lectures > 0 && e.completed_lectures >= e.total_lectures,
        }))
      }
    });
  } catch (error) {
    console.error('Get my progress error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// コースに登録
progressRoutes.post('/courses/:courseId/enroll', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    // コースが存在するか確認
    const course = await c.env.DB.prepare(
      'SELECT id, price FROM el_courses WHERE id = ? AND status = ?'
    ).bind(courseId, 'published').first();

    if (!course) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'コースが見つかりません' } }, 404);
    }

    // 既に登録済みか確認
    const existing = await c.env.DB.prepare(
      'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(userId, courseId).first();

    if (existing) {
      return c.json({ success: false, error: { code: 'ALREADY_ENROLLED', message: '既にこのコースに登録されています' } }, 400);
    }

    const now = new Date().toISOString();
    const enrollmentId = crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO el_enrollments (id, user_id, course_id, enrolled_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(enrollmentId, userId, courseId, now, now, now).run();

    return c.json({
      success: true,
      message: 'コースに登録しました',
      data: { enrollmentId, courseId, enrolledAt: now }
    });
  } catch (error) {
    console.error('Enroll error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { progressRoutes };
