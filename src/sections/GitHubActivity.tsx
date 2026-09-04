"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  FolderPlus,
  GitCommit,
  GitFork,
  GitPullRequest,
  Star,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useScrollLinked } from '../hooks/useScrollLinked';
import { SectionHeading } from '../components/SectionHeading';
import { siteConfig } from '../config/site';
import { formatRelativeTime } from '../lib/format';
import { findTaglineByRepository } from '../data/apps';
import {
  fetchActivity,
  fetchContributions,
  fetchRepos,
  type ApiStatus,
  type ContributionCalendar,
  type GitHubEvent,
  type GitHubRepo,
} from '../services/githubService';

// Contribution Graph をスクロールで現すときの，先頭に付ける余白（進捗の割合）
const CONTRIBUTION_REVEAL_LEAD = 0.15;

// 言語ごとの表示色（GitHub の言語カラーに準拠）
const LANGUAGE_COLORS: Record<string, string> = {
  Swift: '#f05138',
  Python: '#3572a5',
  C: '#555555',
  'C++': '#f34b7d',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'Jupyter Notebook': '#da5b0b',
  Go: '#00add8',
  Rust: '#dea584',
  Kotlin: '#a97bff',
};
const DEFAULT_LANGUAGE_COLOR = '#8b949e';

// 折りたたみ時に表示するリポジトリ件数
const INITIAL_DISPLAY_REPOS = 6;
// アクティビティの表示件数の上限
const MAX_DISPLAY_EVENTS = 6;
// ローディング中に表示するスケルトンカードの数
const SKELETON_COUNT = 6;
// カードの段階表示に使う遅延間隔（ミリ秒）
const STAGGER_DELAY_MS = 80;
// 段階表示の遅延を適用する最大インデックス（全件表示時に遅延が長くなりすぎるのを防ぐ）
const MAX_STAGGER_INDEX = 5;

// 複数 API の状態から，利用者へ知らせるべき最も重大な状態を選ぶ
function aggregateApiStatus(statuses: ApiStatus[]): ApiStatus {
  if (statuses.includes('offline')) return 'offline';
  if (statuses.includes('rate_limited')) return 'rate_limited';
  if (statuses.includes('no_token')) return 'no_token';
  return 'success';
}

// イベント種別に対応するアイコン
function eventIcon(eventType: string) {
  switch (eventType) {
    case 'PushEvent':
      return GitCommit;
    case 'CreateEvent':
    case 'PublicEvent':
      return FolderPlus;
    case 'WatchEvent':
      return Star;
    case 'ForkEvent':
      return GitFork;
    case 'PullRequestEvent':
    case 'IssuesEvent':
      return GitPullRequest;
    default:
      return Activity;
  }
}

