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

// 曜日ラベル（GitHub と同じく，日曜始まりで月・水・金だけを表示する）
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// 週の先頭日から月の略称（Jan など）を作る
function formatMonthLabel(dateText: string): string {
  return new Date(dateText).toLocaleDateString('en-US', { month: 'short' });
}

// その週から新しい月が始まるかどうか（＝月ラベルを出すか）を判定する
function shouldShowMonthLabel(
  weeks: ContributionCalendar['weeks'],
  weekIndex: number,
): boolean {
  const currentMonth = new Date(weeks[weekIndex][0].date).getMonth();
  if (weekIndex === 0) {
    // 左端は，次の週で月が変わるなら重なるので出さない
    return new Date(weeks[1]?.[0]?.date ?? weeks[0][0].date).getMonth() === currentMonth;
  }
  return new Date(weeks[weekIndex - 1][0].date).getMonth() !== currentMonth;
}

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
      className="tinted scroll-mt-24 py-24 md:py-32 bg-mist dark:bg-night-soft/40"
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
              className="flex items-start gap-3 p-4 rounded-2xl bg-mist dark:bg-night-soft border border-soft dark:border-night-border text-subtle dark:text-night-subtle"
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
                  className="tile h-40 animate-pulse"
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
                      className="tile group relative overflow-hidden h-full flex flex-col p-5 hover:border-ink/25 dark:hover:border-night-ink/25 hover:-translate-y-1 hover:shadow-soft transition-all duration-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate transition-colors">
                          {repo.name}
                          <span className="sr-only">（新しいタブで開く）</span>
                        </h3>
                        <ExternalLink
                          className="w-4 h-4 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 text-sm text-subtle dark:text-night-subtle line-clamp-2 flex-grow">
                        {repo.description ||
                          findTaglineByRepository(repo.name) ||
                          '説明はまだありません．'}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-subtle dark:text-night-subtle">
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
              className="press-effect group inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-soft dark:border-night-border text-ink dark:text-night-ink hover:border-ink dark:hover:border-night-ink hover:scale-105 transition-all duration-300"
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
            <Activity className="w-4 h-4 text-ink dark:text-night-ink" />
            Contributions
          </h3>
          {calendar ? (
            <div className="tile p-5">
              <p className="text-sm text-subtle dark:text-night-subtle mb-4">
                直近1年間で{' '}
                <AnimatedCounter
                  value={calendar.totalContributions}
                  className="font-semibold text-ink dark:text-night-ink tabular-nums"
                />{' '}
                contributions
              </p>
              <div ref={contributionRef} className="overflow-x-auto pb-2">
                <div
                  className="w-max"
                  role="img"
                  aria-label={`GitHub Contribution Graph．直近1年間で${calendar.totalContributions} contributions`}
                >
                  {/* 月ラベル（本家と同じく，月が変わる週の上に置く） */}
                  <div className="flex gap-[3px] ml-[26px] mb-1 h-[13px]">
                    {calendar.weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="relative w-[10px]">
                        {shouldShowMonthLabel(calendar.weeks, weekIndex) && (
                          <span className="absolute left-0 top-0 text-[10px] leading-none text-subtle dark:text-night-subtle whitespace-nowrap">
                            {formatMonthLabel(week[0].date)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-[3px]">
                    {/* 曜日ラベル（本家と同じく Mon / Wed / Fri のみ） */}
                    <div className="flex flex-col gap-[3px] w-[23px] shrink-0">
                      {WEEKDAY_LABELS.map((label, dayIndex) => (
                        <span
                          key={dayIndex}
                          className="h-[10px] text-[10px] leading-[10px] text-subtle dark:text-night-subtle"
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* 週ごとの列 */}
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
                            transform: isRevealed
                              ? 'translateY(0) scale(1)'
                              : 'translateY(8px) scale(0.7)',
                          }}
                        >
                          {week.map((day) => (
                            <div
                              key={day.date}
                              title={`${day.date}: ${day.count} contributions`}
                              className={`w-[10px] h-[10px] rounded-[2px] hover:scale-150 hover:ring-1 hover:ring-emerald-500 transition-transform duration-150 contrib-${day.level}`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 凡例（本家と同じ Less → More） */}
                <div className="flex items-center justify-end gap-1 mt-3 text-[11px] text-subtle dark:text-night-subtle">
                  <span className="mr-1">Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`w-[10px] h-[10px] rounded-[2px] contrib-${level}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="ml-1">More</span>
                </div>
              </div>
            </div>
          ) : (
            // GITHUB_TOKEN 未設定時は外部サービスの画像で代替表示する
            <div
              ref={contributionRef}
              className="tile p-5 overflow-x-auto"
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
                  src={`https://ghchart.rshah.org/40c463/${siteConfig.githubUsername}`}
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
            <GitCommit className="w-4 h-4 text-ink dark:text-night-ink" />
            Recent Activity
          </h3>
          <ul className="space-y-3">
            {events.length === 0 && (
              <li className="tile p-4 text-sm text-subtle dark:text-night-subtle">
                最近の公開アクティビティはありません．
              </li>
            )}
            {events.map((event) => {
              const Icon = eventIcon(event.type);
              return (
                <li
                  key={event.id}
                  className="group flex items-center gap-4 tile p-4 hover:border-ink/25 dark:hover:border-night-ink/25 hover:translate-x-1 transition-all duration-300"
                >
                  <span className="w-9 h-9 shrink-0 rounded-full bg-mist dark:bg-night flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon
                      className="animate-wiggle w-4 h-4 text-ink dark:text-night-ink"
                      aria-hidden="true"
                    />
                  </span>
                  <p className="text-sm text-ink dark:text-night-ink truncate flex-grow">
                    {event.summary}
                  </p>
                  <time
                    dateTime={event.createdAt}
                    className="text-xs text-subtle dark:text-night-subtle shrink-0"
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
