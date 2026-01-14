import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';

const lecturesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createLectureSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  contentType: z.enum(['video', 'quiz', 'document']).default('video'),
  isFree: z.boolean().default(false),
});

const updateLectureSchema = createLectureSchema.partial();

// POST /courses/:courseId/sections/:sectionId/lectures - Create lecture
lecturesRoutes.post(
  '/',
  requireAuth,
  requireRole(['instructor', 'admin']),
  zValidator('json', createLectureSchema),
  async (c) => {
    const courseId = c.req.param('courseId');
    const sectionId = c.req.param('sectionId');
    const user = c.get('user');
    const input = c.req.valid('json');
    const db = c.env.DB;

    try {
      // Verify course ownership
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(courseId).first<{ instructor_id: string }>();

      if (!course) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'コースが見つかりません' },
        }, 404);
      }

      if (course.instructor_id !== user!.userId && user!.role !== 'admin') {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      // Verify section exists
      const section = await db.prepare(`
        SELECT id FROM el_sections WHERE id = ? AND course_id = ?
      `).bind(sectionId, courseId).first();

      if (!section) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'セクションが見つかりません' },
        }, 404);
      }

      // Get max sort order
      const maxOrder = await db.prepare(`
        SELECT MAX(sort_order) as max_order FROM el_lectures WHERE section_id = ?
      `).bind(sectionId).first<{ max_order: number }>();

      const lectureId = crypto.randomUUID();
      const sortOrder = (maxOrder?.max_order || 0) + 1;

      await db.prepare(`
        INSERT INTO el_lectures (id, section_id, title, description, content_type, is_free, is_published, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).bind(
        lectureId, 
        sectionId, 
        input.title, 
        input.description || null, 
        input.contentType,
        input.isFree ? 1 : 0,
        sortOrder
      ).run();

      // Update course total lectures count
      await db.prepare(`
        UPDATE el_courses SET 
          total_lectures = (SELECT COUNT(*) FROM el_lectures l 
            JOIN el_sections s ON l.section_id = s.id 
            WHERE s.course_id = ?),
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(courseId, courseId).run();

      return c.json({
        success: true,
        data: { id: lectureId, sortOrder },
        message: 'レッスンが作成されました',
      }, 201);
    } catch (error) {
      console.error('Error creating lecture:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'レッスンの作成に失敗しました' },
      }, 500);
    }
  }
);

// PUT /courses/:courseId/sections/:sectionId/lectures/:lectureId - Update lecture
lecturesRoutes.put(
  '/:lectureId',
  requireAuth,
  requireRole(['instructor', 'admin']),
  zValidator('json', updateLectureSchema),
  async (c) => {
    const courseId = c.req.param('courseId');
    const sectionId = c.req.param('sectionId');
    const lectureId = c.req.param('lectureId');
    const user = c.get('user');
    const input = c.req.valid('json');
    const db = c.env.DB;

    try {
      // Verify ownership
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(courseId).first<{ instructor_id: string }>();

      if (!course || (course.instructor_id !== user!.userId && user!.role !== 'admin')) {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
      if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
      if (input.contentType !== undefined) { updates.push('content_type = ?'); params.push(input.contentType); }
      if (input.isFree !== undefined) { updates.push('is_free = ?'); params.push(input.isFree ? 1 : 0); }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(lectureId, sectionId);

        await db.prepare(`
          UPDATE el_lectures SET ${updates.join(', ')} WHERE id = ? AND section_id = ?
        `).bind(...params).run();
      }

      return c.json({
        success: true,
        message: 'レッスンが更新されました',
      });
    } catch (error) {
      console.error('Error updating lecture:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'レッスンの更新に失敗しました' },
      }, 500);
    }
  }
);

// DELETE /courses/:courseId/sections/:sectionId/lectures/:lectureId - Delete lecture
lecturesRoutes.delete(
  '/:lectureId',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const courseId = c.req.param('courseId');
    const sectionId = c.req.param('sectionId');
    const lectureId = c.req.param('lectureId');
    const user = c.get('user');
    const db = c.env.DB;

    try {
      // Verify ownership
      const course = await db.prepare(`
        SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL
      `).bind(courseId).first<{ instructor_id: string }>();

      if (!course || (course.instructor_id !== user!.userId && user!.role !== 'admin')) {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: '権限がありません' },
        }, 403);
      }

      // Delete lecture
      await db.prepare(`
        DELETE FROM el_lectures WHERE id = ? AND section_id = ?
      `).bind(lectureId, sectionId).run();

      // Update course total lectures count
      await db.prepare(`
        UPDATE el_courses SET 
          total_lectures = (SELECT COUNT(*) FROM el_lectures l 
            JOIN el_sections s ON l.section_id = s.id 
            WHERE s.course_id = ?),
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(courseId, courseId).run();

      return c.json({
        success: true,
        message: 'レッスンが削除されました',
      });
    } catch (error) {
      console.error('Error deleting lecture:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'レッスンの削除に失敗しました' },
      }, 500);
    }
  }
);

export { lecturesRoutes };
