import Image from "next/image";

import { cn } from "@/app/lib/utils";

interface IconBadgeProps {
  src: string;
  size?: number;
  tone?: "danger" | "primary";
  className?: string;
}

/** A small glowing icon tile — the halo behind it is what reads as "crafted" instead of flat. */
export function IconBadge({ src, size = 24, tone = "primary", className }: IconBadgeProps) {
  return (
    <div
      className={cn(
        "flex size-12 items-center justify-center rounded-[10px]",
        tone === "danger"
          ? "bg-danger-soft shadow-[0_0_22px_rgba(255,87,87,0.3)]"
          : "bg-primary/[0.13] shadow-[0_0_22px_rgba(75,80,230,0.4)]",
        className
      )}
    >
      <Image src={src} alt="" width={size} height={size} />
    </div>
  );
}
