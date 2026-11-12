import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = await readFile(new URL('../src/data/profile.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { PROFILE_FACTS, buildProfileSpecs, buildProfilePersonProperties, normalizeProfileFacts } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const site = {
  displayName: 'Ryuto Hara', githubUsername: 'HR0101',
  email: 'hr0101.dev@gmail.com', githubUrl: 'https://github.com/HR0101',
};
const baseLabels = ['Name', 'Education', 'Focus', 'Contact'];
// 以下の本人情報は動作確認だけに使う架空の入力．公開用データには入れない．
const sampleFacts = {
  japaneseName: { name: '試験 姓名', reading: 'しけん せいめい' },
  university: '検証大学', graduation: '卒業予定年のテスト値', location: '検証用の所在地',
  availability: { label: 'ステータスのテスト値', detail: '補足のテスト値' },
  socialLinks: [{ name: '技術記事', url: 'https://example.com/articles' }],
  credentials: ['資格のテスト値', '受賞のテスト値'],
  origin: '原点のテスト文です．', nextStep: 'これからのテスト文です．',
};

test('未設定では確認済みの基本4行だけを表示する', () => {
  const specs = buildProfileSpecs({}, site);
  assert.deepEqual(specs.map(({ label }) => label), baseLabels);
  assert.equal(specs[0].value, 'Ryuto Hara (HR0101)');
  assert.equal(specs[1].value, '情報工学を専攻');
  assert.equal(specs[2].value, 'iOS・macOS（Swift / SwiftUI）／ Web（TypeScript / Next.js）／ 端末間の連携');
  assert.deepEqual(specs[3], { label: 'Contact', value: site.email, href: `mailto:${site.email}` });
  assert.doesNotMatch(JSON.stringify(specs), /漢字|大学|卒|所在地|ステータス|SNS|資格|Location|Status|Credentials/);
});

test('公開データにプレースホルダーが混ざらず，追加した事実が表示へ追随する', () => {
  const specs = buildProfileSpecs(PROFILE_FACTS, site);
  const profile = normalizeProfileFacts(PROFILE_FACTS);
  assert.deepEqual(specs.slice(0, baseLabels.length).map(({ label }) => label), baseLabels);
  assert.doesNotMatch(JSON.stringify([PROFILE_FACTS, specs]), /〇|◯|X|202X|TODO|未定/);
  const optionalRowCount = Number(Boolean(profile.location)) + Number(Boolean(profile.availability))
    + profile.socialLinks.length + Number(Boolean(profile.credentials.length));
  assert.equal(specs.length, baseLabels.length + optionalRowCount);
  if (!profile.japaneseName && !profile.university && !profile.graduation && optionalRowCount === 0) {
    assert.deepEqual(specs, buildProfileSpecs({}, site));
  }
  for (const credential of profile.credentials) {
    assert.ok(specs.some(({ label, value }) => label === 'Credentials' && value.includes(credential)));
  }
});

test('漢字氏名と読みがあれば英字氏名の前に表示する', () => {
  assert.equal(buildProfileSpecs({ japaneseName: { name: '試験 姓名' } }, site)[0].value,
    '試験 姓名 / Ryuto Hara (HR0101)');
  assert.equal(buildProfileSpecs(sampleFacts, site)[0].value,
    '試験 姓名（しけん せいめい） / Ryuto Hara (HR0101)');
});

test('大学名と卒年は設定した部分だけを Education に足す', () => {
  const education = (facts) => buildProfileSpecs(facts, site).find(({ label }) => label === 'Education').value;
  assert.equal(education({ university: sampleFacts.university }), '検証大学・情報工学専攻');
  assert.equal(education({ graduation: sampleFacts.graduation }), '情報工学を専攻（卒業予定年のテスト値）');
  assert.equal(education(sampleFacts), '検証大学・情報工学専攻（卒業予定年のテスト値）');
});

test('所在地・ステータス・外部リンク・資格は設定されたときだけ行になる', () => {
  const specs = buildProfileSpecs(sampleFacts, site);
  const row = (label) => specs.find((spec) => spec.label === label);
  assert.deepEqual(row('Location'), { label: 'Location', value: sampleFacts.location });
  assert.deepEqual(row('Status'), { label: 'Status', value: 'ステータスのテスト値 / 補足のテスト値' });
  assert.deepEqual(row('技術記事'), {
    label: '技術記事', value: sampleFacts.socialLinks[0].url, href: sampleFacts.socialLinks[0].url,
  });
  assert.deepEqual(row('Credentials'), { label: 'Credentials', value: '資格のテスト値／受賞のテスト値' });
  assert.equal(buildProfileSpecs({ availability: { label: '確認用' } }, site).at(-1).value, '確認用');
});

test('空文字・空白だけの項目は未設定扱いで，前後の空白を除く', () => {
  const blankFacts = {
    japaneseName: { name: ' \n ', reading: '読みだけ' }, university: '', graduation: ' ', location: '\t',
    availability: { label: ' ', detail: '補足だけ' },
    socialLinks: [{ name: ' ', url: 'https://example.com' }, { name: '空URL', url: ' ' }],
    credentials: ['', ' \n '],
    origin: ' \n ', nextStep: '\t',
  };
  assert.deepEqual(buildProfileSpecs(blankFacts, site), buildProfileSpecs({}, site));
  assert.deepEqual(buildProfilePersonProperties(blankFacts, site), { sameAs: [site.githubUrl] });
  const paddedFacts = {
    japaneseName: { name: ' 試験 姓名 ', reading: ' しけん せいめい ' },
    university: ' 検証大学 ', graduation: ' 卒業予定年のテスト値 ', location: ' 検証用の所在地 ',
    availability: { label: ' ステータスのテスト値 ', detail: ' 補足のテスト値 ' },
    socialLinks: [{ name: ' 技術記事 ', url: ' https://example.com/articles ' }],
    credentials: [' 資格のテスト値 ', ' 受賞のテスト値 '],
    origin: ' 原点のテスト文です． ', nextStep: ' これからのテスト文です． ',
  };
  assert.deepEqual(buildProfileSpecs(paddedFacts, site), buildProfileSpecs(sampleFacts, site));
  assert.deepEqual(normalizeProfileFacts(paddedFacts), normalizeProfileFacts(sampleFacts));
  assert.equal(buildProfileSpecs({ japaneseName: { name: '試験', reading: ' ' } }, site)[0].value,
    '試験 / Ryuto Hara (HR0101)');
  assert.equal(buildProfileSpecs({ availability: { label: '確認用', detail: ' ' } }, site).at(-1).value, '確認用');
});

test('不正な外部 URL は画面にも JSON-LD にも含めない', () => {
  const facts = { socialLinks: [
    { name: '不正', url: 'javascript:alert(1)' }, { name: '相対', url: '/articles' },
    { name: '不正', url: 'https://' },
  ] };
  assert.deepEqual(buildProfileSpecs(facts, site), buildProfileSpecs({}, site));
  assert.deepEqual(buildProfilePersonProperties(facts, site), { sameAs: [site.githubUrl] });
});

test('Person は確認済みの属性だけを足し，GitHub を sameAs の先頭に保つ', () => {
  assert.deepEqual(buildProfilePersonProperties({}, site), { sameAs: [site.githubUrl] });
  assert.deepEqual(buildProfilePersonProperties(sampleFacts, site), {
    alternateName: sampleFacts.japaneseName.name,
    alumniOf: { '@type': 'CollegeOrUniversity', name: sampleFacts.university },
    homeLocation: { '@type': 'Place', name: sampleFacts.location },
    sameAs: [site.githubUrl, sampleFacts.socialLinks[0].url],
  });
  const repeatedLink = { socialLinks: [{ name: 'GitHub', url: site.githubUrl }] };
  assert.deepEqual(buildProfilePersonProperties(repeatedLink, site).sameAs, [site.githubUrl]);
});

test('同じ入力は同じ出力を返し，入力を変更しない', () => {
  const snapshot = structuredClone(sampleFacts);
  assert.deepEqual(buildProfileSpecs(sampleFacts, site), buildProfileSpecs(sampleFacts, site));
  assert.deepEqual(buildProfilePersonProperties(sampleFacts, site), buildProfilePersonProperties(sampleFacts, site));
  assert.deepEqual(sampleFacts, snapshot);
});

// 実際の部品をサーバー描画し，本人情報が DOM に出る条件と前後の順序を確認する．
// CSS モジュールだけを置き換え，React・データ・表示ロジックは実物を使う．
const require = createRequire(import.meta.url);
function renderProfile(facts) {
  const modules = new Map();
  function loadModule(url) {
    if (url.pathname.endsWith('.css')) return { __esModule: true, default: {} };
    if (url.pathname.endsWith('/data/profile.ts')) {
      return { PROFILE_FACTS: facts, buildProfileSpecs, normalizeProfileFacts };
    }
    if (modules.has(url.href)) return modules.get(url.href);
    const module = { exports: {} };
    modules.set(url.href, module.exports);
    const compiled = ts.transpileModule(readFileSync(url, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      },
      fileName: url.pathname,
    }).outputText;
    const localRequire = (specifier) => {
      if (!specifier.startsWith('.')) return require(specifier);
      const target = new URL(specifier, url);
      const resolved = [target, new URL(`${target.href}.ts`), new URL(`${target.href}.tsx`)]
        .find((candidate) => existsSync(candidate));
      assert.ok(resolved, `読み込めないモジュール: ${specifier}`);
      return loadModule(resolved);
    };
    new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
    return module.exports;
  }
  const { Profile } = loadModule(new URL('../src/sections/Profile.tsx', import.meta.url));
  return renderToStaticMarkup(createElement(Profile));
}

