import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

// src/lib/languageDots.ts を読み込む（他を import しない純粋なモジュール）
async function loadModule() {
  const source = await readFile(new URL('../src/lib/languageDots.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const {
  LANGUAGE_DOT_COUNT,
  LANGUAGE_DOT_CAP_MS,
  MAX_NAMED_LANGUAGES,
  OTHER_LANGUAGE_NAME,
  DEFAULT_LANGUAGE_COLOR,
  GITHUB_LANGUAGE_COLORS,
  allocateLanguageDots,
  countRepositoryLanguages,
  expandLanguageDots,
  isHexColor,
  languageDotDelay,
  resolveLanguageColor,
} = await loadModule();

const sumDots = (groups) => groups.reduce((total, group) => total + group.dots, 0);

test('点の合計は端数があっても必ず 100 になり，量の多い順に並ぶ', () => {
  const groups = allocateLanguageDots([
    { name: 'Python', size: 1 },
    { name: 'Swift', size: 1 },
    { name: 'TypeScript', size: 1 },
  ]);
  assert.equal(sumDots(groups), LANGUAGE_DOT_COUNT);
  // 3 等分の端数（33.33…）は先に並ぶほうへ 1 点
  assert.deepEqual(groups.map((group) => group.dots), [34, 33, 33]);
  assert.deepEqual(groups.map((group) => group.name), ['Python', 'Swift', 'TypeScript']);

  const uneven = allocateLanguageDots([
    { name: 'C', size: 50 },
    { name: 'Swift', size: 700 },
    { name: 'Python', size: 250 },
  ]);
  assert.deepEqual(uneven.map((group) => [group.name, group.dots]), [['Swift', 70], ['Python', 25], ['C', 5]]);
});

test('上位より後ろと 1% に満たない言語は「その他」へまとめる', () => {
  const amounts = [
    { name: 'Swift', size: 6000 },
    { name: 'TypeScript', size: 2000 },
    { name: 'Python', size: 1000 },
    { name: 'C', size: 500 },
    { name: 'Shell', size: 300 },
    { name: 'Ruby', size: 150 },
    { name: 'Metal', size: 50 },
  ];
  const groups = allocateLanguageDots(amounts);
  assert.equal(sumDots(groups), LANGUAGE_DOT_COUNT);
  assert.equal(groups.length, MAX_NAMED_LANGUAGES + 1);
  const other = groups.at(-1);
  assert.equal(other.name, OTHER_LANGUAGE_NAME);
  assert.equal(other.size, 200);
  assert.equal(other.color, DEFAULT_LANGUAGE_COLOR);

  // 上位でも 1% 未満なら名前を出さず，点が 0 になった「その他」は並べない
  const tiny = allocateLanguageDots([{ name: 'Swift', size: 999 }, { name: 'C', size: 1 }]);
  assert.deepEqual(tiny.map((group) => [group.name, group.dots]), [['Swift', 100]]);
});

test('同じ入力なら同じ並び（同じ量は名前の順），空・不正な値は点にしない', () => {
  const a = allocateLanguageDots([{ name: 'B', size: 5 }, { name: 'A', size: 5 }]);
  const b = allocateLanguageDots([{ name: 'A', size: 5 }, { name: 'B', size: 5 }]);
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((group) => group.name), ['A', 'B']);
  assert.deepEqual(allocateLanguageDots([]), []);
  assert.deepEqual(allocateLanguageDots([{ name: 'Swift', size: 0 }, { name: '', size: 5 }, { name: 'C', size: Number.NaN }]), []);
});

test('色は API の #rrggbb → GitHub の言語の色 → 既定の灰の順に決め，それ以外の文字列は通さない', () => {
  assert.equal(isHexColor('#F05138'), true);
  for (const value of ['red', 'url(x)', '#fff', '#12345g', 'var(--x)', null, undefined, 1]) {
    assert.equal(isHexColor(value), false);
  }
  assert.equal(resolveLanguageColor('Swift', '#123456'), '#123456');
  assert.equal(resolveLanguageColor('Swift', 'url(javascript:x)'), GITHUB_LANGUAGE_COLORS.Swift);
  assert.equal(resolveLanguageColor('Unknown'), DEFAULT_LANGUAGE_COLOR);
  const [swift] = allocateLanguageDots([{ name: 'Swift', size: 1, color: 'expression(x)' }]);
  assert.equal(swift.color, GITHUB_LANGUAGE_COLORS.Swift);
});

test('件数の集計はリポジトリの主な言語を数え，言語の無いリポジトリ（空・Other）は数えない', () => {
  const amounts = countRepositoryLanguages([{ language: 'Python' }, { language: 'Swift' }, { language: 'Python' }, { language: '' }, { language: 'Other' }]);
  assert.deepEqual(amounts, [{ name: 'Python', size: 2 }, { name: 'Swift', size: 1 }]);
});

test('点の並びは言語ごとに続き，灯る遅れは列ごとに増えて 480ms で頭打ちになる', () => {
  const groups = allocateLanguageDots([{ name: 'Swift', size: 3 }, { name: 'C', size: 1 }]);
  const indexes = expandLanguageDots(groups);
  assert.equal(indexes.length, LANGUAGE_DOT_COUNT);
  assert.deepEqual([...new Set(indexes)], [0, 1]);
  assert.equal(indexes.lastIndexOf(0) + 1, indexes.indexOf(1));

  assert.equal(languageDotDelay(0), 0);
  assert.equal(languageDotDelay(3), 0);
  assert.ok(languageDotDelay(4) > 0);
  assert.ok(languageDotDelay(LANGUAGE_DOT_COUNT - 1) <= LANGUAGE_DOT_CAP_MS);
  assert.equal(languageDotDelay(10_000), LANGUAGE_DOT_CAP_MS);
});
