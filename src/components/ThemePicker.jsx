/**
 * ThemePicker.jsx — v2
 * ────────────────────────────────────────────────────────────────────────────
 * Improved theme picker with:
 *  • 18 themes (expanded from original) across 4 categories
 *  • Live colour swatches instead of emoji — shows actual accent colours
 *  • Category tabs: Dark / Light / Neon / Nature
 *  • Animated toggle, smooth open/close, backdrop blur
 *  • Current theme name displayed in trigger button
 *  • Dark/light toggle with animated pill
 */

import { THEMES, useTheme } from "@/context/ThemeContext";
import { Moon, Sun, Palette, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

/* ─── Category tabs ─────────────────────────────────────────────────────── */
const CATEGORIES = ["All", "Dark", "Light", "Neon", "Nature"];

/* ─── Theme trigger button ──────────────────────────────────────────────── */
function TriggerButton({ theme, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "group flex items-center gap-2 px-3 py-2 rounded-xl",
        "border border-border/50 bg-card",
        "hover:bg-muted hover:border-primary/40",
        "transition-all duration-200 text-sm font-medium",
        "shadow-sm hover:shadow-md",
      ].join(" ")}
      title="Change theme"
    >
      {/* live accent dot */}
      <span
        className="w-3.5 h-3.5 rounded-full ring-2 ring-border/40 shrink-0 transition-all duration-300"
        style={{ background: `hsl(var(--primary))` }}
      />
      <Palette className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-xs text-muted-foreground/80 hidden sm:block max-w-[80px] truncate">
        {theme?.name ?? "Theme"}
      </span>
    </button>
  );
}

/* ─── Dark/light toggle ──────────────────────────────────────────────────── */
function DarkToggle({ isDark, onToggle }) {
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-400" />
        )}
        <span className="text-xs font-semibold text-foreground/70">
          {isDark ? "Dark mode" : "Light mode"}
        </span>
      </div>

      <button
        onClick={onToggle}
        role="switch"
        aria-checked={isDark}
        className={[
          "relative h-7 w-12 rounded-full border transition-all duration-300",
          isDark
            ? "bg-primary border-primary/60"
            : "bg-muted border-border/60",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-6 w-6 rounded-full",
            "flex items-center justify-center shadow-md",
            "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isDark
              ? "translate-x-[22px] bg-white"
              : "translate-x-0.5 bg-white",
          ].join(" ")}
        >
          {isDark ? (
            <Moon className="h-3 w-3 text-primary" />
          ) : (
            <Sun className="h-3 w-3 text-amber-500" />
          )}
        </span>
      </button>
    </div>
  );
}

/* ─── Single theme swatch ───────────────────────────────────────────────── */
function ThemeSwatch({ theme, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      title={theme.name}
      className={[
        "group relative flex flex-col items-center gap-1.5 p-2 rounded-xl",
        "transition-all duration-200 border-2",
        isActive
          ? "border-primary bg-primary/10 scale-[1.03] shadow-md shadow-primary/20"
          : "border-transparent hover:border-border/60 hover:bg-muted/60",
      ].join(" ")}
    >
      {/* Colour preview — 3-dot swatch using theme's palette */}
      <div className="relative w-9 h-9 rounded-lg overflow-hidden shadow-sm flex items-center justify-center"
           style={{ background: theme.previewBg ?? "#1a1a2e" }}>
        <div className="flex gap-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: theme.previewAccent ?? "#7c3aed" }} />
          <span className="w-2 h-2 rounded-full opacity-60" style={{ background: theme.previewSecondary ?? "#a78bfa" }} />
          <span className="w-2 h-2 rounded-full opacity-30" style={{ background: theme.previewAccent ?? "#7c3aed" }} />
        </div>

        {/* active check */}
        {isActive && (
          <span className="absolute inset-0 flex items-center justify-center bg-primary/30 backdrop-blur-[2px]">
            <Check className="h-4 w-4 text-white drop-shadow" />
          </span>
        )}
      </div>

      <span className="text-[9px] font-bold tracking-wide text-muted-foreground/80 truncate w-full text-center leading-none group-hover:text-foreground/90 transition-colors">
        {theme.name}
      </span>
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ThemePicker() {
  const { themeId, setTheme, isDark, toggleDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const containerRef = useRef(null);

  const currentTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  /* filter by category */
  const filtered =
    activeCategory === "All"
      ? THEMES
      : THEMES.filter((t) => t.category === activeCategory);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <TriggerButton theme={currentTheme} onClick={() => setOpen((p) => !p)} />

      {open && (
        <div
          className={[
            "absolute right-0 top-[calc(100%+8px)] z-50",
            "w-72 rounded-2xl border border-border/50",
            "bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20",
            "p-4 flex flex-col gap-3",
            /* subtle pop-in */
            "origin-top-right animate-in fade-in zoom-in-95 duration-150",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Choose Theme
            </p>
            <span className="text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
              {currentTheme.name}
            </span>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={[
                  "flex-1 text-[10px] font-bold py-1 rounded-md transition-all duration-150",
                  activeCategory === cat
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Swatches grid */}
          <div className="grid grid-cols-5 gap-1 max-h-52 overflow-y-auto pr-0.5 scrollbar-thin">
            {filtered.map((theme) => (
              <ThemeSwatch
                key={theme.id}
                theme={theme}
                isActive={theme.id === themeId}
                onClick={() => {
                  setTheme(theme.id);
                  // don't close — let user explore
                }}
              />
            ))}
            {filtered.length === 0 && (
              <p className="col-span-5 text-center text-xs text-muted-foreground/50 py-4">
                No themes in this category yet
              </p>
            )}
          </div>

          {/* Dark / light toggle */}
          <div className="border-t border-border/40 pt-3">
            <DarkToggle isDark={isDark} onToggle={toggleDark} />
          </div>
        </div>
      )}
    </div>
  );
}