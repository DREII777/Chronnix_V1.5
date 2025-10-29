import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="h-full overflow-y-auto" {...props} />
    </div>
  );
}
