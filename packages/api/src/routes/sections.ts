import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';

const sectionsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSectionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

const updateSectionSchema = createSectionSchema.partial();

// POST /courses/:courseId/sections - Create section
sectionsRoutes.post(
  '/',
  requireAuth,
  requireRole(['instructor', 'admin']),
  zValidator('json', createSectionSchema),
  async (c) => {
    const courseId = c.req.param('courseId');
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

      // Get max sort order
      const maxOrder = await db.prepare(`
        SELECT MAX(sort_order) as max_order FROM el_sections WHERE course_id = ?
      `).bind(courseId).first<{ max_order: number }>();

      const sectionId = crypto.randomUUID();
      const sortOrder = (maxOrder?.max_order || 0) + 1;

      await db.prepare(`
        INSERT INTO el_sections (id, course_id, title, description, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).bind(sectionId, courseId, input.title, input.description || null, sortOrder).run();

      return c.json({
        success: true,
        data: { id: sectionId, sortOrder },
        message: 'セクションが作成されました',
      }, 201);
    } catch (error) {
      console.error('Error creating section:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'セクションの作成に失敗しました' },
      }, 500);
    }
  }
);

// PUT /courses/:courseId/sections/:sectionId - Update section
sectionsRoutes.put(
  '/:sectionId',
  requireAuth,
  requireRole(['instructor', 'admin']),
  zValidator('json', updateSectionSchema),
  async (c) => {
    const courseId = c.req.param('courseId');
    const sectionId = c.req.param('sectionId');
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

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(sectionId, courseId);

        await db.prepare(`
          UPDATE el_sections SET ${updates.join(', ')} WHERE id = ? AND course_id = ?
        `).bind(...params).run();
      }

      return c.json({
        success: true,
        message: 'セクションが更新されました',
      });
    } catch (error) {
      console.error('Error updating section:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'セクションの更新に失敗しました' },
      }, 500);
    }
  }
);

// DELETE /courses/:courseId/sections/:sectionId - Delete section
sectionsRoutes.delete(
  '/:sectionId',
  requireAuth,
  requireRole(['instructor', 'admin']),
  async (c) => {
    const courseId = c.req.param('courseId');
    const sectionId = c.req.param('sectionId');
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

      // Delete lectures in this section first
      await db.prepare(`
        DELETE FROM el_lectures WHERE section_id = ?
      `).bind(sectionId).run();

      // Delete section
      await db.prepare(`
        DELETE FROM el_sections WHERE id = ? AND course_id = ?
      `).bind(sectionId, courseId).run();

      return c.json({
        success: true,
        message: 'セクションが削除されました',
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'セクションの削除に失敗しました' },
      }, 500);
    }
  }
);

export { sectionsRoutes };
