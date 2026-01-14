import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const notesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to require authentication
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(atob(token.split('.')[1]));
    c.set('userId', payload.userId);
    c.set('userRole', payload.role);
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } }, 401);
  }
};

notesRoutes.use('*', requireAuth);

// Get all notes for a user (optionally filtered by course or lecture)
notesRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const lectureId = c.req.query('lectureId');
  const courseId = c.req.query('courseId');

  try {
    let query: string;
    let params: any[];

    if (lectureId) {
      // Get notes for specific lecture
      query = `
        SELECT n.*, l.title as lecture_title
        FROM notes n
        JOIN lectures l ON n.lecture_id = l.id
        WHERE n.user_id = ? AND n.lecture_id = ?
        ORDER BY n.timestamp_seconds ASC, n.created_at DESC
      `;
      params = [userId, lectureId];
    } else if (courseId) {
      // Get notes for all lectures in a course
      query = `
        SELECT n.*, l.title as lecture_title, s.title as section_title
        FROM notes n
        JOIN lectures l ON n.lecture_id = l.id
        JOIN sections s ON l.section_id = s.id
        WHERE n.user_id = ? AND s.course_id = ?
        ORDER BY s.sort_order, l.sort_order, n.timestamp_seconds ASC
      `;
      params = [userId, courseId];
    } else {
      // Get all notes
      query = `
        SELECT n.*, l.title as lecture_title, s.title as section_title, c.title as course_title, c.id as course_id
        FROM notes n
        JOIN lectures l ON n.lecture_id = l.id
        JOIN sections s ON l.section_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE n.user_id = ?
        ORDER BY n.updated_at DESC
        LIMIT 100
      `;
      params = [userId];
    }

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: {
        notes: result.results || [],
      },
    });
  } catch (error) {
    console.error('Failed to get notes:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to get notes' } }, 500);
  }
});

// Create a new note
notesRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { lectureId, content, timestampSeconds } = body;

  if (!lectureId || !content) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'lectureId and content are required' } }, 400);
  }

  try {
    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO notes (id, user_id, lecture_id, content, timestamp_seconds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(noteId, userId, lectureId, content, timestampSeconds || null, now, now).run();

    return c.json({
      success: true,
      data: {
        id: noteId,
        userId,
        lectureId,
        content,
        timestampSeconds,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('Failed to create note:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to create note' } }, 500);
  }
});

// Update a note
notesRoutes.put('/:noteId', async (c) => {
  const userId = c.get('userId');
  const noteId = c.req.param('noteId');
  const body = await c.req.json();
  const { content, timestampSeconds } = body;

  if (!content) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'content is required' } }, 400);
  }

  try {
    // Check ownership
    const existing = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(noteId).first();
    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } }, 404);
    }
    if (existing.user_id !== userId) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not own this note' } }, 403);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      UPDATE notes SET content = ?, timestamp_seconds = ?, updated_at = ? WHERE id = ?
    `).bind(content, timestampSeconds || existing.timestamp_seconds, now, noteId).run();

    return c.json({
      success: true,
      data: {
        id: noteId,
        content,
        timestampSeconds: timestampSeconds || existing.timestamp_seconds,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('Failed to update note:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to update note' } }, 500);
  }
});

// Delete a note
notesRoutes.delete('/:noteId', async (c) => {
  const userId = c.get('userId');
  const noteId = c.req.param('noteId');

  try {
    // Check ownership
    const existing = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(noteId).first();
    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } }, 404);
    }
    if (existing.user_id !== userId) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not own this note' } }, 403);
    }

    await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(noteId).run();

    return c.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Failed to delete note:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to delete note' } }, 500);
  }
});

// =============================================
// Bookmarks Routes
// =============================================

// Get all bookmarks for a user
notesRoutes.get('/bookmarks', async (c) => {
  const userId = c.get('userId');
  const lectureId = c.req.query('lectureId');
  const courseId = c.req.query('courseId');

  try {
    let query: string;
    let params: any[];

    if (lectureId) {
      query = `
        SELECT b.*, l.title as lecture_title
        FROM bookmarks b
        JOIN lectures l ON b.lecture_id = l.id
        WHERE b.user_id = ? AND b.lecture_id = ?
        ORDER BY b.timestamp_seconds ASC
      `;
      params = [userId, lectureId];
    } else if (courseId) {
      query = `
        SELECT b.*, l.title as lecture_title, s.title as section_title
        FROM bookmarks b
        JOIN lectures l ON b.lecture_id = l.id
        JOIN sections s ON l.section_id = s.id
        WHERE b.user_id = ? AND s.course_id = ?
        ORDER BY s.sort_order, l.sort_order, b.timestamp_seconds ASC
      `;
      params = [userId, courseId];
    } else {
      query = `
        SELECT b.*, l.title as lecture_title, s.title as section_title, c.title as course_title, c.id as course_id
        FROM bookmarks b
        JOIN lectures l ON b.lecture_id = l.id
        JOIN sections s ON l.section_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
        LIMIT 100
      `;
      params = [userId];
    }

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: {
        bookmarks: result.results || [],
      },
    });
  } catch (error) {
    console.error('Failed to get bookmarks:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to get bookmarks' } }, 500);
  }
});

// Create a bookmark
notesRoutes.post('/bookmarks', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { lectureId, timestampSeconds, title } = body;

  if (!lectureId || timestampSeconds === undefined) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'lectureId and timestampSeconds are required' } }, 400);
  }

  try {
    const bookmarkId = `bm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO bookmarks (id, user_id, lecture_id, title, timestamp_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(bookmarkId, userId, lectureId, title || null, timestampSeconds, now).run();

    return c.json({
      success: true,
      data: {
        id: bookmarkId,
        userId,
        lectureId,
        title,
        timestampSeconds,
        createdAt: now,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return c.json({ success: false, error: { code: 'DUPLICATE', message: 'Bookmark already exists at this timestamp' } }, 409);
    }
    console.error('Failed to create bookmark:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to create bookmark' } }, 500);
  }
});

// Delete a bookmark
notesRoutes.delete('/bookmarks/:bookmarkId', async (c) => {
  const userId = c.get('userId');
  const bookmarkId = c.req.param('bookmarkId');

  try {
    // Check ownership
    const existing = await c.env.DB.prepare('SELECT * FROM bookmarks WHERE id = ?').bind(bookmarkId).first();
    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bookmark not found' } }, 404);
    }
    if (existing.user_id !== userId) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not own this bookmark' } }, 403);
    }

    await c.env.DB.prepare('DELETE FROM bookmarks WHERE id = ?').bind(bookmarkId).run();

    return c.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Failed to delete bookmark:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to delete bookmark' } }, 500);
  }
});

export { notesRoutes };
