"use client";

import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-toggle"
      data-testid="theme-toggle"
      aria-label={theme === 'light' ? 'ダークモードに切り替える' : 'ライトモードに切り替える'}
      className="group inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist dark:hover:bg-night-soft transition-colors"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-slate-800 group-hover:rotate-[360deg] group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-[360deg] group-hover:scale-110 transition-transform duration-500" />
      )}
    </button>
  );
}
