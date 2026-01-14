import type { Context, Next, MiddlewareHandler } from 'hono';
import type { Env, Variables, AuthUser } from '../types';
import { AppError } from './error-handler';

/**
 * シンプルなJWT検証
 * 本番環境ではより堅牢な実装に変更することを推奨
 */
async function verifyToken(token: string, secret: string): Promise<any> {
  // 開発用トークン
  if (token.startsWith('dev_')) {
    const userId = token.replace('dev_', '');
    return { sub: userId, userId, role: 'student' };
  }

  try {
    // JWTデコード
    const [headerB64, payloadB64, signature] = token.split('.');
    
    if (!headerB64 || !payloadB64 || !signature) {
      throw new Error('Invalid token format');
    }

    // Base64URLデコード
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    // 有効期限チェック
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    // 署名検証（HMAC-SHA256）
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signatureInput)
    );

    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
}

/**
 * JWTトークン生成
 */
export async function generateToken(
  payload: { userId: string; email: string; role: string },
  secret: string,
  expiresIn: number = 86400 // 24時間
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const tokenPayload = {
    ...payload,
    sub: payload.userId,
    iat: now,
    exp: now + expiresIn,
  };

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  const payloadB64 = btoa(JSON.stringify(tokenPayload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${headerB64}.${payloadB64}.${signature}`;
}

// 認証ミドルウェア
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
    const payload = await verifyToken(token, c.env.JWT_SECRET || 'dev-secret');
    const userId = payload.sub || payload.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'ユーザー情報が見つかりません', 401);
    }

    // DBでユーザー確認
    const user = await c.env.DB.prepare(
      'SELECT id, email, role, status FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();

    if (user && user.status !== 'active') {
      throw new AppError('FORBIDDEN', 'アカウントが無効です', 403);
    }

    c.set('user', {
      userId: user?.id as string || userId,
      email: user?.email as string || payload.email,
      role: user?.role as string || payload.role || 'student',
    });

    await next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Auth error:', error);
    throw new AppError('INVALID_TOKEN', '無効なトークンです', 401);
  }
}

// Required auth middleware wrapper
export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = 
  async (c, next) => {
    return authMiddleware(c, next);
  };

// Optional auth
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.set('user', null);
    await next();
    return;
  }

  return authMiddleware(c, next);
}

// Role-based access control
type UserRole = 'student' | 'instructor' | 'admin' | 'super_admin';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 1,
  instructor: 2,
  admin: 3,
  super_admin: 4,
};

export function requireRole(allowedRoles: UserRole[]): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      throw new AppError('UNAUTHORIZED', '認証が必要です', 401);
    }

    const userRole = user.role as UserRole;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
    
    const hasPermission = allowedRoles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role];
      return userRoleLevel >= requiredLevel;
    });

    if (!hasPermission) {
      throw new AppError('FORBIDDEN', 'この操作を行う権限がありません', 403);
    }

    await next();
  };
}

// Convenience middleware
export const instructorOnly = requireRole(['instructor', 'admin', 'super_admin']);
export const adminOnly = requireRole(['admin', 'super_admin']);
export const superAdminOnly = requireRole(['super_admin']);
