import * as React from "react";

import { cn } from "@/app/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-bold text-text", className)}
      dir="auto"
      {...props}
    />
  );
}

export { Label };
