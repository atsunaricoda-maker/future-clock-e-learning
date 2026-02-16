"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, X, Video, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  ALLOWED_VIDEO_TYPES,
  ALLOWED_VIDEO_EXTENSIONS,
  validateVideoFile,
  formatFileSize,
  extractVideoStoragePath,
  isSupabaseVideoUrl,
  MAX_VIDEO_SIZE_BYTES,
} from "@/lib/video-utils";

interface VideoUploadProps {
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
}

export function VideoUpload({
  currentUrl,
  onUploadComplete,
  onRemove,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    currentUrl && isSupabaseVideoUrl(currentUrl) ? currentUrl : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      // バリデーション
      const validationError = validateVideoFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const supabase = createClient();

        // セッション取得
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          toast.error("認証が必要です。ログインし直してください。");
          return;
        }

        // ユニークなファイル名を生成
        const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
        const fileName = `${session.user.id}/${Date.now()}.${ext}`;

        // Supabase Storage REST APIに直接XHRでアップロード（プログレス取得のため）
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${fileName}`;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setProgress(pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));
          xhr.onabort = () => reject(new Error("Upload cancelled"));

          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
          xhr.setRequestHeader("x-upsert", "true");
          xhr.send(file);
        });

        // パブリックURL取得
        const { data: urlData } = supabase.storage
          .from("videos")
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;
        setUploadedUrl(publicUrl);
        onUploadComplete(publicUrl);
        toast.success("動画をアップロードしました");
      } catch (error) {
        if (error instanceof Error && error.message === "Upload cancelled") {
          toast.info("アップロードをキャンセルしました");
        } else {
          console.error("Video upload error:", error);
          toast.error("動画のアップロードに失敗しました");
        }
      } finally {
        setUploading(false);
        setProgress(0);
        xhrRef.current = null;
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onUploadComplete]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleCancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
  };

  const handleRemove = async () => {
    if (uploadedUrl) {
      // Storage から削除を試みる
      const path = extractVideoStoragePath(uploadedUrl);
      if (path) {
        try {
          const supabase = createClient();
          await supabase.storage.from("videos").remove([path]);
        } catch {
          // 削除失敗しても続行（URLクリアを優先）
        }
      }
    }
    setUploadedUrl(null);
    onRemove?.();
    onUploadComplete("");
  };

  // アップロード済み動画の表示
  if (uploadedUrl) {
    const fileName = uploadedUrl.split("/").pop() || "動画ファイル";
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">アップロード済み</p>
              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                {fileName}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <X className="mr-1 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>
    );
  }

  // アップロード中
  if (uploading) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium">アップロード中... {progress}%</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-destructive"
            >
              キャンセル
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    );
  }

  // ドラッグ&ドロップエリア
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_VIDEO_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelect}
      />

      <Video className="mb-3 h-10 w-10 text-muted-foreground/50" />

      <p className="mb-1 text-sm font-medium">
        ドラッグ&ドロップ または
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        ファイルを選択
      </Button>

      <p className="mt-2 text-xs text-muted-foreground">
        対応形式: {ALLOWED_VIDEO_EXTENSIONS} / 最大 {formatFileSize(MAX_VIDEO_SIZE_BYTES)}
      </p>
    </div>
  );
}
