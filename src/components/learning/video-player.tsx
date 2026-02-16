"use client";

import { useMemo } from "react";
import { isSupabaseVideoUrl, isDirectVideoUrl } from "@/lib/video-utils";

interface VideoPlayerProps {
  url: string;
  title: string;
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
  // Supabase Storage URL → <video> タグで直接再生
  if (isSupabaseVideoUrl(url)) return "direct";
  // 拡張子ベースで直接再生可能
  if (isDirectVideoUrl(url)) return "direct";
  // YouTube/Vimeo等の embed URL
  if (getEmbedUrl(url)) return "embed";
  return "unknown";
}

export function VideoPlayer({ url, title }: VideoPlayerProps) {
  const videoType = useMemo(() => getVideoType(url), [url]);
  const embedUrl = useMemo(() => getEmbedUrl(url), [url]);

  // Supabase Storage / 直接動画URL → <video> タグ
  if (videoType === "direct") {
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

  // YouTube/Vimeo等 → iframe
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

  // フォールバック: 認識できないURL
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
