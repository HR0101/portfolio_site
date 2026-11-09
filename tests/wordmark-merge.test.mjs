import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/wordmarkMerge.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { createMergePlan, evaluateMergeDot }
  = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

// 名前の粒子：文字の粒子と，最後の「.」の粒子（章の色）
const TARGETS = [
  ...Array.from({ length: 300 }, (_, index) => ({ x: 600 + (index % 40) * 8, y: 200 + Math.floor(index / 40) * 8, accent: false })),
  ...Array.from({ length: 12 }, (_, index) => ({ x: 940 + index * 3, y: 300, accent: true })),
];
const SOURCES = 3100;

test('名前の粒子 1 つ 1 つに，惑星の点のどれかが割り当てられ，同じ入力なら同じ割り当てになる', () => {
  const first = createMergePlan(SOURCES, TARGETS, 3);
  assert.deepEqual(first, createMergePlan(SOURCES, TARGETS, 3));
  assert.equal(first.length, TARGETS.length);
  first.forEach((dot, index) => {
    assert.equal(dot.targetX, TARGETS[index].x);
    assert.equal(dot.targetY, TARGETS[index].y);
    assert.equal(dot.accent, TARGETS[index].accent);
    assert.ok(Number.isInteger(dot.source) && dot.source >= 0 && dot.source < SOURCES);
  });
});

test('割り当ては惑星の点に広くばらつき，名前の粒子が惑星の点より多いと，同じ点から何粒も出てくる', () => {
  const plan = createMergePlan(SOURCES, TARGETS, 5);
  const used = new Set(plan.map(dot => dot.source));
  assert.ok(used.size > TARGETS.length * 0.7);
  const crowded = createMergePlan(20, TARGETS, 5);
  const counts = new Map();
  for (const dot of crowded) counts.set(dot.source, (counts.get(dot.source) ?? 0) + 1);
  assert.ok([...counts.values()].some(count => count > 5));
  assert.ok(crowded.every(dot => dot.source < 20));
});

test('惑星の点が無いとき，または名前の粒子が無いときは，空になる', () => {
  assert.equal(createMergePlan(0, TARGETS, 1).length, 0);
  assert.equal(createMergePlan(100, [], 1).length, 0);
});

test('進み具合 0 では惑星の上の位置，1 では流れ込み先の位置に，ちょうど戻る', () => {
  const out = { x: 0, y: 0, mix: 0, alpha: 0 };
  for (const dot of createMergePlan(SOURCES, TARGETS, 9)) {
    evaluateMergeDot(dot, 100, 50, 0, 30, out);
    assert.ok(Math.abs(out.x - 100) < 1e-9 && Math.abs(out.y - 50) < 1e-9);
    assert.equal(out.mix, 0);
    assert.equal(out.alpha, 0);
    evaluateMergeDot(dot, 100, 50, 1, 30, out);
    assert.ok(Math.abs(out.x - dot.targetX) < 1e-9 && Math.abs(out.y - dot.targetY) < 1e-9);
    assert.equal(out.mix, 1);
    assert.equal(out.alpha, 1);
  }
});

test('途中は散るが，距離は有限で，進み具合を戻せば同じ位置に戻る．色は進むほど名前の見た目へ寄る', () => {
  const out = { x: 0, y: 0, mix: 0, alpha: 0 };
  const dot = createMergePlan(SOURCES, TARGETS, 4)[0];
  let previousMix = -1;
  for (let step = 0; step <= 20; step++) {
    const progress = step / 20;
    evaluateMergeDot(dot, 100, 50, progress, 30, out);
    assert.ok(Number.isFinite(out.x) && Number.isFinite(out.y));
    assert.ok(Math.abs(out.x) < 5000 && Math.abs(out.y) < 5000);
    assert.ok(out.mix >= previousMix);
    previousMix = out.mix;
    const again = { x: 0, y: 0, mix: 0, alpha: 0 };
    evaluateMergeDot(dot, 100, 50, progress, 30, again);
    assert.deepEqual(out, again);
  }
});
