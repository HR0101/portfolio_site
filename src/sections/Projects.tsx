"use client";

import { useMemo, useState } from 'react';
import { ArrowUpRight, Laptop, Smartphone } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
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

// プラットフォームバッジ：対応 OS をアイコン付きで示す
function PlatformBadge({ platform }: { platform: AppPlatform }) {
  const showsPhone = platform === 'ios' || platform === 'both';
  const showsMac = platform === 'macos' || platform === 'both';

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-sm border border-white/20">
      {showsPhone && <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />}
      {showsMac && <Laptop className="w-3.5 h-3.5" aria-hidden="true" />}
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

// 技術タグの一覧
function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-night border border-slate-200 dark:border-night-border text-slate-600 dark:text-slate-300"
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
    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-night-border flex flex-wrap gap-x-4 gap-y-2">
      {app.repositories.map((repository) => (
        <a
          key={repository.name}
          href={buildRepositoryUrl(siteConfig.githubUsername, repository.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <GitHubIcon className="w-4 h-4" />
          <span>{repository.name}</span>
          {repository.role && (
            <span className="text-xs text-slate-400 dark:text-slate-500">（{repository.role}）</span>
          )}
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 -translate-x-1 group-hover/link:translate-x-0 transition-all" />
        </a>
      ))}
    </div>
  );
}

// 注目アプリ用の大きなカード（グラデーションヘッダー付き）
function FeaturedAppCard({ app }: { app: SwiftApp }) {
  const Icon = app.icon;

  return (
    <article className="group h-full flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/5 hover:-translate-y-1 transition-all duration-300">
      {/* ヘッダー：グラデーション＋アイコン＋プラットフォーム表示 */}
      <div className={`relative h-40 bg-gradient-to-br ${app.gradient} flex items-center justify-center`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-30" aria-hidden="true" />
        <Icon
          className="relative w-14 h-14 text-white/90 group-hover:scale-110 transition-transform duration-300"
          aria-hidden="true"
        />
        <div className="absolute top-4 left-4">
          <PlatformBadge platform={app.platform} />
        </div>
        <span className="absolute top-4 right-4 text-xs font-mono text-white/80">{app.year}</span>
      </div>

      <div className="flex flex-col flex-grow p-6">
        <h3 className="text-lg font-bold">{app.name}</h3>
        <p className="mt-1 text-sm font-medium text-sky-600 dark:text-sky-400">{app.tagline}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 flex-grow">
          {app.description}
        </p>
        <TagList tags={app.tags} />
        <RepositoryLinks app={app} />
      </div>
    </article>
  );
}

// 一覧表示用のコンパクトなカード
function CompactAppCard({ app }: { app: SwiftApp }) {
  const Icon = app.icon;

  return (
    <article className="group h-full flex flex-col p-6 rounded-2xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold leading-snug">{app.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {PLATFORM_LABELS[app.platform]} ・ {app.year}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-sky-600 dark:text-sky-400">{app.tagline}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 flex-grow">
        {app.description}
      </p>
      <TagList tags={app.tags} />
      <RepositoryLinks app={app} />
    </article>
  );
}

export function Projects() {
  const [activeFilterId, setActiveFilterId] = useState<AppPlatform | 'all'>('all');

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

  return (
    <section id="projects" data-testid="projects-section" className="scroll-mt-24 py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="03. Apps"
          title="つくったアプリ"
          description={`Swift / SwiftUI で個人開発した iPhone・Mac アプリです．${SWIFT_APPS.length}プロダクト（GitHub 上の${totalRepositoryCount}リポジトリ）をすべてソースコードごと公開しています．いずれも自分自身が使いたいものから生まれました．`}
        />

        {/* プラットフォーム絞り込みタブ */}
        <Reveal className="mb-10">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="プラットフォームで絞り込み"
          >
            {PLATFORM_FILTERS.map((filter) => {
              const isActive = filter.id === activeFilterId;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilterId(filter.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors duration-200 ${
                    isActive
                      ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/25'
                      : 'bg-white dark:bg-night-soft border-slate-200 dark:border-night-border text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* 注目アプリ */}
        {featuredApps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredApps.map((app, index) => (
              <Reveal
                key={`${activeFilterId}-${app.name}`}
                delayMs={index * STAGGER_DELAY_MS}
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
              <h3 className="text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                Other Apps
              </h3>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherApps.map((app, index) => (
                <Reveal
                  key={`${activeFilterId}-${app.name}`}
                  delayMs={index * STAGGER_DELAY_MS}
                  className="h-full"
                >
                  <CompactAppCard app={app} />
                </Reveal>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
