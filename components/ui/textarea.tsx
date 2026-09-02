import * as React from "react";

import { cn } from "@/app/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-32 w-full resize-y rounded-[8px] border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-dim",
        "transition-colors focus-visible:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
