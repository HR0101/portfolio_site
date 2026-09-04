/**
 * 本番ビルドしたサイトを実際に起動して確認する E2E スモークテスト．
 *
 * 実行前に `npm run build` が必要（未ビルドの場合は分かるように失敗する）．
 *   npm run build && npm test
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// 開発用サーバー（3001）とぶつからないポートを使う
const TEST_PORT = 3111;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
// 起動を待つ最大時間（ミリ秒）
const STARTUP_TIMEOUT_MS = 60000;
const STARTUP_POLL_INTERVAL_MS = 400;

let serverProcess = null;
let homePageHtml = '';

// サーバーが応答するまで待つ
async function waitForServer() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        return;
      }
    } catch {
      // まだ起動していないだけなので待つ
    }
    await delay(STARTUP_POLL_INTERVAL_MS);
  }
  throw new Error(
    `${STARTUP_TIMEOUT_MS}ms 以内にサーバーが起動しませんでした．先に \`npm run build\` を実行してください．`,
  );
}

before(async () => {
  serverProcess = spawn('npx', ['next', 'start', '-p', String(TEST_PORT)], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  await waitForServer();
  homePageHtml = await (await fetch(BASE_URL)).text();
});

after(() => {
  serverProcess?.kill('SIGTERM');
});

describe('トップページの基本構造', () => {
  it('日本語ページとして配信される', () => {
    assert.match(homePageHtml, /<html[^>]+lang="ja"/);
  });

  it('6つのセクションがすべて存在する', () => {
    for (const sectionId of ['hero', 'about', 'skills', 'projects', 'github', 'contact']) {
      assert.ok(
        homePageHtml.includes(`id="${sectionId}"`),
        `セクション #${sectionId} が見つかりません`,
      );
    }
  });

  it('キーボード利用者向けのスキップリンクがある', () => {
    assert.ok(homePageHtml.includes('本文へスキップ'));
    assert.ok(homePageHtml.includes('id="main-content"'));
  });

  it('見出し h1 がページに1つだけある', () => {
    const h1Count = (homePageHtml.match(/<h1[\s>]/g) ?? []).length;
    assert.equal(h1Count, 1);
  });

  it('問い合わせフォームがメーラーを開くことを明示している', () => {
    assert.ok(homePageHtml.includes('メールソフトで確認する'));
    // React は textarea では maxLength をそのままの表記で出力するため，大文字小文字を無視して照合する
    assert.match(homePageHtml, /maxlength="2000"/i);
  });
});

describe('アプリカタログ', () => {
  // src/data/apps.ts に載せている全プロダクト
  const APP_NAMES = [
    'Subghost',
    'BusTimeApp',
    'Fomura',
    'AllServerForMac × VideoPlayer',
    'TeleDeck',
    'Tsumugi',
    'MenuDock',
    'MyDock',
    'BarPocket',
    'Glance × GlanceHost',
    'CIT-Campus-3D',
    'IntroDon',
    'PhotoVaultApp',
    'VideoPlayer for Mac',
    'GymRoutineApp',
    'WiFiKeyboard',
    'BusTime',
  ];

  it('17プロダクトすべてが掲載されている', () => {
    for (const appName of APP_NAMES) {
      assert.ok(homePageHtml.includes(appName), `${appName} が見つかりません`);
    }
  });

  it('GitHub リポジトリへのリンクが実在の URL になっている', () => {
    const repositoryNames = [
      'subghost',
      'BusTimeApp',
      'Fomura',
      'AllServerForMac',
      'VideoPlayer',
      'TeleDeck',
      'TeleDeckMac',
      'Tsumugi',
      'MenuDock',
      'MyDock',
      'BarPocket',
      'Glance',
      'GlanceHost',
      'CIT-Campus-3D',
      'IntroDon',
      'IntroDon-for-Mac',
      'PhotoVaultApp',
      'VideoPlayer-for-Mac',
      'GymRoutineApp',
      'WiFiKeyboard_iOS',
      'WiFiKeyboard_Mac',
      'BusTime',
    ];

    for (const repositoryName of repositoryNames) {
      assert.ok(
        homePageHtml.includes(`https://github.com/HR0101/${repositoryName}`),
        `${repositoryName} へのリンクが見つかりません`,
      );
    }
  });

  it('プラットフォーム絞り込みタブがアクセシブルに実装されている', () => {
    assert.ok(homePageHtml.includes('role="tablist"'));
    assert.ok(homePageHtml.includes('role="tabpanel"'));
    assert.ok(homePageHtml.includes('aria-controls="apps-panel"'));
  });

  it('開発の軌跡（年表）が描画されている', () => {
    assert.ok(homePageHtml.includes('開発の軌跡'));
    assert.ok(homePageHtml.includes('data-testid="scroll-timeline"'));
  });

  it('注目アプリに最適化済みの公式アイコンを使用している', async () => {
    assert.ok(homePageHtml.includes('subghost.webp'));
    const response = await fetch(`${BASE_URL}/projects/subghost.webp`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
  });
});

describe('メタデータと構造化データ', () => {
  it('title と description が設定されている', () => {
    assert.match(homePageHtml, /<title>[^<]*Ryuto Hara[^<]*<\/title>/);
    assert.ok(homePageHtml.includes('name="description"'));
  });

  it('OGP と Twitter カードが設定されている', () => {
    assert.ok(homePageHtml.includes('property="og:title"'));
    assert.ok(homePageHtml.includes('property="og:image"'));
    assert.ok(homePageHtml.includes('name="twitter:card"'));
  });

  it('構造化データにアプリ一覧が含まれる', () => {
    assert.ok(homePageHtml.includes('application/ld+json'));
    assert.ok(homePageHtml.includes('"@type":"SoftwareApplication"'));
    assert.ok(homePageHtml.includes('"numberOfItems":17'));
  });
});

describe('補助ファイル', () => {
  it('robots.txt に sitemap が記載されている', async () => {
    const response = await fetch(`${BASE_URL}/robots.txt`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Sitemap:/i);
  });

  it('sitemap.xml が XML として配信される', async () => {
    const response = await fetch(`${BASE_URL}/sitemap.xml`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<urlset/);
  });

  it('OGP 画像が PNG として生成される', async () => {
    const response = await fetch(`${BASE_URL}/opengraph-image`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
  });

  it('ファビコンが配信される', async () => {
    const response = await fetch(`${BASE_URL}/icon.svg`);
    assert.equal(response.status, 200);
  });
});

describe('GitHub API ルート', () => {
  const VALID_STATUSES = ['success', 'offline', 'rate_limited', 'no_token'];

  it('リポジトリ API は必ず 200 を返し，状態を apiStatus で伝える', async () => {
    const response = await fetch(`${BASE_URL}/api/github`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(VALID_STATUSES.includes(data.apiStatus), `想定外の apiStatus: ${data.apiStatus}`);
    assert.ok(Array.isArray(data.repos) && data.repos.length > 0);
    // フォールバックでも実在するリポジトリを返す（架空データを混ぜない）
    for (const repo of data.repos) {
      assert.match(repo.htmlUrl, /^https:\/\/github\.com\/HR0101\//);
    }
  });

  it('アクティビティ API が配列を返す', async () => {
    const response = await fetch(`${BASE_URL}/api/github/activity`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(VALID_STATUSES.includes(data.apiStatus));
    assert.ok(Array.isArray(data.events));
  });

  it('Contribution API がカレンダーまたは null を返す', async () => {
    const response = await fetch(`${BASE_URL}/api/github/contributions`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(VALID_STATUSES.includes(data.apiStatus));
    assert.ok(data.calendar === null || Array.isArray(data.calendar.weeks));
  });
});

describe('テーマとマニフェスト', () => {
  it('既定は白基調（dark クラスが付いていない）', () => {
    // 初期表示のちらつき防止スクリプトは，dark が保存されているときだけ .dark を付ける
    assert.ok(!/<html[^>]*class="[^"]*\bdark\b/.test(homePageHtml));
    assert.ok(homePageHtml.includes("localStorage.getItem('theme')"));
  });

  it('Web アプリマニフェストが配信される', async () => {
    const response = await fetch(`${BASE_URL}/manifest.webmanifest`);
    assert.equal(response.status, 200);
    const manifest = await response.json();
    assert.equal(manifest.lang, 'ja');
    assert.ok(manifest.icons.length > 0);
  });
});

describe('キャッシュ制御', () => {
  it('API レスポンスにキャッシュ指示が付いている', async () => {
    const response = await fetch(`${BASE_URL}/api/github`);
    assert.match(response.headers.get('cache-control') ?? '', /s-maxage=\d+/);
    // 状態はヘッダーからも読める
    assert.ok(response.headers.get('x-api-status'));
  });
});

describe('エラー処理とセキュリティ', () => {
  it('存在しないページで専用の 404 を返す', async () => {
    const response = await fetch(`${BASE_URL}/no-such-page`);
    assert.equal(response.status, 404);
    assert.ok((await response.text()).includes('ページが見つかりません'));
  });

  it('セキュリティヘッダーが付与されている', async () => {
    const response = await fetch(BASE_URL);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.ok(response.headers.get('referrer-policy'));
    assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'self'/);
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin');
    // フレームワーク名は隠す
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});
