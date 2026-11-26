/**
 * ビルド時に GitHub の公開情報を取得して JSON に書き出すスクリプト．
 *
 * 静的書き出し（S3 などへの配置）ではサーバー側の API ルートが使えないため，
 * ビルドの時点で取得した内容を同梱し，ブラウザはそれを読む．
 *
 *   node scripts/fetch-github-snapshot.mjs
 *
 * GITHUB_TOKEN があればレート制限が緩和され，草（Contribution Graph）と言語のコード量も取得する．
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
// 言語のコード量を集計するとき，1 ページで読むリポジトリの数・たどるページの上限・1 リポジトリの言語の数
const LANGUAGE_REPOS_PER_PAGE = 100;
const MAX_LANGUAGE_PAGES = 5;
const LANGUAGES_PER_REPO = 20;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

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

// 公開リポジトリ（フォークを除く）全体の言語ごとのコード量．GraphQL のみで一度に取れるため，トークンがある場合だけ試みる
// （src/lib/edge/github.ts の getGitHubLanguages と同じ集計）
async function fetchLanguages() {
  if (!process.env.GITHUB_TOKEN) {
    return null;
  }
  const query = `query($login: String!, $after: String) {
    user(login: $login) {
      repositories(first: ${LANGUAGE_REPOS_PER_PAGE}, after: $after, privacy: PUBLIC, isFork: false, ownerAffiliations: OWNER) {
        pageInfo { hasNextPage endCursor }
        nodes { languages(first: ${LANGUAGES_PER_REPO}, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } }
      }
    }
  }`;
  const totals = new Map();
  let after = null;
  for (let page = 1; page <= MAX_LANGUAGE_PAGES; page += 1) {
    const data = await fetchJson('https://api.github.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { login: USERNAME, after } }),
    });
    const repositories = data?.data?.user?.repositories;
    if (data?.errors?.length || !repositories || !Array.isArray(repositories.nodes)) {
      throw new Error('言語のコード量を読み取れませんでした');
    }
    for (const repository of repositories.nodes) {
      for (const edge of repository?.languages?.edges ?? []) {
        const name = edge?.node?.name;
        const size = edge?.size;
        if (typeof name !== 'string' || !name || typeof size !== 'number' || !(size > 0)) continue;
        // 色は style へ渡すので，#rrggbb の形だけを残す
        const color = HEX_COLOR.test(edge.node.color ?? '') ? edge.node.color : totals.get(name)?.color;
        const total = (totals.get(name)?.size ?? 0) + size;
        totals.set(name, color ? { name, size: total, color } : { name, size: total });
      }
    }
    if (!repositories.pageInfo?.hasNextPage || !repositories.pageInfo.endCursor) break;
    after = repositories.pageInfo.endCursor;
  }
  const languages = [...totals.values()].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  return languages.length > 0 ? languages : null;
}

async function main() {
  const snapshot = { generatedAt: new Date().toISOString(), repos: [], events: [], calendar: null };
  const failures = [];

  for (const [key, task] of [
    ['repos', fetchRepos],
    ['events', fetchEvents],
    ['calendar', fetchContributions],
    ['languages', fetchLanguages],
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

  // 言語のコード量は取れたときだけ載せる（無ければ画面はリポジトリの件数で割合を出す）
  if (!snapshot.languages) {
    delete snapshot.languages;
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.info(
    `✓ スナップショットを保存しました（リポジトリ${snapshot.repos.length}件 / 活動${snapshot.events.length}件 / 草${snapshot.calendar ? 'あり' : 'なし'} / 言語のコード量${snapshot.languages ? 'あり' : 'なし'}）`,
  );
  failures.forEach((message) => console.warn(`  ※ 取得できなかった項目 → ${message}`));
}

main().catch((error) => {
  console.warn('⚠ スナップショットの更新に失敗しました:', error.message);
});
