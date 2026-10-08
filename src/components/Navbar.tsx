"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GitHubIcon } from './icons/GitHubIcon';
import { siteConfig } from '../config/site';
import { useActiveSection } from '../hooks/useActiveSection';
import { subscribeToScroll } from '../lib/scrollObserver';

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
  const isHome = usePathname() === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // スクロールに追従してハイライトするセクション ID の一覧
  const sectionIds = useMemo(
    () => ['hero', ...NAV_LINKS.map((link) => link.href.replace('#', ''))],
    [],
  );
  const activeSectionId = useActiveSection(sectionIds);

  useEffect(
    () => subscribeToScroll(() => setIsScrolled(window.scrollY > SCROLL_THRESHOLD_PX)),
    [],
  );

  const closeMenu = () => setIsMenuOpen(false);

  // Escape キーでメニューを閉じられるようにする
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // スクロール中またはメニュー展開中は背景を不透明にする
  const headerBackgroundClass =
    isScrolled || isMenuOpen
      ? 'bg-white/85 dark:bg-night/85 backdrop-blur-md border-b border-soft dark:border-night-border'
      : 'bg-transparent border-b border-transparent';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${headerBackgroundClass}`}
      data-testid="navbar"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ロゴ（クリックすると紙吹雪が舞うイースターエッグ付き） */}
        <Link
          href="/#hero"
          onClick={closeMenu}
          aria-label="ホームへ戻る"
          className="inline-flex min-h-11 items-center font-semibold text-lg tracking-tight text-ink dark:text-night-ink transition-colors"
        >
          {siteConfig.displayName}
          <span className="text-subtle">.</span>
        </Link>

        {/* デスクトップ用ナビゲーション */}
        <nav className="hidden md:flex items-center gap-8" aria-label="メインナビゲーション">
          {NAV_LINKS.map((link) => {
            const isActive = `#${activeSectionId}` === link.href;
            return (
              <a
                key={link.href}
                href={isHome ? link.href : `/${link.href}`}
                aria-current={isActive ? 'true' : undefined}
                className={`group relative inline-flex min-h-11 items-center text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-ink dark:text-night-ink'
                    : 'text-subtle dark:text-night-subtle hover:text-ink dark:hover:text-night-ink'
                }`}
              >
                {link.label}
                {/* ホバー・選択中に伸びる下線 */}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 rounded-full bg-ink dark:bg-night-ink transition-all duration-300 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub プロフィールを開く"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle hover:bg-mist dark:hover:bg-night-soft hover:scale-110 hover:-rotate-6 transition-all duration-300"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
          <ThemeToggle />

          {/* モバイル用メニューボタン */}
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle hover:bg-mist dark:hover:bg-night-soft transition-colors md:hidden"
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* モバイル用ドロップダウンメニュー */}
      {isMenuOpen && (
        <nav
          id="mobile-navigation"
          className="md:hidden border-t border-soft dark:border-night-border bg-white/95 dark:bg-night/95 backdrop-blur-md"
          aria-label="モバイルナビゲーション"
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link, index) => (
              <a
                key={link.href}
                href={isHome ? link.href : `/${link.href}`}
                onClick={closeMenu}
                aria-current={`#${activeSectionId}` === link.href ? 'true' : undefined}
                // 開いたときに上から順に現れる
                className="animate-pop-in py-3 text-sm font-medium text-subtle dark:text-night-subtle hover:text-ink dark:hover:text-night-ink hover:translate-x-1 transition-all"
                style={{ animationDelay: `${index * 45}ms` }}
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
