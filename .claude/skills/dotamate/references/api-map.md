# API & page map (app/api/**/route.ts) — all JSON `ApiResponse`

Shortcuts: 🔒 = session required · 🛡 = admin permission (resource in brackets) · 👑 = super admin only · 🛒 = `requireShopUser`. `ls app/api` for the truth; update this when routes change.

## Public / auth
- `auth/{signup,login,logout,me,role,forgot-password,reset-password}`; `auth/steam/{login,callback}`
- `landing` (landing stats/preview data) · `testimonials` (public approved + 🔒 own submit) · `search-lobby` (public post list) · `players` (public player directory) · `meta/heroes`, `meta/heroes/[id]` (OpenDota-backed hero meta)
- `settings/banner` (site banner), `settings/maintenance` (maintenance flag, read by middleware), `settings/shop` (shop-enabled flags for client UI)
- `users/[id]` (public profile + OpenDota stats) · `users/[id]/{block,commend,matches/[matchId],report-matches}` 🔒

## Onboarding 🔒
`onboarding/status`, `onboarding/profile`, `onboarding/steam/{verify,manual}`

## Lobbies & social 🔒
- `posts` (POST create; one ACTIVE per author) · `posts/[id]` (edit/delete) · `posts/[id]/{detail,join,leave,invite,respond,republish,extend,messages,members/[memberId]}`
- `conversations/start`, `conversations/[id]`, `conversations/[id]/messages`
- `friends`, `friends/[userId]`, `friends/requests`, `friends/requests/[id]` · `favorites/[userId]` · `notifications/[id]`
- `reports` (create report w/ evidence) · `tickets`, `tickets/[id]` (support)
- `dashboard/{home,browse,favorites,messages,my-posts,notifications,notifications/summary,sessions,settings,settings/password}` — aggregate GETs feeding dashboard pages (`notifications/summary` = 15 s poll + presence heartbeat)

## Shop (public pages `/shop`, `/shop/[category]`, `/shop/product/[slug]`, `/shop/mock-pay`)
- 🛒 `shop/orders` (checkout wallet/gateway, gift cards only), `shop/wallet/topup`
- `shop/payment/callback` (GET, NOT gated, idempotent)

## Admin 🛡 (`/admin/*` pages mirror these)
`admin/overview` · `admin/users`, `users/[id]` [USERS] · `admin/posts`, `posts/[id]` [POSTS] · `admin/reports`, `reports/[id]`, `…/messages`, `…/match`, `…/attachments/[attachmentId]` [REPORTS] · `admin/sessions`, `sessions/[id]` [SESSIONS] · `admin/reference`, `reference/[id]` [REFERENCE_DATA] · `admin/announcements` [ANNOUNCEMENTS] · `admin/audit-log` [AUDIT_LOG] · `admin/blog`, `blog/[id]`, `blog/upload` [BLOG] · `admin/roles`, `roles/[id]`, `roles/[id]/permissions` [ROLES] · `admin/tickets`, `tickets/[id]` [TICKETS] · `admin/testimonials`, `testimonials/[id]` [TESTIMONIALS]
👑 `admin/shop` (+ `settings`, `products(+[id])`, `gift-codes(+[id])`, `orders(+[id])` (refund only), `upload`)

## Other routes
`cdn/[source]/[...path]` (image proxy) · `sitemap.ts`, `robots.ts` · icons `app/icon.png`, `apple-icon.png`.

## Dashboard pages (`/dashboard/…`)
home, browse, create-post, my-posts(+[id]/edit), post/[id], sessions, friends, favorites, messages(+[id]), notifications, profile(+[id]), settings; shop group: orders(+[id]), wallet.

## Public pages
`/`, `/search-lobby`, `/players`, `/meta`, `/blog`, `/blog/[slug]`, `/faq`, `/contact`, `/testimonials`, `/terms`, `/privacy`, `/login`, `/signup`(+`/steam`,`/profile`), `/reset-password`.
