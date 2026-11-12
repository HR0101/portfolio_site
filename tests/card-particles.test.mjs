import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/cardParticles.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  CARD_SLOTS, INK_SHARE, createParticles, evaluateParticle, getTransit, getCoreTrail, getListSlot, parseHexColor, mixColors,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const FROM = { x: 0, y: 0, w: 560, h: 380 };
const TO = { x: 120, y: 90, w: 560, h: 380 };

test('粒子は毎回同じ配置で作られ，数も指定どおりで，面の上の位置が 0〜1 に収まる', () => {
  const first = createParticles(800, 5);
  const second = createParticles(800, 5);
  assert.equal(first.length, 800);
  assert.deepEqual(first, second);
  for (const particle of first) {
    assert.ok(particle.a >= 0 && particle.a <= 1 && particle.b >= 0 && particle.b <= 1);
    assert.ok(particle.delay >= 0 && particle.delay <= 1);
  }
});

test('墨色の粒子が先頭にまとまり，章の色の粒子がその後に続く（描画で色の切り替えが 1 回で済む）', () => {
  const particles = createParticles(1000, 3);
  const firstAccent = particles.findIndex(particle => particle.tone >= INK_SHARE);
  assert.ok(firstAccent > 0);
  assert.ok(particles.slice(0, firstAccent).every(particle => particle.tone < INK_SHARE));
  assert.ok(particles.slice(firstAccent).every(particle => particle.tone >= INK_SHARE));
});

test('進み具合 0 では出発のカードの面の上，1 では到着のカードの面の上に，ちょうど戻る', () => {
  const out = { x: 0, y: 0, alpha: 1, size: 1 };
  for (const particle of createParticles(400, 9)) {
    evaluateParticle(particle, FROM, TO, 0, out);
    assert.ok(Math.abs(out.x - (FROM.x + particle.a * FROM.w)) < 1e-9);
    assert.ok(Math.abs(out.y - (FROM.y + particle.b * FROM.h)) < 1e-9);
    evaluateParticle(particle, FROM, TO, 1, out);
    assert.ok(Math.abs(out.x - (TO.x + particle.a * TO.w)) < 1e-9);
    assert.ok(Math.abs(out.y - (TO.y + particle.b * TO.h)) < 1e-9);
  }
});

test('途中では粒子が面の外へ散るが，散る距離は有限で，進み具合を戻せば同じ位置に戻る', () => {
  const out = { x: 0, y: 0, alpha: 1, size: 1 };
  const again = { x: 0, y: 0, alpha: 1, size: 1 };
  let scattered = 0;
  for (const particle of createParticles(400, 9)) {
    for (let step = 0; step <= 20; step++) {
      const progress = step / 20;
      evaluateParticle(particle, FROM, TO, progress, out);
      assert.ok(Number.isFinite(out.x) && Number.isFinite(out.y));
      assert.ok(out.x > -FROM.w && out.x < TO.x + TO.w + FROM.w);
      assert.ok(out.alpha > 0 && out.alpha <= 1 && out.size > 0);
      evaluateParticle(particle, FROM, TO, progress, again);
      assert.deepEqual(out, again);
      if (out.x < FROM.x - 10 || out.x > TO.x + TO.w + 10) scattered++;
    }
  }
  assert.ok(scattered > 0);
});

test('粒子は左の粒子から先に動き出す', () => {
  const out = { x: 0, y: 0, alpha: 1, size: 1 };
  const particles = createParticles(1200, 2);
  const left = particles.filter(particle => particle.a < 0.1);
  const right = particles.filter(particle => particle.a > 0.9);
  const moved = group => group.filter(particle => {
    evaluateParticle(particle, FROM, TO, 0.1, out);
    return Math.abs(out.x - (FROM.x + particle.a * FROM.w)) > 1;
  }).length / group.length;
  assert.ok(moved(left) > moved(right));
});

