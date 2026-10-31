import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import colors from "tailwindcss/colors";

/* ---------------------------------------------------------------------------
   DESIGN TOKENS
   Every themed colour is a CSS variable holding "R G B" channels so Tailwind
   opacity modifiers (bg-blue-50/60) keep working. Switching theme only swaps
   variable values on <html class="dark"> — no per-class overrides, no !important.

   Roles:  page · surface (cards) · elevated (dropdown/modal/toast) · border
           text · muted · primary · success · warning · danger · accent
   --------------------------------------------------------------------------- */

type Hex = string;
const toRgb = (hex: Hex): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const channels = (hex: Hex) => toRgb(hex).join(" ");
const mix = (base: Hex, tint: Hex, amount: number) => {
  const a = toRgb(base);
  const b = toRgb(tint);
  return a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount)).join(" ");
};

// ---- Brand / neutral palettes from the design brief --------------------------
const LIGHT = {
  page: "#F4F7FC",
  surface: "#FFFFFF",
  elevated: "#FFFFFF",
  surface2: "#EEF3FB",
  border: "#DCE5F2",
  text: "#0F172A",
  muted: "#52647F",
};
const DARK = {
  page: "#0B1120",
  surface: "#121C2F",
  elevated: "#1A2740",
  surface2: "#1A2740",
  border: "#2A3A55",
  text: "#E8EFFA",
  muted: "#A6B4CC",
};

// slate scale re-mapped onto those roles (50..950). Components keep using slate-*.
const SLATE_LIGHT: Record<string, Hex> = {
  50: "#F5F8FD",
  100: "#EEF3FB",
  200: "#DCE5F2",
  300: "#C3D0E4",
  400: "#7587A3",
  500: "#52647F",
  600: "#3D4F6B",
  700: "#2A3A55",
  800: "#172036",
  900: "#0F172A",
  950: "#0A1020",
};
const SLATE_DARK: Record<string, Hex> = {
  50: "#16223A",
  100: "#1A2740",
  200: "#2A3A55",
  300: "#3B4F73",
  400: "#8394B2",
  500: "#A6B4CC",
  600: "#BAC6DA",
  700: "#D0D9E8",
  800: "#E1E8F4",
  900: "#E8EFFA",
  950: "#F3F7FF",
};
// Solid "inverse" fills (toast, selected pill, image backdrops) must stay dark-ish in both themes.
const INK_LIGHT: Record<string, Hex> = { 700: "#2A3A55", 800: "#172036", 900: "#0F172A", 950: "#0A1020" };
const INK_DARK: Record<string, Hex> = { 700: "#31446A", 800: "#25344F", 900: "#22314F", 950: "#070C18" };

const SLATE_SHADES = Object.keys(SLATE_LIGHT);

// Hues used by status / KPI / accent colours.
const HUES = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "red",
  "violet",
  "cyan",
  "sky",
  "indigo",
  "orange",
  "green",
  "teal",
  "pink",
] as const;
type Hue = (typeof HUES)[number];
const palette = (hue: Hue) => colors[hue] as unknown as Record<string, Hex>;

const BG_SHADES = [50, 100, 200] as const;
const TX_SHADES = [500, 600, 700, 800, 900] as const;
const BD_SHADES = [100, 200, 300] as const;

const variable = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

