import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types';

const videosRoutes = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    c.set('userId', payload.userId || payload.sub);
    c.set('userRole', payload.role);
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'トークンが無効です' } }, 401);
  }
};

// 講師認証ミドルウェア
const requireInstructor = async (c: any, next: any) => {
  const role = c.get('userRole');
  if (role !== 'instructor' && role !== 'admin' && role !== 'super_admin') {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: '講師権限が必要です' } }, 403);
  }
  await next();
};

// 動画アップロード用の署名付きURLを取得
videosRoutes.post('/upload-url', requireAuth, requireInstructor, async (c) => {
  const userId = c.get('userId');

  try {
    // Cloudflare Stream APIにアクセスしてアップロードURLを取得
    // 注: 本番環境ではCloudflare Stream APIを使用
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = c.env.CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      // モック応答（開発環境用）
      const uploadId = crypto.randomUUID();
      return c.json({
        success: true,
        data: {
          uploadId,
          uploadUrl: `https://upload.cloudflare.stream/${uploadId}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1時間後
        }
      });
    }

    // Cloudflare Stream Direct Upload URL API
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600, // 最大1時間
          allowedOrigins: ['*'],
          meta: {
            uploadedBy: userId,
          },
        }),
      }
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(result.errors?.[0]?.message || 'Stream API error');
    }

    return c.json({
      success: true,
      data: {
        uploadId: result.result.uid,
        uploadUrl: result.result.uploadURL,
        expiresAt: result.result.watermark?.created || new Date(Date.now() + 3600000).toISOString(),
      }
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return c.json({ success: false, error: { code: 'STREAM_ERROR', message: '動画アップロードURLの取得に失敗しました' } }, 500);
  }
});

// 動画のステータスを確認
videosRoutes.get('/status/:videoId', requireAuth, async (c) => {
  const { videoId } = c.req.param();

  try {
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = c.env.CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      // モック応答（開発環境用）
      return c.json({
        success: true,
        data: {
          videoId,
          status: 'ready',
          duration: 600, // 10分
          thumbnail: `https://cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`,
          playbackUrl: `https://cloudflarestream.com/${videoId}/manifest/video.m3u8`,
        }
      });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(result.errors?.[0]?.message || 'Stream API error');
    }

    const video = result.result;

    return c.json({
      success: true,
      data: {
        videoId: video.uid,
        status: video.status?.state || 'processing',
        duration: video.duration,
        thumbnail: video.thumbnail,
        playbackUrl: video.playback?.hls,
        dashUrl: video.playback?.dash,
        width: video.input?.width,
        height: video.input?.height,
      }
    });
  } catch (error) {
    console.error('Get video status error:', error);
    return c.json({ success: false, error: { code: 'STREAM_ERROR', message: '動画ステータスの取得に失敗しました' } }, 500);
  }
});

// 動画を講義に紐付け
const linkVideoSchema = z.object({
  courseId: z.string().min(1),
  sectionId: z.string().min(1),
  lectureId: z.string().min(1),
  streamVideoId: z.string().min(1),
  duration: z.number().optional(),
});

