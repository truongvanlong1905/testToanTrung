"use client";

import React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error";

interface ToastProps {
  message: string | null;
  tone?: ToastTone;
  onDismiss?: () => void;
}

const ERROR_HINTS = ["không thể", "lỗi", "thất bại", "từ chối", "không tải", "không lưu", "không kết nối"];

/** Infer tone from Vietnamese message text when callers don't pass one explicitly. */
export function inferToastTone(message: string): ToastTone {
  const lower = message.toLowerCase();
  return ERROR_HINTS.some((hint) => lower.includes(hint)) ? "error" : "success";
}

/**
 * Single, consistently positioned toast used by every workspace view.
 * Sits below the 56px header so it never covers navigation.
 */
export function Toast({ message, tone, onDismiss }: ToastProps) {
  if (!message) return null;
  const resolvedTone = tone ?? inferToastTone(message);
  const Icon = resolvedTone === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      role={resolvedTone === "error" ? "alert" : "status"}
      aria-live="polite"
      className="fixed top-[68px] right-4 sm:right-6 z-[70] max-w-[calc(100vw-2rem)] sm:max-w-sm animate-toast-in"
    >
      <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-slate-900 py-2.5 pl-3 pr-2 text-[13px] text-white shadow-floating">
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            resolvedTone === "error" ? "text-rose-400" : "text-emerald-400"
          )}
        />
        <span className="flex-1 leading-snug">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Đóng thông báo"
            className="rounded p-0.5 text-slate-400 transition-colors hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

