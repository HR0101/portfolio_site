"use client";

import React, { createContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

// 新しい配色を広げ始める画面上の位置（ビューポート座標）
export interface ThemeRevealOrigin {
  x: number;
  y: number;
}

export interface ThemeContextType {
  theme: Theme;
  // origin を渡すと，その位置から新しい配色が円形に広がる（省略時は画面の中央から）
  toggleTheme: (origin?: ThemeRevealOrigin) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 円が画面の端まで広がりきる時間（ミリ秒）
const THEME_REVEAL_DURATION_MS = 1080;
// 広がり始めは速く，端に近づくほど静かに止める
const THEME_REVEAL_EASING = 'cubic-bezier(.22, 1, .36, 1)';
// 切り替えの間だけ <html> に付け，色のトランジションを止めるクラス
const THEME_SWITCHING_CLASS = 'is-theme-switching';
// 円で切り抜いて広げる層（ページ全体と，別の層で撮られるナビゲーション）
const THEME_REVEAL_LAYERS = ['::view-transition-new(root)', '::view-transition-new(site-navbar)'];

// 表示テーマを <html> のクラスへ反映する
function applyThemeClass(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// 円で広げる演出を使えるか（View Transitions API があり，動きを減らす設定でない）
function canRevealThemeChange(): boolean {
  return (
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// 切り替え前の画面を残したまま，新しい配色を起点から円形に広げて見せる
function revealThemeChange(commit: () => void, origin?: ThemeRevealOrigin): void {
  const root = document.documentElement;
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  // 起点から最も遠い画面の角までを半径にして，広がりきったときに隙間を残さない
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  root.classList.add(THEME_SWITCHING_CLASS);
  const transition = document.startViewTransition(commit);
  transition.ready
    .then(() => {
      // ナビゲーションは別の層で撮られるため，同じ円を重ねて広げる（画面の左上に固定されているので座標はそのまま使える）
      THEME_REVEAL_LAYERS.forEach((pseudoElement) => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: THEME_REVEAL_DURATION_MS, easing: THEME_REVEAL_EASING, pseudoElement },
        );
      });
    })
    .catch(() => {
      // 撮影に失敗しても配色の切り替え自体は commit で済んでいる
    });
  transition.finished.finally(() => root.classList.remove(THEME_SWITCHING_CLASS));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 白を基調とするため，デフォルトは light
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // 明示的に dark が保存されている場合のみダークモードで初期化する
    let initialTheme: Theme = 'light';
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        initialTheme = 'dark';
      }
    } catch {
      // localStorage が使えない環境ではデフォルト（ライト）のまま
    }
    setTheme(initialTheme);
  }, []);

  // 表示テーマを <html> のクラスへ反映する（保存はここでは行わない）．
  // 初期状態の 'dark' で localStorage を上書きしてしまい，
  // 保存済みの 'light' 設定がリロードのたびに失われるのを防ぐため，
  // 保存はユーザーが切り替えたときだけ行う．
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const toggleTheme = (origin?: ThemeRevealOrigin) => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // 保存できない場合は無視（表示の切り替えは継続）
    }

    if (!canRevealThemeChange()) {
      setTheme(nextTheme);
      return;
    }
    // 新しい画面を撮る前に，描画とクラスの反映を同期で済ませておく
    revealThemeChange(() => {
      flushSync(() => setTheme(nextTheme));
      applyThemeClass(nextTheme);
    }, origin);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
