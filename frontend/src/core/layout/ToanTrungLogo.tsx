"use client";

import React from "react";
import { cn } from "@/src/core/utils/utils";

interface ToanTrungLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "light" | "dark" | "color";
}

export function ToanTrungLogo({
  className,
  size = "md",
  showText = true,
  variant = "color",
}: ToanTrungLogoProps) {
  const iconDimensions = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-8 h-8 rounded-lg",
    lg: "w-9 h-9 rounded-xl",
    xl: "w-11 h-11 rounded-xl",
  }[size];

  const textSizeClasses = {
    sm: "text-[13.5px]",
    md: "text-[14.5px]",
    lg: "text-base",
    xl: "text-lg",
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Royal-blue → navy tile: the brand anchor in both themes */}
      <div
        className={cn(
          iconDimensions,
          "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#2F6BFF] to-[#1E3A8A] shadow-card shrink-0"
        )}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M 18 28 H 54 V 38 H 41 V 74 H 31 V 38 H 18 Z" fill="#FFFFFF" />
          <path d="M 46 22 H 82 V 32 H 69 V 68 H 59 V 32 H 46 Z" fill="#93C5FD" />
          <circle cx="76" cy="73" r="4.5" fill="#22D3EE" />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "font-bold tracking-[-0.02em] leading-none truncate",
              textSizeClasses,
              variant === "light" ? "text-white" : "text-slate-900"
            )}
          >
            TOÀN TRUNG
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            CRM
          </span>
        </div>
      )}
    </div>
  );
}
