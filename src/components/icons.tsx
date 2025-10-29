import type { SVGAttributes } from "react";

function createIcon(path: string) {
  return function Icon({ className, ...props }: SVGAttributes<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className ?? "h-5 w-5"}
        {...props}
      >
        <path d={path} />
      </svg>
    );
  };
}

export const DashboardIcon = createIcon("M4 12h4v8H4zm6-8h4v16h-4zm6 5h4v11h-4z");
export const UsersIcon = createIcon("M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm6 10a5 5 0 0 0-10 0m12-15a3 3 0 1 1-3 3");
export const BriefcaseIcon = createIcon("M3 7h18v13H3zm5-3h8v3H8z");
export const CalendarIcon = createIcon("M6 3v2H4a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a2 2 0 0 0-2-2h-2V3m-6 8h5");
export const SettingsIcon = createIcon("M12 15.5a3.5 3.5 0 1 1 3.5-3.5 3.5 3.5 0 0 1-3.5 3.5Zm9-3.5a2 2 0 0 0-1.3-1.85l-.92-.36a2 2 0 0 1-1.18-1.3l-.28-.94a2 2 0 0 0-2-1.45h-1a2 2 0 0 0-2 1.45l-.3.94a2 2 0 0 1-1.17 1.3l-.92.36A2 2 0 0 0 3 12a2 2 0 0 0 1.3 1.85l.92.36a2 2 0 0 1 1.18 1.3l.28.94a2 2 0 0 0 2 1.45h1a2 2 0 0 0 2-1.45l.3-.94a2 2 0 0 1 1.17-1.3l.92-.36A2 2 0 0 0 21 12Z");
