import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

async function loadModule(name) {
  const source = await readFile(new URL(`../src/lib/edge/${name}.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}
const { getGitHubRepos, getGitHubActivity, getGitHubContributions, githubTtl } = await loadModule('github');
const { serveApi } = await loadModule('http');
const snapshot = JSON.parse(await readFile(new URL('../src/data/github-snapshot.json', import.meta.url), 'utf8'));
const options = { username: 'HR0101', token: randomUUID(), now: () => 0, fallbackRepos: snapshot.repos, fallbackEvents: snapshot.events };
const rawRepo = { id: 1, name: 'fixture', html_url: 'https://github.com/HR0101/fixture', description: null, language: null };
const rawEvent = { id: '1', type: 'PushEvent', repo: { name: 'HR0101/fixture' }, created_at: '2026-01-01T00:00:00Z', payload: { size: 2 } };
const handlers = [[getGitHubRepos, 'repos'], [getGitHubActivity, 'events'], [getGitHubContributions, 'calendar']];

test('リポジトリは既存の JSON のキーとデフォルト値を保つ', async () => {
  const result = await getGitHubRepos({ ...options, fetch: async (url, init) => {
    assert.ok(url.includes('/users/HR0101/repos?sort=updated&per_page=100&page=1'));
    assert.equal(init.headers.Authorization, `Bearer ${options.token}`);
    assert.ok(init.signal);
    return Response.json([rawRepo]);
  } });
  assert.deepEqual(result, { repos: [{
    id: 1, name: 'fixture', htmlUrl: rawRepo.html_url, description: '', language: 'Other',
    stargazersCount: 0, forksCount: 0, updatedAt: '1970-01-01T00:00:00.000Z', topics: [],
  }], apiStatus: 'success' });
});

test('リポジトリはページをたどり，途中の制限では取得済みのデータを残す', async () => {
  let calls = 0;
  const result = await getGitHubRepos({ ...options, fetch: async () => {
    calls += 1;
    return calls === 1 ? Response.json(Array.from({ length: 100 }, () => rawRepo)) : new Response(null, { status: 403 });
  } });
  assert.equal(calls, 2);
  assert.equal(result.repos.length, 100);
  assert.equal(result.apiStatus, 'success');
});

test('イベントは既存のキーと push の説明を保ち，コミット数の欠落にも対応する', async () => {
  const result = await getGitHubActivity({ ...options, fetch: async (url) => {
    assert.ok(url.endsWith('/events/public?per_page=10'));
    return Response.json([rawEvent, { ...rawEvent, payload: {} }, { ...rawEvent, payload: { commits: [{}] } }]);
  } });
  assert.deepEqual(result.events[0], { id: '1', type: 'PushEvent', repoName: 'HR0101/fixture', summary: 'fixture に 2件のコミットをプッシュ', createdAt: rawEvent.created_at });
  assert.equal(result.events[1].summary, 'fixture にプッシュ');
  assert.equal(result.events[2].summary, 'fixture に 1件のコミットをプッシュ');
  assert.equal(result.apiStatus, 'success');
});

test('GraphQL は週・日・濃淡を既存の JSON へ変換する', async () => {
  const result = await getGitHubContributions({ ...options, fetch: async (url, init) => {
    assert.equal(url, 'https://api.github.com/graphql');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body).variables, { login: options.username });
    return Response.json({ data: { user: { contributionsCollection: { contributionCalendar: {
      totalContributions: 20, weeks: [{ contributionDays: [0, 1, 3, 6, 10].map((contributionCount) => ({ date: '2026-01-01', contributionCount })) }],
    } } } } });
  } });
  assert.equal(result.apiStatus, 'success');
  assert.equal(result.calendar.totalContributions, 20);
  assert.deepEqual(result.calendar.weeks[0].map((day) => day.level), [0, 1, 2, 3, 4]);
  assert.deepEqual(Object.keys(result.calendar.weeks[0][0]).sort(), ['count', 'date', 'level']);
});

test('トークンなしの草は通信せず no_token，公開 REST は匿名で取得できる', async () => {
  assert.deepEqual(await getGitHubContributions({ ...options, token: '', fetch: () => { throw new Error(); } }), { calendar: null, apiStatus: 'no_token' });
  for (const [handler] of handlers.slice(0, 2)) {
    const result = await handler({ ...options, token: '', fetch: async (_url, init) => {
      assert.equal(init.headers.Authorization, undefined);
      return Response.json([]);
    } });
    assert.equal(result.apiStatus, 'success');
  }
});

test('制限・認証失敗・通信失敗を 200 と apiStatus で返し，snapshot の形を保つ', async () => {
  for (const [handler, field] of handlers) {
    for (const [status, expected] of [[403, 'rate_limited'], [429, 'rate_limited'], [401, 'no_token'], [500, 'offline']]) {
      const response = await serveApi(new Request('https://portfolio.example/api/github'), { ttl: 600, load: () => handler({ ...options, fetch: async () => new Response(null, { status }) }) });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.apiStatus, expected);
      assert.deepEqual(data[field], field === 'calendar' ? null : snapshot[field]);
      assert.equal(JSON.stringify(data).includes(options.token), false);
    }
    const result = await handler({ ...options, fetch: async () => { throw new Error(options.token); } });
    assert.equal(result.apiStatus, 'offline');
    assert.equal(JSON.stringify(result).includes(options.token), false);
  }
});

test('壊れた JSON と GraphQL のエラーも安全にフォールバックする', async () => {
  for (const [handler] of handlers) {
    assert.equal((await handler({ ...options, fetch: async () => new Response('invalid') })).apiStatus, 'offline');
  }
  assert.equal((await getGitHubContributions({ ...options, fetch: async () => Response.json({ errors: [{ type: 'RATE_LIMITED' }] }) })).apiStatus, 'rate_limited');
  assert.equal((await getGitHubRepos({ ...options, fetch: async () => Response.json([{ ...rawRepo, html_url: 'javascript:alert(1)' }]) })).apiStatus, 'offline');
});

test('Cache API のキーはクエリと末尾スラッシュを正規化し，TTL と同じ応答を共有する', async () => {
  for (const ttl of Object.values(githubTtl)) {
    const store = new Map();
    const jobs = [];
    let loads = 0;
    const config = {
      ttl,
      cache: { match: async (key) => store.get(key.url)?.clone(), put: async (key, response) => { store.set(key.url, response); } },
      waitUntil: (promise) => jobs.push(promise),
      load: async () => { loads += 1; return { repos: [], apiStatus: 'success' }; },
    };
    const first = await serveApi(new Request('https://portfolio.example/api/github/?b=2&a=1'), config);
    await Promise.all(jobs);
    const second = await serveApi(new Request('https://portfolio.example/api/github?unused=3'), config);
    assert.equal(loads, 1);
    assert.equal(first.headers.get('cache-control'), `public, max-age=${ttl}, s-maxage=${ttl}`);
    assert.equal(second.headers.get('x-api-status'), 'success');
    assert.deepEqual(await second.json(), { repos: [], apiStatus: 'success' });
    assert.equal(second.headers.get('access-control-allow-origin'), null);
  }
});

test('成功以外の応答は短い TTL でしか保存せず，一時的な失敗が長く居座らない', async () => {
  const failed = await serveApi(new Request('https://portfolio.example/api/github/contributions'), { ttl: 1800, load: async () => ({ calendar: null, apiStatus: 'offline' }) });
  assert.equal(failed.headers.get('cache-control'), 'public, max-age=30, s-maxage=30');
  const shortTtl = await serveApi(new Request('https://portfolio.example/api/github/contributions'), { ttl: 10, load: async () => ({ apiStatus: 'rate_limited' }) });
  assert.equal(shortTtl.headers.get('cache-control'), 'public, max-age=10, s-maxage=10');
});

test('Cache API が失敗しても取得を続け，GET 以外は 405 で止める', async () => {
  const response = await serveApi(new Request('https://portfolio.example/api/github'), {
    ttl: 300,
    cache: { match: async () => { throw new Error(); }, put: async () => { throw new Error(); } },
    load: async () => ({ events: [], apiStatus: 'offline' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).apiStatus, 'offline');
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
    const response = await serveApi(new Request('https://portfolio.example/api/github', { method }), { ttl: 300, load: () => { throw new Error(); } });
    assert.equal(response.status, 405);
  }
});

async function clientService(fetchWithTimeout, store = new Map()) {
  const source = await readFile(new URL('../src/services/githubService.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key),
  };
  const module = { exports: {} };
  const require = (name) => name.endsWith('.json') ? snapshot : { fetchWithTimeout };
  // 静的書き出しの環境でも同じオリジンを呼ぶことを検証する．
  new Function('require', 'module', 'exports', 'window', 'localStorage', 'process', compiled)(require, module, module.exports, { localStorage }, localStorage, { env: { NEXT_PUBLIC_STATIC_EXPORT: '1' } });
  return module.exports;
}

test('静的書き出しのクライアントも API を呼び，失敗状態・404・タイムアウトで snapshot に戻る', async () => {
  for (const failure of ['offline', 'rate_limited', 'no_token', '404', 'timeout']) {
    const paths = [];
    const client = await clientService(async (path) => {
      paths.push(path);
      if (failure === 'timeout') throw new Error('タイムアウト');
      if (failure === '404') return new Response(null, { status: 404 });
      return Response.json({ repos: [], events: [], calendar: null, apiStatus: failure });
    });
    assert.deepEqual((await client.fetchRepos()).repos, snapshot.repos);
    assert.deepEqual((await client.fetchActivity()).events, snapshot.events);
    assert.deepEqual((await client.fetchContributions()).calendar, snapshot.calendar);
    assert.deepEqual(paths, ['/api/github', '/api/github/activity', '/api/github/contributions']);
  }
});

test('イベントのブラウザキャッシュは 10 分以内だけ使い，最新の成功応答を保存する', async () => {
  for (const [minutes, expectedCalls] of [[9, 0], [11, 1]]) {
    let calls = 0;
    const store = new Map([['github_activity_cache_v3', JSON.stringify({ timestamp: Date.now() - minutes * 60 * 1000, data: snapshot.events })]]);
    const client = await clientService(async () => {
      calls += 1;
      return Response.json({ events: [], apiStatus: 'success' });
    }, store);
    await client.fetchActivity();
    await client.fetchActivity();
    assert.equal(calls, expectedCalls);
  }
});
