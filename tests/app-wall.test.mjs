import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/appWall.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  WALL_MAX_PANEL_WIDTH, WALL_MIN_PANEL_WIDTH, WALL_PANEL_GAP, createWallLayout, getTileGrowth, getTileKeyframes, getTileRect, getWallActive, getWallBlend, getWallPosition, getWallStops, isWallOverview,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const COUNT = 17;
const CLOSE = 1e-6;

const overlaps = (a, b) => a.x < b.x + b.w - CLOSE && b.x < a.x + a.w - CLOSE && a.y < b.y + b.h - CLOSE && b.y < a.y + a.h - CLOSE;
const inside = (rect, layout) => rect.x >= -CLOSE && rect.y >= -CLOSE && rect.x + rect.w <= layout.width + CLOSE && rect.y + rect.h <= layout.height + CLOSE;
const same = (a, b) => ['x', 'y', 'w', 'h'].every(key => Math.abs(a[key] - b[key]) < 1e-6);

test('壁は，広い画面でも低い画面でも，パネルに最低限の幅を残し，すべてが枠の内側に収まる', () => {
  for (const [width, height] of [[1152, 600], [1152, 480], [920, 480], [1100, 700], [1000, 440]]) {
    const layout = createWallLayout(width, height, COUNT);
    assert.ok(layout.panel.w >= WALL_MIN_PANEL_WIDTH || layout.small === 48, `${width}x${height} のパネルが細すぎます`);
    for (const rect of [...layout.overview, ...layout.right.slice(1), ...layout.left, layout.panel]) {
      assert.ok(inside(rect, layout), `${width}x${height} で枠の外に出ています: ${JSON.stringify(rect)}`);
    }
  }
});

test('一覧の壁のタイルは同じ大きさで，重ならず，パネルは中央に置かれる', () => {
  const layout = createWallLayout(1152, 560, COUNT);
  assert.equal(layout.overview.length, COUNT);
  for (let first = 0; first < COUNT; first++) {
    assert.equal(layout.overview[first].w, layout.overviewSize);
    for (let second = first + 1; second < COUNT; second++) {
      assert.ok(!overlaps(layout.overview[first], layout.overview[second]), `一覧の ${first} と ${second} が重なっています`);
    }
  }
  const leftEdge = layout.panel.x;
  const rightEdge = layout.width - (layout.panel.x + layout.panel.w);
  assert.ok(Math.abs(leftEdge - rightEdge) < 1e-6, '左右の山の幅が違います');
});

test('左右の山の席は，どれも重ならず，パネルとも重ならない（パネルから panelGap だけ離れる）', () => {
  const layout = createWallLayout(1152, 560, COUNT);
  const left = layout.left.slice(0, COUNT - 1);
  const right = layout.right.slice(1);
  const all = [...left, ...right];
  for (let first = 0; first < all.length; first++) {
    assert.ok(!overlaps(all[first], layout.panel), '山の席がパネルに重なっています');
    for (let second = first + 1; second < all.length; second++) {
      assert.ok(!overlaps(all[first], all[second]), `山の席 ${first} と ${second} が重なっています`);
    }
  }
  const nearestLeft = Math.max(...left.map(rect => rect.x + rect.w));
  const nearestRight = Math.min(...right.map(rect => rect.x));
  assert.ok(layout.panelGap >= WALL_PANEL_GAP);
  assert.ok(Math.abs(layout.panel.x - nearestLeft - layout.panelGap) < 1e-6);
  assert.ok(Math.abs(nearestRight - (layout.panel.x + layout.panel.w) - layout.panelGap) < 1e-6);
});