function buildVars() {
  const light: Record<string, string> = {
    "--page": channels(LIGHT.page),
    "--surface": channels(LIGHT.surface),
    "--elevated": channels(LIGHT.elevated),
    "--primary": channels("#2563EB"),
    "--primary-hover": channels("#1D4ED8"),
    "--accent-violet": channels("#7C3AED"),
    "--accent-cyan": channels("#0891B2"),
    "color-scheme": "light",
  };
  const dark: Record<string, string> = {
    "--page": channels(DARK.page),
    "--surface": channels(DARK.surface),
    "--elevated": channels(DARK.elevated),
    "--accent-violet": channels("#A78BFA"),
    "--accent-cyan": channels("#22D3EE"),
    "color-scheme": "dark",
  };

  SLATE_SHADES.forEach((s) => {
    light[`--slate-${s}`] = channels(SLATE_LIGHT[s]);
    dark[`--slate-${s}`] = channels(SLATE_DARK[s]);
  });
  Object.keys(INK_LIGHT).forEach((s) => {
    light[`--ink-${s}`] = channels(INK_LIGHT[s]);
    dark[`--ink-${s}`] = channels(INK_DARK[s]);
  });

  HUES.forEach((hue) => {
    const p = palette(hue);
    const base500 = p[500];
    const darkSurface = DARK.surface;
    // tinted backgrounds (badges, tiles, alerts)
    BG_SHADES.forEach((s, i) => {
      light[`--bg-${hue}-${s}`] = channels(p[s]);
      dark[`--bg-${hue}-${s}`] = mix(darkSurface, base500, [0.14, 0.22, 0.32][i]);
    });
    // text on those tints
    const darkText: Record<number, Hex> = { 500: p[400], 600: p[400], 700: p[300], 800: p[200], 900: p[100] };
    TX_SHADES.forEach((s) => {
      light[`--tx-${hue}-${s}`] = channels(p[s]);
      dark[`--tx-${hue}-${s}`] = channels(darkText[s]);
    });
    // borders of those tints
    BD_SHADES.forEach((s, i) => {
      light[`--bd-${hue}-${s}`] = channels(p[s]);
      dark[`--bd-${hue}-${s}`] = mix(darkSurface, base500, [0.24, 0.36, 0.52][i]);
    });
  });

  // Brand-aware: text-blue-600/700 follow the (configurable) primary colour in light mode.
  light["--tx-blue-600"] = "var(--primary)";
  light["--tx-blue-700"] = "var(--primary-hover)";

  return { light, dark };
}

const { light: LIGHT_VARS, dark: DARK_VARS } = buildVars();

const slateColors = Object.fromEntries(SLATE_SHADES.map((s) => [s, variable(`--slate-${s}`)]));

const hueMap = (prefix: string, shades: readonly number[]) =>
  Object.fromEntries(
    HUES.map((hue) => [
      hue,
      Object.fromEntries(shades.map((s) => [s, variable(`--${prefix}-${hue}-${s}`)])),
    ])
  );

const bgHues = hueMap("bg", BG_SHADES);
const txHues = hueMap("tx", TX_SHADES);
const bdHues = hueMap("bd", BD_SHADES);

// "purple" is used across the code base for the violet accent
const withPurpleAlias = (m: Record<string, Record<string, string>>) => ({ ...m, purple: m.violet });

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: variable("--page"),
        foreground: variable("--slate-900"),
        page: variable("--page"),
        elevated: variable("--elevated"),
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        slate: slateColors,
        zinc: slateColors,
        gray: slateColors,
        neutral: slateColors,
        stone: slateColors,
        // Solid brand fills are driven by --primary so the admin "brand colour" setting applies everywhere.
        blue: { 600: variable("--primary"), 700: variable("--primary-hover") },
        violet: { 600: variable("--accent-violet") },
        purple: { 600: variable("--accent-violet") },
        cyan: { 600: variable("--accent-cyan") },
      },
      backgroundColor: {
        ...withPurpleAlias(bgHues),
        // `bg-white` is the card/surface colour; `text-white` is untouched.
        white: variable("--surface"),
        slate: {
          ...slateColors,
          700: variable("--ink-700"),
          800: variable("--ink-800"),
          900: variable("--ink-900"),
          950: variable("--ink-950"),
        },
      },
      textColor: withPurpleAlias(txHues),
      borderColor: withPurpleAlias(bdHues),
      // from-blue-50 / to-violet-50 … must follow the theme too (gradients ignore backgroundColor)
      gradientColorStops: withPurpleAlias(bgHues),
      fontFamily: {
        sans: ["'Inter'", "'Be Vietnam Pro'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        heading: ["'Inter'", "'Be Vietnam Pro'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        md: "6px",
        lg: "9px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        xs: "0 1px 2px 0 rgb(15 23 42 / 0.06)",
        subtle: "0 8px 24px -4px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.04)",
        floating: "0 16px 40px -8px rgb(15 23 42 / 0.16), 0 4px 12px -2px rgb(15 23 42 / 0.08)",
        node: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
      },
      keyframes: {
        "page-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sheet-in": {
          from: { transform: "translateX(24px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "dropdown-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bar-grow": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "page-in": "page-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 150ms ease-out both",
        "scale-in": "scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "sheet-in": "sheet-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-in": "toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "dropdown-in": "dropdown-in 140ms ease-out both",
        "bar-grow": "bar-grow 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": LIGHT_VARS,
        "html.dark": DARK_VARS,
      });
    }),
  ],
};

export default config;
