"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/src/core/utils/utils";

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

const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

let activeScrollLocks = 0;

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  activeScrollLocks += 1;
  if (activeScrollLocks === 1) {
    document.body.classList.add("overflow-locked");
  }
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  activeScrollLocks = Math.max(0, activeScrollLocks - 1);
  if (activeScrollLocks === 0) {
    document.body.classList.remove("overflow-locked");
  }
}

export function recordModalOpenMetric(modalTitle: string, startMs: number): void {
  if (typeof window === "undefined" || typeof performance === "undefined") return;
  requestAnimationFrame(() => {
    const paintMs = Number((performance.now() - startMs).toFixed(2));
    const win = window as unknown as {
      __TT_MODAL_PERF__?: Array<{ title: string; paintMs: number; timestamp: string }>;
    };
    if (!Array.isArray(win.__TT_MODAL_PERF__)) {
      win.__TT_MODAL_PERF__ = [];
    }
    win.__TT_MODAL_PERF__.push({
      title: modalTitle,
      paintMs,
      timestamp: new Date().toISOString(),
    });
    if (win.__TT_MODAL_PERF__.length > 50) {
      win.__TT_MODAL_PERF__.shift();
    }
  });
}

/**
 * Shared dialog: Esc to close, ref-counted body scroll lock (0px layout shift),
 * focus management + focus trap + focus restoration, GPU-composited entrance motion
 * (transform + opacity only, no expensive full-screen backdrop-filter blur).
 */
export const Modal = React.memo(function Modal({
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    preventCloseRef.current = preventClose;
  }, [onClose, preventClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const openStartMs = typeof performance !== "undefined" ? performance.now() : 0;
    const previousFocused = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    recordModalOpenMetric(title, openStartMs);

    // Move focus inside dialog on next animation frame so initial paint is never blocked
    const rafId = requestAnimationFrame(() => {
      const container = dialogRef.current;
      if (!container) return;
      const firstInput = container.querySelector<HTMLElement>(
        '[data-autofocus], input:not([disabled]):not([type="hidden"]):not([type="file"]), textarea:not([disabled]), select:not([disabled])'
      );
      if (firstInput) {
        firstInput.focus({ preventScroll: true });
      } else {
        container.focus({ preventScroll: true });
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!preventCloseRef.current) {
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
      if (previousFocused && typeof previousFocused.focus === "function") {
        try {
          previousFocused.focus({ preventScroll: true });
        } catch {
          // Ignore if trigger element was unmounted
        }
      }
    };
  }, [open, title]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !preventClose) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "modal-panel w-full my-auto bg-elevated border border-slate-200 shadow-floating flex flex-col max-h-[86vh] overflow-hidden rounded-2xl animate-scale-in focus:outline-none",
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
              <h2 id={titleId} className="text-section-title truncate">
                {title}
              </h2>
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
    </div>,
    document.body
  );
});
