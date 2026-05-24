/**
 * ThemeContext.jsx — v2
 * ────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   THEMES          — array of all theme definitions
 *   ThemeProvider   — wraps the app, applies CSS vars + dark class
 *   useTheme()      — { themeId, setTheme, isDark, toggleDark, currentTheme }
 *
 * Each theme defines:
 *   id              — unique string key
 *   name            — display name
 *   category        — "Dark" | "Light" | "Neon" | "Nature"
 *   previewBg       — hex/hsl for the swatch background in ThemePicker
 *   previewAccent   — hex/hsl for the primary accent dot
 *   previewSecondary— hex/hsl for the secondary dot
 *   vars            — CSS custom property overrides (HSL values only, no wrapping hsl())
 *
 * HOW IT WORKS
 * The provider injects a <style> tag with :root { --primary: ...; ... }
 * overrides. Your global CSS must consume these vars via hsl(var(--primary)).
 * The "dark" class on <html> is toggled for Tailwind dark-mode variants.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

/* ════════════════════════════════════════════════════════════════════════════
   THEME DEFINITIONS
   ════════════════════════════════════════════════════════════════════════════ */

export const THEMES = [
  /* ── DARK ──────────────────────────────────────────────────────────────── */
  {
    id: "midnight",
    name: "Midnight",
    category: "Dark",
    previewBg: "#0f0f1a",
    previewAccent: "#7c3aed",
    previewSecondary: "#a78bfa",
    vars: {
      "--background": "240 10% 4%",
      "--foreground": "240 5% 96%",
      "--card": "240 10% 7%",
      "--card-foreground": "240 5% 96%",
      "--muted": "240 6% 13%",
      "--muted-foreground": "240 5% 55%",
      "--border": "240 6% 16%",
      "--primary": "263 70% 58%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "263 70% 58%",
    },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    category: "Dark",
    previewBg: "#111111",
    previewAccent: "#3b82f6",
    previewSecondary: "#60a5fa",
    vars: {
      "--background": "0 0% 5%",
      "--foreground": "0 0% 95%",
      "--card": "0 0% 8%",
      "--card-foreground": "0 0% 95%",
      "--muted": "0 0% 13%",
      "--muted-foreground": "0 0% 52%",
      "--border": "0 0% 16%",
      "--primary": "217 91% 60%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "217 91% 60%",
    },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    category: "Dark",
    previewBg: "#1c1c1e",
    previewAccent: "#ff6b35",
    previewSecondary: "#ff9a76",
    vars: {
      "--background": "0 0% 10%",
      "--foreground": "0 0% 93%",
      "--card": "0 0% 13%",
      "--card-foreground": "0 0% 93%",
      "--muted": "0 0% 18%",
      "--muted-foreground": "0 0% 55%",
      "--border": "0 0% 20%",
      "--primary": "20 100% 60%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "20 100% 60%",
    },
  },
  {
    id: "slate-dark",
    name: "Slate",
    category: "Dark",
    previewBg: "#0f172a",
    previewAccent: "#38bdf8",
    previewSecondary: "#7dd3fc",
    vars: {
      "--background": "222 47% 7%",
      "--foreground": "210 40% 96%",
      "--card": "222 47% 10%",
      "--card-foreground": "210 40% 96%",
      "--muted": "217 33% 15%",
      "--muted-foreground": "215 20% 55%",
      "--border": "217 33% 18%",
      "--primary": "199 89% 60%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "199 89% 60%",
    },
  },
  {
    id: "storm",
    name: "Storm",
    category: "Dark",
    previewBg: "#13111c",
    previewAccent: "#e879f9",
    previewSecondary: "#f0abfc",
    vars: {
      "--background": "262 28% 8%",
      "--foreground": "280 10% 95%",
      "--card": "262 28% 11%",
      "--card-foreground": "280 10% 95%",
      "--muted": "262 20% 17%",
      "--muted-foreground": "262 10% 55%",
      "--border": "262 20% 20%",
      "--primary": "292 91% 73%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "292 91% 73%",
    },
  },
  {
    id: "carbon",
    name: "Carbon",
    category: "Dark",
    previewBg: "#161616",
    previewAccent: "#42be65",
    previewSecondary: "#6fdc8c",
    vars: {
      "--background": "0 0% 8%",
      "--foreground": "0 0% 92%",
      "--card": "0 0% 10%",
      "--card-foreground": "0 0% 92%",
      "--muted": "0 0% 15%",
      "--muted-foreground": "0 0% 52%",
      "--border": "0 0% 18%",
      "--primary": "134 61% 41%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "134 61% 41%",
    },
  },

  /* ── LIGHT ──────────────────────────────────────────────────────────────── */
  {
    id: "pearl",
    name: "Pearl",
    category: "Light",
    previewBg: "#fafafa",
    previewAccent: "#7c3aed",
    previewSecondary: "#a78bfa",
    vars: {
      "--background": "0 0% 98%",
      "--foreground": "240 10% 8%",
      "--card": "0 0% 100%",
      "--card-foreground": "240 10% 8%",
      "--muted": "240 5% 93%",
      "--muted-foreground": "240 4% 46%",
      "--border": "240 6% 88%",
      "--primary": "263 70% 52%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "263 70% 52%",
    },
  },
  {
    id: "cream",
    name: "Cream",
    category: "Light",
    previewBg: "#fdf8f0",
    previewAccent: "#d97706",
    previewSecondary: "#f59e0b",
    vars: {
      "--background": "40 60% 97%",
      "--foreground": "30 20% 12%",
      "--card": "40 60% 99%",
      "--card-foreground": "30 20% 12%",
      "--muted": "40 30% 92%",
      "--muted-foreground": "30 10% 46%",
      "--border": "40 20% 86%",
      "--primary": "38 92% 50%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "38 92% 50%",
    },
  },
  {
    id: "arctic",
    name: "Arctic",
    category: "Light",
    previewBg: "#f0f7ff",
    previewAccent: "#0ea5e9",
    previewSecondary: "#38bdf8",
    vars: {
      "--background": "210 60% 97%",
      "--foreground": "212 40% 10%",
      "--card": "210 60% 100%",
      "--card-foreground": "212 40% 10%",
      "--muted": "210 30% 92%",
      "--muted-foreground": "210 15% 46%",
      "--border": "210 25% 86%",
      "--primary": "199 89% 48%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "199 89% 48%",
    },
  },
  {
    id: "rose-light",
    name: "Rosé",
    category: "Light",
    previewBg: "#fff5f5",
    previewAccent: "#e11d48",
    previewSecondary: "#fb7185",
    vars: {
      "--background": "350 60% 98%",
      "--foreground": "340 20% 10%",
      "--card": "350 60% 100%",
      "--card-foreground": "340 20% 10%",
      "--muted": "350 30% 93%",
      "--muted-foreground": "340 10% 46%",
      "--border": "350 20% 88%",
      "--primary": "346 77% 49%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "346 77% 49%",
    },
  },

  /* ── NEON ───────────────────────────────────────────────────────────────── */
  {
    id: "neon-violet",
    name: "Synthwave",
    category: "Neon",
    previewBg: "#0d0015",
    previewAccent: "#bf00ff",
    previewSecondary: "#ff00c8",
    vars: {
      "--background": "280 100% 4%",
      "--foreground": "290 30% 95%",
      "--card": "280 100% 7%",
      "--card-foreground": "290 30% 95%",
      "--muted": "280 50% 12%",
      "--muted-foreground": "280 20% 55%",
      "--border": "280 50% 18%",
      "--primary": "288 100% 50%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "288 100% 50%",
    },
  },
  {
    id: "neon-cyan",
    name: "Cyberwave",
    category: "Neon",
    previewBg: "#000d1a",
    previewAccent: "#00ffff",
    previewSecondary: "#00bfff",
    vars: {
      "--background": "210 100% 4%",
      "--foreground": "195 50% 95%",
      "--card": "210 100% 7%",
      "--card-foreground": "195 50% 95%",
      "--muted": "210 50% 12%",
      "--muted-foreground": "210 20% 55%",
      "--border": "210 50% 18%",
      "--primary": "180 100% 50%",
      "--primary-foreground": "210 100% 4%",
      "--ring": "180 100% 50%",
    },
  },
  {
    id: "neon-green",
    name: "Matrix",
    category: "Neon",
    previewBg: "#000a00",
    previewAccent: "#00ff41",
    previewSecondary: "#39ff14",
    vars: {
      "--background": "120 100% 2%",
      "--foreground": "120 60% 90%",
      "--card": "120 100% 4%",
      "--card-foreground": "120 60% 90%",
      "--muted": "120 50% 9%",
      "--muted-foreground": "120 20% 50%",
      "--border": "120 50% 14%",
      "--primary": "127 100% 50%",
      "--primary-foreground": "120 100% 2%",
      "--ring": "127 100% 50%",
    },
  },
  {
    id: "neon-orange",
    name: "Ember",
    category: "Neon",
    previewBg: "#0d0500",
    previewAccent: "#ff6200",
    previewSecondary: "#ff8c00",
    vars: {
      "--background": "20 100% 3%",
      "--foreground": "30 50% 95%",
      "--card": "20 100% 5%",
      "--card-foreground": "30 50% 95%",
      "--muted": "20 50% 10%",
      "--muted-foreground": "20 20% 52%",
      "--border": "20 50% 15%",
      "--primary": "24 100% 50%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "24 100% 50%",
    },
  },

  /* ── NATURE ─────────────────────────────────────────────────────────────── */
  {
    id: "forest",
    name: "Forest",
    category: "Nature",
    previewBg: "#0c1a10",
    previewAccent: "#22c55e",
    previewSecondary: "#4ade80",
    vars: {
      "--background": "150 30% 6%",
      "--foreground": "140 15% 92%",
      "--card": "150 30% 9%",
      "--card-foreground": "140 15% 92%",
      "--muted": "150 20% 14%",
      "--muted-foreground": "150 10% 52%",
      "--border": "150 20% 18%",
      "--primary": "142 71% 45%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "142 71% 45%",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    category: "Nature",
    previewBg: "#051525",
    previewAccent: "#06b6d4",
    previewSecondary: "#22d3ee",
    vars: {
      "--background": "210 70% 7%",
      "--foreground": "200 30% 93%",
      "--card": "210 70% 10%",
      "--card-foreground": "200 30% 93%",
      "--muted": "210 40% 15%",
      "--muted-foreground": "210 15% 52%",
      "--border": "210 40% 19%",
      "--primary": "189 94% 43%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "189 94% 43%",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    category: "Nature",
    previewBg: "#1a0a00",
    previewAccent: "#f97316",
    previewSecondary: "#fb923c",
    vars: {
      "--background": "20 60% 5%",
      "--foreground": "30 30% 93%",
      "--card": "20 60% 8%",
      "--card-foreground": "30 30% 93%",
      "--muted": "20 30% 13%",
      "--muted-foreground": "20 10% 52%",
      "--border": "20 30% 17%",
      "--primary": "22 95% 53%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "22 95% 53%",
    },
  },
  {
    id: "sakura",
    name: "Sakura",
    category: "Nature",
    previewBg: "#1a0a10",
    previewAccent: "#f472b6",
    previewSecondary: "#fb7185",
    vars: {
      "--background": "340 40% 6%",
      "--foreground": "340 20% 93%",
      "--card": "340 40% 9%",
      "--card-foreground": "340 20% 93%",
      "--muted": "340 20% 14%",
      "--muted-foreground": "340 10% 52%",
      "--border": "340 20% 18%",
      "--primary": "322 81% 70%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "322 81% 70%",
    },
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   CONTEXT
   ════════════════════════════════════════════════════════════════════════════ */

const ThemeContext = createContext(null);

const STORAGE_KEY_THEME = "app-theme-id";
const STORAGE_KEY_DARK  = "app-theme-dark";

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(
    () => localStorage.getItem(STORAGE_KEY_THEME) ?? "midnight"
  );
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem(STORAGE_KEY_DARK) !== "false"
  );

  const currentTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  /* Apply CSS variables + dark class */
  useEffect(() => {
    const root = document.documentElement;

    // dark class
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // inject theme vars
    const entries = Object.entries(currentTheme.vars ?? {});
    entries.forEach(([prop, val]) => root.style.setProperty(prop, val));

    // cleanup: remove vars when theme changes
    return () => {
      entries.forEach(([prop]) => root.style.removeProperty(prop));
    };
  }, [themeId, isDark, currentTheme]);

  const setTheme = useCallback((id) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY_THEME, id);
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_DARK, String(next));
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{ themeId, setTheme, isDark, toggleDark, currentTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}