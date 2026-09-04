"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Laptop, Smartphone } from 'lucide-react';
import { Reveal, type RevealVariant } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { TiltCard } from '../components/TiltCard';
import { ScrollMarquee } from '../components/ScrollMarquee';
import { ScrollTimeline } from '../components/ScrollTimeline';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import { siteConfig } from '../config/site';
import {
  buildRepositoryUrl,
  matchesPlatform,
  PLATFORM_FILTERS,
  PLATFORM_LABELS,
  SWIFT_APPS,
  type AppPlatform,
  type SwiftApp,
} from '../data/apps';

// カードの段階表示に使う遅延間隔（ミリ秒）
const STAGGER_DELAY_MS = 90;

// 絞り込みタブの下を滑るインジケーターの位置とサイズ
interface IndicatorStyle {
  left: number;
  width: number;
}

// タブの id（aria-controls / aria-labelledby で紐付ける）
function buildTabId(filterId: AppPlatform | 'all'): string {
  return `apps-tab-${filterId}`;
}

const APPS_PANEL_ID = 'apps-panel';

// プラットフォームバッジ：対応 OS をアイコン付きで示す
function PlatformBadge({ platform }: { platform: AppPlatform }) {
  const showsPhone = platform === 'ios' || platform === 'both';
  const showsMac = platform === 'macos' || platform === 'both';

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-slate-700 backdrop-blur-sm border border-white/60">
      {showsPhone && <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />}
      {showsMac && <Laptop className="w-3.5 h-3.5" aria-hidden="true" />}
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

// 技術タグの一覧（ホバーで少し持ち上がる）
function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="px-2.5 py-1 text-xs rounded-full bg-mist dark:bg-night border border-soft dark:border-night-border text-slate-600 dark:text-slate-300 hover:-translate-y-0.5 hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-400 transition-all duration-200"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

// GitHub リポジトリへのリンク（2リポジトリ構成のアプリは複数並ぶ）
function RepositoryLinks({ app }: { app: SwiftApp }) {
  return (
    <div className="mt-5 pt-4 border-t border-soft dark:border-night-border flex flex-wrap gap-x-4 gap-y-2">
      {app.repositories.map((repository) => (
        <a
          key={repository.name}
          href={buildRepositoryUrl(siteConfig.githubUsername, repository.name)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${repository.name}${repository.role ? `（${repository.role}）` : ''}を新しいタブで開く`}
          className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
        >
          <GitHubIcon className="w-4 h-4 group-hover/link:rotate-12 transition-transform" />
          <span className="group-hover/link:underline underline-offset-4">{repository.name}</span>
          {repository.role && (
            <span className="text-xs text-slate-500 dark:text-slate-400">（{repository.role}）</span>
          )}
          <ArrowUpRight
            className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 -translate-x-1 group-hover/link:translate-x-0 transition-all"
            aria-hidden="true"
          />
        </a>
      ))}
    </div>
  );
}

// 注目アプリ用の大きなカード（グラデーションヘッダー付き）
function FeaturedAppCard({ app }: { app: SwiftApp }) {
  const Icon = app.icon;

  return (
    <TiltCard className="h-full">
      <article className="group h-full flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-night-soft border border-soft dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:shadow-soft-lg transition-all duration-300">
        {/* ヘッダー：グラデーション＋アイコン＋プラットフォーム表示 */}
        <div
          className={`shimmer-sweep relative h-40 overflow-hidden bg-gradient-to-br ${app.gradient} flex items-center justify-center`}
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-30" aria-hidden="true" />
          {/* 背後でゆっくり回る装飾リング */}
          <div
            className="absolute w-52 h-52 rounded-full border border-dashed border-white/25 animate-spin-slow"
            aria-hidden="true"
          />
          {app.imageSrc ? (
            <img
              src={app.imageSrc}
              alt=""
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
              className="relative h-28 w-28 rounded-[1.7rem] object-cover shadow-soft-lg ring-1 ring-white/60 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Icon
              className="animate-wiggle relative w-14 h-14 text-ink/90 drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
              aria-hidden="true"
            />
          )}
          <div className="absolute top-4 left-4">
            <PlatformBadge platform={app.platform} />
          </div>
          <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-white/90 text-xs font-mono text-slate-600">
            {app.year}
          </span>
        </div>

        <div className="flex flex-col flex-grow p-6">
          <h3 className="text-lg font-semibold group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
            {app.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-sky-700 dark:text-sky-400">{app.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 flex-grow">
            {app.description}
          </p>
          <TagList tags={app.tags} />
          <RepositoryLinks app={app} />
        </div>
      </article>
    </TiltCard>
  );
}

// 一覧表示用のコンパクトなカード
function CompactAppCard({ app }: { app: SwiftApp }) {
  const Icon = app.icon;

  return (
    <TiltCard className="h-full">
      <article className="group h-full flex flex-col p-6 rounded-3xl bg-white dark:bg-night-soft border border-soft dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:shadow-soft transition-all duration-300">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-soft group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300`}
            aria-hidden="true"
          >
            <Icon className="w-5 h-5 text-ink" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold leading-snug group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
              {app.name}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {PLATFORM_LABELS[app.platform]} ・ {app.year}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm font-medium text-sky-700 dark:text-sky-400">{app.tagline}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 flex-grow">
          {app.description}
        </p>
        <TagList tags={app.tags} />
        <RepositoryLinks app={app} />
      </article>
    </TiltCard>
  );
}

// カードの並び順に応じて登場方向を変える（左・下・右の順に繰り返す）
const REVEAL_VARIANTS: RevealVariant[] = ['left', 'up', 'right'];

function pickRevealVariant(index: number): RevealVariant {
  return REVEAL_VARIANTS[index % REVEAL_VARIANTS.length];
}

export function Projects() {
  const [activeFilterId, setActiveFilterId] = useState<AppPlatform | 'all'>('all');
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({ left: 0, width: 0 });
  const tabListRef = useRef<HTMLDivElement | null>(null);

  // 選択中のタブに合わせてインジケーターを移動させる
  const updateIndicator = useCallback(() => {
    const tabList = tabListRef.current;
    if (!tabList) {
      return;
    }
    const activeTab = tabList.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!activeTab) {
      return;
    }
    setIndicatorStyle({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
  }, []);

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeFilterId, updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator, { passive: true });
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // 矢印キー・Home・End でタブを移動できるようにする（WAI-ARIA のタブパターン）
  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const lastIndex = PLATFORM_FILTERS.length - 1;
      let nextIndex: number | null = null;

      if (event.key === 'ArrowRight') {
        nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = lastIndex;
      }

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      const nextFilter = PLATFORM_FILTERS[nextIndex];
      setActiveFilterId(nextFilter.id);
      // 移動先のタブへフォーカスも移す
      document.getElementById(buildTabId(nextFilter.id))?.focus();
    },
    [],
  );

  // 絞り込み結果を注目アプリとその他に分ける
  const { featuredApps, otherApps } = useMemo(() => {
    const visibleApps = SWIFT_APPS.filter((app) => matchesPlatform(app, activeFilterId));
    return {
      featuredApps: visibleApps.filter((app) => app.featured),
      otherApps: visibleApps.filter((app) => !app.featured),
    };
  }, [activeFilterId]);

  // 見出しに表示する総数（プロダクト数とリポジトリ数）
  const totalRepositoryCount = SWIFT_APPS.reduce(
    (total, app) => total + app.repositories.length,
    0,
  );
  const visibleCount = featuredApps.length + otherApps.length;
  // 帯に流すアプリ名（絞り込みに関係なく全アプリを並べる）
  const marqueeNames = SWIFT_APPS.map((app) => app.name);

  return (
    <section id="projects" data-testid="projects-section" className="scroll-mt-24 py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="03. Apps"
          title="つくったアプリ"
          description={`Swift / SwiftUI で個人開発した iPhone・Mac アプリです．${SWIFT_APPS.length}プロダクト（GitHub 上の${totalRepositoryCount}リポジトリ）をすべてソースコードごと公開しています．いずれも自分自身が使いたいものから生まれました．`}
        />

        {/* プラットフォーム絞り込みタブ（選択中のタブへインジケーターが滑る） */}
        <Reveal className="mb-10">
          <div className="flex flex-wrap items-center gap-4">
            <div
              ref={tabListRef}
              className="relative inline-flex p-1 rounded-full bg-white dark:bg-night-soft border border-soft dark:border-night-border"
              role="tablist"
              aria-label="プラットフォームで絞り込み"
            >
              {/* 選択中を示す背景（位置と幅をアニメーションさせる） */}
              <span
                className="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-sky-700 to-violet-700 shadow-soft transition-all duration-300 ease-out"
                style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
                aria-hidden="true"
              />
              {PLATFORM_FILTERS.map((filter, index) => {
                const isActive = filter.id === activeFilterId;
                return (
                  <button
                    key={filter.id}
                    id={buildTabId(filter.id)}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={APPS_PANEL_ID}
                    // 選択中のタブだけをタブキーの移動対象にする（ロービングタブインデックス）
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveFilterId(filter.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* 表示件数（絞り込みに応じて切り替わる） */}
            <p
              key={activeFilterId}
              className="animate-pop-in text-sm text-slate-500 dark:text-slate-400"
              aria-live="polite"
            >
              {visibleCount} 件を表示中
            </p>
          </div>
        </Reveal>

        {/* 絞り込み結果（タブに対応するパネル） */}
        <div
          id={APPS_PANEL_ID}
          role="tabpanel"
          aria-labelledby={buildTabId(activeFilterId)}
        >
        {/* 注目アプリ */}
        {featuredApps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredApps.map((app, index) => (
              <Reveal
                key={`${activeFilterId}-${app.name}`}
                delayMs={index * STAGGER_DELAY_MS}
                variant={index % 2 === 0 ? 'left' : 'right'}
                className="h-full"
              >
                <FeaturedAppCard app={app} />
              </Reveal>
            ))}
          </div>
        )}

        {/* その他のアプリ */}
        {otherApps.length > 0 && (
          <>
            <Reveal className="mt-16 mb-8">
              <h3
                className="text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase"
                lang="en"
              >
                Other Apps
              </h3>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherApps.map((app, index) => (
                <Reveal
                  key={`${activeFilterId}-${app.name}`}
                  delayMs={index * STAGGER_DELAY_MS}
                  variant={pickRevealVariant(index)}
                  className="h-full"
                >
                  <CompactAppCard app={app} />
                </Reveal>
              ))}
            </div>
          </>
        )}
        </div>
      </div>

      {/* スクロールした量だけ左右に流れるアプリ名の帯（上下で逆方向に動く） */}
      <div className="mt-20 space-y-3 select-none">
        <ScrollMarquee items={marqueeNames} distancePx={-320} />
        <ScrollMarquee items={[...marqueeNames].reverse()} distancePx={320} />
      </div>

      {/* 開発の軌跡（スクロールに合わせて線が伸びる年表） */}
      <div className="max-w-6xl mx-auto px-6 mt-20">
        <Reveal className="mb-10">
          <p
            className="text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase"
            lang="en"
          >
            Timeline
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">開発の軌跡</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            スクロールに合わせて，これまでにつくってきたアプリの流れをたどれます．
          </p>
        </Reveal>
        <ScrollTimeline />
      </div>
    </section>
  );
}
