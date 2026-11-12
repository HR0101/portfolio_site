import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/skillLab/ascii.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { luminance, brightnessToCharacter, edgeCharacter, sobelAt, halfBlock, asciiModes } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('輝度から文字密度へ単調に変換し，範囲外・不正値を抑える', () => {
  const ramp = ' .:-=+*#%@';
  let previous = 0;
  for (let value = 0; value <= 255; value += 1) {
    const index = ramp.indexOf(brightnessToCharacter(value));
    assert.ok(index >= previous);
    previous = index;
  }
  assert.equal(brightnessToCharacter(255), '@');
  for (const value of [-1, NaN, Infinity]) assert.equal(brightnessToCharacter(value), ' ');
  assert.equal(brightnessToCharacter(500), '@');
  assert.equal(Math.round(luminance(255, 255, 255)), 255);
  assert.ok(luminance(0, 255, 0) > luminance(255, 0, 0));
});

test('Sobel勾配と直交する線へ | / - \\ を割り当てる', () => {
  assert.equal(edgeCharacter(255, 0), '|');
  assert.equal(edgeCharacter(0, 255), '-');
  assert.equal(edgeCharacter(255, 255), '/');
  assert.equal(edgeCharacter(255, -255), '\\');
  assert.equal(edgeCharacter(-255, -255), '/');
  assert.equal(edgeCharacter(10, 10), ' ');
  assert.equal(edgeCharacter(NaN, 20), ' ');
  const edge = sobelAt([0, 0, 255, 0, 0, 255, 0, 0, 255], 3, 3, 1, 1);
  assert.equal(edge.gx, 1020);
  assert.equal(edge.gy, 0);
  assert.equal(edgeCharacter(edge.gx, edge.gy), '|');
  assert.deepEqual(sobelAt(Array(9).fill(120), 3, 3, 0, 0), { gx: 0, gy: 0 });
});

test('colorは上下2画素を▀の前景・背景に保持し，monoは同じ構造を白黒にする', () => {
  assert.deepEqual(asciiModes, ['ascii', 'edge', 'color', 'mono']);
  const top = [255, 0, 0], bottom = [0, 0, 255];
  assert.deepEqual(halfBlock(top, bottom, false), { character: '▀', foreground: 'rgb(255,0,0)', background: 'rgb(0,0,255)' });
  assert.deepEqual(halfBlock(top, bottom, true), { character: '▀', foreground: 'rgb(54,54,54)', background: 'rgb(18,18,18)' });
});
