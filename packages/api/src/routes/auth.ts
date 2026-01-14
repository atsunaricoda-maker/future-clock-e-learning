import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types';
import { AppError } from '../middleware/error-handler';
import { generateToken, requireAuth } from '../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
  name: z.string().min(1, '名前を入力してください'),
});

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

/**
 * パスワードハッシュ化
 */
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );
  
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

/**
 * パスワード検証
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, expectedHashHex] = storedHash.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );
  
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHashHex;
}

// POST /auth/register - ユーザー登録
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');
  
  // メール重複チェック
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (existingUser) {
    throw new AppError('CONFLICT', 'このメールアドレスは既に登録されています', 409);
  }
  
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  
  // ユーザー作成
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at)
     VALUES (?, ?, ?, 'student', 'active', datetime('now'), datetime('now'))`
  ).bind(userId, email, passwordHash).run();
  
  // プロフィール作成
  await c.env.DB.prepare(
    `INSERT INTO user_profiles (id, user_id, display_name, created_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(profileId, userId, name).run();
  
  // トークン生成
  const token = await generateToken(
    { userId, email, role: 'student' },
    c.env.JWT_SECRET || 'dev-secret'
  );
  
  return c.json({
    success: true,
    data: {
      user: {
        id: userId,
        email,
        name,
        role: 'student',
      },
      token,
    },
    message: 'アカウントが作成されました',
  }, 201);
});

// POST /auth/login - ログイン
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  
  // ユーザー検索
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.password_hash, u.role, u.status, up.display_name
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     WHERE u.email = ?`
  ).bind(email).first();
  
  if (!user) {
    throw new AppError('UNAUTHORIZED', 'メールアドレスまたはパスワードが正しくありません', 401);
  }
  
  if (user.status !== 'active') {
    throw new AppError('FORBIDDEN', 'アカウントが無効です', 403);
  }
  
  // パスワード検証
  const isValid = await verifyPassword(password, user.password_hash as string);
  if (!isValid) {
    throw new AppError('UNAUTHORIZED', 'メールアドレスまたはパスワードが正しくありません', 401);
  }
  
  // トークン生成
  const token = await generateToken(
    { userId: user.id as string, email: user.email as string, role: user.role as string },
    c.env.JWT_SECRET || 'dev-secret'
  );
  
  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
        role: user.role,
      },
      token,
    },
  });
});

// GET /auth/me - 現在のユーザー情報
authRoutes.get('/me', requireAuth, async (c) => {
  const authUser = c.get('user');
  
  if (!authUser) {
    throw new AppError('UNAUTHORIZED', '認証が必要です', 401);
  }

  const user = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.role, u.status, 
           up.first_name, up.last_name, up.display_name, up.avatar_url, up.bio
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE u.id = ?
  `).bind(authUser.userId).first();

  if (!user) {
    throw new AppError('NOT_FOUND', 'ユーザーが見つかりません', 404);
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: {
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
      },
    },
  });
});

// POST /auth/logout - ログアウト（クライアント側でトークン削除）
authRoutes.post('/logout', async (c) => {
  return c.json({
    success: true,
    message: 'ログアウトしました',
  });
});
