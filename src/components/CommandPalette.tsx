"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Moon,
  Search,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';
import { ALL_WORKS } from '../data/works';

// 専用の紹介ページを持つアプリ（apps.ts に detailHref を足せば，ここにも自動で並ぶ）
const DETAIL_PAGE_APPS = [...SWIFT_APPS, ...ALL_WORKS].filter((app) => app.detailHref);

// 実行できる項目1件分
interface PaletteAction {
  id: string;
  label: string;
  // 一覧に出す補足（セクション名や種別）
  hint: string;
  icon: LucideIcon;
  // 検索で引っかけるためのキーワード
  keywords: string;
  run: () => void;
}

// セクションへ移動する項目の定義
const SECTION_ITEMS = [
  { id: 'about', label: '自己紹介へ移動', keywords: 'about jikoshoukai プロフィール' },
  { id: 'skills', label: '技術スタックへ移動', keywords: 'skills gijutsu スキル' },
  { id: 'projects', label: 'つくったアプリへ移動', keywords: 'apps projects アプリ 作品' },
  { id: 'works', label: 'Web サービスとゲームへ移動', keywords: 'works web games ゲーム ekihub' },
  { id: 'github', label: 'GitHub アクティビティへ移動', keywords: 'github activity 活動' },
  { id: 'contact', label: 'お問い合わせへ移動', keywords: 'contact mail 連絡' },
];

// 選択中の行の背後に敷く面の位置と高さ（一覧の上端から）
interface HighlightBox {
  top: number;
  height: number;
}

// 開いた直後に候補を順に並べるとき，遅らせる行数の上限
const MAX_STAGGERED_ITEMS = 8;
// 閉じる動きにかける時間（ミリ秒）．この間はパネルを残し，縮みながら消えるところを見せる
const CLOSE_ANIMATION_MS = 180;

