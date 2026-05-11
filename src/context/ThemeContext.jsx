import { createContext, useContext, useEffect, useState } from "react";

// Available themes
export const THEMES = [
  {
    id: "default",
    name: "Blueberry",
    icon: "🫐",
    vars: {
      "--background": "226 40% 98%",
      "--foreground": "224 71.4% 4%",
      "--primary": "250 84% 54%",
      "--primary-foreground": "210 40% 98%",
      "--card": "0 0% 100%",
      "--card-foreground": "224 71.4% 4%",
      "--muted": "250 40% 96%",
      "--muted-foreground": "226 15% 45%",
      "--border": "226 30% 90%",
      "--input": "226 30% 90%",
    },
    dark: {
      "--background": "240 10% 4%",
      "--foreground": "210 40% 98%",
      "--primary": "250 100% 75%",
      "--primary-foreground": "222.2 47.4% 11.2%",
      "--card": "240 10% 7%",
      "--card-foreground": "210 40% 98%",
      "--muted": "240 10% 10%",
      "--muted-foreground": "215 20.2% 65.1%",
      "--border": "240 10% 14%",
      "--input": "240 10% 14%",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    icon: "🧛",
    vars: {
      "--background": "231 15% 96%",
      "--foreground": "231 20% 15%",
      "--primary": "265 89% 68%",
      "--primary-foreground": "0 0% 100%",
      "--card": "0 0% 100%",
      "--card-foreground": "231 20% 15%",
      "--muted": "231 15% 92%",
      "--muted-foreground": "231 10% 45%",
      "--border": "231 20% 85%",
      "--input": "231 20% 85%",
    },
    dark: {
      "--background": "231 15% 11%",
      "--foreground": "60 30% 96%",
      "--primary": "265 89% 78%",
      "--primary-foreground": "231 15% 11%",
      "--card": "231 15% 14%",
      "--card-foreground": "60 30% 96%",
      "--muted": "231 15% 18%",
      "--muted-foreground": "231 10% 60%",
      "--border": "231 15% 22%",
      "--input": "231 15% 22%",
    },
  },
  {
    id: "nord",
    name: "Nord",
    icon: "❄️",
    vars: {
      "--background": "218 27% 97%",
      "--foreground": "220 16% 22%",
      "--primary": "213 75% 55%",
      "--primary-foreground": "0 0% 100%",
      "--card": "0 0% 100%",
      "--card-foreground": "220 16% 22%",
      "--muted": "218 27% 93%",
      "--muted-foreground": "220 10% 46%",
      "--border": "218 27% 87%",
      "--input": "218 27% 87%",
    },
    dark: {
      "--background": "220 16% 14%",
      "--foreground": "218 27% 92%",
      "--primary": "213 75% 65%",
      "--primary-foreground": "220 16% 14%",
      "--card": "220 16% 18%",
      "--card-foreground": "218 27% 92%",
      "--muted": "220 16% 22%",
      "--muted-foreground": "218 20% 58%",
      "--border": "220 16% 26%",
      "--input": "220 16% 26%",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    icon: "💚",
    vars: {
      "--background": "150 40% 98%",
      "--foreground": "150 50% 5%",
      "--primary": "160 84% 39%",
      "--primary-foreground": "0 0% 100%",
      "--card": "0 0% 100%",
      "--card-foreground": "150 50% 5%",
      "--muted": "150 30% 94%",
      "--muted-foreground": "150 15% 40%",
      "--border": "150 25% 88%",
      "--input": "150 25% 88%",
    },
    dark: {
      "--background": "150 15% 6%",
      "--foreground": "150 30% 95%",
      "--primary": "160 84% 55%",
      "--primary-foreground": "150 15% 6%",
      "--card": "150 15% 10%",
      "--card-foreground": "150 30% 95%",
      "--muted": "150 15% 14%",
      "--muted-foreground": "150 15% 55%",
      "--border": "150 15% 18%",
      "--input": "150 15% 18%",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    icon: "🌅",
    vars: {
      "--background": "20 40% 98%",
      "--foreground": "20 50% 8%",
      "--primary": "24 95% 55%",
      "--primary-foreground": "0 0% 100%",
      "--card": "0 0% 100%",
      "--card-foreground": "20 50% 8%",
      "--muted": "20 30% 94%",
      "--muted-foreground": "20 15% 42%",
      "--border": "20 25% 87%",
      "--input": "20 25% 87%",
    },
    dark: {
      "--background": "20 20% 7%",
      "--foreground": "20 30% 95%",
      "--primary": "24 95% 60%",
      "--primary-foreground": "20 20% 7%",
      "--card": "20 20% 11%",
      "--card-foreground": "20 30% 95%",
      "--muted": "20 20% 15%",
      "--muted-foreground": "20 15% 55%",
      "--border": "20 20% 19%",
      "--input": "20 20% 19%",
    },
  },
];

const ThemeContext = createContext();

function applyTheme(theme, isDark) {
  const root = document.documentElement;
  const vars = isDark ? { ...theme.vars, ...theme.dark } : theme.vars;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState(() => localStorage.getItem("dn-theme") || "default");
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("dn-dark");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const currentTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  useEffect(() => {
    applyTheme(currentTheme, isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [currentTheme, isDark]);

  const setTheme = (id) => {
    setThemeId(id);
    localStorage.setItem("dn-theme", id);
  };

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("dn-dark", String(next));
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ themeId, setTheme, isDark, toggleDark, themes: THEMES, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
