// GitHub 連携用の型定義・静的フォールバックデータ・クライアント側フェッチ処理

import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import githubSnapshot from '../data/github-snapshot.json';

// 静的書き出し（S3 などへ置く形）ではサーバー側の API ルートが存在しないため，
// ビルド時に取得して同梱したスナップショットをそのまま使う．
const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';

// スナップショットの中身（JSON なので，使う側で型を与える）
const snapshotRepos = githubSnapshot.repos as GitHubRepo[];
const snapshotEvents = githubSnapshot.events as GitHubEvent[];
const snapshotCalendar = githubSnapshot.calendar as ContributionCalendar | null;

// ─────────────────────────────────────
// 型定義
// ─────────────────────────────────────

export interface GitHubRepo {
  id: number;
  name: string;
  htmlUrl: string;
  description: string;
  language: string;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  topics: string[];
}

export interface GitHubEvent {
  id: string;
  type: string;
  repoName: string;
  summary: string;
  createdAt: string;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: number; // 0〜4 の濃淡レベル
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionDay[][];
}

export type ApiStatus = 'success' | 'offline' | 'rate_limited' | 'no_token';

export interface ReposResponse {
  repos: GitHubRepo[];
  apiStatus: ApiStatus;
}

export interface ActivityResponse {
  events: GitHubEvent[];
  apiStatus: ApiStatus;
}

export interface ContributionsResponse {
  calendar: ContributionCalendar | null;
  apiStatus: ApiStatus;
}

// ─────────────────────────────────────
// オフライン時のフォールバック（モック）データ
// ─────────────────────────────────────

export const staticRepos: GitHubRepo[] = [
  {
    id: 1,
    name: 'AllServerForMac',
    htmlUrl: 'https://github.com/HR0101/AllServerForMac',
    description: '自宅の Mac を個人用メディアサーバーにする macOS アプリ',
    language: 'Swift',
    stargazersCount: 0,
    forksCount: 0,
    updatedAt: '2026-09-03T03:54:56Z',
    topics: ['swift', 'swiftui', 'macos', 'bonjour'],
  },
  {
    id: 2,
    name: 'Tsumugi',
    htmlUrl: 'https://github.com/HR0101/Tsumugi',
    description: '共有シートで保存した記事を要約・信頼度診断する iOS アプリ',
    language: 'Swift',
    stargazersCount: 0,
    forksCount: 0,
    updatedAt: '2026-08-28T01:15:16Z',
    topics: ['swift', 'swiftui', 'ios'],
  },
  {
    id: 3,
    name: 'BusTimeApp',
    htmlUrl: 'https://github.com/HR0101/BusTimeApp',
    description: '「次に乗れる便」を最短の操作で示すバス時刻表アプリ',
    language: 'Swift',
    stargazersCount: 0,
    forksCount: 0,
    updatedAt: '2026-08-21T01:00:58Z',
    topics: ['swift', 'swiftui', 'widgetkit', 'ios'],
  },
  {
    id: 4,
    name: 'subghost',
    htmlUrl: 'https://github.com/HR0101/subghost',
    description: 'AI CLI のタスク状態を Mac のノッチに表示する常駐アプリ',
    language: 'Swift',
    stargazersCount: 0,
    forksCount: 0,
    updatedAt: '2026-08-16T16:12:58Z',
    topics: ['swift', 'swiftui', 'macos'],
  },
  {
    id: 5,
    name: 'TeleDeck',
    htmlUrl: 'https://github.com/HR0101/TeleDeck',
    description: 'iPad を Mac の操作デッキに変えるリモートコントローラ',
    language: 'Swift',
    stargazersCount: 1,
    forksCount: 0,
    updatedAt: '2026-08-11T16:56:00Z',
    topics: ['swift', 'swiftui', 'ipados'],
  },
  {
    id: 6,
    name: 'Fomura',
    htmlUrl: 'https://github.com/HR0101/Fomura',
    description: 'カメラで骨格を推定し筋トレのフォームを採点する iOS アプリ',
    language: 'Swift',
    stargazersCount: 0,
    forksCount: 0,
    updatedAt: '2026-07-03T02:41:46Z',
    topics: ['swift', 'mediapipe', 'ios'],
  },
];

export const staticEvents: GitHubEvent[] = [
  {
    id: 'static-1',
    type: 'PushEvent',
    repoName: 'HR0101/AllServerForMac',
    summary: 'AllServerForMac にコミットをプッシュ',
    createdAt: '2026-09-03T03:54:56Z',
  },
  {
    id: 'static-2',
    type: 'PushEvent',
    repoName: 'HR0101/Tsumugi',
    summary: 'Tsumugi にコミットをプッシュ',
    createdAt: '2026-08-28T01:15:16Z',
  },
  {
    id: 'static-3',
    type: 'PushEvent',
    repoName: 'HR0101/BusTimeApp',
    summary: 'BusTimeApp にコミットをプッシュ',
    createdAt: '2026-08-21T01:00:58Z',
  },
  {
    id: 'static-4',
    type: 'PushEvent',
    repoName: 'HR0101/subghost',
    summary: 'subghost にコミットをプッシュ',
    createdAt: '2026-08-16T16:12:58Z',
  },
  {
    id: 'static-5',
    type: 'PushEvent',
    repoName: 'HR0101/TeleDeck',
    summary: 'TeleDeck にコミットをプッシュ',
    createdAt: '2026-08-11T16:56:00Z',
  },
  {
    id: 'static-6',
    type: 'PushEvent',
    repoName: 'HR0101/Fomura',
    summary: 'Fomura にコミットをプッシュ',
    createdAt: '2026-07-03T02:41:46Z',
  },
];

