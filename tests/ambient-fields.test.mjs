import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/ambient/fields.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  AMBIENT_MAX_DOTS, AMBIENT_PERIOD_MS, AMBIENT_MAX_OPACITY,
  seededRandom, smoothNoise, gridShape, createDotGrid, wavePoint, pointerWave,
  meshOrbit, bufferSize, metalStripe, rayGeometry, rayCount, bounded,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);

test('同じ seed は同じ乱数列を返し，異なる seed は別の列になる', () => {
  const sequence = seed => {
    const random = seededRandom(seed);
    return Array.from({ length: 100 }, () => random());
  };
  assert.deepEqual(sequence('skills-apps'), sequence('skills-apps'));
  assert.notDeepEqual(sequence('skills-apps'), sequence('works-github'));
  assert.notDeepEqual(sequence(0), sequence(1));
  for (const value of sequence(-42)) assert.ok(value >= 0 && value < 1);
});

test('格子は小画面から極端な画面まで4000点以下に制限し，無効な寸法は空にする', () => {
  for (const [width, height] of [[320, 80], [1200, 160], [10000, 10000], [1e100, 1e100], [1, 10000]]) {
    for (const density of [0.25, 1, 2, 1000, NaN]) {
      const shape = gridShape(width, height, density);
      assert.equal(shape.count, shape.rows * shape.columns);
      assert.ok(shape.count > 0 && shape.count <= AMBIENT_MAX_DOTS);
      assert.equal(createDotGrid(width, height, density).length, shape.count);
    }
  }
  for (const dimensions of [[0, 160], [-10, 80], [NaN, 80], [Infinity, 80]]) {
    assert.equal(gridShape(...dimensions).count, 0);
    assert.deepEqual(createDotGrid(...dimensions), []);
  }
});

test('帯のseedごとに点の大きさと雨の開始位置が変わり，同じseedで再現できる', () => {
  const points = createDotGrid(1200, 120, 1, 'one');
  assert.deepEqual(points, createDotGrid(1200, 120, 1, 'one'));
  assert.notDeepEqual(points, createDotGrid(1200, 120, 1, 'two'));
  for (const point of points) {
    assert.ok(point.x > 0 && point.x < 1);
    assert.ok(point.y > 0.16 && point.y < 0.84);
    assert.ok(point.radius > 0 && point.phase >= 0 && point.phase < 1);
  }
});

test('3変種はそれぞれ変化し，20秒周期で元のフレームへつながる', () => {
  assert.ok(AMBIENT_PERIOD_MS >= 15000 && AMBIENT_PERIOD_MS <= 25000);
  const dots = createDotGrid(320, 120, 1, 14);
  for (const variant of ['swell', 'ripple', 'rain']) {
    assert.notDeepEqual(dots.map(dot => wavePoint(dot, 0, variant, 14)), dots.map(dot => wavePoint(dot, 5000, variant, 14)));
    for (const dot of dots) {
      const start = wavePoint(dot, 2345, variant, 14);
      const end = wavePoint(dot, 2345 + AMBIENT_PERIOD_MS, variant, 14);
      for (const key of ['x', 'y', 'radius', 'opacity']) close(start[key], end[key]);
      for (const time of [0, 1000, 9999, 19000, NaN, -50]) {
        const point = wavePoint(dot, time, variant, 14);
        assert.ok(point.y >= 0.04 && point.y <= 0.96);
        assert.ok(point.opacity >= 0 && point.opacity <= 1);
        assert.ok(point.radius > 0);
      }
    }
  }
});

test('雨は落下して上下端で消えるため，周回の瞬間も点が飛ばない', () => {
  const dot = { x: 0.5, y: 0.5, radius: 1, phase: 0 };
  assert.equal(wavePoint(dot, 0, 'rain').opacity, 0);
  assert.ok(wavePoint(dot, 5000, 'rain').y < wavePoint(dot, 10000, 'rain').y);
  assert.ok(wavePoint(dot, AMBIENT_PERIOD_MS - 1, 'rain').opacity < 1e-6);
});

