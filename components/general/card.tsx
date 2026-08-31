import type { HTMLAttributes } from "react";

import { cn } from "@/app/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "surface" | "surface-alt";
  highlighted?: boolean;
}

export function Card({
  tone = "surface",
  highlighted = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-5 rounded-[12px] border p-8",
        tone === "surface" ? "bg-surface" : "bg-surface-alt",
        highlighted
          ? "border-primary shadow-[0px_0px_60px_rgba(75,80,230,0.45),0px_34px_80px_rgba(0,0,0,0.8)]"
          : "border-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
