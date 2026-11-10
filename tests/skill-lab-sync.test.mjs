import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/skillLab/sync.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { getSyncFrame, syncSlaves } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('1・2・3番へPLAYが0・8・16拍の時間差で届く', () => {
  assert.deepEqual(syncSlaves.map(slave => slave.instrument), ['ピアノ', 'トランペット', '木琴', 'キックドラム', 'スネアドラム']);
  for (const [beat, positions] of [[0, [0, null, null]], [7.5, [7.5, null, null]], [8, [8, 0, null]], [16, [16, 8, 0]], [32, [0, 24, 16]], [48, [16, 8, 0]]]) {
    assert.deepEqual(getSyncFrame(beat).slaves.slice(0, 3).map(slave => slave.position), positions);
  }
  assert.deepEqual(getSyncFrame(8).slaves.map(slave => slave.playPulse), [false, true, false, false, false]);
});

test('SYNCは待機中を含む全5機に毎拍届き，同じタイミングでLEDが光る', () => {
  for (const beat of [0, 1, 8, 16, 255, 256]) {
    assert.ok(getSyncFrame(beat).slaves.every(slave => slave.led));
    assert.ok(getSyncFrame(beat + 0.6).slaves.every(slave => !slave.led));
  }
});

test('2拍の欠落中も演奏時計は進み，次のSYNCで受信した絶対拍がそろい直す', () => {
  const before = getSyncFrame(19, 20);
  assert.equal(before.receivedBeat, 19);
  for (const beat of [20, 20.5, 21, 21.9]) {
    const frame = getSyncFrame(beat, 20);
    assert.equal(frame.missing, true);
    assert.equal(frame.receivedBeat, 19);
    assert.equal(frame.recovered, false);
    assert.ok(frame.slaves.every(slave => !slave.led));
    assert.equal(frame.slaves[0].position, beat);
    assert.equal(frame.slaves[0].syncPosition, 19);
  }
  const recovered = getSyncFrame(22, 20);
  assert.equal(recovered.missing, false);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.receivedBeat, 22);
  assert.equal(recovered.slaves[0].syncPosition, 22);
  assert.ok(recovered.slaves.every(slave => slave.led));
  assert.deepEqual(recovered.slaves.map(slave => slave.position), getSyncFrame(22).slaves.map(slave => slave.position));
});

test('不正な拍・欠落指定は開始フレームへ安全に戻す', () => {
  for (const value of [-1, NaN, Infinity, -Infinity]) assert.deepEqual(getSyncFrame(value), getSyncFrame(0));
  for (const value of [-1, NaN, Infinity]) assert.deepEqual(getSyncFrame(4, value), getSyncFrame(4));
});
