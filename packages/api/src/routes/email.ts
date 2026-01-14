import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const emailRoutes = new Hono<{ Bindings: Env }>();

// パスワードリセット用トークン生成
const generateResetToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// パスワードリセットリクエスト
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

emailRoutes.post(
  '/forgot-password',
  zValidator('json', forgotPasswordSchema),
  async (c) => {
    const { email } = c.req.valid('json');

    try {
      // ユーザーを検索
      const user = await c.env.DB.prepare(
        'SELECT id, email FROM el_users WHERE email = ? AND status = ?'
      ).bind(email, 'active').first();

      // セキュリティ上、ユーザーが存在しなくても同じレスポンスを返す
      if (!user) {
        return c.json({
          success: true,
          message: 'パスワードリセットのメールを送信しました。メールをご確認ください。',
        });
      }

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1時間有効
      const token = generateResetToken();
      const tokenId = crypto.randomUUID();

      // 既存のトークンを無効化
      await c.env.DB.prepare(
        'UPDATE el_password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL'
      ).bind(now, (user as any).id).run();

      // 新しいトークンを保存
      await c.env.DB.prepare(`
        INSERT INTO el_password_reset_tokens (id, user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(tokenId, (user as any).id, token, expiresAt, now).run();

      // メール送信（本番環境ではMailChannelsやSendGrid等を使用）
      // ここではシミュレーションとしてログに出力
      const resetUrl = `https://elearning-platform.pages.dev/reset-password?token=${token}`;
      console.log(`Password reset email to ${email}: ${resetUrl}`);

      // 本番用メール送信（Cloudflare Workers対応）
      // Resend APIを使用する場合の例（API KEYが必要）
      /*
      if (c.env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@elearning-platform.com',
            to: email,
            subject: 'パスワードリセットのご案内',
            html: `
              <h2>パスワードリセットのご案内</h2>
              <p>以下のリンクをクリックして、新しいパスワードを設定してください。</p>
              <p><a href="${resetUrl}">パスワードをリセット</a></p>
              <p>このリンクは1時間後に無効になります。</p>
              <p>このメールに心当たりがない場合は、無視してください。</p>
            `,
          }),
        });
      }
      */

      return c.json({
        success: true,
        message: 'パスワードリセットのメールを送信しました。メールをご確認ください。',
        // 開発用：トークンを返す（本番では削除）
        ...(process.env.NODE_ENV === 'development' ? { debug: { token, resetUrl } } : {}),
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return c.json({
        success: false,
        error: { code: 'EMAIL_ERROR', message: 'メール送信に失敗しました。後でもう一度お試しください。' },
      }, 500);
    }
  }
);

// パスワードリセット実行
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

emailRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema),
  async (c) => {
    const { token, password } = c.req.valid('json');

    try {
      const now = new Date().toISOString();

      // トークンを検証
      const resetToken = await c.env.DB.prepare(`
        SELECT t.*, u.email
        FROM el_password_reset_tokens t
        JOIN el_users u ON t.user_id = u.id
        WHERE t.token = ? AND t.used_at IS NULL AND t.expires_at > ?
      `).bind(token, now).first();

      if (!resetToken) {
        return c.json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'リセットリンクが無効または期限切れです。もう一度お試しください。' },
        }, 400);
      }

      // パスワードをハッシュ化（簡易実装）
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // パスワードを更新
      await c.env.DB.prepare(
        'UPDATE el_users SET password_hash = ?, updated_at = ? WHERE id = ?'
      ).bind(passwordHash, now, (resetToken as any).user_id).run();

      // トークンを使用済みにする
      await c.env.DB.prepare(
        'UPDATE el_password_reset_tokens SET used_at = ? WHERE id = ?'
      ).bind(now, (resetToken as any).id).run();

      return c.json({
        success: true,
        message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return c.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' },
      }, 500);
    }
  }
);

// トークン検証（リセットページ表示用）
emailRoutes.get('/verify-reset-token', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'トークンが指定されていません' },
    }, 400);
  }

  try {
    const now = new Date().toISOString();

    const resetToken = await c.env.DB.prepare(`
      SELECT t.expires_at, u.email
      FROM el_password_reset_tokens t
      JOIN el_users u ON t.user_id = u.id
      WHERE t.token = ? AND t.used_at IS NULL AND t.expires_at > ?
    `).bind(token, now).first();

    if (!resetToken) {
      return c.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'リセットリンクが無効または期限切れです' },
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        email: (resetToken as any).email,
        expiresAt: (resetToken as any).expires_at,
      },
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    return c.json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' },
    }, 500);
  }
});

export { emailRoutes };
