/**
 * ビルド時に GitHub の公開情報を取得して JSON に書き出すスクリプト．
 *
 * 静的書き出し（S3 などへの配置）ではサーバー側の API ルートが使えないため，
 * ビルドの時点で取得した内容を同梱し，ブラウザはそれを読む．
 *
 *   node scripts/fetch-github-snapshot.mjs
 *
 * GITHUB_TOKEN があればレート制限が緩和され，草（Contribution Graph）も取得する．
 * 取得に失敗しても既存のスナップショットを残し，ビルドは止めない．
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const USERNAME = process.env.GITHUB_USERNAME ?? 'HR0101';
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'github-snapshot.json');
const REQUEST_TIMEOUT_MS = 15000;
// 一覧に載せるリポジトリの上限
const MAX_REPOS = 12;
// 最近の活動として載せる件数
const MAX_EVENTS = 6;

function buildHeaders() {
  const headers = {
    'User-Agent': 'portfolio-site-snapshot',
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { ...buildHeaders(), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} が ${response.status} を返しました`);
  }
  return response.json();
}

// イベントの種類を日本語の一文にする（画面表示と同じ言い回しに揃える）
function describeEvent(event) {
  const repoName = event.repo?.name?.split('/')[1] ?? event.repo?.name ?? '';
  switch (event.type) {
    case 'PushEvent':
      return `${repoName} に${event.payload?.size ?? 1}件のコミットをプッシュ`;
    case 'CreateEvent':
      return event.payload?.ref_type === 'repository'
        ? `${repoName} を新規作成`
        : `${repoName} にブランチを作成`;
    case 'PullRequestEvent':
      return `${repoName} のプルリクエストを更新`;
    case 'WatchEvent':
      return `${repoName} にスターを付けた`;
    case 'ForkEvent':
      return `${repoName} をフォーク`;
    default:
      return `${repoName} を更新`;
  }
}

async function fetchRepos() {
  const raw = await fetchJson(
    `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=100`,
  );
  return raw
    .filter((repo) => !repo.fork)
    .slice(0, MAX_REPOS)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      htmlUrl: repo.html_url,
      description: repo.description ?? '',
      language: repo.language ?? 'Other',
      stargazersCount: repo.stargazers_count ?? 0,
      forksCount: repo.forks_count ?? 0,
      updatedAt: repo.pushed_at ?? repo.updated_at,
      topics: repo.topics ?? [],
    }));
}

async function fetchEvents() {
  const raw = await fetchJson(
    `https://api.github.com/users/${USERNAME}/events/public?per_page=30`,
  );
  return raw.slice(0, MAX_EVENTS).map((event) => ({
    id: String(event.id),
    type: event.type,
    repoName: event.repo?.name ?? '',
    summary: describeEvent(event),
    createdAt: event.created_at,
  }));
}

// 草は GraphQL のみで取得できるため，トークンがある場合だけ試みる
async function fetchContributions() {
  if (!process.env.GITHUB_TOKEN) {
    return null;
  }
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }`;
  const data = await fetchJson('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });
  const calendar = data?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    return null;
  }
  // 表示に使う濃淡（0〜4）へ変換する
  const toLevel = (count) => (count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4);
  return {
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) =>
      week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
        level: toLevel(day.contributionCount),
      })),
    ),
  };
}

async function main() {
  const snapshot = { generatedAt: new Date().toISOString(), repos: [], events: [], calendar: null };
  const failures = [];

  for (const [key, task] of [
    ['repos', fetchRepos],
    ['events', fetchEvents],
    ['calendar', fetchContributions],
  ]) {
    try {
      snapshot[key] = await task();
    } catch (error) {
      failures.push(`${key}: ${error.message}`);
    }
  }

  if (snapshot.repos.length === 0) {
    console.warn('⚠ リポジトリを取得できませんでした．既存のスナップショットを残します．');
    failures.forEach((message) => console.warn(`  - ${message}`));
    return;
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.info(
    `✓ スナップショットを保存しました（リポジトリ${snapshot.repos.length}件 / 活動${snapshot.events.length}件 / 草${snapshot.calendar ? 'あり' : 'なし'}）`,
  );
  failures.forEach((message) => console.warn(`  ※ 取得できなかった項目 → ${message}`));
}

main().catch((error) => {
  console.warn('⚠ スナップショットの更新に失敗しました:', error.message);
});
