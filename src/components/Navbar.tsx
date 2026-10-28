"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { RollLabel } from './RollLabel';
import { ThemeToggle } from './ThemeToggle';
import { GitHubIcon } from './icons/GitHubIcon';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';
import { WEB_WORKS, GAME_WORKS } from '../data/works';
import { useActiveSection } from '../hooks/useActiveSection';
import { subscribeToScroll } from '../lib/scrollObserver';
import { useTilt } from '../hooks/useTilt';
import './Navbar.css';

type MenuLink = { label: string; href: string; description?: string };
type NavItem = {
  id: string;
  label: string;
  groups: { title: string; links: MenuLink[] }[];
  feature: { title: string; description: string; href: string; image: string; icon?: boolean };
};

const appLinks = SWIFT_APPS.filter((app) => app.detailHref).map((app) => ({
  label: app.name, href: app.detailHref!, description: app.platform === 'macos' ? 'macOS アプリ' : 'iPhone アプリ',
}));
const featuredApp = {
  title: 'BusTimeApp', description: '次に乗れるバスが、すぐわかる。',
  href: '/apps/bustimeapp', image: '/projects/bustimeapp.webp', icon: true,
};
const featuredWork = {
  title: 'EkiHub', description: 'みんなが集まりやすい駅を探そう。',
  href: '/apps/ekihub', image: '/projects/works/ekihub-hero.webp',
};
const NAV_ITEMS: NavItem[] = [
  { id: 'about', label: 'About', groups: [
    { title: 'プロフィール', links: [
      { label: '自己紹介', href: '#about', description: 'Ryuto Hara について' },
      { label: 'スキルと技術', href: '#skills', description: '開発で使っている技術' },
      { label: 'お問い合わせ', href: '#contact' },
    ] },
    { title: 'つくっているもの', links: [
      { label: 'iOS / macOS Apps', href: '#projects' },
      { label: 'Web & Games', href: '#works' },
      { label: 'GitHub の活動', href: '#github' },
    ] },
  ], feature: featuredApp },
  { id: 'skills', label: 'Skills', groups: [
    { title: '開発について', links: [
      { label: 'スキル一覧', href: '#skills', description: '言語・フレームワーク・ツール' },
      { label: 'アプリ開発', href: '#projects', description: 'Swift / SwiftUI' },
      { label: 'Web・ゲーム開発', href: '#works', description: 'TypeScript / React / Three.js' },
    ] },
    { title: '技術を使ったプロダクト', links: appLinks.slice(0, 3) },
  ], feature: featuredWork },
  { id: 'projects', label: 'Apps', groups: [
    { title: 'アプリ', links: [
      { label: 'すべてのアプリ', href: '#projects', description: 'iPhone・iPad・Mac のプロダクト' },
      { label: 'ソースコード', href: siteConfig.githubUrl },
    ] },
    { title: 'プロダクトを見る', links: appLinks },
  ], feature: featuredApp },
  { id: 'works', label: 'Works', groups: [
    { title: 'Web & Games', links: [
      { label: '作品一覧', href: '#works', description: 'ブラウザで使えるサービスとゲーム' },
      ...WEB_WORKS.map((work) => ({ label: work.name, href: work.detailHref ?? work.url })),
    ] },
    { title: 'ブラウザであそぶ', links: GAME_WORKS.map((work) => ({
      label: work.name, href: work.url, description: work.kind === 'game' ? 'ブラウザゲーム' : undefined,
    })) },
  ], feature: featuredWork },
  { id: 'github', label: 'GitHub', groups: [
    { title: 'オープンソース', links: [
      { label: '開発アクティビティ', href: '#github', description: '日々の開発とコントリビューション' },
      { label: 'GitHub プロフィール', href: siteConfig.githubUrl },
      { label: 'リポジトリ一覧', href: `${siteConfig.githubUrl}?tab=repositories` },
    ] },
    { title: 'コードを読む', links: SWIFT_APPS.filter((app) => app.detailHref).map((app) => ({
      label: app.name, href: `${siteConfig.githubUrl}/${app.repositories[0].name}`,
    })) },
  ], feature: { title: 'Subghost', description: 'AI CLI のタスク状態を、Mac のノッチに。', href: '/apps/subghost', image: '/projects/subghost.webp', icon: true } },
  { id: 'contact', label: 'Contact', groups: [
    { title: 'お問い合わせ', links: [
      { label: 'メッセージを送る', href: '#contact', description: 'ご相談・ご質問はこちらから' },
      { label: 'メールで連絡', href: `mailto:${siteConfig.email}`, description: siteConfig.email },
    ] },
    { title: 'もっと知る', links: [
      { label: 'プロフィール', href: '#about' },
      { label: 'つくったアプリ', href: '#projects' },
      { label: 'GitHub', href: siteConfig.githubUrl },
    ] },
  ], feature: featuredWork },
];

