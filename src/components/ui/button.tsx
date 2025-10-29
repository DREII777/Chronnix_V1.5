"use client";

import { cloneElement, forwardRef, isValidElement } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
};

const VARIANT_STYLES: Record<Variant, string> = {
  default: "bg-sky-500 text-white hover:bg-sky-400",
  secondary: "bg-sky-100 text-sky-700 hover:bg-sky-200",
  outline:
    "border border-sky-200 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-50",
  ghost: "text-sky-700 hover:bg-sky-50",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  link: "text-slate-900 underline-offset-4 hover:underline",
};

const SIZE_STYLES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 rounded-md px-3 text-xs",
  md: "h-10 rounded-md px-4 text-sm",
  lg: "h-12 rounded-lg px-5 text-base",
  icon: "h-10 w-10 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      type = "button",
      asChild = false,
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 disabled:pointer-events-none disabled:opacity-50",
      VARIANT_STYLES[variant],
      SIZE_STYLES[size],
      className,
    );

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;
      return cloneElement(child, {
        className: cn(child.props.className, classes),
        ...rest,
      });
    }

    return (
      <button ref={ref} type={type} className={classes} {...rest}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
