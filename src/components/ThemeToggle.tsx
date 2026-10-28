"use client";

import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // ボタンの中心から新しい配色を広げる
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    toggleTheme({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      id="theme-toggle"
      data-testid="theme-toggle"
      aria-label={theme === 'light' ? 'ダークモードに切り替える' : 'ライトモードに切り替える'}
      className="group inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist dark:hover:bg-night-soft transition-colors"
    >
      {/* テーマが変わるたびに作り直し，回りながら入れ替わる */}
      <span key={theme} className="theme-toggle-icon" aria-hidden="true">
        {theme === 'light' ? (
          <Moon className="w-5 h-5 text-slate-800 group-hover:-rotate-[24deg] group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-90 group-hover:scale-110 transition-transform duration-500" />
        )}
      </span>
    </button>
  );
}
