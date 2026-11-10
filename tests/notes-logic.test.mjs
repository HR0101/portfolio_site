import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const { getTimeSpread, compareSampleCandidates, DEFAULT_ORIGINS, isSampleOrigin } = await loadModule('../src/lib/notes/fairness.ts');
const { getNoteHookEvent, NOTE_HOOK_EVENTS } = await loadModule('../src/lib/notes/hookEvents.ts');
const { getPlanetJourney, PLANET_STAGES } = await loadModule('../src/lib/notes/planetJourney.ts');
const { getVerificationStates } = await loadModule('../src/lib/notes/verification.ts');
const { sortNotes, getNoteReadingLinks } = await loadModule('../src/lib/notes/catalog.ts');
const { NOTES } = await loadModule('../src/data/notes.ts');

test('公平さの説明指標は最大と最小の差で，同じ時間ならゼロになる', () => {
  assert.deepEqual(getTimeSpread([18, 42, 32]), { min: 18, max: 42, spread: 24, total: 92 });
  assert.deepEqual(getTimeSpread([30, 30, 30]), { min: 30, max: 30, spread: 0, total: 90 });
  for (const values of [[], [NaN, Infinity, -1]]) assert.deepEqual(getTimeSpread(values), { min: 0, max: 0, spread: 0, total: 0 });
  assert.deepEqual(getTimeSpread([0, 30]), { min: 0, max: 30, spread: 30, total: 30 });
});

test('出発駅を変えると差と合計が変わり，入力の配列は変更しない', () => {
  const origins = [...DEFAULT_ORIGINS];
  const initial = compareSampleCandidates(origins);
  assert.equal(initial[0].name, '新木場');
  assert.equal(initial[0].spread, 24);
  const changed = compareSampleCandidates(['東京', '川崎', '横浜']);
  assert.equal(changed[0].name, '品川');
  assert.equal(changed[0].spread, 12);
  assert.notDeepEqual(initial, changed);
  assert.deepEqual(origins, DEFAULT_ORIGINS);
  assert.equal(compareSampleCandidates(['東京', '東京', '東京']).every(candidate => candidate.spread === 0), true);
  assert.equal(isSampleOrigin('東京'), true);
  assert.equal(isSampleOrigin('未定義の駅'), false);
});

test('フックの開始・終了・承認待ちが，既存の図と同じ状態に対応する', () => {
  const expected = {
    SessionStart: 'Done', UserPromptSubmit: 'Working', PreToolUse: 'Working',
    PermissionRequest: 'Working', Stop: 'Done', SessionEnd: 'Done',
  };
  assert.equal(NOTE_HOOK_EVENTS.length, Object.keys(expected).length);
  for (const [event, state] of Object.entries(expected)) assert.equal(getNoteHookEvent(event).state, state);
  assert.match(getNoteHookEvent('PermissionRequest').description, /空の応答/);
  assert.equal(getNoteHookEvent('unknown').name, 'SessionStart');
});

test('惑星の説明図は順に進み，逆操作でも同じ位置と段階へ戻る', () => {
  PLANET_STAGES.forEach((stage, index) => {
    assert.deepEqual(getPlanetJourney(index / (PLANET_STAGES.length - 1)).stage, stage);
  });
  const forward = Array.from({ length: 101 }, (_, index) => getPlanetJourney(index / 100));
  const backward = Array.from({ length: 101 }, (_, index) => getPlanetJourney((100 - index) / 100)).reverse();
  assert.deepEqual(forward, backward);
  assert.equal(getPlanetJourney(-1).index, 0);
  assert.equal(getPlanetJourney(2).index, PLANET_STAGES.length - 1);
  assert.equal(getPlanetJourney(NaN).index, 0);
  assert.equal(getPlanetJourney(0.875).label, 'ドック → 名前');
  assert.equal(getPlanetJourney(0.875).merge, 0.5);
  assert.equal(getPlanetJourney(1).merge, 1);
});

test('検証のどの段階で失敗しても，後続は実行済みにならない', () => {
  for (let index = 0; index < 4; index += 1) {
    const failed = getVerificationStates(index, true);
    assert.equal(failed[index], 'failed');
    assert.ok(failed.slice(0, index).every(state => state === 'passed'));
    assert.ok(failed.slice(index + 1).every(state => state === 'waiting'));
    assert.equal(getVerificationStates(index, false)[index], 'selected');
  }
  assert.equal(getVerificationStates(NaN, true)[0], 'failed');
  assert.equal(getVerificationStates(99, true)[3], 'failed');
});

test('最新順を計算しても元データを変えず，先頭から3件をホームへ出せる', () => {
  const before = NOTES.map(note => note.slug);
  const sorted = sortNotes(NOTES);
  assert.equal(sorted[0].slug, 'planet-handoff');
  assert.equal(sorted.slice(0, 3).length, 3);
  assert.deepEqual(NOTES.map(note => note.slug), before);
  for (let index = 1; index < sorted.length; index += 1) assert.ok(sorted[index - 1].date >= sorted[index].date);
});

test('次のノートは自身を選ばず，作品・タグから理由を添える', () => {
  for (const note of NOTES) {
    const { previous, next } = getNoteReadingLinks(NOTES, note.slug);
    assert.ok(next);
    assert.notEqual(next.note.slug, note.slug);
    assert.notEqual(next.note.slug, previous?.note.slug);
    assert.match(next.reason, /^同じ(作品|テーマ)：/);
  }
  assert.equal(getNoteReadingLinks(NOTES, 'planet-handoff').next.note.slug, 'verification-before-publishing');
  assert.equal(getNoteReadingLinks(NOTES, 'on-device-diagnosis').next.note.slug, 'observe-without-sending');
  assert.deepEqual(getNoteReadingLinks(NOTES, 'unknown'), { previous: undefined, next: undefined });
});