function FeaturedPreview({ feature, onNavigate }: { feature: NavItem['feature']; onNavigate: () => void }) {
  const { ref, handlers } = useTilt<HTMLAnchorElement>();
  return (
    <Link ref={ref} {...handlers} href={feature.href} onClick={onNavigate} className="mega-feature">
      <div className={`mega-feature-image ${feature.icon ? 'is-icon' : ''}`}>
        <Image src={feature.image} alt="" width={640} height={400} />
        <span className="mega-feature-arrow"><ArrowUpRight size={20} aria-hidden="true" /></span>
      </div>
      <p>{feature.title}</p>
      <small>{feature.description}</small>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [displayedId, setDisplayedId] = useState(NAV_ITEMS[0].id);
  const displayedItem = NAV_ITEMS.find((item) => item.id === displayedId)!;
  const openMenu = (id: string) => {
    setDisplayedId(id);
    setOpenId(id);
  };
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionIds = useMemo(() => ['hero', ...NAV_ITEMS.map((item) => item.id)], []);
  const activeSectionId = useActiveSection(sectionIds);
  const resolveHref = (href: string) => href.startsWith('#') && !isHome ? `/${href}` : href;
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const closeMenu = () => {
    cancelClose();
    setOpenId(null);
    setIsMenuOpen(false);
  };

  // いま読んでいるセクションの項目の下へ，小さな印を滑らせる（Hero にいる間は隠す）
  const [sectionMarker, setSectionMarker] = useState({ left: 0, width: 0, isVisible: false });
  useLayoutEffect(() => {
    const activeTrigger = isHome ? triggerRefs.current[activeSectionId] : null;
    if (!activeTrigger) {
      setSectionMarker((current) => ({ ...current, isVisible: false }));
      return;
    }
    const measure = () => setSectionMarker({ left: activeTrigger.offsetLeft, width: activeTrigger.offsetWidth, isVisible: true });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(activeTrigger);
    return () => observer.disconnect();
  }, [activeSectionId, isHome]);

  useEffect(() => subscribeToScroll(() => setIsScrolled(window.scrollY > 16)), []);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!openId && !isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openId && !isMenuOpen) {
        triggerRefs.current[openId]?.focus();
        setOpenId(null);
      } else {
        setOpenId(null);
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenId(null);
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openId, isMenuOpen]);

  const renderDetails = (item: NavItem) => (
    <>
      {item.groups.map((group, groupIndex) => (
        <div className="mega-group" key={group.title} style={{ '--group-index': groupIndex } as CSSProperties}>
          <p className="mega-group-title">{group.title}</p>
          {group.links.map((link, index) => (
            <Link key={link.href} href={resolveHref(link.href)} onClick={closeMenu} className="mega-link" style={{ '--link-index': index } as CSSProperties}>
              <span>{link.label}</span>
              {link.description && <small>{link.description}</small>}
            </Link>
          ))}
        </div>
      ))}
      <FeaturedPreview feature={item.feature} onNavigate={closeMenu} />
    </>
  );

  return (
    <header
      ref={headerRef}
      className={`site-navbar fixed top-0 inset-x-0 z-50 ${isScrolled || isMenuOpen || openId ? 'is-solid' : ''}`}
      data-testid="navbar"
      onPointerEnter={cancelClose}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') closeTimer.current = setTimeout(() => setOpenId(null), 180);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
      }}
    >
      <div className="navbar-bar max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/#hero" data-magnetic onClick={closeMenu} aria-label="ホームへ戻る" className="inline-flex min-h-11 items-center font-semibold text-lg tracking-tight text-ink dark:text-night-ink">
          {siteConfig.displayName}<span className="text-subtle">.</span>
        </Link>
        <nav className="relative hidden md:flex items-center gap-1" aria-label="メインナビゲーション">
          <span
            className="nav-section-marker"
            data-visible={sectionMarker.isVisible}
            style={{ '--marker-left': `${sectionMarker.left}px`, '--marker-width': `${sectionMarker.width}px` } as CSSProperties}
            aria-hidden="true"
          />
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              ref={(node) => { triggerRefs.current[item.id] = node; }}
              type="button"
              className={`mega-trigger roll-label-host ${openId === item.id ? 'is-open' : ''}`}
              aria-expanded={openId === item.id}
              aria-controls="desktop-navigation-details"
              aria-current={isHome && activeSectionId === item.id ? 'true' : undefined}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') { cancelClose(); openMenu(item.id); } }}
              onClick={(event) => {
                cancelClose();
                if (event.detail > 0 && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                  openMenu(item.id);
                } else {
                  setDisplayedId(item.id);
                  setOpenId((current) => current === item.id ? null : item.id);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  openMenu(item.id);
                  requestAnimationFrame(() => headerRef.current?.querySelector<HTMLAnchorElement>(`#mega-panel-${item.id} a`)?.focus());
                }
              }}
            >
              <RollLabel text={item.label} /><ChevronDown size={12} aria-hidden="true" />
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub プロフィールを開く" className="group inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle hover:bg-mist dark:hover:bg-night-soft transition-colors">
            <GitHubIcon className="w-5 h-5 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" />
          </a>
          <ThemeToggle />
          <button ref={menuButtonRef} type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle md:hidden" aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" onClick={() => { setIsMenuOpen((value) => !value); setOpenId(null); }}>
            {/* 開閉が変わるたびに作り直し，回りながら三本線と×が入れ替わる */}
            <span key={isMenuOpen ? 'close' : 'open'} className="icon-swap" aria-hidden="true">
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </span>
          </button>
        </div>
      </div>
      <div
        id="desktop-navigation-details"
        className={`mega-panel nav-collapse hidden md:grid ${openId && !isMenuOpen ? 'is-open' : ''}`}
        aria-hidden={!openId || isMenuOpen}
        ref={(node) => { if (node) node.inert = !openId || isMenuOpen; }}
      >
        <div className="nav-collapse-inner">
          <nav key={displayedId} id={`mega-panel-${displayedId}`} className="mega-layout max-w-6xl mx-auto px-6" aria-label={`${displayedItem.label} の詳細`}>
            {renderDetails(displayedItem)}
          </nav>
        </div>
      </div>
      <div className={`mobile-menu-shell nav-collapse md:hidden ${isMenuOpen ? 'is-open' : ''}`} aria-hidden={!isMenuOpen} ref={(node) => { if (node) node.inert = !isMenuOpen; }}>
        <div className="nav-collapse-inner">
        <nav id="mobile-navigation" className="mobile-mega" aria-label="モバイルナビゲーション">
          {NAV_ITEMS.map((item) => (
            <div key={item.id} className="mobile-mega-item">
              <button className="mobile-mega-trigger" type="button" aria-expanded={openId === item.id} aria-controls={`mobile-panel-${item.id}`} onClick={() => { setDisplayedId(item.id); setOpenId((current) => current === item.id ? null : item.id); }}>
                {item.label}<ChevronDown size={16} aria-hidden="true" />
              </button>
              <div id={`mobile-panel-${item.id}`} className={`nav-collapse mobile-detail-shell ${openId === item.id ? 'is-open' : ''}`} aria-hidden={openId !== item.id} ref={(node) => { if (node) node.inert = openId !== item.id; }}>
                <div className="nav-collapse-inner">
                  <div className="mobile-mega-details">{renderDetails(item)}</div>
                </div>
              </div>
            </div>
          ))}
          <Link href={resolveHref('#hero')} onClick={closeMenu} className="mega-link">ホームへ戻る</Link>
        </nav>
        </div>
      </div>
    </header>
  );
}
