import type { Context, Next } from 'hono';
import { createClerkClient } from '@clerk/backend';
import type { Env, Variables } from '../types';
import { AppError } from './error-handler';

// JWT verification middleware
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', '認証が必要です', 401);
  }

  const token = authHeader.substring(7);

  try {
    const clerk = createClerkClient({
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    const { payload } = await clerk.verifyToken(token);

    // Get user metadata from token
    const metadata = (payload as any).metadata;

    if (!metadata?.userId) {
      throw new AppError('UNAUTHORIZED', 'ユーザー情報が見つかりません', 401);
    }

    // Verify user is active in database
    const user = await c.env.DB.prepare(
      'SELECT id, role, status FROM users WHERE id = ? AND status = ?'
    )
      .bind(metadata.userId, 'active')
      .first();

    if (!user) {
      throw new AppError('UNAUTHORIZED', 'ユーザーが見つからないか無効です', 401);
    }

    // Set context variables
    c.set('userId', metadata.userId);
    c.set('clerkId', payload.sub);
    c.set('role', user.role as string);
    c.set('organizationId', metadata.organizationId || null);
    c.set('organizationRole', metadata.organizationRole || null);

    await next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Auth error:', error);
    throw new AppError('INVALID_TOKEN', '無効なトークンです', 401);
  }
}

// Optional auth - doesn't throw if not authenticated
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.set('userId', null);
    c.set('clerkId', null);
    c.set('role', null);
    c.set('organizationId', null);
    c.set('organizationRole', null);
    await next();
    return;
  }

  // If auth header exists, validate it
  return authMiddleware(c, next);
}

// Role-based access control
type UserRole = 'learner' | 'instructor' | 'admin' | 'super_admin';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  learner: 1,
  instructor: 2,
  admin: 3,
  super_admin: 4,
};

export function requireRole(minimumRole: UserRole) {
  return async (
    c: Context<{ Bindings: Env; Variables: Variables }>,
    next: Next
  ) => {
    const role = c.get('role') as UserRole | null;

    if (!role) {
      throw new AppError('UNAUTHORIZED', '認証が必要です', 401);
    }

    if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimumRole]) {
      throw new AppError('FORBIDDEN', 'この操作を行う権限がありません', 403);
    }

    await next();
  };
}

// Convenience middleware
export const instructorOnly = requireRole('instructor');
export const adminOnly = requireRole('admin');
export const superAdminOnly = requireRole('super_admin');
