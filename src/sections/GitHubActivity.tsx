"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
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
import { RollingNumber } from '../components/RollingNumber';
import { ContributionTooltip } from '../components/ContributionTooltip';
import { useInView } from '../hooks/useInView';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';
import { diagonalDelay, staggerDelay } from '../lib/choreography';
import { contributionCellDelay } from '../lib/worksGithubMotion';
import { SectionHeading } from '../components/SectionHeading';
import { siteConfig } from '../config/site';
import { formatRelativeTime } from '../lib/format';
import { findTaglineByRepository } from '../data/apps';
import githubSnapshot from '../data/github-snapshot.json';
import { devLog } from '../data/devLog';
import { FEATURES } from '../config/features';
import devLogStyles from './DevLog.module.css';
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
const REPO_INNER_STEP_MS = 30;
const EXTRA_REPO_STEP_MS = 30;
const EXTRA_REPO_CAP_MS = 180;
const ACTIVITY_STEP_MS = 40;
const NOTICE_EXIT_MS = 160;
const CONTRIBUTION_ENTER_RATIO = 0.55;
const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
const snapshotDate = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric',
}).format(new Date(githubSnapshot.generatedAt));

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

// 登場は外側，ホバー・押下はリンク本体が担当する．
function RepositoryCard({ repo, index, extra = false }: { repo: GitHubRepo; index: number; extra?: boolean }) {
  const languageColor = LANGUAGE_COLORS[repo.language] ?? DEFAULT_LANGUAGE_COLOR;
  const delayStyle = {
    '--repo-delay-1': `${diagonalDelay(index, 1)}ms`,
    '--repo-delay-2': `${diagonalDelay(index, 2)}ms`,
    '--repo-delay-3': `${diagonalDelay(index, 3)}ms`,
    '--extra-delay': `${staggerDelay(index, { stepMs: EXTRA_REPO_STEP_MS, capMs: EXTRA_REPO_CAP_MS })}ms`,
    '--repo-inner-step': `${REPO_INNER_STEP_MS}ms`,
  } as CSSProperties;

  return (
    <div className={`${devLogStyles.repoEntrance} h-full`} style={delayStyle} data-extra-repo={extra}>
      <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className={`${devLogStyles.repoCard} github-repo press-effect tile group relative overflow-hidden h-full flex flex-col p-5`}>
        <div className={`${devLogStyles.repoName} flex items-center justify-between gap-2`}>
          <h3 className="font-semibold truncate">
            <span className={devLogStyles.repoNameText}>{repo.name}</span>
            <span className="sr-only">（新しいタブで開く）</span>
          </h3>
          <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
        </div>
        <p className={`${devLogStyles.repoDescription} mt-2 text-sm text-subtle dark:text-night-subtle line-clamp-2 flex-grow`}>
          {repo.description || findTaglineByRepository(repo.name) || '説明はまだありません．'}
        </p>
        <div className={`${devLogStyles.repoMetadata} mt-4 flex items-center gap-4 text-xs text-subtle dark:text-night-subtle`}>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: languageColor }} aria-hidden="true" />
            {repo.language}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" aria-hidden="true" />
            <RollingNumber value={repo.stargazersCount} />
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
            <RollingNumber value={repo.forksCount} />
          </span>
          <span className="ml-auto">{formatRelativeTime(repo.updatedAt)}</span>
        </div>
      </a>
    </div>
  );
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

  const { ref: repoRef, isInView: reposVisible } = useInView<HTMLDivElement>();
  const { ref: contributionRef, isInView: contributionVisible } = useInView<HTMLDivElement>();
  const { ref: activityRef, isInView: activityVisible } = useInView<HTMLDivElement>();
  const contributionClipRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  // マスに重ねたときの吹き出しを置く枠
  const contributionTileRef = useRef<HTMLDivElement | null>(null);

  const isLoading = apiStatus === 'loading';
  const [noticeStatus, setNoticeStatus] = useState<ApiStatus | null>(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const hasMoreRepos = repos.length > INITIAL_DISPLAY_REPOS;

  useEffect(() => {
    if (apiStatus === 'offline' || apiStatus === 'rate_limited') {
      setNoticeStatus(apiStatus);
      const frame = requestAnimationFrame(() => setNoticeVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setNoticeVisible(false);
    const timer = window.setTimeout(() => setNoticeStatus(null), NOTICE_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [apiStatus]);

  useEffect(() => {
    const node = contributionClipRef.current;
    const container = contributionRef.current;
    if (!node || !container) return;
    if (reducedMotion) {
      node.style.removeProperty('--contribution-clip');
      return;
    }
    // スクロールで React を再描画しない．見えた列は戻るスクロールでも隠さない．
    let revealed = 0;
    return subscribeToScroll(() => {
      const bounds = container.getBoundingClientRect();
      const progress = clamp((window.innerHeight - bounds.top) / (window.innerHeight * CONTRIBUTION_ENTER_RATIO + bounds.height));
      revealed = Math.max(revealed, clamp(progress + CONTRIBUTION_REVEAL_LEAD));
      node.style.setProperty('--contribution-clip', `${((1 - revealed) * 100).toFixed(1)}%`);
    });
  }, [contributionRef, reducedMotion, isLoading]);

  return (
    <section
      id="github"
      data-testid="github-section"
      className="tinted scroll-mt-24 py-24 md:py-32 bg-mist dark:bg-night-soft/40"
    >
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="05. GitHub Integration"
          title="GitHub アクティビティ"
          description={STATIC_EXPORT
            ? `GitHubで公開している開発の記録です．リポジトリと最近の活動は${snapshotDate}に取得した情報を表示しています．`
            : `GitHub API から ${siteConfig.githubUsername} の公開リポジトリと最近の活動を取得して表示しています．`}
        />

        {/* API 接続状態の通知バナー */}
        <div className={devLogStyles.noticeSlot} data-open={noticeVisible}>
          <div>
            {noticeStatus && (
              <div
                className={`${devLogStyles.notice} flex items-start gap-3 p-4 rounded-2xl bg-mist dark:bg-night-soft border border-soft dark:border-night-border text-subtle dark:text-night-subtle`}
                role="status"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  GitHub API に接続できないため（
                  {noticeStatus === 'rate_limited' ? 'レート制限' : 'オフライン'}
                  ），取得できない箇所には保存済みの実在データを表示しています．
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 骨格と取得後のカードは同じグリッド領域を使い，交差させる． */}
        <div ref={repoRef} className={devLogStyles.repoStage} data-loading={isLoading} data-repos-visible={reposVisible} aria-busy={isLoading} aria-live="polite">
          <div className={`${devLogStyles.repoSkeleton} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`}>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div key={index} className={`${devLogStyles.skeletonCard} tile`} aria-hidden="true" />
            ))}
          </div>
          <div className={`${devLogStyles.repoContent} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`}>
            {repos.slice(0, INITIAL_DISPLAY_REPOS).map((repo, index) => <RepositoryCard key={repo.id} repo={repo} index={index} />)}
          </div>
        </div>
        <div className={devLogStyles.repoDisclosure} data-open={isShowingAllRepos} inert={!isShowingAllRepos ? true : undefined}>
          <div className={devLogStyles.repoDisclosureInner}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
              {repos.slice(INITIAL_DISPLAY_REPOS).map((repo, index) => <RepositoryCard key={repo.id} repo={repo} index={index} extra />)}
            </div>
          </div>
        </div>

        {/* すべて表示 / 折りたたみの切替ボタン */}
        <div className={`${devLogStyles.repoToggleSlot} mt-8 text-center`}>
          {!isLoading && hasMoreRepos && (
            <button
              type="button"
              onClick={() => setIsShowingAllRepos((prev) => !prev)}
              data-attract
              className={`${devLogStyles.repoToggle} press-effect group inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-soft dark:border-night-border text-ink dark:text-night-ink`}
              aria-expanded={isShowingAllRepos}
            >
              {isShowingAllRepos ? '表示を減らす' : `すべてのリポジトリを表示（全${repos.length}件）`}
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Contribution Graph（草） */}
        <div ref={contributionRef} className={`${devLogStyles.contributions} mt-14`} data-graph-visible={contributionVisible && !isLoading} data-loading={isLoading}>
          <h3 className="flex items-center gap-2 font-semibold mb-4">
            <Activity className="w-4 h-4 text-ink dark:text-night-ink" />
            Contributions
          </h3>
          <div ref={contributionClipRef} className={devLogStyles.contributionWipe}>
          {calendar ? (
            <div ref={contributionTileRef} className={`${devLogStyles.graphTile} tile relative p-5`}>
              <ContributionTooltip containerRef={contributionTileRef} />
              <p className="text-sm text-subtle dark:text-night-subtle mb-4">
                直近1年間で{' '}
                <RollingNumber
                  value={calendar.totalContributions}
                  className="font-semibold text-ink dark:text-night-ink tabular-nums"
                />{' '}
                contributions
              </p>
              <div className="overflow-x-auto pb-2">
                <div
                  className="w-max"
                  role="img"
                  aria-label={`GitHub Contribution Graph．直近1年間で${calendar.totalContributions} contributions`}
                >
                  {/* 月ラベル（本家と同じく，月が変わる週の上に置く） */}
                  <div className={`${devLogStyles.graphLabels} flex gap-[3px] ml-[26px] mb-1 h-[13px]`}>
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
                    <div className={`${devLogStyles.graphLabels} flex flex-col gap-[3px] w-[23px] shrink-0`}>
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
                    {calendar.weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col gap-[3px]">
                        {week.map((day) => (
                          <div
                            key={day.date}
                            data-contribution-date={day.date}
                            data-contribution-count={day.count}
                            className={`${devLogStyles.contributionCell} w-[10px] h-[10px] rounded-[2px] contrib-${day.level}`}
                            style={{ '--cell-delay': `${contributionCellDelay(weekIndex, day.level)}ms` } as CSSProperties}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 凡例（本家と同じ Less → More） */}
                <div className={`${devLogStyles.graphLabels} contribution-legend flex items-center justify-end gap-1 mt-3 text-[11px] text-subtle dark:text-night-subtle`}>
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
              className={`${devLogStyles.graphTile} tile p-5 overflow-x-auto`}
            >
              <div>
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
          </div>
        </div>

        {/* 手動の制作記録は API の取得状態にかかわらず表示する． */}
        {FEATURES.devLog && (
        <section className={devLogStyles.section} aria-labelledby="dev-log-heading" data-testid="dev-log">
          <header className={devLogStyles.heading}>
            <h3 id="dev-log-heading">最近の制作記録</h3>
            <p>手動で更新しています</p>
          </header>
          <ol className={devLogStyles.list}>
            {devLog.map((entry) => (
              <li key={entry.id} className={devLogStyles.entry}>
                <time dateTime={entry.date}>{entry.date}</time>
                <div>
                  <h4>{entry.title}</h4>
                  <p>{entry.change}</p>
                  <p className={devLogStyles.benefit}>{entry.benefit}</p>
                  {entry.link && (
                    <Link href={entry.link.href} className={devLogStyles.link}>
                      {entry.link.label}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
        )}

        {/* 最近のアクティビティ */}
        <div ref={activityRef} className={`${devLogStyles.activity} mt-14`} data-activity-visible={activityVisible && !isLoading} data-loading={isLoading}>
          <h3 className="flex items-center gap-2 font-semibold mb-4">
            <GitCommit className="w-4 h-4 text-ink dark:text-night-ink" />
            Recent Activity
          </h3>
          <ul className={`${devLogStyles.activityList} github-events space-y-3`}>
            {!isLoading && events.length === 0 && (
              <li className="tile p-4 text-sm text-subtle dark:text-night-subtle">
                最近の公開アクティビティはありません．
              </li>
            )}
            {events.map((event, index) => {
              const Icon = eventIcon(event.type);
              return (
                <li
                  key={event.id}
                  style={{ '--event-delay': `${staggerDelay(index, { stepMs: ACTIVITY_STEP_MS })}ms` } as CSSProperties}
                  className={`${devLogStyles.eventRow} group flex items-center gap-4 tile p-4`}
                >
                  <span className={`${devLogStyles.eventIcon} w-9 h-9 shrink-0 rounded-full bg-mist dark:bg-night flex items-center justify-center`}>
                    <Icon
                      className="w-4 h-4 text-ink dark:text-night-ink"
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
        </div>
      </div>
    </section>
  );
}
