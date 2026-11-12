import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const compile = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64')}`;
const read = name => readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
const mask = compile(await read('worldDotMap'));
const fineMask = compile(await read('planetLandMask'));
const geometry = (await read('planetPoints')).replace("'./worldDotMap'", `'${mask}'`).replace("'./planetLandMask'", `'${fineMask}'`);
const { createPlanetPoints, projectPlanetPoints, getPlanetLocation } = await import(compile(geometry));
const { getPlanetJourneyFrame, getHeroPlanetFrame, getPlanetJourneyDetail } = await import(compile(await read('planetJourney')));
const rendererSource = (await read('dotPlanetCanvas')).replace("'./planetPoints'", `'${compile(geometry)}'`);
const { createDotPlanet } = await import(compile(rendererSource));

test('自動回転は停止中も進み、中央到着・非表示時には止まり、再開で角度が飛ばない', t => {
  const original = new Map();
  const install = (key, value) => {
    original.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  };
  t.after(() => {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  let nextId = 0, intersection;
  const frames = new Map(), listeners = new Map();
  install('requestAnimationFrame', callback => { frames.set(++nextId, callback); return nextId; });
  install('cancelAnimationFrame', id => frames.delete(id));
  install('devicePixelRatio', 1);
  install('document', { hidden: false, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) });
  install('ResizeObserver', class { observe() {} disconnect() {} });
  install('IntersectionObserver', class { constructor(callback) { intersection = callback; } observe() {} disconnect() {} });
  let dots = [];
  const context = { clearRect: () => { dots = []; }, setTransform() {}, beginPath() {}, moveTo() {}, arc: (x, y) => dots.push([x, y]), fill() {} };
  const canvas = { getContext: () => context, getBoundingClientRect: () => ({ width: 520, height: 520 }) };
  const step = now => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id); callback(now);
    return dots;
  };
  const phases = [];
  const renderer = createDotPlanet(canvas, (progress, rotation) => phases.push({ progress, rotation }));
  intersection([{ isIntersecting: true }]);
  step(100);
  assert.equal(frames.size, 0);
  renderer.setAutoRotate(true);
  const first = step(200), second = step(264);
  assert.notDeepEqual(first, second);
  assert.ok(phases.at(-1).rotation > phases.at(-2).rotation);
  const stoppedPhase = phases.at(-1);
  assert.equal(frames.size, 1);
  renderer.setAutoRotate(false);
  assert.deepEqual(step(328), second);
  assert.deepEqual(phases.at(-1), stoppedPhase);
  assert.equal(frames.size, 0);
  renderer.setAutoRotate(true);
  step(400);
  document.hidden = true; listeners.get('visibilitychange')();
  assert.equal(frames.size, 0);
  document.hidden = false; listeners.get('visibilitychange')();
  assert.deepEqual(step(20000), second);
  assert.deepEqual(phases.at(-1), stoppedPhase);
  intersection([{ isIntersecting: false }]);
  assert.equal(frames.size, 0);
  renderer.dispose();
  assert.equal(listeners.size, 0);
});

test('球面上のアプリ地点は緯度経度の向きに従い、地球と同じ回転で表裏が切り替わる', () => {
  assert.deepEqual(getPlanetLocation(0, 0), { x: 0, y: 0, z: 1, land: true });
  assert.ok(Math.abs(getPlanetLocation(90, 0).y - 1) < 1e-12);
  assert.ok(Math.abs(getPlanetLocation(0, 90).x - 1) < 1e-12);
  const anchor = getPlanetLocation(30, 100);
  const front = projectPlanetPoints([anchor], 0, 520, 520)[0];
  const back = projectPlanetPoints([anchor], 0, 520, 520, [], Math.PI)[0];
  assert.ok(front.depth > 0 && back.depth < 0);
  assert.notEqual(front.x, back.x);
});

test('PCのHeroは画面の高さに応じた大きな地球を右端から出し、紹介中の寸法を変えない', () => {
  const bounds = { left: 650, top: 160, width: 450, height: 450 };
  const frame = getHeroPlanetFrame(bounds, 1200, 815);
  assert.ok(frame.size > bounds.width * 1.8);
  assert.ok(frame.left > 0 && frame.left < 600);
  assert.ok(frame.left + frame.size > 1200);
  const destination = { left: 390, top: 275, size: 440 };
  assert.deepEqual(getPlanetJourneyFrame(frame, destination, 1), destination);
});

test('スマートフォンでは拡大した地球の横幅を画面内に収める', () => {
  for (const width of [320, 375, 430, 768]) {
    const frame = getHeroPlanetFrame({ left: 24, top: 700, width: width - 48, height: width - 48 }, width);
    assert.ok(frame.left >= 16);
    assert.ok(frame.left + frame.size <= width - 16);
    assert.ok(frame.size > 0 && Number.isFinite(frame.top));
  }
});

