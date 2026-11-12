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
import { readFile, access } from 'node:fs/promises';
import ts from 'typescript';

// 本人情報を設定したあとも，同じデータを基準に表示と構造化データを検証する．
async function loadDataModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const { PROFILE_FACTS, normalizeProfileFacts } = await loadDataModule('../src/data/profile.ts');
const { TIMELINE_MILESTONES } = await loadDataModule('../src/data/timeline.ts');
const { FEATURES } = await loadDataModule('../src/config/features.ts');
const { NOTES, NOTES_PATH } = await loadDataModule('../src/data/notes.ts');
const { LAB_EXPERIMENTS, LAB_PATH } = await loadDataModule('../src/data/lab.ts');
const profile = normalizeProfileFacts(PROFILE_FACTS);
const BASE_PROFILE_LABELS = ['Name', 'Education', 'Focus', 'Contact'];
const MIN_EXPANDED_TIMELINE_COUNT = 7;

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
  it('BusTimeApp・Tsumugi の見どころ各4ボタンと，見せ方の比較2ボタンが初期 HTML にある', () => {
    for (const app of ['BusTimeApp', 'Tsumugi']) {
      const controls = homePageHtml.match(new RegExp(`data-testid="app-focus-${app}"[\\s\\S]*?</div>`))?.[0] ?? '';
      assert.equal((controls.match(/<button\b/g) ?? []).length, 4, `${app} の見どころ`);
      assert.ok(controls.includes('④'), `${app} の4番目の見どころ`);
      const panel = homePageHtml.match(new RegExp(`data-app-tile="${app}"[\\s\\S]*?</article>`))?.[0] ?? '';
      const markers = [...panel.matchAll(/<span\b[^>]*aria-hidden="true"[^>]*>([①②③④])<\/span>/g)].map(match => match[1]);
      assert.deepEqual(markers, ['①', '②', '③', '④'], `${app} の番号の印`);
    }
    const comparison = homePageHtml.match(/data-testid="bus-comparison"[\s\S]*?<\/figure>/)?.[0] ?? '';
    assert.equal((comparison.match(/<button\b/g) ?? []).length, 2);
    assert.ok(comparison.includes('全時刻表を並べる'));
    assert.ok(comparison.includes('次の便だけ示す'));
  });

  it('相談できること（FEATURES.contactIntro）は，スイッチに合わせて出る・出ない', () => {
    if (!FEATURES.contactIntro) {
      assert.ok(!homePageHtml.includes('data-testid="contact-entry"'));
      return;
    }
    const contactEntry = homePageHtml.match(/data-testid="contact-entry"[\s\S]*?<\/div>/)?.[0] ?? '';
    for (const text of ['相談できること', 'Swift / SwiftUI', 'TypeScript / Next.js', 'Python', 'C / Arduino', 'ゲームづくり', 'メール・GitHub・フォーム']) {
      assert.ok(contactEntry.includes(text));
    }
  });

  it('Profile に基本プロフィールがあり，Contact には定義リストを置かない', () => {
    const contact = homePageHtml.match(/<section[^>]+id="contact"[\s\S]*?<\/section>/)?.[0] ?? '';
    const profileSection = homePageHtml.match(/<section[^>]+data-testid="profile-section"[\s\S]*?<\/section>/)?.[0] ?? '';
    assert.ok(profileSection, 'Profile セクションがありません');
    assert.doesNotMatch(contact, /data-testid="profile-specs"/);
    const specs = profileSection.match(/<dl[^>]+data-testid="profile-specs"[\s\S]*?<\/dl>/)?.[0] ?? '';
    assert.ok(specs, 'プロフィールの定義リストがありません');
    for (const label of BASE_PROFILE_LABELS) {
      assert.match(specs, new RegExp(`<dt>${label}</dt>`));
    }
    assert.equal((specs.match(/<dt>/g) ?? []).length, BASE_PROFILE_LABELS.length + Number(Boolean(profile.location)));
    assert.doesNotMatch(profileSection + contact, /〇|202X|TODO/);
    assert.equal(contact.includes('data-testid="profile-availability"'), Boolean(profile.availability));
    assert.equal(profileSection.includes('data-testid="profile-availability"'), Boolean(profile.availability));
    assert.equal(profileSection.includes('data-testid="profile-origin"'), Boolean(profile.origin));
    assert.equal(profileSection.includes('data-testid="profile-next-step"'), Boolean(profile.nextStep));
    if (!profile.origin) assert.doesNotMatch(profileSection, /<h3[^>]*>原点<\/h3>/);
    if (!profile.nextStep) assert.doesNotMatch(profileSection, /<h3[^>]*>これから<\/h3>/);
  });

  it('Profile は GitHub の後・Contact の前にあり，見出しは 06・07 の順になる', () => {
    assert.ok(homePageHtml.indexOf('id="github"') < homePageHtml.indexOf('id="profile"'));
    assert.ok(homePageHtml.indexOf('id="profile"') < homePageHtml.indexOf('id="contact"'));
    for (const [id, number, label] of [['profile', '06', 'Profile'], ['contact', '07', 'Contact']]) {
      const section = homePageHtml.match(new RegExp(`<section[^>]+id="${id}"[\\s\\S]*?</section>`))?.[0] ?? '';
      const heading = section.match(/<p[^>]+class="portfolio-eyebrow"[\s\S]*?<\/p>/)?.[0] ?? '';
      assert.match(heading, new RegExp(`portfolio-section-number"[^>]*>${number}</span>`));
      assert.ok(heading.includes(label));
    }
  });

  it('Navbar・フッターに Profile の入口があり，⌘K にもプロフィールへの移動を定義している', async () => {
    const header = homePageHtml.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    assert.match(header, /href="(?:\/)?#profile"/);
    assert.ok(header.includes('プロフィール'));
    const footer = homePageHtml.match(/<footer[^>]+id="footer"[\s\S]*?<\/footer>/)?.[0] ?? '';
    assert.match(footer, /href="\/#profile"/);
    // このスモークテストは初期 HTML を読むため，閉じている ⌘K は登録データを確認する．
    const palette = await readFile(new URL('../src/components/CommandPalette.tsx', import.meta.url), 'utf8');
    assert.match(palette, /id: 'profile', label: 'プロフィールへ移動', keywords: 'profile 経歴 about プロフィール'/);
  });

  it('手動の制作記録（FEATURES.devLog）は，スイッチに合わせて出る・出ない', () => {
    if (!FEATURES.devLog) {
      assert.ok(!homePageHtml.includes('data-testid="dev-log"'));
      return;
    }
    const devLog = homePageHtml.match(/<section[^>]+data-testid="dev-log"[\s\S]*?<\/section>/)?.[0] ?? '';
    assert.ok(devLog.includes('最近の制作記録'));
    assert.ok(devLog.includes('手動で更新しています'));
    assert.equal((devLog.match(/<time\b/g) ?? []).length, 3);
    for (const title of ['制作工程の再現と操作録画を追加', 'アプリとゲームの入口を整理', '共通の色・影・文字の太さを調整']) {
      assert.ok(devLog.includes(title));
    }
  });

  it('制作の姿勢の設計判断（FEATURES.evidence）は，スイッチに合わせて出る・出ない', () => {
    if (!FEATURES.evidence) {
      assert.ok(!homePageHtml.includes('data-testid="principle-evidence"'));
      return;
    }
    const evidence = homePageHtml.match(/data-testid="principle-evidence"[\s\S]*?<\/ul>/)?.[0] ?? '';
    for (const app of ['subghost', 'tsumugi', 'bustimeapp']) {
      assert.match(evidence, new RegExp(`href="/apps/${app}/?"`));
    }
    for (const decision of ['CLI への送信経路を持たず', '既定の診断は端末内で完結', '午前4時の運行日境界を扱い']) {
      assert.ok(evidence.includes(decision));
    }
  });

  it('Skills の制作工程と再現の注記が初期 HTML にある', () => {
    assert.ok(homePageHtml.includes('data-testid="bus-process-exhibit"'));
    assert.ok(homePageHtml.includes('時刻表から，次に乗れる便へ．'));
    assert.ok(homePageHtml.includes('再現です．実際の画面・データではありません．'));
  });

  it('日本語ページとして配信される', () => {
    assert.match(homePageHtml, /<html[^>]+lang="ja"/);
  });

  it('7つのセクションがすべて存在する', () => {
    for (const sectionId of ['hero', 'about', 'skills', 'projects', 'github', 'profile', 'contact']) {
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

  it('自己紹介の4枚のカードが，初期のHTMLにすべて置かれ，点描の惑星はページ全体で1つだけ（共有）ある', () => {
    const planetCount = (homePageHtml.match(/data-testid="showcase-dot-planet"/g) ?? []).length;
    assert.equal(planetCount, 1);
    for (const title of ['情報系の学生', 'iOS / macOSアプリ開発', '組込み・電子工作', '「Trust」を軸に']) {
      assert.ok(homePageHtml.includes(title), `自己紹介のカード「${title}」が初期のHTMLにありません`);
    }
  });

  it('問い合わせフォームがメーラーを開くことを明示している', () => {
    assert.ok(homePageHtml.includes('メールソフトで確認する'));
    // React は textarea では maxLength をそのままの表記で出力するため，大文字小文字を無視して照合する
    assert.match(homePageHtml, /maxlength="2000"/i);
  });
});

describe('アプリカタログ', () => {
  it('BusTimeApp の録画はポスターと遅延読込・再生操作を持つ', () => {
    assert.match(homePageHtml, /<video[^>]+data-testid="bustime-recording"[^>]+poster="[^"]+"[^>]+preload="none"/);
    assert.ok(homePageHtml.includes('BusTimeApp の操作録画の再生'));
    assert.ok(homePageHtml.includes('録画の日時・便は撮影時のものです．'));
  });

  // src/data/apps.ts に載せている全プロダクトのうち，アイコンの素材があるもの（トップのアイコンの壁に並ぶ）
  const WALL_APP_NAMES = [
    'Subghost',
    'BusTimeApp',
    'Fomura',
    'Ark Server × VideoPlayer',
    'TeleDeck',
    'Tsumugi',
  ];
  // アイコンの素材がないもの（トップには並べず，/apps/others でまとめて紹介する）
  const OTHER_APP_NAMES = [
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
  const WALL_REPOSITORIES = ['subghost', 'BusTimeApp', 'Fomura', 'ArkServer', 'VideoPlayer', 'TeleDeck', 'TeleDeckMac', 'Tsumugi'];
  const OTHER_REPOSITORIES = [
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
  let othersHtml = '';

  before(async () => {
    othersHtml = await (await fetch(`${BASE_URL}/apps/others`)).text();
  });

  it('17プロダクトが，トップ（6本）とその他のアプリのページ（11本）に分かれて掲載されている', () => {
    for (const appName of WALL_APP_NAMES) {
      assert.ok(homePageHtml.includes(appName), `${appName} がトップに見つかりません`);
    }
    for (const appName of OTHER_APP_NAMES) {
      assert.ok(othersHtml.includes(appName), `${appName} がその他のアプリのページに見つかりません`);
    }
    assert.equal(WALL_APP_NAMES.length + OTHER_APP_NAMES.length, 17);
  });

  it('GitHub リポジトリへのリンクが実在の URL になっている（トップとその他のアプリのページ）', () => {
    for (const repositoryName of WALL_REPOSITORIES) {
      assert.ok(homePageHtml.includes(`https://github.com/HR0101/${repositoryName}`), `${repositoryName} へのリンクがトップにありません`);
    }
    for (const repositoryName of OTHER_REPOSITORIES) {
      assert.ok(othersHtml.includes(`https://github.com/HR0101/${repositoryName}`), `${repositoryName} へのリンクがありません`);
    }
  });

  it('アイコンの壁が 6 本ぶんのタイルを，掲載順に，紹介の中身つきで置いている', () => {
    assert.ok(homePageHtml.includes('data-testid="apps-wall"'));
    assert.equal((homePageHtml.match(/data-app-tile="/g) ?? []).length, WALL_APP_NAMES.length);
    // 紹介パネルの見出し（名前）が，apps.ts の掲載順にそろっている
    const headings = [...homePageHtml.matchAll(/id="apps-wall-name-\d+"[^>]*>([^<]+)<\/h3>/g)].map((match) => match[1]);
    assert.deepEqual(headings, WALL_APP_NAMES);
    // 小さいタイルを押すと，そのアプリまでスクロールできる（固定表示のときの操作）
    for (const appName of WALL_APP_NAMES) {
      assert.ok(homePageHtml.includes(`aria-label="${appName}を大きく見る"`), `${appName} の選択ボタンが見つかりません`);
    }
    // アイコンのないアプリは，壁には並ばない
    for (const appName of OTHER_APP_NAMES) {
      assert.ok(!homePageHtml.includes(`data-app-tile="${appName}"`), `${appName} が壁に並んでいます`);
    }
  });

  it('アイコンの壁は，スクロールの長さを決める変数と，固定表示の土台を持っている', () => {
    assert.match(homePageHtml, /id="projects"[^>]*data-testid="projects-section"|data-testid="projects-section"[^>]*id="projects"/);
    // 停止位置は，アプリの数 + 2（最初と最後の一覧）
    assert.match(homePageHtml, /--stops:8/);
    assert.match(homePageHtml, /aria-label="つくったアプリ（6本）"/);
  });

  it('トップから，その他のアプリのページへ行ける', () => {
    assert.ok(homePageHtml.includes('href="/apps/others"'));
  });

  it('その他のアプリのページは，11 本のカードを掲載順に並べ，トップへ戻る導線を持つ', () => {
    assert.match(othersHtml, /<h1[^>]*>その他のアプリ<\/h1>/);
    const headings = [...othersHtml.matchAll(/id="other-app-\d+"[^>]*>([^<]+)<\/h2>/g)].map((match) => match[1]);
    assert.deepEqual(headings, OTHER_APP_NAMES);
    assert.ok(othersHtml.includes('href="/#projects"'));
    // 紹介ページ（プロダクトごとのページ）ではないので，「次のプロダクト」は出さない
    assert.ok(!othersHtml.includes('aria-label="次のプロダクト"'));
  });

  it('開発の軌跡（年表）が描画されている', () => {
    const profileSection = homePageHtml.match(/<section[^>]+data-testid="profile-section"[\s\S]*?<\/section>/)?.[0] ?? '';
    const projects = homePageHtml.match(/<section[^>]+id="projects"[\s\S]*?<\/section>/)?.[0] ?? '';
    assert.ok(profileSection.includes('開発の軌跡'));
    assert.ok(profileSection.includes('data-testid="scroll-timeline"'));
    assert.doesNotMatch(projects, /data-testid="scroll-timeline"/);
    const timeline = profileSection.match(/data-testid="scroll-timeline"[\s\S]*?<\/ol>/)?.[0] ?? '';
    assert.ok(TIMELINE_MILESTONES.length >= MIN_EXPANDED_TIMELINE_COUNT);
    assert.equal((timeline.match(/<li\b/g) ?? []).length, TIMELINE_MILESTONES.length);
    const current = TIMELINE_MILESTONES.at(-1);
    assert.ok(timeline.includes(current.period));
    assert.ok(timeline.includes(current.title));
    for (const name of current.apps) assert.ok(timeline.includes(name));
  });

  it('注目アプリに最適化済みの公式アイコンを使用している', async () => {
    assert.ok(homePageHtml.includes('subghost.webp'));
    const response = await fetch(`${BASE_URL}/projects/subghost.webp`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
  });
});

describe('メタデータと構造化データ', () => {
  it('Person の本人情報は設定時だけ出力し，追加の外部リンクも追随する', () => {
    const json = homePageHtml.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(json, 'JSON-LD がありません');
    const person = JSON.parse(json)['@graph'].find((entry) => entry['@type'] === 'Person');
    assert.ok(person, 'Person がありません');
    assert.equal('alternateName' in person, Boolean(profile.japaneseName));
    assert.equal(person.alternateName, profile.japaneseName?.name);
    assert.equal('alumniOf' in person, Boolean(profile.university));
    assert.equal('homeLocation' in person, Boolean(profile.location));
    if (profile.university) {
      assert.deepEqual(person.alumniOf, { '@type': 'CollegeOrUniversity', name: profile.university });
    }
    if (profile.location) {
      assert.deepEqual(person.homeLocation, { '@type': 'Place', name: profile.location });
    }
    assert.deepEqual(person.sameAs, [...new Set([
      'https://github.com/HR0101', ...profile.socialLinks.map((link) => link.url),
    ])]);
  });

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

describe('アプリ専用ページ', () => {
  let tsumugiHtml = '';
  let busTimeHtml = '';
  let subghostHtml = '';
  let arkHtml = '';

  before(async () => {
    tsumugiHtml = await (await fetch(`${BASE_URL}/apps/tsumugi`)).text();
    busTimeHtml = await (await fetch(`${BASE_URL}/apps/bustimeapp`)).text();
    subghostHtml = await (await fetch(`${BASE_URL}/apps/subghost`)).text();
    arkHtml = await (await fetch(`${BASE_URL}/apps/arkserver`)).text();
  });

  it('BusTimeApp の紹介ページが配信される', () => {
    assert.match(busTimeHtml, /次のバスへ/);
    assert.ok(busTimeHtml.includes('/projects/bustimeapp-screens/morning.webp'));
  });

  it('Tsumugi の紹介ページが配信される', () => {
    assert.match(tsumugiHtml, /一枚の布になる/);
    assert.match(tsumugiHtml, /半減期/);
  });

  it('Tsumugi の5画面がタブとして並ぶ', () => {
    assert.match(tsumugiHtml, /role="tablist"/);
    for (const tab of ['ライブラリ', '要約', '信頼度', '鮮度', 'ダイジェスト']) {
      assert.ok(tsumugiHtml.includes(tab), `タブ「${tab}」が見つかりません`);
    }
  });

  it('Tsumugi の実機スクリーンショットを WebP で読み込む', () => {
    for (const shot of ['library', 'item-summary', 'credibility', 'freshness', 'digest']) {
      assert.ok(
        tsumugiHtml.includes(`/projects/tsumugi-screens/${shot}.webp`),
        `${shot}.webp が見つかりません`,
      );
    }
    // 重い PNG を直接参照していないこと
    assert.ok(!tsumugiHtml.includes('/projects/tsumugi-screens/library.png'));
  });

  it('Subghost の紹介ページが配信される', () => {
    assert.match(subghostHtml, /終わったら分かる/);
    assert.match(subghostHtml, /ノッチ/);
  });

  it('Subghost の状態表にフックイベントと2状態が並ぶ', () => {
    for (const event of ['SessionStart', 'UserPromptSubmit', 'PermissionRequest', 'Stop', 'SessionEnd']) {
      assert.ok(subghostHtml.includes(event), `${event} が見つかりません`);
    }
    assert.ok(subghostHtml.includes('Working'));
    assert.ok(subghostHtml.includes('Done'));
  });

  it('Subghost が監視専用であることを明記している', () => {
    assert.match(subghostHtml, /プロンプトを送らない/);
    assert.match(subghostHtml, /プロセスを終了しない/);
    // 本文プレビューが既定で無効であること
    assert.match(subghostHtml, /既定で読まない/);
  });

  it('各アプリページから GitHub リポジトリへ導線がある', () => {
    assert.ok(tsumugiHtml.includes('https://github.com/HR0101/Tsumugi'));
    assert.ok(busTimeHtml.includes('https://github.com/HR0101/BusTimeApp'));
    assert.ok(subghostHtml.includes('https://github.com/HR0101/subghost'));
    assert.ok(arkHtml.includes('https://github.com/HR0101/ArkServer'));
    assert.ok(arkHtml.includes('https://github.com/HR0101/VideoPlayer'));
  });

  it('アプリ専用の OGP 画像が生成される', async () => {
    for (const path of ['/apps/tsumugi', '/apps/subghost', '/apps/ekihub', '/apps/arkserver']) {
      const response = await fetch(`${BASE_URL}${path}/opengraph-image`);
      assert.equal(response.status, 200, `${path} の OGP 画像が返りません`);
      assert.equal(response.headers.get('content-type'), 'image/png');
    }
  });

  it('sitemap にすべてのアプリページが登録される', async () => {
    const xml = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
    for (const path of ['/apps/bustimeapp', '/apps/tsumugi', '/apps/subghost', '/apps/ekihub', '/apps/arkserver', '/apps/others', '/games']) {
      assert.ok(xml.includes(path), `${path} が sitemap にありません`);
    }
  });

  it('トップページから各アプリページへ遷移できる', () => {
    for (const path of ['/apps/bustimeapp', '/apps/tsumugi', '/apps/subghost', '/apps/ekihub', '/apps/arkserver']) {
      assert.ok(homePageHtml.includes(path), `${path} へのリンクがありません`);
    }
  });

  it('紹介ページの末尾から次の紹介ページへ進める', () => {
    // Subghost → BusTimeApp → Ark Server → Tsumugi の順に並ぶ（apps.ts の掲載順）
    assert.match(subghostHtml, /aria-label="次のプロダクト"[\s\S]*?href="\/apps\/bustimeapp"/);
    assert.match(busTimeHtml, /aria-label="次のプロダクト"[\s\S]*?href="\/apps\/arkserver"/);
    assert.match(arkHtml, /aria-label="次のプロダクト"[\s\S]*?href="\/apps\/tsumugi"/);
  });

  it('利用規約のページには次の紹介ページへの導線を出さない', async () => {
    const termsHtml = await (await fetch(`${BASE_URL}/apps/bustimeapp/terms`)).text();
    assert.ok(!termsHtml.includes('aria-label="次のプロダクト"'));
  });

  it('Ark Server の紹介ページが配信される', () => {
    // 見出しと画面名で，アプリの用途を直接説明する
    assert.match(arkHtml, /Ark Server/);
    assert.match(arkHtml, /手元の端末で/);
    assert.match(arkHtml, /自宅のメディアライブラリ/);
    assert.match(arkHtml, /そのほかの機能/);
    assert.match(arkHtml, /ソースコード/);
    for (const room of ['配信の開始・接続設定', '動画の一覧', 'アルバムの一覧', '動画の再生', '再生方法を選ぶ', '差分動画の検索', '動画の切り替え', '見どころの解析']) {
      assert.ok(arkHtml.includes(room), `画面の説明「${room}」がありません`);
    }
    assert.match(arkHtml, /説明を見る/);
    assert.ok(arkHtml.includes('/projects/arkserver.svg'));
    // 旧名は，ページの見出し・本文に残さない（GitHub のリポジトリ名だけは，改名するまで旧名のまま）
    assert.ok(!arkHtml.includes('AllServerForMac を'), '旧名が本文に残っています');
    assert.match(arkHtml, /Bonjour/);
    // 画面は実際のアプリの画像で，LAN の情報はぼかしてあることを断っている
    assert.match(arkHtml, /撮影用に作った合成映像/);
    assert.match(arkHtml, /QR コードは，家の LAN の情報なので/);
  });

  it('改名前の紹介ページ（AllServerForMac）から，新しいページへ転送される', async () => {
    const response = await fetch(`${BASE_URL}/apps/allserverformac`, { redirect: 'manual' });
    assert.ok([301, 308].includes(response.status), `転送されません（${response.status}）`);
    assert.match(response.headers.get('location') ?? '', /\/apps\/arkserver\/?$/);
  });

  it('Ark Server の iPhone アプリの画面を，シミュレータの撮影と断って載せている', async () => {
    assert.match(arkHtml, /iPhone アプリ/);
    assert.match(arkHtml, /シミュレータ/);
    assert.match(arkHtml, /実機ではありません/);
    assert.match(arkHtml, /aria-label="VideoPlayer（iPhone）の画面を選ぶ"/);
    for (const shot of ['ios-lock', 'ios-albums', 'ios-home', 'ios-variants', 'ios-player', 'ios-remote']) {
      const response = await fetch(`${BASE_URL}/projects/arkserver-screens/${shot}.webp`);
      assert.equal(response.status, 200, `${shot}.webp が配信されません`);
    }
  });

  it('Ark Server の紹介ページに，動きで見せる部品がそろっている', () => {
    // 数字の帯（機能の数は more-data.ts の合計）と，段階が流れる図
    assert.match(arkHtml, /ツアーのほかにも/);
    assert.match(arkHtml, /Mac を探す/);
    assert.match(arkHtml, /PIN で接続/);
    assert.match(arkHtml, /動画と写真を見る/);
    // ミニデモは，実際の画面ではないと断っている
    assert.match(arkHtml, /操作デモ/);
    assert.match(arkHtml, /アプリの動きを再現した図です．実際の画面ではありません/);
    // 「ほかにも」の絞り込みと，ツアーの自動再生の切り替え
    assert.match(arkHtml, /aria-label="分野で絞り込む"/);
    assert.match(arkHtml, /自動再生を止める/);
  });

  it('Ark Server の「ほかにも」で6分野の機能を紹介している', () => {
    for (const group of ['再生まわり', 'お楽しみ再生', 'いろいろな見方', '整理まわり', '解析まわり', '配信・ブラウザまわり']) {
      assert.ok(arkHtml.includes(group), `分野「${group}」が見つかりません`);
    }
    for (const feature of ['字幕と音声トラック', 'マイチャンネル', '同時再生', '重複チェック', '尺が違う動画の部分一致', '1080p の軽量版']) {
      assert.ok(arkHtml.includes(feature), `機能「${feature}」が見つかりません`);
    }
  });

  it('Ark Server の8画面がタブとして並び，画像が実在する', async () => {
    assert.match(arkHtml, /role="tablist"/);
    assert.match(arkHtml, /role="tabpanel"/);
    for (const tab of ['ダッシュボード', 'ライブラリ', 'アルバム', 'プレイヤー', 'お楽しみ再生', '差分を探す', '切り替え再生', 'シーン抽出']) {
      assert.ok(arkHtml.includes(tab), `タブ「${tab}」が見つかりません`);
    }
    // ページが参照する WebP は，すべて public に置かれている
    const shots = [...arkHtml.matchAll(/\/projects\/arkserver-screens\/([\w-]+\.webp)/g)].map((match) => match[1]);
    assert.ok(shots.length >= 8, `画像の参照が少なすぎます（${shots.length}）`);
    for (const shot of new Set(shots)) {
      const response = await fetch(`${BASE_URL}/projects/arkserver-screens/${shot}`);
      assert.equal(response.status, 200, `${shot} が配信されません`);
    }
  });
});

describe('Web サービスとゲーム', () => {
  it('EkiHub の路線図と単純化の注記が初期 HTML にある', () => {
    assert.ok(homePageHtml.includes('data-testid="ekihub-route-exhibit"'));
    assert.ok(homePageHtml.includes('東京・川崎・船橋から集合候補の新木場へ集まる説明図'));
    assert.ok(homePageHtml.includes('説明用に単純化した例です．'));
  });

  let ekihubHtml = '';
  let gamesHtml = '';

  before(async () => {
    ekihubHtml = await (await fetch(`${BASE_URL}/apps/ekihub`)).text();
    gamesHtml = await (await fetch(`${BASE_URL}/games`)).text();
  });

  it('トップページには Web サービス（EkiHub）のセクションがあり，ゲームは別ページへ案内している', () => {
    assert.ok(homePageHtml.includes('id="works"'));
    assert.ok(homePageHtml.includes('EkiHub'));
    assert.ok(homePageHtml.includes('https://ekihub.jp/'));
    assert.ok(homePageHtml.includes('href="/games"'));
    // ゲームのパネル（横に流れるギャラリー）はトップには置かない
    assert.ok(!homePageHtml.includes('works-game-panel'));
    assert.ok(!homePageHtml.includes('/projects/works/pittomart-softcream.webp'));
  });

  it('ゲームのページに，2 つのゲームのパネルと公開中の URL がある', () => {
    assert.ok(gamesHtml.includes('ブラウザで遊べるゲーム'));
    assert.ok(gamesHtml.includes('data-testid="games-page"'));
    for (const name of ['ピッとマート', 'ふしぎなどうぶつえん']) {
      assert.ok(gamesHtml.includes(name), `${name} が見つかりません`);
    }
    for (const url of ['https://games.hr0101.dev/', 'https://horror.hr0101.dev/']) {
      assert.ok(gamesHtml.includes(url), `${url} へのリンクがありません`);
    }
    assert.ok(gamesHtml.includes('href="/#works"'));
    // 紹介ページ（プロダクトごとのページ）ではないので，「次のプロダクト」は出さない
    assert.ok(!gamesHtml.includes('aria-label="次のプロダクト"'));
  });

  it('ゲームの実画面を WebP で読み込む', () => {
    for (const shot of ['pittomart-softcream', 'curious-zoo-title']) {
      assert.ok(gamesHtml.includes(`/projects/works/${shot}.webp`), `${shot}.webp が見つかりません`);
    }
  });

  it('ホラーゲームに年齢の目安を添えている', () => {
    assert.ok(gamesHtml.includes('15歳以上推奨'));
  });

  it('EkiHub の紹介ページが配信される', () => {
    assert.match(ekihubHtml, /みんなの真ん中/);
    assert.match(ekihubHtml, /海の上/);
    assert.ok(ekihubHtml.includes('https://ekihub.jp/'));
    assert.ok(ekihubHtml.includes('https://github.com/HR0101/EkiHub'));
  });

  it('EkiHub の紹介ページは実際の画面を WebP で見せる', () => {
    for (const shot of ['mob-result', 'bay-result', 'input', 'result', 'theme-glass']) {
      assert.ok(ekihubHtml.includes(`/projects/ekihub-screens/${shot}.webp`), `${shot}.webp が見つかりません`);
    }
    // 画面の切り替えは WAI-ARIA のタブパターン
    assert.match(ekihubHtml, /role="tablist"/);
    assert.match(ekihubHtml, /role="tabpanel"/);
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

describe('Pages Functions と Apple Music の配信準備', () => {
  it('GitHub 3 本と音楽の Pages Functions が存在する', async () => {
    for (const path of ['github/index.ts', 'github/activity.ts', 'github/contributions.ts', 'music/recent.ts']) {
      await access(new URL(`../functions/api/${path}`, import.meta.url));
    }
  });

  it('ローカルの Secret は Git 対象外で，設定例の値は空になっている', async () => {
    const ignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
    assert.match(ignore, /^\.dev\.vars$/m);
    assert.match(ignore, /^AuthKey_\*\.p8$/m);
    const example = await readFile(new URL('../.dev.vars.example', import.meta.url), 'utf8');
    const entries = example.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('#'));
    assert.equal(entries.length, 5);
    for (const entry of entries) assert.match(entry, /^[A-Z_]+=\s*$/);
  });

  it('Pages と Next の本番 CSP が一致し，ジャケットの画像ホストを許可する', async () => {
    const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
    const pagesCsp = headers.match(/Content-Security-Policy: (.+)/)?.[1];
    const response = await fetch(BASE_URL);
    const nextCsp = response.headers.get('content-security-policy');
    assert.equal(nextCsp, pagesCsp);
    assert.match(pagesCsp, /img-src[^;]*https:\/\/\*\.mzstatic\.com/);
    const config = await readFile(new URL('../next.config.mjs', import.meta.url), 'utf8');
    assert.match(config, /img-src[^\n]*https:\/\/\*\.mzstatic\.com/);
  });

  it('静的な初期 HTML には曲の枠も単体テスト用の曲名も出さない', () => {
    assert.doesNotMatch(homePageHtml, /data-testid="recent-music"/);
    assert.doesNotMatch(homePageHtml, /最近聴いた曲|テスト曲|テスト奏者|テストアルバム/);
  });
});

describe('章の間の演出・実験室・制作ノート・実装の展示室', () => {
  let labHtml = '';
  let notesHtml = '';
  let sitemapXml = '';
  const noteHtmlBySlug = new Map();

  before(async () => {
    sitemapXml = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
    if (FEATURES.lab) labHtml = await (await fetch(`${BASE_URL}${LAB_PATH}`)).text();
    if (FEATURES.notes) {
      notesHtml = await (await fetch(`${BASE_URL}${NOTES_PATH}`)).text();
      for (const note of NOTES) {
        const response = await fetch(`${BASE_URL}${NOTES_PATH}/${note.slug}`);
        assert.equal(response.status, 200, `${note.slug} が 200 を返しません`);
        noteHtmlBySlug.set(note.slug, await response.text());
      }
    }
  });

  it('章の間の点の波・短い言葉の帯・署名・背景が，読み上げ対象外の装飾として置かれている', () => {
    for (const testId of ['ambient-skills-apps', 'ambient-apps-works', 'ambient-works-github', 'ambient-github-profile', 'ambient-profile', 'signature-contact', 'rays-contact']) {
      assert.match(homePageHtml, new RegExp(`aria-hidden="true"[^>]*data-testid="${testId}"|data-testid="${testId}"[^>]*aria-hidden="true"`), `${testId} が装飾として見つかりません`);
    }
    for (const testId of ['statement-apps', 'statement-works', 'statement-source']) {
      assert.ok(homePageHtml.includes(`data-testid="${testId}"`), `${testId} が見つかりません`);
    }
  });

  it('Skills の「実装の展示室」（FEATURES.skillLab）は，スイッチが切れていればホームに出ない', () => {
    if (!FEATURES.skillLab) {
      assert.ok(!homePageHtml.includes('data-testid="skill-lab"'));
      assert.ok(!homePageHtml.includes('実装の展示室'));
      return;
    }
    assert.ok(homePageHtml.includes('data-testid="skill-lab"'));
    for (const tab of ['C / Arduino', 'Python', 'Web', 'Tsumugi']) assert.ok(homePageHtml.includes(tab), `${tab} のタブがありません`);
    assert.ok(homePageHtml.includes('data-testid="skill-lab-hardware"'));
    for (const hidden of ['skill-lab-python', 'skill-lab-web', 'skill-lab-tsumugi']) {
      assert.ok(!homePageHtml.includes(`data-testid="${hidden}"`), `${hidden} が選ばれていないのに描かれています`);
    }
    // 再現であることを，画面の文でも示している
    assert.ok(homePageHtml.includes('再現です'));
  });

  it('Apps に「できることから探す」の索引がある（閲覧モードの切替は固定表示が使えるときだけ，ブラウザで描かれる）', () => {
    assert.ok(homePageHtml.includes('できることから探す'));
    assert.ok(homePageHtml.includes('data-testid="capability-index"'));
    assert.ok(homePageHtml.includes('ホーム画面のウィジェット'));
  });

  it('実験室・制作ノート（FEATURES.lab / notes）は，スイッチが切れていればホーム・sitemap・ナビに出ず，ページも 404 になる', async () => {
    if (!FEATURES.lab) {
      assert.ok(!homePageHtml.includes('data-testid="lab-teaser"'));
      assert.ok(!sitemapXml.includes(LAB_PATH));
      assert.equal((await fetch(`${BASE_URL}${LAB_PATH}`)).status, 404);
    }
    if (!FEATURES.notes) {
      assert.ok(!homePageHtml.includes('data-testid="notes-teaser"'));
      assert.ok(!sitemapXml.includes(`${NOTES_PATH}/`));
      assert.equal((await fetch(`${BASE_URL}${NOTES_PATH}`)).status, 404);
    }
    if (!FEATURES.lab || !FEATURES.notes) return;
    assert.ok(homePageHtml.includes('data-testid="lab-teaser"'));
    assert.ok(homePageHtml.includes(`href="${LAB_PATH}"`));
    assert.ok(homePageHtml.includes('data-testid="notes-teaser"'));
    assert.ok(homePageHtml.includes(`href="${NOTES_PATH}/"`) || homePageHtml.includes(`href="${NOTES_PATH}"`));
  });

  it('実験室のページに，すべての実験のカードと状態の表示がある（FEATURES.lab のとき）', () => {
    if (!FEATURES.lab) return;
    assert.ok(labHtml.includes('data-testid="lab-page"'));
    assert.ok(LAB_EXPERIMENTS.length >= 10, '実験は 10 個以上');
    for (const experiment of LAB_EXPERIMENTS) {
      assert.ok(labHtml.includes(`data-testid="lab-experiment-${experiment.id}"`), `${experiment.id} のカードがありません`);
      assert.ok(labHtml.includes(experiment.title), `${experiment.title} が見つかりません`);
    }
    assert.ok(labHtml.includes('試作'));
  });

  it('制作ノートの一覧と各記事が 200 で返り，根拠・図・目次が揃っている（FEATURES.notes のとき）', () => {
    if (!FEATURES.notes) return;
    assert.ok(notesHtml.includes('data-testid="notes-page"'));
    assert.ok(NOTES.length >= 6, 'ノートは 6 本以上');
    for (const note of NOTES) {
      assert.ok(notesHtml.includes(note.title), `一覧に ${note.title} がありません`);
      const html = noteHtmlBySlug.get(note.slug);
      assert.ok(html.includes(`data-testid="note-${note.slug}"`), `${note.slug} の記事の目印がありません`);
      for (const heading of ['課題', '制約', '判断', '確かめたこと']) assert.ok(html.includes(heading), `${note.slug} に「${heading}」がありません`);
      assert.ok(html.includes('根拠'), `${note.slug} に根拠がありません`);
    }
  });

  it('存在しない制作ノートは 404 になる', async () => {
    const response = await fetch(`${BASE_URL}${NOTES_PATH}/no-such-note`);
    assert.equal(response.status, 404);
  });

  it('sitemap に実験室と制作ノートが載る（それぞれのスイッチが入っているとき）', () => {
    if (!FEATURES.lab || !FEATURES.notes) return;
    assert.ok(sitemapXml.includes(LAB_PATH));
    assert.ok(sitemapXml.includes(`${NOTES_PATH}/`));
    for (const note of NOTES) assert.ok(sitemapXml.includes(`${NOTES_PATH}/${note.slug}/`), `${note.slug} が sitemap にありません`);
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

describe('読み込み画面', () => {
  it('初回だけ出すための起動スクリプトと，画面の土台が HTML に含まれる', () => {
    // 起動スクリプトは，初回の訪問のときだけ html に is-preloading を付ける．
    // 動きを減らす設定と 2 回目以降（sessionStorage）では付けない
    assert.ok(homePageHtml.includes('is-preloading'));
    assert.ok(homePageHtml.includes('portfolio:preloaded'));
    assert.ok(homePageHtml.includes('prefers-reduced-motion: reduce'));
    // 画面の土台．読み上げ向けに状態（role="status"）を持つ
    assert.match(homePageHtml, /class="page-loader"[^>]*role="status"/);
  });

  it('サーバーが返す html には is-preloading が付いていない（JS が無ければ何も出ない）', () => {
    // 付けるのはブラウザ側の起動スクリプトだけ．付かなければ読み込み画面は display: none のまま
    assert.ok(!/<html[^>]*class="[^"]*\bis-preloading\b/.test(homePageHtml));
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
    const html = await response.text();
    assert.ok(html.includes('ページが見つかりません'));
    // 迷子を表すターミナルは実在のコマンドの出力にそろえる
    assert.ok(html.includes('cd ./this-page'));
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
