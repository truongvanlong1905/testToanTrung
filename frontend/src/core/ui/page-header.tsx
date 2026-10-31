"use client";

import React from "react";
import { cn } from "@/src/core/utils/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="text-overline text-blue-600 mb-1">{eyebrow}</p>}
        <h1 className="text-page-title">{title}</h1>
        {description && (
          <p className="mt-1 text-[13px] text-slate-500 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  count?: number | string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  count,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-section-title">{title}</h2>
          {count !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-600 kpi-number">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

