import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/cursorPreview.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { getCursorPreviewPosition } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('左右端でプレビューを折り返し、ポインターから間隔を保つ', () => {
  const bounds = { left: 24, right: 1176, top: 200, bottom: 2000 };
  const left = getCursorPreviewPosition(100, 500, 240, 328, bounds, 1200, 900);
  const right = getCursorPreviewPosition(1100, 500, 240, 328, bounds, 1200, 900);
  assert.equal(left.x, 132);
  assert.equal(right.x + 240, 1068);
});

test('ウィンドウ端と一覧の境界を同時に守り、固定ナビの下へ収める', () => {
  for (const viewportWidth of [1024, 1200, 1600]) {
    for (const viewportHeight of [400, 700, 900]) {
      const bounds = { left: 24, right: viewportWidth - 24, top: -800, bottom: 1800 };
      const height = Math.min(280, viewportHeight - 160) + 48;
      for (let x = 24; x <= viewportWidth - 24; x += 37) {
        for (let y = 88; y <= viewportHeight; y += 41) {
          const position = getCursorPreviewPosition(x, y, 240, height, bounds, viewportWidth, viewportHeight);
          assert.ok(position.x >= bounds.left);
          assert.ok(position.x + 240 <= bounds.right);
          assert.ok(position.y >= 88);
          assert.ok(position.y + height <= viewportHeight - 16);
        }
      }
    }
  }
});

test('一覧の上端・下端へ近づいても、プレビューが一覧の外へ出ない', () => {
  const bounds = { left: 100, right: 1100, top: 160, bottom: 700 };
  const top = getCursorPreviewPosition(500, 165, 240, 328, bounds, 1200, 900);
  const bottom = getCursorPreviewPosition(500, 695, 240, 328, bounds, 1200, 900);
  assert.equal(top.y, 160);
  assert.equal(bottom.y + 328, 700);
});
