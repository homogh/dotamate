import { HeroAvatar } from "@/components/general/heroAvatar";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  round?: boolean;
}

/**
 * A connected Steam profile picture is the user's own photo, not Dota art —
 * no IP concern like HeroAvatar's hero-icon usage. Prefer it when present,
 * fall back to the generated monogram for anyone not yet connected.
 */
export function UserAvatar({ name, avatarUrl, size = 24, round = true }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 object-cover ${round ? "rounded-full" : "rounded-[4px]"}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return <HeroAvatar name={name} size={size} round={round} />;
}