test('精細な海岸線を球面に追加し、Heroと小型惑星の点を連続して交差させる', () => {
  const points = createPlanetPoints(0, 42000);
  const fine = points.filter(point => point.detail);
  assert.ok(fine.length > 8000 && fine.length < 18000);
  for (const point of fine) assert.ok(Math.abs(Math.hypot(point.x, point.y, point.z) - 1) < 1e-12);
  const samples = [points.find(point => !point.detail), ...fine.slice(0, 100)];
  const hero = projectPlanetPoints(samples, 0, 520, 520, [], 0, 1);
  const small = projectPlanetPoints(samples, 0, 520, 520, [], 0, 0);
  assert.equal(hero[0].alpha, 0);
  assert.ok(hero.slice(1).some(point => point.alpha > 0));
  assert.ok(small[0].alpha > 0);
  assert.ok(small.slice(1).every(point => point.alpha === 0));
  for (let index = 0; index < samples.length; index++) {
    assert.equal(hero[index].x, small[index].x);
    assert.equal(hero[index].y, small[index].y);
  }
});

test('縮小と精細度は同じ滑らかな進捗に従い、逆スクロールでも飛ばない', () => {
  const source = { left: 500, top: 20, size: 950 };
  const destination = { left: 390, top: 275, size: 440 };
  let previousSize = Infinity;
  for (let index = 0; index <= 100; index++) {
    const progress = index / 100;
    const frame = getPlanetJourneyFrame(source, destination, progress);
    const detail = getPlanetJourneyDetail(progress);
    assert.ok(frame.size <= previousSize);
    assert.ok(Math.abs(frame.size - (destination.size + (source.size - destination.size) * detail)) < 1e-9);
    previousSize = frame.size;
  }
  assert.equal(getPlanetJourneyDetail(-2), 1);
  assert.equal(getPlanetJourneyDetail(2), 0);
  assert.ok(getPlanetJourneyDetail(.001) > .99999);
  assert.ok(getPlanetJourneyDetail(.999) < .00001);
});

test('陸地と海の全ての点が同じ単位球面上にあり、生成結果が決定的', () => {
  const points = createPlanetPoints();
  assert.ok(points.filter(p => p.land).length > 1000);
  assert.equal(points.filter(p => !p.land).length, 1800);
  for (const p of points) assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - 1) < 1e-12);
  assert.deepEqual(points, createPlanetPoints());
});

test('回転の全区間・縦横のキャンバスで点が描画領域内に収まる', () => {
  const points = createPlanetPoints();
  for (const [width, height] of [[520, 520], [300, 500], [600, 250]]) {
    for (const progress of [0, .25, .5, .75, 1]) {
      for (const dot of projectPlanetPoints(points, progress, width, height)) {
        assert.ok(dot.x - dot.radius >= 0 && dot.x + dot.radius <= width);
        assert.ok(dot.y - dot.radius >= 0 && dot.y + dot.radius <= height);
        assert.ok(dot.alpha > 0 && dot.alpha <= 1);
      }
    }
  }
});

test('球面の裏側は暗くなり、進捗に応じて位置と奥行きが変わる', () => {
  const points = [{ x: 0, y: 0, z: 1, land: true }, { x: 0, y: 0, z: -1, land: true }];
  const forward = projectPlanetPoints(points, 2.1 / 4.1, 520, 520);
  assert.ok(forward[0].alpha > forward[1].alpha * 10);
  const rotated = projectPlanetPoints(points, 0, 520, 520);
  assert.notEqual(forward[0].x, rotated[0].x);
  assert.ok(forward[0].alpha > rotated[0].alpha);
});

test('投影バッファを再利用し、範囲外の回転進捗を端点に丸める', () => {
  const points = createPlanetPoints(10);
  const output = projectPlanetPoints(points, 0, 520, 520);
  const first = output[0];
  assert.equal(projectPlanetPoints(points, 1, 520, 520, output), output);
  assert.equal(output[0], first);
  assert.deepEqual(projectPlanetPoints(points, -2, 520, 520), projectPlanetPoints(points, 0, 520, 520));
  assert.deepEqual(projectPlanetPoints(points, 2, 520, 520), output);
});

const source = { left: 670, top: 130, size: 430 };
const destination = { left: 390, top: 275, size: 440 };
test('Hero右側から中央への移動は両端に正確に着地し、範囲外で停止', () => {
  assert.deepEqual(getPlanetJourneyFrame(source, destination, -1), source);
  assert.deepEqual(getPlanetJourneyFrame(source, destination, 1), destination);
  assert.deepEqual(getPlanetJourneyFrame(source, destination, 2), destination);
  assert.deepEqual(getPlanetJourneyFrame(source, destination, .5), { left: 530, top: 202.5, size: 435 });
});

test('逆スクロール・途中へのジャンプでも同じ位置へ戻り、経路がはみ出さない', () => {
  const middle = getPlanetJourneyFrame(source, destination, .4);
  for (const progress of [0, .9, .2, 1, .4]) {
    const frame = getPlanetJourneyFrame(source, destination, progress);
    assert.ok(frame.left >= destination.left && frame.left <= source.left);
    assert.ok(frame.top >= source.top && frame.top <= destination.top);
    assert.ok(frame.size >= source.size && frame.size <= destination.size);
  }
  assert.deepEqual(getPlanetJourneyFrame(source, destination, .4), middle);
});
