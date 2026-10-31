"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/src/core/utils/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "subtle"
  | "ghost"
  | "danger"
  | "dangerOutline";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 active:bg-blue-800 shadow-[0_1px_2px_rgba(37,99,235,0.18)]",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300",
  subtle:
    "bg-slate-100 text-slate-700 border border-transparent hover:bg-slate-200/80 hover:text-slate-900",
  ghost:
    "bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 hover:border-rose-700",
  dangerOutline:
    "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-lg",
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-lg",
  lg: "h-10 px-4 text-sm gap-2 rounded-lg",
  icon: "h-9 w-9 p-0 rounded-lg justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

