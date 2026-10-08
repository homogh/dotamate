"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  Flag,
  Heart,
  MessageSquare,
  PenLine,
  ThumbsUp,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/app/lib/utils";
import { UserAvatar } from "@/components/general/userAvatar";
import { RANK_LABEL } from "@/components/dashboard/postLabels";
import { POSITION_ICON, POSITION_LABEL_FA, type PositionValue } from "@/components/dashboard/positionMeta";
import { faNumber } from "@/components/pages/profile/profileFormat";
import type { ProfileData } from "@/components/pages/profile/profileTypes";

gsap.registerPlugin(useGSAP);

interface ProfileHeaderProps {
  profile: ProfileData;
  busy: boolean;
  onEdit: () => void;
  onFriend: () => void;
  onAnswerFriend: (action: "accept" | "decline") => void;
  onFavorite: () => void;
  onMessage: () => void;
  onCommend: () => void;
  onReport: () => void;
}

/**
 * The profile's focal moment: avatar + identity on the start side, the
 * player's most-played hero standing in the opposite corner. Everything
 * else on the page uses the quieter dashboard fade.
 */
export function ProfileHeader({
  profile,
  busy,
  onEdit,
  onFriend,
  onAnswerFriend,
  onFavorite,
  onMessage,
  onCommend,
  onReport,
}: ProfileHeaderProps) {
  const ref = useRef<HTMLElement>(null);
  const signature = profile.dotaStats?.heroesPlayed[0] ?? null;
  const verified = profile.rankVerification === "VERIFIED";
  const position = profile.mainPosition as PositionValue | null;
  const PositionIcon = position ? POSITION_ICON[position] : null;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(ref);
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(q("[data-anim=glow]"), { autoAlpha: 0, scale: 0.5, duration: 1.4 }, 0)
          .from(q("[data-anim=avatar]"), { autoAlpha: 0, scale: 0.8, duration: 0.7, ease: "back.out(1.7)" }, 0.05)
          .from(q("[data-anim=line]"), { autoAlpha: 0, y: 14, duration: 0.55, stagger: 0.07 }, 0.15);
        if (q("[data-anim=hero]").length) {
          tl.from(q("[data-anim=hero]"), { autoAlpha: 0, x: -60, duration: 1.1, ease: "expo.out" }, 0.2).from(
            q("[data-anim=hero-tag]"),
            { autoAlpha: 0, y: 10, duration: 0.5 },
            0.7,
          );
        }
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      className="@container relative isolate min-h-[240px] overflow-hidden rounded-[16px] border border-border bg-surface"
    >
      <div
        data-anim="glow"
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-[420px] rounded-full bg-primary/35 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_120%_at_100%_0%,rgba(142,123,255,0.10),transparent_55%)]"
      />

      {signature?.heroCrop && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-anim="hero"
            src={signature.heroCrop}
            alt=""
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[150px] w-auto max-w-none select-none opacity-15 [mask-image:linear-gradient(to_top,transparent,black_30%)] @3xl:left-6 @3xl:h-[236px] @3xl:opacity-100"
          />
          <div
            data-anim="hero-tag"
            className="absolute bottom-4 left-4 hidden items-center gap-2 rounded-full border border-white/10 bg-bg/55 py-1.5 pe-3 ps-1.5 backdrop-blur-md @3xl:flex"
          >
            {signature.heroIcon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature.heroIcon} alt="" className="size-6 rounded-full bg-surface-alt p-0.5" />
            )}
            <span className="text-[11px] text-text-dim" dir="auto">
              هیروی اصلی
            </span>
            <span className="text-[12px] font-bold text-text" dir="auto">
              {signature.heroName}
            </span>
            <span className="text-[11px] text-text-dim" dir="auto">
              · {faNumber(signature.games)} گیم
            </span>
          </div>
        </>
      )}

      <div className={cn("flex flex-col gap-6 p-6 @lg:flex-row @lg:items-start @2xl:p-8", signature?.heroCrop && "@3xl:pe-[360px]")}>
        <div data-anim="avatar" className="relative shrink-0 self-center @lg:self-start">
          <div className="rounded-full bg-gradient-to-br from-accent via-primary to-primary/40 p-[3px] shadow-[0_0_40px_rgba(61,60,206,0.45)]">
            <div className="rounded-full bg-surface p-[3px]">
              <UserAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} size={96} round />
            </div>
          </div>
          {profile.online && (
            <span className="absolute bottom-2 left-2 flex size-4" title="آنلاین">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-4 rounded-full border-[3px] border-surface bg-success" />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center @lg:items-start @lg:text-start">
          <div data-anim="line" className="flex flex-wrap items-center justify-center gap-2 @lg:justify-start">
            <h1 className="text-[26px] font-black leading-tight text-text" dir="auto">
              {profile.displayName}
            </h1>
            {verified && (
              <span
                className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success"
                title="رنک با OpenDota تایید شده"
              >
                <BadgeCheck size={13} />
                تاییدشده
              </span>
            )}
          </div>

          <div data-anim="line" className="flex flex-wrap items-center justify-center gap-2 @lg:justify-start">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-[12px] font-bold text-accent" dir="auto">
              {RANK_LABEL[profile.rank]}
              {profile.rankTier ? ` ${faNumber(profile.rankTier)}` : ""}
            </span>
            {position && PositionIcon && (
              <span className="flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-[12px] font-bold text-text">
                <PositionIcon size={13} className="text-accent" />
                {POSITION_LABEL_FA[position]}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-[12px] text-text-dim">
              <CalendarDays size={13} />
              عضو از {new Date(profile.createdAt).toLocaleDateString("fa-IR", { year: "numeric", month: "long" })}
            </span>
          </div>

          <p data-anim="line" className="max-w-[560px] text-[14px] leading-[1.8] text-text-dim" dir="auto">
            {profile.bio || "این بازیکن هنوز بایو ننوشته."}
          </p>

          {(profile.steamProfileUrl || (!profile.isSelf && profile.steamId)) && (
            <div data-anim="line" className="flex flex-wrap items-center justify-center gap-4 text-[12px] @lg:justify-start">
              {profile.steamProfileUrl && (
                <a
                  href={profile.steamProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-text-dim transition-colors hover:text-accent"
                >
                  <ExternalLink size={13} />
                  پروفایل استیم
                </a>
              )}
              {!profile.isSelf && profile.steamId && (
                <a
                  href={`steam://friends/add/${profile.steamId}`}
                  className="flex items-center gap-1 text-text-dim transition-colors hover:text-accent"
                >
                  <UserPlus size={13} />
                  افزودن در استیم
                </a>
              )}
            </div>
          )}

          <div data-anim="line" className="mt-1 flex flex-wrap items-center justify-center gap-2 @lg:justify-start">
            {profile.isSelf ? (
              <ActionButton icon={PenLine} label="ویرایش پروفایل" onClick={onEdit} />
            ) : (
              <>
                <ActionButton icon={MessageSquare} label="ارسال پیام" onClick={onMessage} disabled={busy} primary />
                {profile.friend.state === "INCOMING" ? (
                  <>
                    <ActionButton icon={UserPlus} label="قبول دوستی" onClick={() => onAnswerFriend("accept")} disabled={busy} accent />
                    <ActionButton label="رد درخواست" onClick={() => onAnswerFriend("decline")} disabled={busy} />
                  </>
                ) : (
                  <ActionButton
                    icon={profile.friend.state === "FRIENDS" ? UserCheck : profile.friend.state === "OUTGOING" ? Clock : UserPlus}
                    label={
                      profile.friend.state === "FRIENDS"
                        ? "دوست هستید"
                        : profile.friend.state === "OUTGOING"
                          ? "درخواست ارسال شد"
                          : "افزودن به دوستان"
                    }
                    title={
                      profile.friend.state === "FRIENDS"
                        ? "برای حذف از دوستان کلیک کن"
                        : profile.friend.state === "OUTGOING"
                          ? "برای لغو درخواست کلیک کن"
                          : undefined
                    }
                    onClick={onFriend}
                    disabled={busy}
                    accent={profile.friend.state === "NONE"}
                  />
                )}
                <IconButton
                  icon={Heart}
                  label={profile.isFavorited ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                  onClick={onFavorite}
                  disabled={busy}
                  active={profile.isFavorited}
                  tone="accent"
                />
                <IconButton icon={ThumbsUp} label="کامند" onClick={onCommend} tone="success" />
                <IconButton icon={Flag} label="گزارش تخلف" onClick={onReport} tone="danger" />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionButton({
  icon: Icon,
  label,
  title,
  onClick,
  disabled,
  primary,
  accent,
}: {
  icon?: LucideIcon;
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-11 items-center gap-2 rounded-[10px] px-5 text-[13px] font-bold transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        primary
          ? "bg-primary text-white shadow-[0_8px_24px_rgba(61,60,206,0.35)] hover:bg-primary-hover"
          : accent
            ? "border border-primary/70 text-accent hover:bg-primary/10"
            : "border border-border bg-surface-alt/70 text-text-dim hover:border-white/20 hover:text-text",
      )}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}

const ICON_TONE = {
  accent: { idle: "hover:text-accent hover:border-accent/40", active: "border-accent/50 bg-accent/15 text-accent" },
  success: { idle: "hover:text-success hover:border-success/40 hover:bg-success/10", active: "" },
  danger: { idle: "hover:text-danger hover:border-danger/50 hover:bg-danger/10", active: "" },
} as const;

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone: keyof typeof ICON_TONE;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-11 items-center justify-center rounded-[10px] border transition-[background-color,border-color,color,transform] duration-200 active:scale-90 disabled:pointer-events-none disabled:opacity-50",
        active ? ICON_TONE[tone].active : cn("border-border bg-surface-alt/70 text-text-dim", ICON_TONE[tone].idle),
      )}
    >
      <Icon size={17} className={cn("transition-transform duration-300", active && "scale-110 fill-current")} />
    </button>
  );
}