// macOS の Spotlight のように ⌘K で開く操作パネル．
// キーボードだけでセクション移動・テーマ切替・連絡先のコピーができる．
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  // 閉じる動きを再生している途中か
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  // キー操作の受け口から，いま開いているか（閉じかけを除く）を参照する
  const isOpenRef = useRef(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [highlight, setHighlight] = useState<HighlightBox | null>(null);
  const { theme, toggleTheme } = useTheme();

  const closePalette = useCallback(() => {
    // すでに閉じかけているときは何もしない
    if (closeTimerRef.current !== null) {
      return;
    }
    const finishClosing = () => {
      closeTimerRef.current = null;
      setIsOpen(false);
      setIsClosing(false);
      setQuery('');
      setActiveIndex(0);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishClosing();
      return;
    }
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(finishClosing, CLOSE_ANIMATION_MS);
  }, []);

  const openPalette = useCallback(() => {
    // 閉じかけていたら，閉じるのをやめて開き直す
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen && !isClosing;
  }, [isOpen, isClosing]);

  // 閉じている途中で画面を離れても，タイマーを残さない
  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  // 指定セクションへスクロールする
  const scrollToSection = useCallback(
    (sectionId: string) => {
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
      else window.location.assign(`/#${sectionId}`);
      closePalette();
    },
    [closePalette],
  );

  const actions = useMemo<PaletteAction[]>(() => {
    const sectionActions: PaletteAction[] = SECTION_ITEMS.map((item) => ({
      id: `section-${item.id}`,
      label: item.label,
      hint: 'セクション',
      icon: ArrowRight,
      keywords: item.keywords,
      run: () => scrollToSection(item.id),
    }));

    // アプリ専用ページへの移動
    const appActions: PaletteAction[] = DETAIL_PAGE_APPS.map((app) => ({
      id: `app-${app.name}`,
      label: `${app.name} の紹介ページを開く`,
      hint: 'アプリ',
      icon: Sparkles,
      keywords: `${app.name} ${app.tagline} app アプリ 詳細`,
      run: () => {
        window.location.assign(app.detailHref ?? '/#projects');
        closePalette();
      },
    }));

    return [
      ...sectionActions,
      ...appActions,
      {
        id: 'toggle-theme',
        label: theme === 'dark' ? 'ライトモードに切り替える' : 'ダークモードに切り替える',
        hint: '表示',
        icon: theme === 'dark' ? Sun : Moon,
        keywords: 'theme dark light テーマ 表示 切替',
        run: () => {
          toggleTheme();
          closePalette();
        },
      },
      {
        id: 'copy-email',
        label: 'メールアドレスをコピー',
        hint: siteConfig.email,
        icon: Copy,
        keywords: 'mail email copy 連絡 コピー',
        run: () => {
          navigator.clipboard
            .writeText(siteConfig.email)
            .then(() => setStatusMessage('メールアドレスをコピーしました'))
            .catch(() => setStatusMessage('コピーできませんでした'));
          closePalette();
        },
      },
      {
        id: 'open-github',
        label: 'GitHub プロフィールを開く',
        hint: `github.com/${siteConfig.githubUsername}`,
        icon: ExternalLink,
        keywords: 'github repository リポジトリ',
        run: () => {
          window.open(siteConfig.githubUrl, '_blank', 'noopener,noreferrer');
          closePalette();
        },
      },
    ];
  }, [theme, toggleTheme, scrollToSection, closePalette]);

  // 入力に一致する項目だけに絞り込む
  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return actions;
    }
    return actions.filter((action) =>
      `${action.label} ${action.hint} ${action.keywords}`.toLowerCase().includes(normalizedQuery),
    );
  }, [actions, query]);

  // ⌘K / Ctrl+K で開閉する
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isOpenRef.current) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }
      if (event.key === 'Escape' && isOpenRef.current) {
        closePalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePalette, openPalette]);

  // 開いたら入力欄へフォーカスし，背面のスクロールを止める
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 選択中の行へ背後の面を滑らせ，一覧の外に出ていれば見える位置まで送る
  useLayoutEffect(() => {
    if (!isOpen) {
      setHighlight(null);
      return;
    }
    const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-palette-item]');
    const activeRow = rows?.[activeIndex];
    if (!activeRow) {
      setHighlight(null);
      return;
    }
    setHighlight({ top: activeRow.offsetTop, height: activeRow.offsetHeight });
    activeRow.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, filteredActions]);

  // 一覧内のキーボード操作（↑↓ で移動，Enter で実行）
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((previous) => (previous + 1) % Math.max(filteredActions.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((previous) =>
        previous === 0 ? Math.max(filteredActions.length - 1, 0) : previous - 1,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      filteredActions[activeIndex]?.run();
    }
  };

  return (
    <>
      {/* コピー結果などを読み上げへ伝える */}
      <span role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </span>

      {isOpen && (
        <div
          className={`command-palette-backdrop ${isClosing ? 'is-closing' : ''} fixed inset-0 z-[70] flex items-start justify-center pt-[18vh] px-4 bg-ink/25 dark:bg-black/50 backdrop-blur-sm`}
          role="dialog"
          aria-modal="true"
          aria-label="コマンドパレット"
          onClick={closePalette}
          data-testid="command-palette"
        >
          <div
            className="command-palette-panel animate-pop-in w-full max-w-lg rounded-3xl bg-white dark:bg-night-soft border border-soft dark:border-night-border shadow-soft-lg overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            {/* 検索欄 */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-soft dark:border-night-border">
              <Search className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="セクション名や操作を入力…"
                aria-label="コマンドを検索"
                className="command-palette-input flex-grow bg-transparent text-sm placeholder:text-slate-500"
              />
              <kbd className="px-2 py-0.5 rounded-md text-xs font-mono bg-mist dark:bg-night text-slate-500">
                esc
              </kbd>
            </div>

            {/* 候補一覧 */}
            <ul ref={listRef} className="relative max-h-96 overflow-y-auto py-2">
              {/* 選択中の行の背後を滑る面 */}
              {highlight && (
                <li
                  aria-hidden="true"
                  role="presentation"
                  className="command-palette-highlight"
                  style={{ transform: `translateY(${highlight.top}px)`, height: highlight.height }}
                />
              )}
              {filteredActions.length === 0 && (
                <li className="px-5 py-6 text-sm text-slate-500 text-center">
                  一致する項目がありません．
                </li>
              )}
              {filteredActions.map((action, index) => {
                const Icon = action.icon;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={action.id}
                    data-palette-item
                    className="command-palette-item"
                    style={{ '--item-index': Math.min(index, MAX_STAGGERED_ITEMS) } as CSSProperties}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={action.run}
                      data-active={isActive}
                      className="relative w-full flex items-center gap-3 px-5 py-3 text-left"
                    >
                      <Icon
                        className="command-palette-icon w-4 h-4 shrink-0 text-subtle dark:text-night-subtle"
                        aria-hidden="true"
                      />
                      <span className="text-sm flex-grow truncate">{action.label}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[40%]">
                        {action.hint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="px-5 py-3 border-t border-soft dark:border-night-border flex items-center gap-3 text-xs text-slate-500">
              <span>
                <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> で選択
              </span>
              <span>
                <kbd className="font-mono">Enter</kbd> で実行
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
