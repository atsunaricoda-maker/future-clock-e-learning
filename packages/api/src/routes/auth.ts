import { Hono } from 'hono';
import { Webhook } from 'svix';
import type { Env, Variables } from '../types';
import { AppError } from '../middleware/error-handler';

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Clerk Webhook handler
authRoutes.post('/webhooks/clerk', async (c) => {
  const WEBHOOK_SECRET = c.env.CLERK_WEBHOOK_SECRET;

  // Get Svix headers
  const svixId = c.req.header('svix-id');
  const svixTimestamp = c.req.header('svix-timestamp');
  const svixSignature = c.req.header('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError('INVALID_INPUT', 'Missing svix headers', 400);
  }

  const body = await c.req.text();

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: any;

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    throw new AppError('INVALID_INPUT', 'Invalid webhook signature', 400);
  }

  // Handle different event types
  switch (event.type) {
    case 'user.created':
      await handleUserCreated(c.env.DB, event.data);
      break;
    case 'user.updated':
      await handleUserUpdated(c.env.DB, event.data);
      break;
    case 'user.deleted':
      await handleUserDeleted(c.env.DB, event.data);
      break;
    case 'session.created':
      await handleSessionCreated(c.env.DB, event.data);
      break;
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  return c.json({ received: true });
});

// User created handler
async function handleUserCreated(db: D1Database, data: any) {
  const userId = crypto.randomUUID();
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address || '';
  const firstName = data.first_name || '';
  const lastName = data.last_name || '';
  const name = `${lastName} ${firstName}`.trim() || email.split('@')[0];
  const avatarUrl = data.image_url || null;

  // Insert user
  await db
    .prepare(
      `INSERT INTO users (id, email, name, avatar_url, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'learner', 'active', datetime('now'), datetime('now'))`
    )
    .bind(userId, email, name, avatarUrl)
    .run();

  // Create user profile
  await db
    .prepare(
      `INSERT INTO user_profiles (id, user_id, created_at, updated_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`
    )
    .bind(crypto.randomUUID(), userId)
    .run();

  // Store Clerk ID mapping (in a separate table or as metadata)
  await db
    .prepare(
      `INSERT INTO clerk_users (clerk_id, user_id, created_at)
       VALUES (?, ?, datetime('now'))`
    )
    .bind(clerkId, userId)
    .run();

  // Update Clerk metadata with internal user ID
  // This would be done via Clerk API - handled separately

  console.log(`Created user: ${userId} for Clerk ID: ${clerkId}`);
}

// User updated handler
async function handleUserUpdated(db: D1Database, data: any) {
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address;
  const firstName = data.first_name || '';
  const lastName = data.last_name || '';
  const name = `${lastName} ${firstName}`.trim();
  const avatarUrl = data.image_url;

  // Get internal user ID
  const clerkUser = await db
    .prepare('SELECT user_id FROM clerk_users WHERE clerk_id = ?')
    .bind(clerkId)
    .first();

  if (!clerkUser) {
    console.error(`Clerk user not found: ${clerkId}`);
    return;
  }

  // Update user
  await db
    .prepare(
      `UPDATE users 
       SET email = COALESCE(?, email),
           name = COALESCE(?, name),
           avatar_url = COALESCE(?, avatar_url),
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(email, name, avatarUrl, clerkUser.user_id)
    .run();

  console.log(`Updated user: ${clerkUser.user_id}`);
}

// User deleted handler
async function handleUserDeleted(db: D1Database, data: any) {
  const clerkId = data.id;

  // Get internal user ID
  const clerkUser = await db
    .prepare('SELECT user_id FROM clerk_users WHERE clerk_id = ?')
    .bind(clerkId)
    .first();

  if (!clerkUser) {
    console.error(`Clerk user not found: ${clerkId}`);
    return;
  }

  // Soft delete user
  await db
    .prepare(
      `UPDATE users 
       SET status = 'deleted', 
           deleted_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(clerkUser.user_id)
    .run();

  console.log(`Deleted user: ${clerkUser.user_id}`);
}

// Session created handler (update last login)
async function handleSessionCreated(db: D1Database, data: any) {
  const clerkUserId = data.user_id;

  // Get internal user ID
  const clerkUser = await db
    .prepare('SELECT user_id FROM clerk_users WHERE clerk_id = ?')
    .bind(clerkUserId)
    .first();

  if (!clerkUser) return;

  // Update last login
  await db
    .prepare(
      `UPDATE users 
       SET last_login_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(clerkUser.user_id)
    .run();
}
