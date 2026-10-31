"use client";

import React from "react";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/src/core/utils/utils";
import { BadgeTone, StatusBadge } from "@/src/core/ui/badge";

export type StatTone = "blue" | "violet" | "amber" | "emerald" | "rose" | "cyan" | "slate";

interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  note?: string;
  icon?: LucideIcon;
  iconTone?: StatTone;
  badgeText?: string;
  badgeTone?: BadgeTone;
  isEmpty?: boolean;
  /** Real ratio 0–100 rendered as a thin bar under the value (never pass invented numbers) */
  progress?: number;
  /** Makes the card a drill-down button (e.g. open Lead list filtered by status) */
  onClick?: () => void;
  actionHint?: string;
  /** Only meaningful together with onClick: this card's filter is currently applied */
  active?: boolean;
  className?: string;
}

interface ToneStyle {
  tile: string;
  bar: string;
  activeRing: string;
  /** CSS-variable hue name used for the accent line and soft corner glow (theme-aware) */
  hue: string;
}

const TONES: Record<StatTone, ToneStyle> = {
  blue: {
    tile: "bg-blue-100 text-blue-600 border-blue-200",
    bar: "bg-blue-600",
    activeRing: "border-blue-400 ring-2 ring-blue-600/15",
    hue: "blue",
  },
  violet: {
    tile: "bg-violet-100 text-violet-600 border-violet-200",
    bar: "bg-violet-600",
    activeRing: "border-violet-400 ring-2 ring-violet-600/15",
    hue: "violet",
  },
  amber: {
    tile: "bg-amber-100 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
    activeRing: "border-amber-400 ring-2 ring-amber-500/20",
    hue: "amber",
  },
  emerald: {
    tile: "bg-emerald-100 text-emerald-600 border-emerald-200",
    bar: "bg-emerald-500",
    activeRing: "border-emerald-400 ring-2 ring-emerald-500/20",
    hue: "emerald",
  },
  rose: {
    tile: "bg-rose-100 text-rose-600 border-rose-200",
    bar: "bg-rose-500",
    activeRing: "border-rose-400 ring-2 ring-rose-500/20",
    hue: "rose",
  },
  cyan: {
    tile: "bg-cyan-100 text-cyan-600 border-cyan-200",
    bar: "bg-cyan-600",
    activeRing: "border-cyan-400 ring-2 ring-cyan-600/20",
    hue: "cyan",
  },
  slate: {
    tile: "bg-slate-100 text-slate-600 border-slate-200",
    bar: "bg-slate-500",
    activeRing: "border-slate-400 ring-2 ring-slate-500/15",
    hue: "slate",
  },
};

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  iconTone = "slate",
  badgeText,
  badgeTone = "neutral",
  isEmpty = false,
  progress,
  onClick,
  actionHint,
  active = false,
  className,
}: StatCardProps) {
  const tone = TONES[iconTone];
  const hasValue =
    !isEmpty && value !== null && value !== undefined && String(value).trim() !== "";
  const isInteractive = Boolean(onClick);

  // slate has no --bg-slate-* variable; it maps onto the neutral scale
  const glowVar = tone.hue === "slate" ? "--slate-100" : `--bg-${tone.hue}-100`;
  const accentVar = tone.hue === "slate" ? "--slate-400" : `--tx-${tone.hue}-600`;

  const body = (
    <>
      {/* theme-aware decoration: a coloured top line and a soft corner tint (pure CSS vars, no blur) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, rgb(var(${accentVar})), rgb(var(${accentVar}) / 0.35))` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 100% 0%, rgb(var(${glowVar}) / 0.85) 0, transparent 58%)` }}
      />

      <div className="relative flex items-center justify-between gap-2 sm:gap-3">
        <span className="text-xs sm:text-[12.5px] font-semibold text-slate-600 truncate">{label}</span>
        {Icon && (
          <div
            className={cn(
              "h-7 w-7 sm:h-9 sm:w-9 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-150",
              isInteractive && "group-hover:scale-105",
              tone.tile
            )}
          >
            <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </div>
        )}
      </div>

      <div className="relative mt-2 sm:mt-3 flex flex-wrap items-end justify-between gap-1.5 sm:gap-2 min-h-[28px] sm:min-h-[34px]">
        {hasValue ? (
          <p className="text-[22px] sm:text-[30px] font-bold tracking-[-0.035em] text-slate-900 kpi-number leading-none">
            {value}
          </p>
        ) : (
          <p className="text-[13px] sm:text-[14px] font-medium text-slate-500 leading-snug">Chưa có dữ liệu</p>
        )}

        {badgeText && (
          <StatusBadge tone={badgeTone} dot={false} size="sm">
            {badgeText}
          </StatusBadge>
        )}
      </div>

      {hasValue && typeof progress === "number" && (
        <div className="relative mt-2.5 sm:mt-3.5 h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
          <div
            className={cn("h-full rounded-full origin-left animate-bar-grow", tone.bar)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {(note || (isInteractive && actionHint)) && (
        <div className="relative mt-2 sm:mt-3 flex items-center justify-between gap-2">
          {note && (
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed truncate" title={note}>
              {note}
            </p>
          )}
          {isInteractive && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-blue-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 transition-all duration-150 shrink-0">
              {actionHint || "Xem"}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "group relative overflow-hidden text-left w-full p-3.5 sm:p-5 crm-card-interactive",
          active && tone.activeRing,
          className
        )}
      >
        {body}
      </button>
    );
  }

  // No action → no hover/selected affordance
  return <div className={cn("relative overflow-hidden crm-card p-3.5 sm:p-5", className)}>{body}</div>;
}
