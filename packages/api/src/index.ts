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
