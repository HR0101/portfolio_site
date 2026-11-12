import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/skillLab/hubCompare.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { rankHubCandidates, sampleOrigins } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('最大と最小の差で候補を順位づけし，入力を変えると最も公平な候補が変わる', () => {
  const all = rankHubCandidates(sampleOrigins);
  assert.equal(all[0].name, '新木場');
  assert.equal(all[0].spread, 15);
  const pair = rankHubCandidates(['川崎', '船橋']);
  assert.equal(pair[0].name, '東京');
  assert.equal(pair[0].spread, 3);
  for (const candidate of [...all, ...pair]) {
    const minutes = candidate.journeys.map(journey => journey.minutes);
    assert.equal(candidate.spread, Math.max(...minutes) - Math.min(...minutes));
  }
});

test('選択の順序・重複に左右されず，空選択・不明駅・単一駅を安全に扱う', () => {
  assert.deepEqual(rankHubCandidates(['川崎', '船橋']), rankHubCandidates(['船橋', '川崎', '船橋', '不明駅']));
  assert.deepEqual(rankHubCandidates([]), []);
  assert.deepEqual(rankHubCandidates(['不明駅']), []);
  const single = rankHubCandidates(['東京']);
  assert.ok(single.every(candidate => candidate.spread === 0));
  assert.deepEqual(single.map(candidate => candidate.name), ['新木場', '東京', '川崎']);
});

test('すべての選択組合せで順位は単調で，元データを変更しない', () => {
  for (let mask = 0; mask < 8; mask += 1) {
    const selection = sampleOrigins.filter((_, index) => mask & (1 << index));
    const saved = [...selection];
    const ranked = rankHubCandidates(selection);
    assert.deepEqual(selection, saved);
    ranked.forEach((candidate, index) => {
      assert.equal(candidate.journeys.length, selection.length);
      assert.ok(candidate.spread >= (ranked[index - 1]?.spread ?? 0));
    });
  }
});
