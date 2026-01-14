import { Hono } from 'hono';
import type { Env } from '../types';

const notificationsRoutes = new Hono<{ Bindings: Env }>();

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
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'トークンが無効です' } }, 401);
  }
};

// 通知一覧取得
notificationsRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const unreadOnly = c.req.query('unreadOnly') === 'true';

  try {
    let sql = `
      SELECT id, type, title, message, link, is_read, created_at
      FROM el_notifications
      WHERE user_id = ?
    `;
    let countSql = 'SELECT COUNT(*) as total FROM el_notifications WHERE user_id = ?';
    const params: any[] = [userId];
    const countParams: any[] = [userId];

    if (unreadOnly) {
      sql += ' AND is_read = 0';
      countSql += ' AND is_read = 0';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [notifications, total, unreadCount] = await Promise.all([
      c.env.DB.prepare(sql).bind(...params).all(),
      c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM el_notifications WHERE user_id = ? AND is_read = 0').bind(userId).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        notifications: notifications.results.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: !!n.is_read,
          createdAt: n.created_at,
        })),
        unreadCount: unreadCount?.count || 0,
        pagination: {
          page,
          limit,
          total: total?.total || 0,
          totalPages: Math.ceil((total?.total || 0) / limit),
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 未読数取得
notificationsRoutes.get('/unread-count', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM el_notifications WHERE user_id = ? AND is_read = 0'
    ).bind(userId).first<{ count: number }>();

    return c.json({
      success: true,
      data: { count: result?.count || 0 }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 通知を既読にする
notificationsRoutes.put('/:notificationId/read', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { notificationId } = c.req.param();

  try {
    await c.env.DB.prepare(
      'UPDATE el_notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).bind(notificationId, userId).run();

    return c.json({
      success: true,
      message: '既読にしました',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// すべて既読にする
notificationsRoutes.put('/read-all', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    await c.env.DB.prepare(
      'UPDATE el_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).bind(userId).run();

    return c.json({
      success: true,
      message: 'すべて既読にしました',
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 通知を削除
notificationsRoutes.delete('/:notificationId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { notificationId } = c.req.param();

  try {
    await c.env.DB.prepare(
      'DELETE FROM el_notifications WHERE id = ? AND user_id = ?'
    ).bind(notificationId, userId).run();

    return c.json({
      success: true,
      message: '通知を削除しました',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

// 通知を作成（内部API / 他のルートから呼び出し用）
export async function createNotification(
  db: any,
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO el_notifications (id, user_id, type, title, message, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).bind(id, userId, type, title, message, link || null, now).run();

  return id;
}

export { notificationsRoutes };
