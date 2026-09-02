function hashHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

interface HeroAvatarProps {
  name: string;
  size?: number;
  /** true = full circle (player avatars), false = 4px tile (hero-icon rows). */
  round?: boolean;
}

/**
 * A generated monogram tile instead of a hero portrait — Dota hero art is
 * Valve's IP, so every "avatar" here is code: a deterministic gradient
 * (hashed from the name) plus the initials, no image file at all. Also
 * doubles as a player avatar (round) since it's the same "no stock photo"
 * idea, just a different shape.
 */
export function HeroAvatar({ name, size = 24, round = false }: HeroAvatarProps) {
  const hue = hashHue(name);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-black text-white ${
        round ? "rounded-full" : "rounded-[4px]"
      }`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 45) % 360} 70% 32%))`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
