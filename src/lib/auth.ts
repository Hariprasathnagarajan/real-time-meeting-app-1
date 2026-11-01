import type { NextRequest } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { user } from '@/db/schema';

const DEFAULT_USER_NAME = process.env.DEFAULT_USER_NAME?.trim() || 'Zoom Host';
const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL?.trim() || 'host@zoom.local';

export async function getCurrentUser(request?: NextRequest) {
  // Check if a specific userId was passed via header, query, or cookie
  const requestedUserId =
    request?.headers.get('x-user-id') ||
    request?.nextUrl?.searchParams?.get('userId') ||
    request?.cookies?.get('zoom_user_id')?.value;

  if (requestedUserId) {
    const found = await db
      .select()
      .from(user)
      .where(eq(user.id, requestedUserId))
      .limit(1);

    if (found.length > 0) {
      return found[0];
    }
  }

  // Otherwise fallback to existing primary user or create default host
  const existing = await db
    .select()
    .from(user)
    .orderBy(asc(user.createdAt))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .insert(user)
    .values({
      id,
      email: DEFAULT_USER_EMAIL,
      name: DEFAULT_USER_NAME,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  const created = await db
    .select()
    .from(user)
    .where(eq(user.email, DEFAULT_USER_EMAIL))
    .limit(1);

  return created[0] ?? null;
}
