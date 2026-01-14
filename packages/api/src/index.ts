import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import type { Env, Variables } from './types';
import { errorHandler } from './middleware/error-handler';

// Import routes
import { authRoutes } from './routes/auth';
import { usersRoutes } from './routes/users';
import { coursesRoutes } from './routes/courses';
import { categoriesRoutes } from './routes/categories';
import { healthRoutes } from './routes/health';
import { sectionsRoutes } from './routes/sections';
import { lecturesRoutes } from './routes/lectures';
import { progressRoutes } from './routes/progress';
import { paymentsRoutes } from './routes/payments';
import { certificatesRoutes } from './routes/certificates';
import { learningTimeRoutes } from './routes/learning-time';
import { adminRoutes } from './routes/admin';
import { videosRoutes } from './routes/videos';
import { instructorRoutes } from './routes/instructor';
import { reviewsRoutes } from './routes/reviews';
import { notificationsRoutes } from './routes/notifications';
import { couponsRoutes } from './routes/coupons';
import { questionsRoutes } from './routes/questions';
import { wishlistRoutes } from './routes/wishlist';
import { emailRoutes } from './routes/email';
import { notesRoutes } from './routes/notes';

// Create Hono app with typed environment
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow localhost during development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
      }
      // Allow Cloudflare Pages domains
      if (origin.includes('elearning-platform.pages.dev')) {
        return origin;
      }
      // Allow production domains
      if (origin.includes('elearning.') || origin.includes('futureclock.')) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  })
);

// Global error handler
app.onError(errorHandler);

// API version prefix
const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Mount routes
api.route('/health', healthRoutes);
api.route('/auth', authRoutes);
api.route('/users', usersRoutes);
api.route('/courses', coursesRoutes);
api.route('/categories', categoriesRoutes);

// Nested routes for course content
api.route('/courses/:courseId/sections', sectionsRoutes);
api.route('/courses/:courseId/sections/:sectionId/lectures', lecturesRoutes);

// Progress routes
api.route('/progress', progressRoutes);

// Payment routes
api.route('/payments', paymentsRoutes);

// Certificate routes
api.route('/certificates', certificatesRoutes);

// Learning time routes (助成金対応)
api.route('/learning-time', learningTimeRoutes);

// Admin routes
api.route('/admin', adminRoutes);

// Instructor routes
api.route('/instructor', instructorRoutes);

// Video routes (Cloudflare Stream)
api.route('/videos', videosRoutes);

// Reviews routes
api.route('/reviews', reviewsRoutes);

// Notifications routes
api.route('/notifications', notificationsRoutes);

// Coupons routes
api.route('/coupons', couponsRoutes);

// Questions routes (Q&A)
api.route('/questions', questionsRoutes);

// Wishlist routes
api.route('/wishlist', wishlistRoutes);

// Email routes (password reset, etc.)
api.route('/email', emailRoutes);

// Notes & Bookmarks routes
api.route('/notes', notesRoutes);

// Mount API under /v1
app.route('/v1', api);

// Root redirect
app.get('/', (c) => {
  return c.json({
    name: 'e-Learning API',
    version: '1.0.0',
    documentation: '/v1/docs',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    },
    404
  );
});

export default app;
