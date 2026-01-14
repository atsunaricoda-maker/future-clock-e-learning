import { Hono } from 'hono';
import type { Env, Variables } from '../types';

export const healthRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

healthRoutes.get('/', async (c) => {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check D1 Database
  try {
    const start = Date.now();
    await c.env.DB.prepare('SELECT 1').first();
    checks.database = {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.database = { status: 'unhealthy' };
  }

  // Check R2 Video Bucket
  try {
    const start = Date.now();
    await c.env.VIDEO_BUCKET.head('_health');
    checks.videoBucket = {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error: any) {
    // NoSuchKey is expected, bucket is still accessible
    if (error.message?.includes('NoSuchKey') || error.name === 'R2Error') {
      checks.videoBucket = { status: 'healthy' };
    } else {
      checks.videoBucket = { status: 'unhealthy' };
    }
  }

  // Check KV Cache
  try {
    const start = Date.now();
    await c.env.CACHE.get('_health');
    checks.cache = {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.cache = { status: 'unhealthy' };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT,
      checks,
    },
    allHealthy ? 200 : 503
  );
});

healthRoutes.get('/ready', (c) => {
  return c.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

healthRoutes.get('/live', (c) => {
  return c.json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
});
