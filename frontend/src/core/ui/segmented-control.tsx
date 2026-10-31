"use client";

import React from "react";
import { cn } from "@/src/core/utils/utils";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  icon?: React.ReactNode;
  size?: "sm" | "md";
  ariaLabel?: string;
  className?: string;
}

/** Compact pill switcher used for date ranges, view modes and editor modes. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  icon,
  size = "md",
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-lg border border-slate-200/80 bg-slate-100 p-0.5",
        className
      )}
    >
      {icon && <span className="ml-2 mr-1 inline-flex text-slate-400">{icon}</span>}
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-all duration-150 cursor-pointer",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[12.5px]",
              active
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "rounded px-1.5 text-[11px] tabular-nums",
                  active ? "bg-slate-100 text-slate-700" : "text-slate-400"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface UnderlineTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T> & { icon?: React.ReactNode }>;
  trailing?: React.ReactNode;
  className?: string;
}

/** Page-level section tabs with an animated underline indicator. */
export function UnderlineTabs<T extends string>({
  value,
  onChange,
  options,
  trailing,
  className,
}: UnderlineTabsProps<T>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 border-b border-slate-200",
        className
      )}
    >
      <div role="tablist" className="flex items-center gap-5 overflow-x-auto -mb-px">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.id)}
              className={cn(
                "inline-flex items-center gap-2 pb-3 pt-1 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-colors duration-150 cursor-pointer",
                active
                  ? "border-blue-600 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              {opt.icon && (
                <span className={cn("inline-flex", active ? "text-blue-600" : "text-slate-400")}>
                  {opt.icon}
                </span>
              )}
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                    active ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {trailing && <div className="pb-2.5">{trailing}</div>}
    </div>
  );
}

