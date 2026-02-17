"use client";

import { useMemo } from "react";
import { isSupabaseVideoUrl, isDirectVideoUrl } from "@/lib/video-utils";
import { ControlledVideoPlayer } from "@/components/learning/controlled-video-player";

interface VideoPlayerProps {
  url: string;
  title: string;
  /** シーク制限を有効化（学習ページでtrue） */
  restrictSeek?: boolean;
  /** 視聴率（0-100）の変更時コールバック */
  onProgressUpdate?: (percent: number) => void;
  /** 再生位置変更時コールバック（30秒ごと） */
  onPositionChange?: (currentSeconds: number, maxWatchedSeconds: number) => void;
  /** 前回の再生位置（秒） */
  initialPosition?: number;
  /** 前回の最大視聴到達位置（秒） */
  initialMaxWatched?: number;
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Direct embed URL (already an embed URL)
  if (url.includes("embed") || url.includes("player")) {
    return url;
  }

  return null;
}

/**
 * 動画の種類を判定
 */
function getVideoType(url: string): "direct" | "embed" | "unknown" {
  if (isSupabaseVideoUrl(url)) return "direct";
  if (isDirectVideoUrl(url)) return "direct";
  if (getEmbedUrl(url)) return "embed";
  return "unknown";
}

export function VideoPlayer({
  url,
  title,
  restrictSeek = false,
  onProgressUpdate,
  onPositionChange,
  initialPosition,
  initialMaxWatched,
}: VideoPlayerProps) {
  const videoType = useMemo(() => getVideoType(url), [url]);
  const embedUrl = useMemo(() => getEmbedUrl(url), [url]);

  // Supabase Storage / 直接動画URL
  if (videoType === "direct") {
    // シーク制限モード → カスタムプレイヤー
    if (restrictSeek) {
      return (
        <ControlledVideoPlayer
          src={url}
          title={title}
          initialPosition={initialPosition}
          initialMaxWatched={initialMaxWatched}
          onProgressUpdate={onProgressUpdate}
          onPositionChange={onPositionChange}
        />
      );
    }

    // 通常モード → ブラウザ標準コントロール
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video
          src={url}
          title={title}
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          className="h-full w-full"
        >
          お使いのブラウザは動画タグに対応していません。
        </video>
      </div>
    );
  }

  // YouTube/Vimeo等 → iframe（制限なし）
  if (videoType === "embed" && embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // フォールバック
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          動画URLを認識できませんでした
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-primary underline"
        >
          外部で開く
        </a>
      </div>
    </div>
  );
}