test('アプリが少ない（6 本）ときは，一覧が 2 行に収まり，パネルは広がりすぎず，山が縦の中央に寄る', () => {
  for (const [width, height] of [[1226, 520], [1152, 480], [1000, 440]]) {
    const layout = createWallLayout(width, height, 6);
    const rows = new Set(layout.overview.map(rect => Math.round(rect.y)));
    assert.equal(rows.size, 2, `${width}x${height} で一覧が 2 行になっていません`);
    assert.ok(layout.panel.w <= WALL_MAX_PANEL_WIDTH, `${width}x${height} のパネルが広すぎます`);
    assert.ok(layout.panel.w >= WALL_MIN_PANEL_WIDTH, `${width}x${height} のパネルが細すぎます`);
    assert.ok(layout.small >= 76, `${width}x${height} の山のタイルが小さすぎます: ${layout.small}`);
    for (const rect of [...layout.overview, ...layout.right.slice(1), ...layout.left.slice(0, 5), layout.panel]) {
      assert.ok(inside(rect, layout), `${width}x${height} で枠の外に出ています: ${JSON.stringify(rect)}`);
    }
    const piles = [...layout.right.slice(1), ...layout.left.slice(0, 5)];
    for (let first = 0; first < piles.length; first++) {
      assert.ok(!overlaps(piles[first], layout.panel), '山の席がパネルに重なっています');
      for (let second = first + 1; second < piles.length; second++) {
        if (first < 5 === second < 5) assert.ok(!overlaps(piles[first], piles[second]), `山の席 ${first} と ${second} が重なっています`);
      }
    }
  }
  const wide = createWallLayout(1400, 520, 6);
  assert.ok(wide.panelGap > WALL_PANEL_GAP, '余った幅が山とパネルの間にあいていません');
  // 山が低いので，上端に張り付かず，縦の中央へ寄っている
  assert.ok(Math.min(...wide.left.slice(0, 5).map(rect => rect.y)) > 0);
});

test('停止位置は 0〜count+1 で，各停止位置の中心で止まる（そのあいだは単調に増える）', () => {
  const stops = getWallStops(COUNT);
  assert.equal(stops, COUNT + 2);
  assert.equal(getWallPosition(0, COUNT), 0);
  assert.equal(getWallPosition(1, COUNT), COUNT + 1);
  for (let stop = 0; stop < stops; stop++) {
    assert.ok(Math.abs(getWallPosition((stop + 0.5) / stops, COUNT) - stop) < 1e-9, `停止位置 ${stop} の中心で止まっていません`);
  }
  let previous = -1;
  for (let step = 0; step <= 400; step++) {
    const value = getWallPosition(step / 400, COUNT);
    assert.ok(value >= previous - 1e-12, '位置が戻っています');
    previous = value;
  }
});

test('壁の濃さは，最初と最後の一覧で 1，パネルが出ているあいだは 0', () => {
  assert.equal(getWallBlend(0, COUNT), 1);
  assert.equal(getWallBlend(0.5, COUNT), 0.5);
  assert.equal(getWallBlend(1, COUNT), 0);
  assert.equal(getWallBlend(9, COUNT), 0);
  assert.equal(getWallBlend(COUNT, COUNT), 0);
  assert.equal(getWallBlend(COUNT + 1, COUNT), 1);
  assert.equal(isWallOverview(0, COUNT), true);
  assert.equal(isWallOverview(3, COUNT), false);
  assert.equal(isWallOverview(COUNT + 1, COUNT), true);
});

test('いま近いアプリの番号は，停止位置のまわりでその番号になり，端では先頭・末尾に留まる', () => {
  assert.equal(getWallActive(0, COUNT), 0);
  assert.equal(getWallActive(1, COUNT), 0);
  assert.equal(getWallActive(1.4, COUNT), 0);
  assert.equal(getWallActive(1.6, COUNT), 1);
  assert.equal(getWallActive(COUNT, COUNT), COUNT - 1);
  assert.equal(getWallActive(COUNT + 1, COUNT), COUNT - 1);
});

test('タイルが通る場所の停止位置は，どのアプリでも厳密に増え，一覧で始まり一覧で終わる', () => {
  for (let index = 0; index < COUNT; index++) {
    const frames = getTileKeyframes(index, COUNT);
    assert.equal(frames[0].key, 'overview');
    assert.equal(frames[frames.length - 1].key, 'overview');
    assert.equal(frames[frames.length - 1].q, COUNT + 1);
    assert.equal(frames.filter(frame => frame.key === 'panel').length, 1);
    assert.equal(frames.find(frame => frame.key === 'panel').q, index + 1);
    frames.forEach((frame, position) => {
      if (position > 0) assert.ok(frame.q > frames[position - 1].q, `${index} 番の停止位置が増えていません`);
    });
  }
});

