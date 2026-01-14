import { Hono } from 'hono';
import type { Env } from '../types';

const certificatesRoutes = new Hono<{ Bindings: Env }>();

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

// 修了証一覧を取得
certificatesRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const certificates = await c.env.DB.prepare(`
      SELECT 
        e.id,
        e.course_id,
        c.title as course_title,
        c.thumbnail_url,
        e.certificate_issued_at as issued_at,
        e.certificate_url
      FROM el_enrollments e
      JOIN el_courses c ON e.course_id = c.id
      WHERE e.user_id = ? AND e.certificate_issued_at IS NOT NULL
      ORDER BY e.certificate_issued_at DESC
    `).bind(userId).all();

    return c.json({
      success: true,
      data: {
        certificates: certificates.results.map((cert: any) => ({
          id: cert.id,
          courseId: cert.course_id,
          courseTitle: cert.course_title,
          thumbnailUrl: cert.thumbnail_url,
          issuedAt: cert.issued_at,
          certificateUrl: cert.certificate_url,
        })),
      }
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 修了証を発行（コース完了時に呼び出し）
certificatesRoutes.post('/:courseId/issue', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    // 受講登録と進捗を確認
    const enrollment = await c.env.DB.prepare(
      'SELECT id, certificate_issued_at FROM el_enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(userId, courseId).first();

    if (!enrollment) {
      return c.json({ success: false, error: { code: 'NOT_ENROLLED', message: 'このコースに登録されていません' } }, 403);
    }

    if ((enrollment as any).certificate_issued_at) {
      return c.json({ success: false, error: { code: 'ALREADY_ISSUED', message: '既に修了証が発行されています' } }, 400);
    }

    // コースの全講義を完了しているか確認
    const progress = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM el_lectures l JOIN el_sections s ON l.section_id = s.id WHERE s.course_id = ?) as total,
        (SELECT COUNT(*) FROM el_lecture_progress lp 
         JOIN el_lectures l ON lp.lecture_id = l.id 
         JOIN el_sections s ON l.section_id = s.id 
         WHERE lp.user_id = ? AND s.course_id = ? AND lp.is_completed = 1) as completed
    `).bind(courseId, userId, courseId).first<{ total: number; completed: number }>();

    if (!progress || progress.total === 0 || progress.completed < progress.total) {
      return c.json({ 
        success: false, 
        error: { 
          code: 'NOT_COMPLETED', 
          message: `コースを完了してください（${progress?.completed || 0}/${progress?.total || 0} 講義完了）` 
        } 
      }, 400);
    }

    // コース情報を取得
    const course = await c.env.DB.prepare(
      'SELECT title FROM el_courses WHERE id = ?'
    ).bind(courseId).first();

    // ユーザー情報を取得
    const user = await c.env.DB.prepare(`
      SELECT u.email, up.display_name, up.first_name, up.last_name 
      FROM el_users u 
      LEFT JOIN el_user_profiles up ON u.id = up.user_id 
      WHERE u.id = ?
    `).bind(userId).first();

    const now = new Date().toISOString();
    const certificateId = crypto.randomUUID();
    
    // 修了証URLを生成（実際のPDF生成は別途実装）
    const certificateUrl = `/api/certificates/${certificateId}/download`;

    // 修了証を発行
    await c.env.DB.prepare(`
      UPDATE el_enrollments 
      SET status = 'completed', completed_at = ?, certificate_issued_at = ?, certificate_url = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, now, certificateUrl, now, (enrollment as any).id).run();

    return c.json({
      success: true,
      data: {
        certificateId,
        courseId,
        courseTitle: (course as any)?.title,
        userName: (user as any)?.display_name || (user as any)?.email,
        issuedAt: now,
        certificateUrl,
      }
    });
  } catch (error) {
    console.error('Issue certificate error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 修了証をダウンロード（PDF生成）
certificatesRoutes.get('/:courseId/download', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { courseId } = c.req.param();

  try {
    // 修了証が発行されているか確認
    const enrollment = await c.env.DB.prepare(`
      SELECT e.id, e.certificate_issued_at, c.title as course_title, c.is_subsidy_eligible
      FROM el_enrollments e
      JOIN el_courses c ON e.course_id = c.id
      WHERE e.user_id = ? AND e.course_id = ? AND e.certificate_issued_at IS NOT NULL
    `).bind(userId, courseId).first();

    if (!enrollment) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: '修了証が見つかりません' } }, 404);
    }

    // ユーザー情報を取得
    const user = await c.env.DB.prepare(`
      SELECT u.email, up.display_name, up.first_name, up.last_name 
      FROM el_users u 
      LEFT JOIN el_user_profiles up ON u.id = up.user_id 
      WHERE u.id = ?
    `).bind(userId).first();

    // 学習時間を取得
    const watchTime = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(wl.watched_seconds), 0) as total 
      FROM el_watch_logs wl
      JOIN el_enrollments e ON wl.enrollment_id = e.id
      WHERE wl.user_id = ? AND e.course_id = ?
    `).bind(userId, courseId).first<{ total: number }>();

    // 修了証データを返す（フロントエンドでPDF生成）
    return c.json({
      success: true,
      data: {
        certificate: {
          courseTitle: (enrollment as any).course_title,
          userName: (user as any)?.display_name || `${(user as any)?.last_name || ''} ${(user as any)?.first_name || ''}`.trim() || (user as any)?.email,
          issuedAt: (enrollment as any).certificate_issued_at,
          totalWatchTime: watchTime?.total || 0,
          isSubsidyEligible: !!(enrollment as any).is_subsidy_eligible,
        }
      }
    });
  } catch (error) {
    console.error('Download certificate error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { certificatesRoutes };