test('原点・これからは未設定なら正規化後も DOM にも出ない', () => {
  const profile = normalizeProfileFacts({});
  assert.equal(profile.origin, undefined);
  assert.equal(profile.nextStep, undefined);
  const html = renderProfile({});
  assert.doesNotMatch(html, /profile-origin|profile-next-step|profile-availability/);
  assert.doesNotMatch(html, /<h3[^>]*>(?:原点|これから)<\/h3>/);
  assert.match(html, /data-testid="profile-specs"/);
  assert.match(html, /data-testid="scroll-timeline"/);
});

test('原点・これからは空白だけでも DOM に出ない', () => {
  const facts = { origin: ' \n\t ', nextStep: '　 ' };
  assert.equal(normalizeProfileFacts(facts).origin, undefined);
  assert.equal(normalizeProfileFacts(facts).nextStep, undefined);
  assert.doesNotMatch(renderProfile(facts), /profile-origin|profile-next-step/);
});

test('原点・これからを入れると，空白を除いて年表の前後にそれぞれ表示する', () => {
  const origin = '原点のテスト文です．';
  const nextStep = 'これからのテスト文です．';
  const facts = { origin: ` ${origin} `, nextStep: ` ${nextStep} ` };
  assert.equal(normalizeProfileFacts(facts).origin, origin);
  assert.equal(normalizeProfileFacts(facts).nextStep, nextStep);
  const html = renderProfile(facts);
  assert.match(html, /<h3>原点<\/h3>/);
  assert.match(html, /<h3>これから<\/h3>/);
  assert.ok(html.indexOf(origin) < html.indexOf('data-testid="scroll-timeline"'));
  assert.ok(html.indexOf(nextStep) > html.indexOf('data-testid="scroll-timeline"'));
  assert.doesNotMatch(renderProfile({ origin }), /profile-next-step/);
  assert.doesNotMatch(renderProfile({ nextStep }), /profile-origin/);
});

test('音楽の取得前は Profile に曲名・説明・空の枠を描画しない', () => {
  const html = renderProfile({});
  assert.doesNotMatch(html, /data-testid="recent-music"|最近聴いた曲|テスト曲|Apple Music の再生履歴/);
});
