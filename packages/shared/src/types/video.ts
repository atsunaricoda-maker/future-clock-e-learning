// Video types for upload and streaming
export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error';
export type VideoResolution = '480p' | '720p' | '1080p';

export interface Video {
  id: string;
  lectureId: string | null;
  instructorId: string;
  originalFilename: string;
  r2Key: string;
  hlsKey: string | null;
  duration: number | null;
  sizeBytes: number;
  resolution: VideoResolution | null;
  status: VideoStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  lectureId: string;
  filename: string;
  r2Key: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
}

// Upload operations
export interface UploadUrlRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  videoId: string;
  r2Key: string;
  expiresAt: string;
}

export interface MultipartUploadInitResponse {
  uploadId: string;
  videoId: string;
  r2Key: string;
}

export interface MultipartUploadPartUrl {
  partNumber: number;
  uploadUrl: string;
}

export interface CompleteMultipartUploadInput {
  uploadId: string;
  parts: {
    partNumber: number;
    etag: string;
  }[];
}

// Video playback
export interface VideoTokenRequest {
  lectureId: string;
}

export interface VideoTokenResponse {
  token: string;
  playlistUrl: string;
  expiresAt: string;
}

// Processing status
export interface VideoProcessingStatus {
  videoId: string;
  status: VideoStatus;
  progress: number; // 0-100
  resolutions: VideoResolution[];
  errorMessage: string | null;
}
