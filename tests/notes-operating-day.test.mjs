import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/notes/operatingDay.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { getOperatingDay, getOperatingDaySample, formatMinutes, SAMPLE_DEPARTURES } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('午前4時の直前と直後で運行日が切り替わる', () => {
  for (const [minutes, expected] of [[0, -1], [239, -1], [240, 0], [1439, 0], [1440, 0], [1679, 0], [1680, 1]]) {
    assert.equal(getOperatingDay(minutes), expected);
  }
});

test('0〜28時のすべての分が，4時から翌日4時までのいずれかの区間に収まる', () => {
  for (let minutes = 0; minutes <= 1680; minutes += 1) {
    const day = getOperatingDay(minutes);
    const start = day * 1440 + 240;
    assert.ok(minutes >= start && minutes < start + 1440, `${minutes}分`);
  }
});

test('24時間後は運行日が一つ進む（過去の日も同じ規則）', () => {
  for (const minutes of [-1441, -1, 0, 239, 240, 1200, 1680]) {
    assert.equal(getOperatingDay(minutes + 1440), getOperatingDay(minutes) + 1);
  }
});

test('サンプルの3:59には便が残らず，4時には新しい運行日の便が残る', () => {
  assert.deepEqual(getOperatingDaySample(239), { day: -1, timetableMinutes: 1679, remaining: [] });
  assert.deepEqual(getOperatingDaySample(240).remaining, [...SAMPLE_DEPARTURES]);
  assert.deepEqual(getOperatingDaySample(1440).remaining, [1500, 1620]);
  assert.deepEqual(getOperatingDaySample(1680).remaining, [...SAMPLE_DEPARTURES]);
  assert.deepEqual(getOperatingDaySample(1500).remaining, [1500, 1620]);
  assert.deepEqual(getOperatingDaySample(1501).remaining, [1620]);
});

test('残り便は同じ運行日の中で増えず，すべて現在時刻以降になる', () => {
  let previous = SAMPLE_DEPARTURES.length;
  for (let minutes = 240; minutes < 1680; minutes += 1) {
    const sample = getOperatingDaySample(minutes);
    assert.ok(sample.remaining.every(time => time >= sample.timetableMinutes));
    assert.ok(sample.remaining.length <= previous);
    previous = sample.remaining.length;
  }
});

test('不正入力は0時，図の範囲外は端にそろえ，24時以降も書式を保つ', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(getOperatingDay(value), -1);
    assert.deepEqual(getOperatingDaySample(value), getOperatingDaySample(0));
    assert.equal(formatMinutes(value), '0:00');
  }
  assert.deepEqual(getOperatingDaySample(-1), getOperatingDaySample(0));
  assert.deepEqual(getOperatingDaySample(2000), getOperatingDaySample(1680));
  assert.equal(formatMinutes(239), '3:59');
  assert.equal(formatMinutes(1440), '24:00');
  assert.equal(formatMinutes(1680), '28:00');
});
