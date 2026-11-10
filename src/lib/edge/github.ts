// 他モジュールを参照せず，通信と時刻を差し替えて検証できる取得処理．
export type GitHubStatus = 'success' | 'offline' | 'rate_limited' | 'no_token';
export const githubTtl = { repos: 600, activity: 300, contributions: 1800 } as const;
const reposPerPage = 100;
const maxPages = 5;
const eventsPerPage = 10;
const timeoutMs = 8000;
const contributionThresholds = [1, 3, 6, 10];

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
export interface ContributionCalendar {
  totalContributions: number;
  weeks: Array<Array<{ date: string; count: number; level: number }>>;
}
interface Options {
  username: string;
  token?: string;
  fetch?: typeof fetch;
  now?: () => number;
  fallbackRepos?: GitHubRepo[];
  fallbackEvents?: GitHubEvent[];
}
interface RawRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count?: number;
  forks_count?: number;
  updated_at?: string;
  topics?: string[];
}
interface RawEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload?: { size?: number; commits?: unknown[]; ref_type?: string };
}

function headers(token?: string): Record<string, string> {
  return {
    'User-Agent': 'Portfolio-Site-App',
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(options: Options, url: string, init: RequestInit = {}) {
  return (options.fetch ?? fetch)(url, {
    ...init,
    headers: { ...headers(options.token), ...init.headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function failureStatus(response: Response): GitHubStatus {
  if (response.status === 403 || response.status === 429) return 'rate_limited';
  if (response.status === 401) return 'no_token';
  return 'offline';
}

export async function getGitHubRepos(options: Options): Promise<{ repos: GitHubRepo[]; apiStatus: GitHubStatus }> {
  const fallback = (apiStatus: GitHubStatus) => ({ repos: options.fallbackRepos ?? [], apiStatus });
  try {
    const raw: RawRepo[] = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const response = await request(options, `https://api.github.com/users/${encodeURIComponent(options.username)}/repos?sort=updated&per_page=${reposPerPage}&page=${page}`);
      if (!response.ok) {
        if (raw.length === 0) return fallback(failureStatus(response));
        break;
      }
      const rows: RawRepo[] = await response.json();
      if (!Array.isArray(rows)) return fallback('offline');
      raw.push(...rows);
      if (rows.length < reposPerPage) break;
    }
    const repos = raw.map((repo) => {
      // 上流から受け取った URL も，リンクへ渡す前にホストを限定する．
      const url = new URL(repo.html_url);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) {
        throw new Error('リポジトリ URL の形式が不正です');
      }
      return {
        id: repo.id, name: repo.name, htmlUrl: url.href,
        description: repo.description ?? '', language: repo.language ?? 'Other',
        stargazersCount: repo.stargazers_count ?? 0, forksCount: repo.forks_count ?? 0,
        updatedAt: repo.updated_at ?? new Date((options.now ?? Date.now)()).toISOString(),
        topics: repo.topics ?? [],
      };
    });
    return { repos, apiStatus: 'success' };
  } catch {
    return fallback('offline');
  }
}

function describeEvent(event: RawEvent): string {
  const name = event.repo.name.split('/').pop() ?? event.repo.name;
  switch (event.type) {
    case 'PushEvent': {
      const count = event.payload?.size ?? event.payload?.commits?.length ?? 0;
      return count > 0 ? `${name} に ${count}件のコミットをプッシュ` : `${name} にプッシュ`;
    }
    case 'CreateEvent': return event.payload?.ref_type === 'repository' ? `${name} を新規作成` : `${name} にブランチを作成`;
    case 'WatchEvent': return `${name} にスターを付けた`;
    case 'ForkEvent': return `${name} をフォーク`;
    case 'IssuesEvent': return `${name} の Issue を更新`;
    case 'PullRequestEvent': return `${name} のプルリクエストを更新`;
    case 'PublicEvent': return `${name} を公開`;
    default: return `${name} で活動`;
  }
}

export async function getGitHubActivity(options: Options): Promise<{ events: GitHubEvent[]; apiStatus: GitHubStatus }> {
  const fallback = (apiStatus: GitHubStatus) => ({ events: options.fallbackEvents ?? [], apiStatus });
  try {
    const response = await request(options, `https://api.github.com/users/${encodeURIComponent(options.username)}/events/public?per_page=${eventsPerPage}`);
    if (!response.ok) return fallback(failureStatus(response));
    const raw: RawEvent[] = await response.json();
    if (!Array.isArray(raw)) return fallback('offline');
    return {
      events: raw.map((event) => ({
        id: event.id, type: event.type, repoName: event.repo.name,
        summary: describeEvent(event), createdAt: event.created_at,
      })),
      apiStatus: 'success',
    };
  } catch {
    return fallback('offline');
  }
}

export async function getGitHubContributions(options: Options): Promise<{ calendar: ContributionCalendar | null; apiStatus: GitHubStatus }> {
  const fallback = (apiStatus: GitHubStatus) => ({ calendar: null, apiStatus });
  if (!options.token) return fallback('no_token');
  try {
    const response = await request(options, 'https://api.github.com/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query ($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }',
        variables: { login: options.username },
      }),
    });
    if (!response.ok) return fallback(failureStatus(response));
    const json = await response.json();
    if (json?.errors?.some((error: { type?: string }) => error.type === 'RATE_LIMITED')) return fallback('rate_limited');
    const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar as {
      totalContributions: number;
      weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }>;
    } | undefined;
    if (json?.errors?.length || !calendar || !Array.isArray(calendar.weeks)) return fallback('offline');
    return {
      calendar: {
        totalContributions: calendar.totalContributions,
        weeks: calendar.weeks.map((week) => week.contributionDays.map((day) => ({
          date: day.date, count: day.contributionCount,
          level: contributionThresholds.filter((threshold) => day.contributionCount >= threshold).length,
        }))),
      },
      apiStatus: 'success',
    };
  } catch {
    return fallback('offline');
  }
}
