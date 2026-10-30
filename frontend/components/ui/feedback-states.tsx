"use client";

import React from "react";
import { AlertCircle, Inbox, LucideIcon, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageSkeletonProps {
  cards?: number;
  rows?: number;
  className?: string;
}

/** Layout-shaped placeholder so the page doesn't jump when real data arrives. */
export function PageSkeleton({ cards = 4, rows = 5, className }: PageSkeletonProps) {
  return (
    <div role="status" aria-label="Đang tải dữ liệu" className={cn("space-y-5", className)}>
      {cards > 0 && (
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-4",
            cards === 4 ? "xl:grid-cols-4" : cards === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
          )}
        >
          {Array.from({ length: cards }).map((_, idx) => (
            <div key={idx} className="crm-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="skeleton h-3.5 w-24" />
                <div className="skeleton h-8 w-8 rounded-lg" />
              </div>
              <div className="skeleton h-7 w-24" />
              <div className="skeleton h-3 w-36" />
            </div>
          ))}
        </div>
      )}

      {rows > 0 && (
        <div className="crm-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-56" />
            </div>
            <div className="skeleton h-8 w-28 rounded-lg" />
          </div>
          <div className="h-10 bg-slate-50 border-b border-slate-200" />
          <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, idx) => (
              <div key={idx} className="px-5 h-12 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="skeleton h-7 w-7 rounded-full shrink-0" />
                  <div className="skeleton h-3.5 flex-1 max-w-[280px]" />
                </div>
                <div className="skeleton h-5 w-20 rounded-md" />
                <div className="skeleton h-3.5 w-24 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      )}
      <span className="sr-only">Đang tải dữ liệu...</span>
    </div>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  /** Draw a dashed frame. Use only when the empty state stands alone (not inside a card). */
  bordered?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
  bordered = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        bordered && "rounded-xl border border-dashed border-slate-300 bg-white",
        compact ? "px-5 py-7" : "px-6 py-12",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center text-slate-400 mb-3",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <Icon className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"} />
      </div>
      <h3 className="text-card-title">{title}</h3>
      {description && (
        <p className="mt-1 text-[13px] text-slate-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  warningOnly?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Không thể tải dữ liệu",
  message,
  onRetry,
  isRetrying = false,
  warningOnly = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 animate-fade-in",
        warningOnly
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-rose-200 bg-rose-50 text-rose-900",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            warningOnly ? "text-amber-600" : "text-rose-600"
          )}
        />
        <div>
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="mt-0.5 text-xs opacity-90 leading-relaxed">{message}</p>
        </div>
      </div>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          isLoading={isRetrying}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Thử lại
        </Button>
      )}
    </div>
  );
}

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  containerClassName,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName, className)}>
      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) onChange("");
        }}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          aria-label="Xóa từ khóa tìm kiếm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
