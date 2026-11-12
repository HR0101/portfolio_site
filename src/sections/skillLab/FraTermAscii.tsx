'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasLoop, type CanvasFrame } from '../../hooks/useCanvasLoop';
import { asciiModes, brightnessToCharacter, edgeCharacter, halfBlock, luminance, sobelAt, type AsciiMode } from '../../lib/skillLab/ascii';
import styles from './SkillLab.module.css';

const minColumns = 32;
const maxColumns = 80;
const initialColumns = 56;
const sourceHeightRatio = 0.65;
const cellAspect = 0.6;
const previewWidth = 160;
const previewHeight = 100;
const descriptions: Record<AsciiMode, string> = {
  ascii: '明るさ → 文字の濃淡', edge: 'Sobelの勾配 → 輪郭の向き → | / − \\',
  color: '上下2画素 → ハーフブロック ▀ の前景色・背景色', mono: '上下2画素 → 白黒のハーフブロック ▀',
};

export function FraTermAscii() {
  const [mode, setMode] = useState<AsciiMode>('ascii');
  const [columns, setColumns] = useState(initialColumns);
  const [paused, setPaused] = useState(false);
  const buffer = useRef<HTMLCanvasElement | null>(null);
  const lastTime = useRef(0);
  const draw = useCallback((context: CanvasRenderingContext2D, frame: CanvasFrame) => {
    lastTime.current = frame.timeMs;
    const source = buffer.current ?? (buffer.current = document.createElement('canvas'));
    const rows = Math.round(columns * sourceHeightRatio);
    source.width = columns;
    source.height = rows;
    const input = source.getContext('2d', { willReadFrequently: true });
    if (!input) return;
    const t = frame.timeMs / 1000;
    input.fillStyle = '#101820'; input.fillRect(0, 0, columns, rows);
    input.fillStyle = '#e9b95c';
    input.beginPath(); input.arc(columns * (0.35 + Math.sin(t) * 0.17), rows * 0.45, rows * 0.25, 0, Math.PI * 2); input.fill();
    input.save(); input.translate(columns * 0.68, rows * 0.57); input.rotate(t * 0.6);
    input.fillStyle = '#5ac3e8'; input.fillRect(-columns * 0.1, -rows * 0.22, columns * 0.2, rows * 0.44); input.restore();
    const { data } = input.getImageData(0, 0, columns, rows);
    const lights = Array.from({ length: columns * rows }, (_, index) => luminance(data[index * 4], data[index * 4 + 1], data[index * 4 + 2]));
    const at = (x: number, y: number) => Array.from(data.subarray((y * columns + x) * 4, (y * columns + x) * 4 + 3));
    context.fillStyle = '#0c1015'; context.fillRect(0, 0, frame.width, frame.height);
    const size = Math.min(frame.width / columns, (frame.height - previewHeight - 36) / (rows / 2 / cellAspect));
    const lineHeight = size / cellAspect;
    const offsetX = (frame.width - size * columns) / 2;
    context.font = `${lineHeight}px ui-monospace, SFMono-Regular, monospace`;
    context.textBaseline = 'top';
    for (let y = 0; y < rows - 1; y += 2) {
      for (let x = 0; x < columns; x += 1) {
        const px = offsetX + x * size;
        const py = previewHeight + 28 + y / 2 * lineHeight;
        if (mode === 'color' || mode === 'mono') {
          const cell = halfBlock(at(x, y), at(x, y + 1), mode === 'mono');
          context.fillStyle = cell.background; context.fillRect(px, py, size + 0.5, lineHeight + 0.5);
          context.fillStyle = cell.foreground; context.fillText(cell.character, px, py);
        } else {
          const gradient = sobelAt(lights, columns, rows, x, y);
          const character = mode === 'edge' ? edgeCharacter(gradient.gx, gradient.gy) : brightnessToCharacter(lights[y * columns + x]);
          context.fillStyle = '#e7edf2'; context.fillText(character, px, py);
        }
      }
    }
    // 同じCanvas内で入力も見せ，変換の前後を対応させる．
    context.drawImage(source, 12, 12, previewWidth, previewHeight);
    context.font = '12px ui-monospace, monospace'; context.fillStyle = '#e7edf2';
    context.fillText('合成映像 →', previewWidth + 24, 24);
    context.fillText(mode, previewWidth + 24, 48);
  }, [columns, mode]);
  const loop = useCanvasLoop({ draw, paused, maxFps: 24, maxDpr: 1.5, reducedTimeMs: 1600 });
  const { redraw } = loop;
  useEffect(() => { redraw(); }, [mode, columns, redraw]);

  return <div data-testid="skill-lab-python" className={styles.exhibit}>
    <header className={styles.exhibitHeader}><div><p className={styles.eyebrow}>Python · FraTerm</p><h4>動画をターミナルへ</h4></div><span className={styles.kind}>変換の再現</span></header>
    <p className={styles.copy}>Canvasに描いた動く図形を，小さな画素へ縮めて文字に変換します．モードを変えると，同じ入力から違う像が現れます．</p>
    <div className={styles.controls} role="group" aria-label="描画モード">
      {asciiModes.map(value => <button key={value} type="button" className="press-effect" aria-pressed={mode === value} onClick={() => { setPaused(true); setMode(value); }}>{value}</button>)}
    </div>
    <div className={styles.terminal}><div className={styles.terminalBar}>FraTerm / 合成入力の再現</div><canvas ref={loop.canvasRef} className={styles.asciiCanvas} role="img" aria-label={`動く円と四角を${mode}モードで変換した再現．表示幅${columns}文字．`} /></div>
    <p className={styles.pipelineText}>{descriptions[mode]}</p>
    <div className={styles.controls}>
      <label className={styles.range}>表示幅：{columns}文字<input type="range" min={minColumns} max={maxColumns} step={8} value={columns} onChange={event => { setPaused(true); setColumns(Number(event.target.value)); }} /></label>
      <button type="button" className="press-effect" disabled={loop.reduced} aria-pressed={!paused && !loop.reduced} onClick={() => setPaused(value => !value)}>{!paused && !loop.reduced ? '一時停止' : '再生'}</button>
      <button type="button" className="press-effect" onClick={() => { setPaused(true); loop.seek(lastTime.current + 500); }}>次のフレーム</button>
    </div>
    <p className={styles.note}>FraTermの実際の出力ではなく，同じ考え方の再現です．入力は合成映像です．edgeは輪郭の向きを4記号へ簡略化しています．{loop.reduced && '動きを減らす設定では静止し，手動でフレームを送れます．'}</p>
  </div>;
}
