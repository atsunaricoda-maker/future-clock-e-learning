import type { D1Database, R2Bucket, KVNamespace, Queue } from '@cloudflare/workers-types';

// Cloudflare Workers Environment Bindings
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Buckets
  VIDEO_BUCKET: R2Bucket;
  ATTACHMENT_BUCKET: R2Bucket;
  
  // KV Namespace
  CACHE: KVNamespace;
  
  // Queue
  VIDEO_QUEUE: Queue;
  
  // Environment variables
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // JWT secrets
  JWT_SECRET: string;
  VIDEO_TOKEN_SECRET: string;
}

// Extended Hono context variables
export interface Variables {
  userId: string | null;
  clerkId: string | null;
  role: string | null;
  organizationId: string | null;
  organizationRole: string | null;
}
