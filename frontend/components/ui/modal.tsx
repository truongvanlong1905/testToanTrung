"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional segmented toggle or extra controls placed beside the close button */
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Disable backdrop/Esc close while a request is in-flight */
  preventClose?: boolean;
  bodyClassName?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Shared dialog: Esc to close, body scroll lock, backdrop click, consistent
 * header / scrollable body / sticky footer layout and entrance motion.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  size = "md",
  headerExtra,
  footer,
  children,
  preventClose = false,
  bodyClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !preventClose) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.classList.add("overflow-locked");
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.classList.remove("overflow-locked");
    };
  }, [open, onClose, preventClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !preventClose) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full bg-elevated border border-slate-200 shadow-floating flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl animate-scale-in",
          SIZE_CLASSES[size]
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-section-title truncate">{title}</h2>
              {description && <div className="text-caption mt-0.5">{description}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              disabled={preventClose}
              aria-label="Đóng hộp thoại"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={cn("flex-1 overflow-y-auto px-5 sm:px-6 py-5", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