videosRoutes.post(
  '/link',
  requireAuth,
  requireInstructor,
  zValidator('json', linkVideoSchema),
  async (c) => {
    const userId = c.get('userId');
    const { courseId, sectionId, lectureId, streamVideoId, duration } = c.req.valid('json');

    try {
      // コースの所有者確認
      const course = await c.env.DB.prepare(
        'SELECT instructor_id FROM el_courses WHERE id = ? AND deleted_at IS NULL'
      ).bind(courseId).first();

      if (!course || (course as any).instructor_id !== userId) {
        return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'このコースを編集する権限がありません' } }, 403);
      }

      // 講義の存在確認
      const lecture = await c.env.DB.prepare(
        'SELECT id FROM el_lectures WHERE id = ? AND section_id = ?'
      ).bind(lectureId, sectionId).first();

      if (!lecture) {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: '講義が見つかりません' } }, 404);
      }

      const now = new Date().toISOString();
      const videoRecordId = crypto.randomUUID();

      // Cloudflare Streamから動画情報を取得
      const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
      const apiToken = c.env.CLOUDFLARE_STREAM_API_TOKEN;
      let videoDuration = duration || 0;
      let hlsUrl = '';
      let thumbnailUrl = '';

      if (accountId && apiToken) {
        try {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${streamVideoId}`,
            {
              headers: {
                'Authorization': `Bearer ${apiToken}`,
              },
            }
          );
          const result = await response.json() as any;
          if (result.success && result.result) {
            videoDuration = result.result.duration || videoDuration;
            hlsUrl = result.result.playback?.hls || '';
            thumbnailUrl = result.result.thumbnail || '';
          }
        } catch (e) {
          console.error('Failed to get video info:', e);
        }
      } else {
        // モック値（開発環境）
        hlsUrl = `https://cloudflarestream.com/${streamVideoId}/manifest/video.m3u8`;
        thumbnailUrl = `https://cloudflarestream.com/${streamVideoId}/thumbnails/thumbnail.jpg`;
        videoDuration = duration || 600;
      }

      // 既存のビデオレコードを確認
      const existingVideo = await c.env.DB.prepare(
        'SELECT id FROM el_videos WHERE lecture_id = ?'
      ).bind(lectureId).first();

      if (existingVideo) {
        // 更新
        await c.env.DB.prepare(`
          UPDATE el_videos 
          SET original_url = ?, hls_url = ?, thumbnail_url = ?, duration = ?, status = 'ready', updated_at = ?
          WHERE id = ?
        `).bind(streamVideoId, hlsUrl, thumbnailUrl, videoDuration, now, (existingVideo as any).id).run();
      } else {
        // 新規作成
        await c.env.DB.prepare(`
          INSERT INTO el_videos (id, lecture_id, original_url, hls_url, thumbnail_url, duration, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'ready', ?, ?)
        `).bind(videoRecordId, lectureId, streamVideoId, hlsUrl, thumbnailUrl, videoDuration, now, now).run();
      }

      // 講義の動画時間を更新
      await c.env.DB.prepare(`
        UPDATE el_lectures SET duration = ?, is_published = 1, updated_at = ? WHERE id = ?
      `).bind(videoDuration, now, lectureId).run();

      // コースの総動画時間を再計算
      await c.env.DB.prepare(`
        UPDATE el_courses SET 
          total_duration = (SELECT COALESCE(SUM(l.duration), 0) FROM el_lectures l 
            JOIN el_sections s ON l.section_id = s.id WHERE s.course_id = ?),
          updated_at = ?
        WHERE id = ?
      `).bind(courseId, now, courseId).run();

      return c.json({
        success: true,
        data: {
          videoId: existingVideo ? (existingVideo as any).id : videoRecordId,
          lectureId,
          streamVideoId,
          duration: videoDuration,
          hlsUrl,
          thumbnailUrl,
        }
      });
    } catch (error) {
      console.error('Link video error:', error);
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
    }
  }
);

// 動画再生URLを取得（署名付き）
videosRoutes.get('/playback/:lectureId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { lectureId } = c.req.param();

  try {
    // 講義と動画情報を取得
    const lecture = await c.env.DB.prepare(`
      SELECT l.id, l.is_free, l.section_id, s.course_id, v.hls_url, v.original_url, v.thumbnail_url, v.duration
      FROM el_lectures l
      JOIN el_sections s ON l.section_id = s.id
      LEFT JOIN el_videos v ON l.id = v.lecture_id
      WHERE l.id = ?
    `).bind(lectureId).first();

    if (!lecture) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: '講義が見つかりません' } }, 404);
    }

    // 無料でない場合、受講登録を確認
    if (!(lecture as any).is_free) {
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM el_enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, (lecture as any).course_id).first();

      if (!enrollment) {
        return c.json({ success: false, error: { code: 'NOT_ENROLLED', message: 'このコースに登録されていません' } }, 403);
      }
    }

    // 動画URLがない場合
    if (!(lecture as any).hls_url && !(lecture as any).original_url) {
      return c.json({ success: false, error: { code: 'NO_VIDEO', message: 'この講義には動画がありません' } }, 404);
    }

    // 署名付きURLを生成（本番環境ではCloudflare Streamの署名トークンを使用）
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = c.env.CLOUDFLARE_STREAM_API_TOKEN;
    const streamVideoId = (lecture as any).original_url;
    
    let signedUrl = (lecture as any).hls_url;

    if (accountId && apiToken && streamVideoId) {
      // Cloudflare Streamの署名付きURLを生成
      // 本番環境では署名キーを使用して署名付きURLを生成
      // signedUrl = await generateSignedUrl(streamVideoId, signingKey);
    }

    return c.json({
      success: true,
      data: {
        lectureId,
        playbackUrl: signedUrl,
        thumbnailUrl: (lecture as any).thumbnail_url,
        duration: (lecture as any).duration,
        isFree: !!(lecture as any).is_free,
      }
    });
  } catch (error) {
    console.error('Get playback URL error:', error);
    return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' } }, 500);
  }
});

export { videosRoutes };
