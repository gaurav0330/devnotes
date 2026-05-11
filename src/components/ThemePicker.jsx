import { THEMES, useTheme } from "@/context/ThemeContext";
import { Moon, Sun, Palette } from "lucide-react";
import { useState } from "react";

export default function ThemePicker() {
  const { themeId, setTheme, isDark, toggleDark } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-2 rounded-xl border border-border/50 bg-card hover:bg-muted hover:border-primary/30 transition-all flex items-center gap-1.5 text-sm font-medium"
        title="Theme"
      >
        <Palette className="h-4 w-4 text-primary" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/10 p-4 animate-scale-in">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Choose Theme
            </p>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {THEMES.map((theme) => {
                const isActive = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    title={theme.name}
                    onClick={() => { setTheme(theme.id); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-xl border-2 ${
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-muted"
                    }`}
                  >
                    {theme.icon}
                    <span className="text-[9px] font-bold text-muted-foreground truncate w-full text-center leading-none">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border/50 pt-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isDark ? "Dark mode" : "Light mode"}
              </span>
              <button
                onClick={toggleDark}
                className={`relative h-8 w-14 rounded-full transition-colors border border-border/50 ${
                  isDark ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform ${
                    isDark ? "translate-x-6" : "translate-x-0"
                  }`}
                >
                  {isDark ? (
                    <Moon className="h-3 w-3 text-primary" />
                  ) : (
                    <Sun className="h-3 w-3 text-amber-500" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
