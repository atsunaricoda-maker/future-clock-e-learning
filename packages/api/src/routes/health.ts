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

  // Check R2 Video Bucket (optional)
  if (c.env.VIDEO_BUCKET) {
    try {
      const start = Date.now();
      await c.env.VIDEO_BUCKET.head('_health');
      checks.videoBucket = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error: any) {
      if (error.message?.includes('NoSuchKey') || error.name === 'R2Error') {
        checks.videoBucket = { status: 'healthy' };
      } else {
        checks.videoBucket = { status: 'unhealthy' };
      }
    }
  }

  // Check KV Cache (optional)
  if (c.env.CACHE) {
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

// Demo account setup endpoint (temporary - for initial setup)
healthRoutes.post('/setup-demo', async (c) => {
  const setupKey = c.req.header('X-Setup-Key');
  
  if (setupKey !== 'demo-setup-2024') {
    return c.json({ success: false, error: 'Invalid setup key' }, 403);
  }

  try {
    const now = new Date().toISOString();

    // Update instructor role
    await c.env.DB.prepare(
      "UPDATE el_users SET role = 'instructor', updated_at = ? WHERE email = 'instructor@demo.example.com'"
    ).bind(now).run();

    // Create instructor profile if not exists
    const instructorUser = await c.env.DB.prepare(
      "SELECT id FROM el_users WHERE email = 'instructor@demo.example.com'"
    ).first();
    
    if (instructorUser) {
      const existingProfile = await c.env.DB.prepare(
        'SELECT id FROM el_instructor_profiles WHERE user_id = ?'
      ).bind((instructorUser as any).id).first();

      if (!existingProfile) {
        await c.env.DB.prepare(
          `INSERT INTO el_instructor_profiles (id, user_id, headline, expertise, commission_rate, created_at, updated_at)
           VALUES (?, ?, ?, ?, 30, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          (instructorUser as any).id,
          'シニアソフトウェアエンジニア & 技術講師',
          '["Python", "JavaScript", "機械学習", "Web開発"]',
          now,
          now
        ).run();
      }
    }

    // Update admin role
    await c.env.DB.prepare(
      "UPDATE el_users SET role = 'admin', updated_at = ? WHERE email = 'admin@demo.example.com'"
    ).bind(now).run();

    return c.json({
      success: true,
      message: 'Demo accounts configured',
      accounts: [
        { email: 'student@demo.example.com', role: 'student' },
        { email: 'instructor@demo.example.com', role: 'instructor' },
        { email: 'admin@demo.example.com', role: 'admin' },
      ]
    });
  } catch (error) {
    console.error('Setup demo error:', error);
    return c.json({ success: false, error: 'Database error' }, 500);
  }
});
