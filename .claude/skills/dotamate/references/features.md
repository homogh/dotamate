# Domain flows & business rules

## Lobby (Post) lifecycle
1. Host creates a post (`POST /api/posts`): needs position, rank, gameMode, ≥1 region, description ≥ 10 chars; SCHEDULED needs `startAt`; **one ACTIVE post per user**. `neededPositions` (excluding own) sets `partySize = needed + 1`; otherwise 2–5.
2. Others `join` (one active party per user; can't join own post). Host accepts/declines/removes via `posts/[id]/members/[memberId]`; accepted members fill the slot matching their `PostMember.position` (`postOpenPositions`). Post flips ACTIVE ↔ FULL; `republish` bumps it; `invite` creates a `PostMember` with status `INVITED` (not a member, no slot, no chat) + a notification; the invitee opens the lobby (chat blurred, members visible) and answers via `posts/[id]/respond` (accept/decline); host can cancel an invite by rejecting the member.
3. Lobby chat = `Message.postId`; DMs = Conversation. Chat-message notifications go through `app/lib/chatNotifications.ts`: chat pages poll `GET …/messages?viewing=1|0` (`isPageWatched()` = tab visible + focused; `viewing=0` on blur/hide/leave). Watching (`User.activeChatKey` fresh <12 s) ⇒ no notification and that chat's NEW_MESSAGE rows get marked read; otherwise one unread row per chat+sender (`groupKey` `dm:<id>:<sender>` / `lobby:<id>:<sender>`) whose `count`/title («۵ پیام جدید از …») grows and `createdAt` bumps. DM `lastReadAt` only advances while watching. Summary API returns `latestUnreadAt` so a grown row still chimes. Session reminders per user prefs (`sessionReminderMinutes`). Notifications created inline at each step.
4. Admin moderation: delete post, ban/suspend/warn users, all audit-logged.

## Reputation
- OpenDota sync (`syncOpenDotaPlayer`) → `DotaMatchStats` + rank → `rankVerification VERIFIED`; rank-trend chart on profile.
- Behavior & communication score (10000/12000): report reasons have default penalties (`REPORT_REASONS` in `app/lib/behavior.ts`); only an admin-confirmed report applies them. Commends: 4 Dota types, one per giver→teammate→match, same-team match verified through OpenDota; every N commends can grant a bonus (`commendProgress`, `lastCommendBonusAt`).
- Reports can carry a match id + image/video evidence (private storage); admin sees/answers in `admin/reports/[id]`.

## Content
Blog CMS (admin editor with page-builder blocks `ContentBlock`: paragraph/heading/blockquote/image; categories راهنما/آپدیت/متا/آموزش; hero tags; SEO fields; scheduled publish; `/sitemap.ts` lists published posts). Testimonials: 1 per user, moderated, shown on landing; edit resets to PENDING. Tickets: user ↔ staff thread with status/priority. FAQ/terms/privacy are static pages (`legalPage.tsx`). Announcements/site banner from admin.

## Shop (owner-gated) — Steam gift cards only
- Since 2026-10-05 the shop sells **only Steam gift cards**; Dota items, the user market («بازار کاربران») and Sheba withdrawals were removed from the code (DB tables kept, unused).
- Wallet name **«میت کیف»**: gateway top-up + refunds; spendable on-site only, never withdrawable. Pricing is **cost-plus**: `priceToman = ceil(usd × usdCostToman × (1+giftCardMarginPercent%) / 1000) × 1000` (null while `usdCostToman = 0`). Orders snapshot USD cents + cost + total.
- **Gift cards**: code bank (admin stocks codes; encrypted). Paid order → `AWAITING_CODE` → auto-assigns a code; if bank empty, admin activates within working hours (Tehran 10–22), adding codes auto-fills waiting orders FIFO. Admin can refund an `AWAITING_CODE` order to the wallet (`refundOrderToWallet`).
- Payment: wallet or ZarinPal gateway; failed/refunded orders return money to the wallet.

## Status of the build (as of last audit)
Gift-card shop done. Shop default OFF. Gateway provider (ZarinPal assumed) and effective Visa dollar cost still pending owner input.
