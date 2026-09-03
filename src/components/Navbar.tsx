"use client";

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GitHubIcon } from './icons/GitHubIcon';
import { siteConfig } from '../config/site';

// ナビゲーションリンクの定義
const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Apps' },
  { href: '#github', label: 'GitHub' },
  { href: '#contact', label: 'Contact' },
];

// この量（ピクセル）スクロールしたらヘッダーに背景を付ける
const SCROLL_THRESHOLD_PX = 16;

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  // スクロール中またはメニュー展開中は背景を不透明にする
  const headerBackgroundClass =
    isScrolled || isMenuOpen
      ? 'bg-white/80 dark:bg-night/80 backdrop-blur-md border-b border-slate-200/60 dark:border-night-border'
      : 'bg-transparent border-b border-transparent';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${headerBackgroundClass}`}
      data-testid="navbar"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ロゴ */}
        <a href="#hero" className="font-bold text-lg tracking-tight" onClick={closeMenu}>
          {siteConfig.displayName}
          <span className="text-sky-500">.</span>
        </a>

        {/* デスクトップ用ナビゲーション */}
        <nav className="hidden md:flex items-center gap-8" aria-label="メインナビゲーション">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub プロフィールを開く"
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-night-soft transition-colors"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
          <ThemeToggle />

          {/* モバイル用メニューボタン */}
          <button
            type="button"
            className="md:hidden p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-night-soft transition-colors"
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* モバイル用ドロップダウンメニュー */}
      {isMenuOpen && (
        <nav
          className="md:hidden border-t border-slate-200/60 dark:border-night-border bg-white/95 dark:bg-night/95 backdrop-blur-md"
          aria-label="モバイルナビゲーション"
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