export function GitHubActivity() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const [calendar, setCalendar] = useState<ContributionCalendar | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | 'loading'>('loading');
  // すべてのリポジトリを展開表示しているかどうか
  const [isShowingAllRepos, setIsShowingAllRepos] = useState(false);

  // リポジトリ・アクティビティ・草データをまとめて読み込む
  const loadData = useCallback(async () => {
    setApiStatus('loading');
    try {
      const [reposResult, activityResult, contribResult] = await Promise.all([
        fetchRepos(),
        fetchActivity(),
        fetchContributions(),
      ]);
      setRepos(reposResult.repos);
      setEvents(activityResult.events.slice(0, MAX_DISPLAY_EVENTS));
      setCalendar(contribResult.calendar);
      setApiStatus(
        aggregateApiStatus([
          reposResult.apiStatus,
          activityResult.apiStatus,
          contribResult.apiStatus,
        ]),
      );
    } catch {
      // 各フェッチ関数内でフォールバック済みだが，念のため安全側に倒す
      setApiStatus('offline');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Contribution Graph をスクロールに連動して現すための進捗
  const { ref: contributionRef, progress: contributionProgress } =
    useScrollLinked<HTMLDivElement>('enter');

  const isLoading = apiStatus === 'loading';
  const isDegraded = apiStatus === 'offline' || apiStatus === 'rate_limited';
  // 折りたたみ時は先頭数件のみ表示する
  const visibleRepos = isShowingAllRepos ? repos : repos.slice(0, INITIAL_DISPLAY_REPOS);
  const hasMoreRepos = repos.length > INITIAL_DISPLAY_REPOS;

  return (
    <section
      id="github"
      data-testid="github-section"
      className="scroll-mt-24 py-24 md:py-32 bg-mist/70 dark:bg-night-soft/40"
    >
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="04. GitHub Integration"
          title="GitHub アクティビティ"
          description={`GitHub API から ${siteConfig.githubUsername} の最新の活動を動的に取得して表示しています．`}
        />

        {/* API 接続状態の通知バナー */}
        {isDegraded && (
          <Reveal className="mb-8">
            <div
              className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-500/30 text-amber-800 dark:text-amber-300"
              role="status"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">
                GitHub API に接続できないため（
                {apiStatus === 'rate_limited' ? 'レート制限' : 'オフライン'}
                ），取得できない箇所には保存済みの実在データを表示しています．
              </p>
            </div>
          </Reveal>
        )}

        {/* リポジトリ一覧（カード形式） */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          aria-busy={isLoading}
          aria-live="polite"
        >
          {isLoading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <div
                  key={index}
                  className="h-40 rounded-3xl bg-white dark:bg-night-soft border border-soft dark:border-night-border animate-pulse"
                  aria-hidden="true"
                />
              ))
            : visibleRepos.map((repo, index) => {
                const languageColor =
                  LANGUAGE_COLORS[repo.language] ?? DEFAULT_LANGUAGE_COLOR;
                return (
                  <Reveal
                    key={repo.id}
                    delayMs={Math.min(index, MAX_STAGGER_INDEX) * STAGGER_DELAY_MS}
                    className="h-full"
                  >
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden h-full flex flex-col p-5 rounded-3xl bg-white dark:bg-night-soft border border-soft dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:-translate-y-1 hover:shadow-soft transition-all duration-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                          {repo.name}
                          <span className="sr-only">（新しいタブで開く）</span>
                        </h3>
                        <ExternalLink
                          className="w-4 h-4 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-grow">
                        {repo.description ||
                          findTaglineByRepository(repo.name) ||
                          '説明はまだありません．'}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: languageColor }}
                            aria-hidden="true"
                          />
                          {repo.language}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" aria-hidden="true" />
                          {repo.stargazersCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
                          {repo.forksCount}
                        </span>
                        <span className="ml-auto">{formatRelativeTime(repo.updatedAt)}</span>
                      </div>
                    </a>
                  </Reveal>
                );
              })}
        </div>

        {/* すべて表示 / 折りたたみの切替ボタン */}
        {!isLoading && hasMoreRepos && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setIsShowingAllRepos((prev) => !prev)}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-soft dark:border-night-border text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-400 hover:scale-105 transition-all duration-300"
              aria-expanded={isShowingAllRepos}
            >
              {isShowingAllRepos
                ? '表示を減らす'
                : `すべてのリポジトリを表示（全${repos.length}件）`}
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  isShowingAllRepos ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        )}

        {/* Contribution Graph（草） */}
        <Reveal className="mt-14">
          <h3 className="flex items-center gap-2 font-semibold mb-4">
            <Activity className="w-4 h-4 text-sky-700 dark:text-sky-400" />
            Contributions
          </h3>
          {calendar ? (
            <div className="p-5 rounded-3xl bg-white dark:bg-night-soft border border-soft dark:border-night-border">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                直近1年間で{' '}
                <AnimatedCounter
                  value={calendar.totalContributions}
                  className="font-semibold text-sky-700 dark:text-sky-400 tabular-nums"
                />{' '}
                contributions
              </p>
              <div ref={contributionRef} className="overflow-x-auto pb-2">
                <div
                  className="flex gap-[3px] w-max"
                  role="img"
                  aria-label={`GitHub Contribution Graph．直近1年間で${calendar.totalContributions} contributions`}
                >
                  {calendar.weeks.map((week, weekIndex) => {
                    // スクロールが進むほど，左の週から順に現れる
                    const weekPosition = weekIndex / calendar.weeks.length;
                    const isRevealed =
                      contributionProgress + CONTRIBUTION_REVEAL_LEAD >= weekPosition;
                    return (
                      <div
                        key={weekIndex}
                        className="flex flex-col gap-[3px] transition-all duration-500 ease-out"
                        style={{
                          opacity: isRevealed ? 1 : 0,
                          transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.7)',
                        }}
                      >
                        {week.map((day) => (
                          <div
                            key={day.date}
                            title={`${day.date}: ${day.count} contributions`}
                            className={`w-[10px] h-[10px] rounded-[2px] hover:scale-150 hover:ring-1 hover:ring-sky-400 transition-transform duration-150 contrib-${day.level}`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            // GITHUB_TOKEN 未設定時は外部サービスの画像で代替表示する
            <div
              ref={contributionRef}
              className="p-5 rounded-3xl bg-white dark:bg-night-soft border border-soft dark:border-night-border overflow-x-auto"
            >
              {/* スクロールに合わせて左から右へ拭き出すように現す */}
              <div
                className="transition-[clip-path] duration-300 ease-out"
                style={{
                  clipPath: `inset(0 ${(
                    Math.max(1 - contributionProgress - CONTRIBUTION_REVEAL_LEAD, 0) * 100
                  ).toFixed(1)}% 0 0)`,
                }}
              >
                <img
                  src={`https://ghchart.rshah.org/7dd3fc/${siteConfig.githubUsername}`}
                  alt={`${siteConfig.githubUsername} の GitHub Contribution Graph`}
                  className="w-full min-w-[640px] h-auto"
                  // 読み込み前も高さを確保し，表示のずれを防ぐ
                  width={880}
                  height={128}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}
        </Reveal>

        {/* 最近のアクティビティ */}
        <Reveal className="mt-14">
          <h3 className="flex items-center gap-2 font-semibold mb-4">
            <GitCommit className="w-4 h-4 text-sky-700 dark:text-sky-400" />
            Recent Activity
          </h3>
          <ul className="space-y-3">
            {events.length === 0 && (
              <li className="p-4 rounded-2xl bg-white dark:bg-night-soft border border-soft dark:border-night-border text-sm text-slate-500 dark:text-slate-400">
                最近の公開アクティビティはありません．
              </li>
            )}
            {events.map((event) => {
              const Icon = eventIcon(event.type);
              return (
                <li
                  key={event.id}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-night-soft border border-soft dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:translate-x-1 transition-all duration-300"
                >
                  <span className="w-9 h-9 shrink-0 rounded-full bg-sky-400/12 dark:bg-sky-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon
                      className="animate-wiggle w-4 h-4 text-sky-700 dark:text-sky-400"
                      aria-hidden="true"
                    />
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate flex-grow">
                    {event.summary}
                  </p>
                  <time
                    dateTime={event.createdAt}
                    className="text-xs text-slate-500 dark:text-slate-400 shrink-0"
                  >
                    {formatRelativeTime(event.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