test('粒子が動いている区間は，カードが正面にあるあいだは null で，区間の中では出発・到着・進み具合を返す', () => {
  assert.equal(getTransit(0, 4), null);
  assert.equal(getTransit(1, 4), null);
  assert.equal(getTransit(3, 4), null);
  assert.equal(getTransit(-1, 4), null);
  assert.equal(getTransit(5, 4), null);
  assert.equal(getTransit(0.5, 1), null);
  const middle = getTransit(1.25, 4);
  assert.deepEqual([middle.from, middle.to], [1, 2]);
  assert.ok(Math.abs(middle.progress - 0.25) < 1e-9);
  assert.deepEqual([getTransit(2.9, 4).from, getTransit(2.9, 4).to], [2, 3]);
});

test('核の通り道は，出発の位置から始まり到着の位置で終わり，途中で弧を描く', () => {
  const from = { x: 10, y: 20 };
  const to = { x: 210, y: 120 };
  const start = getCoreTrail(from, to, 0, 70);
  const end = getCoreTrail(from, to, 1, 70);
  assert.ok(Math.abs(start.x - from.x) < 1e-9 && Math.abs(start.y - from.y) < 1e-9);
  assert.ok(Math.abs(end.x - to.x) < 1e-9 && Math.abs(end.y - to.y) < 1e-9);
  const middle = getCoreTrail(from, to, 0.5, 70);
  assert.ok(Math.abs(middle.x - 110) < 1e-9);
  assert.ok(middle.y < 70);
});

test('カードは左端か右端のどちらかに置かれ，高さは左上 → 右 1/3 → 左 2/3 → 右下の順に下がる', () => {
  assert.equal(CARD_SLOTS.length, 4);
  assert.deepEqual(CARD_SLOTS.map(slot => slot.x), [0, 1, 0, 1]);
  assert.ok(CARD_SLOTS.every(slot => slot.x === 0 || slot.x === 1));
  assert.ok(Math.abs(CARD_SLOTS[1].y - 1 / 3) < 1e-9 && Math.abs(CARD_SLOTS[2].y - 2 / 3) < 1e-9);
  assert.deepEqual([CARD_SLOTS[0].y, CARD_SLOTS[3].y], [0, 1]);
  for (let index = 1; index < CARD_SLOTS.length; index++) assert.ok(CARD_SLOTS[index].y > CARD_SLOTS[index - 1].y);
});

test('項目の一覧は，カードの反対側（カードが左端なら右端，右端なら左端）に立ち，高さはカードに合わせる', () => {
  assert.deepEqual([0, 1, 2, 3].map(index => getListSlot(index).x), [1, 0, 1, 0]);
  assert.deepEqual([0, 1, 2, 3].map(index => getListSlot(index).y), CARD_SLOTS.map(slot => slot.y));
});

test('項目の一覧は，カードが次の場所へ移るあいだに反対側へ横切り，位置の範囲の外へ出ない', () => {
  assert.ok(Math.abs(getListSlot(0.5).x - 0.5) < 0.02);
  assert.ok(Math.abs(getListSlot(1.5).x - 0.5) < 0.02);
  let previousX = 1;
  for (let step = 0; step <= 100; step++) {
    const slot = getListSlot(step / 100);
    assert.ok(slot.x <= previousX + 1e-12 && slot.x >= 0 && slot.x <= 1);
    previousX = slot.x;
  }
  assert.deepEqual(getListSlot(-2), getListSlot(0));
  assert.deepEqual(getListSlot(9), getListSlot(3));
});

test('色の変換と混ぜ合わせ', () => {
  assert.deepEqual(parseHexColor('#7297c9'), [114, 151, 201]);
  assert.deepEqual(parseHexColor('#fff'), [255, 255, 255]);
  assert.deepEqual(mixColors([0, 0, 0], [200, 100, 50], 0.5), [100, 50, 25]);
});