// ─────────────────────────────────────
// localStorage キャッシュ（有効期限つき）
// ─────────────────────────────────────

const CACHE_LIMIT_MS = 60 * 60 * 1000; // キャッシュ有効期間：1時間
const REPOS_CACHE_KEY = 'github_repos_cache_v4';
const ACTIVITY_CACHE_KEY = 'github_activity_cache_v2';
const CONTRIB_CACHE_KEY = 'github_contrib_cache_v1';

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch {
    // プライベートブラウジング等で localStorage が使えない場合は無視
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch {
    // 容量超過等のエラーは無視（キャッシュなしで動作継続）
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch {
    // 無視
  }
}

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

// 有効期限内のキャッシュを読み出す（期限切れ・破損時は null）
function readCache<T>(key: string): T | null {
  const raw = safeGetItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    const isFresh =
      parsed &&
      typeof parsed.timestamp === 'number' &&
      Date.now() - parsed.timestamp < CACHE_LIMIT_MS;
    if (isFresh && parsed.data !== undefined) {
      return parsed.data;
    }
  } catch {
    // 破損したキャッシュは削除する
    safeRemoveItem(key);
  }
  return null;
}

function writeCache<T>(key: string, data: T): void {
  safeSetItem(key, JSON.stringify({ timestamp: Date.now(), data }));
}

// ─────────────────────────────────────
// クライアント側フェッチ処理
// （キャッシュ → API → 静的モック の順でフォールバック）
// ─────────────────────────────────────

// リポジトリ一覧を取得する
export async function fetchRepos(): Promise<ReposResponse> {
  if (IS_STATIC_EXPORT) {
    return { repos: snapshotRepos.length > 0 ? snapshotRepos : staticRepos, apiStatus: 'success' };
  }
  const cached = readCache<GitHubRepo[]>(REPOS_CACHE_KEY);
  if (cached) {
    return { repos: cached, apiStatus: 'success' };
  }

  try {
    const response = await fetchWithTimeout('/api/github');
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    const data: ReposResponse = await response.json();
    if (data.apiStatus === 'success' && Array.isArray(data.repos)) {
      writeCache(REPOS_CACHE_KEY, data.repos);
    }
    return {
      repos: Array.isArray(data.repos) ? data.repos : staticRepos,
      apiStatus: data.apiStatus,
    };
  } catch {
    return { repos: staticRepos, apiStatus: 'offline' };
  }
}

// 最近のアクティビティを取得する
export async function fetchActivity(): Promise<ActivityResponse> {
  if (IS_STATIC_EXPORT) {
    return {
      events: snapshotEvents.length > 0 ? snapshotEvents : staticEvents,
      apiStatus: 'success',
    };
  }
  const cached = readCache<GitHubEvent[]>(ACTIVITY_CACHE_KEY);
  if (cached) {
    return { events: cached, apiStatus: 'success' };
  }

  try {
    const response = await fetchWithTimeout('/api/github/activity');
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    const data: ActivityResponse = await response.json();
    if (data.apiStatus === 'success' && Array.isArray(data.events)) {
      writeCache(ACTIVITY_CACHE_KEY, data.events);
    }
    return {
      events: Array.isArray(data.events) ? data.events : staticEvents,
      apiStatus: data.apiStatus,
    };
  } catch {
    return { events: staticEvents, apiStatus: 'offline' };
  }
}

// Contribution Graph（草）のデータを取得する
export async function fetchContributions(): Promise<ContributionsResponse> {
  if (IS_STATIC_EXPORT) {
    return {
      calendar: snapshotCalendar,
      apiStatus: snapshotCalendar ? 'success' : 'no_token',
    };
  }
  const cached = readCache<ContributionCalendar>(CONTRIB_CACHE_KEY);
  if (cached) {
    return { calendar: cached, apiStatus: 'success' };
  }

  try {
    const response = await fetchWithTimeout('/api/github/contributions');
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    const data: ContributionsResponse = await response.json();
    if (data.apiStatus === 'success' && data.calendar) {
      writeCache(CONTRIB_CACHE_KEY, data.calendar);
    }
    return data;
  } catch {
    // 取得失敗時は画像フォールバック表示に切り替えてもらう
    return { calendar: null, apiStatus: 'offline' };
  }
}
