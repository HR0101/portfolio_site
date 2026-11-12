'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTimeExhibit } from '../../hooks/useTimeExhibit';
import { getSyncFrame, scoreBeats, syncClockFrame, syncPhaseStarts, syncSlaves } from '../../lib/skillLab/sync';
import styles from './SkillLab.module.css';

const initialBpm = 120;
const bpmStep = 5;
const minBpm = 60;
const maxBpm = 180;
const minuteMs = 60000;
const rowPitch = 62;
const firstRow = 48;
const master = { x: 84, y: 172 };
const receiverX = 302;
const barX = 452;
const barWidth = 150;
const flightShare = 0.3;
const paintIntervalMs = 1000 / 30;

export function HardwareSync() {
  const [bpm, setBpm] = useState(initialBpm);
  const bpmRef = useRef(initialBpm);
  const stage = useRef<SVGSVGElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const clock = useRef({ time: 0, beat: 0, painted: -Infinity });
  const missing = useRef<number | null>(null);
  const manual = useRef<number | null>(null);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const paint = useCallback(({ time }: { time: number }) => {
    const state = clock.current;
    if (manual.current !== null) {
      state.beat = manual.current;
      manual.current = null;
      state.painted = -Infinity;
    } else if (time < state.time) {
      state.beat = time * initialBpm / minuteMs;
      state.painted = -Infinity;
    } else state.beat += (time - state.time) * bpmRef.current / minuteMs;
    state.time = time;
    if (time - state.painted < paintIntervalMs) return;
    state.painted = time;
    const frame = getSyncFrame(state.beat, missing.current);
    const root = stage.current;
    if (!root) return;
    frame.slaves.forEach((slave, index) => {
      const y = firstRow + rowPitch * index;
      const travel = Math.min(1, frame.fraction / flightShare);
      const packet = root.querySelector<SVGCircleElement>(`[data-packet="${slave.id}"]`);
      if (packet) {
        packet.style.transform = `translate(${master.x + (receiverX - master.x) * travel}px, ${master.y + (y - master.y) * travel}px)`;
        packet.style.opacity = !frame.missing && frame.fraction < flightShare ? '1' : '0';
      }
      const play = root.querySelector<SVGTextElement>(`[data-play="${slave.id}"]`);
      if (play) play.style.opacity = slave.playPulse ? '1' : '0';
      const led = root.querySelector<SVGCircleElement>(`[data-led="${slave.id}"]`);
      if (led) led.style.opacity = slave.led ? '1' : '0.18';
      const cursor = root.querySelector<SVGRectElement>(`[data-cursor="${slave.id}"]`);
      if (cursor) {
        cursor.style.opacity = slave.playing ? '1' : '0';
        cursor.style.transform = `translate(${barX + (slave.position ?? 0) / scoreBeats * barWidth}px, ${y + 12}px)`;
      }
      const anchor = root.querySelector<SVGRectElement>(`[data-anchor="${slave.id}"]`);
      if (anchor) {
        anchor.style.opacity = slave.playing ? '1' : '0';
        anchor.style.transform = `translate(${barX + (slave.syncPosition ?? 0) / scoreBeats * barWidth}px, ${y + 24}px)`;
      }
    });
    if (readout.current) readout.current.textContent = frame.missing
      ? `SYNC 欠落中 → 最後の受信拍 ${frame.receivedBeat}／内蔵時計の拍 ${frame.wholeBeat}`
      : `${frame.recovered ? '次の SYNC で復帰．' : ''}全5機が受信する絶対拍：${frame.receivedBeat}`;
  }, []);
  const exhibit = useTimeExhibit(syncClockFrame, syncPhaseStarts, 3, paint);

  return <div ref={exhibit.containerRef} data-testid="skill-lab-hardware" className={styles.exhibit}>
    <header className={styles.exhibitHeader}><div><p className={styles.eyebrow}>C / Arduino · hackathon_42</p><h4>赤外線で輪唱するシステム</h4></div><span className={styles.kind}>仕組みの再現</span></header>
    <p className={styles.copy}>マスタ1台から，最大5台へ．SYNCは毎拍，全機へ届きます．旋律のPLAYは0・8・16拍とずらし，同じ旋律を重ねます．</p>
    <div className={styles.hardwareSurface}>
      <svg ref={stage} viewBox="0 0 640 350" role="img" aria-label="マスタから5機へSYNCが届く図．1番ピアノ，2番トランペットは8拍遅れ，3番木琴は16拍遅れ．4番キックドラム，5番スネアドラム．譜面バーは32拍の位置を表します．">
        {syncSlaves.map((slave, index) => <path key={slave.id} d={`M ${master.x} ${master.y} L ${receiverX} ${firstRow + rowPitch * index}`} className={styles.wire} />)}
        <rect x="24" y="144" width="120" height="56" rx="12" className={styles.board} />
        <text x="84" y="168" textAnchor="middle">マスタ</text><text x="84" y="187" textAnchor="middle" className={styles.svgSmall}>UNO R4 WiFi</text>
        {syncSlaves.map((slave, index) => {
          const y = firstRow + rowPitch * index;
          return <g key={slave.id}>
            <circle r="4" data-packet={slave.id} className={styles.irDot} style={{ opacity: 0 }} />
            <rect x="286" y={y - 20} width="148" height="46" rx="8" className={styles.board} />
            <circle cx="300" cy={y - 5} r="4" data-led={slave.id} className={styles.syncLed} />
            <text x="314" y={y - 2}>{slave.id} / {slave.instrument}</text>
            <text x="300" y={y + 15} className={styles.svgSmall}>{slave.role} · {slave.delay}拍遅れ</text>
            <text x="239" y={y - 10} className={styles.svgSmall} data-play={slave.id} style={{ opacity: 0 }}>PLAY →</text>
            <text x={barX} y={y + 1} className={styles.svgSmall}>演奏位置 / 32拍</text>
            <rect x={barX} y={y + 12} width={barWidth} height="10" rx="2" fill="#ffffff18" />
            {Array.from({ length: 8 }, (_, tick) => <path key={tick} d={`M ${barX + tick * barWidth / 8} ${y + 12} v 10`} stroke="#ffffff38" />)}
            <rect width="5" height="10" rx="1" data-cursor={slave.id} className={styles.irDot} style={{ opacity: 0 }} />
            <rect width="5" height="3" rx="1" data-anchor={slave.id} fill="#e6bc73" style={{ opacity: 0 }} />
          </g>;
        })}
      </svg>
      <p className={styles.scoreLegend}>白：内蔵時計の演奏位置 ／ 金：SYNCで受け取った拍</p>
      <p ref={readout} className={styles.hardwareReadout}>全5機が毎拍のSYNCを受信します．</p>
    </div>
    <div className={styles.controls}>
      <div className={styles.stepper} role="group" aria-label="BPMを変更">
        <button type="button" className="press-effect" aria-label="BPMを5下げる" disabled={bpm <= minBpm} onClick={() => setBpm(value => Math.max(minBpm, value - bpmStep))}>−</button>
        <output aria-live="polite">{bpm} BPM</output>
        <button type="button" className="press-effect" aria-label="BPMを5上げる" disabled={bpm >= maxBpm} onClick={() => setBpm(value => Math.min(maxBpm, value + bpmStep))}>＋</button>
      </div>
      <button type="button" className="press-effect" disabled={exhibit.reduced} aria-pressed={exhibit.requested && !exhibit.reduced} onClick={exhibit.toggle}>{exhibit.requested && !exhibit.reduced ? '停止' : '再生'}</button>
      <button type="button" className="press-effect" onClick={() => {
        missing.current = Math.floor(clock.current.beat) + 1;
        if (!exhibit.playing) { manual.current = missing.current; exhibit.select(0); }
      }}>SYNC を2拍欠落させる</button>
      <button type="button" className="press-effect" onClick={() => { manual.current = Math.floor(clock.current.beat) + 1; exhibit.select(0); }}>次の拍</button>
    </div>
    <div className={styles.controls} role="group" aria-label="輪唱を静止して見る">
      {syncPhaseStarts.map((_, index) => <button type="button" key={index} className="press-effect" onClick={() => { missing.current = null; manual.current = index * 8; exhibit.select(index); }}>{index * 8}拍を見る</button>)}
    </div>
    <p className={styles.note}>再現です．実機の映像・音ではありません．欠落中も演奏位置は内蔵時計で進み，受信拍の表示は最後の値を保ちます．次のSYNCで絶対拍にそろい直す様子を簡略化しています．バーは音符・打点そのものではありません．{exhibit.reduced && '動きを減らす設定では，拍を選んで静止表示できます．'}</p>
  </div>;
}
