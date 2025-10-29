import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string | null;
  actions?: ReactNode;
  helper?: ReactNode;
};

export function PageHeader({ title, description, actions, helper }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-slate-600">{description}</p> : null}
          {helper ? <div className="max-w-2xl text-xs text-slate-500">{helper}</div> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
