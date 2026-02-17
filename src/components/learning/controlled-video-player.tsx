"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type MouseEvent,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ControlledVideoPlayerProps {
  src: string;
  title: string;
  initialPosition?: number;
  initialMaxWatched?: number;
  onProgressUpdate?: (percent: number) => void;
  onPositionChange?: (currentSeconds: number, maxWatchedSeconds: number) => void;
}

/**
 * 時間（秒）を mm:ss 形式にフォーマット
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * シーク制限付きカスタム動画プレイヤー
 *
 * - ブラウザ標準コントロールを非表示
 * - 未視聴位置へのスキップを禁止
 * - 再生速度を1xに固定
 * - 視聴率を親コンポーネントに通知
 */
export function ControlledVideoPlayer({
  src,
  title,
  initialPosition = 0,
  initialMaxWatched = 0,
  onProgressUpdate,
  onPositionChange,
}: ControlledVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // 再生状態
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // シーク制限
  const maxWatchedRef = useRef(initialMaxWatched);
  const [maxWatched, setMaxWatched] = useState(initialMaxWatched);

  // コントロール自動非表示タイマー
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期位置設定
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      if (initialPosition > 0 && video.duration > 0) {
        video.currentTime = Math.min(initialPosition, video.duration);
      }
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    return () => video.removeEventListener("loadedmetadata", handleLoaded);
  }, [initialPosition]);

  // 再生速度を1xに固定
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const enforceSpeed = () => {
      if (video.playbackRate !== 1) {
        video.playbackRate = 1;
      }
    };

    video.addEventListener("ratechange", enforceSpeed);
    return () => video.removeEventListener("ratechange", enforceSpeed);
  }, []);

  // timeupdate で現在位置と最大視聴位置を追跡
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const ct = video.currentTime;
      setCurrentTime(ct);

      // maxWatched を更新
      if (ct > maxWatchedRef.current) {
        maxWatchedRef.current = ct;
        setMaxWatched(ct);
      }

      // 視聴率を通知
      if (video.duration > 0) {
        const percent = Math.round(
          (maxWatchedRef.current / video.duration) * 100
        );
        onProgressUpdate?.(Math.min(percent, 100));
      }
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      // 最後まで到達
      if (video.duration > 0) {
        maxWatchedRef.current = video.duration;
        setMaxWatched(video.duration);
        onProgressUpdate?.(100);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onProgressUpdate]);

  // シーク制限: seekingイベントで未視聴位置への移動を阻止
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleSeeking = () => {
      if (video.currentTime > maxWatchedRef.current + 1) {
        video.currentTime = maxWatchedRef.current;
      }
    };

    video.addEventListener("seeking", handleSeeking);
    return () => video.removeEventListener("seeking", handleSeeking);
  }, []);

  // 定期的に位置を親に通知（30秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      onPositionChange?.(video.currentTime, maxWatchedRef.current);
    }, 30000);

    return () => clearInterval(interval);
  }, [onPositionChange]);

  // フルスクリーン変更イベント
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // コントロール自動非表示
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // 再生/一時停止トグル
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    resetHideTimer();
  }, [resetHideTimer]);

  // ミュートトグル
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // 音量変更
  const handleVolumeChange = useCallback((values: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const v = values[0];
    video.volume = v;
    setVolume(v);
    if (v > 0 && video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  }, []);

  // プログレスバークリックでシーク（制限付き）
  const handleProgressClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      const bar = progressBarRef.current;
      if (!video || !bar || duration <= 0) return;

      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetTime = ratio * duration;

      // 未視聴位置より先にはシーク不可
      if (targetTime > maxWatchedRef.current + 1) {
        video.currentTime = maxWatchedRef.current;
      } else {
        video.currentTime = targetTime;
      }
      setCurrentTime(video.currentTime);
      resetHideTimer();
    },
    [duration, resetHideTimer]
  );

  // フルスクリーン切替
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }
  }, []);

  // プログレスバーの計算
  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const watchedPercent = duration > 0 ? (maxWatched / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-black"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) {
          setShowControls(false);
        }
      }}
    >
      {/* ビデオ要素 - 標準コントロール非表示 */}
      <video
        ref={videoRef}
        src={src}
        title={title}
        playsInline
        preload="metadata"
        className="h-full w-full cursor-pointer"
        onClick={togglePlay}
      >
        お使いのブラウザは動画タグに対応していません。
      </video>

      {/* 中央の再生/一時停止オーバーレイ */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          aria-label="再生"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-110">
            <Play className="ml-1 h-8 w-8 text-black" fill="currentColor" />
          </div>
        </button>
      )}

      {/* コントロールバー */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* プログレスバー */}
        <div
          ref={progressBarRef}
          className="group/progress relative mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/30 transition-all hover:h-2.5"
          onClick={handleProgressClick}
        >
          {/* 視聴済み範囲（薄い緑）- クリック可能な範囲を示す */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{ width: `${watchedPercent}%` }}
          />
          {/* 再生位置（メインカラー） */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${playedPercent}%` }}
          />
          {/* シーク可能範囲の境界マーカー */}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow opacity-0 transition-opacity group-hover/progress:opacity-100"
            style={{ left: `calc(${playedPercent}% - 6px)` }}
          />
        </div>

        {/* コントロールボタン群 */}
        <div className="flex items-center gap-3">
          {/* 再生/一時停止 */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-primary transition-colors"
            aria-label={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5" fill="currentColor" />
            )}
          </button>

          {/* 時間表示 */}
          <span className="text-xs text-white/90 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* 音量 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="text-white hover:text-primary transition-colors"
              aria-label={isMuted ? "ミュート解除" : "ミュート"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <div className="w-20 hidden sm:block">
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
                className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
              />
            </div>
          </div>

          {/* フルスクリーン */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-primary transition-colors"
            aria-label={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
