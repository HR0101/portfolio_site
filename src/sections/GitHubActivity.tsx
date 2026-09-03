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
      setApiStatus(reposResult.apiStatus);
    } catch {
      // 各フェッチ関数内でフォールバック済みだが，念のため安全側に倒す
      setApiStatus('offline');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isLoading = apiStatus === 'loading';
  const isDegraded = apiStatus === 'offline' || apiStatus === 'rate_limited';
  // 折りたたみ時は先頭数件のみ表示する
  const visibleRepos = isShowingAllRepos ? repos : repos.slice(0, INITIAL_DISPLAY_REPOS);
  const hasMoreRepos = repos.length > INITIAL_DISPLAY_REPOS;

  return (
    <section
      id="github"
      data-testid="github-section"
      className="scroll-mt-24 py-24 md:py-32 bg-slate-100/60 dark:bg-night-soft/40"
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
              className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-500/30 text-amber-800 dark:text-amber-300"
              role="status"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">
                GitHub API に接続できないため（
                {apiStatus === 'rate_limited' ? 'レート制限' : 'オフライン'}
                ），キャッシュまたはサンプルデータを表示しています．
              </p>
            </div>
          </Reveal>
        )}

        {/* リポジトリ一覧（カード形式） */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <div
                  key={index}
                  className="h-40 rounded-2xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border animate-pulse"
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
                      className="group h-full flex flex-col p-5 rounded-2xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                          {repo.name}
                        </h3>
                        <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                          <Star className="w-3.5 h-3.5" />
                          {repo.stargazersCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3.5 h-3.5" />
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-slate-300 dark:border-night-border text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors duration-300"
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
          <h3 className="flex items-center gap-2 font-bold mb-4">
            <Activity className="w-4 h-4 text-sky-500" />
            Contributions
          </h3>
          {calendar ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                直近1年間で {calendar.totalContributions.toLocaleString()} contributions
              </p>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-[3px] w-max" aria-label="Contribution Graph">
                  {calendar.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                      {week.map((day) => (
                        <div
                          key={day.date}
                          title={`${day.date}: ${day.count} contributions`}
                          className={`w-[10px] h-[10px] rounded-[2px] contrib-${day.level}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // GITHUB_TOKEN 未設定時は外部サービスの画像で代替表示する
            <div className="p-5 rounded-2xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border overflow-x-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://ghchart.rshah.org/0ea5e9/${siteConfig.githubUsername}`}
                alt={`${siteConfig.githubUsername} の GitHub Contribution Graph`}
                className="w-full min-w-[640px]"
                loading="lazy"
              />
            </div>
          )}
        </Reveal>

        {/* 最近のアクティビティ */}
        <Reveal className="mt-14">
          <h3 className="flex items-center gap-2 font-bold mb-4">
            <GitCommit className="w-4 h-4 text-sky-500" />
            Recent Activity
          </h3>
          <ul className="space-y-3">
            {events.map((event) => {
              const Icon = eventIcon(event.type);
              return (
                <li
                  key={event.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border"
                >
                  <span className="w-9 h-9 shrink-0 rounded-full bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
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
