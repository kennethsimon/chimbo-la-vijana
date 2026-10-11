"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "./ui";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button className={className || "h-9 w-9"} variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
