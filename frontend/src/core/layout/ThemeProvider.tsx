"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "tt-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const ORDER: ThemePreference[] = ["light", "dark", "system"];

interface ThemeContextValue {
  /** What the user chose (can be "system") */
  preference: ThemePreference;
  /** What is actually applied right now */
  theme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  /** Cycles Sáng → Tối → Theo hệ thống */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  theme: "light",
  setPreference: () => {},
  toggleTheme: () => {},
});

/* Tiny external store so React reads localStorage / matchMedia without an effect + setState,
   and hydration uses the server snapshot first (no mismatch). */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
  };
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

const readSystemDark = () => window.matchMedia(DARK_QUERY).matches;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);
  const systemDark = useSyncExternalStore(subscribe, readSystemDark, () => false);
  const theme: ResolvedTheme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  // The <head> bootstrap script already set the class before first paint; keep it in sync afterwards.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode): the choice still applies for this session via notify()
    }
    document.documentElement.classList.toggle(
      "dark",
      next === "dark" || (next === "system" && readSystemDark())
    );
    notify();
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(ORDER[(ORDER.indexOf(readPreference()) + 1) % ORDER.length]);
  }, [setPreference]);

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggleTheme }),
    [preference, theme, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
