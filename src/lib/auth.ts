import type { NextRequest } from 'next/server';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

const isProduction = process.env.NODE_ENV === 'production';
// Next evaluates route modules while building. The fallback keeps local builds
// deterministic; production deployments must provide BETTER_AUTH_SECRET.
const secret = process.env.BETTER_AUTH_SECRET || 'local-development-secret-change-me';

export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
    usePlural: false,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  advanced: {
    useSecureCookies: isProduction,
  },
});

export async function getCurrentUser(request: NextRequest) {
  if (isProduction && !process.env.BETTER_AUTH_SECRET) return null;

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return session?.user ?? null;
}

export async function requireCurrentUser(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    throw new Response(JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return currentUser;
}
