# Real-Time Meeting App — Audit Report

## Audit date

2026-11-01

## Scope

The repository was cloned from `https://github.com/Hariprasathnagarajan/real-time-meeting-app-1` and reviewed across the Next.js application, API routes, WebRTC implementation, Drizzle schema, configuration, and build tooling.

## Verified baseline

The following checks now pass from a clean dependency installation:

- `npm ci`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

The production build generates the home page, schedule page, meeting room, and API route bundles successfully.

## Changes made in this pass

- Fixed the `autumn-js` / `better-auth` peer dependency conflict by pinning `better-auth` to the compatible `1.3.17` release.
- Enabled strict build validation by removing `ignoreBuildErrors` and `ignoreDuringBuilds` from `next.config.ts`.
- Corrected Drizzle conditional query-builder typing with dynamic query builders.
- Fixed Recharts tooltip and legend prop typing for the installed Recharts version.
- Fixed the `class-variance-authority` ESLint import and removed an ESLint disable comment for a rule that is not installed.
- Added `.env.example`.
- Added a local `file:local.db` fallback so the app can build and run locally without inventing Turso credentials.

## Current architecture

- Next.js App Router frontend and API routes.
- LibSQL/Turso database accessed through Drizzle ORM.
- Browser WebRTC mesh connections remain available as a fallback; an optional LiveKit SFU path is now implemented behind `NEXT_PUBLIC_USE_LIVEKIT=true`.
- Signaling persisted in the `signaling_messages` table and polled by clients; `BroadcastChannel` is used for same-browser-tab testing.
- Better Auth registration, login, and HttpOnly session cookies are implemented; production deployments still require `BETTER_AUTH_SECRET`.

## Remaining limitations after Phase 2

The security foundation is implemented, but several production requirements remain:

1. **The media topology is still browser-to-browser mesh.** It is appropriate for a small prototype but does not scale reliably to Zoom-like participant counts. A production deployment should use an SFU such as LiveKit, mediasoup, or Janus, with TURN credentials for restrictive networks.
2. **Signaling is still polling-based.** It is now session-authenticated and membership-checked, but it increases latency and database load compared with an SFU/WebSocket transport.
3. **Recording is not a complete server-side recording system.** The current browser recording path and metadata APIs do not provide secure durable storage, processing, access control, or synchronized server recording.
4. **Multi-browser media testing is still required.** Build validation and the auth smoke test do not prove camera, microphone, ICE traversal, screen sharing, or cross-device reconnection behavior.
5. **Not every legacy collaboration API has yet been migrated to centralized authorization.** The remaining routes should be updated before production deployment.
6. **Dependency audit remains outstanding.** `npm ci` reports 31 vulnerabilities in the current dependency tree, including transitive packages and a vulnerable Next.js version.

## Recommended next implementation phase

1. Move media transport and room signaling to an SFU with TURN support, preferably LiveKit.
2. Add Playwright integration tests covering two browser contexts for registration, join, media state, chat, screen share, leave, and host controls.
3. Complete authorization coverage for all remaining collaboration APIs.
4. Implement secure object storage and a real recording pipeline, or remove recording controls until that integration exists.
5. Upgrade Next.js and remaining vulnerable dependencies, then rerun the complete test matrix.

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Without Turso variables, local development uses `local.db`. For a shared environment, set `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN` in the environment. Never commit real credentials.

## Phase 2 implementation update

### Implemented and verified

- Added Better Auth server configuration using the existing Drizzle database.
- Added Better Auth route handling at `/api/auth/[...all]`.
- Added registration/login UI at `/auth` using email/password endpoints.
- Added session, account, and verification tables to the Drizzle schema and migration.
- Removed arbitrary `x-user-id`, query-parameter, and `zoom_user_id` identity resolution from the profile path.
- Changed `/api/me` to return `401` when there is no authenticated session.
- Added server-side meeting password hashing with bcrypt.
- Removed password hashes from meeting API responses.
- Added server-side password verification during participant registration.
- Added host authorization for meeting updates and deletes.
- Authenticated WebRTC signaling and validated sender identity against the session.
- Authenticated meeting chat and validated meeting membership.
- Added `@types/bcrypt` for strict TypeScript validation.

### Runtime verification

A local SQLite migration was applied and the following flow was exercised successfully:

1. Register a new account through `/api/auth/sign-up/email`.
2. Receive a Better Auth HttpOnly session cookie.
3. Sign in through `/api/auth/sign-in/email`.
4. Resolve the authenticated profile through `/api/me`.

The following commands also pass after the Phase 2 changes:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

### Phase 2 limitations superseded by Phase 3

The LiveKit integration and Playwright authorization coverage were added in Phase 3 below. The remaining limitations are documented in the Phase 3 production requirements section.


## Phase 3 implementation update

### Implemented

- Added `livekit-client` and `livekit-server-sdk`.
- Added `/api/livekit/token`, which derives the LiveKit identity from the Better Auth session and checks meeting access server-side. Browser-supplied participant identities are not trusted.
- Added the optional `useLiveKit` client hook with camera publishing, microphone publishing, remote subscription, screen sharing, participant disconnect handling, connection-state tracking, and LiveKit reconnect support.
- Wired the existing meeting page to select the LiveKit path with `NEXT_PUBLIC_USE_LIVEKIT=true` while retaining the original mesh implementation as a fallback.
- Added a centralized meeting authorization service used by the LiveKit token endpoint.
- Added Playwright configuration with fake camera/microphone flags and independent browser contexts.
- Added registration, protected-route, and two-session anti-impersonation tests.
- Added isolated SQLite migration support for repeatable Playwright runs.
- Disabled the misleading recording control because secure server-side recording infrastructure is not available.

### Phase 3 verification

The following checks pass after the LiveKit and test changes:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

The Playwright result is 3 passing tests plus 1 intentionally skipped media acceptance test. The skipped test requires a reachable LiveKit deployment and credentials; fake browser devices alone cannot verify SFU connectivity or TURN traversal.

### Required production configuration

Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_USE_LIVEKIT=true` only after configuring a reachable LiveKit deployment. The API secret must remain server-only. The existing mesh path should remain disabled only after real two-user LiveKit audio, video, screen-share, reconnection, and meeting-termination tests pass.
