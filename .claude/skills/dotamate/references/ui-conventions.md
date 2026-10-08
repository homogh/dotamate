# UI conventions

## Theme (app/globals.css, Tailwind v4 `@theme inline`; no tailwind.config)
Dark only. Tokens → utilities: `bg-bg #121317`, `bg-bg-alt`, `bg-surface #2d2f39`, `bg-surface-alt #1c1e24`, `border-border` (white 8%), `text-text`, `text-text-dim`, `bg-primary #3d3cce` / `primary-hover #5158e2`, `text-accent #8e7bff`, `text-success`, `bg-danger`/`danger-soft`. shadcn semantic vars (`--card`, `--muted`, …) are bridged onto these, so `components/ui/*` inherit the look. Font: Vazirmatn (`--font-vazirmatn`, weights 400–900). Status colours are used inline (`#f59e0b` pending, `#22c55e` ok, `#ef4444` bad) — see `STATUS_STYLE` maps in admin pages.

Page wrappers: `.landing-page > section`, `.search-lobby-page > *`, `.content-page > *` give full-bleed backgrounds with content centred at 1200 px — wrap new public pages in `content-page flex w-full flex-col items-center` and put content in `mx-auto w-full max-w-[1200px] px-6 md:px-[100px]`. Scrollable panels hide scrollbars globally (`overflow-y-auto` etc.).

## RTL / Persian
`<html lang="fa" dir="rtl">`. Use logical alignment (`text-right`, `ms-/me-`, `start/end`) and `dir="auto"` on text that may be Latin (names, labels). Numbers: `toPersianDigits()` / `toLocaleString("fa-IR")` for display; send ASCII to APIs. Toman formatting helpers live next to the shop components. Copy tone: casual Persian second person.

## Shared building blocks (reuse before creating)
- `components/general/`: `Card` (tone surface|surface-alt, `highlighted`, `noHover`), `Chip` (filter pill), `PageBanner` (eyebrow/title/subtitle/imageSrc), `SectionHeading`, `Reveal`/`RevealGroup` (GSAP scroll-in, reduced-motion aware), `UserAvatar` (Steam avatar via `/cdn`, monogram fallback), `HeroAvatar`, `IconBadge`, `Pagination`, `CountUpStat`, `GeneratedCover`, `FriendRequestActions`, `NotificationBell`, `AccountMenu`, `AuthShell`, `LegalPage`, `SiteBanner`, `ToastContainer`, `ConfirmModalHost` (mounted in root layout).
- Panel navigation: `GroupedNav` (`components/general/groupedNav.tsx`) = accordion groups with GSAP open/close, sliding active rail marker, badges; fed by `ADMIN_NAV_GROUPS` / `DASHBOARD_NAV_GROUPS` (`components/{admin,dashboard}/navItems.ts`). New panel page ⇒ add an item to the right group there (sidebar, mobile drawer and topbar breadcrumb all read it). Client shop/market items carry `shop: "shop"|"market"` and are filtered by the switches.
- `components/dashboard/`: `shell/sidebar/topbar`, `DashboardFadeIn`, `PostForm`, `positionMeta`, `postLabels` (RANK_LABEL etc.).
- `components/ui/`: shadcn alert, avatar, badge, button, card, chart (recharts), dialog, input, label, separator, skeleton, switch, tabs, textarea. Add more via the shadcn CLI (aliases in `components.json`: ui→`@/components/ui`, utils→`@/app/lib/utils`).
- Stores: `useToast()` (`success/error`), `useConfirm()`, `useAuth`, `useNotifications` (SSR-seeded unread counts + poll).
- Icons: `lucide-react` only.

## Animation (GSAP)
Project skills `gsap-core` / `gsap-react` are installed in `.claude/skills`. Always `useGSAP` from `@gsap/react`, scope to a ref, wrap in `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`. Default entrance = short fade+rise (`Reveal`: y 16, 0.5 s, `power2.out`); richer motion only for 1–2 focal moments per page.

Dialogs: `tw-animate-css` is **not** installed, so shadcn's `animate-in/fade-in/zoom-in` classes do nothing — `components/ui/dialog.tsx` uses `animate-[dialog-in…]`/`animate-[overlay-in…]` keyframes from `globals.css` instead; do the same for any new Radix primitive. Hero art: `heroCropUrl(name)` (`app/lib/cdnUrls.ts`) = transparent 400×250 hero cutout via `/cdn`, sharper than the 256×144 `img` for big headers (used by the profile header + match dialog).

## Key art (user preference)
Bespoke illustrated art (login/signup, hero): full-bleed `<Image fill quality={100}>` over the whole shell, only a light **asymmetric** gradient on the text side (`bg-gradient-to-r from-bg via-bg/25 to-transparent`), glass card (`border bg-bg/45 backdrop-blur-xl`) over the art side. Don't box it in a small frame or dim it heavily; generic stock banners may still be dimmed like the landing Hero. `images.qualities` in `next.config.ts` must list any non-default quality (75, 100 currently).

## Forms & feedback patterns
Inline field validation text in `text-sm text-red-400`; loading = `busy` boolean disabling the button; success/failure toast for quick actions, inline error for forms; list pages show "در حال بارگذاری..." then an empty-state `Card`. Admin pages: KPI cards row → filter `Card` with pill buttons → list/table of `Card`s; padding `p-6 md:p-8`.
