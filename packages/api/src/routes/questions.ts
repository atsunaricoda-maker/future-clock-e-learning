import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';
import { createNotification } from './notifications';

const questionsRoutes = new Hono<{ Bindings: Env }>();

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

// コースの質問一覧取得
questionsRoutes.get('/courses/:courseId', async (c) => {
  const { courseId } = c.req.param();
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const lectureId = c.req.query('lectureId');
  const status = c.req.query('status');

  try {
    let sql = `
      SELECT 
        q.id, q.title, q.content, q.status, q.created_at, q.updated_at,
        q.lecture_id,
        l.title as lecture_title,
        up.display_name as user_name, up.avatar_url,
        (SELECT COUNT(*) FROM el_answers a WHERE a.question_id = q.id) as answer_count
      FROM el_questions q
      JOIN el_users u ON q.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      LEFT JOIN el_lectures l ON q.lecture_id = l.id
      WHERE q.course_id = ?
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_questions WHERE course_id = ?';
    const params: any[] = [courseId];
    const countParams: any[] = [courseId];

    if (lectureId) {
      sql += ' AND q.lecture_id = ?';
      countSql += ' AND lecture_id = ?';
      params.push(lectureId);
      countParams.push(lectureId);
    }

    if (status && status !== 'all') {
      sql += ' AND q.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
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
          lectureId: q.lecture_id,
          lectureTitle: q.lecture_title,
          userName: q.user_name || '受講者',
          avatarUrl: q.avatar_url,
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
    console.error('Get questions error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 質問詳細と回答一覧取得
questionsRoutes.get('/:questionId', async (c) => {
  const { questionId } = c.req.param();

  try {
    // 質問を取得
    const question = await c.env.DB.prepare(`
      SELECT 
        q.id, q.course_id, q.lecture_id, q.title, q.content, q.status, q.created_at, q.updated_at,
        l.title as lecture_title,
        u.id as user_id,
        up.display_name as user_name, up.avatar_url
      FROM el_questions q
      JOIN el_users u ON q.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      LEFT JOIN el_lectures l ON q.lecture_id = l.id
      WHERE q.id = ?
    `).bind(questionId).first();

    if (!question) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: '質問が見つかりません' } }, 404);
    }

    // 回答を取得
    const answers = await c.env.DB.prepare(`
      SELECT 
        a.id, a.content, a.is_accepted, a.created_at, a.updated_at,
        u.id as user_id,
        up.display_name as user_name, up.avatar_url,
        CASE WHEN c.instructor_id = u.id THEN 1 ELSE 0 END as is_instructor
      FROM el_answers a
      JOIN el_users u ON a.user_id = u.id
      LEFT JOIN el_user_profiles up ON u.id = up.user_id
      LEFT JOIN el_courses c ON c.id = ?
      WHERE a.question_id = ?
      ORDER BY a.is_accepted DESC, a.created_at ASC
    `).bind((question as any).course_id, questionId).all();

    return c.json({
      success: true,
      data: {
        question: {
          id: (question as any).id,
          courseId: (question as any).course_id,
          lectureId: (question as any).lecture_id,
          lectureTitle: (question as any).lecture_title,
          title: (question as any).title,
          content: (question as any).content,
          status: (question as any).status,
          userId: (question as any).user_id,
          userName: (question as any).user_name || '受講者',
          avatarUrl: (question as any).avatar_url,
          createdAt: (question as any).created_at,
          updatedAt: (question as any).updated_at,
        },
        answers: answers.results.map((a: any) => ({
          id: a.id,
          content: a.content,
          isAccepted: !!a.is_accepted,
          isInstructor: !!a.is_instructor,
          userId: a.user_id,
          userName: a.user_name || '受講者',
          avatarUrl: a.avatar_url,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        })),
      }
    });
  } catch (error) {
    console.error('Get question detail error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 質問投稿
const createQuestionSchema = z.object({
  courseId: z.string(),
  lectureId: z.string().optional(),
  title: z.string().min(5, '5文字以上入力してください').max(200),
  content: z.string().min(10, '10文字以上入力してください').max(5000),
});

questionsRoutes.post(
  '/',
  requireAuth,
  zValidator('json', createQuestionSchema),
  async (c) => {
    const userId = c.get('userId');
    const { courseId, lectureId, title, content } = c.req.valid('json');

    try {
      // 受講登録の確認
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, courseId).first();

      if (!enrollment) {
        return c.json({ 
          success: false, 
          error: { code: 'NOT_ENROLLED', message: 'このコースを受講していないため質問できません' } 
        }, 403);
      }

      const now = new Date().toISOString();
      const questionId = crypto.randomUUID();

      await c.env.DB.prepare(`
        INSERT INTO el_questions (id, course_id, lecture_id, user_id, title, content, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
      `).bind(questionId, courseId, lectureId || null, userId, title, content, now, now).run();

      // 講師に通知
      const course = await c.env.DB.prepare(
        'SELECT instructor_id, title FROM el_courses WHERE id = ?'
      ).bind(courseId).first();

      if (course) {
        await createNotification(
          c.env.DB,
          (course as any).instructor_id,
          'question',
          '新しい質問が投稿されました',
          `「${(course as any).title}」に新しい質問があります: ${title.substring(0, 50)}...`,
          `/instructor/questions`
        );
      }

      return c.json({
        success: true,
        data: { id: questionId },
        message: '質問を投稿しました',
      });
    } catch (error) {
      console.error('Create question error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// 回答投稿
const createAnswerSchema = z.object({
  content: z.string().min(5, '5文字以上入力してください').max(5000),
});

questionsRoutes.post(
  '/:questionId/answers',
  requireAuth,
  zValidator('json', createAnswerSchema),
  async (c) => {
    const userId = c.get('userId');
    const { questionId } = c.req.param();
    const { content } = c.req.valid('json');

    try {
      // 質問の存在確認
      const question = await c.env.DB.prepare(`
        SELECT q.id, q.user_id as asker_id, q.course_id, c.instructor_id
        FROM el_questions q
        JOIN el_courses c ON q.course_id = c.id
        WHERE q.id = ?
      `).bind(questionId).first();

      if (!question) {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: '質問が見つかりません' } }, 404);
      }

      // 受講者または講師か確認
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, (question as any).course_id).first();

      const isInstructor = userId === (question as any).instructor_id;

      if (!enrollment && !isInstructor) {
        return c.json({ 
          success: false, 
          error: { code: 'NOT_ENROLLED', message: '回答する権限がありません' } 
        }, 403);
      }

      const now = new Date().toISOString();
      const answerId = crypto.randomUUID();

      await c.env.DB.prepare(`
        INSERT INTO el_answers (id, question_id, user_id, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(answerId, questionId, userId, content, now, now).run();

      // 講師が回答した場合、ステータスを更新
      if (isInstructor) {
        await c.env.DB.prepare(
          "UPDATE el_questions SET status = 'answered', updated_at = ? WHERE id = ?"
        ).bind(now, questionId).run();
      }

      // 質問者に通知（自分への回答以外）
      if (userId !== (question as any).asker_id) {
        await createNotification(
          c.env.DB,
          (question as any).asker_id,
          'answer',
          '質問に回答がつきました',
          isInstructor ? '講師があなたの質問に回答しました' : '他の受講者があなたの質問に回答しました',
          `/questions/${questionId}`
        );
      }

      return c.json({
        success: true,
        data: { id: answerId },
        message: '回答を投稿しました',
      });
    } catch (error) {
      console.error('Create answer error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// ベストアンサーを選択
questionsRoutes.put('/:questionId/answers/:answerId/accept', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { questionId, answerId } = c.req.param();

  try {
    // 質問者か確認
    const question = await c.env.DB.prepare(
      'SELECT id FROM el_questions WHERE id = ? AND user_id = ?'
    ).bind(questionId, userId).first();

    if (!question) {
      return c.json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'ベストアンサーを選択する権限がありません' } 
      }, 403);
    }

    const now = new Date().toISOString();

    // 既存のベストアンサーを解除
    await c.env.DB.prepare(
      'UPDATE el_answers SET is_accepted = 0, updated_at = ? WHERE question_id = ?'
    ).bind(now, questionId).run();

    // 新しいベストアンサーを設定
    await c.env.DB.prepare(
      'UPDATE el_answers SET is_accepted = 1, updated_at = ? WHERE id = ?'
    ).bind(now, answerId).run();

    // 質問をクローズ
    await c.env.DB.prepare(
      "UPDATE el_questions SET status = 'closed', updated_at = ? WHERE id = ?"
    ).bind(now, questionId).run();

    return c.json({
      success: true,
      message: 'ベストアンサーを選択しました',
    });
  } catch (error) {
    console.error('Accept answer error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 自分の質問一覧
questionsRoutes.get('/my/list', requireAuth, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');

  try {
    const sql = `
      SELECT 
        q.id, q.title, q.status, q.created_at,
        c.id as course_id, c.title as course_title,
        (SELECT COUNT(*) FROM el_answers a WHERE a.question_id = q.id) as answer_count
      FROM el_questions q
      JOIN el_courses c ON q.course_id = c.id
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = 'SELECT COUNT(*) as total FROM el_questions WHERE user_id = ?';

    const [questions, total] = await Promise.all([
      c.env.DB.prepare(sql).bind(userId, limit, (page - 1) * limit).all(),
      c.env.DB.prepare(countSql).bind(userId).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        questions: questions.results.map((q: any) => ({
          id: q.id,
          title: q.title,
          status: q.status,
          courseId: q.course_id,
          courseTitle: q.course_title,
          answerCount: q.answer_count,
          createdAt: q.created_at,
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
    console.error('Get my questions error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { questionsRoutes };
