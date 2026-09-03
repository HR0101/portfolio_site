/* eslint-disable react-refresh/only-export-components */
"use client";

import React, { createContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ダークモードを基調とするため，デフォルトは dark
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // 明示的に light が保存されている場合のみライトモードで初期化する
    let initialTheme: Theme = 'dark';
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        initialTheme = 'light';
      }
    } catch {
      // localStorage が使えない環境ではデフォルト（ダーク）のまま
    }
    setTheme(initialTheme);
  }, []);

  // 表示テーマを <html> のクラスへ反映する（保存はここでは行わない）．
  // 初期状態の 'dark' で localStorage を上書きしてしまい，
  // 保存済みの 'light' 設定がリロードのたびに失われるのを防ぐため，
  // 保存はユーザーが切り替えたときだけ行う．
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // 保存できない場合は無視（表示の切り替えは継続）
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
