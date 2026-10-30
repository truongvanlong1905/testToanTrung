"use client";

import React from "react";
import { cn } from "@/lib/utils";

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
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  }[size];

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-2xl",
  }[size];

  const subTextSizeClasses = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-[11px]",
    xl: "text-xs",
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Biểu tượng LED Matrix & Viễn thông Toàn Trung */}
      <div
        className={cn(
          iconDimensions,
          "relative flex items-center justify-center rounded-xl overflow-hidden shadow-md shrink-0 transition-transform hover:scale-105 duration-200"
        )}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Nền gradient công nghệ LED cao cấp */}
          <defs>
            <linearGradient id="tt_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B3C95" />
              <stop offset="50%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="tt_red_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
            <filter id="led_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Vỏ màn hình LED bo góc */}
          <rect width="100" height="100" rx="22" fill="url(#tt_grad)" />

          {/* Viền bezel kim loại */}
          <rect
            x="3"
            y="3"
            width="94"
            height="94"
            rx="19"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
          />

          {/* Lưới LED ma trận chấm sáng công nghệ (Matrix Pixel Pitch) */}
          <g opacity="0.25">
            <circle cx="20" cy="20" r="2.5" fill="#60A5FA" />
            <circle cx="35" cy="20" r="2.5" fill="#60A5FA" />
            <circle cx="50" cy="20" r="2.5" fill="#60A5FA" />
            <circle cx="65" cy="20" r="2.5" fill="#60A5FA" />
            <circle cx="80" cy="20" r="2.5" fill="#60A5FA" />

            <circle cx="20" cy="35" r="2.5" fill="#60A5FA" />
            <circle cx="80" cy="35" r="2.5" fill="#60A5FA" />

            <circle cx="20" cy="65" r="2.5" fill="#60A5FA" />
            <circle cx="80" cy="65" r="2.5" fill="#60A5FA" />

            <circle cx="20" cy="80" r="2.5" fill="#60A5FA" />
            <circle cx="35" cy="80" r="2.5" fill="#60A5FA" />
            <circle cx="50" cy="80" r="2.5" fill="#60A5FA" />
            <circle cx="65" cy="80" r="2.5" fill="#60A5FA" />
            <circle cx="80" cy="80" r="2.5" fill="#60A5FA" />
          </g>

          {/* Biểu tượng Chữ TT cách điệu Màn hình LED 3D */}
          {/* Chữ T thứ nhất (Toàn) - Sắc đỏ LED thương hiệu Toàn Trung */}
          <path
            d="M 22 34 L 56 34 L 56 43 L 44 43 L 44 74 L 34 74 L 34 43 L 22 43 Z"
            fill="url(#tt_red_grad)"
            filter="url(#led_glow)"
          />

          {/* Chữ T thứ hai (Trung) - Sắc trắng bạc kết hợp góc vát công nghệ */}
          <path
            d="M 46 26 L 80 26 L 80 35 L 68 35 L 68 66 L 58 66 L 58 35 L 46 35 Z"
            fill="#FFFFFF"
            filter="url(#led_glow)"
          />

          {/* Đèn báo LED Pixel Active - Đỏ/Xanh/Gold */}
          <circle cx="78" cy="74" r="4.5" fill="#F59E0B" filter="url(#led_glow)" />
          <circle cx="78" cy="74" r="2" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography thương hiệu Toàn Trung */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-black tracking-tight leading-none uppercase font-heading",
                textSizeClasses,
                variant === "light"
                  ? "text-white"
                  : "text-slate-900 dark:text-white"
              )}
              style={{ letterSpacing: "-0.03em" }}
            >
              <span className="text-[#DC2626]">TOÀN</span>{" "}
              <span className={variant === "light" ? "text-white" : "text-[#1E40AF] dark:text-blue-400"}>
                TRUNG
              </span>
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <span
            className={cn(
              "font-semibold tracking-wider uppercase leading-none mt-1",
              subTextSizeClasses,
              variant === "light"
                ? "text-blue-200"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            Telecom & LED Display
          </span>
        </div>
      )}
    </div>
  );
}

