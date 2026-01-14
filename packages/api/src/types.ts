import type { D1Database, R2Bucket, KVNamespace, Queue } from '@cloudflare/workers-types';

// Cloudflare Workers Environment Bindings
export interface Env {
  // D1 Database (required)
  DB: D1Database;
  
  // R2 Buckets (optional - Phase 3)
  VIDEO_BUCKET?: R2Bucket;
  ATTACHMENT_BUCKET?: R2Bucket;
  
  // KV Namespace (optional)
  CACHE?: KVNamespace;
  
  // Queue (optional - Phase 3)
  VIDEO_QUEUE?: Queue;
  
  // Environment variables
  ENVIRONMENT: string;
  JWT_SECRET: string;
  
  // Optional secrets
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

// User info from authentication
export interface AuthUser {
  userId: string;
  email?: string;
  role: string;
  organizationId?: string;
  organizationRole?: string;
}

// Extended Hono context variables
export interface Variables {
  user: AuthUser | null;
}
