---
name: dotamate
description: Project map and conventions for DotaMate (Persian/RTL Dota 2 teammate-finder + Steam gift-card shop, Next.js 16 + Prisma/MySQL). Load FIRST in any session touching this repo — instead of re-exploring the codebase — before editing pages, API routes, schema, admin panel, shop/wallet, auth, or UI. Also covers keeping this skill itself up to date after tasks.
---

# DotaMate — project skill

Read this instead of crawling the repo. Open the `references/` files only when the task touches that area. Verify any file/function name against the live code before relying on it (this skill can lag behind).

Last full audit: 2026-10-05.

## 1. What it is
- Persian-only (`lang="fa" dir="rtl"`, Vazirmatn font) Dota 2 LFG site: players post lobbies, others request to join, chat, friends, reports/behavior score, OpenDota-verified rank stats, blog CMS, admin panel with RBAC.
- Plus a Steam **gift-card shop** (code bank only — Dota items and the user market were removed 2026-10-05), wallet **«میت کیف»** (top-up + refunds, not withdrawable), ZarinPal payments. Shop is owner-gated and default OFF.
- Production: Ubuntu VPS, nginx + pm2 + MariaDB, manual deploy. See "Workflow rules".

## 2. Stack
Next.js **16.3** (App Router, `middleware.ts`) · React 19.2 · TypeScript · Tailwind v4 (CSS tokens, no tailwind.config) · shadcn "new-york" (`components/ui`, Radix) · Prisma 6 + MySQL (`binaryTargets` set for Linux) · zustand · GSAP (`@gsap/react`) · recharts · lucide-react · jose (JWT) · bcryptjs · resend (mail). No test suite. Lint: `npm run lint`.

**Next 16 differs from training data** (CLAUDE.md/AGENTS.md insists): read `node_modules/next/dist/docs/` before using unfamiliar APIs. Already in use: `params`/`searchParams` are Promises (`await params`), global types `PageProps<"/x/[id]">` / `LayoutProps<"/x">`, `connection()` from `next/server` for per-request routes, `revalidatePath`. `middleware.ts` still works (Next 16 deprecates it in favour of `proxy.ts`; not migrated).

Repo root for git/npm is `E:\dotamate\dotamate` (outer `E:\dotamate` only holds `.claude/launch.json` → dev server `dotamate-dev` on port 3000). Path alias `@/*` → project root.

## 3. Layout
```
app/
  page.tsx                landing (components/pages/landing/*)
  login, signup(+/steam,/profile), reset-password   auth + onboarding
  dashboard/              user panel (layout.tsx = SSR gate + DashboardShell)
    (shop)/ orders, wallet        route group, hidden when shop off
  admin/                  admin panel (shell + sidebar; grouped accordion nav: ADMIN_NAV_GROUPS in components/admin/navItems.ts)
  shop/ product/[slug] [category]/   public store (gift cards only; [category] = gift-cards)
  blog, meta, players, search-lobby, faq, contact, testimonials, terms, privacy
  api/**/route.ts         all backend (see references/api-map.md)
  cdn/[source]/[...path]  caching proxy for Steam/Valve images (storage/cdn-cache)
  lib/                    server+shared logic (no components)
  stores/                 zustand: useAuth, useToast, useConfirm, useNotifications
  types/api.ts            ApiResponse<T>
components/
  ui/ shadcn primitives · general/ shared bits (Card, Chip, Reveal, PageBanner, UserAvatar…)
  pages/<feature>/ feature components · admin/ dashboard/ header/ footer/
prisma/schema.prisma (+ *.mjs seed/cleanup scripts) · public/{images,uploads,sound-efect} · storage/ (gitignored: cdn-cache, opendota-cache, reports evidence)
middleware.ts · instrumentation.ts
```
More detail: `references/architecture.md` (auth/RBAC/gates/background jobs), `references/data-model.md` (Prisma models + enums), `references/api-map.md`, `references/features.md` (domain flows), `references/ui-conventions.md`.

## 4. Coding conventions (match these exactly)
**Files/names**: camelCase filenames, lowercase folders (`shopOrders.ts`, `components/pages/shop/buyBox.tsx`); PascalCase **named exports** (`export function BuyBox`) — default export only for `page.tsx`/`layout.tsx`/`route` handlers. `import prisma from "@/app/lib/prisma"` (singleton, never `new PrismaClient()` — except the `.mjs` scripts). Import order: external libs, blank line, `@/app/...`, `@/components/...`.

