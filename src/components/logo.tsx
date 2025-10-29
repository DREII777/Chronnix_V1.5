"use client";

import type { SVGAttributes } from "react";

type LogoProps = SVGAttributes<SVGSVGElement> & {
  "data-theme"?: string;
};

export function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="Chronnix mark"
      shapeRendering="geometricPrecision"
      className={className}
      {...props}
    >
      <defs>
        <style>
          {`:root {
            --hex-fill: #FFFFFF;
            --hex-edge: #E7EAF0;
            --ink: #1E64F0;
            --ink-2: #2B6CF6;
            --shadow: rgba(16,24,40,0.12);
          }

          svg[data-theme="dark"] {
            --hex-fill: #0F1115;
            --hex-edge: #1C2129;
            --ink: #60A5FA;
            --ink-2: #3B82F6;
            --shadow: rgba(0,0,0,0.35);
          }`}
        </style>

        <path
          id="hexRounded"
          d="M512,128 L784,286 a48,48 0 0 1 24,41 V697 a48,48 0 0 1 -24,41 L512,896 240,738 a48,48 0 0 1 -24,-41 V327 a48,48 0 0 1 24,-41 Z"
        />

        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="var(--shadow)" floodOpacity="1" />
        </filter>

        <linearGradient id="inkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--ink)" />
          <stop offset="1" stopColor="var(--ink-2)" />
        </linearGradient>
      </defs>

      <use href="#hexRounded" fill="var(--hex-fill)" filter="url(#softShadow)" />
      <use
        href="#hexRounded"
        fill="none"
        stroke="var(--hex-edge)"
        strokeWidth="8"
        strokeLinejoin="round"
      />

      <path
        fill="url(#inkGrad)"
        d="M509.3 282.7c-1.2.2-3.4 1.8-4.8 3.4l-2.5 3.1v133.6l2.5 3c1.4 1.7 3.9 3.3 5.5 3.7 3.8.8 9.9-2 11.1-5.2.5-1.4.9-30.9.9-68.6 0-58.4-.2-66.5-1.6-68.5-1.5-2.2-6.5-5.3-8.1-5.1-.4.1-1.8.4-3 .6M318.4 392.5c-3 2-4.7 6.8-4 10.9 1 5.5-1.2 4 61.6 40.4 16.2 9.3 35.3 20.4 42.5 24.6 13.5 7.9 16.4 8.7 21.4 6.1 4.7-2.4 6.1-10.7 2.4-14.7-1.7-1.9-28.5-17.9-65.8-39.3-13.2-7.6-29.9-17.3-37.1-21.6-13.6-8.2-17.1-9.2-21-6.4m368.5 3.6c-4.6 2.8-25.1 14.9-45.5 26.9-65.5 38.6-62.4 36.4-62.4 43.4.1 7.4 6 11.6 13.1 9.2 1.9-.7 12.4-6.6 23.4-13.1s33.1-19.6 49-29c16-9.5 31.1-18.4 33.7-19.9 10.4-6 12.9-10.7 9.3-17.6-3.5-6.8-9.3-6.7-20.6.1m-184.7 69.5c-21.7 4.7-37.2 24.1-37.2 46.4 0 24.1 16.6 43.2 40.9 47 7.2 1.1 9 1 15.4-.5 36.9-8.7 50-53.4 23.4-79.9-7.2-7.3-14.2-11.2-23.6-13.2-7.9-1.6-10.7-1.6-18.9.2M398 567.6c-18.4 10.8-43.6 25.4-56 32.6-12.4 7.1-23.7 14.3-25.2 15.9-6 6.3-2.4 15.7 6.2 16.6 4.8.5 5.8 0 55-29.2 16-9.5 24.8-14.6 45.4-26.6 9.8-5.7 18.5-11.4 19.3-12.5 4.7-7.2 0-16.4-8.5-16.4-1.7 0-15 7.2-36.2 19.6m186.4-18.2c-3.7 1.6-6.6 7.2-5.6 10.7 1.4 4.7 2.9 5.9 18.2 14.7 27 15.5 55.8 32.1 77.7 44.8 21.2 12.4 24.6 13.8 29.8 11.8 2.1-.8 4.5-5.6 4.5-8.9 0-4.9-2.1-7.5-10-12.1-6.9-4.1-47.5-27.7-49.5-28.8-1.8-1-24-14-30.3-17.7-16.9-10-28-15.9-29.6-15.9-1.2.1-3.5.7-5.2 1.4m-76 44.6c-1.2.4-3.1 2.1-4.3 3.6-2.1 2.7-2.1 2.7-2.1 70v67.3l2.3 2.6c4.7 5.4 13.4 4.6 16.4-1.5 1.6-3.2 1.9-135 .3-138.1-1.2-2.2-6.1-4.9-8.7-4.8-1 0-2.8.4-3.9.9"
      />
    </svg>
  );
}
