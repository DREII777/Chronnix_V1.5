import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  initials?: string;
};

export function Avatar({ className, initials, children, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700",
        className,
      )}
      {...props}
    >
      {children ?? initials ?? ""}
    </div>
  );
}