test('最初と最後は一覧の壁で，どのタイルも一覧の席にいる', () => {
  const layout = createWallLayout(1152, 560, COUNT);
  for (let index = 0; index < COUNT; index++) {
    assert.ok(same(getTileRect(layout, index, 0, COUNT), layout.overview[index]));
    assert.ok(same(getTileRect(layout, index, COUNT + 1, COUNT), layout.overview[index]));
  }
});

test('どの停止位置でも，パネルにいるのは 1 つだけで，見終えたものは左の山，これからのものは右の山にいる', () => {
  const layout = createWallLayout(1152, 560, COUNT);
  for (let active = 0; active < COUNT; active++) {
    const q = active + 1;
    for (let index = 0; index < COUNT; index++) {
      const rect = getTileRect(layout, index, q, COUNT);
      if (index === active) assert.ok(same(rect, layout.panel), `${active} のパネルが違います`);
      else if (index < active) assert.ok(same(rect, layout.left[index]), `${index} は左の山にいるはずです（${active} を表示中）`);
      else assert.ok(same(rect, layout.right[index]), `${index} は右の山にいるはずです（${active} を表示中）`);
    }
  }
});

test('停止位置のあいだでは，パネルから出るタイルが先に縮み，次のタイルが遅れて育つ', () => {
  const layout = createWallLayout(1152, 560, COUNT);
  const mid = 5.5;
  const leaving = getTileRect(layout, 4, mid, COUNT);
  const entering = getTileRect(layout, 5, mid, COUNT);
  assert.ok(leaving.w < layout.panel.w && leaving.w > layout.small, '出ていくタイルが途中の大きさになっていません');
  assert.ok(entering.w < layout.panel.w && entering.w >= layout.small, '入ってくるタイルが途中の大きさになっていません');
  assert.ok(leaving.w < layout.panel.w * 0.5, '出ていくタイルは半分より前にほとんど縮んでいるはずです');
  assert.ok(entering.w < leaving.w + 1, '入ってくるタイルは遅れて育つはずです');
  // 止まっている山のタイルは動かない
  assert.ok(same(getTileRect(layout, 0, mid, COUNT), layout.left[0]));
  assert.ok(same(getTileRect(layout, 12, mid, COUNT), layout.right[12]));
});

test('スクロールを少し動かすと，タイルの位置も連続して動く（飛ばない）', () => {
  const layout = createWallLayout(1152, 560, COUNT);
  for (const index of [0, 6, 16]) {
    let previous = getTileRect(layout, index, 0, COUNT);
    for (let step = 1; step <= 1900; step++) {
      const q = (step / 1900) * (COUNT + 1);
      const rect = getTileRect(layout, index, q, COUNT);
      const jump = Math.max(Math.abs(rect.x - previous.x), Math.abs(rect.y - previous.y), Math.abs(rect.w - previous.w), Math.abs(rect.h - previous.h));
      assert.ok(jump < 20, `${index} 番のタイルが ${q.toFixed(3)} で ${jump.toFixed(1)}px 飛びました`);
      previous = rect;
    }
  }
});

test('育ち具合は，山で 0，パネルで 1', () => {
  const layout = createWallLayout(1152, 560, COUNT);
  assert.equal(getTileGrowth(layout, layout.left[0]), 0);
  assert.equal(getTileGrowth(layout, layout.panel), 1);
  const middle = getTileGrowth(layout, { x: 0, y: 0, w: (layout.small + layout.panel.w) / 2, h: (layout.small + layout.panel.h) / 2 });
  assert.ok(Math.abs(middle - 0.5) < 1e-9);
});

test('アプリが 1 本だけでも壊れない', () => {
  const layout = createWallLayout(1152, 560, 1);
  assert.equal(layout.overview.length, 1);
  assert.ok(same(getTileRect(layout, 0, 1, 1), layout.panel));
  assert.ok(same(getTileRect(layout, 0, 0, 1), layout.overview[0]));
  assert.ok(same(getTileRect(layout, 0, 2, 1), layout.overview[0]));
});
