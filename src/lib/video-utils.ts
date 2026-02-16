/**
 * 動画関連ユーティリティ
 */

// 許可する動画MIME types
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",  // .mov
  "video/x-msvideo",  // .avi
] as const;

// 許可する拡張子（表示用）
export const ALLOWED_VIDEO_EXTENSIONS = ".mp4, .webm, .mov, .avi";

// 最大ファイルサイズ: 100MB
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

// Supabase Storage の URL パターン
const SUPABASE_STORAGE_PATTERN = /supabase\.co\/storage\/v1\/object\/public\/videos\//;

// 直接再生可能な動画ファイル拡張子パターン
const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|mov|avi|ogg)(\?.*)?$/i;

/**
 * Supabase Storage の動画URLかどうか判定
 */
export function isSupabaseVideoUrl(url: string): boolean {
  return SUPABASE_STORAGE_PATTERN.test(url);
}

/**
 * 拡張子ベースで直接再生可能な動画URLかどうか判定
 */
export function isDirectVideoUrl(url: string): boolean {
  return DIRECT_VIDEO_PATTERN.test(url);
}

/**
 * Supabase Storage URLからストレージパスを抽出
 * 例: https://xxx.supabase.co/storage/v1/object/public/videos/admin-id/1234.mp4
 *   → admin-id/1234.mp4
 */
export function extractVideoStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/videos\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * ファイルサイズを人間が読みやすい形式にフォーマット
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * 動画ファイルのバリデーション
 */
export function validateVideoFile(file: File): string | null {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type as typeof ALLOWED_VIDEO_TYPES[number])) {
    return `許可されていないファイル形式です。対応形式: ${ALLOWED_VIDEO_EXTENSIONS}`;
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return `ファイルサイズが大きすぎます。最大 ${formatFileSize(MAX_VIDEO_SIZE_BYTES)} まで`;
  }
  return null;
}
