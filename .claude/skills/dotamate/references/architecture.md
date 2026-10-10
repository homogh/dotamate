# Architecture notes (auth, RBAC, gates, background work)

## Auth
- Session = JWT (HS256, `jose`) in httpOnly cookie `dotamate_session`, 30 days. Payload `{ id, displayName, email }`. `app/lib/auth.ts`: `signSession`, `verifySession`, `hashPassword/verifyPassword` (bcryptjs, cost 10), `SESSION_COOKIE_OPTIONS`.
- Signup: `/api/auth/signup` (email OR `09xxxxxxxxx` phone + password ≥ 8; honours `PlatformSetting.signupsEnabled`; reads UTM cookie `dm_attribution` → User.utm*/referrer/landingPage via `app/lib/attribution.ts`, written client-side by `components/general/attributionTracker.tsx`).
- Login/logout/me/role: `/api/auth/{login,logout,me,role}`. `User.banned`/`suspendedUntil` are set from `api/admin/users/[id]` and hidden from public lists (players, friends requests) — login, `/api/auth/me`, `getAdminSession` and `app/dashboard/layout.tsx` check them via `accountBlockMessage` (`app/lib/accountStatus.ts`); `verifySession` stays JWT-only, so other API routes don't (known gap).
- Password reset: `/api/auth/forgot-password` → `PasswordResetToken` (HMAC of emailed token) → `/reset-password` page → `/api/auth/reset-password`. Mail via Resend (`app/lib/mailer.ts`).
- Steam: OpenID 2.0 (`app/lib/steam.ts`, `/api/auth/steam/{login,callback}`), manual SteamID entry + verify under `/api/onboarding/steam/*`. `matchDataVerified` comes from OpenDota (`syncOpenDotaPlayer`); admin can waive with `matchGateOverride`.
- Client state: `useAuth` (zustand) → `fetchMe()` (`/api/auth/me`), `fetchRole()` (`/api/auth/role`) used by navbar/account menu to show the admin link.
- Presence: `/api/dashboard/notifications/summary` is polled every 15 s by `NotificationsProvider` (root layout) and also bumps `User.lastActiveAt`; "online" = active within 2 min (`app/lib/friends.ts`).

## Middleware (`middleware.ts`)
Protected prefixes `/dashboard`, `/admin`, `/signup/` → redirect to `/login?next=…`; `/login` and `/signup` redirect logged-in users to `/dashboard`. API routes do their own auth; middleware matcher only covers those pages.

## RBAC (`app/lib/permissions.ts`)
- `Role` (name unique, `editable`) → `RolePermission(resource, level NONE|VIEW|EDIT)`; `User.roleId`. Resources: USERS, POSTS, REPORTS, SESSIONS, REFERENCE_DATA, ANNOUNCEMENTS, AUDIT_LOG, BLOG, ROLES, TICKETS, TESTIMONIALS.
- `getAdminSession(userId)` → `{ roleName, isSuperAdmin, permissions }` or null; `hasAccess(admin, resource, minLevel)`.
- Non-editable role «مدیر کل» = super admin; owns the shop panel (`requireSuperAdmin`, `isSuperAdminViewer` in `app/lib/superAdmin.ts`). Seed with `prisma/seedRoles.mjs`.
- Admin UI: `app/admin/layout.tsx` + `components/admin/{shell,sidebar,topbar,navItems}`; `filterAdminNavItems` hides items by permission; shop items are `superAdminOnly`.

## Feature switches (`PlatformSetting`, singleton id=1, `getPlatformSettings()`)
Fields: `bannerText/bannerActive` (site banner), `signupsEnabled` (enforced in signup), `shopEnabled` (enforced everywhere, see SKILL.md §5 and `app/lib/shopAccess.ts`; `marketEnabled` still in the schema but unused since the market was removed). Also enforced (since 2026-10-05): `maintenanceMode(+Message)` in `middleware.ts` (edge, reads `/api/settings/maintenance` with a 10 s in-memory cache, admins = users with a role bypass; page at `app/maintenance`), `lobbyChatEnabled`, `scheduledSessionsEnabled`, `steamAutoSyncEnabled` (details in SKILL.md §5.7). NB: the middleware matcher now covers every path without a file extension — editing `config.matcher` needs a dev-server restart.

## Background work
- `instrumentation.ts` (Node runtime only): 5 s after boot → `warmStaticAssets()` (pre-downloads Valve images into `storage/cdn-cache`).
- Same file: every 5 min → `processPostExpiry()` (`app/lib/postExpiry.ts`): ACTIVE/FULL posts past `expiresAt` (24h after creation; scheduled = startAt+24h) → `EXPIRED` + SYSTEM notification; 1h before → warning notification + banner on `/dashboard/my-posts` with «۲۴ ساعت دیگه نگهش دار» (`POST /api/posts/[id]/extend`, only inside the warning window, +24h, warns again next cycle).
- Same file, only when `SIGNUP_REMINDERS_ENABLED=true`: hourly → `processSignupReminders()` (`app/lib/signupReminders.ts`): users with email, no `profileCompletedAt`, `notifyEmail` on, not banned/suspended get reminder 1/2/3 at day 1/3/7 (each also ≥2d/4d after the previous one), 09–22 Tehran only, ≤100/sweep, 600 ms apart. `EmailLog` row claimed before send, deleted on failure (retried next hour). Admin users list: filter «ثبت‌نام ناقص» + «یادآوری n از ۳».
- No cron/queue; anything periodic must hook here or be lazy-on-request.

## External services
- **OpenDota** (`app/lib/opendota.ts`): 8 s timeout, 60 s cooldown after failure, memory + disk cache in `storage/opendota-cache` (stale-while-revalidate). Provides rank/match stats sync, hero & item lookups, `/meta` data, shared-match verification (`sharedMatches.ts`, used by commends/reports).
- **Steam Web API**: player summaries (`STEAM_API_KEY`).
- **ZarinPal v4** (`app/lib/paymentGateway.ts`): `requestPayment`/`verifyPayment`; amounts in Toman (IRT). Mock gateway page `/shop/mock-pay` when `PAYMENT_MOCK=true` and no merchant id. Callback `/api/shop/payment/callback` is idempotent (conditional `updateMany` on Payment/Order status) and builds redirects from `NEXT_PUBLIC_API_URL` because the VPS reverse proxy hides the public host.
- **Resend** mail (`app/lib/mailer.ts` `sendEmail`; templates `emailTemplates.ts` built from table/inline-style blocks in `emailLayout.ts`; images `public/images/email/*` always loaded from https://dotamate.ir, heroes have a fade to the card colour `#16171c` baked in; marketing mails carry `List-Unsubscribe` from `emailUnsubscribe.ts`); **Steam CDN proxy** `/cdn/[source]/[...path]` (whitelist regex per source in `cdnUrls.ts`, disk cache `imageCache.ts`).

## Deployment shape
Ubuntu VPS: nginx → Next (`next build && next start`) under pm2, MariaDB. `storage/` and `public/uploads` are gitignored runtime dirs (must persist across deploys; `/public` additions after build aren't served, hence `storage/` for cached files). Server work is done manually by the user (see SKILL.md §7).
