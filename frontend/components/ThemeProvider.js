"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("chimbo_theme");
    const initial = saved || "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  function setNextTheme(nextTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem("chimbo_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  const value = useMemo(() => ({
    theme,
    isDark: theme === "dark",
    toggleTheme: () => setNextTheme(theme === "dark" ? "light" : "dark"),
    setTheme: setNextTheme
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
