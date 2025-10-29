import { cn } from "@/lib/utils";

type HintProps = {
  label: string;
  className?: string;
};

export function Hint({ label, className }: HintProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white shadow-sm",
        className,
      )}
    >
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden />
      {label}
    </span>
  );
}
