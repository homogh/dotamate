import { cn } from "@/app/lib/utils";

function hashHue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

interface GeneratedCoverProps {
  seed: string;
  className?: string;
}

/**
 * A generated banner instead of stock/hero photography — deterministic
 * gradient + grid texture hashed from the post slug, pure CSS, no image
 * file and nothing that could be mistaken for Valve's own art.
 */
export function GeneratedCover({ seed, className }: GeneratedCoverProps) {
  const hue = hashHue(seed);
  const hue2 = (hue + 55) % 360;

  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 20%), hsl(${hue2} 55% 12%))` }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 22% 25%, hsl(${hue} 75% 55% / 0.4), transparent 45%), radial-gradient(circle at 82% 78%, hsl(${hue2} 75% 55% / 0.3), transparent 50%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
    </div>
  );
}