**API route pattern** (copy from `app/api/admin/testimonials/**`):
- Always respond `NextResponse.json<ApiResponse>({ status: "success"|"error", message, data })` with correct HTTP status (401 not logged in, 403 no permission, 404, 409 conflict, 400 validation).
- Auth boilerplate inline: `request.cookies.get(SESSION_COOKIE)` → `verifySession`. Admin routes then `getAdminSession(session.id)` + `hasAccess(admin, "RESOURCE", "VIEW"|"EDIT")`. Owner-only (shop admin): `requireSuperAdmin`. Shop buyer: `requireShopUser`.
- Parse body with `await request.json().catch(() => null)`, coerce with `String(body?.x ?? "")`, validate by hand (no zod).
- Dynamic params: `{ params }: { params: Promise<{ id: string }> }`.
- Multi-write mutations: `prisma.$transaction([...])` or interactive tx; admin actions also write `prisma.auditLog.create` (add enum value to `AuditAction` if new). User-facing events create a `Notification`.
- **User-facing messages are Persian, casual tone** ("وارد نشدی.", "دسترسی نداری.", "می‌خوای…"). Comments in code are English.

**Money**: whole **Toman as Int**; product prices stored as USD cents and converted via `app/lib/shopPricing.ts`. Wallet balance is derived from the append-only `WalletTransaction` ledger (`app/lib/wallet.ts`); concurrent spends use `lockWallet` (SELECT … FOR UPDATE) inside an interactive transaction. State transitions use conditional `updateMany({ where: { status: X } })` and check `count === 1` for idempotency.

**Client pages** (`"use client"`): local `useState` + `fetch("/api/…", { cache: "no-store" })` in `useCallback/useEffect`, check `json.status === "success"`, feedback via `useToast()` or inline error state; destructive actions via `useConfirm()` (`confirmAction({ message, danger: true, confirmLabel })`) — never `window.confirm/alert`. Public/SEO pages are **server components** that call `lib/` functions directly and export `metadata`/`generateMetadata` (+ `alternates.canonical`); content-heavy ones use `export const dynamic = "force-dynamic"` or `revalidate`.

**Styling**: Tailwind utility classes with design tokens (`bg-bg`, `bg-surface`, `bg-surface-alt`, `border-border`, `text-text`, `text-text-dim`, `bg-primary`, `text-accent`, danger/success), `cn()` from `app/lib/utils`, radii `rounded-[8px]/[12px]`, `dir="auto"` on user/Persian text nodes. Use `Card` (`tone`, `noHover`) and existing shared components before writing new ones. Details + key-art rules: `references/ui-conventions.md`.

