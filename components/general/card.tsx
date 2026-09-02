import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/app/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "surface" | "surface-alt";
  highlighted?: boolean;
  /** Skip the baseline hover lift — used when a card authors its own hover treatment. */
  noHover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { tone = "surface", highlighted = false, noHover = false, className, children, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-start gap-5 rounded-[12px] border p-8",
          tone === "surface" ? "bg-surface" : "bg-surface-alt",
          highlighted
            ? "border-primary shadow-[0px_0px_60px_rgba(75,80,230,0.45),0px_34px_80px_rgba(0,0,0,0.8)]"
            : "border-border",
          !noHover &&
            "transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/20",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
