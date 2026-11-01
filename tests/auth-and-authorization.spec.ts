import { test, expect, type BrowserContext } from '@playwright/test';

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function register(context: BrowserContext, name: string, email: string) {
  const response = await context.request.post('/api/auth/sign-up/email', {
    data: { name, email, password: 'correct-horse-battery' },
  });
  expect(response.ok()).toBeTruthy();
}

test('rejects protected meeting creation without an authenticated session', async ({ request }) => {
  const response = await request.post('/api/meetings', {
    data: { title: 'Unauthenticated meeting' },
  });
  expect(response.status()).toBe(401);
});

test('registers a user and resolves the authenticated profile', async ({ browser }) => {
  const context = await browser.newContext();
  const email = uniqueEmail('user-a');
  await register(context, 'User A', email);

  const profile = await context.request.get('/api/me');
  expect(profile.status()).toBe(200);
  const profileBody = await profile.json();
  expect(profileBody.email).toBe(email);
  expect(profileBody.name).toBe('User A');
  await context.close();
});

test('two independent sessions cannot impersonate one another', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const emailA = uniqueEmail('user-a');
  const emailB = uniqueEmail('user-b');
  await register(contextA, 'User A', emailA);
  await register(contextB, 'User B', emailB);

  const profileA = await contextA.request.get('/api/me');
  const profileB = await contextB.request.get('/api/me');
  expect((await profileA.json()).email).toBe(emailA);
  expect((await profileB.json()).email).toBe(emailB);

  const forgedMeetingUpdate = await contextB.request.put('/api/meetings?id=999999', {
    data: { title: 'Forged update' },
  });
  expect([403, 404]).toContain(forgedMeetingUpdate.status());

  await contextA.close();
  await contextB.close();
});

test.skip('manual/infrastructure media acceptance: two users publish camera, microphone, and screen share', async () => {
  // This remains skipped until LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET
  // point to a reachable SFU. Fake browser devices alone cannot verify a real
  // cross-process SFU connection or TURN traversal.
});