**Images**: hand-placed assets in `public/images/<feature>/…`; user/admin uploads via `saveUploadedImage()` → `public/uploads/<folder>/<YYYY-MM>/<uuid>.<ext>`; report evidence under `storage/` served through gated routes. Steam/Valve imagery must go through `/cdn/*` helpers in `app/lib/cdnUrls.ts` (users in Iran can't reach steamstatic).

## 5. Gates & invariants to never break
1. `/dashboard`, `/admin`, `/signup/*` need a session (middleware); `/login` & `/signup` redirect away when logged in.
2. Dashboard layout forces onboarding: no `profileCompletedAt` → `/signup/steam` (Steam OpenID/manual + OpenDota match-data verification, unless `matchGateOverride`) → `/signup/profile`.
3. Shop OFF ⇒ *everything* shop-related is invisible/404 for everyone incl. super-admin (no preview): pages, APIs, nav, notifications (`notificationVisibilityFilter`), sitemap. Payment callback stays ungated so in-flight payments settle. Use `isShopEnabled()`. Storefront queries only ever read `type: "GIFT_CARD"` products (`ON_SALE` in `shopCatalog.ts`); checkout rejects anything else.
4. Super-admin = the seeded non-editable «مدیر کل» role (`Role.editable = false`); it implicitly has EDIT on all `AdminResource`s, including ones added after seeding. New admin resource ⇒ add to `AdminResource` enum, `ADMIN_RESOURCES` (permissions.ts), `seedRoles.mjs`, and an item inside the right group of `ADMIN_NAV_GROUPS` (`navItems.ts`).
5. Gift codes are AES-256-GCM encrypted + HMAC-deduped with `GIFT_CODE_SECRET` (changing it bricks stored codes). `PAYMENT_MOCK=true` is dev-only, never on the VPS.
6. OpenDota calls only via `openDotaFetch` (timeout + cooldown) / cached helpers in `app/lib/opendota.ts`.
7. Account status: banned/suspended users are rejected at login (403 + reason), `/api/auth/me`, `getAdminSession` (admin panel/APIs) and the dashboard layout (renders `AccountBlocked`). Helper: `app/lib/accountStatus.ts`. Known remaining gap: other `/api/*` routes only verify the JWT, so an already-signed-in banned user can still hit them directly (middleware can't query the DB).
   Platform switches enforced: `maintenanceMode` (middleware rewrites non-admins to `/maintenance`, APIs get 503; open: `/login`, `/api/auth`, `/api/settings/maintenance`, payment callback, `/cdn`), `lobbyChatEnabled` (POST `posts/[id]/messages`), `scheduledSessionsEnabled` (create + edit-to-scheduled post), `steamAutoSyncEnabled` (background stale-stats refresh in `users/[id]`; default **false** in the schema, so admins must switch it on for profiles to keep refreshing).
8. Reports never change scores by themselves — only admin-confirmed ones (`app/lib/behavior.ts`).

## 6. Env vars (names only, values live in `.env`, gitignored)
`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL` (site URL, used for SEO/callbacks), `STEAM_API_KEY`, `GIFT_CODE_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `PAYMENT_MOCK` (dev), `ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX`.

## 7. Workflow rules (from user preferences)
- **Reply to the user in Persian**, always. Code/identifiers/commit messages in English.
- There is no `prisma/migrations` folder, so the schema is evidently synced with `prisma db push` (+ `npx prisma generate`) — confirm with the user before running it on any DB. Production DB changes and **all VPS work are done by the user over their own SSH** — explain each step (what/why), give one command, wait for output; never run remote commands yourself.
- Bespoke key art (login/signup/hero) = full-bleed, near-full quality, light asymmetric gradient (see ui-conventions).
- Don't start dev servers with Bash — use the preview tools with `.claude/launch.json` (`dotamate-dev`).
- Prefer reusing helpers in `app/lib` and shared components; admin lookup pages follow `app/admin/reference`.

## 8. Keeping this skill current (do this after every task)
Before finishing a task, check whether it changed anything this skill documents; if so, edit the **smallest relevant section** (not a rewrite) and bump the audit date only for areas you actually re-verified:
- New/renamed route, page, or lib file → `references/api-map.md` / §3 here.
- Prisma model/enum/field change → `references/data-model.md` (and `AuditAction`/`AdminResource` notes in §5).
- New gate, env var, background job, dependency, or convention → §2/§5/§6 or `references/architecture.md`.
- New feature or changed business rule (pricing, commission, deadlines, statuses) → `references/features.md`.
- New shared component or style token → `references/ui-conventions.md`.
- A statement here turns out wrong → fix it immediately and note it in the changelog.
Keep entries terse (facts + file paths, no prose); don't paste code that the repo already contains. If a task changed nothing documented, don't touch the skill.

### Changelog
- 2026-10-05: shop reduced to Steam gift cards only — deleted Dota items (type picker, Steam-market search, Trade URL, manual item delivery), the user market (pages, APIs, admin, timeouts, `marketEnabled` switch) and Sheba withdrawals/payouts. Prisma schema left untouched (market/withdrawal tables + `ITEM`/`marketEnabled` fields still exist, unused). Payment callback refunds any leftover non-ORDER/non-TOPUP payment to the wallet.
- 2026-10-05: chat-message notifications grouped per chat+sender and suppressed while the chat is on screen (`app/lib/chatNotifications.ts`, new `User.activeChatKey/activeChatAt`, `Notification.groupKey/count`).
- 2026-10-05: admin + client sidebars regrouped into GSAP accordion dropdowns via shared `components/general/groupedNav.tsx` (types/matcher in `app/lib/navGroups.ts`). Admin: `ADMIN_NAV_GROUPS` (`components/admin/navItems.ts`); client: `DASHBOARD_NAV_GROUPS` (`components/dashboard/navItems.ts`, replaced `shopNav.ts`).
- 2026-10-05: fixed ban/suspend enforcement + maintenance/lobby-chat/scheduled/steam-sync switches (see §5.7).
- 2026-10-05: initial full audit (49 commits, up to "add reset password").
