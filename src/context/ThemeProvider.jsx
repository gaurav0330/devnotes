import React, {
  useEffect,
} from "react";
import { THEMES } from "./themes";
import { ThemeContext } from "./ThemeContext";
import { usePreferences } from "./PreferencesContext";

export function ThemeProvider({ children }) {
  const { themeId, setThemeId, darkMode: isDark, toggleDarkMode } = usePreferences();

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

  const setTheme = setThemeId;
  const toggleDark = toggleDarkMode;

  return (
    <ThemeContext.Provider
      value={{ themeId, setTheme, isDark, toggleDark, currentTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeProvider;
