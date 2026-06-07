import React, {
  useState,
  useEffect,
  useCallback,
} from "react";
import { THEMES } from "./themes";
import { ThemeContext } from "./ThemeContext";

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
export default ThemeProvider;
