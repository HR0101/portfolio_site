import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/skillsMotion.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { getSkillIndicatorTransform } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('幅の異なるボタンと折り返した行の下端へ，同じ下線を運ぶ', () => {
  assert.equal(getSkillIndicatorTransform({ x: 12, y: 0, width: 80, height: 44 }), 'translate3d(12px, 44px, 0) scaleX(80)');
  assert.equal(getSkillIndicatorTransform({ x: 124.5, y: 60, width: 184.5, height: 60 }), 'translate3d(124.5px, 120px, 0) scaleX(184.5)');
});

test('非表示・未計測の寸法でも無効な transform や反転を作らない', () => {
  assert.equal(getSkillIndicatorTransform({ x: NaN, y: Infinity, width: -8, height: -4 }), 'translate3d(0px, 0px, 0) scaleX(0)');
  assert.equal(getSkillIndicatorTransform({ x: -12, y: 4, width: Infinity, height: 44 }), 'translate3d(-12px, 48px, 0) scaleX(0)');
});
