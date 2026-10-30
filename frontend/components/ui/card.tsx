"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = false, className, children, ...props }: CardProps) {
  return (
    <div className={cn("crm-card", padded && "p-5", className)} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  count?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  /** Render a divider below (used above tables / lists) */
  divided?: boolean;
  className?: string;
}

/** Consistent header for cards that wrap a table, list or chart. */
export function CardHeader({
  title,
  description,
  count,
  actions,
  icon,
  divided = true,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        divided ? "px-5 py-4 border-b border-slate-200/80" : "",
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-section-title truncate">{title}</h2>
            {count !== undefined && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                {count}
              </span>
            )}
          </div>
          {description && <p className="text-caption mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