test('ポインタの波紋は近傍だけに現れ，2400ms後は消える', () => {
  const pointer = { x: 0.5, y: 0.5, strength: 1, startedAtMs: 1000 };
  const near = { x: 0.55, y: 0.5 };
  assert.notEqual(pointerWave(near, 1200, pointer), 0);
  assert.equal(pointerWave(near, 3400, pointer), 0);
  assert.equal(pointerWave(near, 40000, pointer), 0);
  assert.equal(pointerWave(near, 1200, { ...pointer, strength: 0 }), 0);
  const dot = { ...near, radius: 1, phase: 0.1 };
  assert.notEqual(wavePoint(dot, 1200, 'swell', 1, pointer).y, wavePoint(dot, 1200, 'swell', 1).y);
  assert.equal(wavePoint(dot, 3400, 'swell', 1, pointer).y, wavePoint(dot, 3400, 'swell', 1).y);
});

test('値ノイズは有限・決定論的で，整数の境界で連続する', () => {
  for (const position of [-10, -1, 0, 1, 4.5, 500, NaN]) {
    const value = smoothNoise(position, 'noise');
    assert.equal(value, smoothNoise(position, 'noise'));
    assert.ok(value >= -1 && value <= 1);
  }
  for (let index = -5; index < 5; index += 1) close(smoothNoise(index - 1e-6, 5), smoothNoise(index + 1e-6, 5));
});

test('色の塊の軌道は面の内側に留まり，時間で変化する', () => {
  for (let index = 0; index < 4; index += 1) {
    assert.deepEqual(meshOrbit(index, 5000), meshOrbit(index, 5000));
    assert.notDeepEqual(meshOrbit(index, 0), meshOrbit(index, 10000));
    for (const time of [0, 5000, 100000, NaN]) {
      const point = meshOrbit(index, time);
      assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
      assert.ok(point.radius >= 0.34 && point.radius <= 0.5);
    }
  }
  assert.equal(bounded(4, 0, AMBIENT_MAX_OPACITY), 0.35);
});

test('低解像度バッファは比率を保ち，最大辺を制限する', () => {
  assert.deepEqual(bufferSize(1200, 600), { width: 320, height: 160 });
  assert.deepEqual(bufferSize(600, 1200, 480), { width: 240, height: 480 });
  assert.deepEqual(bufferSize(100, 50), { width: 100, height: 50 });
  assert.deepEqual(bufferSize(0, NaN), { width: 1, height: 1 });
});

test('金属の縞は18秒周期で流れ，ポインタの向きの影響は小さく制限する', () => {
  assert.notEqual(metalStripe(0.8, 4, 0), metalStripe(0.8, 4, 5000));
  close(metalStripe(0.8, 4, 0), metalStripe(0.8, 4, 18000));
  const idle = metalStripe(1, 4, 0);
  const left = metalStripe(1, 4, 0, { x: 0, y: 0, strength: 1, startedAtMs: 0 });
  const right = metalStripe(1, 4, 0, { x: 1, y: 0, strength: 1, startedAtMs: 0 });
  assert.ok(left < idle && idle < right);
  assert.ok(Math.abs(right - idle) <= 0.046);
});

test('光線は本数を1〜12に制限し，指定した原点を保ってゆらぐ', () => {
  assert.equal(rayCount(100000), 12);
  assert.equal(rayCount(-100), 1);
  assert.equal(rayCount(NaN), 1);
  for (const origin of [{ x: 0.15, y: -0.1 }, { x: 0.5, y: 0 }, { x: 0.85, y: -0.1 }]) {
    const ray = rayGeometry(2, 1000, origin);
    assert.equal(ray.topX, origin.x);
    assert.equal(ray.topY, origin.y);
    assert.ok(ray.width > 0 && ray.width < 0.04);
    assert.ok(ray.opacity >= 0.35 && ray.opacity <= 0.75);
    assert.notEqual(ray.bottomX, rayGeometry(2, 8000, origin).bottomX);
    assert.deepEqual(ray, rayGeometry(2, 1000, origin));
  }
});
